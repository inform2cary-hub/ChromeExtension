/**
 * 把網頁 DOM 拆成「可翻譯段落」（translation unit）。
 *
 * 兩種 unit：
 *   element -> 一個區塊元素，其內部只有行內內容（例如 <p>、<li>、<h2>）
 *   run     -> 區塊元素底下夾在其他區塊之間的行內內容（例如 <div>文字<div>…</div></div>）
 *
 * 每個 unit 都記錄插入譯文用的 anchor，譯文一律插在原文之後，不修改原有節點。
 */
(function (root) {
  'use strict';

  if (root.AITExtract) return; // 避免重複注入時重置狀態

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'META', 'LINK',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'TT',
    'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'OPTGROUP', 'BUTTON', 'PROGRESS', 'METER',
    'IMG', 'PICTURE', 'SOURCE', 'VIDEO', 'AUDIO', 'TRACK', 'CANVAS', 'IFRAME', 'FRAME',
    'OBJECT', 'EMBED', 'PARAM', 'MAP', 'AREA', 'SVG', 'MATH', 'RT', 'RP'
  ]);

  const BLOCKISH_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'CAPTION', 'CENTER', 'DD',
    'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
    'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR',
    'LEGEND', 'LI', 'MAIN', 'MENU', 'NAV', 'OL', 'P', 'SECTION', 'SUMMARY', 'TABLE',
    'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
  ]);

  const INLINE_TAGS = new Set([
    'A', 'ABBR', 'B', 'BDI', 'BDO', 'BR', 'CITE', 'DATA', 'DEL', 'DFN', 'EM', 'I',
    'INS', 'LABEL', 'MARK', 'Q', 'RUBY', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB',
    'SUP', 'TIME', 'U', 'WBR', 'FONT', 'NOBR'
  ]);

  /**
   * SKIP_TAGS 中「文字仍屬於句子一部分」的行內標籤。
   * 例如 <code>mmap</code> 應該留在句子裡送去翻譯（模型會保留原文），
   * 但 <script>、<textarea> 的內容絕對不能算成文章文字。
   */
  const INLINE_TEXTUAL_SKIP = new Set(['CODE', 'KBD', 'SAMP', 'VAR', 'TT']);

  const LETTER_SOURCE = '[A-Za-z\\u00c0-\\u024f\\u0370-\\u03ff\\u0400-\\u04ff\\u0590-\\u05ff\\u0600-\\u06ff\\u0e00-\\u0e7f\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af]';
  const LETTER_RE = new RegExp(LETTER_SOURCE);
  const LETTER_RE_G = new RegExp(LETTER_SOURCE, 'g');

  let uid = 0;
  let seen = new WeakSet();

  function isElement(node) {
    return !!node && node.nodeType === 1;
  }

  function isTextNode(node) {
    return !!node && node.nodeType === 3;
  }

  function tagOf(el) {
    return el.tagName ? el.tagName.toUpperCase() : '';
  }

  function isForeign(el) {
    return !!el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml';
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function isHardSkipTag(tag) {
    return SKIP_TAGS.has(tag) && !INLINE_TEXTUAL_SKIP.has(tag);
  }

  /**
   * 取得節點的可翻譯文字：排除 script / style / textarea / svg 等非文章內容，
   * 也排除我們自己插入的譯文節點（重新掃描時才不會把譯文當成原文）。
   */
  function textOf(node) {
    if (isTextNode(node)) return node.nodeValue || '';
    if (!isElement(node)) return '';
    if (isForeign(node) || isOurNode(node)) return '';
    if (isHardSkipTag(tagOf(node))) return '';
    let out = '';
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      out += textOf(children[i]);
    }
    return out;
  }

  function hasRawText(node) {
    const text = node.textContent;
    return !!text && /\S/.test(text);
  }

  function isOurNode(el) {
    return el.hasAttribute && el.hasAttribute('data-ait');
  }

  function shouldSkip(el, ctx) {
    if (!isElement(el) || isForeign(el)) return true;
    if (SKIP_TAGS.has(tagOf(el))) return true;
    if (isOurNode(el)) return true;
    if (el.isContentEditable) return true;
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    if (el.getAttribute('translate') === 'no') return true;
    if (ctx.skipSelectors) {
      try {
        if (el.matches(ctx.skipSelectors)) return true;
      } catch (e) {
        ctx.skipSelectors = '';
      }
    }
    return false;
  }

  function isBlockish(el) {
    if (isForeign(el)) return false;
    const tag = tagOf(el);
    if (BLOCKISH_TAGS.has(tag)) return true;
    if (INLINE_TAGS.has(tag)) return false;
    try {
      const display = getComputedStyle(el).display;
      return display === 'block' || display === 'list-item' || display === 'flow-root' ||
        display === 'flex' || display === 'grid' || display.indexOf('table') === 0;
    } catch (e) {
      return false;
    }
  }

  function isVisible(el) {
    if (typeof el.checkVisibility === 'function') {
      try {
        return el.checkVisibility({ checkVisibilityCSS: true });
      } catch (e) {
        // 舊版瀏覽器參數不支援時走下方備援
      }
    }
    return !!(el.offsetParent || (el.getClientRects && el.getClientRects().length));
  }

  function looksSameLanguage(text, target) {
    const stripped = text.replace(/\s+/g, '');
    if (!stripped.length) return true;
    const ratio = (re) => (stripped.match(re) || []).length / stripped.length;
    if (/^zh/i.test(target)) return ratio(/[\u3400-\u9fff]/g) > 0.4;
    if (/^ja/i.test(target)) return ratio(/[\u3040-\u30ff\u4e00-\u9fff]/g) > 0.4;
    if (/^ko/i.test(target)) return ratio(/[\uac00-\ud7af]/g) > 0.4;
    if (/^en/i.test(target)) return ratio(/[A-Za-z]/g) > 0.7;
    return false;
  }

  function isTranslatable(text, ctx) {
    if (text.length < ctx.minChars) return false;
    if (!LETTER_RE.test(text)) return false;
    if (/^https?:\/\/\S+$/i.test(text)) return false;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;
    const letters = (text.match(LETTER_RE_G) || []).length;
    if (letters / text.length < 0.3) return false;
    if (ctx.skipSameLanguage && looksSameLanguage(text, ctx.targetLang)) return false;
    return true;
  }

  function elementUnit(el, text) {
    return { id: ++uid, kind: 'element', el, anchor: el, nodes: [el], text, node: null, status: 'pending' };
  }

  function runUnit(parent, nodes, text) {
    return {
      id: ++uid,
      kind: 'run',
      el: parent,
      anchor: nodes[nodes.length - 1],
      nodes: nodes.slice(),
      text,
      node: null,
      status: 'pending'
    };
  }

  /** IntersectionObserver 要監看的元素 */
  function observeTargetOf(unit) {
    if (unit.kind === 'element') return unit.el;
    const el = unit.nodes.find(isElement);
    return el || unit.el;
  }

  function collectRuns(parent, ctx, out) {
    const children = parent.childNodes;
    let run = [];

    const flush = () => {
      const current = run;
      run = [];
      if (!current.length) return;
      if (current.some((node) => seen.has(node))) return;
      const text = normalize(current.map(textOf).join(''));
      if (!isTranslatable(text, ctx)) return;
      if (current.length === 1 && isElement(current[0]) && shouldSkip(current[0], ctx)) return;
      if (!isVisible(parent)) return;
      current.forEach((node) => seen.add(node));
      out.push(runUnit(parent, current, text));
    };

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (isTextNode(node)) {
        if (/\S/.test(node.nodeValue) || run.length) run.push(node);
        continue;
      }
      if (!isElement(node)) continue;
      // 區塊元素、我們插入的譯文、非文章內容（script/textarea…）都視為一段行內內容的邊界
      if (isOurNode(node) || isBlockish(node) || isHardSkipTag(tagOf(node)) || isForeign(node)) {
        flush();
        continue;
      }
      run.push(node);
    }
    flush();
  }

  function walk(el, ctx, out, depth) {
    if (depth > 80) return;
    if (shouldSkip(el, ctx)) return;
    if (!hasRawText(el)) return;

    const children = el.children;
    let hasBlockChild = false;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (isBlockish(child) && !shouldSkip(child, ctx) && hasRawText(child)) {
        hasBlockChild = true;
        break;
      }
    }

    if (!hasBlockChild) {
      if (seen.has(el)) return;
      const text = normalize(textOf(el));
      if (isTranslatable(text, ctx) && isVisible(el)) {
        seen.add(el);
        out.push(elementUnit(el, text));
      }
      return;
    }

    collectRuns(el, ctx, out);
    for (let i = 0; i < children.length; i++) {
      walk(children[i], ctx, out, depth + 1);
    }
  }

  function buildContext(settings) {
    let skipSelectors = String(settings.skipSelectors || '').trim();
    if (skipSelectors) {
      try {
        document.createDocumentFragment().querySelector(skipSelectors);
      } catch (e) {
        skipSelectors = '';
      }
    }
    return {
      minChars: Math.max(1, Number(settings.minChars) || 4),
      targetLang: settings.targetLang || 'zh-TW',
      skipSameLanguage: settings.skipSameLanguage !== false,
      skipSelectors
    };
  }

  /** @param {Element} rootEl @returns {Array} units */
  function collect(rootEl, ctx) {
    const out = [];
    if (!rootEl || !isElement(rootEl)) return out;
    walk(rootEl, ctx, out, 0);
    return out;
  }

  function resetSeen() {
    seen = new WeakSet();
  }

  root.AITExtract = {
    collect,
    buildContext,
    observeTargetOf,
    resetSeen,
    normalize
  };
})(window);
