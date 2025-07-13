提高扩展程序的安全性

bookmark\_border 使用集合让一切井井有条 根据您的偏好保存内容并对其进行分类。

提高清单 V3 中的安全性

这是介绍不属于扩展程序服务工作线程的代码所需更改的第三部分。其中介绍了提高扩展程序安全性所需的更改。另外两个部分介绍了升级到 Manifest V3 所需的[更新代码](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn)和[替换屏蔽 Web 请求](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn)。

## 移除执行任意字符串

您无法再使用 `executeScript()`、`eval()` 和 `new Function()` [执行外部逻辑](https://developer.chrome.com/docs/extensions/develop/migrate?hl=zh-cn#remotely-hosted-code)。

-   将所有外部代码（JS、Wasm、CSS）移至您的扩展程序软件包中。
-   更新脚本和样式引用，以便从扩展程序 bundle 加载资源。
-   使用 [`chrome.runtime.getURL()`](https://developer.chrome.com/docs/extensions/reference/runtime?hl=zh-cn#method-getURL) 在运行时构建资源网址。
-   使用沙盒化 iframe：沙盒化 iframe 中仍支持 `eval` 和 `new Function(...)`。如需了解详情，请参阅[沙盒化 iframe 指南](https://developer.chrome.com/docs/extensions/mv3/sandboxingEval?hl=zh-cn)。

`executeScript()` 方法现在位于 [`scripting`](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn) 命名空间中，而不是 `tabs` 命名空间中。如需了解如何更新通话，请参阅[移动 `executeScript()`](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-executescript)。

在少数特殊情况下，仍然可以执行任意字符串：

-   [使用 insertCSS 将远程托管的样式表注入网页](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn#method-insertCSS)
-   对于使用 `chrome.devtools` 的扩展程序：[inspectWindow.eval](https://developer.chrome.com/docs/extensions/reference/devtools_inspectedWindow?hl=zh-cn) 允许在所检查页面的上下文中执行 JavaScript。
-   调试程序扩展程序可以使用 [chrome.debugger.sendCommand](https://developer.chrome.com/docs/extensions/reference/debugger?hl=zh-cn#method-sendCommand) 在调试目标中执行 JavaScript。

## 移除远程托管的代码

在 Manifest V3 中，扩展程序的所有逻辑都必须包含在扩展程序软件包中。根据 [Chrome 应用商店政策](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements?hl=zh-cn)，您将无法再加载和执行远程托管的文件。例如：

-   从开发者的服务器中提取的 JavaScript 文件。
-   托管在 [CDN](https://developer.mozilla.org/docs/Glossary/CDN) 上的任何库。
-   捆绑的第三方库，用于动态提取远程托管的代码。

您可以采用其他方法，具体取决于您的用例和远程托管的原因。本部分介绍了可考虑的方法。如果您在处理远程托管代码时遇到问题，可参阅[相关指南](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code?hl=zh-cn)。

### 配置驱动型功能和逻辑

您的扩展程序会在运行时加载并缓存远程配置（例如 JSON 文件）。缓存的配置决定了启用了哪些功能。

### 使用远程服务的外部化逻辑

您的扩展程序调用远程 Web 服务。这样，您就可以将代码保持私密状态，并根据需要进行更改，同时避免重新提交到 Chrome 应用商店的额外开销。

### 在沙盒化 iframe 中嵌入远程托管的代码

[沙盒化 iframe 支持远程托管的代码](https://developer.chrome.com/docs/extensions/mv3/sandboxingEval?hl=zh-cn)。请注意，如果代码需要访问嵌入页面的 DOM，则此方法不起作用。

### 捆绑第三方库

如果您使用的是之前从外部服务器加载的流行框架（例如 React 或 Bootstrap），则可以下载缩小的文件，将其添加到您的项目并在本地导入。例如：

```
<script src="./react-dom.production.min.js"></script>
<link href="./bootstrap.min.css" rel="stylesheet">
```

如需在 Service Worker 中加入库，请在清单中将 [`"background.type"` 键](https://developer.chrome.com/docs/extensions/mv3/manifest/background?hl=zh-cn)设置为 `"module"`，并使用 `import` 语句。

### 在标签页注入的脚本中使用外部库

您还可以在运行时加载外部库，只需在调用 [`scripting.executeScript()`](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn#method-executeScript) 时将外部库添加到 `files` 数组即可。您仍然可以在运行时远程加载数据。

```
chrome.scripting.executeScript({
  target: {tabId: tab.id},
  files: ['jquery-min.js', 'content-script.js']
});
```

### 注入函数

如果您需要更加生动，可以使用 `scripting.executeScript()` 中的新 `func` 属性来注入作为内容脚本的函数，并使用 `args` 属性传递变量。

Manifest V2

```
let name = 'World!';
chrome.tabs.executeScript({
  code: `alert('Hello, ${name}!')`
});
```

在后台脚本文件中。

Manifest V3

```
async function getCurrentTab() {/* ... */}
let tab = await getCurrentTab();

function showAlert(givenName) {
  alert(`Hello, ${givenName}`);
}

let name = 'World';
chrome.scripting.executeScript({
  target: {tabId: tab.id},
  func: showAlert,
  args: [name],
});
```

在后台 Service Worker 中。

[Chrome 扩展程序示例代码库](https://github.com/GoogleChrome/chrome-extensions-samples.git)包含一个[函数注入示例](https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/reference.mv3-content-scripts/popup.js)，您可以逐步演示该示例。如需查看 `getCurrentTab()` 的示例，请参阅该函数的[参考文档](https://developer.chrome.com/docs/extensions/reference/tabs?hl=zh-cn#get-the-current-tab)。

### 寻找其他解决方法

如果上述方法对您的用例没有帮助，您可能需要寻找替代解决方案（例如迁移到其他库），或者寻找其他方法来使用该库的功能。例如，对于 Google Analytics，您可以改用 Google Measurement Protocol，而不是使用 [Google Analytics 4 指南](https://developer.chrome.com/docs/extensions/mv3/tut_analytics?hl=zh-cn)中所述的官方远程托管 JavaScript 版本。

## 更新内容安全政策

`"content_security_policy"` 尚未从 `manifest.json` 文件中移除，但它现在是一个支持两个属性的字典：`"extension_pages"` 和 [`"sandbox"`](https://developer.chrome.com/docs/extensions/mv3/manifest/sandbox?hl=zh-cn)。

Manifest V2

```
{
  ...
  "content_security_policy": "default-src 'self'"
  ...
}
```

Manifest V3

```
{
  ...
  "content_security_policy": {
    "extension_pages": "default-src 'self'",
    "sandbox": "..."
  }
  ...
}
```

**`extension_pages`**：是指扩展程序中的上下文，包括 HTML 文件和 Service Worker。

**`sandbox`**：是指您的扩展程序使用的任何[沙盒化扩展程序页面](https://developer.chrome.com/docs/extensions/reference/manifest/sandbox?hl=zh-cn)。

## 移除不受支持的内容安全政策

Manifest V3 不允许在 `"extension_pages"` 字段中使用 Manifest V2 允许使用的某些内容安全政策值。具体而言，Manifest V3 禁止使用允许远程执行的代码。`script-src,` `object-src` 和 `worker-src` 指令只能具有以下值：

-   `self`
-   `none`
-   `wasm-unsafe-eval`
-   仅限未打包的扩展程序：任何 localhost 来源（`http://localhost`、`http://127.0.0.1` 或这些网域上的任何端口）

`sandbox` 的内容安全政策值没有此类新限制。