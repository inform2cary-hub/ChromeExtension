/**
 * 列印前的頁面整理，以及事後還原。
 * 由 chrome.scripting 動態注入（isolated world），所有變更都記錄下來，
 * 產生 PDF 後一定會還原，不留痕跡在使用者的頁面上。
 *
 * 對外只暴露 window.__w2p = { prepare, restore }
 */
(function () {
  'use strict';

  if (window.__w2p) return;

  const STYLE_ID = 'w2p-print-style';
  const CSS = [
    '[data-w2p-hidden]{display:none !important}',
    '[data-w2p-static]{position:static !important;max-height:none !important}',
    'html[data-w2p-light],html[data-w2p-light] body{background:#fff !important;color:#111 !important}',
    'html[data-w2p-light] *{background-image:none !important;box-shadow:none !important}'
  ].join('\n');

  const state = {
    active: false,
    scrollX: 0,
    scrollY: 0,
    lazyImages: [],
    openedDetails: []
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function ensureStyle() {
    let node = document.getElementById(STYLE_ID);
    if (node) return node;
    node = document.createElement('style');
    node.id = STYLE_ID;
    node.textContent = CSS;
    (document.head || document.documentElement).appendChild(node);
    return node;
  }

  function markHidden(el) {
    if (el && el.setAttribute) el.setAttribute('data-w2p-hidden', '1');
  }

  const TEXT_SKIP_SELECTOR = 'script,style,noscript,template,svg,iframe';

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

  /** 使用者自訂的移除選擇器 */
  function removeBySelectors(selectors) {
    const list = String(selectors || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let count = 0;
    for (const selector of list) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (e) {
        continue; // 無效選擇器直接跳過
      }
      nodes.forEach((node) => {
        markHidden(node);
        count++;
      });
    }
    return count;
  }

  /** 固定／黏性定位的元素在列印時會擋住內容或每頁重複 */
  function neutralizeFixed() {
    let count = 0;
    const nodes = document.body ? document.body.querySelectorAll('*') : [];
    for (const el of nodes) {
      if (el.id === STYLE_ID) continue;
      let position;
      try {
        position = getComputedStyle(el).position;
      } catch (e) {
        continue;
      }
      if (position !== 'fixed' && position !== 'sticky') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      el.setAttribute('data-w2p-static', '1');
      count++;
    }
    return count;
  }

  /**
   * 只保留主要內容：先找出文章容器，再把「不在它的祖先路徑上」的兄弟節點隱藏。
   * 找不到足夠明確的容器就什麼都不做，寧可輸出整頁也不要漏掉內容。
   */
  function keepMainContentOnly() {
    if (!document.body) return { applied: false, reason: 'prep.noBody' };
    const bodyLength = textLength(document.body);
    if (bodyLength < 400) return { applied: false, reason: 'prep.tooLittleText' };

    const candidates = [];
    const selectors = ['article', 'main', '[role="main"]', '#content', '#main', '.post-content',
      '.entry-content', '.article-content', '.markdown-body', '.post-body'];
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (e) {
        continue;
      }
      nodes.forEach((node) => {
        const length = textLength(node);
        if (length >= 400) candidates.push({ node, length });
      });
    }
    if (!candidates.length) return { applied: false, reason: 'prep.noMainBlock' };

    candidates.sort((a, b) => b.length - a.length);
    const best = candidates[0];
    if (best.length / bodyLength < 0.4) {
      return { applied: false, reason: 'prep.ratioTooLow' };
    }

    // 標記祖先路徑，再隱藏路徑上每一層的其他兄弟節點
    const keepPath = new Set();
    let cursor = best.node;
    while (cursor && cursor !== document.body) {
      keepPath.add(cursor);
      cursor = cursor.parentElement;
    }
    let hidden = 0;
    cursor = best.node.parentElement;
    while (cursor && cursor !== document.documentElement) {
      for (const child of Array.from(cursor.children)) {
        if (keepPath.has(child)) continue;
        if (child.id === STYLE_ID) continue;
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
        markHidden(child);
        hidden++;
      }
      if (cursor === document.body) break;
      cursor = cursor.parentElement;
    }
    return { applied: true, hidden, ratio: Math.round((best.length / bodyLength) * 100) };
  }

  function expandDetails() {
    const nodes = document.querySelectorAll('details:not([open])');
    nodes.forEach((node) => {
      node.open = true;
      state.openedDetails.push(node);
    });
    return nodes.length;
  }

  /** 捲動整頁觸發延遲載入，並把 lazy 圖片改成立即載入 */
  async function expandLazyContent() {
    const images = Array.from(document.images || []);
    for (const img of images) {
      if (img.loading === 'lazy') {
        img.loading = 'eager';
        state.lazyImages.push(img);
      }
    }
    const step = Math.max(200, Math.floor(window.innerHeight * 0.9));
    const limit = 60; // 最多捲 60 屏，避免無限捲動頁面卡死
    let y = 0;
    for (let i = 0; i < limit; i++) {
      window.scrollTo(0, y);
      await sleep(50);
      const height = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      y += step;
      if (y >= height) break;
    }
    window.scrollTo(state.scrollX, state.scrollY);
    return images.length;
  }

  async function waitForAssets(timeoutMs) {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    const pending = Array.from(document.images || [])
      .filter((img) => !img.complete && img.src)
      .map((img) => new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }));

    const waits = [Promise.all(pending)];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);

    await Promise.race([
      Promise.all(waits),
      sleep(Math.max(0, deadline - Date.now()))
    ]);
  }

  async function prepare(options) {
    const opts = options || {};
    if (state.active) restore();

    state.active = true;
    state.scrollX = window.scrollX;
    state.scrollY = window.scrollY;
    state.lazyImages = [];
    state.openedDetails = [];

    ensureStyle();
    const notes = [];

    if (opts.removeSelectors) {
      const removed = removeBySelectors(opts.removeSelectors);
      if (removed) notes.push({ key: 'prep.hiddenBySelector', params: { count: removed } });
    }

    if (opts.mainContentOnly) {
      const result = keepMainContentOnly();
      if (result.applied) {
        notes.push({ key: 'prep.mainOnly', params: { ratio: result.ratio, hidden: result.hidden } });
      } else {
        notes.push({ key: result.reason });
      }
    }

    if (opts.removeFixed) {
      const count = neutralizeFixed();
      if (count) notes.push({ key: 'prep.unpinned', params: { count } });
    }

    if (opts.forceLightBackground) {
      document.documentElement.setAttribute('data-w2p-light', '1');
      notes.push({ key: 'prep.forcedLight' });
    }

    if (opts.expandDetails) {
      const count = expandDetails();
      if (count) notes.push({ key: 'prep.expandedDetails', params: { count } });
    }

    if (opts.expandLazyContent) {
      const total = await expandLazyContent();
      notes.push({ key: 'prep.scrolledLazy', params: { count: total } });
    }

    await waitForAssets(3000);
    if (opts.settleMs) await sleep(Math.min(5000, Math.max(0, opts.settleMs)));

    return {
      ok: true,
      notes,
      title: document.title || '',
      url: location.href,
      height: document.documentElement ? document.documentElement.scrollHeight : 0
    };
  }

  function restore() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.querySelectorAll('[data-w2p-hidden]').forEach((el) => el.removeAttribute('data-w2p-hidden'));
    document.querySelectorAll('[data-w2p-static]').forEach((el) => el.removeAttribute('data-w2p-static'));
    document.documentElement.removeAttribute('data-w2p-light');
    state.openedDetails.forEach((node) => {
      node.open = false;
    });
    state.lazyImages.forEach((img) => {
      img.loading = 'lazy';
    });
    if (state.active) window.scrollTo(state.scrollX, state.scrollY);
    state.active = false;
    state.lazyImages = [];
    state.openedDetails = [];
    return { ok: true };
  }

  window.__w2p = { prepare, restore };
})();
