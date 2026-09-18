# Chrome Web Store Listing — Web Page to Markdown

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

> Everything below is checked against the shipped code. Do not add claims when editing.

---

## 1. Extension name

**English** (44 chars — limit 75)

```
Web Page to Markdown — Clean Article Capture
```

Alternative if you prefer a plain name:

```
Web Page to Markdown
```

**繁體中文** (limit 75)

```
網頁轉 Markdown — 乾淨的文章擷取
```

Alternative:

```
網頁轉 Markdown
```

Notes: resist the urge to append "Obsidian Notion Hugo notes clipper converter". A keyword-loaded
name is a policy violation and makes the card look like spam.

---

## 2. Short description / summary

**HARD LIMIT: 132 characters.**

**English** (122 chars)

```
Capture any web page as clean Markdown. Main content only, YAML front matter, smart link and image handling. Save or copy.
```

**繁體中文** (67 chars)

```
把目前的網頁擷取成乾淨的 Markdown。自動只取文章主體，支援 YAML front matter、連結與圖片處理，可存檔或複製。
```

---

## 3. Detailed description

### English

```
Take the article you are reading and get Markdown you would have been happy to write yourself —
no navigation, no sidebar, no cookie banner, no "you might also like".

Web Page to Markdown finds the real content of a page, converts it, and hands it to you three
ways: saved as a .md file, copied to the clipboard, or opened in a preview tab where you can fix
anything before you keep it.

WHAT IT GETS RIGHT

• Just the article. The extension scores candidate containers by how much text they hold against
  how much of that text is links, and picks the article body. When the page is too ambiguous to
  call, it says so and gives you the whole page rather than quietly handing you a fragment.
• The structure survives. Headings, nested and ordered lists, task lists, blockquotes, tables
  (including alignment), fenced code blocks with a guessed language, images with captions,
  collapsible sections, and definition lists.
• Maths comes back as maths. MathML, KaTeX and MathJax are converted back to $LaTeX$ rather than
  the rendered soup you would get from a copy-paste.
• Links, your way. Inline, reference-style with the URLs collected at the end, bare <URL>, or
  stripped down to the text. Same for images: keep them, keep only the alt text, or drop them.
• Front matter that is actually useful. A YAML block with title, source URL, author, publication
  date, site name, capture time and tags — each field individually switchable, plus any custom
  YAML you want appended.
• Output that does not fight your editor. Escaping is applied only where it changes meaning, so
  snake_case stays snake_case and you do not get a file full of backslashes. Code fences grow to
  four backticks when the code itself contains three.
• Selection-aware. Highlight a passage and it converts just that passage.
• Filename templates from {title}, {host}, {date} and more, into a subfolder of your choice.
• Alt+M to save, Alt+Shift+M to copy, or use the toolbar button or the right-click menu.

IT DOES NOT TOUCH YOUR PAGE

The conversion runs on a copy of the page's node tree, not the page itself. When it finishes, the
live page has exactly the same DOM it had before — same node count, same HTML length. Nothing is
hidden, rewritten, or left behind.

PRIVACY

Everything happens in your browser. The extension has no server, makes no network requests, and
collects nothing. It asks for no host permissions, so it has no standing access to any site — it
reads a page only when you ask it to, on the tab you asked about. Your settings stay in your
browser's local storage.

LANGUAGES

The interface is available in English and Traditional Chinese. English is the default; switch it
on the options page.

GOOD TO KNOW

Chrome's own pages (chrome://), the Web Store, and other extension pages cannot be captured —
the browser blocks extensions there. Output is UTF-8 without a BOM, per Markdown convention.
```

### 繁體中文

```
把正在讀的文章變成你自己也會這樣寫的 Markdown —— 沒有導覽、沒有側欄、沒有 Cookie 提示、沒有「你可能也喜歡」。

這個擴充功能會找出頁面真正的內容、轉換它，然後用三種方式交給你：存成 .md 檔、複製到剪貼簿，或開一個預覽分頁，
讓你在留下它之前先改掉不滿意的地方。

它把這些事做對了

• 只取文章本體。擴充功能會比較候選區塊的文字量與其中的連結密度來評分，挑出文章本文。判斷不夠明確時會直接說明，
  並輸出整頁，而不是默默給你一小段殘篇。
• 結構完整保留：標題、巢狀與有序清單、待辦清單、引言、表格（含對齊）、含語言推測的程式碼圍籬、帶圖說的圖片、
  折疊區塊、定義清單。
• 數學式還是數學式。MathML、KaTeX、MathJax 會轉回 $LaTeX$，而不是像直接複製貼上那樣得到一堆渲染後的殘渣。
• 連結照你的方式處理：行內、參考式（網址集中在文末）、只留 <網址>，或只保留文字。圖片同理：保留、只留替代文字，
  或完全移除。
• 真正好用的 front matter：標題、原始網址、作者、發布時間、站名、擷取時間、標籤的 YAML 區塊，每個欄位都能單獨開關，
  也能自己追加任何 YAML。
• 輸出不會跟你的編輯器打架。只在會改變語意的地方做轉義，所以 snake_case 還是 snake_case，不會拿到滿是反斜線的檔案；
  程式碼本身含有三個反引號時，圍籬會自動加長到四個。
• 認得選取範圍：先反白一段文字，就只轉換那一段。
• 檔名樣板可用 {title}、{host}、{date} 等欄位，並可存進你指定的子資料夾。
• Alt+M 存檔、Alt+Shift+M 複製，也可以用工具列圖示或右鍵選單。

它不會動到你的頁面

轉換是在頁面節點樹的複本上進行，不是在頁面本身。結束後，實際頁面的 DOM 與先前完全相同 —— 節點數一樣、HTML 長度一樣。
沒有東西被隱藏、被改寫，也沒有殘留。

隱私

一切都在你的瀏覽器裡完成。沒有伺服器、不發出任何網路請求、不蒐集任何資料。它不要求任何主機權限，因此對任何網站
都沒有常駐存取權 —— 只有在你要求時，才讀取你指定的那一個分頁。設定留在瀏覽器的本機儲存空間。

語言

介面提供英文與繁體中文，預設為英文，可在設定頁切換。

使用前須知

Chrome 內建頁面（chrome://）、線上應用程式商店與其他擴充功能的頁面無法擷取，這是瀏覽器的限制。
輸出是不含 BOM 的 UTF-8，符合 Markdown 慣例。
```

---

## 4. Category recommendation

**Primary: `Tools`**

Why: this is a single-step capture utility. Users looking for it are searching for a page-to-file
converter, and `Tools` is the shelf they browse. It is not a developer tool (the audience is
note-takers and researchers, not people debugging code), and not a workflow product — it produces
one artefact and stops.

**Alternative: `Workflow & Planning`** — reasonable if you want to position it as part of a
note-taking pipeline (Obsidian, static-site publishing). Pick one and let the screenshots match it.

---

## 5. Search-relevant terms (already woven into the copy above)

Do **not** paste these as a list. Keyword stuffing is an explicit Chrome Web Store policy
violation. Recorded here only so you can confirm the prose covers them naturally:

web page to Markdown · save page as Markdown · article to Markdown · web clipper ·
clean Markdown export · YAML front matter · copy page as Markdown · reference-style links ·
Markdown tables · LaTeX from MathJax · main content extraction · notes capture

Each appears in the description inside a real sentence about a real feature. Keep it that way.

---

## 6. Single purpose statement

Paste exactly this:

**English**

```
This extension has a single purpose: to convert the web page in the user's active tab into a Markdown document, which the user can save as a .md file, copy to the clipboard, or review in a preview tab before saving.
```

**繁體中文（自用參考）**

```
本擴充功能只有單一用途：把使用者目前分頁的網頁轉換成 Markdown 文件，讓使用者存成 .md 檔、複製到剪貼簿，或在預覽分頁中確認後再儲存。
```

The three outputs are one purpose with three destinations, not three purposes — the sentence is
worded to make that obvious. Keep it identical in the single-purpose field, the permission
justifications, and the privacy policy.
