document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('switchBtn');

    // 获取初始状态
    chrome.storage.local.get(['interceptEnabled'], (data) => {
        toggle.checked = data['interceptEnabled'] ?? false;
    });

    toggle.addEventListener('change', async function () {
        let status = this.checked;
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'POPUP_TO_BACKGROUND_SWITCH',
                data: status
            });
            console.log('Background 回复:', response);
        } catch (error) {
            console.error('通信失败:', error);
        }
        console.log('开关状态:', this.checked);
    });

    chrome.storage.local.get('videoCount', function (result) {
        document.getElementById("videoCount").innerHTML = (result.videoCount ?? 0)
    })

    // 打开后台页
    document.getElementById("viewListBtn").addEventListener("click", function () {
        chrome.tabs.create({url: chrome.runtime.getURL('video_list.html')}).then(tab => {
            console.log(tab)
        });
    });

    // 打开 options 配置页
    document.getElementById("viewOptionsBtn").addEventListener("click", function () {
        chrome.tabs.create({url: chrome.runtime.getURL('options.html')}).then(tab => {
            console.log(tab)
        });
    });

});