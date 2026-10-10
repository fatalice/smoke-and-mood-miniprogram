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
  const now = new Date()
  const counts = {}
  const past = [7, 9, 5, 8, 6, 10]
  for (let i = 6; i >= 1; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    counts[dateKey(d)] = past[6 - i]
  }
  const offs = [420, 300, 150, 30]
  const reasons = ['饭后', '压力', '社交', '无聊']
  const records = offs.map((m, i) => ({ t: now.getTime() - m * 60000, reason: reasons[i] }))
  const tk = todayKey()
  counts[tk] = records.length
  return { limit: 10, counts, records, lastDate: tk }
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
  const now = Date.now(), H = 3600000, D = 86400000
  const raw = [
    { tag: '心事', off: 35 * 60000, text: '今天没忍住，又抽了一根。明知对身体不好，还是点了。这大概就是戒烟的难吧。', likes: 12 },
    { tag: '戒烟', off: 2 * H, text: '戒烟第 9 天，烟瘾上来的时候满脑子都是烟。咬牙坚持住，感觉自己快要赢了。', likes: 9 },
    { tag: '吐槽', off: 4 * H, text: '加班到十点，领导说明天还要出方案。成年人的崩溃，往往就在一瞬间。', likes: 21 },
    { tag: '求助', off: 7 * H, text: '想戒烟但总在应酬时破功，有戒友支个招吗？求过来人经验，在线等。', likes: 5 },
    { tag: '生活', off: 26 * H, text: '今天给爸妈打了电话，聊了半小时家常。原来他们一直在等我的电话。', likes: 14 },
    { tag: '心事', off: 30 * H, text: '有些话对身边人说不出口，只能在这里说。谢谢这个树洞。', likes: 8 },
    { tag: '生活', off: 3 * D, text: '把阳台的旧烟灰缸洗了，泡上绿萝。生活总要往前看。', likes: 19 },
    { tag: '心事', off: 5 * D, text: '辞职的念头在脑子里转了三个月，今天终于交了辞呈。有点怕，但更多的是轻松。', likes: 6 },
  ]
  return {
    messages: raw.map((r, i) => ({ id: i + 1, tag: r.tag, text: r.text, t: now - r.off, likes: r.likes })),
    liked: {},
  }
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
