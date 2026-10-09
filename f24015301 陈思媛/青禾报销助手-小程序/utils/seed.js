/**
 * 种子数据
 * ------------------------------------------------------------------
 * 制度库：由行政专员（乔姐）维护，含现行有效版本与已失效历史版本，
 *        用于体现「员工自助查询，且只认现行有效制度」。
 * 单据：演示用的历史单据，用于财务专员（周敏）核对业务事实的场景。
 * ------------------------------------------------------------------
 */

function daysAgo(n, hour) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour === undefined ? 10 : hour, 15, 0, 0)
  return d.toISOString()
}

/* ================= 制度库 ================= */

const POLICIES = [
  {
    id: 'pol-001',
    code: 'QH-CW-001',
    title: '差旅费报销制度',
    category: '差旅管理',
    version: 'v3.2',
    status: 'active',
    effectiveDate: '2026-01-01',
    expireDate: '',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '出差交通费、住宿费、伙食补贴标准，以及报销时限要求。',
    clauses: [
      {
        no: '3.1',
        title: '交通费标准',
        text:
          '出差交通应选择经济合理的出行方式。市内交通凭票据实报销；长途出行高铁限二等座、动车限二等座、飞机限经济舱。因公务需要超出上述标准的，须事前经部门负责人书面同意，否则差额由个人承担。',
        keywords: ['交通费', '高铁', '二等座', '动车', '飞机', '经济舱', '机票', '火车票', '座']
      },
      {
        no: '3.2',
        title: '住宿费标准',
        text:
          '住宿费按出差目的地分档执行，凭发票据实报销，超支部分个人自理：一线城市每晚上限 500 元，二线城市每晚上限 400 元，其他城市每晚上限 300 元。',
        keywords: ['住宿', '住宿费', '酒店', '房费', '上限', '标准', '一线城市', '二线城市', '一晚']
      },
      {
        no: '3.3',
        title: '伙食补贴',
        text:
          '伙食补贴按实际出差天数计发，标准为 100 元/天，无需提供票据，随差旅费一并报销。出差当天往返的按半天计算。',
        keywords: ['伙食', '伙食补贴', '补贴', '餐补', '出差补贴', '每天', '天数', '吃饭']
      },
      {
        no: '3.4',
        title: '报销时限',
        text:
          '出差结束后应在 15 个工作日内提交报销单据。逾期超过 30 个自然日的，须附部门负责人书面说明方可受理。',
        keywords: ['时限', '多久', '几天', '工作日', '提交', '逾期', '时间', '什么时候']
      }
    ],
    revisionNote: 'v3.2 起住宿费改为按城市分档，伙食补贴由 80 元/天提高至 100 元/天。',
    updatedAt: daysAgo(42, 9)
  },
  {
    id: 'pol-002',
    code: 'QH-CW-002',
    title: '市内交通与通勤补贴制度',
    category: '交通补贴',
    version: 'v2.0',
    status: 'active',
    effectiveDate: '2025-07-01',
    expireDate: '',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '加班打车、通勤补贴与因公外出办事的交通费用口径。',
    clauses: [
      {
        no: '2.1',
        title: '加班交通',
        text:
          '工作日加班至 21:00 以后，可凭打车票据实报销交通费，单次上限 80 元。同一晚多次打车的，仅报销最后一段返程费用。',
        keywords: ['加班', '打车', '出租车', '网约车', '打车费', '21点', '晚上', '半夜', '返程']
      },
      {
        no: '2.2',
        title: '通勤补贴',
        text:
          '通勤补贴标准为每人每月 200 元，随当月工资发放，不再单独提交报销单据，也不接受通勤票据报销。',
        keywords: ['通勤', '通勤补贴', '交通补贴', '每月', '200', '上下班', '月补贴']
      },
      {
        no: '2.3',
        title: '因公外出办事交通',
        text:
          '因公外出办事，优先乘坐公共交通；确需打车的，应在单据中写明办事事由与起止地点，否则财务可予退回。',
        keywords: ['外出', '办事', '公共交通', '地铁', '公交', '事由', '起止']
      }
    ],
    revisionNote: 'v2.0 起通勤补贴改为随工资发放，不再单独报销。',
    updatedAt: daysAgo(120, 14)
  },
  {
    id: 'pol-003',
    code: 'QH-CW-003',
    title: '业务招待费管理制度',
    category: '业务招待',
    version: 'v1.4',
    status: 'active',
    effectiveDate: '2025-09-01',
    expireDate: '',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '业务招待的适用范围、事前审批门槛、费用标准与凭证要求。',
    clauses: [
      {
        no: '1.1',
        title: '适用范围',
        text:
          '本制度适用于因业务需要招待客户、供应商等外部人员发生的费用。公司内部员工聚餐、团建不计入业务招待，应按部门活动费另行申请。',
        keywords: ['招待', '业务招待', '客户', '供应商', '请客', '吃饭', '范围', '团建', '聚餐']
      },
      {
        no: '1.2',
        title: '事前审批',
        text:
          '单次预计金额达到 800 元及以上的招待，须事前提交招待申请，经部门负责人审批后方可发生；未事前审批的，报销时须补充审批说明。',
        keywords: ['审批', '事前', '800', '申请', '大额', '门槛']
      },
      {
        no: '1.3',
        title: '费用标准',
        text: '业务招待人均标准不超过 200 元；酒水费用不超过当次餐费的 30%。超出部分不予报销。',
        keywords: ['人均', '标准', '200', '酒水', '上限', '餐费', '超支']
      },
      {
        no: '1.4',
        title: '凭证要求',
        text:
          '报销时须提供发票、招待事由说明，并注明被招待人员的单位、人数与主要事由，材料不全的由财务退回补正。',
        keywords: ['凭证', '发票', '事由', '人数', '材料', '需要什么', '补正']
      }
    ],
    revisionNote: 'v1.4 细化了人均标准与酒水比例要求。',
    updatedAt: daysAgo(88, 11)
  },
  {
    id: 'pol-004',
    code: 'QH-CW-004',
    title: '办公用品及设备采购报销制度',
    category: '采购管理',
    version: 'v2.1',
    status: 'active',
    effectiveDate: '2025-05-15',
    expireDate: '',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '小额/大额采购的审批路径，以及固定资产的登记要求。',
    clauses: [
      {
        no: '4.1',
        title: '小额采购',
        text: '单笔金额 500 元以下的办公用品，经部门负责人审批后凭票报销，无需事前采购申请。',
        keywords: ['办公用品', '500', '小额', '采购', '单笔', '文具', '流程', '怎么报']
      },
      {
        no: '4.2',
        title: '大额采购',
        text:
          '单笔金额超过 500 元的采购，须事前提交采购申请，经行政专员与财务专员会签后方可执行，未会签的不予报销。',
        keywords: ['大额', '500', '会签', '行政', '财务', '采购申请', '超过', '流程', '怎么报']
      },
      {
        no: '4.3',
        title: '固定资产登记',
        text:
          '单价 2000 元及以上的设备属于固定资产，须先在行政部登记资产台账，凭资产编号办理报销手续。',
        keywords: ['固定资产', '2000', '设备', '电脑', '笔记本', '台账', '资产编号', '登记']
      }
    ],
    revisionNote: 'v2.1 明确 2000 元以上设备须先入台账。',
    updatedAt: daysAgo(150, 16)
  },
  {
    id: 'pol-005',
    code: 'QH-CW-005',
    title: '报销单据提交规范',
    category: '单据规范',
    version: 'v1.1',
    status: 'active',
    effectiveDate: '2025-03-01',
    expireDate: '',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '发票、粘贴、提交时限与退回补正的操作要求。',
    clauses: [
      {
        no: '5.1',
        title: '发票要求',
        text:
          '报销发票须为增值税发票，抬头为公司全称，纳税人识别号完整清晰。抬头为个人的发票不予受理，电子发票须同时提交原件 PDF。',
        keywords: ['发票', '抬头', '税号', '增值税', '个人', '要求', '电子发票', 'pdf']
      },
      {
        no: '5.2',
        title: '单据粘贴',
        text:
          '纸质单据按费用发生时间顺序粘贴，内容须与系统内提交的记录一致，金额不得涂改；涂改的单据一律退回。',
        keywords: ['粘贴', '顺序', '纸质', '一致', '涂改', '规范']
      },
      {
        no: '5.3',
        title: '提交时限',
        text:
          '费用发生后 30 个自然日内提交报销单据。跨年度费用应在当年 12 月 20 日前提交，逾期不再受理。',
        keywords: ['时限', '30天', '自然日', '跨年', '12月', '多久', '逾期', '提交', '报销单据']
      },
      {
        no: '5.4',
        title: '退回处理',
        text:
          '单据被退回后，应在 5 个工作日内按退回意见补齐或修改后重新提交；超过时限未处理的，单据将退回至本人草稿。',
        keywords: ['退回', '驳回', '补', '重新提交', '5个工作日', '修改', '草稿']
      }
    ],
    revisionNote: 'v1.1 增加退回补正的时限要求。',
    updatedAt: daysAgo(210, 10)
  },
  {
    id: 'pol-006',
    code: 'QH-CW-001',
    title: '差旅费报销制度',
    category: '差旅管理',
    version: 'v2.8',
    status: 'archived',
    effectiveDate: '2024-01-01',
    expireDate: '2025-12-31',
    maintainer: '乔姐',
    maintainerRole: '行政专员',
    summary: '【已失效】已被 v3.2 版本取代，此处仅作历史留档。',
    clauses: [
      {
        no: '2.1',
        title: '住宿费标准（旧）',
        text: '住宿费每晚上限 400 元，不分城市档位。【该条款已失效】',
        keywords: ['住宿', '400', '旧版', '历史']
      },
      {
        no: '2.2',
        title: '伙食补贴（旧）',
        text: '伙食补贴 80 元/天，凭餐费票据实报销。【该条款已失效】',
        keywords: ['伙食', '补贴', '80', '旧版', '历史']
      }
    ],
    revisionNote: '自 2026-01-01 起由 v3.2 取代：住宿费改为按城市分档，伙食补贴提高至 100 元/天且免票据。',
    updatedAt: daysAgo(300, 9)
  }
]

/* ================= 演示单据 ================= */

const DOCUMENTS = [
  {
    id: 'doc-1001',
    docNo: 'QH20260408000312',
    ownerId: 'demo-zhangwei',
    ownerName: '张伟',
    ownerEmployeeNo: 'ZH-1024',
    ownerDept: '市场部',
    docType: '差旅费',
    amount: 3860.0,
    reason: '上海客户拜访 3 天（4/8-4/10）差旅费，含高铁二等座往返、住宿 2 晚、市内交通',
    submittedAt: daysAgo(6, 9),
    status: 'finance_check',
    factVerified: false,
    verifiedBy: '',
    verifiedAt: '',
    verifyNote: '',
    createdAt: daysAgo(6, 9)
  },
  {
    id: 'doc-1002',
    docNo: 'QH20260411000187',
    ownerId: 'demo-lina',
    ownerName: '李娜',
    ownerEmployeeNo: 'LI-1088',
    ownerDept: '销售部',
    docType: '业务招待',
    amount: 1280.0,
    reason: '宴请华东区经销商 6 人，洽谈 Q3 供货框架',
    submittedAt: daysAgo(3, 13),
    status: 'under_review',
    factVerified: false,
    verifiedBy: '',
    verifiedAt: '',
    verifyNote: '',
    createdAt: daysAgo(3, 13)
  },
  {
    id: 'doc-1003',
    docNo: 'QH20260330000094',
    ownerId: 'demo-wangqiang',
    ownerName: '王强',
    ownerEmployeeNo: 'WA-1130',
    ownerDept: '技术部',
    docType: '办公用品',
    amount: 468.0,
    reason: '技术部键盘、鼠标及扩展坞采购（采购申请 BH-2603-11 已会签）',
    submittedAt: daysAgo(9, 11),
    status: 'approved',
    factVerified: true,
    verifiedBy: '周敏',
    verifiedAt: daysAgo(4, 15),
    verifyNote: '金额与发票一致，采购申请 BH-2603-11 已由行政、财务会签。',
    createdAt: daysAgo(9, 11)
  },
  {
    id: 'doc-1004',
    docNo: 'QH20260319000056',
    ownerId: 'demo-zhangwei',
    ownerName: '张伟',
    ownerEmployeeNo: 'ZH-1024',
    ownerDept: '市场部',
    docType: '市内交通',
    amount: 96.0,
    reason: '3 月加班打车费 3 次（均晚于 21:00 离司）',
    submittedAt: daysAgo(20, 10),
    status: 'paid',
    factVerified: true,
    verifiedBy: '周敏',
    verifiedAt: daysAgo(16, 14),
    verifyNote: '三次打车时间与门禁记录一致，单次均未超 80 元上限。',
    createdAt: daysAgo(20, 10)
  }
]

const DOC_EVENTS = [
  { docId: 'doc-1001', step: '提交申请', actor: '张伟', note: '提交差旅费报销单据，共 7 张发票', at: daysAgo(6, 9) },
  { docId: 'doc-1001', step: '部门审核', actor: '市场部负责人', note: '出差事由与行程属实，同意报销', at: daysAgo(5, 15) },
  { docId: 'doc-1001', step: '财务核对', actor: '系统', note: '转财务专员核对业务事实与凭证', at: daysAgo(2, 10) },

  { docId: 'doc-1002', step: '提交申请', actor: '李娜', note: '提交业务招待费单据', at: daysAgo(3, 13) },
  { docId: 'doc-1002', step: '部门审核', actor: '销售部负责人', note: '招待事由属实，人均 213 元已提示超标', at: daysAgo(2, 16) },

  { docId: 'doc-1003', step: '提交申请', actor: '王强', note: '提交办公用品采购报销', at: daysAgo(9, 11) },
  { docId: 'doc-1003', step: '部门审核', actor: '技术部负责人', note: '办公用品为部门实际需要', at: daysAgo(8, 14) },
  { docId: 'doc-1003', step: '财务核对', actor: '系统', note: '转财务专员核对', at: daysAgo(6, 9) },
  { docId: 'doc-1003', step: '业务事实核对', actor: '周敏', note: '金额与发票一致，采购申请已会签', at: daysAgo(4, 15) },
  { docId: 'doc-1003', step: '审核通过', actor: '系统', note: '单据审核通过，进入打款流程', at: daysAgo(4, 15) },

  { docId: 'doc-1004', step: '提交申请', actor: '张伟', note: '提交 3 月加班打车费', at: daysAgo(20, 10) },
  { docId: 'doc-1004', step: '部门审核', actor: '市场部负责人', note: '加班情况属实', at: daysAgo(19, 11) },
  { docId: 'doc-1004', step: '业务事实核对', actor: '周敏', note: '与门禁记录核对一致，未超上限', at: daysAgo(16, 14) },
  { docId: 'doc-1004', step: '单据打款', actor: '系统', note: '款项已随 3 月工资发放', at: daysAgo(14, 9) }
]

/* ================= 授权名单 ================= */

const ROLE_BINDINGS = [
  { employeeNo: 'QG-0001', role: 'admin', personName: '乔姐', note: '行政专员 · 制度口径维护人' },
  { employeeNo: 'CW-0001', role: 'finance', personName: '周敏', note: '财务专员 · 单据业务事实核对人' }
]

module.exports = {
  POLICIES,
  DOCUMENTS,
  DOC_EVENTS,
  ROLE_BINDINGS
}
