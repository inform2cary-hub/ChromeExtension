/**
 * 純函式層：把使用者設定換算成 CDP Page.printToPDF 的參數，
 * 以及頁首頁尾樣板與檔名處理。刻意不碰任何 chrome API，方便單獨測試。
 */
(function (root) {
  'use strict';

  const C = root.W2P_CONST;
  const MM = C.MM_PER_INCH;

  /** 延遲取用：語言可能在這支腳本載入之後才決定 */
  const t = (key, params) => root.W2PI18N.t(key, params);

  /** 開啟頁首頁尾時，上下邊界至少要留這麼多公釐，否則 Chrome 會把頁首壓到看不見 */
  const HEADER_MIN_MARGIN_MM = 15;

  function mmToIn(mm) {
    return Number(mm) / MM;
  }

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /** 取得紙張尺寸（公釐，直向） */
  function resolvePaper(settings) {
    const hit = C.PAPERS.find((p) => p.id === settings.paper);
    if (settings.paper === 'custom' || !hit) {
      return {
        id: 'custom',
        width: clamp(settings.customWidth, 20, 2000, 210),
        height: clamp(settings.customHeight, 20, 2000, 297)
      };
    }
    return { id: hit.id, width: hit.width, height: hit.height };
  }

  /** 取得邊界（公釐）。開啟頁首頁尾時會自動撐開上下邊界 */
  function resolveMargins(settings) {
    const preset = C.MARGIN_PRESETS.find((m) => m.id === settings.marginPreset);
    let margins;
    if (settings.marginPreset === 'custom' || !preset) {
      margins = {
        top: clamp(settings.marginTop, 0, 100, 10),
        right: clamp(settings.marginRight, 0, 100, 10),
        bottom: clamp(settings.marginBottom, 0, 100, 10),
        left: clamp(settings.marginLeft, 0, 100, 10)
      };
    } else {
      margins = { top: preset.top, right: preset.right, bottom: preset.bottom, left: preset.left };
    }

    const notes = [];
    if (settings.headerFooter) {
      if (margins.top < HEADER_MIN_MARGIN_MM) {
        margins.top = HEADER_MIN_MARGIN_MM;
        notes.push(t('pdf.marginTopAdjusted', { mm: HEADER_MIN_MARGIN_MM }));
      }
      if (margins.bottom < HEADER_MIN_MARGIN_MM) {
        margins.bottom = HEADER_MIN_MARGIN_MM;
        notes.push(t('pdf.marginBottomAdjusted', { mm: HEADER_MIN_MARGIN_MM }));
      }
    }
    return { margins, notes };
  }

  /** 頁碼等欄位靠 Chrome 注入的 class 取值，這裡只組版面 */
  function fieldSpan(field) {
    switch (field) {
      case 'title':
        return '<span class="title"></span>';
      case 'url':
        return '<span class="url"></span>';
      case 'date':
        return '<span class="date"></span>';
      case 'page':
        return '<span class="pageNumber"></span>';
      case 'pageOfTotal':
        return '<span class="pageNumber"></span> / <span class="totalPages"></span>';
      default:
        return '<span></span>';
    }
  }

  /**
   * 頁首／頁尾樣板。
   * 注意：Chrome 的頁首頁尾文件預設 font-size 為 0，一定要自己指定尺寸，
   * 否則會變成看不見的空白區。
   */
  function buildTemplate(leftField, rightField, fontPt, side) {
    const size = clamp(fontPt, 5, 16, 8);
    const pad = side === 'header' ? '0 10mm 2mm' : '2mm 10mm 0';
    return '<div style="font-size:' + size + 'pt;font-family:sans-serif;color:#666;' +
      'width:100%;box-sizing:border-box;padding:' + pad + ';display:flex;' +
      'justify-content:space-between;gap:8mm;overflow:hidden;white-space:nowrap;">' +
      fieldSpan(leftField) + fieldSpan(rightField) +
      '</div>';
  }

  function validatePageRanges(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (!/^[\d\s,\-]+$/.test(text)) {
      throw new Error(t('pdf.pageRangeInvalid'));
    }
    return text.replace(/\s+/g, '');
  }

  /**
   * 組出 Page.printToPDF 的參數。
   * @returns {{params: object, notes: string[]}}
   */
  function buildPrintParams(settings) {
    const paper = resolvePaper(settings);
    const { margins, notes } = resolveMargins(settings);

    const params = {
      landscape: settings.orientation === 'landscape',
      printBackground: settings.printBackground !== false,
      scale: clamp(Number(settings.scale) / 100, 0.1, 2, 1),
      paperWidth: mmToIn(paper.width),
      paperHeight: mmToIn(paper.height),
      marginTop: mmToIn(margins.top),
      marginBottom: mmToIn(margins.bottom),
      marginLeft: mmToIn(margins.left),
      marginRight: mmToIn(margins.right),
      preferCSSPageSize: !!settings.preferCSSPageSize,
      displayHeaderFooter: !!settings.headerFooter,
      transferMode: 'ReturnAsBase64'
    };

    const ranges = validatePageRanges(settings.pageRanges);
    if (ranges) params.pageRanges = ranges;

    if (params.displayHeaderFooter) {
      params.headerTemplate = buildTemplate(settings.headerLeft, settings.headerRight, settings.headerFooterFontPt, 'header');
      params.footerTemplate = buildTemplate(settings.footerLeft, settings.footerRight, settings.headerFooterFontPt, 'footer');
    }

    // 這兩個是較新的參數：無障礙標記與書籤大綱。舊版 Chrome 會回錯，
    // 由呼叫端負責移除後重試（optionalKeys 就是給它用的）。
    if (settings.taggedPdf) params.generateTaggedPDF = true;
    if (settings.documentOutline) params.generateDocumentOutline = true;

    if (settings.preferCSSPageSize) {
      notes.push(t('pdf.cssPageSize'));
    }

    return { params, notes, optionalKeys: ['generateDocumentOutline', 'generateTaggedPDF'] };
  }

  // ------------------------------------------------------------------ 檔名

  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function sanitizeSegment(value, fallback) {
    let text = String(value === null || value === undefined ? '' : value);
    text = text.replace(/[\u0000-\u001f\u007f]/g, '');
    text = text.replace(/[<>:"/\\|?*]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^\.+/, '').replace(/[.\s]+$/, '');
    if (WINDOWS_RESERVED.test(text)) text = text + '_';
    if (!text) text = fallback || 'webpage';
    if (text.length > 120) text = text.slice(0, 120).trim();
    return text;
  }

  /**
   * 套用檔名樣板。
   * 可用欄位：{title} {host} {domain} {path} {date} {time} {datetime}
   *           {yyyy} {month} {day} {hour} {minute} {second}
   */
  function buildFilename(template, info, now) {
    const when = now instanceof Date ? now : new Date();
    let host = '';
    let path = '';
    try {
      const url = new URL(info.url || '');
      host = url.hostname;
      path = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    } catch (e) {
      host = '';
    }

    const tokens = {
      title: info.title || '',
      host,
      domain: host.replace(/^www\./i, ''),
      path,
      date: when.getFullYear() + '-' + pad2(when.getMonth() + 1) + '-' + pad2(when.getDate()),
      time: pad2(when.getHours()) + pad2(when.getMinutes()) + pad2(when.getSeconds()),
      datetime: when.getFullYear() + pad2(when.getMonth() + 1) + pad2(when.getDate()) + '-' +
        pad2(when.getHours()) + pad2(when.getMinutes()) + pad2(when.getSeconds()),
      yyyy: String(when.getFullYear()),
      month: pad2(when.getMonth() + 1),
      day: pad2(when.getDate()),
      hour: pad2(when.getHours()),
      minute: pad2(when.getMinutes()),
      second: pad2(when.getSeconds())
    };

    const raw = String(template || '{title}').replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
    });

    const base = sanitizeSegment(raw, sanitizeSegment(tokens.title, tokens.domain || 'webpage'));
    // 樣板已經寫了 .pdf 時不要疊第二個；去掉副檔名後也要再修尾，
    // 避免出現「標題 .pdf」這種前面多一個空格的檔名
    const stem = base.replace(/\.pdf$/i, '').replace(/[.\s]+$/, '');
    return (stem || 'webpage') + '.pdf';
  }

  /**
   * 資料夾名稱用的清理：和檔名不同，清乾淨後若變成空字串就是空字串，
   * 不能套用預設值，否則 '..' 或空白會變成一個叫做 webpage 的資料夾。
   */
  function sanitizePathSegment(value) {
    let text = String(value === null || value === undefined ? '' : value);
    text = text.replace(/[\u0000-\u001f\u007f]/g, '');
    text = text.replace(/[<>:"/\\|?*]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^\.+/, '').replace(/[.\s]+$/, '');
    if (!text) return '';
    if (WINDOWS_RESERVED.test(text)) text = text + '_';
    return text.slice(0, 60).trim();
  }

  /** 下載用的相對路徑，允許放在下載資料夾的子目錄 */
  function buildDownloadPath(subfolder, filename) {
    const folder = String(subfolder || '')
      .split(/[\\/]+/)
      .map(sanitizePathSegment)
      .filter(Boolean)
      .join('/');
    return folder ? folder + '/' + filename : filename;
  }

  root.W2PPdf = {
    HEADER_MIN_MARGIN_MM,
    mmToIn,
    resolvePaper,
    resolveMargins,
    buildTemplate,
    validatePageRanges,
    buildPrintParams,
    sanitizeSegment,
    sanitizePathSegment,
    buildFilename,
    buildDownloadPath
  };
})(typeof self !== 'undefined' ? self : this);
