// utils/api.js — 云端访问层（云托管 callContainer）
// 复用 alveyTools 的云环境：env=cloudenv1-d4gkp36fb4243e78c，服务=fataliceenv。
// 用 wx.cloud.callContainer 调用后端（平台自动注入 x-wx-openid，无需 app secret / code2session）。
// 云端失败时回退到本地 store.js，保证未部署后端时 UI 仍可用。

const store = require('./store')

let _cloudOk = null // null=未知 true=可用 false=不可用

function call({ path, data = {} }) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    if (!wx.cloud || !wx.cloud.callContainer) {
      reject({ code: 'NO_CLOUD', message: '云能力不可用' })
      return
    }
    wx.cloud.callContainer({
      config: { env: app.globalData.envId },
      path,
      method: 'POST',
      data,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': app.globalData.serviceName,
      },
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

// 云端调用 + 本地兜底
async function withFallback(cloudFn, storeFn, label) {
  try {
    const data = await cloudFn()
    _cloudOk = true
    return { data, source: 'cloud' }
  } catch (err) {
    if (_cloudOk === null) {
      console.warn('[api] 云端不可用，回退本地：' + label, err && err.message)
      _cloudOk = false
    }
    const data = storeFn()
    return { data, source: 'local' }
  }
}

/* ---- 戒烟记录 ---- */

function smokeGetState() {
  return withFallback(
    () => call({ path: '/api/smoke', data: { action: 'getState' } }),
    () => store.smokeGetState(),
    'smoke.getState'
  )
}
function smokeLog(reason) {
  return withFallback(
    () => call({ path: '/api/smoke', data: { action: 'log', reason } }),
    () => store.smokeLog(reason),
    'smoke.log'
  )
}
function smokeUndo() {
  return withFallback(
    () => call({ path: '/api/smoke', data: { action: 'undo' } }),
    () => store.smokeUndo(),
    'smoke.undo'
  )
}
function smokeDeleteRecord(idx) {
  return withFallback(
    () => call({ path: '/api/smoke', data: { action: 'deleteRecord', idx } }),
    () => store.smokeDeleteRecord(idx),
    'smoke.deleteRecord'
  )
}
function smokeSetLimit(limit) {
  return withFallback(
    () => call({ path: '/api/smoke', data: { action: 'setLimit', limit } }),
    () => store.smokeSetLimit(limit),
    'smoke.setLimit'
  )
}

/* ---- 树洞留言 ---- */

function treeList() {
  return withFallback(
    () => call({ path: '/api/tree', data: { action: 'list' } }),
    () => store.treeList(),
    'tree.list'
  )
}
function treePost(payload) {
  return withFallback(
    () => call({ path: '/api/tree', data: { action: 'post', ...payload } }),
    () => store.treePost(payload),
    'tree.post'
  )
}
function treeToggleLike(messageId) {
  return withFallback(
    () => call({ path: '/api/tree', data: { action: 'toggleLike', messageId } }),
    () => store.treeToggleLike(messageId),
    'tree.toggleLike'
  )
}

module.exports = {
  smokeGetState, smokeLog, smokeUndo, smokeDeleteRecord, smokeSetLimit,
  treeList, treePost, treeToggleLike,
}
