# 进展情况

## 已完成的工作

- **记忆库初始化:**
  - `projectbrief.md`: 定义了项目目标和核心需求。
  - `productContext.md`: 阐明了产品的价值和工作方式。
  - `activeContext.md`: 设置了当前的开发焦点。
  - `systemPatterns.md`: 记录了项目的架构和关键技术决策。
  - `techContext.md`: 概述了所使用的技术和工具。
  - `progress.md`: 本文档，用于跟踪项目进展。
- **初始代码审查:**
  - 审查了 `src/background/turndown.js` 和 `src/background/turndown-plugin-gfm.js` 以理解其对 HTML 到 Markdown 的转换和表格、数学公式处理方式。
  - 审查了 `src/background/background.js` 和 `src/offscreen/offscreen.js` 中的主要逻辑，了解 `Readability.js` 和 `TurndownService` 的调用流程。
  - 发现 `src/offscreen/offscreen.js` 中 `getArticleFromDom` 函数内存在针对特定 CSS 类表格的预处理逻辑，可能导致表格单元格被移除。

## 待办事项

- **Manifest V3 迁移:**
  - [ ] **审查 `manifest.json`:** 将 V2 的清单文件更新为 V3 格式。
  - [ ] **迁移后台脚本:** 将 `background.js` 转换为 Service Worker。
  - [ ] **替换阻塞式 `webRequest`:** 评估 `declarativeNetRequest` API 是否可以替代现有的 `webRequest` 用法。
  - [ ] **更新 API 调用:** 检查并更新所有不符合 V3 规范的 API 调用，例如 `executeScript`。
  - [ ] **实现 `offscreen` 文档:** 对于需要 DOM 访问的后台任务，创建并集成 `offscreen` 解决方案。

- **表格转换问题诊断与修复 (新任务):**
  - [x] **注释 `offscreen.js` 中的表格预处理逻辑:** 已在 `src/offscreen/offscreen.js` 中注释掉 `dom.body.querySelectorAll('table.ltx_equationgroup, table.ltx_eqn_table')` 相关的代码，以测试是否是该删除操作导致表格丢失。
  - [ ] **复现并提供日志和转换结果:** `offscreen.js` 的修改未能解决表格过滤问题。等待用户再次运行扩展，并提供浏览器控制台的详细日志（特别是 `Readability.js` 和 `Turndown.js` 相关的输出）以及最终的 Markdown 结果。
  - [ ] **详细分析 `Readability.js` 的行为:** 根据收集到的日志，判断 `Readability.js` 是否在提取文章内容时移除了表格。
  - [ ] **深入检查 `turndown-plugin-gfm.js` 表格规则:** 重点检查 `rules.tableCell`、`rules.tableRow` 和 `rules.table` 的过滤逻辑，特别是涉及空单元格和数学公式的部分。
  - [ ] **修复代码:** 根据诊断结果，修改 `offscreen.js` 中可能移除表格单元格的代码，以及 `turndown-plugin-gfm.js` 中可能导致表格内容丢失或格式错误的规则。

- **代码重构与现代化:**
  - [ ] **评估依赖管理:** 考虑是否应使用 npm 来管理 `turndown`, `Readability.js` 等核心库，而不是将它们直接包含在项目中。
  - [ ] **代码风格统一:** 引入代码格式化工具（如 Prettier）和代码检查工具（如 ESLint），以确保代码质量和一致性。

- **测试:**
  - [ ] **创建测试计划:** 为 V3 版本制定详细的测试计划，覆盖所有核心功能。
  - [ ] **手动测试:** 在所有目标浏览器（Chrome, Firefox, Safari, Edge）上进行全面的手动测试。

## 当前状态

- **项目版本:** 目前处于从 Manifest V2 到 Manifest V3 的过渡阶段。
- **主要问题:** 用户反馈表格在转换后丢失。初步分析指向 `Readability.js` 的内容提取或 `turndown-plugin-gfm.js` 的转换规则，特别是对数学公式和空单元格的处理。
- **主要风险:**
  - Manifest V3 的 API 限制可能会影响某些现有功能，需要寻找替代方案。
  - 确保在所有支持的浏览器上保持一致的行为和体验。
  - 表格内容的精确转换，尤其是包含复杂数学公式的表格。

## 已知问题

- HTML 表格在通过 MarkDownload 扩展处理后被完全过滤掉。
