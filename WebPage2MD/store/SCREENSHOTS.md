# Screenshot Plan — Web Page to Markdown

**Target size: 1280×800 PNG.** Use it for every shot — the store also accepts 640×400, but mixing
sizes makes the carousel jump. 1–5 screenshots allowed; the plan below is 5, and the first is the
thumbnail on the listing card, so it carries the most weight.

## What makes a good Chrome Web Store screenshot

- **It must be real.** Store policy requires screenshots to show actual functionality. No mockups,
  no collages of icons and slogans, no marketing panels. Take them by actually using the extension.
- **One idea per image.** A viewer gives each about a second.
- **Show the extension, not just a web page.** Every shot should contain a visible part of the
  extension — the popup, the preview tab, the options page, or the resulting file.
- **Readable at thumbnail size.** The popup is ~360 px wide; compose it against the page it is
  acting on rather than floating it alone in a 1280×800 frame.
- **A caption strip is allowed and helps** — a solid band across the top or bottom with one short
  line. Keep it plain; do not cover the UI.
- **Use a neutral, non-controversial demo page.** A public technical article or documentation page
  works well. Avoid logins, personal data, and visible ads.
- **Keep the browser clean.** Hide the bookmarks bar, close unrelated tabs, use a fresh profile with
  no other extensions pinned.

---

## Screenshot 1 — The popup on a real article (the hero shot)

**Capture:** A content-rich public article open in Chrome with the extension popup open over the
right side of the page. The popup shows the header ("Web Page to Markdown" + current page line),
the primary **Save as .md** button with **Copy** and **Preview** beside it, the status line reading
*Ready*, the three dropdown rows (Links, Images, Front matter), the checkbox list (Main content
only, Strip navigation and sidebars, Convert selection only, Add title heading, Convert tables,
Always ask where to save), and the filename preview line at the bottom.

**Why:** Three outputs and every meaningful option in one small panel. It shows the product is
finished, not a one-button toy.

**Caption (EN):**
```
Save, copy, or preview — with the options that matter right there in the popup.
```

**Caption (ZH-TW):**
```
存檔、複製或預覽 —— 常用選項就在彈出視窗裡，不必先跑一趟設定頁。
```

---

## Screenshot 2 — Side by side: the page and the Markdown it produced

**Capture:** Split frame. Left: the article in the browser, showing headings, a code block, a
table, and a sidebar or related-posts block. Right: the preview tab with the generated Markdown
source visible in the editor — the YAML front matter block at the top with `title`, `source`,
`author`, `date`, then the heading, the fenced code block with its language tag, and the pipe
table. Line up the two so the same section is visible in both.

**Why:** This is the proof. Everything the description claims about clean output is checkable in
one image, and the sidebar visible on the left but absent on the right makes the extraction
argument without a word of copy.

**Caption (EN):**
```
Front matter, headings, code fences and tables — and none of the sidebar.
```

**Caption (ZH-TW):**
```
Front matter、標題、程式碼圍籬與表格都在 —— 側欄則不會跟著進來。
```

---

## Screenshot 3 — The preview tab: fix it before you keep it

**Capture:** The preview tab filling the frame. Show the header with the document title and source
line, the **Select all / Copy / Save as .md** button row, the stats bar, and the editor with real
Markdown in it — ideally with the cursor placed mid-document so it is visibly editable.

**Why:** The preview is this extension's differentiator against one-shot clippers. "You can fix it
before you keep it" is the feature people stay for.

**Caption (EN):**
```
Preview the Markdown, edit anything that came out wrong, then save or copy.
```

**Caption (ZH-TW):**
```
先預覽 Markdown，把轉得不理想的地方改掉，再存檔或複製。
```

---

## Screenshot 4 — Selection capture

**Capture:** An article page with a few paragraphs **visibly highlighted (selected)**, and the
right-click context menu open showing **"Copy selection as Markdown"** among the extension's menu
items. If the selection highlight is hard to see at thumbnail size, choose a page with a light
background and select a generous block.

**Why:** It is the fastest interaction the extension offers and the one most people do not expect.
Showing it in the context menu also documents that the menu items exist.

**Caption (EN):**
```
Select a passage and right-click — only that passage becomes Markdown.
```

**Caption (ZH-TW):**
```
反白一段文字後按右鍵 —— 只有那一段會被轉成 Markdown。
```

---

## Screenshot 5 — The options page

**Capture:** The options page scrolled to show section **4. Front matter** with the individual
field toggles and the custom-YAML box, and either the top of **5. Filename and save location** (the
filename template with its `{title}` `{host}` `{date}` token hints and the live preview) or the
bottom of **3. Links and images**. Include the page header with the title and version number.

**Why:** Shows depth to the users who care, and honesty to the reviewer: the settings match what
the description promised.

**Caption (EN):**
```
Tune the front matter, link and image handling, syntax style, and filename template.
```

**Caption (ZH-TW):**
```
Front matter 欄位、連結與圖片處理、語法風格與檔名樣板，都可以自己調。
```

---

## Optional sixth shot: the honest failure mode

If you have a slot left, consider showing the status message the extension produces when it cannot
confidently identify the article and falls back to the whole page. Caption: *"When the page is too
ambiguous to call, it tells you and gives you everything — rather than quietly handing you a
fragment."* (ZH-TW: 「判斷不夠明確時會直接告訴你並輸出整頁，而不是默默給你一小段殘篇。」)

Most clippers hide this. Showing it builds more trust than another feature shot, and it
pre-empts the most common one-star review a content extractor gets.

---

## Production notes

- Take shots at **100% zoom in a 1280×800 browser window** so no downscaling is needed. On a HiDPI
  display, capture at 2560×1600 and downscale to 1280×800 for a sharper result.
- Use the same demo page throughout so the set reads as one story.
- Save as PNG, each file under a few hundred KB.
- If you localise screenshots for the `zh-TW` locale, switch the extension UI to Traditional Chinese
  on the options page first and retake all five — do not mix languages within one locale's set.
