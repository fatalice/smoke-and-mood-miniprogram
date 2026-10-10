// components/bar-chart/index.js — 最近 7 天柱状图（canvas 2d 自绘）
Component({
  properties: {
    week: { type: Array, value: [], observer: 'scheduleDraw' },
    limit: { type: Number, value: 10, observer: 'scheduleDraw' },
  },
  lifetimes: {
    attached() {
      this._ctx = null
      this._canvasReady = false
      this._prog = 0
      this._raf = 0
    },
    ready() {
      this.initCanvas()
    },
    detached() {
      try { if (this._raf && this._canvas) this._canvas.cancelAnimationFrame(this._raf) } catch (e) {}
    },
  },
  pageLifetimes: {
    show() {
      // 切回本页时重绘以校正尺寸
      this.scheduleDraw()
    },
  },
  methods: {
    initCanvas() {
      const q = this.createSelectorQuery().in(this)
      q.select('#barCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const node = res[0].node
        const width = res[0].width
        const height = res[0].height
        const dpr = (wx.getSystemInfoSync().pixelRatio) || 2
        node.width = width * dpr
        node.height = height * dpr
        const ctx = node.getContext('2d')
        ctx.scale(dpr, dpr)
        this._canvas = node
        this._ctx = ctx
        this._w = width
        this._h = height
        this._canvasReady = true
        this._prog = 0
        this.animate()
      })
    },
    scheduleDraw() {
      if (!this._canvasReady) return
      this._prog = 0
      this.animate()
    },
    animate() {
      const node = this._canvas
      if (!node) return
      const t0 = Date.now()
      const dur = 500
      const step = () => {
        const e = Math.min(1, (Date.now() - t0) / dur)
        const k = 1 - Math.pow(1 - e, 3)
        this._prog = k
        this.draw()
        if (e < 1) {
          this._raf = node.requestAnimationFrame(step)
        }
      }
      try { if (this._raf) node.cancelAnimationFrame(this._raf) } catch (e) {}
      this._raf = node.requestAnimationFrame(step)
    },
    draw() {
      const ctx = this._ctx
      const w = this._w
      const h = this._h
      const week = this.properties.week || []
      const limit = this.properties.limit
      ctx.clearRect(0, 0, w, h)
      const n = 7
      if (!week.length) return
      const counts = []
      for (let i = 0; i < n; i++) counts.push((week[i] && week[i].count) || 0)
      const yMax = Math.max.apply(null, counts.concat(limit).concat([1])) + 2
      const labelH = 26
      const chartH = h - labelH
      const colW = w / n
      const barW = Math.min(40, colW * 0.46)
      for (let i = 0; i < n; i++) {
        const cx = colW * i + colW / 2
        const isToday = i === n - 1
        const fullH = (counts[i] / yMax) * chartH
        const barH = Math.max(2, fullH * this._prog)
        const x = cx - barW / 2
        const y = chartH - barH
        // 圆角矩形
        ctx.beginPath()
        const r = 6
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + barW, y, x + barW, y + r, r)
        ctx.arcTo(x + barW, y + barH, x + barW - r, y + barH, r)
        ctx.arcTo(x, y + barH, x, y + barH - r, r)
        ctx.arcTo(x, y, x, y + r, r)
        ctx.closePath()
        if (isToday) {
          ctx.fillStyle = '#FFB454'
          ctx.shadowColor = 'rgba(255,180,84,0.35)'
          ctx.shadowBlur = 10
        } else {
          ctx.fillStyle = '#2A3648'
          ctx.shadowBlur = 0
        }
        ctx.fill()
        ctx.shadowBlur = 0
      }
      // x 轴标签
      ctx.fillStyle = '#5F6E80'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let i = 0; i < n; i++) {
        const cx = colW * i + colW / 2
        const label = this.labelFor(i, week[i] && week[i].date)
        ctx.fillText(label, cx, chartH + 6)
      }
    },
    labelFor(i, dateStr) {
      if (i === 6) return '今天'
      if (i === 5) return '昨天'
      if (!dateStr) return ''
      const p = dateStr.split('-')
      return p[1] + '/' + p[2]
    },
  },
})
