importScripts(
  "./apache-mime-types.js",
  "./moment.min.js",
  "./Readability.js",
  "../shared/context-menus.js",
  "../shared/default-options.js"
);

// log some info
chrome.runtime.getPlatformInfo().then(async platformInfo => {
  const browserInfo = chrome.runtime.getBrowserInfo ? await chrome.runtime.getBrowserInfo() : "Can't get browser info"
  console.info(platformInfo, browserInfo);
});

// add notification listener for foreground page messages
chrome.runtime.onMessage.addListener(notify);
// create context menus
createMenus()

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path, parameters) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument(parameters);
    await creating;
    creating = null;
  }
}

async function closeOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen/offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

/**
 * 进度阶段配置
 * 
 * 定义了处理流程的各个阶段，每个阶段包含：
 * - range: 进度百分比范围 [最小值, 最大值]
 * - message: 显示给用户的描述文本
 */
const progressStages = {
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

/**
 * 报告进度函数
 * @param {string} stage - 当前处理阶段的标识符
 * @param {number|null} customPercentage - 可选，自定义进度百分比，如果为null则使用阶段的起始百分比
 * @param {string|null} customMessage - 可选，自定义消息，如果为null则使用阶段的默认消息
 */
function reportProgress(stage, customPercentage = null, customMessage = null) {
  const stageConfig = progressStages[stage];
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

// function to convert the article content to markdown using Turndown
async function turndown(content, options, article) {
  // 报告进度：开始Markdown转换
  reportProgress("markdown-conversion");
  
  await setupOffscreenDocument('offscreen/offscreen.html', {
    url: chrome.runtime.getURL('offscreen/offscreen.html'),
    reasons: ['DOM_PARSER'],
    justification: 'Convert HTML to Markdown',
  });

  const result = await new Promise((resolve) => {
    const listener = (message) => {
      if (message.type === 'turndown-result') {
        chrome.runtime.onMessage.removeListener(listener);
        // Do not close the offscreen document here, let it be reused or timeout.
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({
      type: 'turndown-request',
      target: 'offscreen',
      data: { content, options, article }
    });
  });

  return result;
}



// function to replace placeholder strings with article info
function textReplace(string, article, disallowedChars = null) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = this.generateValidFileName(s, disallowedChars);

      string = string.replace(new RegExp('{' + key + '}', 'g'), s)
        .replace(new RegExp('{' + key + ':lower}', 'g'), s.toLowerCase())
        .replace(new RegExp('{' + key + ':upper}', 'g'), s.toUpperCase())
        .replace(new RegExp('{' + key + ':kebab}', 'g'), s.replace(/ /g, '-').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed-kebab}', 'g'), s.replace(/ /g, '-'))
        .replace(new RegExp('{' + key + ':snake}', 'g'), s.replace(/ /g, '_').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed_snake}', 'g'), s.replace(/ /g, '_'))
        // For Obsidian Custom Attachment Location plugin, we need to replace spaces with hyphens, but also remove any double hyphens.
        .replace(new RegExp('{' + key + ':obsidian-cal}', 'g'), s.replace(/ /g, '-').replace(/-{2,}/g, "-"))
        .replace(new RegExp('{' + key + ':camel}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toLowerCase()))
        .replace(new RegExp('{' + key + ':pascal}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toUpperCase()))
    }
  }

  // replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replaceAll(match, dateString);
    });
  }

  // replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1)
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\/g, '\\'));
      }
      catch { }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    })
  }

  // replace anything left in curly braces
  const defaultRegex = /{(.*?)}/g
  string = string.replace(defaultRegex, '')

  return string;
}

// function to convert an article info object into markdown
async function convertArticleToMarkdown(article, downloadImages = null) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }
  
  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');

  let result = await turndown(article.content, options, article);
  if (options.downloadImages && options.downloadMode == 'downloadsApi') {
    // pre-download the images
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}

// function to turn the title into a valid file name
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  else title = title + '';
  // remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  // and non-breaking spaces (thanks @Licat)
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ')
    // collapse extra whitespace
    .replace(new RegExp(/\s+/, 'g'), ' ')
    // remove leading/trailing whitespace that can cause issues when using {pageTitle} in a download path
    .trim();

  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }

  return name;
}

async function preDownloadImages(imageList, markdown) {
  const options = await getOptions();

  await setupOffscreenDocument('offscreen/offscreen.html', {
    url: chrome.runtime.getURL('offscreen/offscreen.html'),
    reasons: ['BLOBS'],
    justification: 'Pre-download images and create Object URLs.',
  });

  const result = await new Promise((resolve) => {
    const listener = (message) => {
      if (message.type === 'pre-download-images-result') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({
      type: 'pre-download-images',
      target: 'offscreen',
      data: { imageList, markdown, options }
    });
  });

  return result;
}

// function to actually download the markdown file
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  // get the options
  const options = await getOptions();

  // download via the downloads API
  if (options.downloadMode == 'downloadsApi' && chrome.downloads) {

    // create a data URI with the markdown content
    const url = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);

    try {

      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
      // start the download
      const id = await chrome.downloads.download({
        url: url,
        filename: mdClipsFolder + title + ".md",
        saveAs: options.saveAs
      });

      // add a listener for the download completion
      chrome.downloads.onChanged.addListener(downloadListener(id, url));

      // download images (if enabled)
      if (options.downloadImages) {
        // get the relative path of the markdown file (if any) for image path
        let destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if (destPath && !destPath.endsWith('/')) destPath += '/';
        Object.entries(imageList).forEach(async ([src, filename]) => {
          // start the download of the image
          const imgId = await chrome.downloads.download({
            url: src,
            // set a destination path (relative to md file)
            filename: destPath ? destPath + filename : filename,
            saveAs: false
          })
          // add a listener (so we can release the blob url)
          chrome.downloads.onChanged.addListener(downloadListener(imgId, src));
        });
      }
    }
    catch (err) {
      console.error("Download failed", err);
    }
  }
  // download via content link
  else {
    try {
      await ensureScripts(tabId);
      const filename = mdClipsFolder + generateValidFileName(title, options.disallowedChars) + ".md";
      const code = `downloadMarkdown("${filename}","${base64EncodeUnicode(markdown)}");`
      await chrome.scripting.executeScript({
        target: { tabId: tabId }, func: (code) => {
          const script = document.createElement('script');
          script.textContent = code;
          (document.head || document.documentElement).appendChild(script);
          script.remove();
        }, args: [code]
      });
    }
    catch (error) {
      // This could happen if the extension is not allowed to run code in
      // the page, for example if the tab is a privileged page.
      console.error("Failed to execute script: " + error);
    };
  }
}

function downloadListener(id, url) {
  const self = (delta) => {
    if (delta.id === id && delta.state && delta.state.current == "complete") {
      // detatch this listener
      chrome.downloads.onChanged.removeListener(self);
      //release the url for the blob
      if (url.startsWith('blob:')) {
        chrome.runtime.sendMessage({
          type: 'revoke-blob-url',
          target: 'offscreen',
          data: url
        });
      }
    }
  }
  return self;
}

function base64EncodeUnicode(str) {
  // Firstly, escape the string using encodeURIComponent to get the UTF-8 encoding of the characters, 
  // Secondly, we convert the percent encodings into raw bytes, and add it to btoa() function.
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });

  return btoa(utf8Bytes);
}

//function that handles messages from the injected script into the site
async function notify(message, sender) {
  const options = await this.getOptions();
  // message for initial clipping of the dom
  if (message.type == "clip") {
    // 报告进度：初始化
    reportProgress("initializing");
    
    // 报告进度：开始获取DOM
    reportProgress("dom-fetching");
    
    // get the article info from the passed in dom
    // pass the original URL from the sender tab if available
    let originalUrl = sender?.tab?.url;
    
    // If originalUrl is undefined and the message is from the popup,
    // get the active tab URL
    if (!originalUrl && sender?.url?.includes('popup/popup.html')) {
      try {
        // Get the active tab URL
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs && tabs.length > 0) {
          originalUrl = tabs[0].url;
          console.log('Got active tab URL:', originalUrl);
        }
      } catch (error) {
        console.error('Error getting active tab URL:', error);
      }
    }
    
    // 报告进度：开始提取内容
    reportProgress("content-extraction");
    const article = await getArticleFromDom(message.dom, originalUrl);

    // if selection info was passed in (and we're to clip the selection)
    // replace the article content
    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }

    // convert the article to markdown
    // 注意：turndown函数内部已经报告了markdown-conversion阶段的进度
    const { markdown, imageList } = await convertArticleToMarkdown(article);

    // 报告进度：处理图片和链接
    reportProgress("image-link-processing");

    // format the title
    article.title = await formatTitle(article);

    // format the mdClipsFolder
    const mdClipsFolder = await formatMdClipsFolder(article);

    // 报告进度：完成
    reportProgress("finalizing");

    // display the data in the popup
    await chrome.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article, imageList: imageList, mdClipsFolder: mdClipsFolder });
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title, message.tab.id, message.imageList, message.mdClipsFolder);
  }
}

chrome.commands.onCommand.addListener(function (command) {
  const tab = chrome.tabs.getCurrent()
  if (command == "download_tab_as_markdown") {
    const info = { menuItemId: "download-markdown-all" };
    downloadMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown") {
    const info = { menuItemId: "copy-markdown-all" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_selection_as_markdown") {
    const info = { menuItemId: "copy-markdown-selection" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown_link") {
    copyTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selected_tab_as_markdown_link") {
    copySelectedTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selection_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsidian" };
    copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsall" };
    copyMarkdownFromContext(info, tab);
  }
});

// click handler for the context menus
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  // one of the copy to clipboard commands
  if (info.menuItemId.startsWith("copy-markdown")) {
    copyMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    downloadMarkdownForAllTabs(info);
  }
  // one of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    downloadMarkdownFromContext(info, tab);
  }
  // copy tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-all")) {
    copyTabAsMarkdownLinkAll(tab);
  }
  // copy only selected tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-selected")) {
    copySelectedTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    copyTabAsMarkdownLink(tab);
  }
  // a settings toggle command
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
    toggleSetting(info.menuItemId.split('-')[1]);
  }
});

// this function toggles the specified option
async function toggleSetting(setting, options = null) {
  // if there's no options object passed in, we need to go get one
  if (options == null) {
    // get the options from storage and toggle the setting
    await toggleSetting(setting, await getOptions());
  }
  else {
    // toggle the option and save back to storage
    options[setting] = !options[setting];
    await chrome.storage.sync.set(options);
    if (setting == "includeTemplate") {
      chrome.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
      try {
        chrome.contextMenus.update("tabtoggle-includeTemplate", {
          checked: options.includeTemplate
        });
      } catch { }
    }

    if (setting == "downloadImages") {
      chrome.contextMenus.update("toggle-downloadImages", {
        checked: options.downloadImages
      });
      try {
        chrome.contextMenus.update("tabtoggle-downloadImages", {
          checked: options.downloadImages
        });
      } catch { }
    }
  }
}

// this function ensures the content script is loaded (and loads it if it isn't)
async function ensureScripts(tabId) {
  const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: () => typeof getSelectionAndDom === 'function' });
  // The content script's last expression will be true if the function
  // has been defined. If this is not the case, then we need to run
  // pageScraper.js to define function getSelectionAndDom.
  if (!results || results[0].result !== true) {
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["/contentScript/contentScript.js"] });
  }
}

// get Readability article info from the dom passed in
async function getArticleFromDom(domString, originalUrl = null) {
  await setupOffscreenDocument('offscreen/offscreen.html', {
    url: chrome.runtime.getURL('offscreen/offscreen.html'),
    reasons: ['DOM_PARSER'],
    justification: 'Parse DOM from string',
  });

  const article = await new Promise((resolve) => {
    const listener = (message) => {
      if (message.type === 'parse-dom-result') {
        chrome.runtime.onMessage.removeListener(listener);
        // Do not close the offscreen document here
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({
      type: 'parse-dom',
      target: 'offscreen',
      data: { domString, originalUrl }
    });
  });

  return article;
}

// get Readability article info from the content of the tab id passed in
// `selection` is a bool indicating whether we should just get the selected text
async function getArticleFromContent(tabId, selection = false) {
  // run the content script function to get the details
  const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getSelectionAndDom });

  // make sure we actually got a valid result
  if (results && results[0] && results[0].result.dom) {
    // get the tab URL to pass as originalUrl
    const tab = await chrome.tabs.get(tabId);
    const originalUrl = tab?.url;
    console.log('DEBUG background getArticleFromContent: tab =', tab);
    console.log('DEBUG background getArticleFromContent: originalUrl =', originalUrl);

    const article = await getArticleFromDom(results[0].result.dom, originalUrl);

    // if we're to grab the selection, and we've selected something,
    // replace the article content with the selection
    if (selection && results[0].result.selection) {
      article.content = results[0].result.selection;
    }

    //return the article
    return article;
  }
  else return null;
}

// function to apply the title template
async function formatTitle(article) {
  let options = await getOptions();

  let title = textReplace(options.title, article, options.disallowedChars + '/');
  title = title.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

async function formatMdClipsFolder(article) {
  let options = await getOptions();

  let mdClipsFolder = '';
  if (options.mdClipsFolder && options.downloadMode == 'downloadsApi') {
    mdClipsFolder = textReplace(options.mdClipsFolder, article, options.disallowedChars);
    mdClipsFolder = mdClipsFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
  }

  return mdClipsFolder;
}

async function formatObsidianFolder(article) {
  let options = await getOptions();

  let obsidianFolder = '';
  if (options.obsidianFolder) {
    obsidianFolder = textReplace(options.obsidianFolder, article, options.disallowedChars);
    obsidianFolder = obsidianFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!obsidianFolder.endsWith('/')) obsidianFolder += '/';
  }

  return obsidianFolder;
}

// function to download markdown, triggered by context menu
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
  const title = await formatTitle(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article);
  // format the mdClipsFolder
  const mdClipsFolder = await formatMdClipsFolder(article);
  await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);

}

// function to copy a tab url as a markdown link
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [`[${title}](${article.baseURI})`] });
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy as markdown link: " + error);
  };
}

// function to copy all tabs as markdown links
async function copyTabAsMarkdownLinkAll(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await chrome.tabs.query({
      currentWindow: true
    });

    const links = [];
    for (const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`
      links.push(link)
    };

    const markdown = links.join(`\n`)
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });

  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy as markdown link: " + error);
  };
}

// function to copy only selected tabs as markdown links
async function copySelectedTabAsMarkdownLink(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      highlighted: true
    });

    const links = [];
    for (const tab of tabs) {
      await ensureScripts(tab.id);
      const article = await getArticleFromContent(tab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`
      links.push(link)
    };

    const markdown = links.join(`\n`)
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });

  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy as markdown link: " + error);
  };
}

// function to copy markdown to the clipboard, triggered by context menu
async function copyMarkdownFromContext(info, tab) {
  try {
    await ensureScripts(tab.id);

    const platformOS = navigator.platform;
    var folderSeparator = "";
    if (platformOS.indexOf("Win") === 0) {
      folderSeparator = "\\";
    } else {
      folderSeparator = "/";
    }

    if (info.menuItemId == "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const article = await getArticleFromContent(tab.id, false);
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });
    }
    else if (info.menuItemId == "copy-markdown-image") {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [`![](${info.srcUrl})`] });
    }
    else if (info.menuItemId == "copy-markdown-obsidian") {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-obsidian");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });
      await chrome.tabs.update({ url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + generateValidFileName(title) });
    }
    else if (info.menuItemId == "copy-markdown-obsall") {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-obsall");
      const title = await formatTitle(article);
      const options = await getOptions();
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });
      await chrome.tabs.update({ url: "obsidian://advanced-uri?vault=" + obsidianVault + "&clipboard=true&mode=new&filepath=" + obsidianFolder + generateValidFileName(title) });
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text) => navigator.clipboard.writeText(text), args: [markdown] });
    }
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy text: " + error);
  };
}

async function downloadMarkdownForAllTabs(info) {
  const tabs = await chrome.tabs.query({
    currentWindow: true
  });
  tabs.forEach(tab => {
    downloadMarkdownFromContext(info, tab);
  });
}

/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str, newStr) {

    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }

    // If a string
    return this.replace(new RegExp(str, 'g'), newStr);

  };
}