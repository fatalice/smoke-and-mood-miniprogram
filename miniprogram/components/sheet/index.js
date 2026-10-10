// components/sheet/index.js — 通用底部弹层
Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    sub: { type: String, value: '' },
  },
  methods: {
    onMask() {
      this.triggerEvent('close')
    },
    stop() {},
  },
})
