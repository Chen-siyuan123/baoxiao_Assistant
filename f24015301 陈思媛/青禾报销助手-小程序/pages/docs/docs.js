const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'doing', label: '在办' },
  { key: 'done', label: '已完成' },
  { key: 'verify', label: '待核对', staffOnly: true }
]

Page({
  data: {
    identity: {},
    isStaff: false,
    consent: null,
    showConsent: false,
    filters: [],
    activeFilter: 'all',
    list: [],
    stats: { total: 0, doing: 0, done: 0, amountText: '0.00' },
    scopeLabel: '',
    pendingVerify: 0
  },

  onShow() {
    const identity = app.refreshIdentity()
    const isStaff = dict.isStaff(identity.role)
    const consent = store.getConsent()

    const filters = FILTERS.filter(function (f) {
      return !f.staffOnly || isStaff
    })

    this.setData({
      identity: identity,
      isStaff: isStaff,
      consent: consent,
      filters: filters,
      scopeLabel: isStaff ? '可查看全部单据并核对业务事实' : '仅可查询本人名下单据'
    })

    if (!consent || !consent.granted) {
      this.setData({ showConsent: true })
    }
    this.refresh()
  },

  refresh() {
    const identity = this.data.identity
    const all = store.listDocuments({ identity: identity })

    const doing = all.filter(function (d) {
      return d.status !== 'paid' && d.status !== 'rejected'
    }).length
    const done = all.filter(function (d) {
      return d.status === 'paid' || d.status === 'rejected'
    }).length
    let amount = 0
    all.forEach(function (d) {
      amount += Number(d.amount) || 0
    })

    const pendingVerify = all.filter(function (d) {
      return !d.factVerified && dict.FINANCE_PENDING.indexOf(d.status) >= 0
    }).length

    const filter = this.data.activeFilter
    let list = all
    if (filter === 'doing') {
      list = all.filter(function (d) {
        return d.status !== 'paid' && d.status !== 'rejected'
      })
    } else if (filter === 'done') {
      list = all.filter(function (d) {
        return d.status === 'paid' || d.status === 'rejected'
      })
    } else if (filter === 'verify') {
      list = all.filter(function (d) {
        return !d.factVerified && dict.FINANCE_PENDING.indexOf(d.status) >= 0
      })
    }

    const view = list.map(function (d) {
      const st = dict.statusOf(d.status)
      return {
        id: d.id,
        docNo: d.docNo,
        docType: d.docType,
        amountText: fmt.formatAmount(d.amount),
        reason: d.reason,
        statusLabel: st.label,
        statusTag: st.tag,
        submittedLabel: fmt.fromNow(d.submittedAt),
        factVerified: d.factVerified,
        verifiedBy: d.verifiedBy,
        ownerName: d.ownerName,
        ownerDept: d.ownerDept,
        showOwner: isStaffOwner(d, identity)
      }
    })

    this.setData({
      list: view,
      pendingVerify: pendingVerify,
      stats: {
        total: all.length,
        doing: doing,
        done: done,
        amountText: fmt.formatAmount(amount)
      }
    })
  },

  onPickFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.key })
    this.refresh()
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/doc-detail/doc-detail?id=' + e.currentTarget.dataset.id
    })
  },

  onConsentAgree() {
    store.grantConsent()
    this.setData({ showConsent: false, consent: store.getConsent() })
    wx.showToast({ title: '已授权，仅限本人单据', icon: 'none' })
  },

  onConsentRefuse() {
    this.setData({ showConsent: false })
  },

  onShowConsent() {
    this.setData({ showConsent: true })
  },

  onLoadSamples() {
    const res = store.createSampleDocuments(this.data.identity)
    if (res.ok) {
      wx.showToast({ title: '已载入 ' + res.created + ' 条示例单据', icon: 'none' })
      this.refresh()
    } else {
      wx.showToast({ title: res.message || '载入失败', icon: 'none' })
    }
  },

  goPolicy() {
    wx.switchTab({ url: '/pages/policy/policy' })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手 · 单据进度查询',
      path: '/pages/docs/docs'
    }
  }
})

function isStaffOwner(doc, identity) {
  return dict.isStaff(identity.role) && doc.ownerId !== identity.id
}
