// pages/smoke/index.js — 记录戒烟页
const api = require('../../utils/api')
const { REASONS } = require('../../utils/store')
const { fmtDateMain, fmtAgo, fmtClock } = require('../../utils/format')

Page({
  data: {
    statusBarHeight: 20,
    topPad: 40,
    dateMain: '',
    dateSub: '',
    streakText: '',
    smoked: 0,
    limit: 10,
    statLeft: 0,
    heroTag: '剩余额度',
    statusHead: '',
    statusNum: '',
    statusTail: '',
    statusCls: 'ok',
    awayText: '',
    week: [],
    chartHint: '',
    recCount: '0 条',
    timeline: [],
    confirmIdx: -1,
    _delTimer: null,
    // 弹层
    reasonSheet: false,
    limitSheet: false,
    selReason: REASONS[0],
    reasons: REASONS,
    curLimit: 10,
    stepMinusDisabled: false,
    stepPlusDisabled: false,
  },

  onLoad() {
    try {
      const win = wx.getWindowInfo()
      const sb = win.statusBarHeight || 20
      this.setData({ statusBarHeight: sb, topPad: sb + 20 })
    } catch (e) {}
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  onUnload() {
    if (this.data._delTimer) clearTimeout(this.data._delTimer)
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },

  async refresh() {
    const res = await api.smokeGetState()
    this.applyState(res.data)
  },

  applyState(s) {
    const smoked = (s.today && s.today.count) || 0
    const records = (s.today && s.today.records) || []
    const limit = s.limit
    const left = limit - smoked

    let statusHead, statusNum, statusTail, statusCls
    if (left > 0) {
      statusHead = '今日还剩 '; statusNum = String(left); statusTail = ' 根，悠着点'; statusCls = 'ok'
    } else if (left === 0) {
      statusHead = '今日额度已用完，忍一忍，明天再来'; statusNum = ''; statusTail = ''; statusCls = 'warn'
    } else {
      statusHead = '已超出限额 '; statusNum = String(-left); statusTail = ' 根，身体要紧'; statusCls = 'over'
    }

    let awayText
    if (records.length) {
      awayText = '距上次吸烟 ' + fmtAgo(records[records.length - 1].t)
    } else {
      awayText = '今天还没有记录，点上方按钮记下第一支'
    }

    const diff = smoked - (s.yesterdayCount || 0)
    let dateSub
    if (diff < 0) dateSub = '今天已坚持 · 比昨天少 ' + (-diff) + ' 根'
    else if (diff > 0) dateSub = '比昨天多 ' + diff + ' 根，注意节奏'
    else dateSub = '与昨天持平，稳住节奏'

    const streakText = s.streak > 0 ? '连续 ' + s.streak + ' 天' : '无连续达标'

    const week = s.week || []
    const sum = week.reduce((a, b) => a + (b.count || 0), 0)
    const chartHint = '日均 ' + (sum / 7).toFixed(1) + ' 根'

    const timeline = records
      .map((r, idx) => ({ idx, t: r.t, time: fmtClock(r.t), reason: r.reason }))
      .sort((a, b) => b.t - a.t)

    this.setData({
      dateMain: fmtDateMain(),
      dateSub, streakText,
      smoked, limit, statLeft: Math.max(0, left),
      heroTag: left >= 0 ? '剩余额度' : '已超限',
      statusHead, statusNum, statusTail, statusCls,
      awayText, week, chartHint,
      recCount: records.length + ' 条',
      timeline,
      confirmIdx: -1,
    })
  },

  toast(msg) {
    wx.showToast({ title: msg, icon: 'none', duration: 2200 })
  },

  /* ===== 记录一支 ===== */
  openReason() {
    this.setData({ selReason: REASONS[0], reasonSheet: true })
  },
  selReasonFn(e) {
    this.setData({ selReason: e.currentTarget.dataset.r })
  },
  async confirmLog() {
    const res = await api.smokeLog(this.data.selReason)
    this.applyState(res.data)
    this.closeSheets()
    const s = res.data
    const left = s.limit - (s.today.count || 0)
    let msg
    if (left > 0) msg = '已记录 · 今日还剩 ' + left + ' 根'
    else if (left === 0) msg = '已记录 · 今日额度已用完'
    else msg = '已记录 · 已超出限额'
    this.toast(msg)
  },

  /* ===== 删除记录（二次确认）===== */
  delRecord(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    if (this.data.confirmIdx === idx) {
      this.confirmDelete(idx)
    } else {
      this.setData({ confirmIdx: idx })
      if (this.data._delTimer) clearTimeout(this.data._delTimer)
      const t = setTimeout(() => {
        this.setData({ confirmIdx: -1 })
      }, 2200)
      this.data._delTimer = t
    }
  },
  async confirmDelete(idx) {
    if (this.data._delTimer) { clearTimeout(this.data._delTimer); this.data._delTimer = null }
    const res = await api.smokeDeleteRecord(idx)
    this.applyState(res.data)
    this.toast('已删除该记录')
  },

  /* ===== 额度设置 ===== */
  openLimit() {
    this.setData({ curLimit: this.data.limit, limitSheet: true })
    this.syncSteps()
  },
  syncSteps() {
    this.setData({
      stepMinusDisabled: this.data.curLimit <= 1,
      stepPlusDisabled: this.data.curLimit >= 30,
    })
  },
  stepMinus() {
    if (this.data.curLimit <= 1) return
    this.setData({ curLimit: this.data.curLimit - 1 })
    this.syncSteps()
  },
  stepPlus() {
    if (this.data.curLimit >= 30) return
    this.setData({ curLimit: this.data.curLimit + 1 })
    this.syncSteps()
  },
  async saveLimit() {
    const res = await api.smokeSetLimit(this.data.curLimit)
    this.applyState(res.data)
    this.closeSheets()
    this.toast('今日额度已设为 ' + this.data.curLimit + ' 根')
  },

  closeSheets() {
    this.setData({ reasonSheet: false, limitSheet: false })
  },
})
