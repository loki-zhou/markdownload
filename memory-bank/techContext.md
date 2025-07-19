# 技术背景

## 主要技术栈

- **核心语言:** JavaScript (ES6+)
- **浏览器 API:** WebExtensions API
- **UI:** HTML5, CSS3

## 关键库和框架

- **`turndown.js`:** 用于将 HTML 转换为 Markdown 的核心库。
- **`turndown-plugin-gfm.js`:** Turndown 的插件，用于支持 GitHub Flavored Markdown (GFM)，包括表格、删除线等。
- **`Readability.js`:** Mozilla 开发的库，用于从嘈杂的网页中提取主要可读内容。
- **`moment.js`:** 用于处理日期和时间的库，可能用于生成文件名或元数据中的时间戳。
- **`codemirror.js`:** 一个功能强大的代码编辑器组件，用于在弹出窗口中提供 Markdown 预览和编辑功能。

## 开发与构建工具

- **`npm`:** 用于管理项目依赖和运行脚本。
- **`web-ext`:** 一个由 Mozilla 开发的命令行工具，用于简化 WebExtensions 的开发、构建和测试。`package.json` 中的脚本显示，它被用来：
  - 构建和打包扩展 (`web-ext build`)
  - 在不同的浏览器中运行和测试扩展，如 Firefox Developer Edition 和 Chromium。

## 项目依赖

根据 `src/package.json`，项目的开发依赖如下：

```json
"devDependencies": {
  "web-ext": "^7.4.0"
}
```
值得注意的是，许多核心库（如 `turndown`, `Readability`）是直接以文件的形式包含在项目中的，而不是通过 npm 作为包依赖进行管理。

## 技术约束

- **浏览器扩展环境:** 代码必须在浏览器扩展的沙箱环境中运行，并遵守其安全策略。
- **Manifest V3:** 项目的主要目标是迁移到 Manifest V3，这意味着需要遵守新的 API 限制，例如：
  - 使用 Service Worker 替代持久化的后台脚本。
  - 受限的 `executeScript` 调用方式。
  - 弃用阻塞式的 `webRequest` API。
  - 需要使用 `offscreen` 文档来执行与 DOM 相关的后台任务。
