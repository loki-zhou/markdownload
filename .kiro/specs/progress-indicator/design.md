# 设计文档：进度指示功能

## 概述

本设计文档详细描述了如何在 MarkDownload 插件中实现进度指示功能。该功能将在插件处理页面内容时向用户显示实时进度，提高用户体验和透明度。进度指示器将显示在弹出窗口中，替代当前的静态加载动画。

## 架构

进度指示功能将基于消息传递机制实现，各个处理阶段会向弹出窗口发送进度更新消息。整体架构如下：

1. **弹出窗口 (Popup)**: 
   - 负责显示进度指示器UI
   - 接收来自后台脚本的进度更新消息
   - 更新进度条和描述文本

2. **后台脚本 (Background)**: 
   - 在各个处理阶段发送进度更新消息
   - 计算总体进度百分比
   - 提供阶段描述文本

3. **离屏文档 (Offscreen)**: 
   - 在处理过程中发送进度更新消息到后台脚本

## 组件和接口

### 1. 进度指示器组件

```html
<div id="progress-container">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0%"></div>
  </div>
  <div class="progress-text">准备中...</div>
  <div class="progress-percentage">0%</div>
</div>
```

### 2. 消息接口

定义用于进度更新的消息格式：

```javascript
{
  type: "progress.update",
  stage: "dom-parsing", // 处理阶段标识符
  percentage: 25, // 总体进度百分比
  message: "正在提取文章内容" // 用户友好的描述文本
}
```

### 3. 处理阶段定义

将整个处理流程分为以下几个阶段，每个阶段分配相应的进度百分比范围：

1. **初始化** (0-5%): 
   - 加载插件
   - 初始化界面

2. **DOM获取** (5-20%): 
   - 注入内容脚本
   - 获取页面DOM和选中文本

3. **内容提取** (20-50%): 
   - 使用Readability.js提取文章内容
   - 处理文章元数据

4. **Markdown转换** (50-80%): 
   - 使用Turndown将HTML转换为Markdown
   - 处理特殊元素（代码块、表格等）

5. **图片和链接处理** (80-95%): 
   - 验证和修复链接
   - 处理图片引用

6. **完成** (95-100%): 
   - 准备最终结果
   - 显示Markdown内容

## 数据模型

### 1. 进度状态对象

```javascript
const progressState = {
  currentStage: "initializing", // 当前处理阶段
  percentage: 0, // 总体进度百分比
  message: "准备中...", // 用户友好的描述文本
  error: null // 错误信息（如果有）
};
```

### 2. 阶段配置对象

```javascript
const stages = {
  "initializing": {
    range: [0, 5],
    message: "准备中..."
  },
  "dom-fetching": {
    range: [5, 20],
    message: "正在获取页面内容..."
  },
  "content-extraction": {
    range: [20, 50],
    message: "正在提取文章内容..."
  },
  "markdown-conversion": {
    range: [50, 80],
    message: "正在转换为Markdown..."
  },
  "image-link-processing": {
    range: [80, 95],
    message: "正在处理图片和链接..."
  },
  "finalizing": {
    range: [95, 100],
    message: "正在准备显示结果..."
  }
};
```

## 错误处理

1. **通信错误**:
   - 如果消息传递失败，进度指示器将显示最后一个成功的状态
   - 超过一定时间没有更新时显示"处理时间较长，请耐心等待"

2. **处理错误**:
   - 如果处理过程中出现错误，进度指示器将显示错误信息
   - 提供重试选项

3. **超时处理**:
   - 如果某个阶段耗时过长，显示提示信息
   - 考虑添加取消选项

## 测试策略

1. **单元测试**:
   - 测试进度计算逻辑
   - 测试消息处理函数

2. **集成测试**:
   - 测试各组件之间的消息传递
   - 测试进度更新在UI上的反映

3. **端到端测试**:
   - 测试完整处理流程中的进度指示
   - 测试不同大小和复杂度的页面

4. **用户界面测试**:
   - 测试进度指示器在不同浏览器中的显示
   - 测试深色/浅色模式适配

## 实现细节

### 1. CSS样式

进度条将使用CSS动画实现平滑过渡效果：

```css
.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background-color: #4285f4;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  margin-bottom: 5px;
  color: #333;
}

.progress-percentage {
  font-size: 12px;
  text-align: right;
  color: #666;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .progress-bar {
    background-color: #333;
  }
  
  .progress-text {
    color: #eee;
  }
  
  .progress-percentage {
    color: #aaa;
  }
}
```

### 2. 进度更新函数

在popup.js中添加进度更新函数：

```javascript
function updateProgress(stage, percentage, message) {
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  const progressPercentage = document.querySelector('.progress-percentage');
  
  if (progressFill && progressText && progressPercentage) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = message || stages[stage].message;
    progressPercentage.textContent = `${Math.round(percentage)}%`;
  }
}
```

### 3. 消息监听器

在popup.js中添加消息监听器：

```javascript
chrome.runtime.onMessage.addListener(function(message) {
  if (message.type === "progress.update") {
    updateProgress(message.stage, message.percentage, message.message);
  }
});
```

### 4. 进度报告函数

在background.js中添加进度报告函数：

```javascript
function reportProgress(stage, customPercentage = null, customMessage = null) {
  const stageConfig = stages[stage];
  if (!stageConfig) return;
  
  const [min, max] = stageConfig.range;
  const percentage = customPercentage !== null ? customPercentage : min;
  const message = customMessage || stageConfig.message;
  
  chrome.runtime.sendMessage({
    type: "progress.update",
    stage: stage,
    percentage: percentage,
    message: message
  });
}
```

## 兼容性考虑

1. **浏览器兼容性**:
   - 确保CSS动画在所有支持的浏览器中正常工作
   - 测试消息传递机制在不同浏览器中的可靠性

2. **性能考虑**:
   - 避免过于频繁的进度更新，以减少性能开销
   - 考虑使用节流技术限制更新频率

3. **可访问性**:
   - 确保进度指示器符合WCAG可访问性标准
   - 添加适当的ARIA属性以支持屏幕阅读器