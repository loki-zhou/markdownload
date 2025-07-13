将背景或事件页面替换为 Service Worker

Service Worker 会替换扩展程序的后台或事件页面，以确保后台代码脱离主线程。这样，扩展程序便会仅在需要时运行，从而节省资源。

自推出以来，后台页面一直是扩展程序的基本组成部分。简单来说，后台页面可提供一个独立于任何其他窗口或标签页的环境。这样，扩展程序就可以观察事件并采取相应行动来响应事件。

本页面介绍了将后台网页转换为扩展程序 Service Worker 的任务。如需详细了解扩展程序服务工的一般用法，请参阅教程[使用服务工处理事件](https://developer.chrome.com/docs/extensions/mv3/getstarted/tut-quick-reference?hl=zh-cn)以及[扩展程序服务工简介](https://developer.chrome.com/docs/extensions/mv3/service_workers?hl=zh-cn)部分。

在某些情况下，您会看到称为“后台脚本”的扩展程序 Service Worker。虽然扩展程序服务工作线程确实在后台运行，但将其称为后台脚本有点误导性，因为这会暗示它们具有相同的功能。区别将在下面进行介绍。

### 来自后台页面的更改

Service Worker 与后台页面存在许多不同之处。

-   它们在主线程之外运行，这意味着它们不会干扰扩展程序内容。
-   它们具有特殊功能，例如在扩展程序的来源上拦截提取事件，例如从工具栏弹出式窗口拦截事件。
-   它们可以通过[客户端接口](https://developer.mozilla.org/docs/Web/API/Clients)与其他情境进行通信和互动。

### 您需要进行的更改

您需要进行一些代码调整，以应对后台脚本和服务工件运行方式之间的差异。首先，在清单文件中指定服务工件的做法与指定后台脚本的做法不同。此外：

-   由于它们无法访问 DOM 或 `window` 接口，因此您需要将此类调用移至其他 API 或屏幕外文档中。
-   不应在响应返回的 Promise 或事件回调中注册事件监听器。
-   由于它们不向后兼容 `XMLHttpRequest()`，因此您需要将对此接口的调用替换为对 [`fetch()`](https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch) 的调用。
-   由于这些 worker 在闲置时会终止，因此您需要保留应用状态，而不是依赖全局变量。终止 Service Worker 也可以使计时器在计时器完成之前结束。您需要将其替换为闹钟。

本页将详细介绍这些任务。

## 更新清单中的“background”字段

在 Manifest V3 中，后台页面被 _Service Worker_ 取代。下面列出了对清单的更改。

-   将 `manifest.json` 中的 `"background.scripts"` 替换为 `"background.service_worker"`。请注意，`"service_worker"` 字段接受字符串，而不是字符串数组。
-   从 `manifest.json` 中移除 `"background.persistent"`。

Manifest V2

```
{
  ...
  "background": {
    "scripts": [
      "backgroundContextMenus.js",
      "backgroundOauth.js"
    ],
    "persistent": false
  },
  ...
}
```

Manifest V3

```
{
  ...
  "background": {
    "service_worker": "service_worker.js",
    "type": "module"
  }
  ...
}
```

`"service_worker"` 字段接受单个字符串。只有在使用 [ES 模块](https://web.dev/articles/es-modules-in-sw?hl=zh-cn#static_imports_only)（使用 [`import`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/import) 关键字）时，才需要 `"type"` 字段。其值始终为 `"module"`。如需了解详情，请参阅[扩展程序服务工件基础知识](https://developer.chrome.com/docs/extensions/mv3/service_workers/basics?hl=zh-cn#import-scripts)

## 将 DOM 和窗口调用移至屏幕外文档

某些扩展程序需要访问 DOM 和窗口对象，但无需在视觉上打开新窗口或标签页。[Offscreen API](https://developer.chrome.com/docs/extensions/reference/offscreen?hl=zh-cn) 通过打开和关闭与扩展程序打包的未显示文档来支持这些用例，而不会中断用户体验。除了消息传递之外，屏幕外文档不会与其他扩展程序上下文共享 API，而是作为扩展程序可以与之互动的完整网页。

如需使用 Offscreen API，请通过 Service Worker 创建屏幕外文档。

```
chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: ['CLIPBOARD'],
  justification: 'testing the offscreen API',
});
```

在屏幕外文档中，执行您之前在后台脚本中运行的任何操作。例如，您可以复制在托管网页上选择的文字。

```
let textEl = document.querySelector('#text');
textEl.value = data;
textEl.select();
document.execCommand('copy');
```

使用[消息传递](https://developer.chrome.com/docs/extensions/mv3/messaging?hl=zh-cn)功能在屏幕外文档和扩展程序 Service Worker 之间进行通信。

## 将 localStorage 转换为其他类型

Web 平台的 [`Storage`](https://developer.mozilla.org/docs/Web/API/Storage) 接口（可通过 `window.localStorage` 访问）不能在 Service Worker 中使用。要解决此问题，请采取以下措施之一。首先，您可以将其替换为对其他存储机制的调用。[`chrome.storage.local`](https://developer.chrome.com/docs/extensions/reference/storage?hl=zh-cn#property-local) 命名空间适用于大多数用例，但也提供了[其他选项](https://developer.chrome.com/docs/extensions/mv3/service_workers/service-worker-lifecycle?hl=zh-cn#persist-data)。

您还可以将其调用移至[屏幕外文档](https://developer.chrome.com/docs/extensions/reference/offscreen?hl=zh-cn)。例如，如需将之前存储在 `localStorage` 中的数据迁移到其他机制，请使用以下命令：

1.  使用转换例程和 [`runtime.onMessage`](https://developer.chrome.com/docs/extensions/reference/runtime?hl=zh-cn#event-onMessage) 处理程序创建屏幕外文档。
2.  向屏幕外文档添加转换例程。
3.  在扩展程序服务工作器中，检查 [`chrome.storage`](https://developer.chrome.com/docs/extensions/reference/storage?hl=zh-cn) 中是否有您的数据。
4.  如果未找到您的数据，请[create](https://developer.chrome.com/docs/extensions/reference/offscreen?hl=zh-cn#method-createDocument)一个屏幕外文档，然后调用 [`runtime.sendMessage()`](https://developer.chrome.com/docs/extensions/reference/runtime?hl=zh-cn#method-sendMessage) 以启动转换例程。
5.  在您添加到屏幕外文档的 `runtime.onMessage` 处理程序中，调用转换例程。

Web 存储空间 API 在扩展程序中的运作方式也有一些细微之处。如需了解详情，请参阅[存储空间和 Cookie](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies?hl=zh-cn)。

## 同步注册监听器

异步注册监听器（例如在 promise 或回调内）在 Manifest V3 中不一定可行。请参考以下代码。

```
chrome.storage.local.get(["badgeText"], ({ badgeText }) => {
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.onClicked.addListener(handleActionClick);
});
```

这适用于持续性后台页面，因为页面会持续运行且永远不会重新初始化。在 Manifest V3 中，系统会在分派事件时重新初始化服务工作器。这意味着，当事件触发时，监听器将不会注册（因为它们是异步添加的），并且系统会错过事件。

请改为将事件监听器注册移至脚本的顶层。这样可以确保 Chrome 能够立即找到并调用操作的点击处理脚本，即使您的扩展程序尚未完成其启动逻辑也是如此。

```
chrome.action.onClicked.addListener(handleActionClick);

chrome.storage.local.get(["badgeText"], ({ badgeText }) => {
  chrome.action.setBadgeText({ text: badgeText });
});
```

## 将 XMLHttpRequest() 替换为全局 fetch()

无法从 Service Worker、扩展程序或其他方式调用 `XMLHttpRequest()`。将后台脚本对 `XMLHttpRequest()` 的调用替换为对[全局 `fetch()`](https://developer.mozilla.org/docs/Web/API/fetch) 的调用。

XMLHttpRequest()

```
const xhr = new XMLHttpRequest();
console.log('UNSENT', xhr.readyState);

xhr.open('GET', '/api', true);
console.log('OPENED', xhr.readyState);

xhr.onload = () => {
    console.log('DONE', xhr.readyState);
};
xhr.send(null);
```

fetch()

```
const response = await fetch('https://www.example.com/greeting.json'')
console.log(response.statusText);
```

## 保留状态

Service Worker 是临时的，这意味着它们可能会在用户浏览器会话期间反复启动、运行和终止。这也意味着，由于之前的上下文已被拆解，因此全局变量中的数据无法立即使用。如需解决此问题，请使用存储空间 API 作为可信来源。下面的示例将展示如何执行此操作。

以下示例使用全局变量存储名称。在 Service Worker 中，此变量可能会在用户的浏览器会话期间重置多次。

Manifest V2 后台脚本

```
let savedName = undefined;

chrome.runtime.onMessage.addListener(({ type, name }) => {
  if (type === "set-name") {
    savedName = name;
  }
});

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { name: savedName });
});
```

对于 Manifest V3，将全局变量替换为对 [Storage API](https://developer.chrome.com/docs/extensions/reference/storage?hl=zh-cn) 的调用。

Manifest V3 Service Worker

```
chrome.runtime.onMessage.addListener(({ type, name }) => {
  if (type === "set-name") {
    chrome.storage.local.set({ name });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const { name } = await chrome.storage.local.get(["name"]);
  chrome.tabs.sendMessage(tab.id, { name });
});
```

## 将计时器转换为闹钟

通常，您可以使用 `setTimeout()` 或 `setInterval()` 方法使用延迟或周期性操作。不过，这些 API 在服务工件中可能会失败，因为每当服务工件终止时，计时器都会被取消。

Manifest V2 后台脚本

```
// 3 minutes in milliseconds
const TIMEOUT = 3 * 60 * 1000;
setTimeout(() => {
  chrome.action.setIcon({
    path: getRandomIconPath(),
  });
}, TIMEOUT);
```

请改用 [Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms?hl=zh-cn)。与其他监听器一样，闹钟监听器应在脚本的顶层注册。

Manifest V3 Service Worker

```
async function startAlarm(name, duration) {
  await chrome.alarms.create(name, { delayInMinutes: 3 });
}

chrome.alarms.onAlarm.addListener(() => {
  chrome.action.setIcon({
    path: getRandomIconPath(),
  });
});
```

## 让服务工件保持活跃状态

服务工件按定义是事件驱动的，并会在无活动时终止。这样，Chrome 就可以优化扩展程序的性能和内存用量。如需了解详情，请参阅我们的[服务工件生命周期文档](https://developer.chrome.com/docs/extensions/mv3/service_workers/service-worker-lifecycle?hl=zh-cn#idle-shutdown)。在特殊情况下，可能需要采取额外措施来确保服务工件保持长时间活跃状态。

### 在长时间运行的操作完成之前，保持服务工作器的活跃状态

在长时间运行且不调用扩展程序 API 的 Service Worker 操作期间，Service Worker 可能会在操作中途关闭。例如：

-   [`fetch()` 请求](https://developer.mozilla.org/docs/Web/API/Fetch_API)的处理时间可能超过五分钟（例如，在网络连接状况不佳的情况下下载大量数据）。
-   复杂的异步计算需要超过 30 秒。

在这些情况下，如需延长服务工件生命周期，您可以定期调用一个琐碎的扩展程序 API 来重置超时计数器。请注意，这仅适用于特殊情况，在大多数情况下，通常可以通过更好、符合平台习惯的方法来实现相同的结果。

以下示例展示了一个 `waitUntil()` 辅助函数，该函数会在给定 promise 解析之前保持服务工作器处于活动状态：

```
async function waitUntil(promise) = {
  const keepAlive = setInterval(chrome.runtime.getPlatformInfo, 25 * 1000);
  try {
    await promise;
  } finally {
    clearInterval(keepAlive);
  }
}

waitUntil(someExpensiveCalculation());
```

### 使 Service Worker 持续保持活动状态

在极少数情况下，需要无限期延长生命周期。我们已将企业和教育领域确定为最大的用例，并在这些领域专门允许这样做，但我们通常不支持这样做。在这些特殊情况下，可以通过定期调用一个简单的扩展程序 API 来保持服务工件保持活跃状态。请务必注意，此建议仅适用于在受管理的设备上运行的企业或教育用例扩展程序。在其他情况下则是不允许的，Chrome 扩展程序团队保留日后对这些扩展程序采取措施的权利。

使用以下代码段可让您的服务工件保持活跃状态：

```
/**
 * Tracks when a service worker was last alive and extends the service worker
 * lifetime by writing the current time to extension storage every 20 seconds.
 * You should still prepare for unexpected termination - for example, if the
 * extension process crashes or your extension is manually stopped at
 * chrome://serviceworker-internals. 
 */
let heartbeatInterval;

async function runHeartbeat() {
  await chrome.storage.local.set({ 'last-heartbeat': new Date().getTime() });
}

/**
 * Starts the heartbeat interval which keeps the service worker alive. Call
 * this sparingly when you are doing work which requires persistence, and call
 * stopHeartbeat once that work is complete.
 */
async function startHeartbeat() {
  // Run the heartbeat once at service worker startup.
  runHeartbeat().then(() => {
    // Then again every 20 seconds.
    heartbeatInterval = setInterval(runHeartbeat, 20 * 1000);
  });
}

async function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}

/**
 * Returns the last heartbeat stored in extension storage, or undefined if
 * the heartbeat has never run before.
 */
async function getLastHeartbeat() {
  return (await chrome.storage.local.get('last-heartbeat'))['last-heartbeat'];
}
```