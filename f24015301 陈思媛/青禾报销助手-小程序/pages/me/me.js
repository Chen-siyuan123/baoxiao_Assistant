const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

Page({
  data: {
    identity: {},
    roleLabel: '',
    roleDesc: '',
    roleTag: 'tag-grey',
    isAdmin: false,
    isFinance: false,
    isStaff: false,
    consent: null,
    consentAt: '',
    docCount: 0,
    policyCount: 0,
    demoList: [],
    showProfile: false,
    showIdentity: false,
    form: { name: '', dept: '', employeeNo: '' }
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const identity = app.refreshIdentity()
    const role = dict.roleOf(identity.role)
    const consent = store.getConsent()
    this.setData({
      identity: identity,
      roleLabel: role.label,
      roleDesc: role.desc,
      roleTag: role.tag,
      isAdmin: dict.canMaintainPolicy(identity.role),
      isFinance: identity.role === 'finance',
      isStaff: dict.isStaff(identity.role),
      consent: consent,
      consentAt: consent && consent.at ? fmt.formatDateTime(consent.at) : '',
      docCount: store.listDocuments({ identity: identity }).length,
      policyCount: store.listPolicies({}).length,
      demoList: dict.DEMO_IDENTITIES.map(function (d) {
        return {
          id: d.id,
          name: d.name,
          dept: d.dept,
          employeeNo: d.employeeNo,
          roleLabel: dict.roleOf(d.role).label,
          roleTag: dict.roleOf(d.role).tag,
          current: d.id === identity.id
        }
      }),
      form: {
        name: identity.name || '',
        dept: identity.dept || '',
        employeeNo: identity.employeeNo || ''
      }
    })
  },

  /* ---------- 资料编辑 ---------- */
  openProfile() {
    this.setData({ showProfile: true })
  },

  closeProfile() {
    this.setData({ showProfile: false })
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    const form = Object.assign({}, this.data.form)
    form[key] = e.detail.value
    this.setData({ form: form })
  },

  saveProfile() {
    const form = this.data.form
    if (!String(form.name).trim()) {
      wx.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    let identity = store.saveIdentity({
      name: String(form.name).trim(),
      dept: String(form.dept).trim() || '未填写部门'
    })

    const no = String(form.employeeNo || '').trim().toUpperCase()
    if (no && no !== identity.employeeNo) {
      const res = store.bindEmployeeNo(no)
      if (!res.ok) {
        wx.showToast({ title: res.message, icon: 'none' })
        this.refresh()
        return
      }
      identity = res.identity
      wx.showToast({ title: res.message, icon: 'none' })
    } else {
      wx.showToast({ title: '已保存', icon: 'none' })
    }

    app.setIdentity(identity)
    this.setData({ showProfile: false })
    this.refresh()
  },

  /* ---------- 体验身份切换 ---------- */
  openIdentity() {
    this.setData({ showIdentity: true })
  },

  closeIdentity() {
    this.setData({ showIdentity: false })
  },

  onSwitchIdentity(e) {
    const id = e.currentTarget.dataset.id
    const identity = store.switchIdentity(id)
    app.setIdentity(identity)
    this.setData({ showIdentity: false })
    this.refresh()
    wx.showToast({
      title: '已切换为' + dict.roleOf(identity.role).label + '「' + identity.name + '」',
      icon: 'none'
    })
  },

  /* ---------- 授权 ---------- */
  onShowConsent() {
    wx.switchTab({ url: '/pages/docs/docs' })
  },

  onRevokeConsent() {
    const self = this
    wx.showModal({
      title: '撤回单据查询授权',
      content: '撤回后将不再展示你的单据进度，直到你再次授权。',
      confirmText: '撤回',
      confirmColor: '#C0392B',
      success: function (res) {
        if (res.confirm) {
          store.revokeConsent()
          self.refresh()
          wx.showToast({ title: '已撤回授权', icon: 'none' })
        }
      }
    })
  },

  /* ---------- 数据管理 ---------- */
  onReset() {
    const self = this
    wx.showModal({
      title: '重置演示数据',
      content: '将恢复制度库与示例单据到初始状态，并清空问答留痕和授权记录。本机新增的数据会丢失。',
      confirmText: '重置',
      confirmColor: '#C0392B',
      success: function (res) {
        if (res.confirm) {
          store.resetAll()
          app.refreshIdentity()
          self.refresh()
          wx.showToast({ title: '已重置', icon: 'none' })
        }
      }
    })
  },

  goPolicy() {
    wx.switchTab({ url: '/pages/policy/policy' })
  },

  goDocs() {
    wx.switchTab({ url: '/pages/docs/docs' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  goFinance() {
    wx.navigateTo({ url: '/pages/finance/finance' })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手',
      path: '/pages/index/index'
    }
  }
})
