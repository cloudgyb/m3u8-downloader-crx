console.log('background.js loading...')

const localStorage = chrome.storage.local

let interceptEnabled = false
let domainVideoTitleExtractStrategiesMap = new Map();

function updateInterception() {
    if (interceptEnabled) {
        chrome.webRequest.onBeforeRequest.addListener(webRequestInterceptHandler, {urls: ["<all_urls>"]});
        //chrome.action.setIcon({ path: "icons/on32.png" });
    } else {
        chrome.webRequest.onBeforeRequest.removeListener(webRequestInterceptHandler);
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

let webRequestInterceptHandler = async (details) => {
    // 判断 URL path 是否以 .m3u8 结尾
    if (!URL.canParse(details.url) || !URL.parse(details.url).pathname.endsWith(".m3u8")) {
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
    let tabTitle = tab.title || tabTitle;
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
    return {cancel: false};
}
const removePrefixSuffix = (str, prefix, suffix) => {
    str = str.startsWith(prefix) ? str.slice(prefix.length) : str;
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

console.log('background.js loaded!')

