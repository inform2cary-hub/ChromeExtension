# Screenshot Plan — AI Bilingual Translate

**Target size: 1280×800 PNG.** Use it for every shot — the store also accepts 640×400, but mixing
sizes makes the carousel jump. 1–5 screenshots allowed; the plan below is 5, and the first is the
thumbnail on the listing card.

## What makes a good Chrome Web Store screenshot

- **It must be real.** Store policy requires screenshots to show actual functionality. No mockups,
  no collages of icons and slogans, no marketing panels. Take them by actually using the extension.
- **One idea per image.** A viewer gives each about a second.
- **Show the extension, not just a web page.** Every shot should contain a visible part of the
  extension — the inline translations, the popup, the options page, the progress chip.
- **Readable at thumbnail size.** The popup is ~360 px wide; compose it against the page it is
  acting on rather than floating it alone in the frame.
- **A caption strip is allowed and helps** — a solid band across the top or bottom with one short
  line. Keep it plain; do not cover the UI.
- **Keep the browser clean.** Hide the bookmarks bar, close unrelated tabs, use a fresh profile with
  no other extensions pinned.

## Two rules specific to this extension

1. **[BLOCKER] Blur or redact your API key** in any shot of the options page. Blur internal
   hostnames and LAN IP addresses too.
2. **No Google, Gemini, OpenAI, or ChatGPT logos or wordmarks** as artwork. Provider names appearing
   as plain text inside the extension's own dropdown are fine and unavoidable — that is the UI.
   Adding their logos to a caption strip or tile is not.

**Demo page choice:** use a public English-language technical article or documentation page with a
clear paragraph structure. Avoid logins, personal data, visible ads, and anything politically
charged — the translated text will be scrutinised as closely as the UI.

---

## Screenshot 1 — Bilingual translation in place (the hero shot)

**Capture:** A public English article translated into Traditional Chinese, filling the frame. Show
**at least three consecutive paragraphs** so the alternating rhythm is obvious: English paragraph,
Chinese translation directly beneath it in the accent colour with the dashed underline, English
paragraph, Chinese translation, and so on. Scroll to a section with normal prose, not headings or
lists.

**Why:** This is the product. Someone should understand the entire value proposition from the
thumbnail without reading a word of the caption. Do not put the popup in this shot — nothing should
compete with the text.

**Caption (EN):**
```
The original stays. The translation appears right beneath it — check any sentence, any time.
```

**Caption (ZH-TW):**
```
原文留在原處，譯文就接在下面 —— 任何一句都能隨時對照確認。
```

---

## Screenshot 2 — The popup

**Capture:** The same article with the extension popup open over the right side of the page. The
popup shows the header ("AI Bilingual Translate" + the provider line naming the configured
provider and model), the primary **Translate this page** button, the status line, and the three
rows: Target language, Bilingual style, and the "Auto-translate this site" checkbox with the
current hostname. Include the footer showing the Alt+T shortcut.

Take this one **while a translation is in progress** if you can, so the status line shows real
progress text rather than "Ready" — it looks alive.

**Why:** Shows how little there is to do: one button, and the two settings people actually change.

**Caption (EN):**
```
One button, or Alt+T. Pick a language and a style; turn on auto-translate per site.
```

**Caption (ZH-TW):**
```
一個按鈕，或按 Alt+T。選好語言與對照樣式，也能針對個別網站開啟自動翻譯。
```

---

## Screenshot 3 — Bring your own AI, including a local model

**Capture:** The options page, section **1. AI service**, showing the provider dropdown, the API
key field (**redacted**), the base URL, the model field with the **Fetch list** button, and the
**Test connection** button. The strongest version of this shot has the provider set to **Local AI**
with a localhost base URL, and the model dropdown populated with models fetched live from that
server — because it proves the local path is real, not a bullet point.

**Why:** "Bring your own key" and "works with a local model" are the two claims that differentiate
this from every server-backed translator on the store, and they are also the two claims a sceptical
user will most want evidence for.

**Caption (EN):**
```
Gemini, OpenAI, or a model on your own machine. Your key, your endpoint, your data.
```

**Caption (ZH-TW):**
```
Gemini、OpenAI，或你自己機器上的模型。你的金鑰、你的端點、你的資料。
```

---

## Screenshot 4 — Translation quality controls

**Capture:** The options page, section **2. Translation quality** — the tone selector (natural,
technical, academic, conversational, journalistic) and the domain hint field with a realistic value
filled in, for example `LLM inference and GPU hardware`. If the layout allows, include the top of
section **3. Display style** with its live preview so the reader sees a style being previewed
rather than just named.

**Why:** Separates this from generic machine translation. "Tell the model what the page is about
and it picks the right terminology" is a concrete, believable promise, and the domain hint field
with real text in it communicates it faster than a paragraph of copy.

**Caption (EN):**
```
Set the tone, and tell the model what the page is about — the terminology follows.
```

**Caption (ZH-TW):**
```
設定語氣風格，再告訴模型這篇在講什麼 —— 術語就會跟著對。
```

---

## Screenshot 5 — Progress and recovery

**Capture:** An article mid-translation with the **progress chip visible in the bottom-right
corner** showing its status text. The best version shows a state with at least one failed paragraph
so the **Retry** control is visible, and ideally one translated paragraph showing the failure
marker inline. If you cannot reproduce a failure naturally, use the in-progress state instead —
**do not fake an error state**.

**Why:** Every AI product fails sometimes, and users know it. Showing that failure is visible,
scoped to a paragraph, and one click from recovery is more persuasive than pretending it never
happens. It also pre-empts the most common one-star review.

**Caption (EN):**
```
You can see what it's doing — and retry just the paragraphs that failed.
```

**Caption (ZH-TW):**
```
過程看得見 —— 失敗的段落可以單獨重試，不必整頁重來。
```

---

## Alternative fifth shot, if you prefer

A side-by-side of the **five bilingual display styles** (dashed underline, dashed outline, solid
colour text, tinted background, left colour bar) applied to the same paragraph — taken from the live
preview on the options page, not assembled in an image editor. Caption:

**EN:** `Five ways to show the translation. Pick the one that disappears into the page for you.`

**ZH-TW:** `五種對照樣式，挑一個在你眼裡最不干擾閱讀的。`

Use this if you would rather lead with polish than with honesty about failure. Screenshot 5 as
originally specified is the better choice for building trust in an AI tool, but both are defensible.

---

## Production notes

- Take shots at **100% zoom in a 1280×800 browser window** so no downscaling is needed. On a HiDPI
  display, capture at 2560×1600 and downscale to 1280×800 for a sharper result.
- Use the same demo article throughout so the set reads as one story.
- Translate into **Traditional Chinese** for the screenshots in both locales — it demonstrates the
  extension's strongest output and is legible as "this is a translation" to an English-speaking
  viewer even if they cannot read it.
- Save as PNG, each file under a few hundred KB.
- If you localise screenshots for the `zh-TW` locale, switch the extension UI to Traditional Chinese
  on the options page first and retake all five — do not mix languages within one locale's set.
- **Re-check every image for a visible API key before uploading.** Zoom to 100% and look. This is
  the single most expensive mistake available in this plan.
