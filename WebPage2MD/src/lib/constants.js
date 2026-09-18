/**
 * 全域常數：選項清單、訊息型別、注入檔案清單。
 * 由 service worker（importScripts）、popup、設定頁、預覽頁共用，
 * 因此使用傳統腳本 + 全域命名空間。
 */
(function (root) {
  'use strict';

  /** 顯示文字只存 labelKey，交給 i18n 在畫面上翻譯，常數表本身不依賴語言狀態 */
  const BULLET_MARKERS = [
    { id: '-', labelKey: 'bullet.dash' },
    { id: '*', labelKey: 'bullet.star' },
    { id: '+', labelKey: 'bullet.plus' }
  ];

  const STRONG_MARKERS = [
    { id: '**', labelKey: 'strong.stars' },
    { id: '__', labelKey: 'strong.underscores' }
  ];

  const EMPHASIS_MARKERS = [
    { id: '_', labelKey: 'em.underscore' },
    { id: '*', labelKey: 'em.star' }
  ];

  const CODE_FENCES = [
    { id: '```', labelKey: 'fence.backtick' },
    { id: '~~~', labelKey: 'fence.tilde' }
  ];

  const HR_STYLES = [
    { id: '---', labelKey: 'hr.dash' },
    { id: '***', labelKey: 'hr.star' },
    { id: '___', labelKey: 'hr.underscore' }
  ];

  const HEADING_STYLES = [
    { id: 'atx', labelKey: 'heading.atx' },
    { id: 'atxClosed', labelKey: 'heading.atxClosed' }
  ];

  const LINK_STYLES = [
    { id: 'inline', labelKey: 'link.inline' },
    { id: 'referenced', labelKey: 'link.referenced' },
    { id: 'bare', labelKey: 'link.bare' },
    { id: 'strip', labelKey: 'link.strip' }
  ];

  const IMAGE_MODES = [
    { id: 'inline', labelKey: 'image.inline' },
    { id: 'alt', labelKey: 'image.alt' },
    { id: 'strip', labelKey: 'image.strip' }
  ];

  const FRONT_MATTER_MODES = [
    { id: 'none', labelKey: 'fm.none' },
    { id: 'yaml', labelKey: 'fm.yaml' }
  ];

  const MSG = {
    CONVERT: 'w2m/convert',
    SAVE: 'w2m/save',
    COPY: 'w2m/copy',
    PREVIEW: 'w2m/preview',
    PROGRESS: 'w2m/progress',
    SETTINGS_GET: 'w2m/settings:get',
    SETTINGS_SET: 'w2m/settings:set',
    SETTINGS_RESET: 'w2m/settings:reset',
    OPEN_OPTIONS: 'w2m/openOptions',
    OFFSCREEN_BLOB: 'w2m/offscreen:blob',
    OFFSCREEN_REVOKE: 'w2m/offscreen:revoke',
    OFFSCREEN_COPY: 'w2m/offscreen:copy'
  };

  /** 注入順序有依賴關係：markdown -> html2md -> extract -> convert */
  const CONTENT_FILES = [
    'src/lib/markdown.js',
    'src/content/html2md.js',
    'src/content/extract.js',
    'src/content/convert.js'
  ];

  const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';
  const PREVIEW_PATH = 'src/preview/preview.html';

  /** 預覽頁的資料放 session storage，不塞進網址，避免長文被截斷 */
  const PREVIEW_KEY = 'w2mPreview';

  const MARKDOWN_MIME = 'text/markdown;charset=utf-8';

  /** 擴充功能無法注入腳本的網址（Chrome 內建頁面與商店） */
  function isBlockedUrl(url) {
    const value = String(url || '');
    if (!value) return true;
    if (/^(chrome|edge|about|devtools|view-source|chrome-extension|chrome-untrusted):/i.test(value)) return true;
    if (/^https?:\/\/chromewebstore\.google\.com/i.test(value)) return true;
    if (/^https?:\/\/chrome\.google\.com\/webstore/i.test(value)) return true;
    return false;
  }

  root.W2M_CONST = {
    BULLET_MARKERS,
    STRONG_MARKERS,
    EMPHASIS_MARKERS,
    CODE_FENCES,
    HR_STYLES,
    HEADING_STYLES,
    LINK_STYLES,
    IMAGE_MODES,
    FRONT_MATTER_MODES,
    MSG,
    CONTENT_FILES,
    OFFSCREEN_PATH,
    PREVIEW_PATH,
    PREVIEW_KEY,
    MARKDOWN_MIME,
    isBlockedUrl
  };
})(typeof self !== 'undefined' ? self : this);
