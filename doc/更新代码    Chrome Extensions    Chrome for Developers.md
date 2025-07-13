更新代码

bookmark\_border 使用集合让一切井井有条 根据您的偏好保存内容并对其进行分类。

与其他问题无关的更新

这是本教程的三个部分中的第一部分，介绍了对扩展程序服务工件之外的代码所需进行的更改。本部分针对的是与其他问题无关的代码更改必需更改。接下来的两个部分将介绍如何[替换屏蔽网络请求](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn)和[提高安全性](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn)。

## 将 tab.executeScript() 替换为 scripting.executeScript()

在 Manifest V3 中，`executeScript()` 已从 `tabs` API 移至 [`scripting`](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn) API。除了实际的代码更改之外，还需要更改清单文件中的权限。

对于 `executeScript()` 方法，您需要：

-   `"scripting"` 权限。
-   主机权限或 `"activeTab"` 权限。

`scripting.executeScript()` 方法与 `tabs.executeScript()` 的使用方式类似。二者存在一些差异。

-   旧方法只能接受一个文件，而新方法可以接受一个文件数组。
-   您还需要传递 [`ScriptInjection`](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn#type-ScriptInjection) 对象，而不是 [`InjectDetails`](https://developer.chrome.com/docs/extensions/reference/extensionTypes?hl=zh-cn#type-InjectDetails)。这两者之间存在多点不同。例如，`tabId` 现在作为 `ScriptInjection.target` 的成员传递，而不是作为方法参数传递。

示例展示了如何执行此操作。

Manifest V2

```
async function getCurrentTab() {/* ... */}
let tab = await getCurrentTab();

chrome.tabs.executeScript(
  tab.id,
  {
    file: 'content-script.js'
  }
);
```

在后台脚本文件中。

Manifest V3

```
async function getCurrentTab()
let tab = await getCurrentTab();

chrome.scripting.executeScript({
  target: {tabId: tab.id},
  files: ['content-script.js']
});
```

在扩展程序 Service Worker 中。

## 将 tabs.insertCSS() 和 tabs.removeCSS() 替换为 scripting.insertCSS() 和 scripting.removeCSS()

在清单 V3 中，`insertCSS()` 和 `removeCSS()` 从 `tabs` API 移到了 [`scripting` API](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn)。这除了需要更改代码之外，还需要更改清单文件中的权限：

-   `"scripting"` 权限。
-   主机权限或 `"activeTab"` 权限。

`scripting` API 中的函数与 `tabs` 中的函数类似。二者存在一些差异。

-   调用这些方法时，您需要传递 [`CSSInjection`](https://developer.chrome.com/docs/extensions/reference/scripting?hl=zh-cn#type-CSSInjection) 对象，而不是 `InjectDetails`。
-   `tabId` 现在作为 `CSSInjection.target` 的成员传递，而不是作为方法参数传递。

该示例展示了如何为 `insertCSS()` 执行此操作。`removeCSS()` 的过程是相同的。

Manifest V2

```
chrome.tabs.insertCSS(tabId, injectDetails, () => {
  // callback code
});
```

在后台脚本文件中。

Manifest V3

```
const insertPromise = await chrome.scripting.insertCSS({
  files: ["style.css"],
  target: { tabId: tab.id }
});
// Remaining code. 
``` 

在扩展程序服务工作器中。

## 将浏览器操作和页面操作替换为操作

在 Manifest V2 中，浏览器操作和页面操作是两个单独的概念。虽然他们起初的角色不同，但它们之间的差别逐渐缩小。在 Manifest V3 中，这些概念已整合到 [Action](https://developer.chrome.com/docs/extensions/reference/action?hl=zh-cn) API 中。这需要对您的 `manifest.json` 和扩展程序代码（不同于您在 Manifest V2 后台脚本中添加的内容）进行更改。

Manifest V3 中的 Action 与浏览器 Action 最为相似；不过，`action` API 不像 `pageAction` 那样提供 `hide()` 和 `show()`。如果您仍需要执行页面操作，则可以[使用声明式内容模拟此类操作](https://developer.chrome.com/docs/extensions/reference/action?hl=zh-cn#emulating-pageactions-with-declarativecontent)，或使用标签页 ID 调用 `enable()` 或 `disable()`。

### 将“browser\_action”和“page\_action”替换为“action”

在 `manifest.json` 中，将 `"browser_action"` 和 `"page_action"` 字段替换为 `"action"` 字段。如需[了解 `"action"` 字段](https://developer.chrome.com/docs/extensions/reference/action?hl=zh-cn)，请参阅参考文档。

Manifest V2

```
{
  ...
  "page_action": { ... },
  "browser_action": {
    "default_popup": "popup.html"
   }
  ...
}
```

Manifest V3

```
{
  ...
  "action": {
    "default_popup": "popup.html"
  }

  ...
}
```

### 将 browserAction 和 pageAction API 替换为 action API

在 Manifest V2 使用 `browserAction` 和 `pageAction` API 的地方，您现在应使用 `action` API。

Manifest V2

```
chrome.browserAction.onClicked.addListener(tab => { ... });
chrome.pageAction.onClicked.addListener(tab => { ... });
```

Manifest V3

```
chrome.action.onClicked.addListener(tab => { ... });
```

## 将回调替换为 Promise

在 Manifest V3 中，许多扩展 API 方法都会返回 promise。_Promise_ 是异步方法返回的值的代理或占位符。如果您从未使用过 Promise，则可以[在 MDN 上了解相关内容](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises)。本页介绍了在 Chrome 扩展程序中使用这些功能的须知事项。

为了实现向后兼容性，许多方法在添加 promise 支持后继续支持回调。请注意，您不能在同一函数调用中同时使用这两种方法。如果您传递回调，则该函数不会返回 promise；如果您希望返回 promise，则不要传递回调。某些 API 功能（例如事件监听器）仍需要回调。如需检查某个方法是否支持 Promise，请在其 API 参考文档中查找“Promise”标签。

如需从回调转换为 promise，请移除回调并处理返回的 promise。以下示例取自[可选权限示例](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/sample.optional_permissions)，具体而言是 `newtab.js`。回调版本显示了该示例使用回调对 `request()` 的调用是什么样的。请注意，可以使用 async 和 await 重写 promise 版本。

回拨电话

```
chrome.permissions.request(newPerms, (granted) => {
  if (granted) {
    console.log('granted');
  } else {
    console.log('not granted');
  }
});
```

Promise

```
const newPerms = { permissions: ['topSites'] };
chrome.permissions.request(newPerms)
.then((granted) => {
  if (granted) {
    console.log('granted');
  } else {
    console.log('not granted');
  }
});
```

## 替换预期使用 Manifest V2 后台上下文的函数

其他扩展程序上下文只能使用[消息传递](https://developer.chrome.com/docs/extensions/mv3/messaging?hl=zh-cn)与扩展程序服务 worker 进行交互。因此，您需要替换预期使用后台上下文的调用，具体而言：

-   `chrome.runtime.getBackgroundPage()`
-   `chrome.extension.getBackgroundPage()`
-   `chrome.extension.getExtensionTabs()`

您的扩展程序脚本应使用消息传递在服务工件与扩展程序的其他部分之间进行通信。目前，这可通过在扩展程序 Service Worker 中使用 `sendMessage()` 并实现 `chrome.runtime.onMessage` 来实现。从长远来看，您应计划将这些调用替换为 [`postMessage()`](https://developer.mozilla.org//docs/Web/API/Client/postMessage) 和服务工件的[消息事件处理脚本](https://developer.mozilla.org/docs/Web/API/ServiceWorkerGlobalScope/message_event)。

## 替换不受支持的 API

下列方法和属性需要在 Manifest V3 中更改。

| Manifest V2 方法或属性 | 替换为 |
| --- | --- |
| `chrome.extension.connect()` | `chrome.runtime.connect()` |
| `chrome.extension.connectNative()` | `chrome.runtime.connectNative()` |
| `chrome.extension.getExtensionTabs()` | `chrome.extension.getViews()` |
| `chrome.extension.getURL()` | `chrome.runtime.getURL()` |
| `chrome.extension.lastError` | 在方法返回 promise 时，使用 `promise.catch()` |
| `chrome.extension.onConnect` | `chrome.runtime.onConnect` |
| `chrome.extension.onConnectExternal` | `chrome.runtime.onConnectExternal` |
| `chrome.extension.onMessage` | `chrome.runtime.onMessage` |
| `chrome.extension.onRequest` | `chrome.runtime.onMessage` |
| `chrome.extension.onRequestExternal` | `chrome.runtime.onMessageExternal` |
| `chrome.extension.sendMessage()` | `chrome.runtime.sendMessage()` |
| `chrome.extension.sendNativeMessage()` | `chrome.runtime.sendNativeMessage()` |
| `chrome.extension.sendRequest()` | `chrome.runtime.sendMessage()` |
| `chrome.runtime.onSuspend`（后台脚本） | 在扩展程序 Service Worker 中不受支持。请改用 [`beforeunload`](https://developer.mozilla.org/docs/Web/API/Window/beforeunload_event) 文档事件。 |
| `chrome.tabs.getAllInWindow()` | `chrome.tabs.query()` |
| `chrome.tabs.getSelected()` | `chrome.tabs.query()` |
| `chrome.tabs.onActiveChanged` | `chrome.tabs.onActivated` |
| `chrome.tabs.onHighlightChanged` | `chrome.tabs.onHighlighted` |
| `chrome.tabs.onSelectionChanged` | `chrome.tabs.onActivated` |
| `chrome.tabs.sendRequest()` | `chrome.runtime.sendMessage()` |
| `chrome.tabs.Tab.selected` | `chrome.tabs.Tab.highlighted` |