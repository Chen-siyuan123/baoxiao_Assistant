const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

Page({
  data: {
    id: '',
    policy: null,
    isAdmin: false,
    isArchived: false,
    relatedQuestions: []
  },

  onLoad(options) {
    this.setData({ id: (options && options.id) || '' })
  },

  onShow() {
    const identity = app.refreshIdentity()
    this.setData({ isAdmin: dict.canMaintainPolicy(identity.role) })
    this.load()
  },

  load() {
    const p = store.getPolicy(this.data.id)
    if (!p) {
      this.setData({ policy: null })
      return
    }
    const effective = store.isEffective(p)
    const view = {
      id: p.id,
      title: p.title,
      code: p.code,
      version: p.version,
      category: p.category,
      summary: p.summary,
      statusLabel: effective ? '现行有效' : p.status === 'pending' ? '待生效' : '已失效',
      statusTag: effective ? 'tag-brand' : p.status === 'pending' ? 'tag-warn' : 'tag-grey',
      effectiveDate: p.effectiveDate,
      expireDate: p.expireDate,
      maintainer: p.maintainer,
      maintainerRole: p.maintainerRole,
      revisionNote: p.revisionNote,
      updatedLabel: fmt.fromNow(p.updatedAt),
      clauses: (p.clauses || []).map(function (c) {
        return { no: c.no, title: c.title, text: c.text }
      })
    }
    this.setData({
      policy: view,
      isArchived: !effective,
      relatedQuestions: [
        '《' + p.title + '》里报销的上限是多少？',
        '按照' + p.title + '，需要准备哪些材料？'
      ]
    })
    wx.setNavigationBarTitle({ title: p.title })
  },

  goAskPolicy() {
    app.globalData.askQuestion = '按照《' + this.data.policy.title + '》，我该注意什么？'
    wx.switchTab({ url: '/pages/ask/ask' })
  },

  onAskRelated(e) {
    app.globalData.askQuestion = e.currentTarget.dataset.q
    wx.switchTab({ url: '/pages/ask/ask' })
  },

  goAdminEdit() {
    wx.navigateTo({ url: '/pages/admin/admin?id=' + this.data.id })
  },

  onShareAppMessage() {
    const p = this.data.policy
    return {
      title: p ? p.title + '（' + p.version + '）· 青禾报销助手' : '青禾报销助手',
      path: '/pages/policy-detail/policy-detail?id=' + this.data.id
    }
  }
})
