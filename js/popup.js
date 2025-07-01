// 打开后台页
$('#viewListBtn').click(e => {
    window.open(chrome.extension.getURL('background.html'));
});


// popup主动发消息给content-script
$('#send_message_to_content_script').click(() => {
    sendMessageToContentScript('你好，我是popup！', (response) => {
        if (response) alert('收到来自content-script的回复：' + response);
    });
});
var videoCount = 0;
document.addEventListener('DOMContentLoaded', (event) => {
// 监听来自content-script的消息
        chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
            console.log('收到来自content-script的消息：');
            console.log(msg, sender, sendResponse);
            videoCount++;
            ("#videoCount").html(videoCount);
        });
    }
)

chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        videoCount++;
        ("#videoCount").html(videoCount);
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.greeting == "hello")
            sendResponse({farewell: "goodbye"});
    });

// popup与content-script建立长连接
$('#connect_to_content_script').click(() => {
    getCurrentTabId((tabId) => {
        var port = chrome.tabs.connect(tabId, {name: 'test-connect'});
        port.postMessage({question: '你是谁啊？'});
        port.onMessage.addListener(function (msg) {
            alert('收到长连接消息：' + msg.answer);
            if (msg.answer && msg.answer.startsWith('我是')) {
                port.postMessage({question: '哦，原来是你啊！'});
            }
        });
    });
});

// 获取当前选项卡ID
function getCurrentTabId(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}

// 向content-script主动发送消息
function sendMessageToContentScript(message, callback) {
    getCurrentTabId((tabId) => {
        chrome.tabs.sendMessage(tabId, message, function (response) {
            if (callback) callback(response);
        });
    });
}

// 显示badge
$('#show_badge').click(() => {
    chrome.browserAction.setBadgeText({text: 'New'});
    chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
});

// 隐藏badge
$('#hide_badge').click(() => {
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 0]});
});