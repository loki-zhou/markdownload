## Manifest V3 迁移核对清单

bookmark\_border 使用集合让一切井井有条 根据您的偏好保存内容并对其进行分类。

-   本页内容
-   [更新清单](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#update_the_manifest)
-   [迁移到 Service Worker](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#migrate_to_a_service_worker)
-   [更新 API 调用](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#update_api_calls)
-   [替换屏蔽 Web 请求监听器](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#replace_blocking_web_request_listeners)
-   [提高扩展程序的安全性](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#improve_extension_security)
-   [发布 Manifest V3 扩展程序](https://developer.chrome.com/docs/extensions/develop/migrate/checklist?hl=zh-cn#publish_your_manifest_v3_extension)

跟踪迁移进度

以下核对清单可帮助您跟踪迁移工作。它们定义了必须完成的任务以及指向说明的链接。如[迁移摘要](https://developer.chrome.com/?hl=zh-cn)中所述，迁移工作大致分为五类。

## 更新清单

Manifest V3 与 Manifest V2 `manifest.json`文件需要的格式略有不同。本页面介绍了仅影响 `manifest.json` 文件的更改。不过，对脚本和网页的许多更改还需要对清单进行更改。这些更改包含在需要它们的迁移任务中。

-   [更改清单版本号](https://developer.chrome.com/docs/extensions/develop/migrate/manifest?hl=zh-cn#change-version)。
-   [更新主机权限](https://developer.chrome.com/docs/extensions/develop/migrate/manifest?hl=zh-cn#update-host-permissions)。
-   [更新可通过网络访问的资源](https://developer.chrome.com/docs/extensions/develop/migrate/manifest?hl=zh-cn#update-wa-resources)。

## 迁移到 Service Worker

Service Worker 会替换扩展程序的后台或事件页面，以确保后台代码远离主线程。这样可以让扩展程序仅在需要时运行，从而节省资源。

在开始之前，请先了解[后台脚本与扩展 Service Worker 之间的区别](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#differences-with-sws)。

-   [更新清单中的“background”字段](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#update-bg-field)
-   [将 DOM 和窗口调用移至屏幕外文档](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#move-dom-and-window)
-   [将 localStorage 转换为 chrome.storage.local](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#convert-localstorage)
-   [同步注册监听器](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#register-listeners)
-   [将对 `XMLHttpRequest()` 的调用替换为全局 `fetch()`](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#replace-xmlhttprequest)。
-   [保留状态](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#persist-states)
-   [将计时器转换为闹钟](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#convert-timers)
-   [使 Service Worker 保持活跃状态（在特殊情况下）](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers?hl=zh-cn#keep-sw-alive)

## 更新 API 调用

某些功能需要替换为 Manifest V3 等效项。还有一些扩展程序则需要彻底删除。

-   [将 `tabs.executeScript()` 替换为 `scripting.executeScript()`](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-executescript)。
-   [将 `tabs.insertCSS()` 和 `tabs.removeCSS()` 替换为 `scripting.insertCSS()` 和 `scripting.removeCSS()`](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-insertcss-removecss)。
-   [将浏览器操作和网页操作替换为操作](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-browser-page-actions)
-   [替换需要 Manifest V2 后台上下文的函数](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-mv2-function)。
-   [将回调替换为 promise](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-callbacks)
-   [替换不受支持的 API](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls?hl=zh-cn#replace-unsupported-apis)

## 替换屏蔽 Web 请求监听器

您的扩展程序不会像在 Manifest V2 中那样以编程方式读取网络请求并更改请求，而是指定规则来描述在满足一组给定条件时要执行的操作。

-   [更新权限](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#update-permissions)
-   [创建声明性 net 请求规则](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#create-dnr-rules)

完成上述操作后，您可能需要查看一些[常见用例](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#common-use-cases)：

-   [屏蔽单个网址](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#block-a-single-url)
-   [重定向多个网址](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#redirect-multiple-urls)
-   [阻止 Cookie](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests?hl=zh-cn#block-cookies)

## 提高扩展程序的安全性

为了提高扩展程序的安全性，必须进行更改。这包括移除不再受支持的远程托管代码。

-   [移除任意字符串的执行](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn#remove-execution-of-strings)。
-   [移除远程托管代码](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn#remove-remote-code)
-   [更新内容安全政策](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn#update-csp)。
-   [移除不受支持的内容安全政策值](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn#remove-unsupported-csv)

扩展程序转换为清单版本 3 后，即可在 Chrome 应用商店中发布扩展程序。根据所做的更改，考虑逐步发布。通过这种方法，您可以确保自己的扩展程序在有限的受众群体范围内能够按预期运行，然后再面向整个用户群发布。

-   [发布 Beta 版测试版本](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3?hl=zh-cn#publish-beta)。
-   [逐步发布版本](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3?hl=zh-cn#gradual-rollout)。
-   [规划审核时间](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3?hl=zh-cn#review)。
-   [其他提示](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3?hl=zh-cn#tips)。

如未另行说明，那么本页面中的内容已根据[知识共享署名 4.0 许可](https://creativecommons.org/licenses/by/4.0/)获得了许可，并且代码示例已根据 [Apache 2.0 许可](https://www.apache.org/licenses/LICENSE-2.0)获得了许可。有关详情，请参阅 [Google 开发者网站政策](https://developers.google.com/site-policies?hl=zh-cn)。Java 是 Oracle 和/或其关联公司的注册商标。

最后更新时间 (UTC)：2023-03-09。