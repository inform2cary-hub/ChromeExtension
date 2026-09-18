/**
 * 設定的預設值與讀寫工具。
 * 一律存在 chrome.storage.local（含 API Key，只留在本機瀏覽器設定檔內，不做同步）。
 */
(function (root) {
  'use strict';

  const C = root.AIT_CONST;
  const I18N = root.AITI18N;
  const STORAGE_KEY = 'aitSettings';

  function buildProviderDefaults() {
    const out = {};
    for (const id of C.PROVIDER_ORDER) {
      const meta = C.PROVIDERS[id];
      out[id] = {
        apiKey: '',
        model: meta.defaultModel,
        baseUrl: meta.defaultBaseUrl,
        // 自訂 HTTP 表頭，例如 { key: 'X-OpenWebUI-User-Email', value: 'you@example.com' }
        headers: []
      };
    }
    return out;
  }

  const DEFAULTS = {
    version: 1,
    provider: 'gemini',
    providers: buildProviderDefaults(),

    // 介面語言（與 targetLang 無關：這個只決定擴充功能自己的文字）
    lang: 'en',

    // 翻譯行為
    targetLang: 'zh-TW',
    tone: 'natural',
    domainHint: '',
    skipSameLanguage: true,
    minChars: 4,
    lazyTranslate: true,
    batchChars: 1800,
    batchMaxItems: 12,
    concurrency: 3,
    timeoutSec: 90,

    // 模型參數（null / '' 代表不送出，使用模型預設值）
    temperature: null,
    thinkingLevel: 'low',
    reasoningEffort: 'none',
    // 地端 / 自訂端點：送出 chat_template_kwargs.enable_thinking = false
    // reasoning 模型若不關閉思考，翻譯一批可能要花數分鐘而逾時
    disableThinking: true,

    // 外觀
    style: 'dashed-underline',
    color: '#2a6f97',
    fontScale: 1,
    cjkFont: false,

    // 自動翻譯
    autoTranslate: false,
    autoTranslateHosts: [],
    excludeHosts: [],
    skipSelectors: ''
  };

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  /** 以 DEFAULTS 為骨架深層合併，避免舊版設定缺欄位 */
  function merge(defaults, stored) {
    const out = Array.isArray(defaults) ? defaults.slice() : Object.assign({}, defaults);
    if (!isPlainObject(stored)) return out;
    for (const key of Object.keys(stored)) {
      const dv = defaults[key];
      const sv = stored[key];
      if (isPlainObject(dv) && isPlainObject(sv)) {
        out[key] = merge(dv, sv);
      } else if (sv !== undefined) {
        out[key] = sv;
      }
    }
    return out;
  }

  async function load() {
    const raw = await chrome.storage.local.get(STORAGE_KEY);
    return merge(DEFAULTS, raw && raw[STORAGE_KEY]);
  }

  async function save(patch) {
    const current = await load();
    const next = merge(current, patch);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  }

  /**
   * 介面語言刻意不跟著恢復預設：把只看得懂中文的使用者丟回英文介面，
   * 等於同時把「切回中文」的那個選單也變成他讀不懂的字。
   */
  async function reset() {
    const current = await load();
    const next = merge(DEFAULTS, { lang: current.lang });
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  }

  /** 取得目前服務商的可用連線設定（已套用預設值） */
  function activeProviderConfig(settings) {
    const id = C.PROVIDERS[settings.provider] ? settings.provider : 'gemini';
    const meta = C.PROVIDERS[id];
    const cfg = (settings.providers && settings.providers[id]) || {};
    return {
      id,
      kind: meta.kind,
      // 這裡就翻好，錯誤訊息與測試結果才不必各自處理 labelKey
      label: I18N.t(meta.labelKey),
      needsKey: meta.needsKey,
      apiKey: (cfg.apiKey || '').trim(),
      model: (cfg.model || meta.defaultModel || '').trim(),
      baseUrl: (cfg.baseUrl || meta.defaultBaseUrl || '').trim(),
      headers: Array.isArray(cfg.headers)
        ? cfg.headers
            .map((h) => ({ key: String((h && h.key) || '').trim(), value: String((h && h.value) || '').trim() }))
            .filter((h) => h.key)
        : []
    };
  }

  function onChanged(handler) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      handler(merge(DEFAULTS, changes[STORAGE_KEY].newValue));
    });
  }

  root.AITSettings = {
    STORAGE_KEY,
    DEFAULTS,
    load,
    save,
    reset,
    merge,
    activeProviderConfig,
    onChanged
  };
})(typeof self !== 'undefined' ? self : this);
