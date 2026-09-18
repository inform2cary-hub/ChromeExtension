# Chrome Web Store Listing — AI Bilingual Translate

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

> Everything below is checked against the shipped code. This extension transmits page text to a
> third-party API, so the listing must not overstate or understate that. Do not soften it when
> editing.

---

## 1. Extension name

**English** (47 chars — limit 75)

```
AI Bilingual Translate — Bring Your Own API Key
```

Alternative if you prefer a plain name:

```
AI Bilingual Translate
```

**繁體中文** (limit 75)

```
AI 雙語翻譯 — 用你自己的 API Key
```

Alternative:

```
AI 雙語翻譯
```

Notes: "Bring Your Own API Key" is doing real work here — it sets the expectation that the user
supplies credentials, which reduces one-star "it doesn't work" reviews. Do not pad the name with
"translator translate page Gemini GPT ChatGPT"; keyword-loaded names are a policy violation.

---

## 2. Short description / summary

**HARD LIMIT: 132 characters.**

**English** (122 chars)

```
Bilingual AI page translation using your own Gemini, OpenAI or local model. Natural phrasing, original text kept in place.
```

**繁體中文** (54 chars)

```
用你自己的 Gemini、OpenAI 或地端模型翻譯網頁，原文與譯文雙語對照。強調語意潤飾，不做逐字直譯。
```

---

## 3. Detailed description

### English

```
Read the original and the translation at the same time — the source paragraph stays exactly where
it is, and the translation appears directly beneath it. Nothing is replaced, so you can always
check what a sentence actually said.

And the translation reads like something a person wrote. The prompt asks the model to understand
the paragraph first and then re-express it, reordering clauses, splitting sentences that are too
long, and supplying the subjects and connectives the target language needs. Word-for-word output
is explicitly ruled out.

YOU BRING THE AI

This extension has no service behind it. You choose the provider and supply your own key, and
requests go from your browser straight to that provider:

• Google Gemini
• OpenAI
• A model running on your own machine or network — Ollama, LM Studio, llama.cpp, vLLM, or anything
  else speaking the OpenAI-compatible API
• Any other OpenAI-compatible endpoint you name, including a company gateway

Pick a model from a list fetched live from the provider rather than a hardcoded one that goes
stale, and add custom HTTP headers if your gateway needs them. With a local model, nothing leaves
your machine at all.

BUILT FOR REAL PAGES

• Translates what you can see. Paragraphs are translated as you scroll, so a long page does not
  cost you a fortune in tokens up front.
• Keeps up with the page. Infinite scroll and content loaded after the fact are picked up
  automatically.
• Knows what not to translate. Code blocks, input fields, editable regions, hidden elements,
  pure numbers and symbols, and text already in your target language are all skipped.
• Caches. A repeated paragraph is not paid for twice.
• Recovers instead of failing. If an endpoint rejects a parameter, the extension drops it and
  retries rather than failing the batch; rate limits and server errors back off exponentially;
  and if a model writes malformed JSON, the output protocol steps down to a simpler format that
  small models follow more reliably. Whichever protocol works is remembered for that model.
• Tells you when something broke. A progress chip in the corner shows what is happening, and
  failed paragraphs can be retried from it.

TUNE IT

Choose the tone — natural, technical, academic, conversational, or journalistic — and give the
model a domain hint like "LLM inference and GPU hardware" so it picks the right terminology. Five
bilingual display styles, CSS selectors for regions to leave alone, and auto-translate either
everywhere or only on domains you choose.

Alt+T translates the page. Alt+T again hides the translation — without spending another request.

PRIVACY, PLAINLY

To translate text, that text has to be sent to the AI service you configured. That is the whole
transaction, and you should know exactly what it means:

• The text of the paragraphs being translated is sent to the provider you chose, with your key.
• Nothing else goes with it — not the page URL, not the page title, not any identifier for you.
• The developer runs no server and receives nothing. There is no telemetry and no analytics.
• Your API key is stored locally in your browser and is never synced. Requests are made from the
  background worker, so web pages cannot reach your key.
• If you point the extension at a local model, the text never leaves your computer.

Your data is then handled under your chosen provider's terms. Read them, and read the extension's
privacy policy before installing.

LANGUAGES

The interface is available in English and Traditional Chinese. English is the default; switch it
on the options page.

GOOD TO KNOW

You need an API key before this does anything — get one from Google AI Studio or the OpenAI
platform, or run a local model. The options page has a "Test connection" button that translates a
sample so you can confirm the setup before you rely on it. Content inside iframes is not
translated; only the top-level page is.
```

### 繁體中文

```
原文與譯文同時讀 —— 原本的段落留在原處，譯文接在它下面。沒有任何內容被取代，所以你隨時可以回頭確認原文到底怎麼寫。

而且譯文讀起來像人寫的。提示詞要求模型先讀懂整段再重新表達：調整語序、拆開太長的句子、補上目標語言需要的主詞與連接詞。
逐字直譯是被明確禁止的。

AI 由你自己帶

這個擴充功能背後沒有任何服務。你選擇服務商、填入自己的金鑰，請求直接從你的瀏覽器送到該服務：

• Google Gemini
• OpenAI
• 跑在你自己電腦或區網上的模型 —— Ollama、LM Studio、llama.cpp、vLLM，或任何支援 OpenAI 相容 API 的服務
• 其他你自己指定的 OpenAI 相容端點，包含公司內部的閘道

模型清單可以直接向服務端即時查詢，不必遷就內建的過時清單；閘道若需要額外的 HTTP 表頭也能自己加。
用地端模型時，資料完全不會離開你的機器。

為真實網頁而設計

• 只翻看得到的內容：邊捲邊翻，長頁面不會一開始就燒掉大量 token。
• 跟得上頁面變化：無限捲動與事後才載入的內容都會自動處理。
• 知道什麼不該翻：程式碼區塊、輸入框、可編輯區域、隱藏元素、純數字與符號，以及本來就是目標語言的段落，一律跳過。
• 會快取：重複的段落不會付兩次錢。
• 出錯時會自己想辦法：端點不支援某個參數時會移除該參數重試，而不是讓整批失敗；遇到流量限制與伺服器錯誤會指數退避；
  模型寫壞 JSON 時，輸出協定會自動退階成小模型更容易遵循的簡單格式。哪一種協定行得通會被記住，同一個模型之後直接用它。
• 出問題會告訴你：右下角的進度提示條顯示目前狀態，失敗的段落可以直接在那裡重試。

可以調整

語氣風格可選自然流暢、專業技術文件、學術嚴謹、輕鬆口語或新聞報導；也可以給模型領域提示（例如「大型語言模型推論與 GPU 硬體」），
讓術語更準確。五種雙語對照樣式、可用 CSS 選擇器指定不翻譯的區塊，自動翻譯可以全站啟用，也可以只對你指定的網域啟用。

Alt+T 翻譯整頁，再按一次 Alt+T 收起譯文 —— 不會多花一次請求。

隱私，講清楚

要翻譯文字，那些文字就必須送到你設定的 AI 服務。這就是整筆交易，你應該確切知道它的內容：

• 送出的是要翻譯的段落文字，連同你的金鑰，送到你自己選擇的服務商。
• 不會附帶其他東西 —— 不送網頁網址、不送網頁標題、不送任何關於你的識別資訊。
• 開發者沒有架設任何伺服器，也不會收到任何東西。沒有遙測、沒有分析。
• 你的 API Key 存在本機瀏覽器內，不做同步。請求由背景 service worker 發出，網頁環境拿不到金鑰。
• 若你把擴充功能指向地端模型，文字完全不會離開你的電腦。

之後你的資料就依你所選服務商的條款處理。請先閱讀那些條款，也請在安裝前閱讀本擴充功能的隱私權政策。

語言

介面提供英文與繁體中文，預設為英文，可在設定頁切換。

使用前須知

沒有 API Key 就無法運作 —— 請到 Google AI Studio 或 OpenAI 平台申請，或自己跑一個地端模型。設定頁有「測試連線並試譯」
按鈕，會實際翻一小段回來，讓你在正式使用前先確認設定無誤。iframe 內的內容不會翻譯，目前只處理最上層頁面。
```

---

## 4. Category recommendation

**Primary: `Tools`**

Why: users looking for a page translator browse `Tools`. The extension is a general-purpose utility
that acts on the page in front of you, and the bring-your-own-key model makes it a power-user tool
rather than an accessibility aid.

**Alternative: `Accessibility`** — defensible, since reading content in a second language is an
access problem for many users. But `Accessibility` sets an expectation of screen-reader and
assistive-technology support that this extension does not specifically target, so `Tools` is the
honest fit.

Avoid `Developer Tools` even though the audience skews technical; the product translates web pages,
it does not help you build them.

---

## 5. Search-relevant terms (already woven into the copy above)

Do **not** paste these as a list. Keyword stuffing is an explicit Chrome Web Store policy
violation. Recorded here only so you can confirm the prose covers them naturally:

bilingual translation · translate web page · AI page translator · side-by-side translation ·
Gemini translation · OpenAI translation · local LLM translation · Ollama · LM Studio ·
OpenAI-compatible endpoint · bring your own API key · natural translation not literal ·
Traditional Chinese translation

Each appears in the description inside a real sentence about a real feature. Keep it that way — and
note that provider names (Google, Gemini, OpenAI) must be used descriptively, to say what the
extension connects to. Never imply endorsement, partnership, or affiliation, and do not use their
logos in your icon or promo tiles.

---

## 6. Single purpose statement

Paste exactly this:

**English**

```
This extension has a single purpose: to translate the text of the web page in the user's active tab using an AI service that the user selects and configures with their own API key, and to display each translation directly beneath its original paragraph as a bilingual view.
```

**繁體中文（自用參考）**

```
本擴充功能只有單一用途：使用由使用者自行選擇並以自己的 API Key 設定的 AI 服務，翻譯使用者目前分頁的網頁文字，並把每段譯文顯示在對應原文段落的下方，形成雙語對照。
```

Keep this identical in the single-purpose field, the permission justifications, and the privacy
policy. Reviewers cross-read them, and for an extension that transmits page content off-device the
consistency matters more than usual.
