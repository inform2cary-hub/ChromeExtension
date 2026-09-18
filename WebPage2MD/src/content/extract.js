/**
 * 瀏覽器端的內容擷取：挑出主要內容、複製一份乾淨的節點樹、收集網頁中介資料。
 *
 * 重要原則：**絕不動使用者的頁面**。
 * 需要 getComputedStyle 判斷可見性時，會在原始節點上暫時加一個屬性標記，
 * 複製完立刻移除，所有清理都只發生在複製出來的那份樹上。
 */
(function (root) {
  'use strict';

  const DROP_ATTR = 'data-w2m-drop';
  const TEXT_SKIP_SELECTOR = 'script,style,noscript,template,svg,iframe';

  /** 常見的文章容器，順序不代表優先權，實際靠文字量與連結密度評分 */
  const MAIN_SELECTORS = [
    'article', 'main', '[role="main"]', '[itemprop="articleBody"]',
    '#content', '#main', '#article', '.post-content', '.entry-content',
    '.article-content', '.article-body', '.post-body', '.markdown-body', '.markdown-section'
  ];

  /** 一律視為干擾的元素（含只有螢幕閱讀器看得到的跳轉連結） */
  const DROP_SELECTOR = [
    'script', 'style', 'noscript', 'template', 'link', 'meta',
    'iframe', 'frame', 'object', 'embed', 'canvas', 'svg', 'video', 'audio', 'track', 'source',
    'button', 'select', 'textarea', 'datalist', 'dialog', 'input:not([type="checkbox"])',
    '[' + DROP_ATTR + ']', '[aria-hidden="true"]', '[hidden]',
    '[role="navigation"]', '[role="banner"]', '[role="search"]', '[role="complementary"]',
    '[role="dialog"]', '[role="alertdialog"]', '[role="menu"]', '[role="menubar"]', '[role="toolbar"]',
    '.sr-only', '.visually-hidden', '.screen-reader-text', '.skip-link'
  ].join(',');

  const JUNK_TAGS = new Set(['NAV', 'ASIDE', 'FOOTER']);

  const JUNK_RE = new RegExp('(?:^|[\\s_-])(' + [
    'ads?', 'advert\\w*', 'banner', 'breadcrumb\\w*', 'comments?', 'cookie\\w*', 'disqus',
    'footer', 'masthead', 'newsletter', 'paywall', 'popup', 'promo\\w*', 'related',
    'share', 'sharing', 'sidebar', 'site-header', 'social', 'sponsor\\w*', 'subscribe',
    'toolbar', 'utility-bar', 'widget',
    // 程式碼區塊上方的語言標籤：內容已經寫進 ``` 的資訊字串，留著只會多一行雜訊
    'language-name'
  ].join('|') + ')(?:[\\s_-]|$)', 'i');

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 計算真正給人看的文字長度。
   * 不能直接用 textContent：網頁常在 body 裡內嵌 JSON-LD、水合資料或分析腳本，
   * 那些內容會讓「主要內容佔比」被嚴重低估，導致判斷失準。
   */
  function textLength(el) {
    if (!el) return 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(TEXT_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let total = 0;
    while (walker.nextNode()) {
      total += walker.currentNode.nodeValue.replace(/\s+/g, ' ').trim().length;
    }
    return total;
  }

  /** 連結密度高通常代表這是導覽或推薦清單，不是文章本體 */
  function linkDensity(el) {
    const total = textLength(el);
    if (!total) return 1;
    let inLinks = 0;
    el.querySelectorAll('a').forEach((a) => {
      inLinks += textLength(a);
    });
    return Math.min(1, inLinks / total);
  }

  /**
   * 只保留主要內容：找出文章容器並回傳。
   * 判斷不夠明確就回傳 body，寧可多輸出也不要漏掉內容。
   */
  function pickMain() {
    const body = document.body;
    if (!body) return { node: null, applied: false, reason: { key: 'prep.noBody' } };

    const total = textLength(body);
    if (total < 300) return { node: body, applied: false, reason: { key: 'prep.tooLittleText' } };

    const candidates = [];
    for (const selector of MAIN_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (e) {
        continue;
      }
      nodes.forEach((node) => {
        const length = textLength(node);
        if (length < 300) return;
        candidates.push({ node, length, score: length * (1 - linkDensity(node)) });
      });
    }
    if (!candidates.length) return { node: body, applied: false, reason: { key: 'prep.noMainBlock' } };

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const ratio = best.length / total;
    if (ratio < 0.35) {
      return {
        node: body,
        applied: false,
        reason: { key: 'prep.ratioTooLow', params: { ratio: Math.round(ratio * 100) } }
      };
    }
    return { node: best.node, applied: true, ratio: Math.round(ratio * 100), reason: null };
  }

  /** 在原始節點上標記看不見的元素，複製完會立刻清掉 */
  function markHidden(el) {
    if (!el || !el.querySelectorAll) return 0;
    const all = el.querySelectorAll('*');
    if (all.length > 12000) return -1; // 節點太多就跳過可見性判斷，避免整頁卡住
    let count = 0;
    for (const node of all) {
      if (node.closest('[' + DROP_ATTR + ']')) continue; // 祖先已判定隱藏，整棵子樹都不用看
      let style;
      try {
        style = getComputedStyle(node);
      } catch (e) {
        continue;
      }
      // 只看 display 與 visibility：opacity 常被進場動畫用來做淡入，
      // 拿它判斷會把整篇文章誤刪。
      if (style.display === 'none' || style.visibility === 'hidden') {
        node.setAttribute(DROP_ATTR, '1');
        count++;
      }
    }
    return count;
  }

  function unmarkHidden(el) {
    if (!el || !el.querySelectorAll) return;
    el.querySelectorAll('[' + DROP_ATTR + ']').forEach((node) => node.removeAttribute(DROP_ATTR));
    if (el.removeAttribute) el.removeAttribute(DROP_ATTR);
  }

  /** 子樹裡有沒有 shadow host。沒有的話就走原生 cloneNode，快很多 */
  function anyShadowHost(el) {
    if (el.shadowRoot) return true;
    for (const node of el.querySelectorAll('*')) {
      if (node.shadowRoot) return true;
    }
    return false;
  }

  /**
   * 會展開 open shadow root 的複製。
   *
   * cloneNode 不會複製 shadow root，所以用 web component 包內容的網站
   * （MDN 的程式碼區塊就是 <mdn-code-example> + shadow DOM）複製出來會是空殼，
   * 整段內容無聲消失。closed 的 shadow root 外部本來就讀不到，只能跳過。
   *
   * <slot> 要換成實際被投影進去的節點：shadow 樹裡的 slot 只是佔位，
   * 真正的內容在 light DOM，直接複製 slot 會把那段內容漏掉。
   */
  function cloneDeep(node) {
    if (node.nodeType !== 1) return node.cloneNode(true);

    if (node.localName === 'slot' && typeof node.assignedNodes === 'function') {
      const frag = node.ownerDocument.createDocumentFragment();
      let list = [];
      try {
        list = node.assignedNodes({ flatten: true });
      } catch (e) {
        list = [];
      }
      // 沒有被投影任何東西時，slot 自己的子節點就是後備內容
      if (!list.length) list = Array.from(node.childNodes);
      for (const child of list) frag.appendChild(cloneDeep(child));
      return frag;
    }

    const copy = node.cloneNode(false);
    // 有 shadow root 時，畫面上看到的是 shadow 的內容，light 子節點只有透過 slot 才會出現
    const source = node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes;
    for (const child of Array.from(source)) copy.appendChild(cloneDeep(child));
    return copy;
  }

  /** 標記隱藏 -> 複製 -> 還原標記，回傳可以放心改的複本 */
  function snapshot(liveEl) {
    let marked = 0;
    try {
      marked = markHidden(liveEl);
      const clone = anyShadowHost(liveEl) ? cloneDeep(liveEl) : liveEl.cloneNode(true);
      return { clone, marked };
    } finally {
      unmarkHidden(liveEl);
    }
  }

  function removeBySelector(scope, selector) {
    let count = 0;
    let nodes;
    try {
      nodes = scope.querySelectorAll(selector);
    } catch (e) {
      return 0;
    }
    nodes.forEach((node) => {
      if (!node.parentNode) return; // 祖先已被移除
      node.remove();
      count++;
    });
    return count;
  }

  function removeUserSelectors(scope, selectors) {
    const list = String(selectors || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let count = 0;
    for (const selector of list) count += removeBySelector(scope, selector);
    return count;
  }

  /**
   * 依標籤與 id/class 名稱移除干擾區塊。
   * 只要該元素的文字量超過整體三成就不動它 —— 名稱像廣告但其實是內容包裝的情況很常見，
   * 誤刪整篇文章的代價遠大於留下一段側欄。
   */
  /**
   * 程式碼區塊內部一律不清理。
   * 語法標示器會把每個 token 包成 <span class="token comment">、class="token string" 之類，
   * 那些名字會誤中 JUNK_RE 的 comments / share 等關鍵字，把程式碼啃掉一塊 ——
   * 而且是無聲的，輸出看起來還是一段程式碼，只是少了幾行。
   */
  function insideCode(node) {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
      const tag = parent.tagName;
      if (tag === 'PRE' || tag === 'CODE') return true;
    }
    return false;
  }

  function stripJunk(scope, totalLength) {
    const limit = Math.max(200, totalLength * 0.3);
    let count = 0;
    for (const node of Array.from(scope.querySelectorAll('*'))) {
      if (!node.parentNode) continue;
      if (insideCode(node)) continue;
      const name = (node.getAttribute('id') || '') + ' ' + (node.getAttribute('class') || '');
      const byName = JUNK_RE.test(name);
      if (!byName && !JUNK_TAGS.has(node.tagName)) continue;
      if (textLength(node) > limit) continue;
      node.remove();
      count++;
    }
    return count;
  }

  /** 內容腳本拿不到 i18n，訊息一律只回傳 { key, params }，由 service worker 翻譯 */
  function clean(scope, settings) {
    const notes = [];
    const total = textLength(scope);

    const dropped = removeBySelector(scope, DROP_SELECTOR);
    if (dropped) notes.push({ key: 'prep.droppedNodes', params: { count: dropped } });

    const custom = removeUserSelectors(scope, settings.removeSelectors);
    if (custom) notes.push({ key: 'prep.droppedCustom', params: { count: custom } });

    if (settings.stripJunk) {
      const junk = stripJunk(scope, total);
      if (junk) notes.push({ key: 'prep.droppedJunk', params: { count: junk } });
    }
    return notes;
  }

  // -------------------------------------------------------------- 中介資料

  function metaOf(selector) {
    try {
      const node = document.querySelector(selector);
      return node ? String(node.getAttribute('content') || '').trim() : '';
    } catch (e) {
      return '';
    }
  }

  function firstOf(list) {
    for (const value of list) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
    return '';
  }

  function jsonLdNodes() {
    const out = [];
    const push = (value) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(push);
        return;
      }
      out.push(value);
      if (value['@graph']) push(value['@graph']);
    };
    document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
      try {
        push(JSON.parse(node.textContent || ''));
      } catch (e) {
        // 網頁自己的 JSON-LD 壞掉不影響擷取
      }
    });
    return out;
  }

  function nameOf(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return nameOf(value[0]);
    if (typeof value === 'object') return String(value.name || '');
    return '';
  }

  function fromJsonLd() {
    const nodes = jsonLdNodes();
    const article = nodes.find((node) => /article|blogposting|newsarticle|report|posting/i.test(String(node['@type'] || '')));
    if (!article) return {};
    return {
      title: String(article.headline || article.name || ''),
      author: nameOf(article.author),
      published: String(article.datePublished || article.dateCreated || ''),
      description: String(article.description || '')
    };
  }

  function collectTags() {
    const tags = [];
    document.querySelectorAll('meta[property="article:tag"]').forEach((node) => {
      const value = String(node.getAttribute('content') || '').trim();
      if (value) tags.push(value);
    });
    const keywords = metaOf('meta[name="keywords"]');
    if (keywords) {
      keywords.split(/[,;]+/).forEach((value) => {
        const text = value.trim();
        if (text) tags.push(text);
      });
    }
    return Array.from(new Set(tags)).slice(0, 20);
  }

  function collectMeta() {
    const M = root.W2MMarkdown;
    const ld = fromJsonLd();

    let canonical = '';
    const link = document.querySelector('link[rel="canonical"]');
    if (link) canonical = String(link.getAttribute('href') || '').trim();

    const siteName = firstOf([
      metaOf('meta[property="og:site_name"]'),
      location.hostname.replace(/^www\./i, '')
    ]);

    // 標題來源的取捨：文章大標通常最乾淨，但頁面上第一個標題也可能只是內容裡的示範標題，
    // 所以只有在它和 document.title 對得上時才採用，否則以 document.title 為準。
    // 也接受 h2：不少版型把站名放 h1、文章標題放 h2。
    const h1 = document.querySelector('h1, h2');
    const h1Text = h1 ? String(h1.textContent || '') : '';
    const docTitle = document.title || '';
    const fallbackTitle = h1Text && M.looksSameTitle(h1Text, docTitle) ? h1Text : (docTitle || h1Text);

    const rawTitle = firstOf([
      metaOf('meta[property="og:title"]'),
      metaOf('meta[name="twitter:title"]'),
      ld.title,
      fallbackTitle
    ]);

    const time = document.querySelector('time[datetime]');

    // og:title 常常也帶著「｜站名」，但站名不一定拿得到。
    // 這時如果 <h1> 剛好是它的前綴，就採用 h1 —— 那才是乾淨的標題。
    let title = M.stripSiteSuffix(rawTitle, siteName) || rawTitle;
    const heading = M.collapseSpaces(h1Text);
    if (heading && heading.length < M.collapseSpaces(title).length && M.looksSameTitle(heading, title)) {
      title = heading;
    }

    return {
      title,
      url: M.resolveUrl(location.href, canonical) || location.href,
      siteName,
      author: firstOf([
        metaOf('meta[name="author"]'),
        metaOf('meta[property="article:author"]'),
        ld.author,
        (document.querySelector('[rel="author"]') || {}).textContent
      ]),
      published: firstOf([
        metaOf('meta[property="article:published_time"]'),
        metaOf('meta[name="date"]'),
        metaOf('meta[itemprop="datePublished"]'),
        ld.published,
        time ? time.getAttribute('datetime') : ''
      ]),
      description: firstOf([
        metaOf('meta[property="og:description"]'),
        metaOf('meta[name="description"]'),
        ld.description
      ]),
      lang: String((document.documentElement && document.documentElement.lang) || '').trim(),
      tags: collectTags()
    };
  }

  // ---------------------------------------------------------------- 選取範圍

  function selectionFragment() {
    const selection = window.getSelection && window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    if (String(selection).replace(/\s+/g, ' ').trim().length < 2) return null;

    const holder = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i++) {
      holder.appendChild(selection.getRangeAt(i).cloneContents());
    }
    return holder;
  }

  /** 捲動整頁觸發延遲載入，結束後把捲動位置還原 */
  async function expandLazyContent() {
    const startX = window.scrollX;
    const startY = window.scrollY;
    const step = Math.max(200, Math.floor(window.innerHeight * 0.9));
    let y = 0;
    for (let i = 0; i < 60; i++) { // 最多捲 60 屏，避免無限捲動頁面卡死
      window.scrollTo(0, y);
      await sleep(50);
      const height = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      y += step;
      if (y >= height) break;
    }
    window.scrollTo(startX, startY);
    await sleep(60);
  }

  root.W2MExtract = {
    DROP_ATTR,
    sleep,
    textLength,
    linkDensity,
    pickMain,
    snapshot,
    clean,
    collectMeta,
    selectionFragment,
    expandLazyContent
  };
})(typeof self !== 'undefined' ? self : this);
