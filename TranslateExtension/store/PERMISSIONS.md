# Permission Justifications — AI Bilingual Translate

For the **Privacy practices** tab of the Chrome Web Store Developer Dashboard.

Paste the English block for each permission into that permission's justification field. The
Traditional Chinese version underneath is for your own reference — do **not** paste it into the
same field.

This is the one extension of the three that transmits page content off the user's device. Every
statement below must stay exactly true; if the code changes, change these first.

---

## `storage`

**Paste this (English):**

```
The extension stores the user's own configuration so it does not have to be re-entered: the
selected AI provider, the base URL and model for that provider, the user's API key, any custom
HTTP headers their gateway requires, target language, tone, domain hint, bilingual display style,
batching and concurrency settings, the list of CSS selectors to skip, the auto-translate domain
list, and the interface language.

All of this is written to chrome.storage.local, which is storage on the user's own machine inside
their Chrome profile. chrome.storage.sync is deliberately not used, so the API key is never
uploaded to a Google account or synchronised to other devices. Settings are readable only by this
extension; web pages cannot read them, which is why all API requests are made from the background
service worker rather than from the page.

chrome.storage.session (in-memory, cleared when the browser closes) holds a small counter of
request and token statistics for the session, so the user can see their own usage. It contains no
page text.

No browsing history and no page content are written to storage. The translation cache is held in
memory in the service worker and is not persisted.
```

**繁體中文（自用參考）**

```
用來儲存使用者自己的設定，免得每次重填：所選的 AI 服務商、該服務商的 Base URL 與模型、使用者的 API Key、
閘道所需的自訂 HTTP 表頭、目標語言、語氣風格、領域提示、對照樣式、批次與併發設定、要跳過的 CSS 選擇器清單、
自動翻譯的網域清單，以及介面語言。

這些全部寫入 chrome.storage.local，也就是存在使用者自己機器上的 Chrome 設定檔內。刻意不使用
chrome.storage.sync，因此 API Key 不會上傳到 Google 帳號，也不會同步到其他裝置。設定只有本擴充功能讀得到，
網頁環境讀不到 —— 這也是所有 API 請求都由背景 service worker 發出而非由頁面發出的原因。

chrome.storage.session（只在記憶體中，瀏覽器關閉即清除）保存本次工作階段的請求與 token 統計，供使用者查看
自己的用量，其中不含任何網頁文字。

不會把瀏覽記錄或網頁內容寫入儲存空間。翻譯快取只存在 service worker 的記憶體中，不做持久化。
```

---

## `activeTab`

**Paste this (English):**

```
When the user asks to translate the page - by clicking Translate in the popup, choosing the
context-menu item, or pressing Alt+T - the extension needs to act on that one tab: to message its
content script, and where necessary to inject it. activeTab grants access to the tab the user
acted on, granted by that action, and only for as long as it is needed.

This is the narrow grant. The extension does not request broad host permissions for websites: the
content script is declared for <all_urls> because translation is only useful if the user can ask
for it anywhere, but that script is inert until the user explicitly triggers a translation or has
opted that specific domain in to auto-translate. activeTab is what gives the toolbar and keyboard
paths access to the current tab without any standing site access.
```

**繁體中文（自用參考）**

```
使用者要求翻譯時（按下彈出視窗的翻譯按鈕、選擇右鍵選單項目，或按 Alt+T），擴充功能需要對那一個分頁採取動作：
傳訊息給它的 content script，必要時注入它。activeTab 給的是對使用者操作的那一個分頁的存取權，由該動作授予，
只在需要的期間內有效。

這是範圍最小的授權。本擴充功能並未為一般網站索取廣泛的主機權限；content script 宣告在 <all_urls> 上，
是因為使用者可能在任何網站要求翻譯，但那個腳本在使用者明確觸發翻譯、或已為該網域開啟自動翻譯之前都不會動作。
activeTab 讓工具列與快捷鍵的路徑取得目前分頁的存取權，而不需要任何常駐的網站存取權。
```

---

## `scripting`

**Paste this (English):**

```
The content script is declared in the manifest, but a page that was already open before the
extension was installed or updated has no content script running in it. When the user triggers a
translation on such a page, the extension uses chrome.scripting.executeScript to inject the same
packaged scripts into that one tab so the request can be served without the user having to reload
the page manually.

Injection targets only the tab the user acted on, happens only in response to that action, and
injects only files contained in this package. Nothing is fetched or generated at runtime.
```

**繁體中文（自用參考）**

```
content script 已在 manifest 中宣告，但在擴充功能安裝或更新之前就已開啟的分頁裡並沒有執行中的 content script。
使用者在這種頁面上觸發翻譯時，擴充功能會用 chrome.scripting.executeScript 把同一批封裝檔內的腳本注入那一個分頁，
讓使用者不必手動重新整理頁面。

注入只針對使用者操作的那一個分頁、只在該動作發生時進行，而且只注入本封裝檔內的檔案，不會在執行期抓取或產生任何程式碼。
```

---

## `contextMenus`

**Paste this (English):**

```
The extension adds two right-click menu items: "Toggle bilingual translation for this page
(Alt+T)", which starts or hides the translation on the current page, and an item that opens the
extension's options page. They give users a path to translate without moving to the toolbar. The
items are registered once on install, appear only in the page context menu, and do not read or act
on page content by themselves - the first simply invokes the same translation the toolbar button
performs.
```

**繁體中文（自用參考）**

```
新增兩個右鍵選單項目：「切換此頁的雙語翻譯（Alt+T）」用來開始或收起目前頁面的翻譯，另一個開啟設定頁，
讓使用者不必把滑鼠移到工具列。選單項目只在安裝時註冊一次、只出現在頁面的右鍵選單，本身不讀取也不處理網頁內容，
第一項只是觸發和工具列按鈕相同的翻譯流程。
```

---

## Content script matching `<all_urls>`

> The dashboard may fold this into the host-permission justification. If there is a separate field
> for the content script, or if a reviewer asks, use this.

**Paste this (English):**

```
The content script matches <all_urls> because the user may want to translate a page on any
website. There is no subset of the web that would be correct here: a translation tool restricted
to a fixed list of domains would fail precisely when a user encounters foreign-language content
somewhere new, which is the entire use case.

What the script actually does is deliberately narrow:
- On load it does nothing except register a message listener and read the user's settings. It does
  not read, collect, or transmit any page content on its own.
- It begins extracting text only when the user explicitly triggers a translation (toolbar button,
  context menu, or Alt+T), or on a domain the user has themselves added to the auto-translate
  list, which is empty by default.
- It runs only in the top-level frame (all_frames is false); iframe content is not touched.
- It never reads the user's API key. Credentials live in the background service worker, and all
  API requests are made from there, so a compromised or hostile page cannot obtain them.
- It does not modify the page's original content. Translations are added as new <span> elements
  appended after each source paragraph, and turning the translation off only hides them.

No host permissions are requested for websites. The content script's access is what the manifest
declares; the extension holds no additional standing access to page data.
```

**繁體中文（自用參考）**

```
content script 比對 <all_urls>，是因為使用者可能想在任何網站上翻譯頁面。這裡不存在正確的子集合：
限定在固定網域清單的翻譯工具，剛好會在使用者於陌生地方遇到外語內容時失效，而那正是整個使用情境。

腳本實際做的事刻意很窄：
- 載入時除了註冊訊息監聽器與讀取使用者設定之外什麼都不做，不會自行讀取、蒐集或傳送任何網頁內容。
- 只有在使用者明確觸發翻譯（工具列按鈕、右鍵選單或 Alt+T），或在使用者自己加入自動翻譯清單（預設為空）的網域上，
  才開始擷取文字。
- 只在最上層框架執行（all_frames 為 false），不碰 iframe 內容。
- 從不讀取使用者的 API Key。憑證只存在背景 service worker，所有 API 請求都由那裡發出，
  因此被入侵或惡意的頁面無法取得。
- 不修改頁面原有內容。譯文是以新的 <span> 元素附加在每個原文段落之後，關閉翻譯只是把它們隱藏起來。

本擴充功能未對一般網站索取任何主機權限；content script 的存取範圍就是 manifest 宣告的範圍，
擴充功能沒有額外的常駐網頁資料存取權。
```

---

## Host permissions (declared)

Declared in the manifest:
`https://generativelanguage.googleapis.com/*`, `https://api.openai.com/*`,
`http://localhost/*`, `http://127.0.0.1/*`

**Paste this (English):**

```
These four origins are the AI endpoints the extension can call to perform a translation. They are
API endpoints, not websites the user browses, and the extension requests no host permission for
any site the user visits.

- https://generativelanguage.googleapis.com/* - the Google Gemini API. Required to POST the text
  to be translated to the generateContent endpoint when the user has selected Gemini and supplied
  their own Gemini API key.
- https://api.openai.com/* - the OpenAI API. Required to POST the text to be translated to the
  /chat/completions endpoint when the user has selected OpenAI and supplied their own OpenAI API
  key.
- http://localhost/* and http://127.0.0.1/* - a model the user is running on their own machine
  (Ollama, LM Studio, llama.cpp, vLLM, or any OpenAI-compatible server). These are included
  up front because loopback addresses are the most common local setup and asking for a permission
  prompt to reach the user's own computer is friction with no security benefit: traffic to
  loopback never leaves the device.

Scope of use: a request is made to exactly one of these origins - the one belonging to the
provider the user selected - and only when a translation is running. The extension makes no
other network request. It never contacts a server operated by the developer, because there is no
such server. Each request carries only the paragraph text being translated and the user's own
credentials; the page URL, the page title, and any identifier for the user are not sent.

No lesser permission suffices: Chrome requires a host permission to make a cross-origin request
from the extension's service worker, and these requests are the extension's core function.
```

**繁體中文（自用參考）**

```
這四個來源是擴充功能執行翻譯時可能呼叫的 AI 端點。它們是 API 端點，不是使用者瀏覽的網站；
本擴充功能未對任何使用者造訪的網站索取主機權限。

- https://generativelanguage.googleapis.com/*：Google Gemini API。使用者選擇 Gemini 並填入自己的
  Gemini API Key 時，需要用它把待翻譯文字 POST 到 generateContent 端點。
- https://api.openai.com/*：OpenAI API。使用者選擇 OpenAI 並填入自己的 OpenAI API Key 時，
  需要用它把待翻譯文字 POST 到 /chat/completions 端點。
- http://localhost/* 與 http://127.0.0.1/*：使用者跑在自己機器上的模型（Ollama、LM Studio、llama.cpp、
  vLLM 或任何 OpenAI 相容伺服器）。預先宣告是因為 loopback 位址是最常見的地端設定，而為了連到使用者自己的電腦
  跳出權限提示只會增加摩擦、沒有任何安全上的好處：送往 loopback 的流量根本不會離開這台裝置。

使用範圍：每次只會請求其中一個來源（使用者所選服務商的那一個），而且只在翻譯進行時。除此之外不發出任何網路請求，
也從不連線開發者經營的伺服器 —— 因為根本沒有這樣的伺服器。每次請求只帶上待翻譯的段落文字與使用者自己的憑證；
不傳送網頁網址、網頁標題或任何使用者識別資訊。

沒有更小的權限可以替代：Chrome 要求 service worker 發出跨來源請求必須具備主機權限，而這些請求正是本擴充功能的核心功能。
```

---

## `optional_host_permissions` (`http://*/*`, `https://*/*`)

> Justify this **separately**. A broad optional pattern looks alarming out of context, and the
> reason it is broad is precisely the reason it is safe: the extension cannot know the address in
> advance, so the user names it and Chrome asks them.

**Paste this (English):**

```
These are OPTIONAL host permissions. They are not granted at install time. Chrome does not include
them in the install prompt, and the extension holds none of them until the user triggers an
explicit grant.

They exist so that a user can point the extension at an AI endpoint the developer cannot know in
advance: a model on another machine on their home or office LAN (for example
http://10.20.5.226:8090/v1), a self-hosted inference server on their own domain, a company
gateway, or a third-party OpenAI-compatible service such as OpenRouter, Groq, DeepSeek or an Azure
deployment. Because the address is chosen by the user at configuration time, no fixed list of
origins can cover it. A narrower pattern would make self-hosted and enterprise deployments
impossible.

How the grant works:
1. The user enters a base URL on the options page.
2. If the extension does not already have permission for that origin, the options page shows a
   "Grant access to this domain" button - nothing is requested silently.
3. Pressing that button calls chrome.permissions.request for that single origin only. Chrome shows
   its own permission prompt naming the host. The user can decline, and can revoke it later from
   chrome://extensions.

The extension never calls chrome.permissions.request for http://*/* or https://*/* as a whole; it
requests one specific origin at a time, derived from the URL the user typed. The permission is used
only to send translation requests to that endpoint. It is never used to read, inject into, or
otherwise access ordinary websites the user browses.
```

**繁體中文（自用參考）**

```
這是「選用」主機權限，安裝時不會授予。Chrome 不會把它們放進安裝提示，而且在使用者主動授權之前，
擴充功能一項都不持有。

它們存在的理由，是讓使用者可以把擴充功能指向開發者事先無從得知的 AI 端點：家中或辦公室區網上另一台機器的模型
（例如 http://10.20.5.226:8090/v1）、架在自己網域上的推論伺服器、公司內部閘道，或 OpenRouter、Groq、DeepSeek、
Azure 部署等第三方 OpenAI 相容服務。因為位址是使用者在設定時自己決定的，任何固定的來源清單都涵蓋不了；
範圍更窄的樣式會讓自架與企業部署變得不可能。

授權流程：
1. 使用者在設定頁輸入 Base URL。
2. 若擴充功能尚未取得該來源的權限，設定頁會出現「授權存取此網域」按鈕 —— 不會靜默索取任何權限。
3. 按下按鈕才呼叫 chrome.permissions.request，而且只針對那一個來源。Chrome 會顯示自己的權限提示並指明該主機。
   使用者可以拒絕，之後也可以在 chrome://extensions 撤銷。

本擴充功能從不以 http://*/* 或 https://*/* 整體呼叫 chrome.permissions.request，而是依使用者輸入的網址
一次只請求一個特定來源。這個權限只用來把翻譯請求送到該端點，絕不用於讀取、注入或以任何方式存取使用者瀏覽的一般網站。
```

---

## Remote code

**Dashboard question: "Are you using remote code?" → Answer: `No, I am not using remote code`**

> This is the field most likely to be misunderstood for this extension, because it obviously talks
> to remote servers. Answer **No**, and explain the distinction explicitly — do not leave the
> reviewer to work it out.

**Justification field (paste this):**

```
No remote code. All JavaScript, HTML and CSS that this extension executes is contained in the
uploaded package and is reviewable in it. It loads no scripts from any server, includes no CDN
<script> tags, uses no eval(), no new Function(), no importScripts() of a remote URL, no remotely
hosted WebAssembly, and no remote module imports. The scripts injected with
chrome.scripting.executeScript are files inside this package.

To pre-empt a likely misreading: this extension DOES make HTTPS requests to third-party AI APIs
(Google Gemini, OpenAI, or an OpenAI-compatible endpoint the user configures). That is remote DATA
exchange, not remote code execution. The distinction:

- What is sent: the paragraph text the user asked to have translated, plus the user's own API key,
  as a JSON request body.
- What comes back: a JSON response containing translated text. It is parsed as data with
  JSON.parse and inserted into the page as text content in newly created <span> elements. It is
  never evaluated, never passed to eval() or new Function(), never assigned to innerHTML, and never
  executed in any form.
- No part of the extension's logic is downloaded. The program is entirely in the package; only
  translated strings cross the network.

The Chrome Web Store's remote-code policy concerns executable code that is not in the reviewed
package. Nothing of the kind is fetched here.
```

**繁體中文（自用參考）**

```
不使用遠端程式碼。本擴充功能執行的所有 JavaScript、HTML 與 CSS 都包含在上傳的封裝檔中，可直接檢閱。
不從任何伺服器載入腳本、沒有 CDN 的 <script>、不使用 eval()、new Function()、遠端 importScripts()、
遠端 WebAssembly 或遠端模組匯入。以 chrome.scripting.executeScript 注入的腳本都是封裝檔內的檔案。

為避免誤讀先說清楚：本擴充功能確實會對第三方 AI API（Google Gemini、OpenAI，或使用者自行設定的 OpenAI 相容端點）
發出 HTTPS 請求。那是遠端「資料」交換，不是遠端「程式碼」執行。差別在於：

- 送出的是什麼：使用者要求翻譯的段落文字，加上使用者自己的 API Key，以 JSON 請求主體送出。
- 回來的是什麼：含有譯文的 JSON 回應。它以 JSON.parse 當成資料解析，並以文字內容的形式放進新建立的 <span> 元素中；
  絕不會被求值、不會傳給 eval() 或 new Function()、不會賦值給 innerHTML，也不會以任何形式被執行。
- 擴充功能的邏輯沒有任何一部分是下載來的。程式完全在封裝檔內，跨網路傳輸的只有翻譯後的字串。

Chrome 線上應用程式商店的遠端程式碼政策針對的是「不在受審封裝檔內的可執行程式碼」，本擴充功能沒有抓取任何這類東西。
```

---

## Data usage disclosure — tick these

Unlike the other two extensions in this repository, **this one does transmit data**, so the
checkboxes are not empty. Be accurate; under-disclosure here is the fastest route to a takedown.

**Tick:**

- [x] **Website content** — the text of the paragraphs the user asks to translate is transmitted to
      the AI provider the user selected. (The dashboard's "Website content" category covers text
      from the pages a user visits.)
- [x] **Authentication information** — the user's API key is stored locally and transmitted to the
      provider the user chose, as the credential for their own account.

**Do NOT tick:** personally identifiable information, health information, financial and payment
information, personal communications, location, web history, user activity. None of these are
collected or transmitted. In particular the page URL and page title are **not** sent with a
translation request, so this is not web history collection.

**Certifications — tick all three:**

- [x] I do not sell or transfer user data to third parties, outside of approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

The first certification is compatible with what this extension does. Sending text to the AI
provider **the user themselves selected and authenticated to, in order to perform the translation
the user just requested**, is a transfer that is necessary to provide the single advertised
functionality — an approved use case — not a transfer to a third party for the developer's
benefit. Say so in the privacy policy, which this listing links to, and keep the wording
consistent between the two.

**Privacy policy URL:** required. See `PRIVACY_POLICY.md`.
