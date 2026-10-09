/**
 * 本地数据层（体验模式）
 * ------------------------------------------------------------------
 * 本模块用一个统一的读写接口承载「制度库 / 单据 / 流转记录 / 问答留痕」，
 * 并在本地实现与云端 RLS 完全对应的权限规则：
 *
 *   · 制度：所有登录使用者可读；只有行政专员（乔姐）可新增 / 改版 / 停用
 *   · 单据：本人只能读取本人单据；财务专员（周敏）与行政专员可读取全部并核对业务事实
 *   · 流转记录与问答留痕：跟随其所属单据 / 提问者的可见范围
 *
 * 后续接入云服务时，只需把本文件的方法体替换为等价的 cloud.database 查询，
 * 页面代码无需改动。
 */

const seed = require('./seed')
const fmt = require('./format')
const dict = require('./dict')

const KEY = {
  policies: 'qh_policies_v1',
  documents: 'qh_documents_v1',
  events: 'qh_events_v1',
  identity: 'qh_identity_v1',
  qa: 'qh_qa_v1',
  consent: 'qh_consent_v1',
  meta: 'qh_meta_v1'
}

/* ================= 基础读写 ================= */

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    return false
  }
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/* ================= 初始化 ================= */

function init() {
  const meta = read(KEY.meta, null)
  if (!meta || !meta.seeded) {
    write(KEY.policies, clone(seed.POLICIES))
    write(KEY.documents, clone(seed.DOCUMENTS))
    write(KEY.events, clone(seed.DOC_EVENTS))
    write(KEY.meta, {
      seeded: true,
      seededAt: new Date().toISOString(),
      version: 1,
      bindings: clone(seed.ROLE_BINDINGS)
    })
  }
  if (!read(KEY.identity, null)) {
    write(KEY.identity, clone(dict.DEMO_IDENTITIES[0]))
  }
}

function resetAll() {
  write(KEY.policies, clone(seed.POLICIES))
  write(KEY.documents, clone(seed.DOCUMENTS))
  write(KEY.events, clone(seed.DOC_EVENTS))
  write(KEY.qa, [])
  write(KEY.consent, null)
  write(KEY.meta, {
    seeded: true,
    seededAt: new Date().toISOString(),
    version: 1,
    bindings: clone(seed.ROLE_BINDINGS)
  })
  write(KEY.identity, clone(dict.DEMO_IDENTITIES[0]))
}

/* ================= 身份 ================= */

function getIdentity() {
  return read(KEY.identity, clone(dict.DEMO_IDENTITIES[0]))
}

function saveIdentity(patch) {
  const cur = getIdentity()
  const next = Object.assign({}, cur, patch)
  write(KEY.identity, next)
  return next
}

function getBindings() {
  const meta = read(KEY.meta, {})
  return (meta && meta.bindings) || clone(seed.ROLE_BINDINGS)
}

/**
 * 绑定工号：命中授权名单则获得对应角色（乔姐→行政专员，周敏→财务专员），
 * 未命中名单则按普通员工绑定。等价于云端 bind_role() 函数。
 */
function bindEmployeeNo(employeeNo) {
  const no = String(employeeNo || '').trim().toUpperCase()
  if (!no) {
    return { ok: false, message: '请输入工号' }
  }
  if (!/^[A-Z]{2}-\d{3,6}$/.test(no)) {
    return { ok: false, message: '工号格式形如 ZH-1024、QG-0001，请核对后重试' }
  }
  const hit = getBindings().find(function (b) {
    return String(b.employeeNo).toUpperCase() === no
  })
  const role = hit ? hit.role : 'employee'
  const identity = saveIdentity({
    employeeNo: no,
    role: role,
    name: hit && hit.personName ? hit.personName : getIdentity().name
  })
  return {
    ok: true,
    role: role,
    bound: !!hit,
    identity: identity,
    message: hit ? '已绑定为' + dict.roleOf(role).label + '（' + hit.personName + '）' : '已绑定普通员工身份'
  }
}

/** 体验模式：一键切换身份，用于验证不同角色看到的内容边界 */
function switchIdentity(id) {
  const target = dict.DEMO_IDENTITIES.find(function (d) {
    return d.id === id
  })
  if (!target) return getIdentity()
  return saveIdentity(clone(target))
}

/* ================= 制度 ================= */

function allPolicies() {
  return read(KEY.policies, clone(seed.POLICIES))
}

/** 今天（YYYY-MM-DD），用于判断制度是否在有效期内 */
function today() {
  return fmt.formatDate(new Date())
}

/** 是否现行有效：状态为 active，且今天落在生效日与失效日之间 */
function isEffective(p) {
  if (p.status !== 'active') return false
  const t = today()
  if (p.effectiveDate && p.effectiveDate > t) return false
  if (p.expireDate && p.expireDate < t) return false
  return true
}

function listPolicies(options) {
  const opt = options || {}
  const list = allPolicies()
  let out = list
  if (!opt.includeArchived) {
    out = out.filter(isEffective)
  }
  if (opt.category) {
    out = out.filter(function (p) {
      return p.category === opt.category
    })
  }
  if (opt.keyword) {
    const k = String(opt.keyword).trim()
    out = out.filter(function (p) {
      return (
        p.title.indexOf(k) >= 0 ||
        p.code.indexOf(k) >= 0 ||
        (p.summary || '').indexOf(k) >= 0 ||
        (p.clauses || []).some(function (c) {
          return (c.title + c.text).indexOf(k) >= 0
        })
      )
    })
  }
  const order = { active: 0, pending: 1, archived: 2 }
  out = out.slice().sort(function (a, b) {
    const oa = order[a.status] === undefined ? 3 : order[a.status]
    const ob = order[b.status] === undefined ? 3 : order[b.status]
    if (oa !== ob) return oa - ob
    return String(b.updatedAt).localeCompare(String(a.updatedAt))
  })
  return out
}

function getPolicy(id) {
  return (
    allPolicies().find(function (p) {
      return p.id === id
    }) || null
  )
}

function countByCategory() {
  const out = {}
  listPolicies({}).forEach(function (p) {
    out[p.category] = (out[p.category] || 0) + 1
  })
  return out
}

/** 新增或更新制度（仅行政专员） */
function savePolicy(policy, identity) {
  const me = identity || getIdentity()
  if (!dict.canMaintainPolicy(me.role)) {
    return { ok: false, message: '只有行政专员（乔姐）可以维护制度口径' }
  }
  if (!policy.title || !String(policy.title).trim()) {
    return { ok: false, message: '请填写制度名称' }
  }
  if (!policy.effectiveDate) {
    return { ok: false, message: '请选择生效日期' }
  }
  const list = allPolicies()
  const now = new Date().toISOString()
  const clauses = (policy.clauses || []).filter(function (c) {
    return (c.title && String(c.title).trim()) || (c.text && String(c.text).trim())
  })

  if (policy.id) {
    const idx = list.findIndex(function (p) {
      return p.id === policy.id
    })
    if (idx < 0) return { ok: false, message: '未找到该制度' }
    const prev = list[idx]
    list[idx] = Object.assign({}, prev, policy, {
      clauses: clauses,
      maintainer: me.name,
      maintainerRole: dict.roleOf(me.role).label,
      updatedAt: now
    })
  } else {
    list.push({
      id: fmt.uid('pol'),
      code: policy.code || '',
      title: String(policy.title).trim(),
      category: policy.category || dict.POLICY_CATEGORY[0],
      version: policy.version || 'v1.0',
      status: policy.status || 'active',
      effectiveDate: policy.effectiveDate,
      expireDate: policy.expireDate || '',
      summary: policy.summary || '',
      clauses: clauses,
      revisionNote: policy.revisionNote || '',
      maintainer: me.name,
      maintainerRole: dict.roleOf(me.role).label,
      updatedAt: now
    })
  }
  write(KEY.policies, list)
  return { ok: true }
}

/** 停用（置为已失效）制度：仅行政专员 */
function archivePolicy(id, identity) {
  const me = identity || getIdentity()
  if (!dict.canMaintainPolicy(me.role)) {
    return { ok: false, message: '只有行政专员（乔姐）可以停用制度' }
  }
  const list = allPolicies()
  const idx = list.findIndex(function (p) {
    return p.id === id
  })
  if (idx < 0) return { ok: false, message: '未找到该制度' }
  list[idx].status = 'archived'
  list[idx].expireDate = list[idx].expireDate || today()
  list[idx].updatedAt = new Date().toISOString()
  write(KEY.policies, list)
  return { ok: true }
}

/* ================= 单据 ================= */

function allDocuments() {
  return read(KEY.documents, clone(seed.DOCUMENTS))
}

function allEvents() {
  return read(KEY.events, clone(seed.DOC_EVENTS))
}

/** 本地权限判断，对应云端 RLS：本人 OR 财务/行政专员 */
function canViewDocument(doc, identity) {
  const me = identity || getIdentity()
  if (!doc) return false
  if (doc.ownerId === me.id) return true
  return dict.isStaff(me.role)
}

function listDocuments(options) {
  const opt = options || {}
  const me = opt.identity || getIdentity()
  let out = allDocuments()
  if (!dict.isStaff(me.role)) {
    out = out.filter(function (d) {
      return d.ownerId === me.id
    })
  }
  if (opt.status) {
    out = out.filter(function (d) {
      return d.status === opt.status
    })
  }
  if (opt.pendingFacts) {
    out = out.filter(function (d) {
      return !d.factVerified && dict.FINANCE_PENDING.indexOf(d.status) >= 0
    })
  }
  if (opt.keyword) {
    const k = String(opt.keyword).trim()
    out = out.filter(function (d) {
      return d.docNo.indexOf(k) >= 0 || d.reason.indexOf(k) >= 0 || d.docType.indexOf(k) >= 0
    })
  }
  return out.slice().sort(function (a, b) {
    return String(b.submittedAt).localeCompare(String(a.submittedAt))
  })
}

function getDocument(id, identity) {
  const doc = allDocuments().find(function (d) {
    return d.id === id
  })
  if (!doc) return null
  if (!canViewDocument(doc, identity)) return null
  return doc
}

function listEvents(docId) {
  return allEvents()
    .filter(function (e) {
      return e.docId === docId
    })
    .sort(function (a, b) {
      return String(a.at).localeCompare(String(b.at))
    })
}

function pushEvent(docId, step, actor, note, at) {
  const events = allEvents()
  events.push({
    docId: docId,
    step: step,
    actor: actor,
    note: note,
    at: at || new Date().toISOString()
  })
  write(KEY.events, events)
}

/** 本人新建单据 */
function createDocument(input, identity) {
  const me = identity || getIdentity()
  const amount = Number(input.amount)
  if (!input.docType) return { ok: false, message: '请选择费用类型' }
  if (!input.reason || !String(input.reason).trim()) return { ok: false, message: '请填写费用事由' }
  if (isNaN(amount) || amount <= 0) return { ok: false, message: '请填写正确的金额' }

  const now = new Date().toISOString()
  const docs = allDocuments()
  const doc = {
    id: fmt.uid('doc'),
    docNo: fmt.makeDocNo(),
    ownerId: me.id,
    ownerName: me.name,
    ownerEmployeeNo: me.employeeNo,
    ownerDept: me.dept,
    docType: input.docType,
    amount: amount,
    reason: String(input.reason).trim(),
    submittedAt: now,
    status: 'submitted',
    factVerified: false,
    verifiedBy: '',
    verifiedAt: '',
    verifyNote: '',
    createdAt: now
  }
  docs.push(doc)
  write(KEY.documents, docs)
  pushEvent(doc.id, '提交申请', me.name, '提交' + doc.docType + '报销单据', now)
  return { ok: true, doc: doc }
}

/** 批量创建示例单据（便于首次体验二期功能） */
function createSampleDocuments(identity) {
  const me = identity || getIdentity()
  const samples = [
    {
      docType: '差旅费',
      amount: 2180.0,
      reason: '杭州出差 2 天，高铁二等座往返、住宿 1 晚、市内交通',
      status: 'finance_check',
      daysAgo: 4
    },
    {
      docType: '市内交通',
      amount: 62.0,
      reason: '加班至 21:30 后打车返程 1 次',
      status: 'under_review',
      daysAgo: 2
    },
    {
      docType: '办公用品',
      amount: 236.5,
      reason: '部门打印纸、文件夹等办公用品采购',
      status: 'paid',
      daysAgo: 26
    }
  ]
  const docs = allDocuments()
  let created = 0
  samples.forEach(function (s) {
    const at = new Date()
    at.setDate(at.getDate() - s.daysAgo)
    at.setHours(10, 20, 0, 0)
    const stamp = at.toISOString()
    const doc = {
      id: fmt.uid('doc'),
      docNo: fmt.makeDocNo(),
      ownerId: me.id,
      ownerName: me.name,
      ownerEmployeeNo: me.employeeNo,
      ownerDept: me.dept,
      docType: s.docType,
      amount: s.amount,
      reason: s.reason,
      submittedAt: stamp,
      status: s.status,
      factVerified: s.status === 'paid',
      verifiedBy: s.status === 'paid' ? '周敏' : '',
      verifiedAt: s.status === 'paid' ? stamp : '',
      verifyNote: s.status === 'paid' ? '金额与发票一致，打车时间与门禁记录相符。' : '',
      createdAt: stamp
    }
    docs.push(doc)
    created += 1
    pushEvent(doc.id, '提交申请', me.name, '提交' + s.docType + '报销单据', stamp)
    if (s.status !== 'submitted') {
      pushEvent(doc.id, '部门审核', me.dept + '负责人', '事由与行程属实，同意报销', stamp)
    }
    if (s.status === 'finance_check') {
      pushEvent(doc.id, '财务核对', '系统', '转财务专员核对业务事实与凭证', stamp)
    }
    if (s.status === 'paid') {
      pushEvent(doc.id, '业务事实核对', '周敏', '金额与发票一致', stamp)
      pushEvent(doc.id, '单据打款', '系统', '款项已随工资发放', stamp)
    }
  })
  write(KEY.documents, docs)
  return { ok: true, created: created }
}

/**
 * 财务专员核对业务事实（仅财务/行政专员）
 * 核对通过后单据状态推进为「已通过」，并记录核对人与核对意见。
 */
function verifyFacts(docId, note, pass, identity) {
  const me = identity || getIdentity()
  if (!dict.canVerifyFacts(me.role)) {
    return { ok: false, message: '只有财务专员（周敏）可以核对单据业务事实' }
  }
  const docs = allDocuments()
  const idx = docs.findIndex(function (d) {
    return d.id === docId
  })
  if (idx < 0) return { ok: false, message: '未找到该单据' }

  const now = new Date().toISOString()
  const doc = docs[idx]
  doc.factVerified = !!pass
  doc.verifiedBy = me.name
  doc.verifiedAt = now
  doc.verifyNote = String(note || '').trim()
  doc.status = pass ? 'approved' : 'rejected'
  docs[idx] = doc
  write(KEY.documents, docs)

  pushEvent(
    docId,
    pass ? '业务事实核对' : '核对未通过',
    me.name,
    doc.verifyNote || (pass ? '业务事实核对无误' : '业务事实与凭证不符，予以驳回'),
    now
  )
  pushEvent(
    docId,
    pass ? '审核通过' : '单据驳回',
    '系统',
    pass ? '单据审核通过，进入打款流程' : '单据已驳回，请修改后重新提交',
    now
  )
  return { ok: true, doc: doc }
}

/** 财务专员推进状态（例如已通过 → 已打款） */
function advanceStatus(docId, status, note, identity) {
  const me = identity || getIdentity()
  if (!dict.canVerifyFacts(me.role)) {
    return { ok: false, message: '只有财务专员（周敏）可以推进单据状态' }
  }
  const docs = allDocuments()
  const idx = docs.findIndex(function (d) {
    return d.id === docId
  })
  if (idx < 0) return { ok: false, message: '未找到该单据' }
  const now = new Date().toISOString()
  docs[idx].status = status
  write(KEY.documents, docs)
  pushEvent(docId, dict.statusOf(status).label, me.name, note || dict.statusOf(status).hint, now)
  return { ok: true, doc: docs[idx] }
}

/** 单据统计 */
function documentStats(identity) {
  const me = identity || getIdentity()
  const list = listDocuments({ identity: me })
  const out = { total: list.length, amount: 0, byStatus: {} }
  list.forEach(function (d) {
    out.amount += Number(d.amount) || 0
    out.byStatus[d.status] = (out.byStatus[d.status] || 0) + 1
  })
  return out
}

/** 财务待办统计 */
function financeTodo(identity) {
  const me = identity || getIdentity()
  const pending = listDocuments({ identity: me, pendingFacts: true })
  const approved = listDocuments({ identity: me, status: 'approved' })
  return {
    pendingCount: pending.length,
    approvedCount: approved.length,
    pending: pending,
    approved: approved
  }
}

/* ================= 问答留痕 ================= */

function listQaLogs(limit) {
  const me = getIdentity()
  const list = read(KEY.qa, []).filter(function (l) {
    return l.ownerId === me.id
  })
  const sorted = list.sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt))
  })
  return limit ? sorted.slice(0, limit) : sorted
}

function addQaLog(entry) {
  const me = getIdentity()
  const list = read(KEY.qa, [])
  list.push({
    id: fmt.uid('qa'),
    ownerId: me.id,
    question: entry.question,
    answer: entry.answer,
    cited: entry.cited || [],
    matched: !!entry.matched,
    createdAt: new Date().toISOString()
  })
  // 只保留最近 200 条，避免本地存储无限膨胀
  write(KEY.qa, list.slice(-200))
}

function clearQaLogs() {
  write(KEY.qa, [])
}

/* ================= 查询授权 ================= */

/**
 * 「经授权查询本人单据」的授权凭据。
 * 授权范围严格限定为：本人名下单据及其流转记录。
 */
function getConsent() {
  return read(KEY.consent, null)
}

function grantConsent() {
  const v = { granted: true, at: new Date().toISOString(), scope: 'self-documents-only' }
  write(KEY.consent, v)
  return v
}

function revokeConsent() {
  write(KEY.consent, null)
}

module.exports = {
  KEY,
  init,
  resetAll,
  getIdentity,
  saveIdentity,
  getBindings,
  bindEmployeeNo,
  switchIdentity,
  getConsent,
  grantConsent,
  revokeConsent,
  allPolicies,
  listPolicies,
  getPolicy,
  countByCategory,
  isEffective,
  savePolicy,
  archivePolicy,
  allDocuments,
  listDocuments,
  getDocument,
  canViewDocument,
  listEvents,
  createDocument,
  createSampleDocuments,
  verifyFacts,
  advanceStatus,
  documentStats,
  financeTodo,
  listQaLogs,
  addQaLog,
  clearQaLogs,
  today
}
