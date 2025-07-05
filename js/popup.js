// 打开后台页
document.getElementById("viewListBtn").addEventListener("click", function () {
    chrome.tabs.create({url: chrome.runtime.getURL('video_list.html')}).then(tab => {
        console.log(tab)
    });
});

chrome.storage.local.get('videoCount', function (result) {
    document.getElementById("videoCount").innerHTML = (result.videoCount)
})