console.log('background.js loading...')

const localStorage = chrome.storage.local

// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
chrome.webRequest.onBeforeRequest.addListener(async details => {
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
        video_list.push(videoInfo);
        localStorage.set({video_list: video_list}).then(r => console.log(r))
    })

    fetch("http://127.0.0.1:65530/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({url: details.url})
    }).then(response => response.json())
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

}, {urls: ["<all_urls>"]});

console.log('background.js loaded!')

