
// default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';

/**
 * 进度指示器阶段配置
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

const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
// set up event handlers
const cm = CodeMirror.fromTextArea(document.getElementById("md"), {
    theme: darkMode ? "xq-dark" : "xq-light",
    mode: "markdown",
    lineWrapping: true
});
cm.on("cursorActivity", (cm) => {
    const somethingSelected = cm.somethingSelected();
    var a = document.getElementById("downloadSelection");

    if (somethingSelected) {
        if (a.style.display != "block") a.style.display = "block";
    }
    else {
        if (a.style.display != "none") a.style.display = "none";
    }
});
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

const defaultOptions = {
    includeTemplate: false,
    clipSelection: true,
    downloadImages: false
}

const checkInitialSettings = options => {
    if (options.includeTemplate)
        document.querySelector("#includeTemplate").classList.add("checked");

    if (options.downloadImages)
        document.querySelector("#downloadImages").classList.add("checked");

    if (options.clipSelection)
        document.querySelector("#selected").classList.add("checked");
    else
        document.querySelector("#document").classList.add("checked");
}

const toggleClipSelection = options => {
    options.clipSelection = !options.clipSelection;
    document.querySelector("#selected").classList.toggle("checked");
    document.querySelector("#document").classList.toggle("checked");
    chrome.storage.sync.set(options).then(() => clipSite()).catch((error) => {
        console.error(error);
    });
}

const toggleIncludeTemplate = options => {
    options.includeTemplate = !options.includeTemplate;
    document.querySelector("#includeTemplate").classList.toggle("checked");
    chrome.storage.sync.set(options).then(() => {
        // 更新主菜单项
        chrome.contextMenus.update("toggle-includeTemplate", {
            checked: options.includeTemplate
        }).catch(err => {
            console.warn("无法更新 toggle-includeTemplate 菜单项:", err);
        });

        // 尝试更新标签页菜单项，但如果不存在则忽略错误
        try {
            chrome.contextMenus.update("tabtoggle-includeTemplate", {
                checked: options.includeTemplate
            }).catch(err => {
                // 忽略错误，因为在某些浏览器中这个菜单项可能不存在
                console.debug("tabtoggle-includeTemplate 菜单项不存在，这是正常的");
            });
        } catch (err) {
            // 忽略任何其他错误
            console.debug("处理 tabtoggle-includeTemplate 时出错，这是正常的");
        }

        return clipSite()
    }).catch((error) => {
        console.error(error);
    });
}

const toggleDownloadImages = options => {
    options.downloadImages = !options.downloadImages;
    document.querySelector("#downloadImages").classList.toggle("checked");
    chrome.storage.sync.set(options).then(() => {
        // 更新主菜单项
        chrome.contextMenus.update("toggle-downloadImages", {
            checked: options.downloadImages
        }).catch(err => {
            console.warn("无法更新 toggle-downloadImages 菜单项:", err);
        });

        // 尝试更新标签页菜单项，但如果不存在则忽略错误
        try {
            chrome.contextMenus.update("tabtoggle-downloadImages", {
                checked: options.downloadImages
            }).catch(err => {
                // 忽略错误，因为在某些浏览器中这个菜单项可能不存在
                console.debug("tabtoggle-downloadImages 菜单项不存在，这是正常的");
            });
        } catch (err) {
            // 忽略任何其他错误
            console.debug("处理 tabtoggle-downloadImages 时出错，这是正常的");
        }
        return clipSite(); // 添加这一行
    }).catch((error) => {
        console.error(error);
    });
}
const showOrHideClipOption = selection => {
    if (selection) {
        document.getElementById("clipOption").style.display = "flex";
    }
    else {
        document.getElementById("clipOption").style.display = "none";
    }
}

function getSelectionAndDom() {
    return {
        "dom": document.documentElement.outerHTML,
        "selection": window.getSelection().toString()
    };
}

const clipSite = () => {
    return chrome.tabs.query({
        currentWindow: true,
        active: true
    }).then((tabs) => {
        const id = tabs[0].id;
        return chrome.scripting.executeScript({
            target: { tabId: id },
            func: getSelectionAndDom
        })
            .then((result) => {
                if (result && result[0] && result[0].result) {
                    showOrHideClipOption(result[0].result.selection);
                    let message = {
                        type: "clip",
                        dom: result[0].result.dom,
                        selection: result[0].result.selection
                    }
                    return chrome.storage.sync.get(defaultOptions).then(options => {
                        chrome.runtime.sendMessage({
                            ...message,
                            ...options
                        });
                    }).catch(err => {
                        console.error(err);
                        showError(err)
                        return chrome.runtime.sendMessage({
                            ...message,
                            ...defaultOptions
                        });
                    }).catch(err => {
                        console.error(err);
                        showError(err)
                    });
                }
            }).catch(err => {
                console.error(err);
                showError(err)
            });
    });
}

// inject the necessary scripts
chrome.storage.sync.get(defaultOptions).then(options => {
    checkInitialSettings(options);

    document.getElementById("selected").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("document").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("includeTemplate").addEventListener("click", (e) => {
        e.preventDefault();
        toggleIncludeTemplate(options);
    });
    document.getElementById("downloadImages").addEventListener("click", (e) => {
        e.preventDefault();
        toggleDownloadImages(options);
    });

    return chrome.tabs.query({
        currentWindow: true,
        active: true
    });
}).then((tabs) => {
    var id = tabs[0].id;
    var url = tabs[0].url;
    chrome.scripting.executeScript({
        target: { tabId: id },
        files: ["/contentScript/contentScript.js"]
    })
        .then(() => {
            console.info("Successfully injected MarkDownload content script");
            return clipSite(); // remove id parameter
        }).catch((error) => {
            console.error(error);
            showError(error);
        });
});

// listen for notifications from the background page
chrome.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        return chrome.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tab: tabs[0],
                imageList: imageList,
                mdClipsFolder: mdClipsFolder
            };
            return chrome.runtime.sendMessage(message);
        });
    }
}

// event handler for download button
async function download(e) {
    e.preventDefault();
    await sendDownloadMessage(cm.getValue());
    window.close();
}

// event handler for download selected button
async function downloadSelection(e) {
    e.preventDefault();
    if (cm.somethingSelected()) {
        await sendDownloadMessage(cm.getSelection());
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {
        // set the values from the message
        //document.getElementById("md").value = message.markdown;
        cm.setValue(message.markdown);
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        mdClipsFolder = message.mdClipsFolder;

        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
        document.getElementById("progress-container").style.display = 'none';
        // focus the download button
        document.getElementById("download").focus();
        cm.refresh();
    }
    // 处理进度更新消息
    else if (message.type == "progress.update") {
        updateProgress(message.stage, message.percentage, message.message);
    }
    // 处理重新剪辑消息，从background script发送
    else if (message.type == "reclip") {
        clipSite();
    }
}

/**
 * 超时处理变量
 * progressTimeout: 用于存储超时计时器的ID
 * lastProgressUpdate: 记录最后一次进度更新的时间戳
 */
let progressTimeout;
let lastProgressUpdate = 0;

/**
 * 更新进度指示器
 * @param {string} stage - 当前处理阶段的标识符
 * @param {number} percentage - 可选，当前进度百分比，如果未提供则使用阶段的起始百分比
 * @param {string} message - 可选，显示给用户的自定义消息，如果未提供则使用阶段的默认消息
 */
function updateProgress(stage, percentage, message) {
    const progressContainer = document.getElementById("progress-container");
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const progressPercentage = document.querySelector('.progress-percentage');

    // 显示进度容器，隐藏spinner
    document.getElementById("spinner").style.display = 'none';
    progressContainer.style.display = 'flex';

    // 更新进度条
    if (progressFill && progressText && progressPercentage) {
        // 如果提供了具体百分比，则使用它；否则使用阶段的起始百分比
        const stageConfig = progressStages[stage];
        const actualPercentage = percentage !== undefined ?
            percentage : (stageConfig ? stageConfig.range[0] : 0);

        // 更新UI元素
        progressFill.style.width = `${actualPercentage}%`;
        progressText.textContent = message || (stageConfig ? stageConfig.message : "处理中...");
        progressPercentage.textContent = `${Math.round(actualPercentage)}%`;

        // 清除之前的超时计时器
        if (progressTimeout) {
            clearTimeout(progressTimeout);
        }

        // 记录最后更新时间
        lastProgressUpdate = Date.now();

        // 设置新的超时计时器，如果10秒内没有更新，显示提示信息
        progressTimeout = setTimeout(() => {
            if (Date.now() - lastProgressUpdate > 10000) {
                progressText.textContent = "处理时间较长，请耐心等待...";
            }
        }, 10000);
    }
}

function showError(err) {
    // show the hidden elements
    document.getElementById("container").style.display = 'flex';
    document.getElementById("spinner").style.display = 'none';
    document.getElementById("progress-container").style.display = 'none';
    cm.setValue(`Error clipping the page\n\n${err}`)
}
