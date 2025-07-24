# <img src="./img/icon.png" width="40px"/> M3U8 Downloader 浏览器插件

浏览器插件，用于捕获网页中的 M3U8 视频流；支持大多数以 Webkit 为内核的浏览器。<br/>
该插件是 [M3U8 下载器](https://github.com/cloudgyb/m3u8-downloader)的辅助插件，配合该插件可以自动捕获网页中的 m3u8 流媒体视频，
并自动在 [M3U8 下载器](https://github.com/cloudgyb/m3u8-downloader)中创建下载任务。
<br/>
<br/>
[[M3U8 Downloader GitHub 项目](https://github.com/cloudgyb/m3u8-downloader)]

## 功能特点

- 自动检测网页中的 M3U8 视频流。
- 支持捕获和保存视频 URL。
- 提供界面管理已捕获的视频列表。
- 支持搜索、分页和删除操作。
- 可通过按钮将视频 URL 发送到本地下载器。
- 支持大多数以 Webkit 为内核的浏览器

## 技术栈

- **前端**: HTML, CSS, JavaScript
- **浏览器 API**: Chrome Extensions API
- **存储**: `chrome.storage.local`
- **网络请求**: `chrome.webRequest`

## 安装步骤

1. 下载项目源码或克隆仓库：
   ```shell
    bash git clone https://github.com/cloudgyb/m3u8-downloader-crx.git
   ```
2. 打开 Chrome 浏览器，进入 `chrome://extensions` 页面。
3. 启用“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本项目的文件夹。

## 使用说明

1. 安装插件后，点击浏览器工具栏中的插件图标。
2. 在弹出的界面中可以查看当前页面是否检测到 M3U8 视频流。
3. 在弹出的界面中点击“查看视频URL列表”管理捕获的视频列表。
4. 在视频列表页面，你可以：
    - 搜索视频标题或 URL。
    - 分页浏览视频。
    - 删除单个或清空所有视频记录。
    - 将视频 URL 发送到本地下载器。

## 开发者信息

- **作者**: cloudgyb
- **邮箱**: gyb_cloud@163.com

## 许可证

本项目采用 Apache-2.0 license 许可证。详情请查看项目中的 LICENSE 文件。

