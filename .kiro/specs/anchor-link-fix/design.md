# 锚点链接转换修复设计文档

## 概述

本设计文档描述了 MarkDownload 浏览器扩展中锚点链接转换问题的修复方案。该问题主要表现为页面内的锚点链接（如 `#section-name`）被错误地转换为指向扩展内部 offscreen 页面的绝对链接，而不是保持正确的相对锚点格式。

## 架构

修复方案主要涉及以下几个核心组件：

1. **消息传递系统**：在 background.js 和 offscreen.js 之间传递原始页面 URL 信息
2. **DOM 解析与 baseURI 处理**：在 offscreen.js 中正确设置和使用 baseURI
3. **链接类型识别**：实现专门的函数来识别和处理不同类型的链接
4. **链接验证与转换**：增强 validateUri 函数以正确处理锚点链接
5. **错误处理与回退机制**：实现多层次的错误处理和回退策略

## 组件和接口

### 1. 消息传递系统

**接口增强**：
```javascript
// 发送消息时包含原始 URL
chrome.runtime.sendMessage({ 
  type: 'parse-dom', 
  target: 'offscreen', 
  data: { domString, originalUrl }
});

// 接收消息时处理新的数据结构
if (typeof message.data === 'string') {
  // 向后兼容：旧格式，data 只是 DOM 字符串
  domString = message.data;
  originalUrl = null;
} else {
  // 新格式：data 是包含 domString 和 originalUrl 的对象
  domString = message.data.domString;
  originalUrl = message.data.originalUrl;
}
```

### 2. DOM 解析与 baseURI 处理

**baseURI 设置逻辑**：
```javascript
// 设置 base 元素
if (originalUrl) {
  let baseElement = dom.head?.querySelector('base');
  if (!baseElement) {
    baseElement = dom.createElement('base');
    dom.head?.appendChild(baseElement);
  }
  baseElement.href = originalUrl;
}

// 多层次的 baseURI 解析策略
let effectiveBaseURI;

// 第一优先级：使用 originalUrl
if (originalUrl && typeof originalUrl === 'string' && originalUrl.trim() !== '') {
  try {
    new URL(originalUrl);
    effectiveBaseURI = originalUrl;
  } catch (error) {
    // 处理无效 URL
  }
}

// 第二优先级：使用 dom.baseURI（如果不是 chrome-extension:// 协议）
if (!effectiveBaseURI && dom.baseURI && !dom.baseURI.startsWith('chrome-extension://')) {
  effectiveBaseURI = dom.baseURI;
}

// 第三优先级：使用 base 元素的 href
// 第四优先级：使用规范链接
// 最后：使用智能回退
```

### 3. 链接类型识别

**辅助函数**：
```javascript
// 检查是否为纯锚点链接（以 # 开头）
function isAnchorLink(href) {
  if (!href || typeof href !== 'string') {
    return false;
  }
  return href.startsWith('#') && href.length > 1;
}

// 检查是否为相对于当前页面的锚点链接
function isRelativeToCurrentPage(href) {
  if (!href || typeof href !== 'string') {
    return false;
  }
  
  if (href.includes('://') || href.startsWith('//')) {
    return false;
  }
  
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return false;
  }
  
  if (hashIndex === 0) {
    return true;
  }
  
  const pathPart = href.substring(0, hashIndex);
  return !pathPart.startsWith('/') && !pathPart.includes('://');
}
```

### 4. 链接验证与转换

**增强的 validateUri 函数**：
```javascript
function validateUri(href, baseURI) {
  // 特殊处理：如果 baseURI 是 chrome-extension:// 协议，使用合适的回退
  if (baseURI && baseURI.startsWith('chrome-extension://')) {
    baseURI = 'https://github.com/'; // 针对 GitHub 页面的回退
  }
  
  // 特殊处理锚点链接
  if (isAnchorLink(href)) {
    return href; // 直接返回，不做任何转换
  }
  
  if (isRelativeToCurrentPage(href)) {
    const hashIndex = href.indexOf('#');
    if (hashIndex > 0) {
      // 对于带锚点的相对链接，提取并保留锚点部分
      const pathPart = href.substring(0, hashIndex);
      const anchorPart = href.substring(hashIndex);
      
      try {
        // 验证路径部分可以被解析
        const baseUrl = safeUrlParse(baseURI);
        if (baseUrl) {
          const resolvedUrl = safeUrlParse(pathPart, baseUrl);
          if (resolvedUrl) {
            return pathPart + anchorPart;
          }
        }
        return href;
      } catch (error) {
        return href;
      }
    } else if (hashIndex === 0) {
      return href;
    }
  }
  
  // 原有逻辑处理其他类型的链接
  // ...
}
```

### 5. 错误处理与回退机制

**安全的 URL 解析**：
```javascript
// URL 解析缓存，避免重复解析相同的 URL
const urlParseCache = new Map();

// 安全的 URL 解析函数，处理格式错误的 URL 并带有缓存
function safeUrlParse(urlString, baseUrl = null) {
  // 创建缓存键
  const cacheKey = baseUrl ? `${urlString}|${baseUrl}` : urlString;
  
  // 首先检查缓存
  if (urlParseCache.has(cacheKey)) {
    return urlParseCache.get(cacheKey);
  }
  
  let result = null;
  try {
    if (baseUrl) {
      result = new URL(urlString, baseUrl);
    } else {
      result = new URL(urlString);
    }
  } catch (error) {
    // 处理解析错误
  }
  
  // 缓存结果（包括解析失败的 null）
  urlParseCache.set(cacheKey, result);
  
  // 限制缓存大小以防止内存泄漏
  if (urlParseCache.size > 1000) {
    const firstKey = urlParseCache.keys().next().value;
    urlParseCache.delete(firstKey);
  }
  
  return result;
}
```

**多层次回退策略**：
```javascript
function validateUriWithFallback(href, baseURI, originalHref = null) {
  try {
    // 首先尝试使用增强的 validateUri
    const result = validateUri(href, baseURI);
    
    // 验证结果是合理的 URL 或锚点链接
    if (result && (result.startsWith('#') || safeUrlParse(result))) {
      return result;
    }
    
    // 如果结果无效，回退到原始 href
    return originalHref || href;
    
  } catch (error) {
    // 最终回退 - 返回原始 href
    return originalHref || href;
  }
}
```

## 数据模型

修复方案主要处理以下数据类型：

1. **URL 字符串**：包括绝对 URL、相对 URL、锚点链接等
2. **DOM 对象**：从页面内容解析得到的 DOM 树
3. **Article 对象**：包含页面内容、元数据和 baseURI 等信息

## 错误处理

实现了多层次的错误处理策略：

1. **URL 解析错误**：使用 try-catch 块捕获 URL 解析错误，提供合理的回退值
2. **baseURI 无效**：实现多层次的回退策略，从 originalUrl 到 dom.baseURI 到 base 元素再到智能回退
3. **链接验证失败**：当链接验证失败时，保留原始链接而不是生成错误的链接
4. **日志记录**：添加详细的调试日志，帮助识别和排查问题

## 测试策略

1. **单元测试**：为新增的辅助函数（isAnchorLink、isRelativeToCurrentPage、validateAnchorLink）编写单元测试
   - 实现了 `runAnchorLinkTests()` 函数，使用 `console.assert` 验证各种链接类型的处理
   - 测试了纯锚点链接、相对路径锚点链接、绝对路径锚点链接等多种情况

2. **集成测试**：测试端到端的链接转换流程
   - 创建了 `anchor-link-test.html` 测试页面，包含各种类型的链接
   - 测试页面包含纯锚点链接、相对路径锚点链接、带有 Unicode 字符的锚点等
   - 使用 `debugBaseUriResolution()` 函数验证 baseURI 解析过程

3. **回归测试**：确保其他链接类型（绝对链接、相对路径链接、图片链接）不受影响
   - 验证了图片链接的处理逻辑
   - 确保绝对链接和相对路径链接的处理逻辑保持不变

4. **边缘情况测试**：测试恶意链接、格式错误的 URL 等特殊情况
   - 测试了空锚点（`#`）
   - 测试了带有 Unicode 字符的锚点（`#section-with-中文`）
   - 测试了带有空格的 URL 和锚点（`page with spaces.html#section`）
   - 测试了带有查询参数的 URL 和锚点（`?query=param#section`）

## 性能优化

1. **URL 解析缓存**：实现缓存机制避免重复解析相同的 URL，提高性能
2. **内存管理**：限制缓存大小，防止内存泄漏
3. **智能回退**：在无法确定正确的 baseURI 时，根据页面内容（如标题、元标签）进行智能回退

## 设计决策与权衡

1. **保留原始链接格式**：对于锚点链接，选择保留原始格式而不是转换为绝对 URL，以保持 Markdown 文件的可读性和可移植性
2. **多层次回退策略**：实现多层次的回退策略，在各种情况下都能提供合理的结果，即使在某些信息缺失的情况下
3. **URL 解析缓存**：通过缓存机制提高性能，但需要限制缓存大小以防止内存泄漏
4. **调试日志**：添加详细的调试日志，帮助识别和排查问题，但在生产环境中可能需要减少日志输出

## 总结

本设计文档描述了 MarkDownload 浏览器扩展中锚点链接转换问题的修复方案。通过增强消息传递系统、改进 baseURI 处理、实现链接类型识别、增强链接验证与转换以及添加错误处理与回退机制，我们能够正确处理各种类型的锚点链接，提高扩展的可靠性和用户体验。