# 锚点链接转换修复实施计划

- [x] 1. 增强消息传递接口以传递原始 URL 信息

  - 修改 background.js 中的消息发送逻辑，在 parse-dom 消息中包含原始页面 URL
  - 更新 offscreen.js 中的消息监听器以接收和处理新的数据结构
  - 确保向后兼容性，处理可能缺失 originalUrl 的情况
  - _需求: 1.1, 2.1_

- [x] 2. 重构 getArticleFromDom 函数以正确设置 baseURI

  - 修改函数签名以接收 originalUrl 和 documentUrl 参数
  - 在 DOM 解析前正确设置 dom.baseURI 为原始页面 URL
  - 更新 article 对象以包含正确的 baseURI 和新增的 originalUrl 字段

  - 添加错误处理以应对 URL 解析失败的情况
  - _需求: 1.1, 2.2_
Unable to replace text, trying a different approach...
- [x] 3. 实现锚点链接检测和处理函数

  - 创建 isAnchorLink 函数来识别纯锚点链接（以 # 开头）
  - 创建 isRelativeToCurrentPage 函数来识别相对于当前页面的锚点链接
  - 添加 validateAnchorLink 函数来验证锚点链接的有效性
  - 编写单元测试验证这些辅助函数的正确性
  - _需求: 2.1, 2.2_

- [x] 4. 增强 validateUri 函数以正确处理锚点链接

  - 在函数开头添加锚点链接的特殊处理逻辑
  - 对于纯锚点链接（#section），直接返回不做任何转换
  - 对于包含锚点的相对链接，提取并保持锚点部分的相对格式
  - 保持原有逻辑处理其他类型的链接（绝对链接、相对路径链接）
  - _需求: 1.1, 2.2_

- [x] 5. 更新 turndown 链接处理规则

  - 修改 turndown 服务中的 links 规则以使用增强的 validateUri 函数
  - 确保 validateUri 调用时传递正确的 originalUrl 参数
  - 添加链接处理的调试日志以便问题排查
  - 测试各种链接类型的转换结果
  - _需求: 1.1, 2.1_

- [x] 6. 添加错误处理和回退机制

  - 实现 safeUrlParse 函数以安全地解析 URL
  - 在 validateUri 函数中添加 try-catch 错误处理
  - 实现 validateUriWithFallback 函数作为最终的安全网
  - 添加适当的控制台警告和错误日志
  - _需求: 3.1, 3.2_

- [x] 7. 创建综合测试用例

  - 编写单元测试覆盖所有新增的辅助函数
  - 创建集成测试验证端到端的链接转换流程
  - 添加回归测试确保其他链接类型不受影响
  - 测试边缘情况如恶意链接、格式错误的 URL 等
  - _需求: 3.3, 4.1, 4.2, 4.3_

- [x] 8. 验证修复效果并进行性能优化





  - 使用实际的 GitHub 页面测试锚点链接转换
  - 验证中文和特殊字符锚点的处理
  - 测试复杂 HTML 结构中的锚点链接
  - 优化链接处理性能，避免重复的 URL 解析
  - _需求: 4.4, 3.4_
