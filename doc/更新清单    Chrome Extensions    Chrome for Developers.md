更新清单

bookmark\_border 使用集合让一切井井有条 根据您的偏好保存内容并对其进行分类。

将 V2 清单转换为 V3 清单

`manifest.json` 文件的格式要求与 Manifest V2 略有不同。本页介绍了仅影响 `manifest.json` 文件的更改。但是，对脚本和网页进行的许多更改也需要对清单进行更改。这些更改会在需要时通过迁移任务进行处理。

## 更改清单版本号

将 `"manifest_version"` 字段的值从 2 更改为 3。

Manifest V2

```
{
  ...
  "manifest_version": 2
  ...
}
```

Manifest V3

```
{
  ...
  "manifest_version": 3
  ...
}
```

## 更新主持人权限

Manifest V3 中的主机权限是单独的字段；您无需在 `"permissions"` 或 `"optional_permissions"` 中指定这些权限。

[内容脚本](https://developer.chrome.com/docs/extensions/mv3/content_scripts?hl=zh-cn#static-declarative)仍位于 `"content_scripts.matches"` 下。如需了解 `"content_scripts.matches"`，请参阅[使用静态声明注入](https://developer.chrome.com/docs/extensions/mv3/content_scripts?hl=zh-cn#static-declarative)。

Manifest V2

```
{
  ...
  "permissions": [
    "tabs",
    "bookmarks",
    "https://www.blogger.com/"
  ],
  "optional_permissions": [
    "unlimitedStorage",
    "*://*/*"
  ]
  ...
}
```

Manifest V3

```
{
  ...
  "permissions": [
    "tabs",
    "bookmarks"
  ],
  "optional_permissions": [
    "unlimitedStorage"
  ],
  "host_permissions": [
    "https://www.blogger.com/"
  ],
  "optional_host_permissions": [
    "*://*/*"
  ]
  ...
}
```

## 更新网络无障碍资源

可通过网络访问的资源是指可供网页或其他扩展程序访问的扩展程序内的文件。在 Manifest V2 中实现的 `"web_accessible_resources"` 字段会使网站和攻击者能够检测到扩展程序（前提是扩展程序选择公开资源）。这带来了数字“指纹”收集或意外访问资源的机会。

Manifest V3 通过限制哪些网站和扩展程序可以访问扩展程序中的资源来限制扩展程序的公开范围。现在，您需要提供_对象数组_，而不是像以前那样提供文件列表，其中每个对象都会将一组资源映射到一组网址或扩展程序 ID。

以下示例比较了 Manifest V2 和 Manifest V3 之间的可访问 Web 资源。在清单 V2 中，默认情况下，所有网站都可以访问指定的资源。在下方显示的 Manifest V3 代码中，这些资源仅适用于 `https://example.com`，而只有某些图片适用于所有网站。

如需了解详情，请参阅[可访问 Web 的资源](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources?hl=zh-cn)和[匹配模式](https://developer.chrome.com/docs/extensions/mv3/match_patterns?hl=zh-cn)。

Manifest V2

```
{
  ...
  "web_accessible_resources": [
    "images/*",
    "style/extension.css",
    "script/extension.js"
  ],
  ...
}
```

Manifest V3

```
{
  ...
    "web_accessible_resources": [
    {
      "resources": [
        "images/*"
      ],
      "matches": [
        "*://*/*"
      ]
    },
    {
      "resources": [
        "style/extension.css",
        "script/extension.js"
      ],
      "matches": [
        "https://example.com/*"
      ]
    }
  ],
  ...
}
```