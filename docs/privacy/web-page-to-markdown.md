---
layout: default
title: "Web Page to Markdown — Privacy Policy"
---

# Privacy Policy — Web Page to Markdown

**Effective date: 18 September 2026**

## Summary

Web Page to Markdown runs entirely in your browser. It has no server, makes no network requests,
and collects no data of any kind. Nothing you view, capture, or configure is sent anywhere.

## What this extension does

Web Page to Markdown converts the web page in your active tab into a Markdown document, which you
can save as a `.md` file, copy to the clipboard, or review in a preview tab before saving. That is
its only purpose.

## Data we collect

**None.**

The developer operates no server, no database, no analytics, and no logging endpoint. The
extension contains no telemetry, no crash reporting, no advertising or tracking SDK, and no
third-party code. It declares no host permissions and makes no network requests, so there is no
channel through which data could be sent even in principle.

## How your data is handled

**Page content.** When you ask for a capture, the extension reads the content of that one tab,
converts it to Markdown, and hands the result to whichever output you chose — a file, the
clipboard, or the preview tab. This happens in your browser. The page content is not copied to any
server, not retained by the extension after the capture completes, and not transmitted anywhere.

The conversion works on a copy of the page's node tree rather than the page itself, so the live
page is not modified: after a capture it has the same DOM node count and the same HTML length as
before.

**Your settings.** Extraction rules, Markdown syntax style, link and image handling, front-matter
fields, the filename template, the download subfolder, and your interface language are stored using
`chrome.storage.local`. This is storage on your own machine, inside your Chrome profile. The
extension does not use `chrome.storage.sync`, so your settings are not uploaded to your Google
account or synchronised to your other devices. You can erase them at any time with the "Reset to
defaults" button on the options page, or by removing the extension.

**The preview document.** When you choose "Preview", the converted Markdown is placed in
`chrome.storage.session` so the preview tab can read it — a long document cannot be passed through
a URL. `chrome.storage.session` is in-memory only and is cleared when the browser closes.

**The clipboard.** When you choose "Copy", the converted Markdown is written to your system
clipboard. The extension only writes; it never reads the clipboard, and does not request the
permission that would allow it to.

**The saved file.** The `.md` file is created in memory and handed to Chrome's download manager.
The developer never receives it and has no way to.

## Data we do NOT collect

To be explicit, this extension does **not** collect, store, transmit, or have access to:

- Personally identifiable information — name, address, email address, age, identity documents
- Health information
- Financial or payment information
- Authentication information — passwords, credentials, security questions, PINs
- Personal communications — email, messages, chats
- Location — IP-based, GPS, or otherwise
- Web history, browsing activity, referrers, clickstream, or the list of sites you visit
- User activity — clicks, keystrokes, mouse position, scroll depth, session recordings
- Website content — the text, images, or links of the pages you capture are processed in your
  browser and never transmitted or retained by the developer
- Clipboard contents — the extension writes to the clipboard and never reads from it
- Device identifiers, installation identifiers, cookies, or advertising identifiers

## Sharing, selling, and transfer

There is nothing to share, sell, or transfer. No user data is sold, rented, traded, or disclosed to
any third party, for any purpose, including advertising, analytics, model training, or
creditworthiness assessment. No third-party service providers are involved in the operation of this
extension.

## Limited Use disclosure

Use of information received from Google APIs or from the user adheres to the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/),
including the Limited Use requirements. Specifically: this extension collects and transmits no user
data; it therefore does not use, transfer, or sell user data for serving advertising, for
personalised advertising, for credit assessment or lending purposes, or for any purpose unrelated
to its single purpose; and no humans read user data, because none is collected or transmitted.

## Children's privacy

This extension collects no data from anyone, including children under 13. It is a general-purpose
utility and is not directed at children.

## Your rights and choices

Because no data is collected, there is nothing to request access to, correct, export, or delete on
our side. All data the extension uses lives on your own machine and is under your control:

- **Settings** — "Reset to defaults" on the options page, or uninstall the extension.
- **Preview content** — cleared automatically when the browser closes.
- **Saved `.md` files** — ordinary files in your downloads folder; delete them as you would any file.

## Changes to this policy

If this policy changes, the effective date above will be updated and the revised policy published
at the same URL. Material changes will also be noted in the extension's Chrome Web Store listing.

## Contact

Questions about this policy or about the extension's privacy behaviour: **inform2cary@gmail.com**

---

# 隱私權政策 — 網頁轉 Markdown

**生效日期：2026 年 9 月 18 日**

## 摘要

「網頁轉 Markdown」完全在你的瀏覽器裡執行。沒有伺服器、不發出任何網路請求、不蒐集任何資料。你瀏覽、擷取或設定的任何內容都不會被送到任何地方。

## 這個擴充功能做什麼

把你目前分頁的網頁轉換成 Markdown 文件，讓你存成 `.md` 檔、複製到剪貼簿，或在預覽分頁中確認後再儲存。這是它唯一的用途。

## 我們蒐集哪些資料

**沒有。**

開發者沒有架設任何伺服器、資料庫、分析服務或記錄端點。擴充功能內不含遙測、當機回報、廣告或追蹤 SDK，也不含任何第三方程式碼。它未宣告任何主機權限、不發出任何網路請求，因此在原理上就不存在可以送出資料的管道。

## 資料如何被處理

**網頁內容。** 當你要求擷取時，擴充功能會讀取那一個分頁的內容、轉換成 Markdown，並交給你選擇的輸出方式 —— 檔案、剪貼簿或預覽分頁。整個過程都在你的瀏覽器內完成。網頁內容不會被複製到任何伺服器、擷取完成後不會被擴充功能保留，也不會傳送到任何地方。

轉換是在頁面節點樹的複本上進行，而不是頁面本身，因此實際頁面不會被修改：擷取完成後，DOM 節點數與 HTML 長度都與先前相同。

**你的設定。** 擷取規則、Markdown 語法風格、連結與圖片處理方式、front matter 欄位、檔名樣板、下載子資料夾與介面語言，透過 `chrome.storage.local` 儲存，也就是存在你自己機器上的 Chrome 設定檔內。本擴充功能不使用 `chrome.storage.sync`，因此設定不會上傳到你的 Google 帳號，也不會同步到其他裝置。你隨時可以用設定頁的「恢復預設值」清除，或直接移除擴充功能。

**預覽內容。** 當你選擇「預覽」時，轉換好的 Markdown 會放進 `chrome.storage.session` 供預覽分頁讀取 —— 長文件無法透過網址傳遞。`chrome.storage.session` 只存在記憶體中，瀏覽器關閉即清除。

**剪貼簿。** 當你選擇「複製」時，轉換好的 Markdown 會寫入你的系統剪貼簿。本擴充功能只寫入、從不讀取剪貼簿，也未要求可以讀取剪貼簿的權限。

**存下的檔案。** `.md` 檔在記憶體中建立後交給 Chrome 的下載管理員。開發者不會收到，也沒有任何途徑可以收到。

## 我們「不會」蒐集的資料

明確列出，本擴充功能不蒐集、不儲存、不傳送，也無從取得以下資料：

- 個人識別資訊 —— 姓名、地址、電子郵件、年齡、身分證件
- 健康資訊
- 財務或付款資訊
- 驗證資訊 —— 密碼、憑證、安全問題、PIN 碼
- 個人通訊內容 —— 郵件、訊息、聊天記錄
- 位置資訊 —— IP 推定位置、GPS 或其他方式
- 瀏覽記錄、瀏覽行為、來源網址、點擊流或你造訪過的網站清單
- 使用者操作 —— 點擊、按鍵、滑鼠位置、捲動深度、操作錄影
- 網站內容 —— 你擷取的網頁上的文字、圖片與連結都在你的瀏覽器內處理，開發者不會傳送也不會保留
- 剪貼簿內容 —— 本擴充功能只寫入剪貼簿，從不讀取
- 裝置識別碼、安裝識別碼、Cookie 或廣告識別碼

## 分享、販售與轉讓

沒有任何資料可以分享、販售或轉讓。本擴充功能不會為任何目的（包含廣告、分析、模型訓練或信用評估）將使用者資料販售、出租、交換或揭露給任何第三方。運作過程中也不涉及任何第三方服務供應商。

## 有限使用（Limited Use）聲明

本擴充功能對於自 Google API 或使用者取得之資訊的使用，遵循 [Chrome 線上應用程式商店使用者資料政策](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)，包含其中的有限使用（Limited Use）要求。具體而言：本擴充功能不蒐集也不傳送任何使用者資料；因此不會將使用者資料用於或轉讓作為投放廣告、個人化廣告、信用評估或放貸用途，亦不用於與其單一用途無關的任何目的；也不會有任何人閱讀使用者資料，因為根本沒有蒐集或傳送任何資料。

## 兒童隱私

本擴充功能不向任何人蒐集資料，包含未滿 13 歲的兒童。它是一般用途的工具，並非以兒童為對象。

## 你的權利與選擇

由於沒有蒐集任何資料，我們這邊沒有任何資料可供你查閱、更正、匯出或刪除。擴充功能使用的所有資料都在你自己的機器上，由你完全掌控：

- **設定** —— 設定頁的「恢復預設值」，或移除擴充功能。
- **預覽內容** —— 瀏覽器關閉時自動清除。
- **存下的 `.md` 檔** —— 就是下載資料夾裡的一般檔案，可以像其他檔案一樣刪除。

## 政策變更

本政策若有變更，會更新上方的生效日期並在同一網址發布修訂後的版本。重大變更也會在 Chrome 線上應用程式商店的說明中註明。

## 聯絡方式

對本政策或本擴充功能的隱私行為有疑問：**inform2cary@gmail.com**
