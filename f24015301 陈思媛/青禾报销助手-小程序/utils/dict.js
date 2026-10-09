/**
 * 字典与常量
 * 说明：单据状态、单据类型、制度分类、角色定义集中在此，
 *      页面与数据层都从这里取，避免各处硬编码字符串。
 */

/* ---------- 角色 ---------- */
const ROLE = {
  employee: {
    key: 'employee',
    label: '员工',
    short: '员工',
    tag: 'tag-grey',
    desc: '可自助查询现行有效制度，并可经授权查询本人单据状态'
  },
  admin: {
    key: 'admin',
    label: '行政专员',
    short: '行政',
    tag: 'tag-info',
    desc: '负责制度口径的制定与维护（青禾由乔姐担任）'
  },
  finance: {
    key: 'finance',
    label: '财务专员',
    short: '财务',
    tag: 'tag-plum',
    desc: '负责单据业务事实的核对与确认（青禾由周敏担任）'
  }
}

function roleOf(role) {
  return ROLE[role] || ROLE.employee
}

/* ---------- 单据状态 ---------- */
const DOC_STATUS = {
  submitted: {
    key: 'submitted',
    label: '已提交',
    tag: 'tag-grey',
    order: 1,
    hint: '单据已提交，等待部门审核'
  },
  under_review: {
    key: 'under_review',
    label: '审核中',
    tag: 'tag-warn',
    order: 2,
    hint: '部门负责人正在审核单据内容'
  },
  finance_check: {
    key: 'finance_check',
    label: '财务核对中',
    tag: 'tag-plum',
    order: 3,
    hint: '财务专员正在核对业务事实与凭证'
  },
  approved: {
    key: 'approved',
    label: '已通过',
    tag: 'tag-green',
    order: 4,
    hint: '单据审核通过，进入打款流程'
  },
  rejected: {
    key: 'rejected',
    label: '已驳回',
    tag: 'tag-danger',
    order: 9,
    hint: '单据被驳回，请按驳回意见修改后重新提交'
  },
  paid: {
    key: 'paid',
    label: '已打款',
    tag: 'tag-brand',
    order: 5,
    hint: '款项已支付至本人账户'
  }
}

function statusOf(status) {
  return DOC_STATUS[status] || DOC_STATUS.submitted
}

/** 正常流转的节点顺序（驳回为异常分支，不进入时间轴主线） */
const FLOW_STEPS = [
  { key: 'submitted', label: '提交申请' },
  { key: 'under_review', label: '部门审核' },
  { key: 'finance_check', label: '财务核对' },
  { key: 'approved', label: '审核通过' },
  { key: 'paid', label: '已打款' }
]

/** 财务待办状态：需要财务专员核对业务事实的单据 */
const FINANCE_PENDING = ['finance_check', 'under_review']

/* ---------- 单据与制度分类 ---------- */
const DOC_TYPE = ['差旅费', '市内交通', '业务招待', '办公用品', '其他']

const POLICY_CATEGORY = ['差旅管理', '交通补贴', '业务招待', '采购管理', '单据规范']

/* ---------- 制度状态 ---------- */
const POLICY_STATUS = {
  active: { key: 'active', label: '现行有效', tag: 'tag-brand' },
  pending: { key: 'pending', label: '待生效', tag: 'tag-warn' },
  archived: { key: 'archived', label: '已失效', tag: 'tag-grey' }
}

function policyStatusOf(status) {
  return POLICY_STATUS[status] || POLICY_STATUS.active
}

/* ---------- 角色能力 ---------- */
function isStaff(role) {
  return role === 'admin' || role === 'finance'
}

function canMaintainPolicy(role) {
  return role === 'admin'
}

function canVerifyFacts(role) {
  return role === 'finance' || role === 'admin'
}

/* ---------- 体验身份 ---------- */
const DEMO_IDENTITIES = [
  {
    id: 'demo-staff-me',
    name: '我',
    employeeNo: 'QH-2026',
    dept: '市场部',
    role: 'employee'
  },
  {
    id: 'demo-admin-qiao',
    name: '乔姐',
    employeeNo: 'QG-0001',
    dept: '行政部',
    role: 'admin'
  },
  {
    id: 'demo-finance-zhou',
    name: '周敏',
    employeeNo: 'CW-0001',
    dept: '财务部',
    role: 'finance'
  }
]

module.exports = {
  ROLE,
  roleOf,
  DOC_STATUS,
  statusOf,
  FLOW_STEPS,
  FINANCE_PENDING,
  DOC_TYPE,
  POLICY_CATEGORY,
  POLICY_STATUS,
  policyStatusOf,
  isStaff,
  canMaintainPolicy,
  canVerifyFacts,
  DEMO_IDENTITIES
}
