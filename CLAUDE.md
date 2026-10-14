# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension that captures M3U8 video-stream URLs from web pages and forwards them to a companion desktop app, [M3U8 Downloader](https://github.com/cloudgyb/m3u8-downloader). The extension is a helper for the desktop downloader, not a standalone downloader.

## Development workflow

There is **no build system, bundler, linter, or test runner** — no `package.json`, no dependencies. The code is plain ES6 JavaScript shipped directly as an unpacked extension.

- Load/unpacked development: open `chrome://extensions`, enable "Developer mode", click "Load unpacked", and select this repo's root directory. After editing a file, click the reload icon on the extension card (the MV3 service worker must also be restarted after editing `js/background.js`).
- Version bump: edit `"version"` in `manifest.json` (currently `1.0.1`); the repo follows `feat`/`build` conventional-commit prefixes.

## Architecture

Four isolated scripts, each bound to its own HTML page, communicating through `chrome.storage.local` and `chrome.runtime` messages. There is no shared JS module between pages.

- `js/background.js` — MV3 service worker (`"type": "module"`). The core: it registers a `chrome.webRequest.onBeforeRequest` listener (toggled by the `interceptEnabled` flag), filters requests whose URL path ends in `.m3u8`, derives a video title from the tab title, persists the video to storage, POSTs it to the local downloader, and optionally fires a `chrome.notifications` notification. It also receives runtime messages from popup/options.
- `js/popup.js` + `popup.html` — toolbar popup: intercept on/off switch, video count, and buttons that open the list and options pages in new tabs.
- `js/video_list.js` + `video_list.html` — captured-video manager opened as an extension page: search, pagination (10/page), per-row delete, clear-all, and "send to downloader".
- `js/options.js` + `options.html` — settings page (`options_ui`, opens in a tab): enable/disable, notification toggle, and per-domain video-title extraction strategies.

## Persistent state (`chrome.storage.local`)

All state lives under these keys; shapes are defined implicitly in `js/background.js` and read in the UI scripts:

- `interceptEnabled` — boolean; gates the webRequest listener.
- `notificationEnabled` — boolean.
- `videoCount` — running integer count of detected streams (never reset).
- `video_list` — array of `{ discoveryTime, url, title }`, capped at 200 entries (oldest shifted off).
- `domainVideoTitleExtractStrategies` — array of strategy objects (see below).

## Messaging protocol

`chrome.runtime.sendMessage` messages handled by `background.js`:

- `POPUP_TO_BACKGROUND_SWITCH` — popup sets `interceptEnabled`; `data` is the boolean.
- `DOMAIN_VIDEO_TITLE_EXTRACT_STRATEGIES` — options pushes the full strategy array after save.

The listener returns `true` (async) only for the switch message.

## Local downloader integration

Captured videos are POSTed as JSON to `http://127.0.0.1:65530/` (the desktop M3U8 Downloader's local HTTP server). Failure is non-fatal and just logged. The video-list page also offers an `m3u8downloader://` custom-protocol link to launch the app when the fetch fails. Any change to the request body or endpoint must stay consistent between `js/background.js` (auto-capture) and `js/video_list.js` (manual re-send) — both send the same `videoInfo` shape.

## Video-title extraction strategies

`background.js` looks up a strategy by the video URL's hostname first, then the tab URL's hostname. Each strategy has a `domain` and one of three `method` values:

- `removePrefixAndSuffix` — strips `prefix`/`suffix` string literals.
- `substring` — `String.substring(start, end)`; `end === -1` means to end of string.
- `regex` — first capture group of a `new RegExp(strategy.regex)` match is used as the title.

The options UI serializes these objects; `background.js` keeps a hot in-memory `Map` of them, refreshed via the `DOMAIN_VIDEO_TITLE_EXTRACT_STRATEGIES` message.

## Notes

- `default_locale` is `zh_CN`; `_locales/` currently holds stub/demo messages and is not actually referenced by any UI text (strings are hardcoded Chinese in the HTML/JS).
- `background.js` uses `URL.canParse`/`URL.parse` (Chrome 126+).
