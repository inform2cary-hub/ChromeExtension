/**
 * 譯文節點的建立、插入、狀態切換，以及右下角進度提示（HUD）。
 * 一律用 DOM API 建立節點（不用 innerHTML），避免踩到網站的 CSP / Trusted Types。
 */
(function (root) {
  'use strict';

  if (root.AITRender) return; // 避免重複注入時產生兩個 HUD

  const t = root.AITI18N.t;

  const HUD_ID = 'ait-hud';
  const CJK_FONT_STACK = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC","Hiragino Sans TC",sans-serif';

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function hexToRgb(hex) {
    let value = String(hex || '').trim().replace('#', '');
    if (value.length === 3) {
      value = value.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return { r: 42, g: 111, b: 151 };
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  /** 把外觀設定寫成 CSS 變數，content.css 只吃變數，切換樣式不需重建節點 */
  function applyTheme(settings) {
    const style = document.documentElement.style;
    style.setProperty('--ait-color', settings.color || '#2a6f97');
    style.setProperty('--ait-line', rgba(settings.color, 0.55));
    style.setProperty('--ait-bg', rgba(settings.color, 0.09));
    style.setProperty('--ait-font-scale', String(clamp(Number(settings.fontScale) || 1, 0.7, 1.6)));
    style.setProperty('--ait-font', settings.cjkFont ? CJK_FONT_STACK : 'inherit');
  }

  function setVisible(visible) {
    document.documentElement.classList.toggle('ait-off', !visible);
  }

  function makeDots() {
    const dots = document.createElement('span');
    dots.className = 'ait-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      dots.appendChild(document.createElement('i'));
    }
    return dots;
  }

  function createNode(settings) {
    const node = document.createElement('span');
    node.setAttribute('data-ait', 'tr');
    node.setAttribute('data-ait-style', settings.style || 'dashed-underline');
    node.className = 'ait-tr ait-loading';
    node.lang = settings.targetLang || 'zh-TW';
    node.dir = 'auto';
    node.translate = false;
    node.setAttribute('aria-busy', 'true');

    // 內層 span 承載裝飾（虛線底線等），才能跟著每一行斷行
    const inner = document.createElement('span');
    inner.className = 'ait-tr-inner';
    inner.appendChild(makeDots());
    node.appendChild(inner);
    return node;
  }

  function innerOf(node) {
    return node.querySelector('.ait-tr-inner') || node;
  }

  /** 譯文插在原文之後：element unit 附加在元素尾端，run unit 插在該段行內內容之後 */
  function insert(unit, node) {
    if (!unit.el || !unit.el.isConnected) return false;
    try {
      if (unit.kind === 'element') {
        unit.el.appendChild(node);
        return true;
      }
      const anchor = unit.anchor;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(node, anchor.nextSibling);
      } else {
        unit.el.appendChild(node);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function setText(node, text) {
    innerOf(node).textContent = text;
    node.classList.remove('ait-loading', 'ait-error');
    node.removeAttribute('aria-busy');
    node.removeAttribute('title');
  }

  function setError(node, message) {
    innerOf(node).textContent = t('hud.failed');
    node.classList.remove('ait-loading');
    node.classList.add('ait-error');
    node.removeAttribute('aria-busy');
    node.title = message || t('hud.unknownError');
  }

  function updateStyleAttr(styleId) {
    document.querySelectorAll('[data-ait="tr"]').forEach((node) => {
      node.setAttribute('data-ait-style', styleId);
    });
  }

  function removeAll() {
    document.querySelectorAll('[data-ait="tr"]').forEach((node) => node.remove());
  }

  // ------------------------------------------------------------------- HUD

  let hud = null;
  let hudTimer = null;
  const hudHandlers = { retry: null, close: null };

  function buildHud() {
    const box = document.createElement('div');
    box.id = HUD_ID;
    box.setAttribute('data-ait', 'hud');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.translate = false;

    const spinner = document.createElement('span');
    spinner.className = 'ait-hud-spin';
    spinner.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'ait-hud-text';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'ait-hud-btn ait-hud-retry';
    retry.textContent = t('hud.retry');
    retry.hidden = true;
    retry.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (hudHandlers.retry) hudHandlers.retry();
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ait-hud-btn ait-hud-close';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', t('hud.close'));
    close.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hideHud();
      if (hudHandlers.close) hudHandlers.close();
    });

    box.appendChild(spinner);
    box.appendChild(text);
    box.appendChild(retry);
    box.appendChild(close);
    (document.body || document.documentElement).appendChild(box);

    return { box, spinner, text, retry };
  }

  function ensureHud() {
    if (hud && hud.box.isConnected) return hud;
    hud = buildHud();
    return hud;
  }

  /**
   * @param {{busy:boolean, done:number, total:number, failed:number, message:string, sticky:boolean}} info
   */
  function updateHud(info) {
    const ui = ensureHud();
    ui.box.hidden = false;
    ui.box.classList.toggle('ait-hud-busy', !!info.busy);
    ui.spinner.hidden = !info.busy;

    let label = info.message || '';
    if (!label) {
      label = info.busy
        ? t('hud.translating', { done: info.done, total: info.total })
        : t('hud.doneN', { done: info.done });
      if (info.failed) label += t('hud.failedSuffix', { failed: info.failed });
    }
    ui.text.textContent = label;
    ui.retry.hidden = !info.failed;
    if (info.failed) ui.retry.textContent = t('hud.retryN', { failed: info.failed });

    if (hudTimer) clearTimeout(hudTimer);
    if (!info.busy && !info.failed && !info.sticky) {
      hudTimer = setTimeout(hideHud, 2500);
    }
  }

  function hideHud() {
    if (hudTimer) {
      clearTimeout(hudTimer);
      hudTimer = null;
    }
    if (hud && hud.box.isConnected) hud.box.hidden = true;
  }

  function onHud(handlers) {
    Object.assign(hudHandlers, handlers || {});
  }

  root.AITRender = {
    applyTheme,
    setVisible,
    createNode,
    insert,
    setText,
    setError,
    updateStyleAttr,
    removeAll,
    updateHud,
    hideHud,
    onHud
  };
})(window);
