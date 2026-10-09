/**
 * 格式化工具
 */

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 时间戳/日期字符串 → YYYY-MM-DD */
function formatDate(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return String(input)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/** 时间戳/日期字符串 → YYYY-MM-DD HH:mm */
function formatDateTime(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return String(input)
  return formatDate(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** 金额千分位，保留两位小数 */
function formatAmount(num) {
  const n = Number(num)
  if (isNaN(n)) return '0.00'
  const fixed = Math.abs(n).toFixed(2)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + parts.join('.')
}

/** 金额带符号：¥3,860.00 */
function formatMoney(num) {
  return '¥' + formatAmount(num)
}

/** 相对时间：刚刚 / 3 小时前 / 5 天前 / 2026-03-01 */
function fromNow(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return String(input)
  const diff = Date.now() - d.getTime()
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < 0) return formatDate(d)
  if (diff < min) return '刚刚'
  if (diff < hour) return Math.floor(diff / min) + ' 分钟前'
  if (diff < day) return Math.floor(diff / hour) + ' 小时前'
  if (diff < 30 * day) return Math.floor(diff / day) + ' 天前'
  return formatDate(d)
}

/** 今天 00:00 的时间戳 */
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 生成单据编号：QH + yyyymmdd + 4 位随机 */
function makeDocNo() {
  const d = new Date()
  const stamp = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
  const rand = Math.floor(1000 + Math.random() * 9000)
  return 'QH' + stamp + rand
}

function uid(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36)
}

module.exports = {
  pad,
  formatDate,
  formatDateTime,
  formatAmount,
  formatMoney,
  fromNow,
  startOfToday,
  makeDocNo,
  uid
}
