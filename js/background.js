console.log('background.js loading...')

const localStorage = chrome.storage.local

let interceptEnabled = false
let domainVideoTitleExtractStrategiesMap = new Map();
const urlFilter = {
    urls: ["http://*/*", "https://*/*"],
    types: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
}

function updateInterception() {
    if (interceptEnabled) {
        chrome.webRequest.onBeforeRequest.addListener(webRequestInterceptHandler, urlFilter);
        chrome.webRequest.onHeadersReceived.addListener(webResponseHeadersHandler, urlFilter, ["responseHeaders"]);
        //chrome.action.setIcon({ path: "icons/on32.png" });
    } else {
        chrome.webRequest.onBeforeRequest.removeListener(webRequestInterceptHandler);
        chrome.webRequest.onHeadersReceived.removeListener(webResponseHeadersHandler);
        //chrome.action.setIcon({ path: "icons/off32.png" });
    }
}

localStorage.get(['interceptEnabled'], (data) => {
    interceptEnabled = data.interceptEnabled ?? false;
    updateInterception();
});

localStorage.get(['domainVideoTitleExtractStrategies'], (data) => {
    let strategies = data['domainVideoTitleExtractStrategies'];
    updateDomainVideoTitleExtractStrategies(strategies ?? []);
});

function updateDomainVideoTitleExtractStrategies(data) {
    console.log("background.js 视频标题提取策略更新：", data)
    domainVideoTitleExtractStrategiesMap.clear();
    if (data instanceof Array) {
        data.forEach(strategy => {
            domainVideoTitleExtractStrategiesMap.set(strategy.domain, strategy);
        });
    } else {
        console.error('视频标题提取策略数据格式错误！');
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'POPUP_TO_BACKGROUND_SWITCH') {
        console.log('收到 popup 消息，自动捕获开关:', request.data);
        interceptEnabled = request.data;
        localStorage.set({interceptEnabled: request.data}).then(r => console.log(r));
        updateInterception();
        // 异步操作示例
        setTimeout(() => {
            sendResponse({status: 'success', received: request.data});
        }, 500);
        // 保持连接开放（重要！）
        return true;
    } else if (request.type === 'DOMAIN_VIDEO_TITLE_EXTRACT_STRATEGIES') {
        console.log('收到 options 消息，视频标题提取策略:', request.data);
        updateDomainVideoTitleExtractStrategies(request.data);
        console.log("background.js", domainVideoTitleExtractStrategiesMap)
    }
});

// 用于去重：同一视频请求可能同时命中「路径以 .m3u8 结尾」和「响应头 content-type」两种检测方式
const processedVideoUrls = new Map();
const PROCESSED_VIDEO_URL_TTL = 10 * 1000;

// 标记 URL 已处理，返回 false 表示近期已处理过（用于去重）
function markUrlProcessed(url) {
    const now = Date.now();
    for (const [u, t] of processedVideoUrls) {
        if (now - t > PROCESSED_VIDEO_URL_TTL) {
            processedVideoUrls.delete(u);
        }
    }
    if (processedVideoUrls.has(url)) {
        return false;
    }
    processedVideoUrls.set(url, now);
    return true;
}

// 判断 URL 路径是否以 .m3u8 结尾
function isM3u8Url(url) {
    return URL.canParse(url) && URL.parse(url).pathname.endsWith(".m3u8");
}

// 判断响应头 content-type 是否为 HLS 流媒体类型
function isMpegUrlContentType(details) {
    return (details.responseHeaders || []).some(header =>
        header.name.toLowerCase() === 'content-type' &&
        header.value.toLowerCase().includes('application/vnd.apple.mpegurl')
    );
}

// 路径检测：URL 以 .m3u8 结尾
let webRequestInterceptHandler = (details) => {
    if (!isM3u8Url(details.url)) {
        return;
    }
    if (!markUrlProcessed(details.url)) {
        return;
    }
    processVideo(details);
    return {cancel: false};
}

// 响应头检测：content-type 为 application/vnd.apple.mpegurl
let webResponseHeadersHandler = (details) => {
    if (!isMpegUrlContentType(details)) {
        return;
    }
    if (!markUrlProcessed(details.url)) {
        return;
    }
    processVideo(details);
}

// 处理检测到的视频：计数、提取标题、保存、发送到下载器、通知
let processVideo = async (details) => {
    console.log(details)
    // 无关联标签页的请求（如后台发起的请求）拿不到标题，跳过
    if (details.tabId < 0) {
        return;
    }
    // 累计发现视频计数
    localStorage.get("videoCount").then(obj => {
        let count = obj['videoCount'] ? obj['videoCount'] : 0;
        console.log("videoCount:", count)
        localStorage.set({videoCount: count + 1}).then(r => console.log(r))
    })
    // 获取当前标签页标题
    const tab = await chrome.tabs.get(details.tabId);
    let tabTitle = tab.title;
    let hostname = URL.parse(details.url).hostname;
    let tabHostname = URL.parse(tab.url).hostname;
    console.log("background.js tab url:", tab.url);
    console.log("background.js video url hostname:", hostname);
    console.log("background.js tab url hostname:", tabHostname);
    if (domainVideoTitleExtractStrategiesMap.has(hostname) || domainVideoTitleExtractStrategiesMap.has(tabHostname)) {
        let strategy = domainVideoTitleExtractStrategiesMap.get(hostname);
        if (!strategy) {
            strategy = domainVideoTitleExtractStrategiesMap.get(tabHostname);
        }
        if (strategy.method === 'removePrefixAndSuffix') {
            tabTitle = removePrefixSuffix(tabTitle, strategy.prefix, strategy.suffix);
        } else if (strategy.method === 'regex') {
            let regx = new RegExp(strategy.regex);
            let regExpMatchArray = tabTitle.match(regx);
            tabTitle = regExpMatchArray && regExpMatchArray.length > 1 ? regExpMatchArray[1] : tabTitle;
        } else if (strategy.method === 'substring') {
            if (strategy.start < 0 || strategy.start >= tabTitle.length || strategy.start >= strategy.end) {
                strategy.start = 0;
            }
            tabTitle = strategy.end === -1 || strategy.end > tabTitle.length ? tabTitle.substring(strategy.start) :
                tabTitle.substring(strategy.start, strategy.end);
        }
    }
    console.log("视频标题:", tabTitle)
    let videoInfo = {
        discoveryTime: Date.now(),
        url: details.url,
        title: tabTitle
    }
    // 保存视频信息
    localStorage.get("video_list").then(obj => {
        let video_list = obj['video_list'] ? obj['video_list'] : [];
        if (video_list.length > 200) {
            video_list.shift();
        }
        video_list.push(videoInfo);
        localStorage.set({video_list: video_list}).then(r => console.log(r))
    })

    fetch("http://127.0.0.1:65530/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoInfo)
    }).then(response => {
        return response.json();
    })
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.info('请求出错:', error, '\n M3U8 Downloader 可能未启动！');
        });

    localStorage.get("notificationEnabled").then(obj => {
        let notificationEnabled = obj['notificationEnabled'] ? true : obj['notificationEnabled'];
        console.log("notificationEnabled:", notificationEnabled);
        if (notificationEnabled) {
            let options = {
                iconUrl: '../img/icon.png',
                message: '视频地址：' + details.url,
                title: '检测到流媒体视频',
                type: chrome.notifications.TemplateType.BASIC,
            }
            //创建系统通知
            chrome.notifications.create(null, options)
                .then(r => {
                    console.debug(r);
                });
        }
    })
}
const removePrefixSuffix = (str, prefix, suffix) => {
    str = str.startsWith(prefix) ? str.slice(prefix.length) : str;
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

console.log('background.js loaded!')

