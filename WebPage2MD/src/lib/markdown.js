/**
 * 純函式層：Markdown 文字組裝與清理（轉義、程式碼區塊、表格、front matter、檔名）。
 * 刻意不碰任何 chrome API 與 DOM，方便單獨測試，也能同時給
 * service worker、注入的內容腳本與各介面頁使用。
 */
(function (root) {
  'use strict';

  const WORD_RE = /[0-9A-Za-z\u00c0-\u024f]/;
  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  function str(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function collapseSpaces(value) {
    return str(value).replace(/\s+/g, ' ').trim();
  }

  // ------------------------------------------------------------------ 轉義

  /**
   * 行內文字轉義。刻意不做「全部特殊字元都加反斜線」：
   * 過度轉義會讓 snake_case、數學式、中文標點旁邊長出一堆反斜線，
   * 所以底線只在詞邊界轉義，`<` 與 `&` 只在看起來像 HTML 時才轉。
   */
  function escapeInline(text) {
    let out = str(text);
    if (!out) return '';
    out = out.replace(/[\\`*[\]]/g, '\\$&');
    out = out.replace(/_+/g, (match, index, whole) => {
      const before = index > 0 ? whole.charAt(index - 1) : '';
      const after = whole.charAt(index + match.length);
      if (WORD_RE.test(before) && WORD_RE.test(after)) return match;
      return match.replace(/_/g, '\\_');
    });
    // 順序很重要：先處理 & 再處理 <，否則下一行產生的 &lt; 會被自己的 & 規則再轉一次
    out = out.replace(/&(?=[a-zA-Z][a-zA-Z0-9]{1,9};|#\d{1,6};|#[xX][0-9a-fA-F]{1,6};)/g, '&amp;');
    out = out.replace(/<(?=[a-zA-Z/!?])/g, '&lt;');
    return out;
  }

  /** 段落每一行的行首都要檢查：本來是普通文字的 `- ` 或 `# ` 不能變成語法 */
  function escapeLineStart(line) {
    let out = str(line);
    if (!out) return '';
    out = out.replace(/^(\s*)(#{1,6})(\s|$)/, '$1\\$2$3');
    out = out.replace(/^(\s*)([>|])/, '$1\\$2');
    out = out.replace(/^(\s*)([-+])(\s)/, '$1\\$2$3');
    out = out.replace(/^(\s*)(\d{1,9})([.)])(\s)/, '$1$2\\$3$4');
    out = out.replace(/^(\s*)(={2,}|-{2,}|~{3,})(\s*)$/, '$1\\$2$3');
    return out;
  }

  /** 表格儲存格：`|` 一定要轉義，換行只能用 <br>（GFM 表格不允許真的換行） */
  function escapeCell(text) {
    let out = str(text);
    out = out.replace(/\|/g, '\\|');
    out = out.replace(/[ \t]*\r?\n[ \t]*/g, '<br>');
    out = out.replace(/[ \t]{2,}/g, ' ');
    return out.trim();
  }

  /** 行內程式碼：反引號數量要比內容裡最長的一段還多，否則會提早收尾 */
  function inlineCode(text) {
    const body = str(text).replace(/\r?\n/g, ' ');
    if (!body.trim()) return '';
    let longest = 0;
    (body.match(/`+/g) || []).forEach((run) => {
      longest = Math.max(longest, run.length);
    });
    const fence = '`'.repeat(longest + 1);
    const pad = /^`|`$|^\s|\s$/.test(body) ? ' ' : '';
    return fence + pad + body + pad + fence;
  }

  /** 圍籬程式碼區塊，圍籬長度同樣要避開內容裡的反引號 */
  function codeBlock(code, fence, lang) {
    const body = str(code).replace(/\s+$/, '');
    const char = fence === '~~~' ? '~' : '`';
    const re = char === '`' ? /`+/g : /~+/g;
    let longest = 0;
    (body.match(re) || []).forEach((run) => {
      longest = Math.max(longest, run.length);
    });
    const bar = char.repeat(Math.max(3, longest + 1));
    return bar + collapseSpaces(lang).replace(/\s/g, '') + '\n' + body + '\n' + bar;
  }

  /** 網址裡有空白或括號時要用 <> 包住，否則連結會在括號處斷掉 */
  function encodeUrl(url) {
    const text = str(url).trim();
    if (!text) return '';
    if (/[\s()<>]/.test(text)) {
      return '<' + text.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s/g, '%20') + '>';
    }
    return text;
  }

  function resolveUrl(base, href) {
    const value = str(href).trim();
    if (!value) return '';
    if (/^#/.test(value)) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^\/\//.test(value)) return value;
    if (!base) return value;
    try {
      return new URL(value, base).href;
    } catch (e) {
      return value;
    }
  }

  /** srcset 取最大的那一張：優先看 w 描述子，其次 x，都沒有就取最後一個 */
  function pickFromSrcset(value) {
    const text = str(value).trim();
    if (!text) return '';
    if (/^data:/i.test(text)) return text;
    const items = [];
    for (const part of text.split(',')) {
      const bits = part.trim().split(/\s+/).filter(Boolean);
      if (!bits.length) continue;
      const descriptor = bits[1] || '';
      const w = /^(\d+(?:\.\d+)?)w$/i.exec(descriptor);
      const x = /^(\d+(?:\.\d+)?)x$/i.exec(descriptor);
      items.push({ url: bits[0], w: w ? Number(w[1]) : 0, x: x ? Number(x[1]) : 0 });
    }
    if (!items.length) return '';
    const byW = items.filter((item) => item.w > 0);
    if (byW.length) return byW.reduce((a, b) => (b.w > a.w ? b : a)).url;
    const byX = items.filter((item) => item.x > 0);
    if (byX.length) return byX.reduce((a, b) => (b.x > a.x ? b : a)).url;
    return items[items.length - 1].url;
  }

  // ------------------------------------------------------------------ 版面

  function prefixLines(text, first, rest) {
    const lines = str(text).split('\n');
    return lines.map((line, i) => {
      if (i === 0) return first + line;
      return line ? rest + line : '';
    }).join('\n');
  }

  /**
   * 收尾整理：連續空行壓成一行、去掉頭尾空白。
   * 圍籬程式碼區塊內不動，否則會改掉程式碼本身的排版。
   */
  function tidy(markdown) {
    const lines = str(markdown).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let fence = '';
    let blanks = 0;

    for (const line of lines) {
      const open = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (open) {
        if (!fence) fence = open[1].charAt(0).repeat(3);
        else if (line.trim().startsWith(fence)) fence = '';
      }
      if (!fence) {
        if (!line.trim()) {
          blanks++;
          if (blanks > 1) continue;
        } else {
          blanks = 0;
        }
      }
      out.push(line);
    }

    while (out.length && !out[0].trim()) out.shift();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out.join('\n');
  }

  /** 由已轉義好的儲存格字串組出 GFM 表格；第一列一律當表頭 */
  function buildTable(rows, aligns) {
    if (!Array.isArray(rows) || !rows.length) return '';
    const columns = rows.reduce((max, row) => Math.max(max, (row || []).length), 0);
    if (!columns) return '';

    const normalized = rows.map((row) => {
      const cells = (row || []).map((cell) => str(cell));
      while (cells.length < columns) cells.push('');
      return cells;
    });

    const separator = [];
    for (let i = 0; i < columns; i++) {
      const align = (aligns && aligns[i]) || '';
      if (align === 'left') separator.push(':---');
      else if (align === 'right') separator.push('---:');
      else if (align === 'center') separator.push(':---:');
      else separator.push('---');
    }

    const line = (cells) => '| ' + cells.join(' | ') + ' |';
    const out = [line(normalized[0]), line(separator)];
    for (let i = 1; i < normalized.length; i++) out.push(line(normalized[i]));
    return out.join('\n');
  }

  function countWords(text) {
    const body = str(text);
    const cjkRe = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g;
    const cjk = (body.match(cjkRe) || []).length;
    const latin = (body.replace(cjkRe, ' ').match(/[A-Za-z0-9\u00c0-\u024f]+/g) || []).length;
    return cjk + latin;
  }

  // -------------------------------------------------------------- 標題比對

  function normalizeTitle(value) {
    return str(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  }

  /** 判斷內容第一個 H1 是不是就是網頁標題，避免重複加一次標題 */
  function looksSameTitle(a, b) {
    const x = normalizeTitle(a);
    const y = normalizeTitle(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const shorter = x.length <= y.length ? x : y;
    const longer = x.length <= y.length ? y : x;
    return shorter.length >= 6 && longer.indexOf(shorter) === 0;
  }

  /** 去掉標題尾端的站名，例如「文章標題 - 某某部落格」 */
  function stripSiteSuffix(title, siteName) {
    const text = collapseSpaces(title);
    const site = collapseSpaces(siteName);
    if (!text || !site) return text;
    const escaped = site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = text.replace(new RegExp('\\s*[|\\-–—·•:]\\s*' + escaped + '\\s*$', 'i'), '').trim();
    return stripped.length >= 3 ? stripped : text;
  }

  // -------------------------------------------------------- front matter

  function localIso(date) {
    const when = date instanceof Date ? date : new Date();
    const offset = -when.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    return when.getFullYear() + '-' + pad2(when.getMonth() + 1) + '-' + pad2(when.getDate()) +
      'T' + pad2(when.getHours()) + ':' + pad2(when.getMinutes()) + ':' + pad2(when.getSeconds()) +
      sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  }

  /** YAML 純量：需要引號時才加，避免整份 front matter 都是引號 */
  function yamlScalar(value) {
    const text = collapseSpaces(value);
    if (!text) return '""';
    const needsQuote = /^[-?:,[\]{}#&*!|>'"%@`]/.test(text) ||
      /:\s/.test(text) || /\s#/.test(text) || /["\\]/.test(text) ||
      /^(true|false|null|yes|no|on|off|~)$/i.test(text) ||
      /^[\d.+-]+$/.test(text) || /:$/.test(text);
    if (!needsQuote) return text;
    return '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function buildFrontMatter(meta, settings, now) {
    const options = settings || {};
    if (options.frontMatter !== 'yaml') return '';
    const info = meta || {};
    const lines = [];

    const push = (key, value) => {
      const text = collapseSpaces(value);
      if (!text) return;
      lines.push(key + ': ' + yamlScalar(text));
    };

    if (options.fmTitle) push('title', info.title);
    if (options.fmSource) push('source', info.url);
    if (options.fmAuthor) push('author', info.author);
    if (options.fmPublished) push('published', info.published);
    if (options.fmDescription) push('description', info.description);
    if (options.fmSiteName) push('site', info.siteName);
    if (options.fmLang) push('lang', info.lang);
    if (options.fmCaptured) push('captured', info.captured || localIso(now));

    if (options.fmTags && Array.isArray(info.tags)) {
      const tags = info.tags.map(collapseSpaces).filter(Boolean).slice(0, 20);
      if (tags.length) {
        lines.push('tags:');
        tags.forEach((tag) => lines.push('  - ' + yamlScalar(tag)));
      }
    }

    str(options.frontMatterExtra).split(/\r?\n/).forEach((line) => {
      const text = line.replace(/\s+$/, '');
      if (text.trim()) lines.push(text);
    });

    if (!lines.length) return '';
    return '---\n' + lines.join('\n') + '\n---\n';
  }

  // ------------------------------------------------------------------ 檔名

  function sanitizeSegment(value, fallback) {
    let text = str(value);
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
   * 資料夾名稱用的清理：和檔名不同，清乾淨後若變成空字串就是空字串，
   * 不能套用預設值，否則 '..' 或空白會變成一個叫做 webpage 的資料夾。
   */
  function sanitizePathSegment(value) {
    let text = str(value);
    text = text.replace(/[\u0000-\u001f\u007f]/g, '');
    text = text.replace(/[<>:"/\\|?*]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^\.+/, '').replace(/[.\s]+$/, '');
    if (!text) return '';
    if (WINDOWS_RESERVED.test(text)) text = text + '_';
    return text.slice(0, 60).trim();
  }

  /**
   * 套用檔名樣板。
   * 可用欄位：{title} {host} {domain} {path} {date} {time} {datetime}
   *           {yyyy} {month} {day} {hour} {minute} {second}
   */
  function buildFilename(template, info, now) {
    const when = now instanceof Date ? now : new Date();
    const meta = info || {};
    let host = '';
    let path = '';
    try {
      const url = new URL(meta.url || '');
      host = url.hostname;
      path = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    } catch (e) {
      host = '';
    }

    const tokens = {
      title: meta.title || '',
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

    const raw = str(template || '{title}').replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
    });

    const base = sanitizeSegment(raw, sanitizeSegment(tokens.title, tokens.domain || 'webpage'));
    // 樣板已經寫了 .md 時不要疊第二個；去掉副檔名後也要再修尾，
    // 避免出現「標題 .md」這種前面多一個空格的檔名
    const stem = base.replace(/\.(md|markdown)$/i, '').replace(/[.\s]+$/, '');
    return (stem || 'webpage') + '.md';
  }

  /** 下載用的相對路徑，允許放在下載資料夾的子目錄 */
  function buildDownloadPath(subfolder, filename) {
    const folder = str(subfolder)
      .split(/[\\/]+/)
      .map(sanitizePathSegment)
      .filter(Boolean)
      .join('/');
    return folder ? folder + '/' + filename : filename;
  }

  root.W2MMarkdown = {
    collapseSpaces,
    escapeInline,
    escapeLineStart,
    escapeCell,
    inlineCode,
    codeBlock,
    encodeUrl,
    resolveUrl,
    pickFromSrcset,
    prefixLines,
    tidy,
    buildTable,
    countWords,
    normalizeTitle,
    looksSameTitle,
    stripSiteSuffix,
    localIso,
    yamlScalar,
    buildFrontMatter,
    sanitizeSegment,
    sanitizePathSegment,
    buildFilename,
    buildDownloadPath
  };
})(typeof self !== 'undefined' ? self : this);
