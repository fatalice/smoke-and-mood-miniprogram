// components/ring/index.js — 进度环（canvas 2d）
// 进度 = 已抽 / 额度；超限时环变红、中心显示 +超出数
Component({
  data: {
    num: '0',
    label: '剩余额度 · 根',
    numColor: '#FFB454',
  },
  properties: {
    smoked: { type: Number, value: 0, observer: 'update' },
    limit: { type: Number, value: 10, observer: 'update' },
  },
  lifetimes: {
    attached() {
      this._ctx = null
      this._canvasReady = false
      this._dispPct = 0
      this._raf = 0
    },
    ready() {
      this.initCanvas()
    },
    detached() {
      try { if (this._raf && this._canvas) this._canvas.cancelAnimationFrame(this._raf) } catch (e) {}
    },
  },
  methods: {
    initCanvas() {
      const q = this.createSelectorQuery().in(this)
      q.select('#ringCanvas').fields({ node: true, size: true }).exec((res) => {
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
        this.update()
      })
    },
    update() {
      if (!this._canvasReady) return
      const smoked = this.properties.smoked
      const limit = this.properties.limit
      const left = limit - smoked
      let num, label, numColor
      if (left >= 0) {
        num = String(left)
        label = '剩余额度 · 根'
        numColor = '#FFB454'
      } else {
        num = '+' + (smoked - limit)
        label = '超出额度 · 根'
        numColor = '#FF6B6B'
      }
      const target = Math.min(1, Math.max(0, smoked / Math.max(1, limit)))
      const over = left < 0
      this.setData({ num, label, numColor })
      this.animateTo(target, over)
    },
    animateTo(target, over) {
      const node = this._canvas
      if (!node) return
      const start = this._dispPct
      const t0 = Date.now()
      const dur = 600
      const step = () => {
        const e = Math.min(1, (Date.now() - t0) / dur)
        const k = 1 - Math.pow(1 - e, 3)
        const p = start + (target - start) * k
        this._dispPct = p
        this.draw(p, over)
        if (e < 1) {
          this._raf = node.requestAnimationFrame(step)
        }
      }
      try { if (this._raf) node.cancelAnimationFrame(this._raf) } catch (e) {}
      this._raf = node.requestAnimationFrame(step)
    },
    draw(pct, over) {
      const ctx = this._ctx
      const w = this._w
      const h = this._h
      const cx = w / 2
      const cy = h / 2
      const r = Math.max(1, Math.min(w, h) / 2 - 13)
      ctx.clearRect(0, 0, w, h)
      // 底环
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#223045'
      ctx.lineWidth = 13
      ctx.lineCap = 'round'
      ctx.stroke()
      // 进度环
      if (pct > 0) {
        ctx.lineWidth = 13
        ctx.lineCap = 'round'
        if (over) {
          ctx.strokeStyle = '#FF6B6B'
        } else {
          const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
          grad.addColorStop(0, '#FFC471')
          grad.addColorStop(1, '#F08C3A')
          ctx.strokeStyle = grad
        }
        ctx.beginPath()
        const startAng = -Math.PI / 2
        ctx.arc(cx, cy, r, startAng, startAng + pct * Math.PI * 2)
        ctx.stroke()
      }
    },
  },
})
