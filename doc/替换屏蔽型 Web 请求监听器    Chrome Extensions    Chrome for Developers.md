替换屏蔽型 Web 请求监听器

bookmark\_border 使用集合让一切井井有条 根据您的偏好保存内容并对其进行分类。

修改 Manifest V3 中的网络请求

Manifest V3 更改了扩展程序处理网络请求修改的方式。扩展程序会指定规则，这些规则描述了在满足一组给定条件时要执行的操作，而不是拦截网络请求并使用 `chrome.webRequest` 在运行时对其进行更改。为此，请使用 [Declarative Net Request API](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest?hl=zh-cn)。

Web Request API 和声明式 Net Request API 有很大的不同。您需要根据用例重写代码，而不是将一个函数调用替换为另一个函数调用。本部分将引导您完成此过程。

在 Manifest V2 中，屏蔽网络请求可能会严重降低扩展程序的性能以及与其配合使用的网页的性能。[`webRequest` 命名空间](https://developer.chrome.com/docs/extensions/reference/api/webRequest?hl=zh-cn)支持 9 个可能阻塞的事件，每个事件都接受无限数量的事件处理脚本。更糟糕的是，每个网页都可能会被多个扩展程序屏蔽，而为此所需的权限具有侵入性。Manifest V3 将回调替换为声明式规则，以防止出现此问题。

本部分是介绍非扩展程序服务工件代码所需更改的三个部分中的第二部分。本文档介绍了如何将 Manifest V2 使用的阻塞 Web 请求转换为 Manifest V3 使用的声明式网络请求。另外两部分介绍了如何[更新代码](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn)，以便迁移到 Manifest V3 和[提高安全性](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn)。

## 更新权限

对 `manifest.json` 中的 [`"permissions"`](https://developer.chrome.com/docs/extensions/mv3/declare_permissions?hl=zh-cn) 字段进行以下更改。

-   如果您不再需要监控网络请求，请移除 `"webRequest"` 权限。
-   将匹配模式从 `"permissions"` 移至 `"host_permissions"`。

您需要根据自己的使用情形添加其他权限。这些权限会随其支持的用例一起描述。

## 创建声明式网络请求规则

若要创建声明式网络请求规则，需要向 `manifest.json` 添加 `"declarative_net_request"` 对象。`"declarative_net_request"` 块包含指向规则文件的 `"rule_resource"` 对象数组。规则文件包含一个对象数组，用于指定操作以及调用这些操作的条件。

## 常见使用场景

以下部分介绍了声明式网络请求的常见用例。以下说明仅提供简要概述。如需详细了解此处的所有信息，请参阅 API 参考中的 [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest?hl=zh-cn)

### 屏蔽单个网址

Manifest V2 的一个常见用例是在后台脚本中使用 `onBeforeRequest` 事件来屏蔽网络请求。

Manifest V2 后台脚本

```
chrome.webRequest.onBeforeRequest.addListener((e) => {
    return { cancel: true };
}, { urls: ["https://www.example.com/*"] }, ["blocking"]);
```

对于 Manifest V3，请使用 `"block"` 操作类型创建新的 `declarativeNetRequest` 规则。请注意示例规则中的 `"condition"` 对象。其 `"urlFilter"` 会替换传递给 `webRequest` 监听器的 `urls` 选项。`"resourceTypes"` 数组用于指定要屏蔽的资源类别。下例仅屏蔽主 HTML 页面，但您却可以仅屏蔽字体（举例而言）。

Manifest V3 规则文件

```
[
  {
    "id" : 1,
    "priority": 1,
    "action" : { "type" : "block" },
    "condition" : {
      "urlFilter" : "||example.com",
      "resourceTypes" : ["main_frame"]
    }
  }
]
```

为此，您需要更新此扩展程序的权限。在 `manifest.json` 中，将 `"webRequestBlocking"` 权限替换为 `"declarativeNetRequest"` 权限。请注意，由于屏蔽内容不需要主机权限，因此网址已从 `"permissions"` 字段中移除。如上所示，规则文件指定了声明式网络请求适用的主机。

如果您想尝试一下，[我们的示例代码库中提供了以下代码](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api-samples/declarativeNetRequest/url-blocker)。

Manifest V2

  ```
  "permissions": [
    "webRequestBlocking",
    "https://*.example.com/*"
  ]
```

Manifest V3

  ```
  "permissions": [
    "declarativeNetRequest",
  ]
```

### 重定向多个网址

清单 V2 中的另一个常见用例是使用 `BeforeRequest` 事件重定向网络请求。

Manifest V2 后台脚本

```
chrome.webRequest.onBeforeRequest.addListener((e) => {
    console.log(e);
    return { redirectUrl: "https://developer.chrome.com/docs/extensions/mv3/intro/" };
  }, { 
    urls: [
      "https://developer.chrome.com/docs/extensions/mv2/"
    ]
  }, 
  ["blocking"]
);
```

对于 Manifest V3，请使用 `"redirect"` 操作类型。与之前一样，`"urlFilter"` 会替换传递给 `webRequest` 监听器的 `url` 选项。请注意，在此示例中，规则文件的 `"action"` 对象包含一个 `"redirect"` 字段，其中包含要返回的网址，而不是要过滤的网址。

Manifest V3 规则文件

```
[
  {
    "id" : 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://developer.chrome.com/docs/extensions/mv3/intro/" }
    },
    "condition": {
      "urlFilter": "https://developer.chrome.com/docs/extensions/mv2/",
      "resourceTypes": ["main_frame"]
    }
  }
]
```

在这种情况下，还需要更改扩展程序的权限。与之前一样，将 `"webRequestBlocking"` 权限替换为 `"declarativeNetRequest"` 权限。这些网址再次从 `manifest.json` 移至规则文件。请注意，除了主机权限之外，重定向还需要 `"declarativeNetRequestWithHostAccess"` 权限。

如果您想尝试这种方法，请参阅[我们的示例代码库](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api-samples/declarativeNetRequest/url-redirect)中的以下代码。

Manifest V2

  ```
  "permissions": [
    "webRequestBlocking",
    "https://developer.chrome.com/docs/extensions/*",
    "https://developer.chrome.com/docs/extensions/reference"
  ]
```

Manifest V3

  ```
  "permissions": [
    "declarativeNetRequestWithHostAccess"
  ],
  "host_permissions": [
    "https://developer.chrome.com/*"
  ]
```

### 屏蔽 Cookie

在清单 V2 中，若要屏蔽 Cookie，您需要在 Web 请求标头发送之前拦截这些标头，然后移除特定标头。

Manifest V2 后台脚本

```
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    removeHeader(details.requestHeaders, 'cookie');
    return {requestHeaders: details.requestHeaders};
  },
  // filters
  {urls: ['https://*/*', 'http://*/*']},
  // extraInfoSpec
  ['blocking', 'requestHeaders', 'extraHeaders']);
```

Manifest V3 还会使用规则文件中的规则执行此操作。这次的操作类型为 `"modifyHeaders"`。该文件接受一个 `"requestHeaders"` 对象数组，用于指定要修改的标头以及修改方式。请注意，`"condition"` 对象仅包含 `"resourceTypes"` 数组。它支持与前面的示例相同的值。

如果您想尝试这种方法，请参阅[我们的示例代码库](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api-samples/declarativeNetRequest/no-cookies)中的以下代码。

清单 V3 manifest.json

```
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "cookie", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": "|*?no-cookies=1",
      "resourceTypes": ["main_frame"]
    }
  }
]
```

在这种情况下，还需要更改扩展程序的权限。与之前一样，将 `"webRequestBlocking"` 权限替换为 `"declarativeNetRequest"` 权限。

Manifest V2

  ```
  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "https://*/*",
    "http://*/*"
  ],
```

Manifest V3

  ```
  "permissions": [
    "declarativeNetRequest",
  ],
  "host_permissions": [
    ""
  ]
```