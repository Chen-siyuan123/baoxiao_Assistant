const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

const TABS = [
  { key: 'pending', label: '待核对' },
  { key: 'approved', label: '待打款' },
  { key: 'all', label: '全部单据' }
]

const TYPE_TO_POLICY = {
  差旅费: ['差旅费报销制度'],
  市内交通: ['市内交通与通勤补贴制度'],
  业务招待: ['业务招待费管理制度'],
  办公用品: ['办公用品及设备采购报销制度'],
  其他: []
}

const CHECK_ITEMS = [
  '金额与发票金额一致，无涂改',
  '费用事由与实际业务相符',
  '未超出制度规定的上限或标准',
  '凭证材料齐全（发票抬头、税号、附件）'
]

function buildChecklist() {
  return CHECK_ITEMS.map(function (t, i) {
    return { key: 'c' + i, text: t, checked: false }
  })
}

Page({
  data: {
    identity: {},
    canVerify: false,
    tabs: TABS,
    tab: 'pending',
    list: [],
    counts: { pending: 0, approved: 0, all: 0 },
    showVerify: false,
    current: null,
    checklist: buildChecklist(),
    checkedCount: 0,
    verifyNote: '',
    policyHint: []
  },

  onShow() {
    const identity = app.refreshIdentity()
    const canVerify = dict.canVerifyFacts(identity.role)
    this.setData({ identity: identity, canVerify: canVerify })

    const focus = app.globalData.financeFocusId
    if (focus) {
      app.globalData.financeFocusId = ''
      this.setData({ tab: 'pending' })
      this.refresh()
      const self = this
      setTimeout(function () {
        self.openVerify(focus)
      }, 80)
      return
    }
    this.refresh()
  },

  refresh() {
    const identity = this.data.identity
    const all = store.listDocuments({ identity: identity })

    const pendingList = all.filter(function (d) {
      return !d.factVerified && dict.FINANCE_PENDING.indexOf(d.status) >= 0
    })
    const approvedList = all.filter(function (d) {
      return d.status === 'approved'
    })

    this.setData({
      counts: {
        pending: pendingList.length,
        approved: approvedList.length,
        all: all.length
      }
    })

    let list = all
    if (this.data.tab === 'pending') list = pendingList
    else if (this.data.tab === 'approved') list = approvedList

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
        ownerName: d.ownerName,
        ownerDept: d.ownerDept,
        ownerEmployeeNo: d.ownerEmployeeNo,
        submittedLabel: fmt.formatDateTime(d.submittedAt),
        factVerified: d.factVerified,
        verifiedBy: d.verifiedBy,
        verifyNote: d.verifyNote,
        needsVerify: !d.factVerified && dict.FINANCE_PENDING.indexOf(d.status) >= 0,
        canPay: d.status === 'approved'
      }
    })

    this.setData({ list: view })
  },

  onPickTab(e) {
    this.setData({ tab: e.currentTarget.dataset.key })
    this.refresh()
  },

  openVerify(input) {
    const id =
      typeof input === 'string'
        ? input
        : input && input.currentTarget
          ? input.currentTarget.dataset.id
          : ''
    const doc = store.getDocument(id, this.data.identity)
    if (!doc) {
      wx.showToast({ title: '无权查看该单据', icon: 'none' })
      return
    }
    const st = dict.statusOf(doc.status)

    // 制度参考：把乔姐维护的对应制度摘要带给周敏做对照
    const names = (TYPE_TO_POLICY[doc.docType] || []).concat(['报销单据提交规范'])
    const policyHint = []
    store.listPolicies({}).forEach(function (p) {
      if (names.indexOf(p.title) >= 0) {
        policyHint.push({
          id: p.id,
          title: p.title,
          version: p.version,
          summary: p.summary
        })
      }
    })

    this.setData({
      showVerify: true,
      current: {
        id: doc.id,
        docNo: doc.docNo,
        docType: doc.docType,
        amountText: fmt.formatAmount(doc.amount),
        reason: doc.reason,
        statusLabel: st.label,
        statusTag: st.tag,
        ownerName: doc.ownerName,
        ownerDept: doc.ownerDept,
        ownerEmployeeNo: doc.ownerEmployeeNo,
        submittedAt: fmt.formatDateTime(doc.submittedAt),
        factVerified: doc.factVerified,
        verifiedBy: doc.verifiedBy,
        verifyNote: doc.verifyNote
      },
      checklist: buildChecklist(),
      checkedCount: 0,
      verifyNote: '',
      policyHint: policyHint
    })
  },

  closeVerify() {
    this.setData({ showVerify: false, current: null })
  },

  onToggleCheck(e) {
    const key = e.currentTarget.dataset.key
    const checklist = this.data.checklist.map(function (c) {
      if (c.key === key) return { key: c.key, text: c.text, checked: !c.checked }
      return c
    })
    this.setData({
      checklist: checklist,
      checkedCount: checklist.filter(function (c) {
        return c.checked
      }).length
    })
  },

  onNoteInput(e) {
    this.setData({ verifyNote: e.detail.value })
  },

  goPolicyHint(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  onPass() {
    const doc = this.data.current
    if (!doc) return
    if (this.data.checkedCount < this.data.checklist.length) {
      wx.showToast({ title: '请先逐项确认核对要点', icon: 'none' })
      return
    }
    const note =
      String(this.data.verifyNote || '').trim() ||
      '四项核对要点均已确认，金额、事由与凭证与制度要求相符。'
    const res = store.verifyFacts(doc.id, note, true, this.data.identity)
    if (!res.ok) {
      wx.showToast({ title: res.message, icon: 'none' })
      return
    }
    this.setData({ showVerify: false, current: null })
    this.refresh()
    wx.showToast({ title: '已核对通过', icon: 'none' })
  },

  onReject() {
    const doc = this.data.current
    if (!doc) return
    const note = String(this.data.verifyNote || '').trim()
    if (!note) {
      wx.showToast({ title: '驳回需填写具体原因', icon: 'none' })
      return
    }
    const self = this
    wx.showModal({
      title: '驳回单据',
      content: '驳回意见会展示给员工，请确认表述清晰、可执行。',
      confirmText: '确认驳回',
      confirmColor: '#C0392B',
      success: function (r) {
        if (!r.confirm) return
        const res = store.verifyFacts(doc.id, note, false, self.data.identity)
        if (!res.ok) {
          wx.showToast({ title: res.message, icon: 'none' })
          return
        }
        self.setData({ showVerify: false, current: null })
        self.refresh()
        wx.showToast({ title: '已驳回', icon: 'none' })
      }
    })
  },

  onMarkPaid(e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '确认已打款',
      content: '标记后单据状态将更新为「已打款」，员工可见。',
      confirmText: '确认',
      confirmColor: '#1F8A70',
      success: function (r) {
        if (!r.confirm) return
        const res = store.advanceStatus(id, 'paid', '款项已支付至本人账户', self.data.identity)
        if (!res.ok) {
          wx.showToast({ title: res.message, icon: 'none' })
          return
        }
        self.refresh()
        wx.showToast({ title: '已标记打款', icon: 'none' })
      }
    })
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/doc-detail/doc-detail?id=' + e.currentTarget.dataset.id
    })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手 · 业务事实核对台',
      path: '/pages/index/index'
    }
  }
})
