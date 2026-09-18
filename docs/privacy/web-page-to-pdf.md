---
layout: default
title: "Web Page to PDF — Privacy Policy"
---

# Privacy Policy — Web Page to PDF

**Effective date: 18 September 2026**

## Summary

Web Page to PDF runs entirely on your computer. It has no server, makes no network requests, and
collects no data of any kind. Nothing you view, export, or configure is sent anywhere.

## What this extension does

Web Page to PDF converts the web page in your active tab into a PDF file and saves it to your
computer. That is its only purpose.

## Data we collect

**None.**

The developer operates no server, no database, no analytics, and no logging endpoint. The
extension contains no telemetry, no crash reporting, no advertising or tracking SDK, and no
third-party code. It declares no host permissions and makes no network requests, so there is no
channel through which data could be sent even in principle.

## How your data is handled

**Page content.** When you ask for an export, the extension temporarily prepares the page in that
tab (for example hiding navigation, forcing a light background, or expanding collapsed sections,
according to your settings) and asks Chrome's built-in print engine to render it. The resulting
PDF is written directly to your downloads folder. The page content is processed in your browser
and in Chrome's own printing pipeline. It is not copied, retained, logged, or transmitted by this
extension.

**Your settings.** Paper size, orientation, margins, scale, page range, header and footer fields,
PDF structure options, page-cleanup options, the filename template, the download subfolder, and
your interface language are stored using `chrome.storage.local`. This is storage on your own
machine, inside your Chrome profile. The extension does not use `chrome.storage.sync`, so your
settings are not uploaded to your Google account or synchronised to your other devices. You can
erase them at any time with the "Reset to defaults" button on the options page, or by removing the
extension.

**The generated PDF.** The file is created in memory and handed to Chrome's download manager. The
developer never receives it and has no way to.

## The "debugger" permission

Producing a PDF with real, selectable text requires Chrome's own print engine, which is reachable
only through the Chrome DevTools Protocol command `Page.printToPDF`. `chrome.debugger` is the only
API Chrome provides to extensions for sending that command.

The extension attaches the debugger **only** when you explicitly start an export (toolbar button,
context menu, or Alt+P), **only** to the single tab you are exporting, and detaches it immediately
when the export finishes — including when it fails or is cancelled. While it is attached, Chrome
displays its own notification bar on that tab.

It is used exclusively for printing. The extension does not use it to intercept or inspect network
traffic, to read other tabs, to execute code in pages, or to maintain any background connection.

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
- Website content — text, images, sounds, videos, or hyperlinks from the pages you export
- Device identifiers, installation identifiers, cookies, or advertising identifiers

## Sharing, selling, and transfer

There is nothing to share, sell, or transfer. No user data is sold, rented, traded, or disclosed to
any third party, for any purpose, including advertising, analytics, model training, or
creditworthiness assessment. There are no third-party service providers involved in the operation
of this extension.

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
- **Exported PDFs** — ordinary files in your downloads folder; delete them as you would any file.

## Changes to this policy

If this policy changes, the effective date above will be updated and the revised policy published
at the same URL. Material changes will also be noted in the extension's Chrome Web Store listing.

## Contact

Questions about this policy or about the extension's privacy behaviour: **inform2cary@gmail.com**

---

# 隱私權政策 — 網頁轉 PDF

**生效日期：2026 年 9 月 18 日**

## 摘要

「網頁轉 PDF」完全在你的電腦上執行。沒有伺服器、不發出任何網路請求、不蒐集任何資料。你瀏覽、轉檔或設定的任何內容都不會被送到任何地方。

## 這個擴充功能做什麼

把你目前分頁的網頁轉換成 PDF 檔並儲存到你的電腦。這是它唯一的用途。

## 我們蒐集哪些資料

**沒有。**

開發者沒有架設任何伺服器、資料庫、分析服務或記錄端點。擴充功能內不含遙測、當機回報、廣告或追蹤 SDK，也不含任何第三方程式碼。它未宣告任何主機權限、不發出任何網路請求，因此在原理上就不存在可以送出資料的管道。

## 資料如何被處理

**網頁內容。** 當你要求轉檔時，擴充功能會依你的設定暫時整理該分頁的頁面（例如隱藏導覽、強制白底、展開折疊區塊），再請 Chrome 內建的列印引擎產生 PDF。產生的檔案直接寫入你的下載資料夾。整個過程都在你的瀏覽器與 Chrome 自己的列印管線中完成；本擴充功能不會複製、保留、記錄或傳送網頁內容。

**你的設定。** 紙張大小、方向、邊界、縮放、頁面範圍、頁首頁尾欄位、PDF 結構選項、頁面整理選項、檔名樣板、下載子資料夾與介面語言，透過 `chrome.storage.local` 儲存，也就是存在你自己機器上的 Chrome 設定檔內。本擴充功能不使用 `chrome.storage.sync`，因此設定不會上傳到你的 Google 帳號，也不會同步到其他裝置。你隨時可以用設定頁的「恢復預設值」清除，或直接移除擴充功能。

**產生的 PDF。** 檔案在記憶體中建立後交給 Chrome 的下載管理員。開發者不會收到，也沒有任何途徑可以收到。

## 關於「偵錯工具」權限

要產生文字可選取的 PDF 必須使用 Chrome 內建的列印引擎，而這個引擎只能透過 Chrome DevTools Protocol 的 `Page.printToPDF` 指令呼叫；`chrome.debugger` 是 Chrome 提供給擴充功能送出這個指令的唯一 API。

擴充功能**只有**在你明確啟動轉檔時（工具列按鈕、右鍵選單或 Alt+P）才附加除錯器，**只**附加到你要轉檔的那一個分頁，並在轉檔結束時立即卸離 —— 包含失敗或取消的情況。附加期間 Chrome 會在該分頁顯示自己的提示列。

這個權限只用於列印。不會用來攔截或檢視網路流量、讀取其他分頁、在頁面中執行程式碼，也不會維持任何背景連線。

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
- 網站內容 —— 你轉檔的網頁上的文字、圖片、聲音、影片或連結
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
- **轉出的 PDF** —— 就是下載資料夾裡的一般檔案，可以像其他檔案一樣刪除。

## 政策變更

本政策若有變更，會更新上方的生效日期並在同一網址發布修訂後的版本。重大變更也會在 Chrome 線上應用程式商店的說明中註明。

## 聯絡方式

對本政策或本擴充功能的隱私行為有疑問：**inform2cary@gmail.com**
