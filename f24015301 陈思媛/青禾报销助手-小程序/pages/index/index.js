const store = require('../../utils/store')
const dict = require('../../utils/dict')
const retrieve = require('../../utils/retrieve')

const app = getApp()

Page({
  data: {
    identity: {},
    roleLabel: '员工',
    roleTag: 'tag-grey',
    isAdmin: false,
    isFinance: false,
    isStaff: false,
    keyword: '',
    policyCount: 0,
    categories: [],
    latestPolicies: [],
    myStats: { total: 0, doing: 0, done: 0 },
    financeTodo: { pendingCount: 0, approvedCount: 0 },
    hotQuestions: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const identity = app.refreshIdentity()
    const isAdmin = dict.canMaintainPolicy(identity.role)
    const isFinance = identity.role === 'finance'
    const isStaff = dict.isStaff(identity.role)

    const policies = store.listPolicies({})
    const latest = policies.slice(0, 3).map(function (p) {
      return {
        id: p.id,
        title: p.title,
        code: p.code,
        version: p.version,
        category: p.category,
        clauseCount: (p.clauses || []).length,
        effectiveDate: p.effectiveDate,
        summary: p.summary
      }
    })

    const catMap = {}
    policies.forEach(function (p) {
      catMap[p.category] = (catMap[p.category] || 0) + 1
    })
    const categories = Object.keys(catMap).map(function (k) {
      return { name: k, count: catMap[k] }
    })

    const docs = store.listDocuments({ identity: identity })
    const doing = docs.filter(function (d) {
      return d.status !== 'paid' && d.status !== 'rejected'
    }).length
    const done = docs.filter(function (d) {
      return d.status === 'paid' || d.status === 'rejected'
    }).length

    this.setData({
      identity: identity,
      roleLabel: dict.roleOf(identity.role).label,
      roleTag: dict.roleOf(identity.role).tag,
      isAdmin: isAdmin,
      isFinance: isFinance,
      isStaff: isStaff,
      policyCount: policies.length,
      categories: categories,
      latestPolicies: latest,
      myStats: { total: docs.length, doing: doing, done: done },
      financeTodo: store.financeTodo(identity),
      hotQuestions: retrieve.HOT_QUESTIONS.slice(0, 4)
    })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    const kw = (this.data.keyword || '').trim()
    wx.navigateTo({
      url: '/pages/ask/ask' + (kw ? '?q=' + encodeURIComponent(kw) : '')
    })
  },

  goPolicy() {
    wx.switchTab({ url: '/pages/policy/policy' })
  },

  goAsk() {
    wx.switchTab({ url: '/pages/ask/ask' })
  },

  goDocs() {
    wx.switchTab({ url: '/pages/docs/docs' })
  },

  goMe() {
    wx.switchTab({ url: '/pages/me/me' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  goFinance() {
    wx.navigateTo({ url: '/pages/finance/finance' })
  },

  goStaffDesk() {
    if (this.data.isAdmin) {
      wx.navigateTo({ url: '/pages/admin/admin' })
    } else if (this.data.isFinance) {
      wx.navigateTo({ url: '/pages/finance/finance' })
    } else {
      wx.switchTab({ url: '/pages/me/me' })
    }
  },

  goPolicyDetail(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  goCategory(e) {
    // policy 是 tabBar 页面，只能 switchTab，目标分类通过 globalData 传递
    app.globalData.policyCategory = e.currentTarget.dataset.name
    wx.switchTab({ url: '/pages/policy/policy' })
  },

  onAskHot(e) {
    wx.navigateTo({
      url: '/pages/ask/ask?q=' + encodeURIComponent(e.currentTarget.dataset.q)
    })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手 · 制度口径与单据进度一处查清',
      path: '/pages/index/index'
    }
  }
})
