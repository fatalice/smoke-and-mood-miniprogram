// utils/store.js — 本地存储兜底层
// 移植自 demo（戒烟树洞.html）的 localStorage 逻辑，转换为 wx.storage。
// api.js 在云端不可用时回退到本模块，保证后端未部署也能跑通 UI。
// 数据结构与云端返回保持一致，页面无感知切换。

const { dateKey, todayKey } = require('./format')

const LS_SMOKE = 'smoke_tracker_v1'
const LS_TREE = 'tree_hole_v1'

const REASONS = ['压力', '社交', '无聊', '饭后', '工作', '其他']

/* ============ 戒烟记录 ============ */

function seedSmoke() {
  // 后端已部署：云端失败时本地兜底不再造假历史，返回空状态
  const tk = todayKey()
  return { limit: 10, counts: {}, records: [], lastDate: tk }
}

function loadSmoke() {
  let s = null
  try { s = wx.getStorageSync(LS_SMOKE) } catch (e) { s = null }
  if (!s || typeof s.limit !== 'number' || !s.counts || !s.records) {
    s = seedSmoke()
  }
  const tk = todayKey()
  if (s.lastDate !== tk) {
    if (!s.counts[tk]) s.counts[tk] = 0
    s.records = []
    s.lastDate = tk
  }
  // 仅保留最近 15 天
  const cutoff = dateKey(new Date(Date.now() - 15 * 86400000))
  for (const k in s.counts) {
    if (k < cutoff) delete s.counts[k]
  }
  return s
}

function saveSmoke(s) {
  try { wx.setStorageSync(LS_SMOKE, s) } catch (e) {}
}

function computeStreak(counts, limit) {
  let st = 0
  const d = new Date()
  for (let i = 0; i < 365; i++) {
    const k = dateKey(d)
    if (!(k in counts)) break
    if (counts[k] > limit) break
    st++
    d.setDate(d.getDate() - 1)
  }
  return st
}

function smokeGetState() {
  const s = loadSmoke()
  const tk = todayKey()
  const count = s.counts[tk] || 0
  const week = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = dateKey(d)
    week.push({ date: k, count: s.counts[k] || 0 })
  }
  const yesterdayCount = week[5] ? week[5].count : 0
  return {
    limit: s.limit,
    today: { count, records: s.records.slice() },
    week,
    yesterdayCount,
    streak: computeStreak(s.counts, s.limit),
  }
}

function smokeLog(reason) {
  const s = loadSmoke()
  const tk = todayKey()
  s.records.push({ t: Date.now(), reason: reason || REASONS[0] })
  s.counts[tk] = (s.counts[tk] || 0) + 1
  saveSmoke(s)
  return smokeGetState()
}

function smokeUndo() {
  const s = loadSmoke()
  if (!s.records.length) return smokeGetState()
  const tk = todayKey()
  s.records.pop()
  s.counts[tk] = Math.max(0, (s.counts[tk] || 1) - 1)
  saveSmoke(s)
  return smokeGetState()
}

function smokeDeleteRecord(idx) {
  const s = loadSmoke()
  if (idx < 0 || idx >= s.records.length) return smokeGetState()
  const tk = todayKey()
  s.records.splice(idx, 1)
  s.counts[tk] = Math.max(0, (s.counts[tk] || 0) - 1)
  saveSmoke(s)
  return smokeGetState()
}

function smokeSetLimit(limit) {
  const s = loadSmoke()
  s.limit = Math.min(30, Math.max(1, limit))
  saveSmoke(s)
  return smokeGetState()
}

/* ============ 树洞留言 ============ */

function seedTree() {
  // 后端已部署：云端失败时本地兜底不再造假留言，返回空
  return { messages: [], liked: {} }
}

function loadTree() {
  let t = null
  try { t = wx.getStorageSync(LS_TREE) } catch (e) { t = null }
  if (!t || !t.messages) t = seedTree()
  return t
}

function saveTree(t) {
  try { wx.setStorageSync(LS_TREE, t) } catch (e) {}
}

function treeList() {
  const t = loadTree()
  const messages = t.messages.slice().sort((a, b) => b.t - a.t)
  const likedIds = Object.keys(t.liked).filter((k) => t.liked[k]).map((k) => Number(k))
  return { messages, likedIds }
}

function treePost({ tag, text }) {
  const t = loadTree()
  const id = Date.now()
  t.messages.push({ id, tag, text, t: Date.now(), likes: 0 })
  saveTree(t)
  return treeList()
}

function treeToggleLike(messageId) {
  const t = loadTree()
  const m = t.messages.find((x) => x.id === messageId)
  if (!m) return treeList()
  if (t.liked[messageId]) { t.liked[messageId] = false; m.likes = Math.max(0, m.likes - 1) }
  else { t.liked[messageId] = true; m.likes++ }
  saveTree(t)
  return treeList()
}

module.exports = {
  REASONS,
  smokeGetState, smokeLog, smokeUndo, smokeDeleteRecord, smokeSetLimit,
  treeList, treePost, treeToggleLike,
}
