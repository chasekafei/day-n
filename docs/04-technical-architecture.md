# 技术架构与平台接入

## 1. 项目边界

新项目在 `table-tennis-calendar` 中独立实现，不直接复用“举个牌”的 Design schema、灯牌渲染器或业务状态。可以选择性复用经过验证的基础能力：

- TypeScript + Vite 离线单页
- UI primitives 和安全区处理
- Canvas 导出
- 本地记录和版本迁移
- 小红书平台桥接
- 构建、校验和打包脚本

如果两个项目以后需要共享平台桥接，再抽取公共模块；首版不要为了复用而提前建立复杂 monorepo。

## 2. 推荐模块

```text
src/
  data/
    anniversaries.ts
    data-version.ts
  domain/
    calendar-date.ts
    event-filter.ts
    stats.ts
    titles.ts
    countdowns.ts
  renderer/
    card-renderer.ts
    template-assets.ts
  ui/
    home.ts
    event-picker.ts
    result.ts
    about.ts
  platform.ts
  records.ts
  main.ts
tests/
```

业务计算模块不能依赖 DOM 或 Canvas，这样日期边界、事件筛选和统计规则可以在 Node 测试中单独验证。

## 3. Canvas 渲染

预览和导出必须使用同一个渲染函数，只通过布局参数区分 `comment` 和 `note`：

```ts
renderCard(result, { layout: 'comment', template: 'scoreboard' })
renderCard(result, { layout: 'note', template: 'ticket' })
```

变量文字来自结构化结果对象，背景模板来自本地资源。模板加载失败时显示明确错误，不输出一张缺少背景的半成品图片。

## 4. 小红书能力

平台桥接需要单独封装能力检测：

- 保存图片：写入临时文件后调用相册接口
- 发布图文：调用 `postNote`，使用 `pageType: photo_publish`
- 带图评论：调用 `interactionOpenApi`，评论文字和 `media_bean` 分开传递
- 快照：只传 `{focus, eventId, date, days, template}` 等必要字段，控制在 2KB 内

平台不支持或权限被拒绝时，保留“保存图片”路径，并明确提示用户，不静默失败，也不依赖剪贴板 API。

## 5. 离线和资源约束

- 不依赖后端、账号或 LLM。
- 事件数据打包在本地。
- 设计模板使用相对路径或构建时复制到 `public/artwork/`。
- 发布包不能依赖外部字体、远程图片或运行时网络请求。
- 字体只覆盖事件、称号和固定 UI 所需字符，控制包体积。
