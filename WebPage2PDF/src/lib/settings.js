/**
 * 設定的預設值與讀寫工具（chrome.storage.local）。
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'w2pSettings';

  const DEFAULTS = {
    version: 1,

    // 介面語言（'en' | 'zh-TW'）；預設英文
    lang: 'en',

    // 版面
    paper: 'A4',
    customWidth: 210,
    customHeight: 297,
    orientation: 'portrait',
    marginPreset: 'default',
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    scale: 100,
    pageRanges: '',
    preferCSSPageSize: false,

    // 內容
    printBackground: true,
    emulateScreenMedia: false,
    mainContentOnly: false,
    removeFixed: true,
    forceLightBackground: false,
    expandLazyContent: true,
    expandDetails: true,
    removeSelectors: '',
    settleMs: 400,

    // 頁首頁尾
    headerFooter: false,
    headerLeft: 'title',
    headerRight: 'date',
    footerLeft: 'url',
    footerRight: 'pageOfTotal',
    headerFooterFontPt: 8,

    // PDF 結構
    taggedPdf: true,
    documentOutline: true,

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

  root.W2PSettings = { STORAGE_KEY, DEFAULTS, load, save, reset, merge, onChanged };
})(typeof self !== 'undefined' ? self : this);
