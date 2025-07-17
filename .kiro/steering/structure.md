# Project Structure

## Root Directory
- **src/**: Main extension source code (Manifest V3)
- **v2_back/**: Backup of Manifest V2 version
- **doc/**: Chrome Extension migration documentation
- **media/**: Screenshots and promotional images
- **xcode/**: Safari extension build files

## Source Code Organization (`src/`)

### Core Components
- **manifest.json**: Extension configuration and permissions
- **background/**: Service Worker and background scripts
  - `background.js`: Main background script with message handling
  - `apache-mime-types.js`: MIME type definitions
  - `moment.min.js`, `Readability.js`: Third-party libraries
- **contentScript/**: Scripts injected into web pages
  - `contentScript.js`: DOM manipulation and content extraction
- **popup/**: Extension popup interface
  - `popup.html`, `popup.js`, `popup.css`: Main UI components
- **options/**: Settings page
  - `options.html`, `options.js`, `options.css`: Configuration interface
- **offscreen/**: Manifest V3 clipboard handling
  - `offscreen.html`, `offscreen.js`: Background clipboard operations

### Shared Resources
- **shared/**: Common utilities and configurations
  - `default-options.js`: Default extension settings
  - `context-menus.js`: Right-click menu definitions
- **icons/**: Extension icons in various sizes
- **node_modules/**: npm dependencies
- **web-ext-artifacts/**: Built extension packages

## Key Files
- **README.md**: Project documentation and installation guide
- **CHANGELOG.md**: Version history and release notes
- **user-guide.md**: Comprehensive user documentation
- **PRIVACY.md**: Privacy policy
- **LICENSE**: Open source license

## Test Files
- **anchor-link-*.html/js**: Test files for anchor link functionality
- **debug-*.html**: Debug utilities for development
- **mathjax-rule.js**: MathJax processing rules

## Development Conventions
- Manifest V3 architecture with service workers
- Shared utilities in `src/shared/` for cross-component use
- Separate HTML/CSS/JS files for each UI component
- Test files in root for easy access during development