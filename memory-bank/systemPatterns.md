# 系统模式

## 架构概述

MarkDownload 是一个典型的浏览器扩展，其架构分为几个主要部分，以满足 Manifest V2/V3 的规范。

- **后台脚本 (`background.js`):**
  - 作为扩展的事件处理中心。
  - 负责处理浏览器事件，如点击扩展图标、上下文菜单交互等。
  - 在 Manifest V3 中，这将迁移到 Service Worker。

- **内容脚本 (`contentScript.js`):**
  - 注入到用户浏览的网页中。
  - 负责从页面中提取 DOM 内容，并将其发送到后台脚本进行处理。
  - 使用 `pageContext.js` 来获取页面的元数据。

- **弹出页面 (`popup/`):**
  - 用户点击浏览器工具栏图标时显示的界面。
  - 提供预览转换后的 Markdown 的功能。
  - 允许用户进行简单的编辑和下载操作。
  - 使用 CodeMirror 库进行代码高亮和编辑。

- **选项页面 (`options/`):**
  - 允许用户配置扩展的行为。
  - 保存用户的自定义设置，如 Markdown 模板、下载路径等。

- **共享模块 (`shared/`):**
  - 包含在扩展不同部分之间共享的代码，例如上下文菜单的创建逻辑 (`context-menus.js`) 和默认选项 (`default-options.js`)。

- **离屏文档 (`offscreen/`):**
  - 在 Manifest V3 中，用于处理需要访问 DOM API 的后台任务，例如将文本复制到剪贴板。

## 关键技术决策

- **HTML 到 Markdown 转换:**
  - 使用 **`turndown.js`** 作为核心库，将 HTML 转换为 Markdown。
  - 通过 `turndown-plugin-gfm.js` 插件支持 GitHub Flavored Markdown (GFM)。
- **文章内容提取:**
  - 使用 **`Readability.js`** 从网页中提取主要内容，去除广告、导航和其他无关元素。
- **依赖管理:**
  - 使用 `package.json` 和 `npm` 来管理项目依赖，尽管许多库是直接包含在项目中的。
- **向后兼容性:**
  - 项目中保留了 `v2_back` 目录，作为 Manifest V2 版本的备份，便于在迁移过程中进行参考和对比。

## 组件关系

1.  **用户操作 (点击图标)** -> `popup.js`
2.  `popup.js` -> `background.js` (请求页面内容)
3.  `background.js` -> `contentScript.js` (获取 HTML)
4.  `contentScript.js` -> `background.js` (返回 HTML)
5.  `background.js` -> `Readability.js` / `turndown.js` (处理内容)
6.  `background.js` -> `popup.js` (返回 Markdown)
7.  `popup.js` -> **用户 (显示/下载)**
