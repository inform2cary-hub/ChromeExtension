/**
 * 介面語言（英文 / 繁體中文）。
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
      'app.name': 'Web Page to PDF',
      'app.optionsTitle': 'Web Page to PDF — Settings',

      'popup.loading': 'Loading…',
      'popup.openSettings': 'Open settings',
      'popup.export': 'Convert to PDF',
      'popup.ready': 'Ready',
      'popup.paper': 'Paper',
      'popup.customMm': 'Custom mm',
      'popup.customWidth': 'Custom width (mm)',
      'popup.customHeight': 'Custom height (mm)',
      'popup.orientation': 'Orientation',
      'popup.margins': 'Margins',
      'popup.marginQuad': 'T R B L',
      'popup.marginTop': 'Top margin (mm)',
      'popup.marginRight': 'Right margin (mm)',
      'popup.marginBottom': 'Bottom margin (mm)',
      'popup.marginLeft': 'Left margin (mm)',
      'popup.scale': 'Scale %',
      'popup.pageRanges': 'Page range',
      'popup.pageRangesPh': 'Blank = all, e.g. 1-5, 8',
      'popup.printBackground': 'Print backgrounds and images',
      'popup.headerFooter': 'Add header and footer',
      'popup.mainContentOnly': 'Main content only',
      'popup.removeFixed': 'Unpin fixed / floating elements',
      'popup.forceLight': 'Force black text on white',
      'popup.emulateScreen': 'Use screen styles instead of print styles',
      'popup.expandLazy': 'Scroll the page first to load images',
      'popup.saveAs': 'Ask where to save every time',
      'popup.moreWays': 'Other ways',
      'popup.printDialog': "Use Chrome's print dialog instead",
      'popup.printDialogHint': 'A fallback for pages the debugger cannot attach to. Choose “Save as PDF” yourself in the dialog.',
      'popup.shortcut': 'Shortcut',
      'popup.allSettings': 'All settings',
      'popup.savesTo': 'Saves to: Downloads/{path}',
      'popup.badTemplate': '(invalid filename template)',
      'popup.headerMarginNote': 'Headers and footers need at least {mm} mm of top and bottom margin. This is adjusted automatically during export.',
      'popup.starting': 'Starting export…',
      'popup.exportFailed': 'Export failed',
      'popup.saved': 'Saved {name}',
      'popup.savedWithSize': 'Saved {name} ({kb} KB)',
      'popup.printDialogOpened': 'Print dialog opened. Choose “Save as PDF” in the dialog.',
      'popup.printDialogFailed': 'Could not open the print dialog',
      'popup.noTab': 'No active tab found.',
      'popup.blockedPage': "This page can't be exported (Chrome built-in or Web Store page). Switch to a normal web page.",

      'options.lead': 'Paper, margins and other everyday options live in the toolbar popup. This page holds filenames, headers and footers, and page clean-up rules.',
      'options.saved': 'Saved',
      'options.language': 'Language',
      'options.languageHint': 'Applies to this extension’s interface only.',

      'options.sec1': '1. Filename and location',
      'options.filenameTemplate': 'Filename template',
      'options.filenameFields': 'Available fields:',
      'options.subfolder': 'Download subfolder (optional)',
      'options.subfolderPh': 'e.g. WebPDF',
      'options.subfolderHint': 'Relative to the browser’s download folder. Leave blank to save directly there.',
      'options.saveAs': 'Always open the “Save as” dialog',
      'options.filenamePreview': 'Filename preview',

      'options.sec2': '2. Header and footer',
      'options.sec2Hint': 'Tick “Add header and footer” in the popup for these to apply. When top and bottom margins are too small, export widens them to 15 mm, otherwise Chrome squeezes the header out of sight.',
      'options.headerLeft': 'Header left',
      'options.headerRight': 'Header right',
      'options.footerLeft': 'Footer left',
      'options.footerRight': 'Footer right',
      'options.hfFontPt': 'Font size (pt)',

      'options.sec3': '3. PDF structure',
      'options.taggedPdf': 'Generate a tagged PDF (screen readers can follow the structure; recommended)',
      'options.documentOutline': 'Build a bookmark outline from the page’s heading levels',
      'options.preferCSSPageSize': 'Prefer the page’s own <code>@page</code> size (overrides the paper setting)',

      'options.sec4': '4. Page clean-up',
      'options.removeSelectors': 'CSS selectors to hide before export',
      'options.removeSelectorsHint': 'One per line, or comma separated. Invalid selectors are ignored and never break the export.',
      'options.expandDetails': 'Expand collapsed sections (<code><details></code>)',
      'options.settleMs': 'Extra wait after clean-up (ms)',
      'options.settleMsHint': 'Raise this when a page needs time to reflow or load fonts. 400 is usually enough.',

      'options.sec5': '5. How it works',
      'options.note1': 'Export uses Chrome’s own print engine (CDP <code>Page.printToPDF</code>), so the output is real selectable, searchable text — not a screenshot.',
      'options.note2': 'Reaching that engine requires the “debugger” permission. Chrome shows a “debugging this browser” bar at the top of the tab while exporting; it disappears when the export finishes.',
      'options.note3': 'If DevTools is already open on that tab the export fails because only one debugger can attach. Close DevTools first.',
      'options.note4': 'Chrome’s built-in pages (<code>chrome://</code>), extension pages and the Chrome Web Store cannot be exported. That is a browser restriction.',
      'options.note5': 'For pages that refuse to export, open “Other ways” in the popup and use Chrome’s print dialog instead.',

      'options.autosave': 'Settings save automatically.',
      'options.reset': 'Restore defaults',
      'options.resetConfirm': 'Restore every setting to its default value?',
      'options.sampleTitle': 'Sample title: {title}',
      'options.sampleUrl': 'Sample URL: {url}',
      'options.samplePath': 'Output path: Downloads/{path}',

      'paper.a4': 'A4 (210 × 297 mm)',
      'paper.a3': 'A3 (297 × 420 mm)',
      'paper.a5': 'A5 (148 × 210 mm)',
      'paper.b4': 'B4 (250 × 353 mm)',
      'paper.b5': 'B5 (176 × 250 mm)',
      'paper.letter': 'Letter (8.5 × 11 in)',
      'paper.legal': 'Legal (8.5 × 14 in)',
      'paper.tabloid': 'Tabloid (11 × 17 in)',
      'paper.custom': 'Custom size',

      'margin.default': 'Default (about 10 mm)',
      'margin.none': 'No margins',
      'margin.minimum': 'Minimum (4 mm)',
      'margin.wide': 'Wide (20 mm)',
      'margin.custom': 'Custom',

      'orient.portrait': 'Portrait',
      'orient.landscape': 'Landscape',

      'hf.none': '(blank)',
      'hf.title': 'Page title',
      'hf.url': 'URL',
      'hf.date': 'Date',
      'hf.page': 'Page number',
      'hf.pageOfTotal': 'Page / total',

      'prep.noBody': 'The page has no body, so the whole page was exported',
      'prep.tooLittleText': 'Too little text on the page, so the whole page was exported',
      'prep.noMainBlock': 'No main content block found, so the whole page was exported',
      'prep.ratioTooLow': 'The main block held too little of the page, so the whole page was exported',
      'prep.hiddenBySelector': 'Hid {count} elements matching your selectors',
      'prep.mainOnly': 'Main content only ({ratio}% of the page text, {hidden} blocks hidden)',
      'prep.unpinned': 'Unpinned {count} fixed or sticky elements',
      'prep.forcedLight': 'Forced black text on a white background',
      'prep.expandedDetails': 'Expanded {count} collapsed sections',
      'prep.scrolledLazy': 'Scrolled the page to trigger lazy loading ({count} images)',

      'pdf.marginTopAdjusted': 'Top margin widened to {mm} mm so the header has room to show',
      'pdf.marginBottomAdjusted': 'Bottom margin widened to {mm} mm so the footer has room to show',
      'pdf.pageRangeInvalid': 'Page range is not valid. Use only digits, commas and hyphens, for example 1-5, 8',
      'pdf.cssPageSize': 'Using the page’s own @page size; your paper setting may be overridden',

      'sw.attachBusy': 'Another debugger (usually DevTools) is already attached to this tab. Close DevTools on that tab and try again.',
      'sw.attachBlocked': 'This page does not allow extension access (Chrome built-in page, extension page or Web Store page).',
      'sw.attachUnavailable': 'Could not attach to this tab (it may already be a PDF viewer, or it has not finished loading).',
      'sw.attachFailed': 'Could not attach the debugger: {message}',
      'sw.offscreenJustification': 'Converting the generated PDF into a Blob URL so the downloads API can save it.',
      'sw.downloadCanceled': 'Save canceled',
      'sw.downloadInterrupted': 'Download interrupted: {reason}',
      'sw.unknownReason': 'unknown reason',
      'sw.offscreenNoComm': 'Could not reach the offscreen document: {message}',
      'sw.offscreenNoBlob': 'The offscreen document returned no Blob URL',
      'sw.saveFailed': 'Save failed: {message}',
      'sw.saveFailedPlain': 'Save failed',
      'sw.noPdfData': 'Chrome returned no PDF content',
      'sw.pageRangeBad': 'The page range is outside the document or badly formatted: {message}',
      'sw.printFailed': 'Could not generate the PDF: {message}',
      'sw.printFailedAll': 'Could not generate the PDF even after removing unsupported parameters.',
      'sw.noTab': 'No active tab found.',
      'sw.blockedPage': 'This page cannot be exported (Chrome built-in page, extension page or Chrome Web Store). Switch to a normal web page and try again.',
      'sw.prepareFailed': 'Could not run the clean-up script on this page: {message}',
      'sw.progPrepare': 'Preparing the page…',
      'sw.progPrint': 'Generating the PDF…',
      'sw.progSave': 'Saving {name}…',
      'sw.noteScreenMedia': 'Used screen styles instead of the page’s print styles',
      'sw.menuExport': 'Convert this page to PDF (Alt+P)',
      'sw.menuOptions': 'Web Page to PDF settings…',
      'sw.actionSaved': 'Saved {name}',
      'sw.actionFailed': 'Export failed: {message}',
      'sw.unknownMessage': 'Unknown message type: {type}'
    },

    'zh-TW': {
      'app.name': '網頁轉 PDF',
      'app.optionsTitle': '網頁轉 PDF － 設定',

      'popup.loading': '載入中…',
      'popup.openSettings': '開啟設定',
      'popup.export': '轉成 PDF',
      'popup.ready': '準備就緒',
      'popup.paper': '紙張',
      'popup.customMm': '自訂 mm',
      'popup.customWidth': '自訂寬度（公釐）',
      'popup.customHeight': '自訂高度（公釐）',
      'popup.orientation': '方向',
      'popup.margins': '邊界',
      'popup.marginQuad': '上右下左',
      'popup.marginTop': '上邊界（公釐）',
      'popup.marginRight': '右邊界（公釐）',
      'popup.marginBottom': '下邊界（公釐）',
      'popup.marginLeft': '左邊界（公釐）',
      'popup.scale': '縮放 %',
      'popup.pageRanges': '頁面範圍',
      'popup.pageRangesPh': '留空＝全部，例如 1-5, 8',
      'popup.printBackground': '列印背景與圖片',
      'popup.headerFooter': '加上頁首頁尾',
      'popup.mainContentOnly': '只輸出主要內容',
      'popup.removeFixed': '取消固定／浮動元素',
      'popup.forceLight': '強制白底黑字',
      'popup.emulateScreen': '用螢幕樣式取代列印樣式',
      'popup.expandLazy': '先捲動整頁載入圖片',
      'popup.saveAs': '每次詢問儲存位置',
      'popup.moreWays': '其他方式',
      'popup.printDialog': '改用 Chrome 列印對話框',
      'popup.printDialogHint': '遇到無法附加除錯器的頁面時可用這個備案，再自己選「另存為 PDF」。',
      'popup.shortcut': '快捷鍵',
      'popup.allSettings': '完整設定',
      'popup.savesTo': '儲存為：下載/{path}',
      'popup.badTemplate': '（檔名樣板有誤）',
      'popup.headerMarginNote': '頁首頁尾需要上下邊界至少 {mm} mm，轉檔時會自動調整。',
      'popup.starting': '開始轉檔…',
      'popup.exportFailed': '轉檔失敗',
      'popup.saved': '已儲存 {name}',
      'popup.savedWithSize': '已儲存 {name}（{kb} KB）',
      'popup.printDialogOpened': '已開啟列印對話框，請在對話框中選擇「另存為 PDF」。',
      'popup.printDialogFailed': '無法開啟列印對話框',
      'popup.noTab': '找不到目前的分頁。',
      'popup.blockedPage': '這個頁面無法轉檔（Chrome 內建頁面或商店頁面），請切換到一般網頁。',

      'options.lead': '紙張、邊界等常用選項在工具列的彈出視窗裡調整；這裡放檔名、頁首頁尾與頁面整理規則。',
      'options.saved': '已儲存',
      'options.language': '語言',
      'options.languageHint': '只影響這個擴充功能的介面文字。',

      'options.sec1': '1. 檔名與儲存位置',
      'options.filenameTemplate': '檔名樣板',
      'options.filenameFields': '可用欄位：',
      'options.subfolder': '下載子資料夾（選填）',
      'options.subfolderPh': '例如 WebPDF',
      'options.subfolderHint': '相對於瀏覽器的下載資料夾，留空就直接放在下載資料夾。',
      'options.saveAs': '每次都開啟「另存新檔」對話框',
      'options.filenamePreview': '檔名預覽',

      'options.sec2': '2. 頁首與頁尾',
      'options.sec2Hint': '要先在彈出視窗勾選「加上頁首頁尾」才會套用。上下邊界不足時，轉檔時會自動撐開到 15 mm，否則 Chrome 會把頁首壓到看不見。',
      'options.headerLeft': '頁首左側',
      'options.headerRight': '頁首右側',
      'options.footerLeft': '頁尾左側',
      'options.footerRight': '頁尾右側',
      'options.hfFontPt': '字級（pt）',

      'options.sec3': '3. PDF 結構',
      'options.taggedPdf': '產生標記式 PDF（無障礙閱讀器可正確朗讀結構，建議開啟）',
      'options.documentOutline': '依網頁標題層級產生書籤大綱',
      'options.preferCSSPageSize': '優先使用網頁自訂的 <code>@page</code> 尺寸（會覆蓋紙張設定）',

      'options.sec4': '4. 頁面整理',
      'options.removeSelectors': '轉檔前要隱藏的 CSS 選擇器',
      'options.removeSelectorsHint': '一行或以逗號分隔多個選擇器。無效的選擇器會被忽略，不會中斷轉檔。',
      'options.expandDetails': '展開折疊區塊（<code><details></code>）',
      'options.settleMs': '整理後額外等待（毫秒）',
      'options.settleMsHint': '網頁需要時間重排或載入字型時可調高，一般 400 就夠。',

      'options.sec5': '5. 使用說明',
      'options.note1': '轉檔採用 Chrome 內建的列印引擎（CDP <code>Page.printToPDF</code>），輸出是可選取、可搜尋的文字，不是螢幕截圖。',
      'options.note2': '因為要呼叫這個引擎，擴充功能需要「偵錯工具」權限。轉檔期間分頁上方會出現「正在偵錯這個瀏覽器」的提示列，完成後自動消失。',
      'options.note3': '若該分頁已開著開發人員工具，會因為除錯器衝突而失敗，請先關閉 DevTools。',
      'options.note4': 'Chrome 內建頁面（<code>chrome://</code>）、擴充功能頁面與 Chrome 線上應用程式商店無法轉檔，這是瀏覽器的限制。',
      'options.note5': '遇到轉不了的頁面，可在彈出視窗展開「其他方式」，改用 Chrome 的列印對話框。',

      'options.autosave': '設定會即時儲存。',
      'options.reset': '恢復預設值',
      'options.resetConfirm': '確定要把所有設定恢復預設值嗎？',
      'options.sampleTitle': '範例標題：{title}',
      'options.sampleUrl': '範例網址：{url}',
      'options.samplePath': '輸出路徑：下載/{path}',

      'paper.a4': 'A4（210 × 297 mm）',
      'paper.a3': 'A3（297 × 420 mm）',
      'paper.a5': 'A5（148 × 210 mm）',
      'paper.b4': 'B4（250 × 353 mm）',
      'paper.b5': 'B5（176 × 250 mm）',
      'paper.letter': 'Letter（8.5 × 11 in）',
      'paper.legal': 'Legal（8.5 × 14 in）',
      'paper.tabloid': 'Tabloid（11 × 17 in）',
      'paper.custom': '自訂尺寸',

      'margin.default': '預設（約 10 mm）',
      'margin.none': '無邊界',
      'margin.minimum': '最小（4 mm）',
      'margin.wide': '寬邊界（20 mm）',
      'margin.custom': '自訂',

      'orient.portrait': '直向',
      'orient.landscape': '橫向',

      'hf.none': '（空白）',
      'hf.title': '網頁標題',
      'hf.url': '網址',
      'hf.date': '日期',
      'hf.page': '頁碼',
      'hf.pageOfTotal': '頁碼 / 總頁數',

      'prep.noBody': '頁面沒有 body，維持整頁輸出',
      'prep.tooLittleText': '頁面文字太少，維持整頁輸出',
      'prep.noMainBlock': '找不到主要內容區塊，維持整頁輸出',
      'prep.ratioTooLow': '主要內容佔比太低，維持整頁輸出',
      'prep.hiddenBySelector': '依自訂選擇器隱藏了 {count} 個元素',
      'prep.mainOnly': '只輸出主要內容（佔全頁文字 {ratio}%，隱藏 {hidden} 個區塊）',
      'prep.unpinned': '取消了 {count} 個固定／黏性元素的定位',
      'prep.forcedLight': '已強制白底黑字',
      'prep.expandedDetails': '展開了 {count} 個折疊區塊',
      'prep.scrolledLazy': '已捲動整頁觸發延遲載入（{count} 張圖片）',

      'pdf.marginTopAdjusted': '已把上邊界調整為 {mm} mm，頁首才有空間顯示',
      'pdf.marginBottomAdjusted': '已把下邊界調整為 {mm} mm，頁尾才有空間顯示',
      'pdf.pageRangeInvalid': '頁面範圍格式不正確，只能使用數字、逗號與連字號，例如 1-5, 8',
      'pdf.cssPageSize': '已啟用網頁自訂頁面尺寸（@page），紙張設定可能被網頁覆蓋',

      'sw.attachBusy': '這個分頁已經有其他除錯器（通常是開發人員工具）連著。請先關閉該分頁的 DevTools 再試。',
      'sw.attachBlocked': '這個頁面不允許擴充功能存取（Chrome 內建頁面、擴充功能頁面或商店頁面）。',
      'sw.attachUnavailable': '無法附加到這個分頁（例如已經是 PDF 檢視器或分頁尚未載入完成）。',
      'sw.attachFailed': '附加除錯器失敗：{message}',
      'sw.offscreenJustification': '把產生的 PDF 轉成 Blob URL 才能交給下載 API 儲存。',
      'sw.downloadCanceled': '已取消儲存',
      'sw.downloadInterrupted': '下載被中斷：{reason}',
      'sw.unknownReason': '未知原因',
      'sw.offscreenNoComm': '無法與離螢幕文件溝通：{message}',
      'sw.offscreenNoBlob': '離螢幕文件沒有回傳 Blob URL',
      'sw.saveFailed': '儲存失敗：{message}',
      'sw.saveFailedPlain': '儲存失敗',
      'sw.noPdfData': 'Chrome 沒有回傳 PDF 內容',
      'sw.pageRangeBad': '頁面範圍超出實際頁數或格式不正確：{message}',
      'sw.printFailed': '產生 PDF 失敗：{message}',
      'sw.printFailedAll': '產生 PDF 失敗，已嘗試移除不支援的參數仍無法完成。',
      'sw.noTab': '找不到目前的分頁。',
      'sw.blockedPage': '這個頁面無法轉檔（Chrome 內建頁面、擴充功能頁面或 Chrome 線上應用程式商店）。請切換到一般網頁再試。',
      'sw.prepareFailed': '無法在這個頁面執行整理腳本：{message}',
      'sw.progPrepare': '正在整理頁面…',
      'sw.progPrint': '正在產生 PDF…',
      'sw.progSave': '正在儲存 {name}…',
      'sw.noteScreenMedia': '已用螢幕樣式（screen media）取代網頁的列印樣式',
      'sw.menuExport': '把這個網頁轉成 PDF（Alt+P）',
      'sw.menuOptions': '網頁轉 PDF 設定…',
      'sw.actionSaved': '已儲存 {name}',
      'sw.actionFailed': '轉檔失敗：{message}',
      'sw.unknownMessage': '未知的訊息類型：{type}'
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

  root.W2PI18N = {
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
