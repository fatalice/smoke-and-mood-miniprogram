// utils/api.js — 云端访问层
// wx.request 直连云托管 https://wujiaqi12.site（复用 alveyTools / mahjong-score 模式）。
// 走公网域名，不经过小程序云网关 → 不受 appid 绑定限制。
// 身份用本地生成的 userId（无 secret、无 code2session），后端经 body._openid 读取。
// 云端失败时回退到本地 store.js，保证未连通时 UI 仍可用。

const store = require('./store')

const BASE_URL = 'https://wujiaqi12.site'
const UID_KEY = 'smoke_uid'

let _uid = ''
function ensureUid() {
  if (_uid) return _uid
  try { _uid = wx.getStorageSync(UID_KEY) || '' } catch (e) { _uid = '' }
  if (!_uid) {
    _uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    try { wx.setStorageSync(UID_KEY, _uid) } catch (e) {}
  }
  return _uid
}

let _cloudOk = null

function call({ path, data = {} }) {
  return new Promise((resolve, reject) => {
    const uid = ensureUid()
    const payload = { ...(data || {}), _openid: uid }
    wx.request({
      url: BASE_URL + path,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: payload,
      timeout: 30000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0 || body.code === 200) resolve(body.data)
            else reject({ code: body.code, message: body.message || '接口错误' })
          } else {
            resolve(body)
          }
        } else {
          reject({ code: res.statusCode, message: 'HTTP ' + res.statusCode })
        }
      },
      fail(err) {
        reject({ code: 'REQUEST_ERROR', message: (err && err.errMsg) || String(err) })
      },
    })
  })
}

async function withFallback(cloudFn, storeFn, label) {
  try {
    const data = await cloudFn()
    _cloudOk = true
    return { data, source: 'cloud' }
  } catch (err) {
    if (_cloudOk !== true) {
      console.warn('[api] 云端不可用，回退本地：' + label, (err && err.message) || err)
    }
    _cloudOk = false
    const data = storeFn()
    return { data, source: 'local' }
  }
}

/* ---- 戒烟记录 ---- */
function smokeGetState() {
  return withFallback(() => call({ path: '/api/smoke', data: { action: 'getState' } }), () => store.smokeGetState(), 'smoke.getState')
}
function smokeLog(reason) {
  return withFallback(() => call({ path: '/api/smoke', data: { action: 'log', reason } }), () => store.smokeLog(reason), 'smoke.log')
}
function smokeUndo() {
  return withFallback(() => call({ path: '/api/smoke', data: { action: 'undo' } }), () => store.smokeUndo(), 'smoke.undo')
}
function smokeDeleteRecord(idx) {
  return withFallback(() => call({ path: '/api/smoke', data: { action: 'deleteRecord', idx } }), () => store.smokeDeleteRecord(idx), 'smoke.deleteRecord')
}
function smokeSetLimit(limit) {
  return withFallback(() => call({ path: '/api/smoke', data: { action: 'setLimit', limit } }), () => store.smokeSetLimit(limit), 'smoke.setLimit')
}

/* ---- 树洞留言 ---- */
function treeList() {
  return withFallback(() => call({ path: '/api/tree', data: { action: 'list' } }), () => store.treeList(), 'tree.list')
}
function treePost(payload) {
  return withFallback(() => call({ path: '/api/tree', data: { action: 'post', ...payload } }), () => store.treePost(payload), 'tree.post')
}
function treeToggleLike(messageId) {
  return withFallback(() => call({ path: '/api/tree', data: { action: 'toggleLike', messageId } }), () => store.treeToggleLike(messageId), 'tree.toggleLike')
}

module.exports = {
  smokeGetState, smokeLog, smokeUndo, smokeDeleteRecord, smokeSetLimit,
  treeList, treePost, treeToggleLike,
}
