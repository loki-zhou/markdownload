# 当前上下文

## 近期变更

- 初始化记忆库，创建了核心文档。
- 详细审查了 `src/background/turndown.js` 和 `src/background/turndown-plugin-gfm.js` 以理解 HTML 到 Markdown 的转换机制，特别是表格和数学公式的处理。
- 分析了 `src/background/background.js` 和 `src/offscreen/offscreen.js` 中 `Readability.js` 和 `TurndownService` 的调用流程。
- 识别到 `src/offscreen/offscreen.js` 中 `getArticleFromDom` 函数内存在针对 `ltx_equationgroup` 和 `ltx_eqn_table` 类表格的预处理逻辑，可能导致表格单元格被移除。

## 后续步骤

- **复现与诊断表格过滤问题:** 需要用户运行 `web-ext` 命令，在浏览器中复现表格被过滤的问题，并提供控制台日志和转换结果。
- **详细分析 `Readability.js` 的行为:** 根据日志判断 `Readability.js` 是否在早期阶段就移除了表格内容。
- **深入检查 `turndown-plugin-gfm.js` 的表格规则:** 特别关注 `rules.tableCell` 中对空单元格和数学公式的处理，以及 `rules.tableRow` 和 `rules.table` 的过滤逻辑。
- **修复表格内容丢失问题:** 根据诊断结果，修改 `offscreen.js` 或 `turndown-plugin-gfm.js` 中的相关代码。

## 当前决策与考量

- **主要问题:** 用户提供的包含数学公式的 HTML 表格在转换为 Markdown 时被完全过滤。
- **初步怀疑点:**
    - `Readability.js` 在内容提取阶段可能移除了表格。
    - `turndown-plugin-gfm.js` 中的表格和数学公式转换规则存在缺陷，导致表格内容丢失或格式错误。特别是 `rules.tableCell` 中的 `trim()` 和 `querySelector` 逻辑，以及 `rules.tableRow` 中对 `cells.filter` 的处理。
    - `src/offscreen/offscreen.js` 中 `getArticleFromDom` 里的 `padCell.remove()` 可能移除了关键的表格填充单元格，进而影响表格结构。
- **调试方法:** 最有效的诊断方式是在实际浏览器环境中运行扩展，通过控制台日志跟踪 `Readability.js` 和 `Turndown.js` 的处理过程。
