/**
 * 設定的預設值與讀寫工具（chrome.storage.local）。
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'w2mSettings';

  const DEFAULTS = {
    version: 1,

    // 介面語言，跟著其他設定一起讀寫
    lang: 'en',

    // 內容範圍
    mainContentOnly: true,
    preferSelection: true,
    stripJunk: true,
    removeSelectors: '',
    includeTitle: true,
    expandLazyContent: false,
    settleMs: 0,

    // Markdown 樣式
    headingStyle: 'atx',
    bulletMarker: '-',
    strongMarker: '**',
    emphasisMarker: '_',
    codeFence: '```',
    hrStyle: '---',
    keepLineBreaks: true,
    gfmTables: true,
    strikethrough: true,
    taskLists: true,
    highlightMarker: false,
    mathAsTex: true,
    codeLanguageFromClass: true,

    // 連結與圖片
    linkStyle: 'inline',
    keepFragmentLinks: false,
    imageMode: 'inline',
    skipDataUrlImages: true,
    absoluteUrls: true,

    // Front matter
    frontMatter: 'yaml',
    fmTitle: true,
    fmSource: true,
    fmAuthor: true,
    fmPublished: true,
    fmDescription: false,
    fmSiteName: true,
    fmLang: false,
    fmCaptured: true,
    fmTags: false,
    frontMatterExtra: '',

    // 輸出
    filenameTemplate: '{title}',
    subfolder: '',
    saveAs: false
  };

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function merge(defaults, stored) {
    const out = Array.isArray(defaults) ? defaults.slice() : Object.assign({}, defaults);
    if (!isPlainObject(stored)) return out;
    for (const key of Object.keys(stored)) {
      const dv = defaults[key];
      const sv = stored[key];
      if (isPlainObject(dv) && isPlainObject(sv)) out[key] = merge(dv, sv);
      else if (sv !== undefined) out[key] = sv;
    }
    return out;
  }

  async function load() {
    const raw = await chrome.storage.local.get(STORAGE_KEY);
    return merge(DEFAULTS, raw && raw[STORAGE_KEY]);
  }

  async function save(patch) {
    const next = merge(await load(), patch);
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

  function onChanged(handler) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      handler(merge(DEFAULTS, changes[STORAGE_KEY].newValue));
    });
  }

  root.W2MSettings = { STORAGE_KEY, DEFAULTS, load, save, reset, merge, onChanged };
})(typeof self !== 'undefined' ? self : this);
