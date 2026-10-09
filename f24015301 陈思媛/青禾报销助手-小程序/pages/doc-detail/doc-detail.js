const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

const TYPE_TO_POLICY = {
  差旅费: ['差旅费报销制度'],
  市内交通: ['市内交通与通勤补贴制度'],
  业务招待: ['业务招待费管理制度'],
  办公用品: ['办公用品及设备采购报销制度'],
  其他: []
}

const ORDER = {
  submitted: 0,
  under_review: 1,
  finance_check: 2,
  approved: 3,
  paid: 4
}

Page({
  data: {
    id: '',
    doc: null,
    denied: false,
    isFinance: false,
    canVerify: false,
    timeline: [],
    relatedPolicies: [],
    verifyBlock: {}
  },

  onLoad(options) {
    this.setData({ id: (options && options.id) || '' })
  },

  onShow() {
    const identity = app.refreshIdentity()
    this.setData({
      isFinance: identity.role === 'finance',
      canVerify: dict.canVerifyFacts(identity.role)
    })
    this.load(identity)
  },

  load(identity) {
    const raw = store.getDocument(this.data.id, identity)
    if (!raw) {
      const exists = store.allDocuments().some(
        function (d) {
          return d.id === this.data.id
        }.bind(this)
      )
      this.setData({ doc: null, denied: !!exists })
      return
    }

    const st = dict.statusOf(raw.status)
    const doc = {
      id: raw.id,
      docNo: raw.docNo,
      docType: raw.docType,
      amountText: fmt.formatAmount(raw.amount),
      reason: raw.reason,
      status: raw.status,
      statusLabel: st.label,
      statusTag: st.tag,
      statusHint: st.hint,
      submittedAt: fmt.formatDateTime(raw.submittedAt),
      ownerName: raw.ownerName,
      ownerDept: raw.ownerDept,
      ownerEmployeeNo: raw.ownerEmployeeNo,
      factVerified: raw.factVerified,
      verifiedBy: raw.verifiedBy,
      verifiedAt: raw.verifiedAt ? fmt.formatDateTime(raw.verifiedAt) : '',
      verifyNote: raw.verifyNote
    }

    const events = store.listEvents(raw.id)
    const timeline = events.map(function (e, i) {
      return {
        key: 'tl-' + i,
        type: 'done',
        label: e.step,
        actor: e.actor,
        note: e.note,
        at: fmt.formatDateTime(e.at)
      }
    })

    if (raw.status !== 'rejected') {
      const cur = ORDER[raw.status] === undefined ? 0 : ORDER[raw.status]
      dict.FLOW_STEPS.slice(cur + 1).forEach(function (s, i) {
        timeline.push({
          key: 'pd-' + i,
          type: 'pending',
          label: s.label,
          actor: '',
          note: '待进行',
          at: ''
        })
      })
    }

    const names = (TYPE_TO_POLICY[raw.docType] || []).concat(['报销单据提交规范'])
    const relatedPolicies = []
    names.forEach(function (n) {
      store.listPolicies({}).forEach(function (p) {
        if (p.title === n && !relatedPolicies.some(function (r) { return r.id === p.id })) {
          relatedPolicies.push({
            id: p.id,
            title: p.title,
            code: p.code,
            version: p.version,
            effectiveDate: p.effectiveDate
          })
        }
      })
    })

    let verifyBlock = {}
    if (raw.factVerified) {
      verifyBlock = {
        state: 'ok',
        title: '业务事实已核对',
        by: raw.verifiedBy,
        at: fmt.formatDateTime(raw.verifiedAt),
        note: raw.verifyNote
      }
    } else {
      verifyBlock = {
        state: dict.FINANCE_PENDING.indexOf(raw.status) >= 0 ? 'wait' : 'idle',
        title:
          dict.FINANCE_PENDING.indexOf(raw.status) >= 0
            ? '等待财务专员核对业务事实'
            : '尚未进入财务核对环节',
        by: '周敏',
        at: '',
        note:
          '金额、事由与凭证的认定，以财务专员周敏的核对结论为准。核对完成前，单据金额与状态仅供参考。'
      }
    }

    this.setData({
      doc: doc,
      denied: false,
      timeline: timeline,
      relatedPolicies: relatedPolicies,
      verifyBlock: verifyBlock
    })
    wx.setNavigationBarTitle({ title: raw.docType + '单据' })
  },

  copyDocNo() {
    const doc = this.data.doc
    if (!doc) return
    wx.setClipboardData({
      data: doc.docNo,
      success: function () {
        wx.showToast({ title: '单号已复制', icon: 'none' })
      }
    })
  },

  goPolicy(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  goVerify() {
    app.globalData.financeFocusId = this.data.id
    wx.navigateTo({ url: '/pages/finance/finance' })
  },

  goAsk() {
    app.globalData.askQuestion = this.data.doc.docType + '报销的上限与要求是什么？'
    wx.switchTab({ url: '/pages/ask/ask' })
  }
})
