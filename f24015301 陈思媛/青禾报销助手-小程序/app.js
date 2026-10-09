const store = require('./utils/store')

App({
  globalData: {
    identity: null,
    /** 本地体验模式：数据与权限在本机模拟，后续可切换为云服务 */
    mode: 'local'
  },

  onLaunch() {
    store.init()
    this.globalData.identity = store.getIdentity()
  },

  /** 各页面在 onShow 时刷新，保证切换身份后全局一致 */
  refreshIdentity() {
    this.globalData.identity = store.getIdentity()
    return this.globalData.identity
  },

  setIdentity(identity) {
    this.globalData.identity = identity
    return identity
  }
})
