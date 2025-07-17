# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the source code for **MarkDownload**, a browser extension that allows users to clip web pages and convert them into Markdown files. The extension is available for Firefox, Chrome, Edge, and Safari.

The core functionality relies on two main libraries:
- **Readability.js**: To extract the main content from a web page, stripping out unnecessary elements.
- **Turndown**: To convert the cleaned HTML content into Markdown.

## Development

### Commonly Used Commands

The following commands are available in the `src/` directory:

- **Install dependencies**:
  ```bash
  npm install
  ```

- **Build the extension**:
  ```bash
  npm run build
  ```
  This command creates a distributable package of the extension in the `src/web-ext-artifacts/` directory.

- **Run in development mode**:
  - **Firefox Developer Edition**:
    ```bash
    npm run start:firefoxdeveloper
    ```
  - **Google Chrome (Windows)**:
    ```bash
    npm run start:chromedevwin
    ```

### Running Tests

There are no explicitly defined test scripts in `package.json`. However, there are some HTML files in the root directory that appear to be for manual testing of specific functionalities, such as `anchor-link-fix-comprehensive-test.html` and `test-anchor-links.html`.

## Code Architecture

The extension's source code is located in the `src/` directory and follows a standard web extension structure:

- **`manifest.json`**: The manifest file that defines the extension's properties, permissions, and entry points.
- **`background/`**: Contains the background scripts of the extension.
  - `background.js`: The main background script that handles events and coordinates the extension's functionality.
  - `Readability.js`, `turndown.js`: The core libraries for content extraction and Markdown conversion.
- **`contentScript/`**: Contains scripts that are injected into web pages to interact with their content.
  - `contentScript.js`: The main content script.
- **`options/`**: Contains the code for the extension's options page, allowing users to customize its behavior.
- **`popup/`**: Contains the UI and logic for the popup that appears when the user clicks the extension's icon.
- **`shared/`**: Likely contains shared code or resources used by different parts of the extension.
- **`icons/`**: Contains the extension's icons.

### Obsidian Integration

A key feature of this extension is its integration with the [Obsidian](https://obsidian.md/) note-taking application. This functionality is implemented through the "Advanced Obsidian URI" community plugin, which allows sending the clipped Markdown content directly to a specified Obsidian vault and folder. The relevant settings for this integration can be found in the extension's options.
