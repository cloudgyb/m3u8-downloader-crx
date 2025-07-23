console.log('background.js loading...')

const localStorage = chrome.storage.local

let interceptEnabled = false

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
    let videoInfo = {
        discoveryTime: Date.now(),
        url: details.url,
        title: tabTitle
    }
    // 保存视频信息
    localStorage.get("video_list").then(obj => {
        let video_list = obj['video_list'] ? obj['video_list'] : [];
        if(video_list.length > 200) {
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
    return {cancel: false};
}

console.log('background.js loaded!')

