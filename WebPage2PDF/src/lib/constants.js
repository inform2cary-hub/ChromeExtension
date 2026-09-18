/**
 * 全域常數：紙張規格、邊界預設、訊息型別。
 * 由 service worker（importScripts）、popup、設定頁共用，
 * 因此使用傳統腳本 + 全域命名空間。
 */
(function (root) {
  'use strict';

  const MM_PER_INCH = 25.4;

  /**
   * 紙張尺寸一律以公釐定義（直向），輸出時再換算成 CDP 需要的英吋。
   * 顯示文字只存 labelKey，交給 i18n 在畫面上翻譯，常數表本身不依賴語言狀態。
   */
  const PAPERS = [
    { id: 'A4', labelKey: 'paper.a4', width: 210, height: 297 },
    { id: 'A3', labelKey: 'paper.a3', width: 297, height: 420 },
    { id: 'A5', labelKey: 'paper.a5', width: 148, height: 210 },
    { id: 'B4', labelKey: 'paper.b4', width: 250, height: 353 },
    { id: 'B5', labelKey: 'paper.b5', width: 176, height: 250 },
    { id: 'Letter', labelKey: 'paper.letter', width: 215.9, height: 279.4 },
    { id: 'Legal', labelKey: 'paper.legal', width: 215.9, height: 355.6 },
    { id: 'Tabloid', labelKey: 'paper.tabloid', width: 279.4, height: 431.8 },
    { id: 'custom', labelKey: 'paper.custom', width: 210, height: 297 }
  ];

  /** 邊界預設值（公釐） */
  const MARGIN_PRESETS = [
    { id: 'default', labelKey: 'margin.default', top: 10, right: 10, bottom: 10, left: 10 },
    { id: 'none', labelKey: 'margin.none', top: 0, right: 0, bottom: 0, left: 0 },
    { id: 'minimum', labelKey: 'margin.minimum', top: 4, right: 4, bottom: 4, left: 4 },
    { id: 'wide', labelKey: 'margin.wide', top: 20, right: 20, bottom: 20, left: 20 },
    { id: 'custom', labelKey: 'margin.custom', top: 10, right: 10, bottom: 10, left: 10 }
  ];

  const ORIENTATIONS = [
    { id: 'portrait', labelKey: 'orient.portrait' },
    { id: 'landscape', labelKey: 'orient.landscape' }
  ];

  /** 頁首頁尾可用的欄位 */
  const HF_FIELDS = [
    { id: 'none', labelKey: 'hf.none' },
    { id: 'title', labelKey: 'hf.title' },
    { id: 'url', labelKey: 'hf.url' },
    { id: 'date', labelKey: 'hf.date' },
    { id: 'page', labelKey: 'hf.page' },
    { id: 'pageOfTotal', labelKey: 'hf.pageOfTotal' }
  ];

  const MSG = {
    EXPORT: 'w2p/export',
    EXPORT_PROGRESS: 'w2p/progress',
    PRINT_DIALOG: 'w2p/printDialog',
    SETTINGS_GET: 'w2p/settings:get',
    SETTINGS_SET: 'w2p/settings:set',
    SETTINGS_RESET: 'w2p/settings:reset',
    OPEN_OPTIONS: 'w2p/openOptions',
    OFFSCREEN_BLOB: 'w2p/offscreen:blob',
    OFFSCREEN_REVOKE: 'w2p/offscreen:revoke'
  };

  const PREPARE_FILES = ['src/content/prepare.js'];
  const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

  /** 無法附加除錯器的網址（Chrome 內建頁面與商店） */
  function isBlockedUrl(url) {
    const value = String(url || '');
    if (!value) return true;
    if (/^(chrome|edge|about|devtools|view-source|chrome-extension|chrome-untrusted):/i.test(value)) return true;
    if (/^https?:\/\/chromewebstore\.google\.com/i.test(value)) return true;
    if (/^https?:\/\/chrome\.google\.com\/webstore/i.test(value)) return true;
    return false;
  }

  root.W2P_CONST = {
    MM_PER_INCH,
    PAPERS,
    MARGIN_PRESETS,
    ORIENTATIONS,
    HF_FIELDS,
    MSG,
    PREPARE_FILES,
    OFFSCREEN_PATH,
    isBlockedUrl
  };
})(typeof self !== 'undefined' ? self : this);
