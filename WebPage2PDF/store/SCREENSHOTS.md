# Screenshot Plan — Web Page to PDF

**Target size: 1280×800 PNG.** Use it for every shot — the store also accepts 640×400, but mixing
sizes makes the carousel jump. 1–5 screenshots allowed; the plan below is 5, and the first is the
one that sells the extension because it is the thumbnail on the listing card.

## What makes a good Chrome Web Store screenshot

- **It must be real.** Store policy requires screenshots to show the extension's actual
  functionality. No mockups, no collages of icons and slogans, no "before/after" marketing panels,
  no stock photography. Take the screenshots by actually using the extension.
- **One idea per image.** A viewer gives each about a second.
- **Show the extension, not just a web page.** Every shot should contain some visible part of the
  extension — the popup, the options page, the exported PDF.
- **Readable at thumbnail size.** The popup is ~360 px wide; do not shoot it floating alone in a
  1280×800 frame. Compose it against the page it is acting on.
- **A caption strip is allowed and helps** — a solid band across the top or bottom with one short
  line of text. Keep it plain. Do not cover the UI with it.
- **Use a neutral, non-controversial demo page.** A public technical article or documentation page
  works well. Avoid anything with a login, personal data, or a recognisable individual's content.
  Avoid pages with visible ads.
- **Keep the browser clean.** Hide your bookmarks bar, close unrelated tabs, use a fresh profile
  with no other extensions pinned.

---

## Screenshot 1 — The popup on a real article (the hero shot)

**Capture:** A content-rich public article open in Chrome, with the extension popup open over the
right-hand side of the page. The popup shows the header ("Web Page to PDF" + the current page
line), the blue **Convert to PDF** button, the status line reading *Ready*, and the visible option
rows: Paper, Orientation, Margins, Scale, Page range, plus the checkbox list (Print backgrounds,
Add header & footer, Main content only, Unstick fixed/floating elements, Force light background,
Use screen styles, Scroll to load images, Always ask where to save) and the filename preview line
at the bottom.

**Why:** It shows the whole product in one frame — one button, and every control a user would want,
without a settings trip.

**Caption (EN):**
```
Everything you need in one click — paper, margins, page range, and a clean-up pass.
```

**Caption (ZH-TW):**
```
一鍵完成：紙張、邊界、頁面範圍與轉檔前的頁面整理，全在這裡。
```

---

## Screenshot 2 — The result: selectable text in the PDF

**Capture:** The exported PDF open in a PDF viewer, with a sentence of body text **selected
(highlighted)** and, if you can fit it, the viewer's find bar open with a search term showing a
match count. Split the frame if it helps: original page on the left, PDF on the right at the same
scroll position.

**Why:** This is the single strongest differentiator against screenshot-based "page to PDF" tools,
and it is the claim the whole listing rests on. Prove it visually.

**Caption (EN):**
```
Real text, not a picture — select it, search it, copy it. Links still work.
```

**Caption (ZH-TW):**
```
輸出的是真正的文字，不是圖片 —— 可選取、可搜尋、可複製，連結照樣能點。
```

---

## Screenshot 3 — Main-content-only cleanup, side by side

**Capture:** Left half: a busy article page as it appears in the browser, with navigation bar,
sidebar, related-posts block, and a sticky header. Right half: the exported PDF of the same page
with **Main content only** and **Unstick fixed/floating elements** enabled, showing just the
article. Use the same page in both halves and a thin divider between them.

**Why:** This is the feature people feel the most. "I printed a page and got three pages of menus"
is the pain; this is the fix.

**Caption (EN):**
```
Main content only — the article, without the navigation, sidebars and sticky banners.
```

**Caption (ZH-TW):**
```
只輸出主要內容 —— 只留文章本文，捨棄導覽、側欄與黏在畫面上的橫幅。
```

---

## Screenshot 4 — Headers, footers, and bookmarks

**Capture:** The exported PDF open with the viewer's **bookmarks / outline panel expanded on the
left**, showing entries generated from the page's heading levels, and a page visible on the right
where the header (title / URL) and footer (date / "page X of Y") are legible. Zoom so the header
and footer text is actually readable — this shot fails if it is too small to read.

**Why:** Shows the output is a real document, not a dump — and the outline panel is instantly
recognisable to anyone who works with PDFs.

**Caption (EN):**
```
Headers, footers, page numbers, and a bookmark outline built from the page's own headings.
```

**Caption (ZH-TW):**
```
頁首頁尾、頁碼，以及依網頁標題層級自動產生的書籤大綱。
```

---

## Screenshot 5 — The options page

**Capture:** The options page scrolled to show section **1. Filename and save location** (filename
template with the `{title}` `{host}` `{date}` token hints and the live filename preview) and the
top of **2. Header and footer**, with the four corner dropdowns visible. Include the page header
with the title and version number so it is clearly this extension.

**Why:** Signals depth to the users who care, and honesty to the reviewer — it shows the settings
match what the description promised.

**Caption (EN):**
```
Filename templates, header and footer fields, tagged PDF, and your own clean-up rules.
```

**Caption (ZH-TW):**
```
檔名樣板、頁首頁尾欄位、標記式 PDF，以及你自己的頁面整理規則。
```

---

## One deliberate decision: the debugging infobar

While an export runs, Chrome shows its own **"Web Page to PDF is debugging this browser"** bar at
the top of the tab. If it appears in a screenshot, **leave it in.** Editing it out to make the
product look tidier is the kind of thing a reviewer reads as concealment, and users who see it for
the first time in the wild — with no warning — are the ones who leave one-star reviews.

If you want to address it head-on, add a sixth screenshot: the infobar visible during an export,
captioned:

**EN:** `Chrome tells you whenever the print engine is in use. It detaches the moment the PDF is done.`

**ZH-TW:** `使用列印引擎時 Chrome 會主動告知；PDF 一產生完成就立刻中止連線。`

That turns the one scary-looking thing about the extension into a trust signal. Recommended.

---

## Production notes

- Take shots on a **standard 100% zoom, 1280×800 browser window** so no downscaling is needed.
  On a HiDPI display, capture at 2560×1600 and downscale to 1280×800 for a sharper result.
- Screenshot the same demo page throughout so the set reads as one story.
- Save as PNG. Keep each file under a few hundred KB.
- If you localise screenshots for the `zh-TW` locale, switch the extension UI to Traditional Chinese
  on the options page first and retake all five — do not mix languages within one locale's set.
