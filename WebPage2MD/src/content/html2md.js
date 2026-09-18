/**
 * DOM -> Markdown 轉換器。
 *
 * 刻意只使用最小的 DOM 介面（nodeType / tagName / childNodes / nodeValue / getAttribute），
 * 不碰 getComputedStyle、closest、outerHTML 等瀏覽器專屬能力，
 * 這樣 tools/selftest.js 就能用假 DOM 直接驗證轉換結果，不必開瀏覽器。
 *
 * 可見性判斷、垃圾區塊移除屬於瀏覽器的責任，交給 src/content/extract.js
 * 在複製出來的節點上先處理完，這裡只負責「乾淨的樹 -> Markdown」。
 */
(function (root) {
  'use strict';

  const M = root.W2MMarkdown;

  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;

  /** 連內容都不看的元素 */
  const DROP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'HEAD', 'TITLE',
    'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'PARAM', 'CANVAS', 'SVG', 'MAP', 'AREA',
    'AUDIO', 'VIDEO', 'TRACK', 'SOURCE', 'SELECT', 'OPTION', 'OPTGROUP', 'TEXTAREA', 'BUTTON',
    'DATALIST', 'PROGRESS', 'METER', 'DIALOG'
  ]);

  /** 需要自己成為一個區塊的元素 */
  const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CENTER', 'DD', 'DETAILS', 'DIV', 'DL', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HGROUP', 'HR', 'LEGEND', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION',
    'SUMMARY', 'TABLE', 'UL', 'BODY', 'HTML'
  ]);

  const HEADING_LEVEL = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 };

  const KNOWN_LANGS = new Set([
    'apache', 'bash', 'c', 'cmake', 'cpp', 'csharp', 'cs', 'css', 'csv', 'dart', 'diff',
    'dockerfile', 'elixir', 'erlang', 'go', 'graphql', 'groovy', 'haskell', 'html', 'http',
    'ini', 'java', 'javascript', 'js', 'json', 'json5', 'jsx', 'julia', 'kotlin', 'latex',
    'less', 'lisp', 'lua', 'makefile', 'markdown', 'matlab', 'md', 'nginx', 'nim', 'objectivec',
    'ocaml', 'perl', 'php', 'powershell', 'prolog', 'protobuf', 'python', 'py', 'r', 'ruby',
    'rb', 'rust', 'sass', 'scala', 'scss', 'sh', 'shell', 'sql', 'swift', 'tex', 'toml', 'ts',
    'tsx', 'typescript', 'vbnet', 'verilog', 'vim', 'xml', 'yaml', 'yml', 'zig', 'zsh'
  ]);

  const LANG_RE = /(?:^|\s)(?:language|lang|highlight-source|brush|syntax|code)[-:]([a-z0-9#+._-]+)/i;

  const DEFAULTS = {
    headingStyle: 'atx',
    bulletMarker: '-',
    strongMarker: '**',
    emphasisMarker: '_',
    codeFence: '```',
    hrStyle: '---',
    linkStyle: 'inline',
    keepFragmentLinks: false,
    imageMode: 'inline',
    skipDataUrlImages: true,
    absoluteUrls: true,
    baseUrl: '',
    keepLineBreaks: true,
    gfmTables: true,
    strikethrough: true,
    taskLists: true,
    highlightMarker: false,
    mathAsTex: true,
    codeLanguageFromClass: true
  };

  // ---------------------------------------------------------- DOM 小工具

  function tagOf(node) {
    return String((node && (node.tagName || node.nodeName)) || '').toUpperCase();
  }

  function attr(node, name) {
    if (!node || typeof node.getAttribute !== 'function') return '';
    const value = node.getAttribute(name);
    return value === null || value === undefined ? '' : String(value);
  }

  function hasAttr(node, name) {
    if (!node || typeof node.getAttribute !== 'function') return false;
    const value = node.getAttribute(name);
    return value !== null && value !== undefined;
  }

  function kids(node) {
    const list = node && node.childNodes;
    if (!list) return [];
    return Array.prototype.slice.call(list);
  }

  function elementKids(node) {
    return kids(node).filter((child) => child.nodeType === ELEMENT_NODE);
  }

  /** 原始文字（保留空白），給程式碼區塊與數學式用 */
  function rawText(node) {
    if (!node) return '';
    if (node.nodeType === TEXT_NODE) return String(node.nodeValue || '');
    if (node.nodeType !== ELEMENT_NODE) return '';
    const tag = tagOf(node);
    if (DROP_TAGS.has(tag)) return '';
    if (tag === 'BR') return '\n';
    let out = '';
    for (const child of kids(node)) out += rawText(child);
    return out;
  }

  function isSkippable(el) {
    if (DROP_TAGS.has(tagOf(el))) return true;
    if (hasAttr(el, 'hidden')) return true;
    if (attr(el, 'aria-hidden') === 'true') return true;
    if (hasAttr(el, 'data-w2m-drop')) return true;
    return false;
  }

  function isBlockish(el, ctx) {
    if (BLOCK_TAGS.has(tagOf(el))) return true;
    if (ctx.opts.mathAsTex && isMath(el) && isDisplayMath(el)) return true;
    return false;
  }

  // ------------------------------------------------------------------ 數學

  function isMath(el) {
    if (tagOf(el) === 'MATH') return true;
    const className = attr(el, 'class');
    if (!className) return false;
    return /(?:^|\s)(?:katex|katex-display|MathJax|MathJax_Display|math-tex)(?:\s|$)/.test(className);
  }

  function isDisplayMath(el) {
    if (tagOf(el) === 'MATH') return attr(el, 'display') === 'block';
    return /katex-display|MathJax_Display/.test(attr(el, 'class'));
  }

  /** 不套用 DROP_TAGS 的純文字，給 <script type="math/tex"> 這種例外用 */
  function innerText(node) {
    if (!node) return '';
    if (node.nodeType === TEXT_NODE) return String(node.nodeValue || '');
    if (node.nodeType !== ELEMENT_NODE) return '';
    let out = '';
    for (const child of kids(node)) out += innerText(child);
    return out;
  }

  /** 從 MathML 的 annotation、data-latex 或 MathJax 的 script 標籤取回 TeX 原始碼 */
  function texOf(el, depth) {
    if (!el || (depth || 0) > 12) return '';
    const latex = attr(el, 'data-latex') || attr(el, 'data-tex');
    if (latex) return latex.trim();
    const tag = tagOf(el);
    if (tag === 'ANNOTATION' && /x-tex/i.test(attr(el, 'encoding'))) return innerText(el).trim();
    if (tag === 'SCRIPT' && /^math\/tex/i.test(attr(el, 'type'))) return innerText(el).trim();
    for (const child of elementKids(el)) {
      const found = texOf(child, (depth || 0) + 1);
      if (found) return found;
    }
    return '';
  }

  // ------------------------------------------------------------------ 區塊

  function renderBlocks(el, ctx) {
    const blocks = [];
    let run = [];

    const flush = () => {
      if (!run.length) return;
      const nodes = run;
      run = [];
      const text = trimInline(collapseInline(renderInlineNodes(nodes, ctx)));
      if (text) blocks.push({ tag: 'P', text: paragraph(text) });
    };

    for (const child of kids(el)) {
      if (child.nodeType === TEXT_NODE) {
        run.push(child);
        continue;
      }
      if (child.nodeType !== ELEMENT_NODE) continue;
      if (isSkippable(child)) continue;
      if (isBlockish(child, ctx)) {
        flush();
        const text = renderBlock(child, ctx);
        if (text) blocks.push({ tag: tagOf(child), text });
        continue;
      }
      run.push(child);
    }
    flush();
    return blocks;
  }

  /**
   * 區塊之間預設空一行；段落後面緊接清單時只換一行，
   * 讓「說明文字 + 子清單」保持緊湊（tight list）而不是被空行拆開。
   */
  function joinBlocks(blocks) {
    let out = '';
    let previous = '';
    for (const block of blocks) {
      if (!block || !block.text) continue;
      if (out) {
        const tight = previous === 'P' && (block.tag === 'UL' || block.tag === 'OL');
        out += tight ? '\n' : '\n\n';
      }
      out += block.text;
      previous = block.tag;
    }
    return out;
  }

  function renderBlock(el, ctx) {
    const tag = tagOf(el);

    if (ctx.opts.mathAsTex && isMath(el)) {
      const tex = texOf(el);
      if (tex) return isDisplayMath(el) ? '$$\n' + tex + '\n$$' : '$' + tex + '$';
    }

    switch (tag) {
      case 'HR':
        return ctx.opts.hrStyle;
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return heading(HEADING_LEVEL[tag], trimInline(collapseInline(renderInlineNodes(kids(el), ctx))), ctx);
      case 'PRE':
        return codeBlockOf(el, ctx);
      case 'UL':
      case 'OL':
        return list(el, ctx);
      case 'BLOCKQUOTE':
        return quote(joinBlocks(renderBlocks(el, ctx)));
      case 'TABLE':
        return ctx.opts.gfmTables ? table(el, ctx) : joinBlocks(renderBlocks(el, ctx));
      case 'FIGCAPTION':
        return emphasizedLine(el, ctx, ctx.opts.emphasisMarker);
      case 'SUMMARY':
      case 'DT':
        return emphasizedLine(el, ctx, ctx.opts.strongMarker);
      case 'DD': {
        const inner = joinBlocks(renderBlocks(el, ctx));
        return inner ? M.prefixLines(inner, ': ', '  ') : '';
      }
      default:
        return joinBlocks(renderBlocks(el, ctx));
    }
  }

  function emphasizedLine(el, ctx, marker) {
    const raw = renderInlineNodes(kids(el), ctx).replace(/\s*\n+\s*/g, ' ');
    const text = trimInline(collapseInline(raw));
    if (!text) return '';
    return wrapInline(M.escapeLineStart(text), marker);
  }

  function paragraph(text) {
    return String(text).split('\n').map(M.escapeLineStart).join('\n');
  }

  function heading(level, text, ctx) {
    if (!text) return '';
    const hashes = '#'.repeat(Math.min(6, Math.max(1, level)));
    const body = text.replace(/\s*\n+\s*/g, ' ');
    return ctx.opts.headingStyle === 'atxClosed'
      ? hashes + ' ' + body + ' ' + hashes
      : hashes + ' ' + body;
  }

  function quote(text) {
    if (!text) return '';
    return text.split('\n').map((line) => (line ? '> ' + line : '>')).join('\n');
  }

  /** <pre> 只包一個 <code> 時以 code 為準，其他情況用整段原始文字 */
  function codeBlockOf(el, ctx) {
    const onlyChild = onlyElementChild(el);
    const code = onlyChild && tagOf(onlyChild) === 'CODE' ? onlyChild : null;
    let text = rawText(code || el);
    text = text.replace(/^\n+/, '').replace(/\s+$/, '');
    if (!text) return '';
    const lang = ctx.opts.codeLanguageFromClass ? langOf(el, code) : '';
    return M.codeBlock(text, ctx.opts.codeFence, lang);
  }

  function onlyElementChild(el) {
    const children = kids(el);
    const elements = children.filter((node) => node.nodeType === ELEMENT_NODE);
    const texts = children.filter((node) => node.nodeType === TEXT_NODE && /\S/.test(node.nodeValue || ''));
    return elements.length === 1 && !texts.length ? elements[0] : null;
  }

  function langOf(pre, code) {
    const sources = [
      attr(code, 'class'), attr(pre, 'class'),
      attr(code, 'data-lang'), attr(pre, 'data-lang'),
      attr(code, 'data-language'), attr(pre, 'data-language')
    ];
    for (const value of sources) {
      if (!value) continue;
      const hit = LANG_RE.exec(value);
      if (hit && hit[1] && !/^(none|plain|text|plaintext)$/i.test(hit[1])) return hit[1].toLowerCase();
    }
    // 有些網站直接把語言當成 class，例如 class="javascript"
    for (const value of sources) {
      for (const token of String(value).split(/\s+/)) {
        const name = token.toLowerCase();
        if (KNOWN_LANGS.has(name)) return name;
      }
    }
    return '';
  }

  function list(el, ctx) {
    const ordered = tagOf(el) === 'OL';
    const start = ordered ? (parseInt(attr(el, 'start'), 10) || 1) : 1;
    const reversed = ordered && hasAttr(el, 'reversed');
    const items = elementKids(el).filter((node) => tagOf(node) === 'LI' && !isSkippable(node));
    const lines = [];

    items.forEach((li, index) => {
      const marker = ordered
        ? String(reversed ? start - index : start + index) + '. '
        : ctx.opts.bulletMarker + ' ';
      let body = joinBlocks(renderBlocks(li, ctx));
      const task = ctx.opts.taskLists ? taskStateOf(li) : null;
      if (task !== null) body = (task ? '[x] ' : '[ ] ') + body.replace(/^\s+/, '');
      if (!body.trim()) return;
      lines.push(M.prefixLines(body, marker, ' '.repeat(marker.length)));
    });

    return lines.join('\n');
  }

  function taskStateOf(li, depth) {
    if (!li || (depth || 0) > 3) return null;
    for (const child of elementKids(li)) {
      if (tagOf(child) === 'INPUT' && /^checkbox$/i.test(attr(child, 'type'))) {
        return hasAttr(child, 'checked') || attr(child, 'aria-checked') === 'true';
      }
      const nested = taskStateOf(child, (depth || 0) + 1);
      if (nested !== null) return nested;
    }
    return null;
  }

  function collectRows(el, rows, depth) {
    for (const child of elementKids(el)) {
      const tag = tagOf(child);
      if (tag === 'TR') rows.push(child);
      else if ((tag === 'THEAD' || tag === 'TBODY' || tag === 'TFOOT') && (depth || 0) < 3) {
        collectRows(child, rows, (depth || 0) + 1);
      }
    }
  }

  function alignOf(cell) {
    const align = attr(cell, 'align').toLowerCase();
    if (align === 'left' || align === 'right' || align === 'center') return align;
    const style = attr(cell, 'style');
    const hit = /text-align\s*:\s*(left|right|center)/i.exec(style);
    return hit ? hit[1].toLowerCase() : '';
  }

  function table(el, ctx) {
    const rows = [];
    collectRows(el, rows, 0);
    if (!rows.length) return '';

    const cellRows = rows
      .map((tr) => elementKids(tr).filter((cell) => {
        const tag = tagOf(cell);
        return (tag === 'TD' || tag === 'TH') && !isSkippable(cell);
      }))
      .filter((cells) => cells.length);
    if (!cellRows.length) return '';

    let spanned = false;
    const textRows = cellRows.map((cells) => {
      const out = [];
      for (const cell of cells) {
        const colspan = Math.max(1, parseInt(attr(cell, 'colspan'), 10) || 1);
        const rowspan = Math.max(1, parseInt(attr(cell, 'rowspan'), 10) || 1);
        if (colspan > 1 || rowspan > 1) spanned = true;
        out.push(M.escapeCell(trimInline(renderInlineNodes(kids(cell), ctx))));
        for (let i = 1; i < colspan; i++) out.push('');
      }
      return out;
    });

    if (spanned) {
      ctx.warnings.push({ key: 'warn.tableSpan' });
    }
    if (!cellRows[0].some((cell) => tagOf(cell) === 'TH')) {
      ctx.warnings.push({ key: 'warn.tableNoHead' });
    }

    const aligns = cellRows[0].map(alignOf);
    return M.buildTable(textRows, aligns);
  }

  // ------------------------------------------------------------------ 行內

  function trimInline(text) {
    return String(text || '').replace(/^\s+/, '').replace(/\s+$/, '');
  }

  /**
   * 相鄰節點各自帶著邊界空白，接起來常會出現連續空白。
   * 行尾剛好兩個空白是 Markdown 的強制換行語法，所以只壓縮「後面不是換行」的空白。
   */
  function collapseInline(text) {
    return String(text || '').replace(/[ \t]{2,}(?!\n)/g, ' ');
  }

  /**
   * 標記不能貼著空白，`** 粗體 **` 在 Markdown 裡不會生效，
   * 所以把前後空白挪到標記外面。
   */
  function wrapInline(inner, marker) {
    const hit = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(inner || ''));
    if (!hit || !hit[2]) return String(inner || '');
    return hit[1] + marker + hit[2] + marker + hit[3];
  }

  function renderInlineNodes(nodes, ctx) {
    let out = '';
    for (const node of nodes) out += renderInline(node, ctx);
    return out;
  }

  function renderInlineOf(el, ctx) {
    return renderInlineNodes(kids(el), ctx);
  }

  function renderText(node) {
    let text = String(node.nodeValue || '');
    if (!text) return '';
    text = text.replace(/[\t\n\r\f\v]+/g, ' ').replace(/ {2,}/g, ' ');
    if (!text.trim()) return ' ';
    return M.escapeInline(text);
  }

  function renderInline(node, ctx) {
    if (!node) return '';
    if (node.nodeType === TEXT_NODE) return renderText(node);
    if (node.nodeType !== ELEMENT_NODE) return '';
    if (isSkippable(node)) return '';

    const tag = tagOf(node);

    if (ctx.opts.mathAsTex && isMath(node)) {
      const tex = texOf(node);
      if (tex) return '$' + tex.replace(/\s*\n\s*/g, ' ') + '$';
    }

    switch (tag) {
      case 'BR':
        return ctx.opts.keepLineBreaks ? '  \n' : ' ';
      case 'WBR':
      case 'RT':
      case 'RP':
        return '';
      case 'IMG':
        return image(node, ctx);
      case 'PICTURE': {
        const img = elementKids(node).find((child) => tagOf(child) === 'IMG');
        return img ? image(img, ctx) : '';
      }
      case 'A':
        return link(node, ctx);
      case 'CODE':
      case 'TT':
      case 'KBD':
      case 'SAMP':
      case 'VAR':
        return M.inlineCode(rawText(node).replace(/\s+/g, ' ').trim());
      case 'STRONG':
      case 'B':
        return wrapInline(renderInlineOf(node, ctx), ctx.opts.strongMarker);
      case 'EM':
      case 'I':
      case 'DFN':
      case 'CITE':
        return wrapInline(renderInlineOf(node, ctx), ctx.opts.emphasisMarker);
      case 'DEL':
      case 'S':
      case 'STRIKE':
        return ctx.opts.strikethrough
          ? wrapInline(renderInlineOf(node, ctx), '~~')
          : renderInlineOf(node, ctx);
      case 'MARK':
        return ctx.opts.highlightMarker
          ? wrapInline(renderInlineOf(node, ctx), '==')
          : renderInlineOf(node, ctx);
      case 'SUP':
      case 'SUB': {
        // Markdown 沒有上下標語法，保留最小的 HTML（多數渲染器都支援）
        const inner = trimInline(renderInlineOf(node, ctx));
        if (!inner) return '';
        const name = tag.toLowerCase();
        return '<' + name + '>' + inner + '</' + name + '>';
      }
      case 'Q': {
        const inner = trimInline(renderInlineOf(node, ctx));
        return inner ? '"' + inner + '"' : '';
      }
      case 'INPUT':
        return '';
      default:
        return renderInlineOf(node, ctx);
    }
  }

  function imageSrc(el, ctx) {
    const candidates = [
      attr(el, 'src'),
      attr(el, 'data-src'),
      attr(el, 'data-original'),
      attr(el, 'data-lazy-src'),
      attr(el, 'data-actualsrc'),
      M.pickFromSrcset(attr(el, 'srcset')),
      M.pickFromSrcset(attr(el, 'data-srcset'))
    ];
    for (const value of candidates) {
      const src = String(value || '').trim();
      if (!src) continue;
      // 1x1 佔位圖沒有意義，繼續往後找真正的網址
      if (/^data:image\/(gif|png);base64,r0lgod|^data:image\/svg\+xml/i.test(src)) continue;
      return ctx.opts.absoluteUrls ? M.resolveUrl(ctx.opts.baseUrl, src) : src;
    }
    return '';
  }

  function image(el, ctx) {
    if (ctx.opts.imageMode === 'strip') return '';
    const alt = M.escapeInline(M.collapseSpaces(attr(el, 'alt')));
    if (ctx.opts.imageMode === 'alt') return alt;

    const src = imageSrc(el, ctx);
    if (!src) return alt;
    if (ctx.opts.skipDataUrlImages && /^data:/i.test(src)) {
      ctx.warnings.push({ key: 'warn.dataUrlImage' });
      return alt;
    }

    ctx.images++;
    const title = M.collapseSpaces(attr(el, 'title'));
    return '![' + alt + '](' + M.encodeUrl(src) + (title ? ' "' + title.replace(/"/g, '\\"') + '"' : '') + ')';
  }

  function referenceId(url, title, ctx) {
    const key = url + '\n' + (title || '');
    if (ctx.refMap.has(key)) return ctx.refMap.get(key);
    const id = ctx.refs.length + 1;
    ctx.refs.push({ id, url, title: title || '' });
    ctx.refMap.set(key, id);
    return id;
  }

  function link(el, ctx) {
    const wasInLink = ctx.inLink;
    ctx.inLink = true;
    const raw = renderInlineOf(el, ctx);
    ctx.inLink = wasInLink;

    const hit = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
    const lead = hit ? hit[1] : '';
    const core = hit ? hit[2] : raw;
    const trail = hit ? hit[3] : '';
    if (!core) return '';

    const plain = lead + core + trail;
    if (wasInLink || ctx.opts.linkStyle === 'strip') return plain;

    const href = attr(el, 'href').trim();
    if (!href || /^(javascript|about):/i.test(href)) return plain;
    if (/^#/.test(href) && !ctx.opts.keepFragmentLinks) return plain;

    const url = ctx.opts.absoluteUrls ? M.resolveUrl(ctx.opts.baseUrl, href) : href;
    if (!url) return plain;

    ctx.links++;
    const title = M.collapseSpaces(attr(el, 'title'));

    if (ctx.opts.linkStyle === 'bare') return lead + '<' + url + '>' + trail;
    if (ctx.opts.linkStyle === 'referenced') {
      return lead + '[' + core + '][' + referenceId(url, title, ctx) + ']' + trail;
    }
    return lead + '[' + core + '](' + M.encodeUrl(url) +
      (title ? ' "' + title.replace(/"/g, '\\"') + '"' : '') + ')' + trail;
  }

  // ------------------------------------------------------------------ 對外

  function convert(rootEl, options) {
    const ctx = {
      opts: Object.assign({}, DEFAULTS, options || {}),
      refs: [],
      refMap: new Map(),
      links: 0,
      images: 0,
      warnings: [],
      inLink: false
    };

    let markdown = joinBlocks(renderBlocks(rootEl, ctx));
    if (ctx.refs.length) {
      const lines = ctx.refs.map((ref) => {
        return '[' + ref.id + ']: ' + ref.url + (ref.title ? ' "' + ref.title.replace(/"/g, '\\"') + '"' : '');
      });
      markdown += '\n\n' + lines.join('\n');
    }

    // 警告是 { key } 物件（頁面環境沒有 i18n），Set 去重不了，改用 key 去重
    const seen = new Set();
    const warnings = ctx.warnings.filter((note) => {
      if (seen.has(note.key)) return false;
      seen.add(note.key);
      return true;
    });

    return {
      markdown: M.tidy(markdown),
      links: ctx.links,
      images: ctx.images,
      warnings
    };
  }

  root.W2MHtml2Md = { DEFAULTS, convert };
})(typeof self !== 'undefined' ? self : this);
