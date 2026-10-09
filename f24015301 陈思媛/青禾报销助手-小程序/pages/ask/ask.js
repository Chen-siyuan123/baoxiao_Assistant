const store = require('../../utils/store')
const dict = require('../../utils/dict')
const retrieve = require('../../utils/retrieve')
const fmt = require('../../utils/format')

const app = getApp()

/* 欢迎语中的能力说明，只讲一次 */
function welcomeMessage() {
  return {
    id: 'msg-welcome',
    role: 'bot',
    kind: 'welcome',
    text:
      '你好，我是青禾报销助手。\n' +
      '你可以直接用一句话问我报销口径，例如「出差住宿一晚能报多少」。\n' +
      '我只依据现行有效制度作答，并给出条款出处。',
    matched: true,
    citations: [],
    extra: [],
    suggestions: []
  }
}

Page({
  data: {
    identity: {},
    messages: [],
    input: '',
    policyCount: 0,
    scrollInto: '',
    hotQuestions: retrieve.HOT_QUESTIONS,
    showHistory: false,
    history: []
  },

  onLoad() {
    this.setData({ messages: [welcomeMessage()] })
  },

  onShow() {
    const identity = app.refreshIdentity()
    this.setData({
      identity: identity,
      policyCount: store.listPolicies({}).length
    })

    const pending = app.globalData.askQuestion
    if (pending) {
      app.globalData.askQuestion = ''
      this.setData({ input: pending })
      const self = this
      setTimeout(function () {
        self.ask(pending)
      }, 60)
    }
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  onClearInput() {
    this.setData({ input: '' })
  },

  onSend() {
    this.ask(this.data.input)
  },

  onAskHot(e) {
    this.ask(e.currentTarget.dataset.q)
  },

  ask(rawQuestion) {
    const question = String(rawQuestion || '').trim()
    if (!question) {
      wx.showToast({ title: '先输入问题', icon: 'none' })
      return
    }

    const result = retrieve.answer(question)
    const stamp = Date.now()
    const userMsg = {
      id: 'u-' + stamp,
      role: 'user',
      text: question
    }

    const citeNames = (result.citations || []).map(function (c) {
      return c.policyTitle + ' 第' + c.clauseNo + '条'
    })

    const botMsg = {
      id: 'b-' + stamp,
      role: 'bot',
      kind: result.matched ? 'answer' : 'miss',
      text: result.answer,
      matched: result.matched,
      citations: result.citations || [],
      extra: result.extra || [],
      suggestions: result.suggestions || [],
      handwritten: result.handwritten || '',
      consulted:
        '本条口径来自行政专员乔姐维护的现行有效制度' +
        (result.matched ? '（' + citeNames.join('、') + '）' : '') +
        '。如与实际执行情形不符，以乔姐的正式答复为准；涉及单据金额与凭证的认定，以财务专员周敏的核对结论为准。',
      at: fmt.formatDateTime(new Date())
    }

    store.addQaLog({
      question: question,
      answer: result.answer,
      cited: citeNames,
      matched: result.matched
    })
    this.syncHistory()

    this.setData({
      messages: this.data.messages.concat([userMsg, botMsg]),
      input: ''
    })
    this.scrollTo(botMsg.id)
  },

  scrollTo(id) {
    const self = this
    setTimeout(function () {
      self.setData({ scrollInto: 'anchor-' + id })
    }, 40)
  },

  goPolicyDetail(e) {
    wx.navigateTo({
      url: '/pages/policy-detail/policy-detail?id=' + e.currentTarget.dataset.id
    })
  },

  copyAnswer(e) {
    const msg = this.data.messages.find(function (m) {
      return m.id === e.currentTarget.dataset.id
    })
    if (!msg) return
    const lines = [msg.text]
    ;(msg.citations || []).forEach(function (c) {
      lines.push('出处：《' + c.policyTitle + '》' + c.code + ' ' + c.version + ' 第 ' + c.clauseNo + ' 条')
    })
    wx.setClipboardData({
      data: lines.join('\n'),
      success: function () {
        wx.showToast({ title: '已复制', icon: 'none' })
      }
    })
  },

  onToggleHistory() {
    if (!this.data.showHistory) {
      this.syncHistory()
    }
    this.setData({ showHistory: !this.data.showHistory })
  },

  syncHistory() {
    this.setData({
      history: store.listQaLogs(20).map(function (l) {
        return {
          id: l.id,
          question: l.question,
          matched: l.matched,
          at: fmt.fromNow(l.createdAt)
        }
      })
    })
  },

  onRecall(e) {
    this.setData({ showHistory: false })
    this.ask(e.currentTarget.dataset.q)
  },

  onClearHistory() {
    const self = this
    wx.showModal({
      title: '清空问答留痕',
      content: '将删除本机保存的历史提问记录，不影响制度与单据数据。',
      confirmColor: '#1F8A70',
      success: function (res) {
        if (res.confirm) {
          store.clearQaLogs()
          self.syncHistory()
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  },

  onResetChat() {
    this.setData({ messages: [welcomeMessage()] })
  },

  onShareAppMessage() {
    return {
      title: '青禾报销助手 · 报销口径一问就清楚',
      path: '/pages/ask/ask'
    }
  }
})
