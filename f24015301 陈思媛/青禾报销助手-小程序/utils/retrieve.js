/**
 * 制度条款检索引擎
 * ------------------------------------------------------------------
 * 只检索「现行有效」的制度（生效中，且未失效），确保员工拿到的口径
 * 永远是当前有效版本 —— 已失效的历史版本不参与作答。
 *
 * 检索结果同时给出条款出处（制度名称 / 编号 / 版本 / 生效日期 / 条款号），
 * 便于员工核对原文，也便于把口径问题回溯给制度维护人乔姐。
 *
 * 接入云服务后，本模块产出的「命中条款」可直接作为大模型的上下文，
 * 让回答更自然；检索与引用逻辑保持不变。
 */

const store = require('./store')

/* ---------- 同义扩展：把口语化提问映射到制度里的正式用词 ---------- */
const SYNONYM_GROUPS = [
  ['住宿', '酒店', '房费', '宾馆', '一晚', '过夜', '住'],
  ['伙食补贴', '餐补', '伙食', '饭补', '餐费补贴', '出差补贴', '补贴'],
  ['交通费', '高铁', '动车', '飞机', '机票', '火车票', '二等座', '经济舱', '座'],
  ['打车', '出租车', '网约车', '滴滴', '打车费', '返程'],
  ['通勤', '上下班', '月补贴', '通勤补贴', '交通补贴'],
  ['加班', '21点', '夜里', '半夜', '晚上'],
  ['招待', '请客', '客户', '供应商', '宴请', '吃饭', '酒水'],
  ['办公用品', '文具', '耗材', '打印纸', '文件夹'],
  ['采购', '采购申请', '会签', '大额', '小额'],
  ['固定资产', '设备', '电脑', '笔记本', '台账', '资产编号', '登记'],
  ['发票', '抬头', '税号', '增值税', '电子发票', '个人'],
  ['时限', '多久', '几天', '什么时候', '逾期', '时间', '工作日', '自然日'],
  ['退回', '驳回', '补正', '重新提交', '重新提', '涂改'],
  ['审批', '事前审批', '申请', '部门负责人', '负责人'],
  ['粘贴', '顺序', '纸质']
]

const HOT_QUESTIONS = [
  '出差住宿一晚能报多少？',
  '加班打车可以报销吗？',
  '业务招待人均标准是多少？',
  '发票抬头有什么要求？',
  '报销一般多久内要提交？',
  '买办公用品的报销流程是什么？'
]

/* ---------- 文本处理 ---------- */

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。、？！；：,.?!;:"'“”‘’（）()《》【】\[\]…—\-_/\\|~`@#$%^&*+=<>]/g, '')
}

function bigrams(text) {
  const out = []
  const cjkRuns = text.match(/[\u4e00-\u9fa5]+/g) || []
  cjkRuns.forEach(function (run) {
    if (run.length === 1) {
      out.push(run)
      return
    }
    for (let i = 0; i < run.length - 1; i++) {
      out.push(run.slice(i, i + 2))
    }
  })
  const latin = text.match(/[a-z0-9]+/g) || []
  latin.forEach(function (x) {
    out.push(x)
  })
  return out
}

/** 依据同义组把提问扩展成一组可命中的词 */
function expandTerms(query) {
  const terms = {}
  SYNONYM_GROUPS.forEach(function (group) {
    const hit = group.some(function (w) {
      return query.indexOf(w) >= 0
    })
    if (hit) {
      group.forEach(function (w) {
        terms[w] = true
      })
    }
  })
  return Object.keys(terms)
}

/* ---------- 打分 ---------- */

function scoreClause(clause, query, terms, grams) {
  let score = 0
  const title = normalize(clause.title)
  const text = normalize(clause.text)
  const hay = title + text
  const keywords = clause.keywords || []

  // 1) 制度维护人录入的关键词直接命中 —— 最强信号
  const hitKeywords = []
  keywords.forEach(function (k) {
    const nk = normalize(k)
    if (nk && query.indexOf(nk) >= 0) {
      score += 8
      hitKeywords.push(nk)
    }
  })

  // 2) 同义扩展：口语化提问映射到制度用词
  terms.forEach(function (t) {
    const nt = normalize(t)
    if (nt.length < 1) return
    if (title.indexOf(nt) >= 0) score += 5
    else if (hay.indexOf(nt) >= 0) score += 2
  })

  // 3) 二元组重叠。已被命中关键词覆盖的部分不重复计分，
  //    避免一个长关键词（如「业务招待」）被拆成多个二元组刷分。
  const covered = hitKeywords.join('|')
  grams.forEach(function (g) {
    if (g.length < 2 || covered.indexOf(g) >= 0) return
    if (title.indexOf(g) >= 0) score += 2.5
    else if (hay.indexOf(g) >= 0) score += 0.6
  })

  // 4) 提问里出现了条款标题中的词（如问「人均标准」命中「费用标准」）
  const titleGrams = bigrams(title)
  let titleHits = 0
  titleGrams.forEach(function (g) {
    if (g.length >= 2 && query.indexOf(g) >= 0) titleHits += 1
  })
  score += Math.min(titleHits, 2) * 3

  // 5) 完整标题被点名
  if (title.length >= 2 && query.indexOf(title) >= 0) score += 6

  // 长条款略微降权，避免「一段话里什么都有」的条款通吃
  if (text.length > 120) score -= 1.5

  return score
}

/* ---------- 主入口 ---------- */

/**
 * @param {string} question 员工的口语化提问
 * @returns {{
 *   matched: boolean,
 *   answer: string,
 *   citations: Array,
 *   extra: Array,
 *   suggestions: string[],
 *   handwritten: string
 * }}
 */
function answer(question) {
  const raw = String(question || '').trim()
  if (!raw) {
    return {
      matched: false,
      answer: '请先输入你想了解的问题，例如「出差住宿一晚能报多少」。',
      citations: [],
      extra: [],
      suggestions: HOT_QUESTIONS.slice(0, 3)
    }
  }

  const query = normalize(raw)
  const grams = bigrams(query)
  const terms = expandTerms(query)

  // 只取现行有效制度：已失效版本不参与作答
  const policies = store.listPolicies({})

  const scored = []
  policies.forEach(function (p) {
    const policyTitle = normalize(p.title)
    const policyTitleHit = query.indexOf(policyTitle) >= 0 && policyTitle.length >= 3
    ;(p.clauses || []).forEach(function (c) {
      let s = scoreClause(c, query, terms, grams)
      if (policyTitleHit) s += 7
      if (s > 0) {
        scored.push({ policy: p, clause: c, score: s })
      }
    })
  })

  scored.sort(function (a, b) {
    return b.score - a.score
  })

  const top = scored.length ? scored[0].score : 0
  const MATCH_FLOOR = 6

  if (!scored.length || top < MATCH_FLOOR) {
    return {
      matched: false,
      answer:
        '现行有效制度里没有检索到与这个问题直接相关的条款。\n' +
        '为了保证口径准确，我不会去套用已失效的历史版本，也不做推测。',
      citations: [],
      extra: [],
      suggestions: HOT_QUESTIONS.slice(0, 4),
      handwritten: '这类没有明确制度依据的问题，建议直接找行政专员乔姐确认口径。'
    }
  }

  // 取与最高分接近的条款。
  // 注意 keep 里绝不含已失效制度 —— policies 已按现行有效过滤。
  const keep = scored.filter(function (s) {
    return s.score >= Math.max(top * 0.55, MATCH_FLOOR)
  })

  // 同一部制度里的兄弟条款：如果它也被这个问题明显命中，
  // 一并带上（例如问「办公用品怎么报」，500 元上下两档都该看到）。
  if (keep.length < 3) {
    const primaryId = keep[0].policy.id
    const sibling = scored.find(function (s) {
      return (
        s.policy.id === primaryId &&
        keep.indexOf(s) < 0 &&
        s.score >= MATCH_FLOOR / 2
      )
    })
    if (sibling) {
      keep.push(sibling)
      keep.sort(function (a, b) {
        return b.score - a.score
      })
    }
  }

  const primary = keep[0]
  const extra = keep.slice(1, 3)

  const answerText =
    '根据《' +
    primary.policy.title +
    '》（' +
    primary.policy.code +
    ' ' +
    primary.policy.version +
    '）第 ' +
    primary.clause.no +
    ' 条「' +
    primary.clause.title +
    '」：\n' +
    primary.clause.text

  return {
    matched: true,
    answer: answerText,
    citations: [toCitation(primary.policy, primary.clause)],
    extra: extra.map(function (e) {
      return toCitation(e.policy, e.clause)
    }),
    suggestions: []
  }
}

function toCitation(policy, clause) {
  return {
    policyId: policy.id,
    policyTitle: policy.title,
    code: policy.code,
    version: policy.version,
    effectiveDate: policy.effectiveDate,
    expireDate: policy.expireDate,
    maintainer: policy.maintainer,
    maintainerRole: policy.maintainerRole,
    clauseNo: clause.no,
    clauseTitle: clause.title,
    clauseText: clause.text
  }
}

module.exports = {
  answer,
  HOT_QUESTIONS,
  normalize,
  bigrams
}
