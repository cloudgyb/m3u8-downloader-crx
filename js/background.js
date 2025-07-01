// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('收到来自content-script的消息：');
    console.log(request, sender, sendResponse);
    sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
});

// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
chrome.webRequest.onBeforeRequest.addListener(details => {
    // 判断 URL 是否以 .m3u8 结尾
    if (details.url.endsWith(".m3u8")) {
        $.post("http://127.0.0.1:65530/", {url: details.url}, function (result) {
            console.log(result);
        });
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: 'img/icon.png',
            title: '检测到流媒体视频',
            message: '视频地址：' + details.url,
        });
    }
}, {urls: ["<all_urls>"]}, ["blocking"]);
