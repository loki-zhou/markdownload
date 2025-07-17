# Technology Stack

## Browser Extension Architecture
- **Manifest Version**: V3 (migrated from V2, with V2 backup in `v2_back/`)
- **Target Browsers**: Chrome, Firefox, Edge, Safari
- **Extension Type**: Cross-platform web extension using WebExtensions API

## Core Libraries
- **Readability.js**: Mozilla's library for content extraction (commit 1fde3ac626bc4c2e5e54daa57c57d48b7ed9c574)
- **Turndown**: HTML to Markdown conversion (v7.1.1) with GFM plugin support
- **Moment.js**: Date formatting for template variables (v2.29.4)
- **CodeMirror**: Markdown editor in popup interface

## Build System
- **Package Manager**: npm
- **Build Tool**: web-ext (Mozilla's extension build tool)

### Common Commands
```bash
# Install dependencies
npm run npminstall

# Build extension for distribution
npm run build

# Development with Firefox Developer Edition
npm run start:firefoxdeveloper

# Development with Chrome Dev (Windows)
npm run start:chromedevwin

# Android testing (Firefox Nightly)
npm run start:androidwin11
```

## Extension Components
- **Background Script**: Service Worker (Manifest V3) handling core logic
- **Content Script**: Injected into web pages for DOM manipulation
- **Popup**: Main UI for markdown preview and editing
- **Options Page**: Settings and configuration interface
- **Offscreen Document**: For clipboard operations in Manifest V3

## Key Technologies
- **JavaScript**: ES6+ with Chrome Extensions APIs
- **HTML/CSS**: Standard web technologies for UI
- **Chrome Storage API**: Extension settings persistence
- **Chrome Downloads API**: File download functionality
- **Chrome Context Menus API**: Right-click menu integration