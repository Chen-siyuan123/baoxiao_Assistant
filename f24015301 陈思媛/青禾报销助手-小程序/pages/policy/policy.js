const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

Page({
  data: {
    identity: {},
    isAdmin: false,
    keyword: '',
    category: '',
    includeArchived: false,
    categories: [],
    list: [],
    activeCount: 0,
    archivedCount: 0,
    hasFilter: false
  },

  onShow() {
    const identity = app.refreshIdentity()
    const pending = app.globalData.policyCategory
    if (pending) {
      app.globalData.policyCategory = ''
      this.setData({ category: pending })
    }
    this.setData({
      identity: identity,
      isAdmin: dict.canMaintainPolicy(identity.role)
    })
    this.refresh()
  },

  refresh() {
    const category = this.data.category
    const keyword = (this.data.keyword || '').trim()

    const all = store.listPolicies({ includeArchived: true })
    const active = all.filter(function (p) {
      return store.isEffective(p)
    })
    const archived = all.filter(function (p) {
      return !store.isEffective(p)
    })

    const catMap = {}
    active.forEach(function (p) {
      catMap[p.category] = (catMap[p.category] || 0) + 1
    })
    const categories = Object.keys(catMap).map(function (name) {
      return { name: name, count: catMap[name] }
    })

    const list = store.listPolicies({
      category: category,
      keyword: keyword,
      includeArchived: this.data.includeArchived
    })

    const view = list.map(function (p) {
      const effective = store.isEffective(p)
      const st = effective
        ? dict.POLICY_STATUS.active
        : p.status === 'pending'
          ? dict.POLICY_STATUS.pending
          : dict.POLICY_STATUS.archived
      return {
        id: p.id,
        title: p.title,
        code: p.code,
        version: p.version,
        category: p.category,
        summary: p.summary,
        maintainer: p.maintainer,
        maintainerRole: p.maintainerRole,
        clauseCount: (p.clauses || []).length,
        effectiveDate: p.effectiveDate,
        expireDate: p.expireDate,
        statusLabel: effective ? st.label : p.status === 'pending' ? '待生效' : '已失效',
        statusTag: effective ? st.tag : p.status === 'pending' ? 'tag-warn' : 'tag-grey',
        effective: effective,
        updatedLabel: fmt.fromNow(p.updatedAt)
      }
    })

    this.setData({
      list: view,
      categories: categories,
      activeCount: active.length,
      archivedCount: archived.length,
      hasFilter: !!(category || keyword)
    })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
    this.refresh()
  },

  onClearKeyword() {
    this.setData({ keyword: '' })
    this.refresh()
  },

  onPickCategory(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ category: this.data.category === name ? '' : name })
    this.refresh()
  },

  onToggleArchived() {
    this.setData({ includeArchived: !this.data.includeArchived })
    this.refresh()
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  goAsk() {
    wx.switchTab({ url: '/pages/ask/ask' })
  },

  onShareAppMessage() {
    return {
      title: '青禾现行有效报销制度',
      path: '/pages/policy/policy'
    }
  }
})
