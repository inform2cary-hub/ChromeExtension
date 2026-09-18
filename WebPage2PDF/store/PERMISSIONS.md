# Permission Justifications — Web Page to PDF

For the **Privacy practices** tab of the Chrome Web Store Developer Dashboard.

Paste the English block for each permission into that permission's justification field. The
Traditional Chinese version underneath is for your own reference — do **not** paste it into the
same field (the dashboard expects one language per field, and mixed-language text slows review).

Every claim below is true of the shipped code. If you change the code, change these first.

---

## `debugger`

> This is the permission that will decide your review. Read it once more before pasting.

**Paste this (English):**

```
This extension converts the user's current web page into a PDF with real, selectable, searchable
text. It does this by calling Chrome's own print-to-PDF engine via the DevTools Protocol command
Page.printToPDF.

Page.printToPDF is reachable only through the Chrome DevTools Protocol, and chrome.debugger is
the only API surface Chrome exposes to extensions for sending CDP commands. There is no
non-debugger alternative that produces this result: chrome.tabs.captureVisibleTab yields an image
of the viewport, not a document, and would make the text unselectable and unsearchable;
chrome.printing targets ChromeOS printers, not PDF generation; and window.print() only opens the
system print dialog, which cannot be automated, cannot apply the user's saved paper, margin,
header/footer and page-range settings, and cannot return a file to the extension.

Scope and duration of use:
- The debugger is attached only in direct response to an explicit user action: clicking the
  toolbar button's Export control, choosing the context-menu item, or pressing the Alt+P command.
  It is never attached on browser startup, on page load, or on any automatic trigger.
- It is attached to exactly one tab: the tab the user is exporting. tabId is taken from the
  active tab at the moment of the user's action.
- Exactly three CDP commands are sent, all in the printing path: Page.enable, Page.printToPDF,
  and - only when the user has enabled the "use screen styles instead of print styles" option -
  Emulation.setEmulatedMedia with media "screen". No other CDP domain is enabled or used.
- It is detached immediately when printing finishes, in a finally block, so it is detached on
  failure and on cancellation as well as on success. Attachment lasts for the duration of one
  export, typically a few seconds.
- Chrome displays its own "<extension> is debugging this browser" infobar on the tab for the
  whole time the debugger is attached, so the user has continuous, browser-provided notice.

What this extension explicitly does NOT do with the debugger:
- It does not enable, use, or listen to the Network domain. It does not intercept, inspect,
  modify, or record any network request or response.
- It does not attach to any tab other than the one being exported, and does not read the content
  of other tabs.
- It does not use Runtime.evaluate or any other CDP command to execute code in the page.
- It does not remain attached in the background, across navigations, or between exports.
- It does not transmit the page, the PDF, or any derived data anywhere. The extension makes no
  network requests at all; the generated PDF is written straight to the user's downloads.
```

**繁體中文（自用參考）**

```
本擴充功能把使用者目前的網頁轉成文字可選取、可搜尋的 PDF，做法是透過 DevTools Protocol 的 Page.printToPDF
指令呼叫 Chrome 內建的列印引擎。

Page.printToPDF 只能透過 Chrome DevTools Protocol 呼叫，而 chrome.debugger 是 Chrome 提供給擴充功能
發送 CDP 指令的唯一介面，沒有其他替代方案可以達到相同結果：captureVisibleTab 得到的是視窗畫面的圖片而非文件，
文字會變成不可選取、不可搜尋；chrome.printing 針對的是 ChromeOS 印表機，不是 PDF 產生；window.print() 只能
開啟系統列印對話框，無法自動化、無法套用使用者存好的紙張／邊界／頁首頁尾／頁面範圍設定，也無法把檔案回傳給擴充功能。

使用範圍與時間：
- 只有在使用者明確操作時才附加除錯器：按下彈出視窗的轉檔按鈕、選擇右鍵選單項目，或按 Alt+P。不會在瀏覽器啟動時、
  頁面載入時或任何自動觸發下附加。
- 只附加到一個分頁，就是使用者要轉檔的那一個。
- 只送出三個 CDP 指令，全部屬於列印流程：Page.enable、Page.printToPDF，以及只有在使用者開啟「用螢幕樣式取代
  列印樣式」時才會用到的 Emulation.setEmulatedMedia。不啟用也不使用任何其他 CDP 網域。
- 列印一結束就在 finally 區塊裡立刻卸離，因此失敗與取消時同樣會卸離。附加時間就是一次轉檔的長度，通常幾秒鐘。
- 附加期間 Chrome 會自己在分頁上顯示「正在偵錯這個瀏覽器」提示列，使用者全程看得到。

明確不會做的事：不啟用也不監聽 Network 網域、不攔截或記錄任何網路請求；不附加到其他分頁、不讀取其他分頁內容；
不使用 Runtime.evaluate 或任何 CDP 指令在頁面執行程式碼；不在背景、跨頁瀏覽或兩次轉檔之間保持附加；
不把網頁、PDF 或任何衍生資料傳送到任何地方 —— 本擴充功能完全不發出網路請求。
```

---

## `downloads`

**Paste this (English):**

```
The extension's output is a PDF file, and chrome.downloads.download is how it is written to the
user's computer. It is called once per export, only after the user has triggered an export, and
only with the PDF that export just produced. The extension does not enumerate, search, open,
modify, or delete the user's other downloads, and does not use the downloads API to fetch
anything from the network. If the user has enabled "always ask where to save", the saveAs flag is
passed so Chrome shows its own Save As dialog.
```

**繁體中文（自用參考）**

```
本擴充功能的產物是 PDF 檔，透過 chrome.downloads.download 寫入使用者電腦。每次轉檔只呼叫一次，而且只在
使用者主動觸發轉檔之後、只針對這次產生的 PDF。不會列舉、搜尋、開啟、修改或刪除使用者其他的下載項目，
也不會用下載 API 從網路抓取任何東西。使用者若勾選「每次詢問儲存位置」，會帶上 saveAs 旗標讓 Chrome 顯示另存新檔對話框。
```

---

## `offscreen`

**Paste this (English):**

```
Page.printToPDF returns the PDF as a base64 string. To hand that to chrome.downloads.download as
a file, the extension needs a Blob URL - but a Manifest V3 service worker has no DOM and no
URL.createObjectURL, and passing a multi-megabyte PDF as a data: URL is truncated by the
downloads API for larger documents. An offscreen document is the API Chrome provides for exactly
this: a DOM context the extension can use for work the service worker cannot do.

The offscreen document is created with the BLOBS reason, used only to create and then revoke one
Blob URL for the PDF that was just generated, and closed when the export completes. It loads no
remote content, renders nothing to the user, and uses no extension API other than
chrome.runtime for messaging (Chrome does not expose any other chrome.* API inside an offscreen
document). The actual download call runs back in the service worker.
```

**繁體中文（自用參考）**

```
Page.printToPDF 回傳的是 base64 字串。要把它交給 chrome.downloads.download 存成檔案需要 Blob URL，
但 MV3 的 service worker 沒有 DOM、沒有 URL.createObjectURL，而把較大的 PDF 塞進 data: URL 會被下載 API 截斷。
離螢幕文件正是 Chrome 為此提供的 API：一個可以做 service worker 做不到的事的 DOM 環境。

離螢幕文件以 BLOBS 理由建立，只用來為這次產生的 PDF 建立並釋放一個 Blob URL，轉檔完成即關閉。
它不載入任何遠端內容、不對使用者呈現任何畫面，除了 chrome.runtime 之外不使用任何擴充功能 API
（Chrome 在離螢幕文件裡也只提供 chrome.runtime）。真正的下載呼叫回到 service worker 執行。
```

---

## `activeTab` and `scripting`

> The dashboard lists these as separate fields. The two texts below overlap on purpose — each
> field has to stand on its own.

**`activeTab` — paste this (English):**

```
When the user triggers an export, the extension needs access to that one tab in order to prepare
it for printing and to identify it to the print engine. activeTab grants exactly that: access to
the tab the user acted on, granted by that action, and only for as long as it is needed. This is
deliberately used instead of host permissions - the extension asks for no host permissions at
all, so it has no standing access to any site. It gains access to a page only at the moment the
user asks for that page to be exported.
```

**`scripting` — paste this (English):**

```
Before printing, the extension injects a preparation script into the tab being exported. That
script implements the user's own page-cleanup settings: keep only the main article, unstick
fixed and floating elements that would otherwise repeat on every printed page, force a light
background so dark-themed sites do not print as solid black, expand collapsed <details>
sections, scroll the page once so lazy-loaded images have loaded, and hide any elements matching
CSS selectors the user has entered. A second injection restores the page afterwards.

chrome.scripting.executeScript is the only API that can make these changes, and a statically
declared content script is not an acceptable substitute: it would have to run on every page the
user visits, whereas injection runs only on the one tab the user is exporting, only at the moment
of export. All changes are applied through a single <style> element and data-w2p-* attributes and
are reverted in a finally block - including scroll position, <details> open state and image
loading attributes - so the page is restored even if the export fails. The script reads the page
only to prepare and restore it; nothing read from the page is stored or transmitted.
```

**繁體中文（自用參考）**

```
activeTab：使用者觸發轉檔時，擴充功能需要存取那一個分頁，才能為列印做準備並指認要列印的目標。activeTab 給的正是
這個範圍：由使用者的動作授予、只針對使用者操作的那一個分頁、只在需要的期間內有效。這是刻意用來取代主機權限的做法 ——
本擴充功能完全不宣告任何 host_permissions，因此對任何網站都沒有常駐存取權，只有在使用者要求轉檔的那一刻才取得存取權。

scripting：列印前會對要轉檔的分頁注入整理腳本，實作使用者自己設定的頁面整理規則（只留主要內容、取消固定浮動元素、
強制白底黑字、展開 <details>、先捲動載入延遲圖片、隱藏符合指定 CSS 選擇器的區塊），轉檔後再注入一次還原。
只有 chrome.scripting.executeScript 能做到這些；靜態宣告的 content script 不是可接受的替代方案，因為那會在
使用者造訪的每一個網頁上執行，而動態注入只發生在使用者要轉檔的那一個分頁、那一個時刻。所有變更都透過單一 <style>
元素與 data-w2p-* 屬性完成，並在 finally 區塊還原（含捲動位置、<details> 開合與圖片載入屬性），
即使轉檔失敗也會還原。腳本讀取頁面只為了整理與還原，讀到的內容不儲存、不傳送。
```

---

## `storage`

**Paste this (English):**

```
The extension remembers the user's own export settings so they do not have to be re-entered on
every page: paper size and orientation, margins, scale, page range, header and footer fields and
font size, tagged-PDF and bookmark-outline options, page-cleanup options, the filename template,
the download subfolder, and the interface language. These are written to chrome.storage.local and
stay on the user's machine; chrome.storage.sync is not used, so nothing is uploaded to a Google
account. No page content, browsing history, or personal data is stored.
```

**繁體中文（自用參考）**

```
用來記住使用者自己的轉檔設定，免得每次都要重填：紙張與方向、邊界、縮放、頁面範圍、頁首頁尾欄位與字級、
標記式 PDF 與書籤大綱選項、頁面整理選項、檔名樣板、下載子資料夾，以及介面語言。這些寫入 chrome.storage.local，
留在使用者的機器上；不使用 chrome.storage.sync，因此不會上傳到 Google 帳號。不儲存任何網頁內容、瀏覽記錄或個人資料。
```

---

## `contextMenus`

**Paste this (English):**

```
The extension adds two right-click menu items: "Convert this page to PDF", which starts an export
of the current page, and an item that opens the extension's options page. This gives users a way
to export without moving the mouse to the toolbar. The menu items are registered once on install,
appear only in the page context menu, and do not read or act on page content by themselves - they
simply invoke the same export the toolbar button does.
```

**繁體中文（自用參考）**

```
新增兩個右鍵選單項目：「把這個網頁轉成 PDF」用來直接轉檔目前頁面，另一個開啟設定頁，讓使用者不必把滑鼠移到工具列。
選單項目只在安裝時註冊一次、只出現在頁面的右鍵選單，本身不讀取也不處理網頁內容，只是觸發和工具列按鈕相同的轉檔流程。
```

---

## Host permissions

**This extension declares no host permissions.** If the dashboard shows the field, answer:

```
This extension declares no host permissions and no optional host permissions. It has no standing
access to any website. Access to a page is obtained only through activeTab, granted by the user's
own action at the moment they ask for that page to be exported, and it makes no network requests
of any kind.
```

---

## Remote code

**Dashboard question: "Are you using remote code?" → Answer: `No, I am not using remote code`**

**Justification field (paste this):**

```
No remote code. All JavaScript, HTML and CSS that this extension executes is contained in the
uploaded package and is reviewable in it. The extension loads no scripts from any server,
includes no CDN <script> tags, uses no eval(), no new Function(), no importScripts() of a remote
URL, no remotely hosted WebAssembly, and no remote module imports. It makes no network requests
at all - it has no host permissions and never contacts any server, including the developer's.
Chrome's DevTools Protocol commands sent through chrome.debugger are fixed method names and
parameters constructed in the packaged code from the user's own settings; they are not fetched
code and are not executed as script in the page.
```

**繁體中文（自用參考）**

```
不使用遠端程式碼。本擴充功能執行的所有 JavaScript、HTML 與 CSS 都包含在上傳的封裝檔中，可直接檢閱。
不從任何伺服器載入腳本、沒有 CDN 的 <script>、不使用 eval()、new Function()、遠端 importScripts()、
遠端 WebAssembly 或遠端模組匯入。完全不發出網路請求 —— 沒有任何主機權限，也從不連線任何伺服器（包含開發者自己的）。
透過 chrome.debugger 送出的 CDP 指令是封裝檔內依使用者設定組出來的固定方法名稱與參數，不是抓回來的程式碼，
也不會被當成腳本在頁面執行。
```

---

## Data usage certification

On the same tab you must tick the certification checkboxes. For this extension:

- Do **not** tick any "I collect …" data category. The extension collects nothing.
- Tick: *I do not sell or transfer user data to third parties, outside of approved use cases.*
- Tick: *I do not use or transfer user data for purposes that are unrelated to my item's single purpose.*
- Tick: *I do not use or transfer user data to determine creditworthiness or for lending purposes.*
- Provide the privacy policy URL (see `PRIVACY_POLICY.md` — you need it publicly reachable first).
