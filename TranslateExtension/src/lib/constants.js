/**
 * 全域常數：AI 服務商定義、顯示樣式、目標語言、語氣風格。
 * 同時被 service worker（importScripts）、content script、設定頁載入，
 * 因此使用傳統腳本 + 全域命名空間，不使用 ES module。
 *
 * 顯示文字一律只存 labelKey / hintKey，由 i18n.js 在顯示當下翻譯，
 * 常數表本身才不必跟著介面語言變動。
 */
(function (root) {
  'use strict';

  /**
   * kind 決定要用哪一種 API 協定：
   *   gemini  -> generativelanguage.googleapis.com generateContent
   *   openai  -> OpenAI 相容的 /chat/completions
   * 參考：
   *   https://ai.google.dev/gemini-api/docs/models
   *   https://developers.openai.com/api/docs/models
   */
  const PROVIDERS = {
    gemini: {
      id: 'gemini',
      labelKey: 'provider.gemini',
      kind: 'gemini',
      needsKey: true,
      defaultBaseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: 'gemini-3.6-flash',
      suggestedModels: [
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite'
      ],
      keyUrl: 'https://aistudio.google.com/apikey',
      docsUrl: 'https://ai.google.dev/gemini-api/docs/models',
      hintKey: 'provider.geminiHint'
    },
    openai: {
      id: 'openai',
      labelKey: 'provider.openai',
      kind: 'openai',
      needsKey: true,
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5.6-luna',
      suggestedModels: [
        'gpt-5.6-luna',
        'gpt-5.6-terra',
        'gpt-5.6-sol',
        'gpt-5.6'
      ],
      keyUrl: 'https://platform.openai.com/api-keys',
      docsUrl: 'https://developers.openai.com/api/docs/models',
      hintKey: 'provider.openaiHint'
    },
    local: {
      id: 'local',
      labelKey: 'provider.local',
      kind: 'openai',
      needsKey: false,
      defaultBaseUrl: 'http://localhost:11434/v1',
      defaultModel: '',
      suggestedModels: [],
      keyUrl: '',
      docsUrl: 'https://ollama.com/',
      hintKey: 'provider.localHint'
    },
    custom: {
      id: 'custom',
      labelKey: 'provider.custom',
      kind: 'openai',
      needsKey: true,
      defaultBaseUrl: '',
      defaultModel: '',
      suggestedModels: [],
      keyUrl: '',
      docsUrl: '',
      hintKey: 'provider.customHint'
    }
  };

  const PROVIDER_ORDER = ['gemini', 'openai', 'local', 'custom'];

  const STYLES = [
    { id: 'dashed-underline', labelKey: 'style.dashedUnderline' },
    { id: 'dashed-box', labelKey: 'style.dashedBox' },
    { id: 'plain', labelKey: 'style.plain' },
    { id: 'highlight', labelKey: 'style.highlight' },
    { id: 'quote', labelKey: 'style.quote' }
  ];

  const LANGS = [
    { id: 'zh-TW', labelKey: 'lang.zhTW' },
    { id: 'zh-HK', labelKey: 'lang.zhHK' },
    { id: 'zh-CN', labelKey: 'lang.zhCN' },
    { id: 'en', labelKey: 'lang.en' },
    { id: 'ja', labelKey: 'lang.ja' },
    { id: 'ko', labelKey: 'lang.ko' },
    { id: 'fr', labelKey: 'lang.fr' },
    { id: 'de', labelKey: 'lang.de' },
    { id: 'es', labelKey: 'lang.es' },
    { id: 'vi', labelKey: 'lang.vi' }
  ];

  const TONES = [
    { id: 'natural', labelKey: 'tone.natural' },
    { id: 'technical', labelKey: 'tone.technical' },
    { id: 'academic', labelKey: 'tone.academic' },
    { id: 'casual', labelKey: 'tone.casual' },
    { id: 'news', labelKey: 'tone.news' }
  ];

  /** Gemini 3 系列的思考深度；空字串代表不送出此參數（用模型預設） */
  const THINKING_LEVELS = [
    { id: '', labelKey: 'think.default' },
    { id: 'minimal', labelKey: 'think.minimal' },
    { id: 'low', labelKey: 'think.low' },
    { id: 'medium', labelKey: 'think.medium' },
    { id: 'high', labelKey: 'think.high' }
  ];

  /** OpenAI reasoning_effort；空字串代表不送出 */
  const REASONING_EFFORTS = [
    { id: '', labelKey: 'effort.default' },
    { id: 'none', labelKey: 'effort.none' },
    { id: 'minimal', labelKey: 'effort.minimal' },
    { id: 'low', labelKey: 'effort.low' },
    { id: 'medium', labelKey: 'effort.medium' },
    { id: 'high', labelKey: 'effort.high' }
  ];

  const MSG = {
    PING: 'ait/ping',
    TOGGLE: 'ait/toggle',
    STATE: 'ait/state',
    RETRY_FAILED: 'ait/retryFailed',
    TRANSLATE: 'ait/translate',
    SETTINGS_GET: 'ait/settings:get',
    SETTINGS_SET: 'ait/settings:set',
    SETTINGS_RESET: 'ait/settings:reset',
    SETTINGS_CHANGED: 'ait/settings:changed',
    MODELS_LIST: 'ait/models:list',
    TEST: 'ait/test',
    OPEN_OPTIONS: 'ait/openOptions'
  };

  const CONTENT_FILES = [
    'src/lib/constants.js',
    'src/lib/i18n.js',
    'src/lib/settings.js',
    'src/content/extract.js',
    'src/content/render.js',
    'src/content/content.js'
  ];

  const CONTENT_CSS = ['src/content/content.css'];

  root.AIT_CONST = {
    PROVIDERS,
    PROVIDER_ORDER,
    STYLES,
    LANGS,
    TONES,
    THINKING_LEVELS,
    REASONING_EFFORTS,
    MSG,
    CONTENT_FILES,
    CONTENT_CSS
  };
})(typeof self !== 'undefined' ? self : this);
