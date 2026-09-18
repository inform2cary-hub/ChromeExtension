---
layout: default
title: "AI Bilingual Translate — Privacy Policy"
---

# Privacy Policy — AI Bilingual Translate

**Effective date: 18 September 2026**

## Summary — read this part

To translate text, that text must be sent to an AI service. **AI Bilingual Translate sends the
text of the paragraphs you ask it to translate to the AI provider that you choose and configure
with your own API key.**

The developer of this extension operates no server, receives no copy of anything, and collects no
data. There is no account, no telemetry, and no analytics. Once your text reaches the provider you
selected, it is handled under that provider's terms — so choose your provider deliberately, and
read their policy. If you configure a model running on your own machine, no text leaves your
computer at all.

## What this extension does

AI Bilingual Translate translates the text of the web page in your active tab using an AI service
you select and authenticate to with your own API key, and displays each translation directly
beneath its original paragraph. That is its only purpose.

## What is transmitted, and to whom

A translation request is sent **only** when you start a translation — by clicking Translate in the
popup, choosing the context-menu item, pressing Alt+T, or visiting a domain you have yourself added
to the auto-translate list (empty by default).

**What is sent:**

- The text of the paragraphs being translated, extracted from the page.
- Your API key for that provider, as the request's credential.
- Fixed translation instructions built into the extension, which include your chosen target
  language, tone setting, and — if you filled it in — your domain hint.
- Any custom HTTP headers you configured yourself, for gateways that require them.

**What is NOT sent:**

- The page URL.
- The page title.
- Any identifier for you, your browser, your device, or your installation.
- Any cookie, session token, or credential belonging to the site you are reading.
- Your browsing history, or any record of pages you did not translate.

**Where it is sent** — to exactly one endpoint per request, the one belonging to the provider you
selected:

| Provider you selected | Endpoint | Their privacy terms |
| --- | --- | --- |
| Google Gemini | `https://generativelanguage.googleapis.com` | [Google Privacy Policy](https://policies.google.com/privacy) and the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) |
| OpenAI | `https://api.openai.com` | [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy) and the [API data usage policies](https://openai.com/policies/api-data-usage-policies) |
| A model on your own machine | `http://localhost` or `http://127.0.0.1` | Nothing leaves your computer. No third party is involved. |
| Any other OpenAI-compatible endpoint you configure | The address you entered | Governed by whoever operates that endpoint. You chose it; review their terms. |

The request goes **from your browser directly to that endpoint**. It does not pass through any
server belonging to the developer, because no such server exists.

## The developer receives nothing

There is no backend. No account system, no license server, no telemetry endpoint, no crash
reporting, no analytics, no advertising SDK, and no third-party tracking code. The extension
contacts no host other than the AI endpoint you configured. The developer therefore has no access
to your text, your API key, your settings, or the fact that you used the extension at all.

## Your API key

Your API key is your own credential for your own account with your chosen provider.

- It is stored using `chrome.storage.local` — on your machine, inside your Chrome profile.
- `chrome.storage.sync` is **not** used, so your key is never uploaded to your Google account and
  never synchronised to your other devices.
- All API requests are made from the extension's background service worker, not from the page.
  Web pages you visit cannot read your key.
- It is transmitted only to the provider endpoint you configured, as that request's authorisation
  credential.
- You can remove it at any time by clearing the field on the options page, using "Reset to
  defaults", or uninstalling the extension.

## What is stored, and where

All storage is local to your machine. Nothing is stored on any server.

- **Settings** (`chrome.storage.local`) — provider, base URL, model, API key, custom headers,
  target language, tone, domain hint, display style, batching and concurrency settings, skip
  selectors, your auto-translate domain list, and interface language.
- **Session statistics** (`chrome.storage.session`) — counts of requests, cache hits, segments and
  tokens for the current browser session, so you can see your own usage. Contains no page text, and
  is cleared when the browser closes.
- **Translation cache** — held in memory in the background service worker so a repeated paragraph is
  not sent twice. It is not written to disk and disappears when the service worker restarts.

## What happens on the page

Translations are added as new `<span>` elements appended after each source paragraph. Your page's
original content is not replaced, rewritten, or removed. Turning the translation off hides those
elements; it does not send another request.

The extension runs only in the top-level frame. Content inside iframes is not read or translated.

Text is skipped, and therefore never sent, when it is inside a code block, an input field, or an
editable region; when the element is hidden; when it consists only of numbers or symbols; when it
is already in your target language; or when it matches a CSS selector you added to the skip list.

## Data we do NOT collect

To be explicit, the developer of this extension does **not** collect, store, receive, or have
access to:

- Personally identifiable information — name, address, email address, age, identity documents
- Health information
- Financial or payment information
- Your API key, or any other authentication information
- Personal communications — email, messages, chats
- Location — IP-based, GPS, or otherwise
- Web history, browsing activity, referrers, clickstream, or the list of sites you visit
- User activity — clicks, keystrokes, mouse position, scroll depth, session recordings
- Website content — the text you translate is sent to your chosen provider, never to the developer
- Device identifiers, installation identifiers, cookies, or advertising identifiers

The extension also does not sell, rent, trade, or share any user data with anyone, and does not use
any data for advertising, profiling, model training, or creditworthiness assessment.

## Limited Use disclosure

Use of information received from Google APIs or from the user adheres to the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/),
including the Limited Use requirements. Specifically:

- Text is transmitted **only** to provide the user-facing feature the user explicitly requested:
  translating the page in front of them, using the AI provider they selected and authenticated to
  themselves.
- No user data is transferred to any third party except that chosen provider, and only as necessary
  to produce the requested translation.
- No user data is used or transferred for serving advertising, for personalised advertising, for
  credit assessment, or for lending purposes.
- No user data is used or transferred for any purpose unrelated to the extension's single purpose.
- No humans associated with this extension read user data. The developer receives none of it.

## Third-party processing

Once your text reaches the AI provider you selected, that provider's policies govern what happens
to it — including whether it is logged, how long it is retained, and whether it may be used for
model improvement. This is outside the developer's control and outside this policy's scope.

If this matters to you:

- Review your provider's data-usage terms, linked in the table above.
- Check whether your account or plan offers a zero-retention or no-training option.
- Or use a local or self-hosted model, in which case your text never leaves your own machine or
  network.

## Children's privacy

This extension is a general-purpose utility and is not directed at children. It requires the user
to obtain and configure an API key from a third-party AI provider, which those providers generally
restrict to adults. The developer collects no data from anyone, including children under 13.

## Your rights and choices

The developer holds no data about you, so there is nothing to request access to, correct, export,
or delete on our side. Everything is under your own control:

- **Stop all transmission** — do not run a translation, or uninstall the extension. Nothing is sent
  unless you start a translation or have opted a domain in to auto-translate.
- **Keep everything local** — configure a local or self-hosted model. No third party is then
  involved.
- **Remove your key and settings** — "Reset to defaults" on the options page, or uninstall.
- **Revoke network access** — optional host permissions you granted for a custom endpoint can be
  revoked at `chrome://extensions`.
- **Data held by your AI provider** — exercise those rights with the provider directly, under their
  policy.

## Changes to this policy

If this policy changes, the effective date above will be updated and the revised policy published
at the same URL. Material changes — in particular any change to what is transmitted or to whom —
will also be noted in the extension's Chrome Web Store listing.

## Contact

Questions about this policy or about the extension's privacy behaviour: **inform2cary@gmail.com**

---

# 隱私權政策 — AI 雙語翻譯

**生效日期：2026 年 9 月 18 日**

## 摘要 —— 請先看這段

要翻譯文字，那些文字就必須送到某個 AI 服務。**「AI 雙語翻譯」會把你要求翻譯的段落文字，送到你自己選擇、並以你自己的 API Key 設定的 AI 服務商。**

本擴充功能的開發者沒有架設任何伺服器、不會收到任何複本，也不蒐集任何資料。沒有帳號、沒有遙測、沒有分析。你的文字送達你所選的服務商之後，就依該服務商的條款處理 —— 所以請慎選服務商，並閱讀他們的政策。如果你設定的是跑在自己機器上的模型，文字完全不會離開你的電腦。

## 這個擴充功能做什麼

使用你自行選擇、並以自己的 API Key 驗證的 AI 服務，翻譯你目前分頁的網頁文字，並把每段譯文顯示在對應原文段落的下方。這是它唯一的用途。

## 傳送了什麼、送給誰

只有在你啟動翻譯時才會送出請求 —— 按下彈出視窗的翻譯按鈕、選擇右鍵選單項目、按 Alt+T，或造訪你自己加入自動翻譯清單（預設為空）的網域。

**會送出：**

- 從頁面擷取出來、正在翻譯的段落文字。
- 你在該服務商的 API Key，作為請求的憑證。
- 擴充功能內建的固定翻譯指示，其中包含你選的目標語言、語氣風格，以及你自己填寫的領域提示（如果有填）。
- 你自己設定的自訂 HTTP 表頭（供需要的閘道使用）。

**不會送出：**

- 網頁網址。
- 網頁標題。
- 任何關於你、你的瀏覽器、你的裝置或你這次安裝的識別資訊。
- 你正在閱讀的網站的任何 Cookie、工作階段權杖或憑證。
- 你的瀏覽記錄，或任何你沒有翻譯過的頁面的記錄。

**送到哪裡** —— 每次請求只會送到一個端點，也就是你所選服務商的那一個：

| 你選擇的服務商 | 端點 | 對方的隱私條款 |
| --- | --- | --- |
| Google Gemini | `https://generativelanguage.googleapis.com` | [Google 隱私權政策](https://policies.google.com/privacy)、[Gemini API 附加服務條款](https://ai.google.dev/gemini-api/terms) |
| OpenAI | `https://api.openai.com` | [OpenAI 隱私權政策](https://openai.com/policies/privacy-policy)、[API 資料使用政策](https://openai.com/policies/api-data-usage-policies) |
| 跑在你自己機器上的模型 | `http://localhost` 或 `http://127.0.0.1` | 資料不會離開你的電腦，不涉及任何第三方。 |
| 你自行設定的其他 OpenAI 相容端點 | 你輸入的位址 | 由該端點的營運者規範。端點是你選的，請自行檢視其條款。 |

請求是**從你的瀏覽器直接送到該端點**，不會經過開發者的任何伺服器 —— 因為根本沒有這樣的伺服器。

## 開發者收不到任何東西

沒有後端。沒有帳號系統、沒有授權伺服器、沒有遙測端點、沒有當機回報、沒有分析、沒有廣告 SDK，也沒有任何第三方追蹤程式碼。除了你設定的 AI 端點之外，擴充功能不連線任何主機。因此開發者無從取得你的文字、你的 API Key、你的設定，甚至無從得知你是否使用過本擴充功能。

## 你的 API Key

你的 API Key 是你自己在所選服務商的帳號憑證。

- 透過 `chrome.storage.local` 儲存 —— 存在你自己機器上的 Chrome 設定檔內。
- **不使用** `chrome.storage.sync`，因此金鑰不會上傳到你的 Google 帳號，也不會同步到其他裝置。
- 所有 API 請求都由擴充功能的背景 service worker 發出，而非由頁面發出；你造訪的網頁讀不到你的金鑰。
- 只會傳送到你設定的服務商端點，作為該請求的授權憑證。
- 你隨時可以清空設定頁的欄位、按「恢復預設值」，或移除擴充功能來刪除它。

## 儲存了什麼、存在哪裡

所有儲存都在你自己的機器上，沒有任何東西存在伺服器。

- **設定**（`chrome.storage.local`）—— 服務商、Base URL、模型、API Key、自訂表頭、目標語言、語氣風格、領域提示、對照樣式、批次與併發設定、跳過的選擇器、自動翻譯網域清單，以及介面語言。
- **工作階段統計**（`chrome.storage.session`）—— 本次瀏覽器工作階段的請求數、快取命中數、段落數與 token 數，供你查看自己的用量。其中不含任何網頁文字，瀏覽器關閉即清除。
- **翻譯快取** —— 存在背景 service worker 的記憶體中，讓重複的段落不會送出兩次。不會寫入磁碟，service worker 重啟即消失。

## 頁面上發生的事

譯文是以新的 `<span>` 元素附加在每個原文段落之後。你頁面上的原有內容不會被取代、改寫或移除。關閉翻譯只是把那些元素隱藏起來，不會再送出請求。

擴充功能只在最上層框架執行，iframe 內的內容不會被讀取或翻譯。

以下文字會被跳過，因此絕不會被送出：位於程式碼區塊、輸入框或可編輯區域內的文字；隱藏元素中的文字；只有數字或符號的內容；本來就已經是目標語言的段落；以及符合你加入跳過清單的 CSS 選擇器的區塊。

## 我們「不會」蒐集的資料

明確列出，本擴充功能的開發者不蒐集、不儲存、不接收，也無從取得以下資料：

- 個人識別資訊 —— 姓名、地址、電子郵件、年齡、身分證件
- 健康資訊
- 財務或付款資訊
- 你的 API Key 或任何其他驗證資訊
- 個人通訊內容 —— 郵件、訊息、聊天記錄
- 位置資訊 —— IP 推定位置、GPS 或其他方式
- 瀏覽記錄、瀏覽行為、來源網址、點擊流或你造訪過的網站清單
- 使用者操作 —— 點擊、按鍵、滑鼠位置、捲動深度、操作錄影
- 網站內容 —— 你翻譯的文字是送到你自己選擇的服務商，絕不會送到開發者手上
- 裝置識別碼、安裝識別碼、Cookie 或廣告識別碼

本擴充功能也不會把任何使用者資料販售、出租、交換或分享給任何人，不會用於廣告、剖析、模型訓練或信用評估。

## 有限使用（Limited Use）聲明

本擴充功能對於自 Google API 或使用者取得之資訊的使用，遵循 [Chrome 線上應用程式商店使用者資料政策](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)，包含其中的有限使用（Limited Use）要求。具體而言：

- 傳送文字**只**為了提供使用者明確要求的功能：使用他們自己選擇並自行驗證的 AI 服務商，翻譯眼前的頁面。
- 除了該服務商之外，不會將使用者資料轉讓給任何第三方，且僅限於產生所要求的譯文所必需的範圍。
- 不會將使用者資料用於或轉讓作為投放廣告、個人化廣告、信用評估或放貸用途。
- 不會將使用者資料用於與本擴充功能單一用途無關的任何目的。
- 不會有任何與本擴充功能相關的人員閱讀使用者資料，因為開發者根本收不到這些資料。

## 第三方處理

你的文字送達你所選的 AI 服務商之後，後續處理就由該服務商的政策規範 —— 包括是否記錄、保存多久，以及是否可能用於模型改進。這超出開發者的掌控範圍，也超出本政策的涵蓋範圍。

如果你在意這一點：

- 請檢視上表連結的服務商資料使用條款。
- 確認你的帳號或方案是否提供零保留（zero retention）或不用於訓練的選項。
- 或改用地端／自架模型 —— 這樣文字完全不會離開你自己的機器或網路。

## 兒童隱私

本擴充功能是一般用途的工具，並非以兒童為對象。它需要使用者自行向第三方 AI 服務商取得並設定 API Key，而這些服務商通常限制成年人才能申請。開發者不向任何人蒐集資料，包含未滿 13 歲的兒童。

## 你的權利與選擇

開發者手上沒有任何關於你的資料，因此我們這邊沒有任何資料可供你查閱、更正、匯出或刪除。一切都在你自己的掌控中：

- **完全停止傳送** —— 不要啟動翻譯，或移除擴充功能。只要你沒有啟動翻譯、也沒有為某個網域開啟自動翻譯，就不會送出任何東西。
- **全部留在本機** —— 設定成使用地端或自架模型，就完全不涉及任何第三方。
- **刪除金鑰與設定** —— 設定頁的「恢復預設值」，或移除擴充功能。
- **撤銷網路存取** —— 你為自訂端點授予的選用主機權限，可以在 `chrome://extensions` 撤銷。
- **服務商持有的資料** —— 請依該服務商的政策，直接向他們行使你的權利。

## 政策變更

本政策若有變更，會更新上方的生效日期並在同一網址發布修訂後的版本。重大變更（特別是傳送內容或傳送對象的任何改變）也會在 Chrome 線上應用程式商店的說明中註明。

## 聯絡方式

對本政策或本擴充功能的隱私行為有疑問：**inform2cary@gmail.com**
