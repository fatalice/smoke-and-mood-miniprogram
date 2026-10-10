// utils/format.js — 日期 / 时间格式化（移植自 demo）
// 供 smoke / tree 两页复用

function pad(n) {
  return String(n).padStart(2, '0')
}

function dateKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function todayKey() {
  return dateKey(new Date())
}

// 短日期：M月D日 周X
function fmtDateMain(d) {
  d = d || new Date()
  const W = ['日', '一', '二', '三', '四', '五', '六']
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + W[d.getDay()]
}

// 距上次吸烟：刚刚 / X 分钟前 / X 小时 Y 分钟前 / X 天 Y 小时前
function fmtAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + ' 分钟前'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' 小时' + (m % 60 ? ' ' + (m % 60) + ' 分钟' : '') + '前'
  const d = Math.floor(h / 24)
  return d + ' 天' + (h % 24 ? ' ' + (h % 24) + ' 小时' : '') + '前'
}

// 树洞留言时间：今天 HH:MM / 昨天 HH:MM / M/D HH:MM
function fmtMsgTime(t) {
  const d = new Date(t)
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  const day0 = (x) => {
    const a = new Date(x); a.setHours(0, 0, 0, 0); return a.getTime()
  }
  const diff = Math.round((day0(Date.now()) - day0(t)) / 86400000)
  if (diff === 0) return '今天 ' + hm
  if (diff === 1) return '昨天 ' + hm
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm
}

// 记录时间：HH:MM
function fmtClock(t) {
  const d = new Date(t)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

module.exports = {
  pad,
  dateKey,
  todayKey,
  fmtDateMain,
  fmtAgo,
  fmtMsgTime,
  fmtClock,
}
