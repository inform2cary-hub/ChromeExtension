/**
 * 介面語言（英文 / 繁體中文）。
 *
 * 與「目標語言」是兩回事：targetLang 決定網頁要被翻成哪一種語言，
 * 這裡的 lang 只決定擴充功能自己的按鈕、提示與錯誤訊息用哪一種語言呈現。
 *
 * 與 chrome.i18n 的分工：
 *   - chrome.i18n + _locales 只負責「跟著瀏覽器語言走」的部分，也就是
 *     manifest 裡的擴充功能名稱、描述、快捷鍵說明，以及商店上架資訊。
 *   - 這個模組負責介面文字，因為 chrome.i18n 無法在執行期切換語言，
 *     而使用者要能在設定頁自己選。
 *
 * 語言存在設定物件的 lang 欄位（與其他設定共用一份 storage），
 * 載入設定後呼叫 setLang() 再 applyDom() 即可。
 * 預設英文，所以 HTML 內建的文字就寫英文，英文使用者不會看到切換閃爍。
 */
(function (root) {
  'use strict';

  const DEFAULT_LANG = 'en';

  const LANGS = [
    { id: 'en', label: 'English' },
    { id: 'zh-TW', label: '繁體中文' }
  ];

  const MESSAGES = {
    en: {
      'app.name': 'AI Bilingual Translate',
      'app.logo': 'AI',
      'app.optionsTitle': 'AI Bilingual Translate — Settings',

      'popup.loading': 'Loading…',
      'popup.openSettings': 'Open settings',
      'popup.translate': 'Translate this page',
      'popup.showOriginal': 'Show original (turn translation off)',
      'popup.ready': 'Ready',
      'popup.retryFailed': 'Retry the blocks that failed',
      'popup.targetLang': 'Target language',
      'popup.style': 'Display style',
      'popup.autoHost': 'Translate this site automatically ({host})',
      'popup.thisPage': 'this page',
      'popup.shortcut': 'Shortcut',
      'popup.allSettings': 'All settings',
      'popup.noModel': 'no model set',
      'popup.notRunYet': 'Not translated on this page yet',
      'popup.doneN': '{n} translated',
      'popup.workingN': '{n} in progress',
      'popup.failedN': '{n} failed',
      'popup.statusSep': ', ',
      'popup.activeIdle': 'Translation is on — scrolling keeps it going',
      'popup.needKeyOpen': 'No API key yet. Open the settings page and add one.',
      'popup.needKey': 'No API key yet. Open the settings page first.',
      'popup.working': 'Working…',
      'popup.toggleFailed': 'Could not switch translation on or off',
      'popup.noContact': 'Could not reach the page. Reload it and try again.',
      'popup.langUpdated': 'Target language is now {lang}',
      'popup.styleUpdated': 'Display style updated',
      'popup.autoOn': '{host} will be translated automatically from now on',
      'popup.autoOff': 'Automatic translation turned off for {host}',
      'popup.unsupported': 'This page cannot be translated (only http, https and local files are supported).',

      'options.lead': 'Pick an AI service, paste in an API key, and any page becomes a bilingual read — rewritten to sound natural, not translated word for word.',
      'options.saved': 'Saved',
      'options.language': 'Interface language',
      'options.languageHint': 'Sets the language of this extension’s own buttons and messages. What web pages get translated into is the “Target language” setting below.',

      'options.sec1': '1. AI service',
      'options.providerAria': 'AI service',
      'options.apiKey': 'API key',
      'options.apiKeyPh': 'Paste your API key',
      'options.showKeyAria': 'Show or hide the API key',
      'options.show': 'Show',
      'options.hide': 'Hide',
      'options.baseUrl': 'Base URL',
      'options.model': 'Model',
      'options.modelPh': 'Model name',
      'options.fetchModels': 'Fetch list',
      'options.fetching': 'Fetching…',
      'options.headers': 'Headers (optional)',
      'options.addHeader': '+ Add header',
      'options.headersHint': 'Some services — a company OpenWebUI gateway, for instance — need an extra HTTP header before they will serve a model, such as <code>X-OpenWebUI-User-Email</code>.',
      'options.headerKeyPh': 'Header name, e.g. X-OpenWebUI-User-Email',
      'options.headerValuePh': 'Header value',
      'options.headerRemoveAria': 'Remove this header',
      'options.test': 'Test the connection and translate a sample',
      'options.testing': 'Testing…',
      'options.grant': 'Grant access to this domain',
      'options.keyHintLocal': 'Most local servers need nothing here. If yours was started with a key (the --api-key flag of llama.cpp or vLLM), leaving this blank gives a 401, so paste it in.',
      'options.keyHintLink': 'The key stays in this browser and is never uploaded. Get one at: ',
      'options.keyHintPlain': 'The key stays in this browser and is never uploaded.',
      'options.baseHintGemini': 'Usually needs no change; /v1beta/models/{model}:generateContent is appended for you.',
      'options.baseHintLocal': 'Must be an OpenAI-compatible endpoint — {BaseURL}/chat/completions is what gets called. If it is not localhost (a LAN address such as http://10.0.0.5:8090/v1), press “Grant access to this domain” below first.',
      'options.baseHintOpenai': 'Must be an OpenAI-compatible endpoint — {BaseURL}/chat/completions is what gets called.',
      'options.modelHintSuggested': 'Suggested: {list}',
      'options.modelHintFetch': 'Press “Fetch list” to ask the service which models it offers.',
      'options.listSep': ', ',

      'options.sec2': '2. Translation quality',
      'options.targetLang': 'Target language',
      'options.tone': 'Tone',
      'options.toneHint': 'Steers the rewriting: technical keeps terminology consistent, casual reads more relaxed.',
      'options.domainHint': 'Subject hint (optional)',
      'options.domainHintPh': 'e.g. LLM inference and GPU hardware, financial reports, medical papers',
      'options.domainHintHint': 'Tell the model what the site is about and the terminology comes out sharper.',
      'options.skipSameLanguage': 'Skip blocks already in the target language',
      'options.minChars': 'Minimum length to translate',
      'options.minCharsHint': 'Fragments shorter than this (menu labels, for example) are left alone.',

      'options.sec3': '3. Appearance',
      'options.style': 'Display style',
      'options.color': 'Translation colour',
      'options.fontScale': 'Translation text size:',
      'options.cjkFont': 'Use a Chinese font for translations (handy when the site font handles Chinese badly)',
      'options.previewTr': '最近我在公司把 Kimi K3 部署到 32 張 H100 GPU 上，但幾乎沒有人手邊有整座叢集。不過它屬於混合專家架構，每一層 896 位專家中，任一 token 只會觸發其中 16 位，其餘則靜靜留在磁碟裡。',

      'options.sec4': '4. Performance and model parameters',
      'options.lazyTranslate': 'Only translate what you scroll to (saves tokens; recommended)',
      'options.batchChars': 'Characters per batch',
      'options.batchCharsHint': 'Too large and the model truncates its answer; too small and the request count climbs.',
      'options.batchMaxItems': 'Blocks per batch',
      'options.concurrency': 'Parallel requests',
      'options.timeoutSec': 'Timeout (seconds)',
      'options.timeoutSecHint': 'Raise this for slower local models.',
      'options.disableThinking': 'Turn off thinking mode (local / custom endpoints): sends <code>chat_template_kwargs.enable_thinking=false</code>. Leave it on for a reasoning model and a single batch can take minutes and time out.',
      'options.thinkingLevel': 'Gemini thinking level',
      'options.thinkingLevelHint': 'Translation needs no deep reasoning; low or minimal is fastest.',
      'options.reasoningEffort': 'OpenAI reasoning_effort',
      'options.reasoningEffortHint': 'Dropped automatically when the model does not support it.',
      'options.temperature': 'temperature',
      'options.temperaturePh': 'Blank = the model’s own default',
      'options.temperatureHint': 'Best left blank for the Gemini 3 and GPT-5 families.',

      'options.sec5': '5. Automatic translation and exclusions',
      'options.autoTranslate': 'Translate every site automatically (keeps spending API quota — turn on with care)',
      'options.autoTranslateHosts': 'Domains to translate automatically (one per line)',
      'options.excludeHosts': 'Domains never to translate (one per line)',
      'options.skipSelectors': 'CSS selectors to skip',
      'options.skipSelectorsHint': 'Blocks matching these selectors are left untranslated (code blocks are skipped already).',

      'options.reset': 'Restore defaults',
      'options.resetConfirm': 'Restore every setting to its default value? Your API keys are cleared too.',
      'options.resetDone': 'Defaults restored.',
      'options.needGrantModels': 'Access to {url} has to be granted before the model list can be fetched.',
      'options.needGrantTest': 'Access to {url} has to be granted before the connection can be tested.',
      'options.fetchFailed': 'Could not fetch the model list:\n{message}',
      'options.unknownError': 'unknown error',
      'options.modelsFound': 'Found {count} models; they are now suggestions in the model field.',
      'options.requesting': 'Calling the AI service…',
      'options.testFailed': 'Test failed:\n{message}',
      'options.testOk': 'Connected: {provider} / {model} ({ms} ms)',
      'options.testSource': 'Source: {text}',
      'options.testTarget': 'Translation: {text}',
      'options.testTokens': 'tokens in {in} / out {out}',
      'options.stats': 'This browser session: {requests} requests · {segments} blocks translated · {cacheHits} cache hits · tokens in {tokensIn} / out {tokensOut} · {errors} errors',
      'options.grantOk': 'Access granted to {url}',
      'options.grantFail': 'Access was not granted, so a local or custom endpoint may not connect.',

      'provider.gemini': 'Google Gemini',
      'provider.geminiHint': 'Get an API key from Google AI Studio. The Flash and Flash-Lite models are fast and cheap, which suits whole-page translation.',
      'provider.openai': 'OpenAI',
      'provider.openaiHint': 'Luna is the high-throughput, low-cost tier and fits translation best; Terra and Sol are better but slower and pricier.',
      'provider.local': 'Local AI (Ollama / LM Studio / llama.cpp / vLLM)',
      'provider.localHint': 'Ollama defaults to http://localhost:11434/v1, LM Studio to http://localhost:1234/v1. Press “Fetch list” to ask the server for model names; a key is only needed if the server was started with one.',
      'provider.custom': 'Custom (OpenAI-compatible service)',
      'provider.customHint': 'OpenRouter, Groq, DeepSeek, Azure OpenAI, an Anthropic-compatible endpoint and so on — fill in the base URL and the model name.',

      'style.dashedUnderline': 'Dashed underline (default)',
      'style.dashedBox': 'Dashed box',
      'style.plain': 'Plain coloured text',
      'style.highlight': 'Tinted background',
      'style.quote': 'Coloured bar on the left',

      'lang.zhTW': 'Traditional Chinese (Taiwan)',
      'lang.zhHK': 'Traditional Chinese (Hong Kong)',
      'lang.zhCN': 'Simplified Chinese',
      'lang.en': 'English',
      'lang.ja': 'Japanese',
      'lang.ko': 'Korean',
      'lang.fr': 'French',
      'lang.de': 'German',
      'lang.es': 'Spanish',
      'lang.vi': 'Vietnamese',

      'tone.natural': 'Natural and readable (recommended)',
      'tone.technical': 'Technical documentation',
      'tone.academic': 'Academic',
      'tone.casual': 'Casual and conversational',
      'tone.news': 'News reporting',

      'think.default': 'Model default',
      'think.minimal': 'minimal (fastest)',
      'think.low': 'low (recommended)',
      'think.medium': 'medium',
      'think.high': 'high (slowest)',

      'effort.default': 'Model default',
      'effort.none': 'none (recommended, fastest)',
      'effort.minimal': 'minimal',
      'effort.low': 'low',
      'effort.medium': 'medium',
      'effort.high': 'high',

      'hud.failed': 'Translation failed (hover to see why)',
      'hud.unknownError': 'Unknown error',
      'hud.retry': 'Retry',
      'hud.close': 'Dismiss',
      'hud.translating': 'Translating {done}/{total}',
      'hud.doneN': '{done} blocks translated',
      'hud.failedSuffix': ', {failed} failed',
      'hud.retryN': 'Retry {failed}',

      'content.noBackground': 'Could not reach the extension’s background service. Reload the page and try again.',
      'content.noTranslation': 'The model returned no translation for this block',

      'sw.notAllowed': 'This page does not allow extensions to run (a Chrome built-in page or the Web Store, for example).',
      'sw.noContact': 'Could not reach the page. Reload it and try again.',
      'sw.unknownMessage': 'Unknown message type: {type}',
      'sw.menuToggle': 'Turn bilingual translation on or off (Alt+T)',
      'sw.menuOptions': 'AI Bilingual Translate settings…',

      'err.timeout': 'The AI service did not answer within {sec} seconds (request timed out).\nThe usual cause is a local reasoning model writing a long chain of thought first.\nTick “Turn off thinking mode” in the settings, lower “Characters per batch”, or raise “Timeout (seconds)”.',
      'err.timeoutRaw': 'request timed out',
      'err.network': 'Could not reach the AI service: {message}\nCheck that the base URL is right and the service is running, and grant access to the domain on the settings page.',
      'err.auth': 'The API key is invalid or lacks permission (HTTP {status}): {message}',
      'err.notFound': 'Endpoint or model not found (HTTP 404): {message}\nCheck the base URL and the model name.',
      'err.tooLarge': 'The request is too large (HTTP 413). Lower “Characters per batch” in the settings.',
      'err.rateLimit': 'Too many requests, or quota exhausted (HTTP 429): {message}\nLower “Parallel requests” and try again.',
      'err.server': 'The AI service is having trouble (HTTP {status}): {message}',
      'err.other': '{message} (HTTP {status})',
      'err.blocked': 'Gemini’s safety filter blocked this content ({reason}), so this batch was skipped.',
      'err.truncatedTokens': 'The model’s answer was cut off (MAX_TOKENS). Lower “Characters per batch” in the settings.',
      'err.truncatedLength': 'The model’s answer was cut off (length). Lower “Characters per batch” in the settings.',
      'err.noContentGemini': 'The model returned nothing (finishReason: {reason}).',
      'err.noContentOpenai': 'The model returned nothing (finish_reason: {reason}).',
      'err.geminiRetryFailed': 'The Gemini request failed even after removing the unsupported parameters.',
      'err.retryFailed': 'The request failed even after removing the unsupported parameters.',
      'err.noBaseUrl': 'No base URL yet. Fill one in on the settings page.',
      'err.noBaseUrlShort': 'No base URL set.',
      'err.noModel': 'No model name yet. Fill one in on the settings page.',
      'err.noKey': 'No API key for {provider} yet. Fill one in on the settings page.',
      'err.needKeyModels': 'An API key is needed before the model list can be fetched.',
      'err.openaiCompatible': 'OpenAI-compatible service',
      'err.parseFailed': 'The model’s reply could not be parsed (both the JSON and the numbered-line protocol were tried).\nLower “Blocks per batch” to 1–3, or switch to a model that follows instructions more closely.\nThe reply started with: {output}'
    },

    'zh-TW': {
      'app.name': 'AI 雙語翻譯',
      'app.logo': '譯',
      'app.optionsTitle': 'AI 雙語翻譯 - 設定',

      'popup.loading': '載入中…',
      'popup.openSettings': '開啟設定',
      'popup.translate': '翻譯此頁',
      'popup.showOriginal': '顯示原文（關閉翻譯）',
      'popup.ready': '準備就緒',
      'popup.retryFailed': '重試失敗的段落',
      'popup.targetLang': '目標語言',
      'popup.style': '對照樣式',
      'popup.autoHost': '此網站自動翻譯（{host}）',
      'popup.thisPage': '此頁',
      'popup.shortcut': '快捷鍵',
      'popup.allSettings': '完整設定',
      'popup.noModel': '未設定模型',
      'popup.notRunYet': '尚未在此頁執行翻譯',
      'popup.doneN': '已翻譯 {n} 段',
      'popup.workingN': '進行中 {n} 段',
      'popup.failedN': '失敗 {n} 段',
      'popup.statusSep': '，',
      'popup.activeIdle': '翻譯已開啟，捲動頁面會繼續翻譯',
      'popup.needKeyOpen': '尚未設定 API Key，請先開啟設定頁填入。',
      'popup.needKey': '尚未設定 API Key，請先開啟設定頁。',
      'popup.working': '處理中…',
      'popup.toggleFailed': '切換失敗',
      'popup.noContact': '無法與頁面溝通，請重新載入頁面。',
      'popup.langUpdated': '目標語言已更新為 {lang}',
      'popup.styleUpdated': '對照樣式已更新',
      'popup.autoOn': '之後開啟 {host} 會自動翻譯',
      'popup.autoOff': '已取消 {host} 的自動翻譯',
      'popup.unsupported': '此頁面不支援翻譯（僅支援 http / https / 本機檔案）。',

      'options.lead': '選擇 AI 服務、填入 API Key，即可把網頁翻成中英對照，並自動做語法潤飾。',
      'options.saved': '已儲存',
      'options.language': '介面語言',
      'options.languageHint': '這裡只改擴充功能本身的介面文字；網頁要翻成哪一種語言，請用下方的「目標語言」。',

      'options.sec1': '1. AI 服務',
      'options.providerAria': 'AI 服務',
      'options.apiKey': 'API Key',
      'options.apiKeyPh': '貼上 API Key',
      'options.showKeyAria': '顯示或隱藏 API Key',
      'options.show': '顯示',
      'options.hide': '隱藏',
      'options.baseUrl': 'Base URL',
      'options.model': '模型',
      'options.modelPh': '模型名稱',
      'options.fetchModels': '取得清單',
      'options.fetching': '查詢中…',
      'options.headers': '標頭（選填）',
      'options.addHeader': '+ 新增標頭',
      'options.headersHint': '有些服務（例如企業內部的 OpenWebUI 閘道）需要額外的 HTTP 表頭才能取用模型，例如 <code>X-OpenWebUI-User-Email</code>。',
      'options.headerKeyPh': '標頭名稱，例如 X-OpenWebUI-User-Email',
      'options.headerValuePh': '標頭內容',
      'options.headerRemoveAria': '刪除此標頭',
      'options.test': '測試連線並試譯',
      'options.testing': '測試中…',
      'options.grant': '授權存取此網域',
      'options.keyHintLocal': '多數地端服務可留空；若伺服器啟用了金鑰（llama.cpp / vLLM 的 --api-key），沒填會出現 401，請在此貼上。',
      'options.keyHintLink': '金鑰只存在本機瀏覽器，不會上傳。申請位置：',
      'options.keyHintPlain': '金鑰只存在本機瀏覽器，不會上傳。',
      'options.baseHintGemini': '一般不需修改；本層會自動接上 /v1beta/models/{model}:generateContent。',
      'options.baseHintLocal': '需為 OpenAI 相容端點，本層會呼叫 {BaseURL}/chat/completions。若不是 localhost（例如區網 IP http://10.0.0.5:8090/v1），必須先按下方「授權存取此網域」。',
      'options.baseHintOpenai': '需為 OpenAI 相容端點，本層會呼叫 {BaseURL}/chat/completions。',
      'options.modelHintSuggested': '建議：{list}',
      'options.modelHintFetch': '可按「取得清單」向服務端查詢可用模型。',
      'options.listSep': '、',

      'options.sec2': '2. 翻譯品質',
      'options.targetLang': '目標語言',
      'options.tone': '語氣風格',
      'options.toneHint': '影響潤飾方向，例如技術文件會保持術語一致、口語風格會更輕鬆。',
      'options.domainHint': '領域提示（選填）',
      'options.domainHintPh': '例如：大型語言模型推論與 GPU 硬體、金融財報、醫學論文',
      'options.domainHintHint': '告訴模型這個網站的主題，術語會更準確。',
      'options.skipSameLanguage': '跳過已是目標語言的段落',
      'options.minChars': '最短翻譯字數',
      'options.minCharsHint': '低於這個長度的片段（例如選單文字）不翻譯。',

      'options.sec3': '3. 顯示樣式',
      'options.style': '對照樣式',
      'options.color': '譯文顏色',
      'options.fontScale': '譯文字級：',
      'options.cjkFont': '譯文使用中文字型（原站字型不適合中文時勾選）',
      'options.previewTr': '最近我在公司把 Kimi K3 部署到 32 張 H100 GPU 上，但幾乎沒有人手邊有整座叢集。不過它屬於混合專家架構，每一層 896 位專家中，任一 token 只會觸發其中 16 位，其餘則靜靜留在磁碟裡。',

      'options.sec4': '4. 效能與模型參數',
      'options.lazyTranslate': '只翻譯捲動到的區域（省 token，建議開啟）',
      'options.batchChars': '每批字元數',
      'options.batchCharsHint': '太大容易被模型截斷，太小會增加請求次數。',
      'options.batchMaxItems': '每批段落數',
      'options.concurrency': '同時請求數',
      'options.timeoutSec': '逾時（秒）',
      'options.timeoutSecHint': '地端模型較慢時可調高。',
      'options.disableThinking': '關閉思考模式（地端／自訂端點）：送出 <code>chat_template_kwargs.enable_thinking=false</code>。reasoning 模型若不關閉，翻譯一批可能要好幾分鐘而逾時。',
      'options.thinkingLevel': 'Gemini 思考等級',
      'options.thinkingLevelHint': '翻譯不需要深度推理，low 或 minimal 最快。',
      'options.reasoningEffort': 'OpenAI reasoning_effort',
      'options.reasoningEffortHint': '不支援時會自動略過此參數。',
      'options.temperature': 'temperature',
      'options.temperaturePh': '留空＝使用模型預設',
      'options.temperatureHint': 'Gemini 3 與 GPT-5 系列建議留空。',

      'options.sec5': '5. 自動翻譯與排除規則',
      'options.autoTranslate': '所有網站自動翻譯（會持續消耗 API 額度，請謹慎開啟）',
      'options.autoTranslateHosts': '自動翻譯的網域（一行一個）',
      'options.excludeHosts': '永不翻譯的網域（一行一個）',
      'options.skipSelectors': '跳過的 CSS 選擇器',
      'options.skipSelectorsHint': '符合這些選擇器的區塊不會被翻譯（程式碼區塊已預設跳過）。',

      'options.reset': '恢復預設值',
      'options.resetConfirm': '確定要恢復所有設定的預設值嗎？API Key 也會一併清除。',
      'options.resetDone': '已恢復預設值。',
      'options.needGrantModels': '需要授權存取 {url} 才能查詢模型清單。',
      'options.needGrantTest': '需要授權存取 {url} 才能連線測試。',
      'options.fetchFailed': '取得模型清單失敗：\n{message}',
      'options.unknownError': '未知錯誤',
      'options.modelsFound': '找到 {count} 個可用模型，已加入模型欄位的下拉建議。',
      'options.requesting': '正在請求 AI 服務…',
      'options.testFailed': '測試失敗：\n{message}',
      'options.testOk': '連線成功：{provider} / {model}（{ms} ms）',
      'options.testSource': '原文：{text}',
      'options.testTarget': '譯文：{text}',
      'options.testTokens': 'tokens 輸入 {in}、輸出 {out}',
      'options.stats': '本次瀏覽器工作階段：請求 {requests} 次 · 譯出 {segments} 段 · 快取命中 {cacheHits} 段 · tokens 輸入 {tokensIn} / 輸出 {tokensOut} · 錯誤 {errors} 次',
      'options.grantOk': '已授權存取 {url}',
      'options.grantFail': '未取得授權，地端或自訂端點可能無法連線。',

      'provider.gemini': 'Google Gemini',
      'provider.geminiHint': '在 Google AI Studio 申請 API Key，Flash / Flash-Lite 系列速度快、成本低，適合整頁翻譯。',
      'provider.openai': 'OpenAI',
      'provider.openaiHint': 'Luna 為高吞吐低成本層級，最適合翻譯；Terra / Sol 品質更高但較慢較貴。',
      'provider.local': '地端 AI（Ollama / LM Studio / llama.cpp / vLLM）',
      'provider.localHint': 'Ollama 預設 http://localhost:11434/v1；LM Studio 預設 http://localhost:1234/v1。模型名稱請按「取得清單」向伺服器查詢；伺服器若有設 API Key 才需要填。',
      'provider.custom': '自訂（OpenAI 相容服務）',
      'provider.customHint': 'OpenRouter、Groq、DeepSeek、Azure OpenAI、Anthropic 相容端點等，填入 Base URL 與模型名稱即可。',

      'style.dashedUnderline': '虛線底線（預設）',
      'style.dashedBox': '虛線外框',
      'style.plain': '純色文字',
      'style.highlight': '淡色底',
      'style.quote': '左側色條',

      'lang.zhTW': '繁體中文（臺灣）',
      'lang.zhHK': '繁體中文（香港）',
      'lang.zhCN': '簡體中文',
      'lang.en': 'English',
      'lang.ja': '日本語',
      'lang.ko': '한국어',
      'lang.fr': 'Français',
      'lang.de': 'Deutsch',
      'lang.es': 'Español',
      'lang.vi': 'Tiếng Việt',

      'tone.natural': '自然流暢（推薦）',
      'tone.technical': '專業技術文件',
      'tone.academic': '學術嚴謹',
      'tone.casual': '輕鬆口語',
      'tone.news': '新聞報導',

      'think.default': '模型預設',
      'think.minimal': 'minimal（最快）',
      'think.low': 'low（推薦）',
      'think.medium': 'medium',
      'think.high': 'high（最慢）',

      'effort.default': '模型預設',
      'effort.none': 'none（推薦，最快）',
      'effort.minimal': 'minimal',
      'effort.low': 'low',
      'effort.medium': 'medium',
      'effort.high': 'high',

      'hud.failed': '翻譯失敗（滑鼠移上看原因）',
      'hud.unknownError': '未知錯誤',
      'hud.retry': '重試',
      'hud.close': '關閉提示',
      'hud.translating': '翻譯中 {done}/{total}',
      'hud.doneN': '已完成 {done} 段',
      'hud.failedSuffix': '，失敗 {failed} 段',
      'hud.retryN': '重試 {failed} 段',

      'content.noBackground': '無法連線到擴充功能背景服務，請重新載入頁面後再試。',
      'content.noTranslation': '模型沒有回傳這一段的譯文',

      'sw.notAllowed': '此頁面不允許執行擴充功能（例如 Chrome 內建頁面或商店頁面）。',
      'sw.noContact': '無法與頁面溝通，請重新載入頁面後再試。',
      'sw.unknownMessage': '未知的訊息類型：{type}',
      'sw.menuToggle': '切換此頁的雙語翻譯（Alt+T）',
      'sw.menuOptions': 'AI 雙語翻譯設定…',

      'err.timeout': 'AI 服務在 {sec} 秒內沒有回應（請求逾時）。\n常見原因：地端模型是 reasoning 模型，會先產生大量思考內容。\n請到設定頁勾選「關閉思考模式」、降低「每批字元數」，或提高「逾時（秒）」。',
      'err.timeoutRaw': '請求逾時',
      'err.network': '無法連線到 AI 服務：{message}\n請確認 Base URL 正確、服務已啟動，並在設定頁授權此網域的存取權限。',
      'err.auth': 'API Key 無效或沒有權限（HTTP {status}）：{message}',
      'err.notFound': '找不到端點或模型（HTTP 404）：{message}\n請檢查 Base URL 與模型名稱。',
      'err.tooLarge': '單次請求過大（HTTP 413），請在設定頁降低「每批字元數」。',
      'err.rateLimit': '請求過於頻繁或額度不足（HTTP 429）：{message}\n可降低「同時請求數」後再試。',
      'err.server': 'AI 服務暫時異常（HTTP {status}）：{message}',
      'err.other': '{message}（HTTP {status}）',
      'err.blocked': '內容被 Gemini 安全機制封鎖（{reason}），已跳過此批段落。',
      'err.truncatedTokens': '模型輸出被截斷（MAX_TOKENS），請在設定頁降低「每批字元數」。',
      'err.truncatedLength': '模型輸出被截斷（length），請在設定頁降低「每批字元數」。',
      'err.noContentGemini': '模型沒有回傳內容（finishReason: {reason}）。',
      'err.noContentOpenai': '模型沒有回傳內容（finish_reason: {reason}）。',
      'err.geminiRetryFailed': 'Gemini 請求失敗，已嘗試移除不支援的參數仍無法完成。',
      'err.retryFailed': '請求失敗，已嘗試移除不支援的參數仍無法完成。',
      'err.noBaseUrl': '尚未設定 Base URL，請先到設定頁填寫。',
      'err.noBaseUrlShort': '尚未設定 Base URL。',
      'err.noModel': '尚未設定模型名稱，請先到設定頁填寫。',
      'err.noKey': '尚未設定 {provider} 的 API Key，請先到設定頁填寫。',
      'err.needKeyModels': '請先填入 API Key 才能取得模型清單。',
      'err.openaiCompatible': 'OpenAI 相容服務',
      'err.parseFailed': '模型回傳的格式無法解析（已依序嘗試 JSON 與編號行協定）。\n請把「每批段落數」降到 1～3，或改用指令遵循能力較好的模型。\n模型實際輸出開頭：{output}'
    }
  };

  let current = DEFAULT_LANG;

  /** 'zh_TW'、'zh-tw'、'zh' 一律視為繁體中文，其餘退回英文 */
  function normalize(lang) {
    const value = String(lang || '').replace('_', '-').toLowerCase();
    if (value.startsWith('zh')) return 'zh-TW';
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    current = normalize(lang);
    return current;
  }

  function getLang() {
    return current;
  }

  function t(key, params) {
    const table = MESSAGES[current] || MESSAGES[DEFAULT_LANG];
    let text = table[key];
    if (text === undefined) text = MESSAGES[DEFAULT_LANG][key];
    if (text === undefined) return key;
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (match, name) =>
        params[name] === undefined ? match : String(params[name]));
    }
    return text;
  }

  /** constants.js 只存 labelKey，顯示時才翻譯，這樣常數表不必依賴語言狀態 */
  function localizeList(list) {
    return list.map((item) => Object.assign({}, item, { label: t(item.labelKey) }));
  }

  /**
   * 部分說明文字含 <code> 片段。這裡自己拆成文字節點與 <code> 元素，
   * 不用 innerHTML，避免無謂的注入面（也讓商店審查少一個問號）。
   */
  function setRich(el, text) {
    el.textContent = '';
    const parts = String(text).split(/<code>([\s\S]*?)<\/code>/);
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (i % 2 === 1) {
        const code = el.ownerDocument.createElement('code');
        code.textContent = parts[i];
        el.appendChild(code);
      } else {
        el.appendChild(el.ownerDocument.createTextNode(parts[i]));
      }
    }
  }

  const ATTR_MAP = [
    ['data-i18n-title', 'title'],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-ph', 'placeholder']
  ];

  function applyDom(scope) {
    const node = scope || document;
    for (const el of node.querySelectorAll('[data-i18n]')) {
      const text = t(el.getAttribute('data-i18n'));
      if (text.indexOf('<code>') >= 0) setRich(el, text);
      else el.textContent = text;
    }
    for (const [attr, target] of ATTR_MAP) {
      for (const el of node.querySelectorAll('[' + attr + ']')) {
        el.setAttribute(target, t(el.getAttribute(attr)));
      }
    }
    if (node === document || !scope) {
      document.documentElement.lang = current;
      const title = document.querySelector('title[data-i18n]');
      if (title) document.title = t(title.getAttribute('data-i18n'));
    }
  }

  root.AITI18N = {
    DEFAULT_LANG,
    LANGS,
    MESSAGES,
    normalize,
    setLang,
    getLang,
    t,
    localizeList,
    applyDom
  };
})(typeof self !== 'undefined' ? self : this);
