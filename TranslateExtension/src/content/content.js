/**
 * content script 主控：收集段落、依可視範圍排程翻譯、插入譯文、回報狀態。
 */
(function () {
  'use strict';

  if (window.__aitContentLoaded) return;
  window.__aitContentLoaded = true;

  const C = window.AIT_CONST;
  const MSG = C.MSG;
  const Settings = window.AITSettings;
  const Extract = window.AITExtract;
  const Render = window.AITRender;
  const I18N = window.AITI18N;
  const t = I18N.t;

  const state = {
    settings: null,
    ctx: null,
    active: false,
    units: new Map(),
    queue: [],
    failed: [],
    observed: new WeakMap(),
    io: null,
    mo: null,
    inflight: 0,
    flushTimer: null,
    scanTimer: null,
    lastError: ''
  };

  // ------------------------------------------------------------------ 統計

  function counts() {
    let done = 0;
    let failed = 0;
    let working = 0;
    state.units.forEach((unit) => {
      if (unit.status === 'done') done++;
      else if (unit.status === 'failed') failed++;
      else if (unit.status === 'queued' || unit.status === 'loading') working++;
    });
    return { done, failed, working };
  }

  function updateHud(extra) {
    if (!state.active) return;
    const c = counts();
    const busy = c.working > 0 || state.inflight > 0;
    let message = extra && extra.message;
    if (!message && !busy && c.failed && !c.done && state.lastError) {
      message = state.lastError.split('\n')[0].slice(0, 120);
    }
    Render.updateHud({
      busy,
      done: c.done,
      total: c.done + c.working + c.failed,
      failed: c.failed,
      message,
      sticky: !!(extra && extra.sticky)
    });
  }

  function snapshot() {
    const c = counts();
    return {
      ok: true,
      active: state.active,
      host: location.hostname,
      done: c.done,
      failed: c.failed,
      working: c.working,
      lastError: state.lastError
    };
  }

  function reportState() {
    chrome.runtime.sendMessage({ type: MSG.STATE, payload: { active: state.active } }).catch(() => {});
  }

  // ------------------------------------------------------------ 收集與排程

  function scan(rootEl) {
    if (!state.active) return;
    const target = rootEl && rootEl.isConnected ? rootEl : document.body;
    if (!target) return;
    const units = Extract.collect(target, state.ctx);
    if (!units.length) return;
    for (const unit of units) {
      state.units.set(unit.id, unit);
      if (state.settings.lazyTranslate) observeUnit(unit);
      else enqueue(unit);
    }
    updateHud();
  }

  function scheduleScan(delay) {
    if (state.scanTimer) return;
    state.scanTimer = setTimeout(() => {
      state.scanTimer = null;
      scan(document.body);
    }, delay || 600);
  }

  function observeUnit(unit) {
    const target = Extract.observeTargetOf(unit);
    if (!state.io || !target || !target.isConnected) {
      enqueue(unit);
      return;
    }
    const list = state.observed.get(target) || [];
    list.push(unit);
    state.observed.set(target, list);
    state.io.observe(target);
  }

  function enqueue(unit) {
    if (unit.status !== 'pending') return;
    unit.status = 'queued';
    state.queue.push(unit);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (state.flushTimer) return;
    state.flushTimer = setTimeout(() => {
      state.flushTimer = null;
      flush();
    }, 150);
  }

  function takeBatch() {
    const maxChars = Math.max(200, Number(state.settings.batchChars) || 1800);
    const maxItems = Math.max(1, Number(state.settings.batchMaxItems) || 12);
    const batch = [];
    let chars = 0;
    while (state.queue.length && batch.length < maxItems) {
      const unit = state.queue[0];
      if (!unit.el || !unit.el.isConnected) {
        state.queue.shift();
        unit.status = 'dropped';
        state.units.delete(unit.id);
        continue;
      }
      if (batch.length && chars + unit.text.length > maxChars) break;
      state.queue.shift();
      batch.push(unit);
      chars += unit.text.length;
    }
    return batch;
  }

  function flush() {
    if (!state.active) return;
    const limit = Math.max(1, Number(state.settings.concurrency) || 3);
    while (state.queue.length && state.inflight < limit) {
      const batch = takeBatch();
      if (!batch.length) break;
      sendBatch(batch);
    }
    updateHud();
  }

  async function sendBatch(batch) {
    state.inflight++;
    for (const unit of batch) {
      unit.status = 'loading';
      if (!unit.node) {
        const node = Render.createNode(state.settings);
        if (Render.insert(unit, node)) unit.node = node;
      }
    }
    updateHud();

    let res;
    try {
      res = await chrome.runtime.sendMessage({
        type: MSG.TRANSLATE,
        payload: { items: batch.map((u) => ({ id: u.id, text: u.text })) }
      });
    } catch (err) {
      res = {
        ok: false,
        error: { message: t('content.noBackground') }
      };
    }

    const map = new Map();
    if (res && Array.isArray(res.results)) {
      res.results.forEach((r) => map.set(r.id, r.text));
    }
    const errorMessage = (res && res.error && res.error.message) || t('content.noTranslation');

    for (const unit of batch) {
      const text = map.get(unit.id);
      if (typeof text === 'string' && text.trim().length) {
        unit.status = 'done';
        if (unit.node) Render.setText(unit.node, text.trim());
      } else {
        unit.status = 'failed';
        state.failed.push(unit);
        state.lastError = errorMessage;
        if (unit.node) Render.setError(unit.node, errorMessage);
      }
    }

    state.inflight = Math.max(0, state.inflight - 1);
    flush();
  }

  function retryFailed() {
    const failed = state.failed.splice(0);
    if (!failed.length) return;
    state.lastError = '';
    for (const unit of failed) {
      if (unit.node) {
        unit.node.remove();
        unit.node = null;
      }
      unit.status = 'pending';
      enqueue(unit);
    }
    flush();
  }

  // ------------------------------------------------------------------ 觀察器

  function onIntersect(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const list = state.observed.get(entry.target);
      state.observed.delete(entry.target);
      if (state.io) state.io.unobserve(entry.target);
      if (list) list.forEach(enqueue);
    }
  }

  function isOurs(node) {
    const el = node && node.nodeType === 1 ? node : (node && node.parentElement);
    return !!(el && el.closest && el.closest('[data-ait]'));
  }

  function onMutate(records) {
    for (const rec of records) {
      if (isOurs(rec.target)) continue;
      let interesting = false;
      for (const node of rec.addedNodes) {
        if (node.nodeType === 1) {
          if (node.hasAttribute && node.hasAttribute('data-ait')) continue;
          interesting = true;
          break;
        }
        if (node.nodeType === 3 && /\S/.test(node.nodeValue || '')) {
          interesting = true;
          break;
        }
      }
      if (interesting) {
        scheduleScan(600);
        return;
      }
    }
  }

  function onScroll() {
    // content-visibility / 延遲載入的內容在捲動後才進 DOM 或才可量測
    scheduleScan(900);
  }

  function startObservers() {
    if (!state.io) {
      state.io = new IntersectionObserver(onIntersect, { rootMargin: '600px 0px' });
    }
    if (!state.mo && document.body) {
      state.mo = new MutationObserver(onMutate);
      state.mo.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function stopObservers() {
    if (state.io) {
      state.io.disconnect();
      state.io = null;
    }
    if (state.mo) {
      state.mo.disconnect();
      state.mo = null;
    }
    state.observed = new WeakMap();
    window.removeEventListener('scroll', onScroll);
  }

  // ------------------------------------------------------------ 啟用 / 停用

  async function activate() {
    if (!state.settings) await loadSettings();
    if (!document.body) return;
    state.active = true;
    Render.applyTheme(state.settings);
    Render.setVisible(true);
    startObservers();

    // 重新排入尚未完成的段落（例如上次停用時留下來的）
    state.units.forEach((unit) => {
      if (unit.status === 'pending') observeUnit(unit);
    });
    scan(document.body);
    updateHud({ sticky: true });
    reportState();
  }

  function deactivate() {
    state.active = false;
    stopObservers();
    state.queue.length = 0;
    state.units.forEach((unit) => {
      if (unit.status === 'queued') unit.status = 'pending';
    });
    Render.setVisible(false);
    Render.hideHud();
    reportState();
  }

  async function toggle() {
    if (state.active) deactivate();
    else await activate();
    return snapshot();
  }

  function restart() {
    const wasActive = state.active;
    stopObservers();
    Render.removeAll();
    Extract.resetSeen();
    state.units.clear();
    state.queue.length = 0;
    state.failed.length = 0;
    state.inflight = 0;
    state.lastError = '';
    if (wasActive) {
      state.active = false;
      activate();
    }
  }

  // ------------------------------------------------------------------ 設定

  async function loadSettings() {
    state.settings = await Settings.load();
    I18N.setLang(state.settings.lang);
    state.ctx = Extract.buildContext(state.settings);
    return state.settings;
  }

  function providerFingerprint(settings) {
    const cfg = (settings.providers && settings.providers[settings.provider]) || {};
    return [settings.provider, cfg.model, settings.targetLang, settings.tone, settings.domainHint,
      settings.skipSameLanguage, settings.minChars, settings.skipSelectors].join('|');
  }

  function watchSettings() {
    Settings.onChanged((next) => {
      const prev = state.settings;
      state.settings = next;
      I18N.setLang(next.lang);
      state.ctx = Extract.buildContext(next);
      Render.applyTheme(next);
      if (prev && prev.style !== next.style) Render.updateStyleAttr(next.style);
      if (prev && providerFingerprint(prev) !== providerFingerprint(next)) restart();
    });
  }

  function shouldAutoTranslate() {
    const host = location.hostname;
    const s = state.settings;
    const excluded = Array.isArray(s.excludeHosts) && s.excludeHosts.indexOf(host) >= 0;
    if (excluded) return false;
    if (s.autoTranslate) return true;
    return Array.isArray(s.autoTranslateHosts) && s.autoTranslateHosts.indexOf(host) >= 0;
  }

  // ------------------------------------------------------------------ 訊息

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return false;
    switch (msg.type) {
      case MSG.PING:
        sendResponse({ ok: true, active: state.active });
        return false;
      case MSG.STATE:
        sendResponse(snapshot());
        return false;
      case MSG.TOGGLE:
        toggle().then(sendResponse);
        return true;
      case MSG.RETRY_FAILED:
        retryFailed();
        sendResponse(snapshot());
        return false;
      default:
        return false;
    }
  });

  // ------------------------------------------------------------------ 啟動

  (async function init() {
    await loadSettings();
    Render.applyTheme(state.settings);
    Render.onHud({ retry: retryFailed });
    watchSettings();
    if (shouldAutoTranslate()) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => activate(), { once: true });
      } else {
        activate();
      }
    }
  })();
})();
