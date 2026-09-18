# Permission Justifications — Web Page to Markdown

For the **Privacy practices** tab of the Chrome Web Store Developer Dashboard.

Paste the English block for each permission into that permission's justification field. The
Traditional Chinese version underneath is for your own reference — do **not** paste it into the
same field.

Every claim below is true of the shipped code.

---

## `activeTab`

**Paste this (English):**

```
When the user asks to capture a page, the extension needs access to that one tab in order to read
its content and convert it to Markdown. activeTab grants exactly that: access to the tab the user
acted on, granted by that action, for as long as it is needed and no longer.

This is used deliberately instead of host permissions. The extension declares no host permissions
and no optional host permissions, so it has no standing access to any website and cannot read any
page in the background. It gains access to a page only at the moment the user clicks the toolbar
button, chooses the context-menu item, or presses Alt+M or Alt+Shift+M on that page.
```

**繁體中文（自用參考）**

```
使用者要求擷取頁面時，擴充功能需要存取那一個分頁才能讀取內容並轉成 Markdown。activeTab 給的正是這個範圍：
由使用者的動作授予、只針對使用者操作的那一個分頁、只在需要的期間內有效。

這是刻意用來取代主機權限的做法。本擴充功能未宣告任何 host_permissions 或 optional_host_permissions，
因此對任何網站都沒有常駐存取權，也無法在背景讀取任何頁面。只有在使用者於該頁面按下工具列圖示、選擇右鍵選單項目，
或按下 Alt+M／Alt+Shift+M 的那一刻，才取得存取權。
```

---

## `scripting`

**Paste this (English):**

```
The conversion itself runs inside the page, because it needs the page's live DOM: element
structure, computed visibility, resolved image URLs, and the user's current text selection. The
extension injects its extraction and conversion scripts into the tab with
chrome.scripting.executeScript at the moment the user requests a capture, reads the result, and
does nothing further.

A statically declared content script is not an acceptable substitute here: it would have to be
registered against every page the user visits and would run on all of them. Dynamic injection
runs only on the one tab the user asked about, only when they asked.

The page is not modified. Conversion is performed on a copy of the node tree obtained with
cloneNode; the only change ever made to the live page is a temporary marker attribute needed to
evaluate computed style, which is removed in a finally block before conversion begins. After a
capture, the live page has the same DOM node count and the same HTML length as before.
```

**繁體中文（自用參考）**

```
轉換本身在頁面內執行，因為它需要頁面的即時 DOM：元素結構、計算後的可見性、解析後的圖片網址，以及使用者目前的選取範圍。
使用者要求擷取時，擴充功能才用 chrome.scripting.executeScript 注入擷取與轉換腳本，讀取結果之後就不再做任何事。

靜態宣告的 content script 不是可接受的替代方案：那必須註冊在使用者造訪的每一個頁面上並在所有頁面執行；
動態注入則只發生在使用者指定的那一個分頁、那一個時刻。

頁面不會被修改。轉換是在 cloneNode 取得的節點樹複本上進行；對實際頁面唯一的變動是為了取得計算樣式而暫時加上的標記屬性，
並在轉換開始前於 finally 區塊移除。擷取完成後，實際頁面的 DOM 節點數與 HTML 長度都與先前相同。
```

---

## `downloads`

**Paste this (English):**

```
One of the extension's three outputs is a .md file, and chrome.downloads.download is how it is
written to the user's computer. It is called once per save, only after the user has clicked "Save
as .md", used the context-menu save item, or pressed Alt+M, and only with the Markdown that
capture just produced. The extension does not enumerate, search, open, modify or delete the
user's other downloads, and does not use the downloads API to fetch anything from the network.
If the user has enabled "always ask where to save", the saveAs flag is passed so Chrome shows its
own Save As dialog.
```

**繁體中文（自用參考）**

```
三種輸出方式之一是 .md 檔，透過 chrome.downloads.download 寫入使用者電腦。每次存檔只呼叫一次，
而且只在使用者按下「存成 .md 檔」、使用右鍵存檔項目或按下 Alt+M 之後，只針對這次擷取產生的 Markdown。
不會列舉、搜尋、開啟、修改或刪除使用者其他的下載項目，也不會用下載 API 從網路抓取任何東西。
使用者若勾選「每次詢問儲存位置」，會帶上 saveAs 旗標讓 Chrome 顯示另存新檔對話框。
```

---

## `offscreen`

**Paste this (English):**

```
A Manifest V3 service worker has no DOM. Two of this extension's operations need one:

1. Saving. Writing the Markdown to a file requires a Blob URL, but the service worker has no
   URL.createObjectURL, and passing a long document as a data: URL is truncated by the downloads
   API. The offscreen document creates the Blob URL and revokes it after the download starts.
2. Copying. Writing to the clipboard requires a document. The offscreen document performs the
   copy with document.execCommand('copy'), because an offscreen document never holds focus and
   navigator.clipboard.writeText is therefore rejected in it.

The offscreen document is created with the BLOBS and CLIPBOARD reasons, is used for nothing else,
loads no remote content, renders nothing to the user, and uses no extension API other than
chrome.runtime for messaging (Chrome exposes no other chrome.* API inside an offscreen document).
The chrome.downloads call itself runs back in the service worker.
```

**繁體中文（自用參考）**

```
MV3 的 service worker 沒有 DOM，而本擴充功能有兩件事需要 DOM：

1. 存檔：把 Markdown 寫成檔案需要 Blob URL，但 service worker 沒有 URL.createObjectURL，
   而把長文件塞進 data: URL 會被下載 API 截斷。離螢幕文件負責建立 Blob URL，並在下載開始後釋放。
2. 複製：寫入剪貼簿需要一個 document。離螢幕文件用 document.execCommand('copy') 完成，
   因為離螢幕文件永遠不會有焦點，navigator.clipboard.writeText 在其中會被拒絕。

離螢幕文件以 BLOBS 與 CLIPBOARD 理由建立，不做其他用途、不載入任何遠端內容、不對使用者呈現畫面，
除了 chrome.runtime 之外不使用任何擴充功能 API。chrome.downloads 的呼叫本身回到 service worker 執行。
```

---

## `clipboardWrite`

**Paste this (English):**

```
"Copy" is one of the extension's three outputs, and the one most users reach for: it puts the
converted Markdown straight onto the clipboard so it can be pasted into a note-taking app or
editor. The permission is exercised only in direct response to a user action - the Copy button in
the popup, the "Copy Markdown" or "Copy selection as Markdown" context-menu items, the Copy
button on the preview page, or Alt+Shift+M - and it writes only the Markdown produced by that
capture. The extension never reads the clipboard; clipboardRead is not requested and no clipboard
content is accessed at any point.
```

**繁體中文（自用參考）**

```
「複製」是三種輸出之一，也是多數使用者最常用的一種：把轉換好的 Markdown 直接放進剪貼簿，方便貼到筆記軟體或編輯器。
這個權限只在使用者主動操作時才會用到 —— 彈出視窗的「複製」按鈕、右鍵選單的「複製 Markdown」或
「把選取範圍複製成 Markdown」、預覽頁的「複製」按鈕，或按下 Alt+Shift+M —— 而且只寫入該次擷取產生的 Markdown。
本擴充功能從不讀取剪貼簿；未要求 clipboardRead，任何時候都不會存取剪貼簿內容。
```

---

## `storage`

**Paste this (English):**

```
Two uses, both local:

1. Settings. The extension remembers the user's own conversion preferences so they are not
   re-entered on every page: extraction rules (main content only, strip navigation and sidebars,
   prefer selection), Markdown syntax style, link handling mode, image handling mode, front-matter
   fields, the filename template, the download subfolder, and the interface language. These go to
   chrome.storage.local.
2. Passing the preview document. When the user chooses "Preview", the converted Markdown is put
   into chrome.storage.session for the preview tab to read, because a long document cannot be
   passed through a URL. chrome.storage.session is in-memory only and is cleared when the browser
   closes.

chrome.storage.sync is not used, so nothing is uploaded to a Google account. No browsing history
or personal data is stored, and captured page content is not retained after the capture completes.
```

**繁體中文（自用參考）**

```
兩種用途，都在本機：

1. 設定：記住使用者自己的轉換偏好，免得每次重填 —— 擷取規則（只取主要內容、移除導覽與側欄、有選取就只轉選取）、
   Markdown 語法風格、連結處理方式、圖片處理方式、front matter 欄位、檔名樣板、下載子資料夾、介面語言。
   這些寫入 chrome.storage.local。
2. 傳遞預覽內容：使用者選「預覽」時，轉換好的 Markdown 會放進 chrome.storage.session 供預覽分頁讀取，
   因為長文件無法透過網址傳遞。chrome.storage.session 只存在記憶體中，瀏覽器關閉即清除。

不使用 chrome.storage.sync，因此不會上傳到 Google 帳號。不儲存任何瀏覽記錄或個人資料，
擷取完成後也不保留網頁內容。
```

---

## `contextMenus`

**Paste this (English):**

```
The extension adds right-click menu items so the user can capture without moving to the toolbar:
"Save as Markdown", "Copy Markdown", "Preview Markdown", "Copy selection as Markdown" (shown when
text is selected), and an item that opens the options page. The items are registered once on
install and do not read or act on page content by themselves - each simply invokes the same
capture the toolbar button performs.
```

**繁體中文（自用參考）**

```
新增右鍵選單項目，讓使用者不必把滑鼠移到工具列就能擷取：「存成 Markdown 檔」、「複製 Markdown」、
「預覽 Markdown…」、「把選取範圍複製成 Markdown」（有選取文字時顯示），以及開啟設定頁的項目。
這些項目只在安裝時註冊一次，本身不讀取也不處理網頁內容，只是觸發和工具列按鈕相同的擷取流程。
```

---

## Host permissions

**This extension declares no host permissions.** If the dashboard shows the field, answer:

```
This extension declares no host permissions and no optional host permissions. It has no standing
access to any website. Access to a page is obtained only through activeTab, granted by the user's
own action at the moment they ask for that page to be captured, and the extension makes no network
requests of any kind.
```

---

## Remote code

**Dashboard question: "Are you using remote code?" → Answer: `No, I am not using remote code`**

**Justification field (paste this):**

```
No remote code. All JavaScript, HTML and CSS that this extension executes is contained in the
uploaded package and is reviewable in it. It loads no scripts from any server, includes no CDN
<script> tags, uses no eval(), no new Function(), no importScripts() of a remote URL, no remotely
hosted WebAssembly, and no remote module imports. It makes no network requests at all: it declares
no host permissions and never contacts any server, including the developer's.

The scripts injected with chrome.scripting.executeScript are files inside this package
(src/lib/markdown.js, src/content/html2md.js, src/content/extract.js, src/content/convert.js) and
are listed in the package for review. Injecting packaged scripts into a tab is not remote code.

Note also that the extension reads HTML from the pages the user captures. That HTML is parsed as
data and converted to Markdown text; it is never evaluated or executed as script.
```

**繁體中文（自用參考）**

```
不使用遠端程式碼。本擴充功能執行的所有 JavaScript、HTML 與 CSS 都包含在上傳的封裝檔中，可直接檢閱。
不從任何伺服器載入腳本、沒有 CDN 的 <script>、不使用 eval()、new Function()、遠端 importScripts()、
遠端 WebAssembly 或遠端模組匯入。完全不發出網路請求：未宣告任何主機權限，也從不連線任何伺服器（含開發者自己的）。

以 chrome.scripting.executeScript 注入的腳本都是封裝檔內的檔案（src/lib/markdown.js、
src/content/html2md.js、src/content/extract.js、src/content/convert.js），可在封裝檔中檢閱。
把封裝檔內的腳本注入分頁不屬於遠端程式碼。

另外，本擴充功能會讀取使用者擷取頁面的 HTML；那些 HTML 是當成資料解析並轉換成 Markdown 文字，
絕不會被求值或當成腳本執行。
```

---

## Data usage certification

On the same tab you must tick the certification checkboxes. For this extension:

- Do **not** tick any "I collect …" data category. The extension collects nothing.
- Tick: *I do not sell or transfer user data to third parties, outside of approved use cases.*
- Tick: *I do not use or transfer user data for purposes that are unrelated to my item's single purpose.*
- Tick: *I do not use or transfer user data to determine creditworthiness or for lending purposes.*
- Provide the privacy policy URL (see `PRIVACY_POLICY.md`).
