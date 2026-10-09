const store = require('../../utils/store')
const dict = require('../../utils/dict')
const fmt = require('../../utils/format')

const app = getApp()

const STATUS_OPTIONS = [
  { key: 'active', label: '现行有效' },
  { key: 'pending', label: '待生效' },
  { key: 'archived', label: '已失效' }
]

function emptyForm() {
  return {
    id: '',
    title: '',
    code: '',
    category: dict.POLICY_CATEGORY[0],
    version: 'v1.0',
    status: 'active',
    effectiveDate: fmt.formatDate(new Date()),
    expireDate: '',
    summary: '',
    revisionNote: ''
  }
}

function emptyClause() {
  return { key: 'c-' + fmt.uid('x'), no: '', title: '', text: '', keywordsText: '' }
}

Page({
  data: {
    identity: {},
    isAdmin: false,
    categories: dict.POLICY_CATEGORY,
    statusOptions: STATUS_OPTIONS,
    list: [],
    activeCount: 0,
    archivedCount: 0,

    showEdit: false,
    isNewVersion: false,
    sourceId: '',
    f: emptyForm(),
    statusIndex: 0,
    clauses: []
  },

  onLoad(options) {
    this.pendingId = (options && options.id) || ''
  },

  onShow() {
    const identity = app.refreshIdentity()
    const isAdmin = dict.canMaintainPolicy(identity.role)
    this.setData({ identity: identity, isAdmin: isAdmin })
    this.refresh()
    if (this.pendingId) {
      const id = this.pendingId
      this.pendingId = ''
      this.openEditById(id)
    }
  },

  refresh() {
    const all = store.listPolicies({ includeArchived: true })
    const list = all.map(function (p) {
      const effective = store.isEffective(p)
      return {
        id: p.id,
        title: p.title,
        code: p.code,
        version: p.version,
        category: p.category,
        clauseCount: (p.clauses || []).length,
        effectiveDate: p.effectiveDate,
        expireDate: p.expireDate,
        statusLabel: effective ? '现行有效' : p.status === 'pending' ? '待生效' : '已失效',
        statusTag: effective ? 'tag-brand' : p.status === 'pending' ? 'tag-warn' : 'tag-grey',
        canEdit: true,
        updatedLabel: fmt.fromNow(p.updatedAt)
      }
    })
    this.setData({
      list: list,
      activeCount: list.filter(function (x) {
        return x.statusLabel === '现行有效'
      }).length,
      archivedCount: list.filter(function (x) {
        return x.statusLabel !== '现行有效'
      }).length
    })
  },

  /* ---------- 编辑 ---------- */
  openCreate() {
    this.setData({
      showEdit: true,
      isNewVersion: false,
      sourceId: '',
      f: emptyForm(),
      statusIndex: 0,
      clauses: [emptyClause()]
    })
  },

  openEditById(input) {
    // 既能接受字符串 id（onShow 自动打开），也能接受 tap 事件对象
    const id =
      typeof input === 'string'
        ? input
        : input && input.currentTarget
          ? input.currentTarget.dataset.id
          : ''
    const p = store.getPolicy(id)
    if (!p) return
    this.loadIntoForm(p, false, '')
  },

  onPublishNewVersion(e) {
    const p = store.getPolicy(e.currentTarget.dataset.id)
    if (!p) return
    const m = String(p.version || 'v1.0').match(/v(\d+)\.(\d+)/)
    const nextVersion = m ? 'v' + m[1] + '.' + (Number(m[2]) + 1) : 'v1.1'
    this.loadIntoForm(p, true, p.id, nextVersion)
  },

  loadIntoForm(p, isNewVersion, sourceId, overrideVersion) {
    const clauses = (p.clauses || []).map(function (c, i) {
      return {
        key: 'c-' + i + '-' + fmt.uid('x'),
        no: c.no || '',
        title: c.title || '',
        text: c.text || '',
        keywordsText: (c.keywords || []).join('、')
      }
    })
    let statusIndex = 0
    STATUS_OPTIONS.forEach(function (o, i) {
      if (o.key === p.status) statusIndex = i
    })
    this.setData({
      showEdit: true,
      isNewVersion: !!isNewVersion,
      sourceId: sourceId || '',
      statusIndex: statusIndex,
      f: {
        id: isNewVersion ? '' : p.id,
        title: p.title || '',
        code: p.code || '',
        category: p.category || dict.POLICY_CATEGORY[0],
        version: overrideVersion || p.version || 'v1.0',
        status: p.status || 'active',
        effectiveDate: isNewVersion ? fmt.formatDate(new Date()) : p.effectiveDate || '',
        expireDate: isNewVersion ? '' : p.expireDate || '',
        summary: p.summary || '',
        revisionNote: isNewVersion ? '' : p.revisionNote || ''
      },
      clauses: clauses.length ? clauses : [emptyClause()]
    })
  },

  closeEdit() {
    this.setData({ showEdit: false, isNewVersion: false, sourceId: '' })
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    const f = Object.assign({}, this.data.f)
    f[key] = e.detail.value
    this.setData({ f: f })
  },

  onCategoryChange(e) {
    const f = Object.assign({}, this.data.f)
    f.category = this.data.categories[Number(e.detail.value)]
    this.setData({ f: f })
  },

  onStatusChange(e) {
    const idx = Number(e.detail.value)
    const f = Object.assign({}, this.data.f)
    f.status = STATUS_OPTIONS[idx].key
    this.setData({ f: f, statusIndex: idx })
  },

  onDateChange(e) {
    const key = e.currentTarget.dataset.key
    const f = Object.assign({}, this.data.f)
    f[key] = e.detail.value
    this.setData({ f: f })
  },

  onClearExpire() {
    const f = Object.assign({}, this.data.f)
    f.expireDate = ''
    this.setData({ f: f })
  },

  /* ---------- 条款编辑 ---------- */
  onClauseInput(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const key = e.currentTarget.dataset.key
    const clauses = this.data.clauses.slice()
    clauses[idx] = Object.assign({}, clauses[idx])
    clauses[idx][key] = e.detail.value
    this.setData({ clauses: clauses })
  },

  addClause() {
    const clauses = this.data.clauses.concat([emptyClause()])
    this.setData({ clauses: clauses })
  },

  removeClause(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const clauses = this.data.clauses.slice()
    clauses.splice(idx, 1)
    this.setData({ clauses: clauses.length ? clauses : [emptyClause()] })
  },

  /* ---------- 保存 ---------- */
  save() {
    const f = this.data.f
    if (!String(f.title).trim()) {
      wx.showToast({ title: '请填写制度名称', icon: 'none' })
      return
    }
    if (!f.effectiveDate) {
      wx.showToast({ title: '请选择生效日期', icon: 'none' })
      return
    }

    const clauses = this.data.clauses
      .filter(function (c) {
        return String(c.title).trim() || String(c.text).trim()
      })
      .map(function (c) {
        return {
          no: String(c.no).trim() || '—',
          title: String(c.title).trim() || '条款',
          text: String(c.text).trim(),
          keywords: String(c.keywordsText || '')
            .split(/[、,，\s]+/)
            .map(function (k) {
              return k.trim()
            })
            .filter(function (k) {
              return k
            })
        }
      })

    if (clauses.length === 0) {
      wx.showToast({ title: '至少填写一条条款', icon: 'none' })
      return
    }

    const payload = Object.assign({}, f, { clauses: clauses })
    const isNewVersion = this.data.isNewVersion
    const sourceId = this.data.sourceId
    const res = store.savePolicy(payload, this.data.identity)
    if (!res.ok) {
      wx.showToast({ title: res.message, icon: 'none' })
      return
    }

    // 发布新版：旧版本自动停用，保留历史留档
    if (isNewVersion && sourceId) {
      store.archivePolicy(sourceId, this.data.identity)
    }

    this.setData({ showEdit: false, isNewVersion: false, sourceId: '' })
    this.refresh()
    wx.showToast({
      title: isNewVersion ? '新版已发布' : '已保存',
      icon: 'none'
    })
  },

  onArchive(e) {
    const id = e.currentTarget.dataset.id
    const p = store.getPolicy(id)
    if (!p) return
    const self = this
    wx.showModal({
      title: '停用制度',
      content: '停用后该制度不再作为报销依据，员工问答也不会采用它。历史留档仍可在制度库中查看。',
      confirmText: '停用',
      confirmColor: '#C0392B',
      success: function (res) {
        if (res.confirm) {
          const r = store.archivePolicy(id, self.data.identity)
          if (!r.ok) {
            wx.showToast({ title: r.message, icon: 'none' })
            return
          }
          self.refresh()
          wx.showToast({ title: '已停用', icon: 'none' })
        }
      }
    })
  },

  goPreview(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手 · 制度维护台',
      path: '/pages/index/index'
    }
  }
})
