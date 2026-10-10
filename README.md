# 戒烟树洞 · 微信小程序

帮助用户记录吸烟、逐步控量的戒烟辅助小程序，同时内置匿名「树洞」留言社区。

- **Tab 1 记录戒烟**：每日额度 + 进度环 + 三格统计 + 三态状态行 + 记录/撤销 + 7 天柱状图 + 今日记录
- **Tab 2 树洞留言**：匿名发布 + 标签筛选 + 共鸣点赞 + 长文展开

## 技术栈

- 微信小程序原生开发（WXML/WXSS/JS），无前端框架、无 npm 依赖
- 云开发后端：**云托管（CloudBase Run）**，复用 alveyTools 的云环境
  - env：`cloudenv1-d4gkp36fb4243e78c`
  - 服务名：`fataliceenv`
  - 前端通过 `wx.cloud.callContainer` 调用后端（平台自动注入 `x-wx-openid`，无需 app secret）
- 数据兜底：云端不可用时自动回退到本地 `wx.storage`，保证未部署后端也能跑通 UI

## 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss / sitemap.json
├── _icons.gen.wxss        # SVG 图标（数据 URI）
├── custom-tab-bar/        # 自定义底部 Tab 栏（暗色 + 琥珀选中）
├── components/
│   ├── sheet/             # 通用底部弹层
│   ├── ring/              # 进度环（canvas 2d）
│   └── bar-chart/         # 7 天柱状图（canvas 2d 自绘）
├── pages/
│   ├── smoke/             # 记录戒烟页
│   └── tree/              # 树洞留言页
└── utils/
    ├── api.js             # 云端访问层（callContainer + 本地兜底）
    ├── store.js           # 本地存储兜底（移植自 demo）
    └── format.js          # 日期/时间格式化
```

后端云函数在 **另一个仓库** `gitRepo/tencent-miniapp-templete/src/`：
- `smoke/index.js` → 路由 `/api/smoke`（action：getState / log / undo / deleteRecord / setLimit）
- `tree/index.js` → 路由 `/api/tree`（action：list / post / toggleLike）

数据集合：`smoke_settings`、`smoke_days`、`tree_messages`、`tree_likes`。

## 本地运行

1. 用微信开发者工具打开本目录（`smoke-and-mood-miniprogram/`）
2. AppID 已配置为 `wxef9aa2814bb3ff2f`
3. 编译即可预览。**后端未部署时自动使用本地数据**（含 demo 种子数据），功能可完整体验

## 启用云端（部署后端）

后端代码已在 `tencent-miniapp-templete/src/{smoke,tree}/` 并注册到 `cloudbase-functions.json`。需重新部署云托管服务使新路由生效：

```bash
cd gitRepo/tencent-miniapp-templete
# 使用 CloudBase CLI 部署（或通过控制台）
cloudbase fn deploy smoke --envId cloudenv1-d4gkp36fb4243e78c
cloudbase fn deploy tree  --envId cloudenv1-d4gkp36fb4243e78c
# 或整体重新部署容器服务 fataliceenv
```

部署完成后，小程序的 `wx.cloud.callContainer('/api/smoke' …)` 即可命中，前端自动从本地切换到云端数据。

## 上线前待办

- [ ] 树洞发布接入 `security.msgSecCheck` 内容安全过滤（`src/tree/index.js` 已留 TODO）
- [ ] 确认云集合权限（仅前端可读写 → 建议改为「仅创建者可读写」+ 云函数操作）
- [ ] 配色 / 文案按需调整
