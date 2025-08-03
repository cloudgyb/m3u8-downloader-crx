// options.js

// 默认策略配置
const defaultStrategies = [
    {
        domain: "example.com",
        method: "substring",
        start: 0,
        end: -1,
        regex: ""
    }
];

// 当前策略配置
let strategies = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    document.getElementById('addStrategyBtn').addEventListener('click', addStrategyItem);
    document.getElementById('save-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-btn').addEventListener('click', loadSettings);
});

// 加载设置
function loadSettings() {
    chrome.storage.local.get(['interceptEnabled', 'notificationEnabled', 'domainVideoTitleExtractStrategies'], function (data) {
        document.getElementById('interceptEnabled').checked = data.interceptEnabled !== false; // 默认为true
        document.getElementById('notificationEnabled').checked = data.notificationEnabled !== false; // 默认为true

        strategies = data.domainVideoTitleExtractStrategies || JSON.parse(JSON.stringify(defaultStrategies));
        renderStrategies();
    });
}

// 保存设置
function saveSettings() {
    // 收集策略配置
    const strategyItems = document.querySelectorAll('.strategy-item');
    strategies = [];

    strategyItems.forEach(item => {
        const domain = item.querySelector('.domain-input').value.trim();
        if (!domain) return;

        const method = item.querySelector('.method-select').value;
        const strategy = {
            domain: domain,
            method: method
        };
        if (method === 'removePrefixAndSuffix') {
            strategy.prefix = item.querySelector('.removePrefix-input').value;
            strategy.suffix = item.querySelector('.removeSuffix-input').value;
        } else if (method === 'substring') {
            strategy.start = parseInt(item.querySelector('.start-input').value) || 0;
            strategy.end = parseInt(item.querySelector('.end-input').value) || -1;
        } else if (method === 'regex') {
            strategy.regex = item.querySelector('.regex-input').value;
        }

        strategies.push(strategy);
    });

    const settings = {
        interceptEnabled: document.getElementById('interceptEnabled').checked,
        notificationEnabled: document.getElementById('notificationEnabled').checked,
        domainVideoTitleExtractStrategies: strategies
    };

    chrome.storage.local.set(settings, async function () {
        console.log('策略配置:', settings.domainVideoTitleExtractStrategies)
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'DOMAIN_VIDEO_TITLE_EXTRACT_STRATEGIES',
                data: settings.domainVideoTitleExtractStrategies
            });
            console.log('Background 回复:', response);
        } catch (error) {
            console.error('通信失败:', error);
        }
        showNotification('设置已保存');
    });
}

// 显示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 40%;
        right: 50%;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// 渲染策略列表
function renderStrategies() {
    const container = document.getElementById('strategyList');
    container.innerHTML = '';

    strategies.forEach((strategy, index) => {
        const strategyElement = createStrategyElement(strategy, index);
        container.appendChild(strategyElement);
    });
}

// 创建策略项元素
function createStrategyElement(strategy) {
    const item = document.createElement('div');
    item.className = 'strategy-item';
    item.innerHTML = `
        <div class="strategy-header">
            <input type="text" class="domain-input" placeholder="example.com" value="${strategy.domain || ''}">
            <div class="strategy-controls">
                <button class="btn btn-danger remove-strategy-btn">删除</button>
            </div>
        </div>
        <div class="strategy-form">
            <div class="strategy-form-item">
                <label>提取方法</label>
                <select class="method-select">
                    <option value="removePrefixAndSuffix" ${strategy.method === 'removePrefixAndSuffix' ? 'selected' : ''}>前缀和后缀移除</option>
                    <option value="substring" ${strategy.method === 'substring' ? 'selected' : ''}>字符串截取</option>
                    <option value="regex" ${strategy.method === 'regex' ? 'selected' : ''}>正则表达式提取</option>
                </select>
            </div>
            <div class="strategy-form-item removePrefixAndSuffix-options ${strategy.method !== 'removePrefixAndSuffix' ? 'hidden' : ''}">
                <label>前缀</label>
                <input type="text" class="removePrefix-input" value="${strategy.prefix || ''}">
            </div>
            <div class="strategy-form-item removePrefixAndSuffix-options ${strategy.method !== 'removePrefixAndSuffix' ? 'hidden' : ''}">
                <label>后缀</label>
                <input type="text" class="removeSuffix-input" value="${strategy.suffix || ''}">
            </div>
            <div class="strategy-form-item substring-options ${strategy.method !== 'substring' ? 'hidden' : ''}">
                <label>开始位置</label>
                <input type="number" class="start-input" value="${strategy.start !== undefined ? strategy.start : 0}">
            </div>
            
            <div class="strategy-form-item substring-options ${strategy.method !== 'substring' ? 'hidden' : ''}">
                <label>结束位置 (-1表示到末尾)</label>
                <input type="number" class="end-input" value="${strategy.end !== undefined ? strategy.end : -1}">
            </div>
            
            <div class="strategy-form-item regex-options ${strategy.method !== 'regex' ? 'hidden' : ''}">
                <label>正则表达式</label>
                <input type="text" class="regex-input" placeholder="请输入正则表达式" value="${strategy.regex || ''}">
            </div>
        </div>
    `;

    // 添加事件监听器
    const removeBtn = item.querySelector('.remove-strategy-btn');
    removeBtn.addEventListener('click', function () {
        item.remove();
    });

    const methodSelect = item.querySelector('.method-select');
    methodSelect.addEventListener('change', function () {
        const method = this.value;
        const removePrefixAndSuffixOptions = item.querySelectorAll('.removePrefixAndSuffix-options');
        const substringOptions = item.querySelectorAll('.substring-options');
        const regexOptions = item.querySelectorAll('.regex-options');
        if (method === 'removePrefixAndSuffix') {
            substringOptions.forEach(option => option.classList.add('hidden'));
            removePrefixAndSuffixOptions.forEach(option => option.classList.remove('hidden'))
            regexOptions.forEach(option => option.classList.add('hidden'));
        } else if (method === 'substring') {
            substringOptions.forEach(option => option.classList.remove('hidden'));
            removePrefixAndSuffixOptions.forEach(option => option.classList.add('hidden'))
            regexOptions.forEach(option => option.classList.add('hidden'));
        } else {
            removePrefixAndSuffixOptions.forEach(option => option.classList.add('hidden'))
            substringOptions.forEach(option => option.classList.add('hidden'));
            regexOptions.forEach(option => option.classList.remove('hidden'));
        }
    });

    return item;
}

// 添加新的策略项
function addStrategyItem() {
    const newStrategy = {
        domain: '',
        method: 'substring',
        start: 0,
        end: -1,
        regex: ''
    };

    const container = document.getElementById('strategyList');
    const strategyElement = createStrategyElement(newStrategy, strategies.length);
    container.appendChild(strategyElement);

    // 聚焦到域名输入框
    const domainInput = strategyElement.querySelector('.domain-input');
    domainInput.focus();
}
