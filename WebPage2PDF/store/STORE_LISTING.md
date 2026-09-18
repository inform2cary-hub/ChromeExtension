# Chrome Web Store Listing — Web Page to PDF

Paste the **English** blocks into the default (English) locale of the Developer Dashboard,
and the **Traditional Chinese** blocks into the `zh-TW` locale.

> **Name and short description are not dashboard fields.** The store shows the item title from the
> manifest `name` and the summary from the manifest `description`, localized through
> `_locales/en/messages.json` and `_locales/zh_TW/messages.json`. Both are already set in the package
> to exactly the values in §1 and §2 — those sections are here so you can see what the store will show.
> Only §3 onward is pasted into the dashboard.
>
> 名稱與簡短描述不是 Dashboard 的欄位：商店標題來自 manifest 的 `name`、摘要來自 `description`，
> 由 `_locales` 在地化。套件裡已經設成 §1、§2 的值，這兩節只是讓你看商店會顯示什麼；§3 起才是貼進 Dashboard 的內容。

> Reminder: the store listing must describe what the extension actually does. Everything below
> is checked against the shipped code — do not add claims when editing.

---

## 1. Extension name

**English** (45 chars — limit 75)

```
Web Page to PDF — Selectable, Searchable Text
```

Alternative if you prefer a plain name:

```
Web Page to PDF
```

**繁體中文** (limit 75)

```
網頁轉 PDF — 文字可選取、可搜尋
```

Alternative:

```
網頁轉 PDF
```

Notes: avoid stuffing the name with keywords ("PDF converter save print download page"). The store
treats a keyword-loaded name as a policy violation, and a clean name reads better on the card.

---

## 2. Short description / summary

**HARD LIMIT: 132 characters.**

**English** (118 chars)

```
Save any web page as a real PDF with selectable, searchable text. Paper size, margins, headers, footers and bookmarks.
```

**繁體中文** (51 chars)

```
把目前的網頁轉成文字可選取、可搜尋的 PDF。可設定紙張、邊界、頁首頁尾與書籤，並只輸出文章主要內容。
```

---

## 3. Detailed description

### English

```
Turn the page you are reading into a proper PDF — one where you can select the text, search it,
copy from it, and follow the links. Not a screenshot in a PDF wrapper.

Web Page to PDF drives Chrome's own print engine, the same pipeline Chrome uses when you choose
"Save as PDF" from the print dialog. That means the output is real, structured text: searchable,
copyable, and accessible to screen readers.

WHAT YOU GET

• Text you can actually use — select it, search it, quote it. Links stay clickable.
• Paper and layout control — A3, A4, A5, B4, B5, Letter, Legal, Tabloid, or a custom size in
  millimetres. Portrait or landscape. Margin presets, or set each of the four edges yourself.
  Scale the output and export only the pages you want (for example "1-5, 8").
• Headers and footers — put the page title, URL, date, page number, or "page X of Y" in any of
  the four corners, at the point size you choose.
• Automatic page cleanup before export — drop navigation and sidebars and keep just the article,
  unstick floating headers that otherwise repeat on every page, force a white background so dark
  sites do not print as a wall of black, expand collapsed sections, scroll the page first so
  lazy-loaded images are actually there, and hide anything else you name with a CSS selector.
• Accessible, navigable PDFs — tagged PDF output carries the document's semantic structure, and
  an optional bookmark outline is built from the page's own heading levels.
• Filename templates — build names from {title}, {host}, {date}, {datetime} and more, and drop
  everything into a subfolder of your downloads folder.
• Fast paths — the toolbar button, a right-click menu item, or Alt+P.

HOW IT WORKS, AND WHY IT ASKS FOR "DEBUGGER"

Chrome exposes its print-to-PDF engine only through the Chrome DevTools Protocol, and the only
API Chrome gives an extension to reach that protocol is chrome.debugger. So when you press
Export, the extension attaches to that one tab, asks Chrome to print it, and detaches
immediately — success or failure. Chrome shows its own "is debugging this browser" bar the whole
time, so you always know. Nothing else is done with that access: no reading other tabs, no
watching network traffic, no staying attached in the background.

PRIVACY

Everything happens on your computer. The extension has no server, makes no network requests, and
collects nothing. Your settings live in your browser's local storage. Page content never leaves
the machine.

LANGUAGES

The interface is available in English and Traditional Chinese. English is the default; switch it
on the options page.

GOOD TO KNOW

Chrome's own pages (chrome://), the Web Store, and other extension pages cannot be exported —
the browser blocks extensions there. For those, the popup offers a fallback that opens Chrome's
normal print dialog. If a tab already has DevTools open, close it first: only one debugger can be
attached to a tab at a time.
```

### 繁體中文

```
把正在讀的網頁轉成真正的 PDF —— 文字可以選取、可以搜尋、可以複製，連結也還能點。不是把畫面截圖塞進 PDF。

這個擴充功能走的是 Chrome 內建的列印引擎，也就是你在列印對話框選「另存為 PDF」時的同一條管線，所以輸出的是有結構的文字，
搜尋得到、複製得出來，螢幕閱讀器也讀得懂。

功能

• 真正的文字：可選取、可搜尋、可引用，連結保持可點。
• 版面完全可控：A3、A4、A5、B4、B5、Letter、Legal、Tabloid，或自訂 mm 尺寸；直向或橫向；邊界可用預設，也可以四邊各自指定。
  還能縮放比例，或只輸出指定頁數（例如「1-5, 8」）。
• 頁首頁尾：標題、網址、日期、頁碼、「第 X 頁／共 Y 頁」可放進四個角落，字級自己決定。
• 轉檔前自動整理頁面：捨棄導覽與側欄只留文章本文、把固定浮動的頁首改成靜態（否則每頁都會重複）、強制白底黑字
  （深色網站不會印出一整片黑）、展開折疊區塊、先捲動整頁把延遲載入的圖片載進來，還能用 CSS 選擇器指定其他要隱藏的區塊。
• 無障礙與導覽：標記式 PDF 會帶入文件的語意結構；也可依網頁本身的標題層級自動產生書籤大綱。
• 檔名樣板：用 {title}、{host}、{date}、{datetime} 等欄位組檔名，並可指定下載資料夾底下的子資料夾。
• 三種啟動方式：工具列圖示、右鍵選單，或 Alt+P。

運作方式，以及為什麼需要「偵錯工具」權限

Chrome 的列印引擎只能透過 Chrome DevTools Protocol 呼叫，而 Chrome 提供給擴充功能存取這個協定的唯一介面就是
chrome.debugger。所以你按下轉檔時，擴充功能會附加到那一個分頁、請 Chrome 列印，然後立刻卸離 —— 成功或失敗都一樣。
過程中 Chrome 會自己顯示「正在偵錯這個瀏覽器」的提示列，你隨時看得到。這個權限不會被用在其他地方：不讀其他分頁、
不攔截網路流量、不會在背景一直掛著。

隱私

一切都在你的電腦上完成。沒有伺服器、不發出任何網路請求、不蒐集任何資料。設定存在瀏覽器的本機儲存空間，
網頁內容不會離開這台機器。

語言

介面提供英文與繁體中文，預設為英文，可在設定頁切換。

使用前須知

Chrome 內建頁面（chrome://）、線上應用程式商店與其他擴充功能的頁面無法轉檔，這是瀏覽器的限制；遇到這種頁面，
彈出視窗提供改用 Chrome 列印對話框的備案。若該分頁已開著開發人員工具請先關閉 —— 一個分頁同時只能連一個除錯器。
```

---

## 4. Category recommendation

**Primary: `Tools`**

Why: the extension is a single-step utility that acts on the page in front of you and produces a
file. It is not a workflow or planning product, not a developer tool (developers are not the
audience — the `debugger` permission is an implementation detail, not a feature), and not
accessibility-specific. `Tools` is where users look for page capture and file conversion.

**Alternative: `Workflow & Planning`** — defensible if you want to position it around research and
archiving. Pick one and keep it consistent with the screenshots and description.

---

## 5. Search-relevant terms (already woven into the copy above)

Do **not** paste these as a list anywhere. Keyword stuffing in the name, summary, or description is
an explicit Chrome Web Store policy violation. They are recorded here only so you can check that the
prose above covers them naturally:

save page as PDF · web page to PDF · searchable PDF · selectable text PDF · print to PDF ·
article to PDF · paper size and margins · headers and footers · page range · tagged PDF ·
PDF bookmarks · reader mode PDF · archive a web page

Each of these appears in the detailed description as part of a real sentence about a real feature.
If you rewrite the copy, keep it that way.

---

## 6. Single purpose statement

The dashboard asks for one narrow, easily understood purpose. Paste exactly this:

**English**

```
This extension has a single purpose: to convert the web page in the user's active tab into a PDF file using Chrome's built-in print engine, and save that file to the user's computer.
```

**繁體中文（自用參考）**

```
本擴充功能只有單一用途：使用 Chrome 內建的列印引擎，把使用者目前分頁的網頁轉換成 PDF 檔並儲存到使用者的電腦。
```

Keep this sentence identical wherever it appears — the single-purpose field, the permission
justifications, and the privacy policy. Reviewers cross-read them.
