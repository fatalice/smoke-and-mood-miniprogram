// pages/tree/index.js — 树洞留言页
const api = require('../../utils/api')
const { fmtDateMain, fmtMsgTime } = require('../../utils/format')

const TAGS = ['心事', '吐槽', '求助', '戒烟', '生活']
const TAG_COLOR = {
  心事: '#FFB454', 吐槽: '#7FB4FF', 求助: '#3ECF8E', 生活: '#9AA8BA', 戒烟: '#F08C3A',
}

Page({
  data: {
    statusBarHeight: 20,
    topPad: 40,
    dateMainT: '',
    statToday: 0,
    statLikes: 0,
    statTotal: 0,
    chips: [],
    feed: [],
    filter: '全部',
    // 写留言
    writeSheet: false,
    tags: TAGS,
    tagColors: TAG_COLOR,
    selTag: TAGS[0],
    writeText: '',
    charCount: 0,
    publishDisabled: true,
    // 关于
    infoSheet: false,
    // 动效
    popId: 0,
  },

  onLoad() {
    try {
      const win = wx.getWindowInfo()
      const sb = win.statusBarHeight || 20
      this.setData({ statusBarHeight: sb, topPad: sb + 20 })
    } catch (e) {}
    this.buildChips()
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh())
  },

  async refresh() {
    const res = await api.treeList()
    this.applyList(res.data)
  },

  applyList(data) {
    const messages = data.messages || []
    const likedIds = data.likedIds || []
    const likedSet = {}
    likedIds.forEach((id) => { likedSet[id] = true })

    const feed = messages.map((m) => ({
      id: m.id,
      tag: m.tag,
      tagColor: TAG_COLOR[m.tag] || '#FFB454',
      text: m.text,
      t: m.t,
      time: fmtMsgTime(m.t),
      likes: m.likes,
      liked: !!likedSet[m.id],
      expanded: false,
      canExpand: (m.text || '').length > 60,
    }))

    // 统计：优先用云端聚合值，本地兜底时从列表推算
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    const today = messages.filter((m) => m.t >= dayStart.getTime()).length
    const totalLikes = (data.totalLikes != null)
      ? data.totalLikes
      : messages.reduce((s, m) => s + (m.likes || 0), 0)
    const totalCount = (data.totalCount != null) ? data.totalCount : messages.length

    this.setData({
      dateMainT: fmtDateMain(),
      statToday: today,
      statLikes: totalLikes,
      statTotal: totalCount,
      feed,
    })
  },

  buildChips() {
    const all = ['全部'].concat(TAGS)
    const chips = all.map((t) => ({
      label: t,
      color: t === '全部' ? '' : TAG_COLOR[t] || '#FFB454',
      sel: t === this.data.filter,
    }))
    this.setData({ chips })
  },

  onFilter(e) {
    const f = e.currentTarget.dataset.f
    this.setData({ filter: f })
    this.buildChips()
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id
    const feed = this.data.feed.map((m) =>
      m.id === id ? { ...m, expanded: !m.expanded } : m
    )
    this.setData({ feed })
  },

  async onLike(e) {
    const id = e.currentTarget.dataset.id
    const res = await api.treeToggleLike(id)
    this.applyList(res.data)
    this.setData({ popId: id })
    setTimeout(() => { this.setData({ popId: 0 }) }, 450)
  },

  /* ===== 写留言 ===== */
  openWrite() {
    this.setData({
      writeText: '',
      charCount: 0,
      publishDisabled: true,
      selTag: TAGS[0],
      writeSheet: true,
    })
  },
  onInput(e) {
    const v = e.detail.value
    this.setData({
      writeText: v,
      charCount: v.length,
      publishDisabled: !v.trim().length,
    })
  },
  selTagFn(e) {
    this.setData({ selTag: e.currentTarget.dataset.t })
  },
  async publish() {
    const text = (this.data.writeText || '').trim()
    if (!text) return
    const res = await api.treePost({ tag: this.data.selTag, text })
    this.applyList(res.data)
    this.setData({ filter: '全部', writeSheet: false })
    this.buildChips()
    wx.showToast({ title: '已丢进树洞，安心了', icon: 'none', duration: 2200 })
  },

  openInfo() {
    this.setData({ infoSheet: true })
  },
  closeSheets() {
    this.setData({ writeSheet: false, infoSheet: false })
  },
})
