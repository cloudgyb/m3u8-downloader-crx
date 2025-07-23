// 全局变量
let currentPage = 1;
const rowsPerPage = 10;
let allData = [];
let filteredData = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    loadDataFromStorage();
    document.getElementById('clearBtn').addEventListener('click', function () {
        chrome.storage.local.remove(['video_list'], function () {
            showMessage('清除成功', 'success');
            filteredData = [];
            updateTotalCount();
            renderTable();
            renderPagination();
        })
    })
});

// 从chrome.storage.local加载数据
function loadDataFromStorage() {
    chrome.storage.local.get(['video_list'], function (result) {
        if (result.video_list && Array.isArray(result.video_list)) {
            allData = result.video_list.sort((a, b) => new Date(b.discoveryTime) - new Date(a.discoveryTime));
            filteredData = [...allData];
            updateTotalCount();
            renderTable();
            renderPagination();
        } else {
            showMessage('没有找到视频列表数据', 'error');
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align: center;">没有数据</td></tr>';
        }
    });
}


// 渲染表格数据
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">没有数据</td></tr>';
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    pageData.forEach((item, index) => {
        const row = document.createElement('tr');

        // 发现时间
        const timeCell = document.createElement('td');
        const date = new Date(item.discoveryTime || Date.now());
        timeCell.textContent = date.toLocaleString();
        row.appendChild(timeCell);

        // 标题
        const titleCell = document.createElement('td');
        titleCell.textContent = item.title || '无标题';
        titleCell.setAttribute('title', titleCell.textContent);
        titleCell.style.whiteSpace = 'nowrap';
        titleCell.style.overflow = 'hidden';
        titleCell.style.textOverflow = 'ellipsis';
        titleCell.style.maxWidth = '300px';
        row.appendChild(titleCell);

        // URL
        const urlCell = document.createElement('td');
        const urlText = document.createElement('div');
        urlText.textContent = item.url || '';
        urlText.style.whiteSpace = 'nowrap';
        urlText.style.overflow = 'hidden';
        urlText.style.textOverflow = 'ellipsis';
        urlText.style.maxWidth = '300px';
        urlCell.appendChild(urlText);
        row.appendChild(urlCell);

        // 操作按钮
        const actionCell = document.createElement('td');

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '发送到下载器';
        downloadBtn.className = 'action-btn download-btn';
        downloadBtn.onclick = function () {
            sendToDownloader(item);
        };
        actionCell.appendChild(downloadBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.onclick = function () {
            deleteItem(item.url);
        };
        actionCell.appendChild(deleteBtn);

        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}

// 发送到下载器
function sendToDownloader(item) {
    fetch('http://127.0.0.1:65530/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item)
    })
        .then(response => {
            if (response.ok) {
                showMessage('成功发送到下载器', 'success');
            } else {
                throw new Error('发送失败');
            }
        })
        .catch(error => {
            console.info('发送到下载器失败:', error);
            showMessage('发送到下载器失败: ' + error.message, 'error');
        });
}

// 删除项目
function deleteItem(url) {
    if (confirm('确定要删除这条记录吗？')) {
        const newData = allData.filter(item => item.url !== url);
        chrome.storage.local.set({video_list: newData}, function () {
            allData = newData;
            filteredData = [...allData];
            updateTotalCount();

            // 如果当前页没有数据了，且不是第一页，则返回上一页
            const start = (currentPage - 1) * rowsPerPage;
            if (start >= filteredData.length && currentPage > 1) {
                currentPage--;
            }

            renderTable();
            renderPagination();
            showMessage('删除成功', 'success');
        });
    }
}

// 渲染分页按钮
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (totalPages <= 1) return;

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = function () {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    };
    paginationDiv.appendChild(prevBtn);

    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = function () {
            currentPage = 1;
            renderTable();
            renderPagination();
        };
        paginationDiv.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.className = 'active';
        }
        pageBtn.onclick = function () {
            currentPage = i;
            renderTable();
            renderPagination();
        };
        paginationDiv.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }

        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = function () {
            currentPage = totalPages;
            renderTable();
            renderPagination();
        };
        paginationDiv.appendChild(lastBtn);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = function () {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    };
    paginationDiv.appendChild(nextBtn);
}

document.getElementById('searchInput').addEventListener('keyup', () => {
    searchTable()
})

// 搜索表格
function searchTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    if (!searchTerm) {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(item => {
            return (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                (item.url && item.url.toLowerCase().includes(searchTerm));
        });
    }

    currentPage = 1;
    updateTotalCount();
    renderTable();
    renderPagination();
}

// 更新总记录数显示
function updateTotalCount() {
    document.getElementById('totalCount').textContent = filteredData.length + "";
}

// 显示状态消息
function showMessage(message, type) {
    const msgElement = document.getElementById('statusMessage');
    msgElement.textContent = message;
    msgElement.className = 'status-message ' + type;

    setTimeout(() => {
        msgElement.className = 'status-message';
        msgElement.textContent = '';
    }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}