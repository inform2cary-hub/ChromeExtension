/**
 * 背景 service worker：
 * - 統一發送 AI 請求（避開網頁的 CORS 限制，API Key 不會出現在頁面環境）
 * - 譯文快取與同時請求數控制
 * - 右鍵選單、快捷鍵、狀態徽章
 */
'use strict';

importScripts(
  '/src/lib/constants.js',
  '/src/lib/i18n.js',
  '/src/lib/settings.js',
  '/src/lib/prompt.js',
  '/src/lib/providers.js'
);

const C = self.AIT_CONST;
const Settings = self.AITSettings;
const Providers = self.AITProviders;
const I18N = self.AITI18N;
const t = I18N.t;
const MSG = C.MSG;

/**
 * service worker 會被回收，重新喚醒時語言狀態是預設值，
 * 因此每個對使用者說話的流程開頭都要重新讀一次設定。
 */
async function syncLang(settings) {
  const current = settings || await Settings.load();
  I18N.setLang(current.lang);
  return current;
}

// ------------------------------------------------------------------ 譯文快取

const CACHE_LIMIT = 2000;
const cache = new Map();

function hashText(text) {
  // FNV-1a 32bit
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36) + ':' + text.length;
}

function cacheKey(settings, cfg, text) {
  return [
    cfg.id,
    cfg.model,
    settings.targetLang,
    settings.tone,
    hashText(settings.domainHint || ''),
    hashText(text)
  ].join('|');
}

function cacheGet(key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
}

// ------------------------------------------------------------ 同時請求數控制

let activeRequests = 0;
const waitQueue = [];
let concurrencyLimit = 3;

function acquireSlot() {
  if (activeRequests < concurrencyLimit) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waitQueue.push(resolve));
}

function releaseSlot() {
  const next = waitQueue.shift();
  if (next) {
    next();
    return;
  }
  activeRequests = Math.max(0, activeRequests - 1);
}

// ------------------------------------------------------------------ 使用統計

const STATS_KEY = 'aitStats';
const EMPTY_STATS = { requests: 0, cacheHits: 0, segments: 0, tokensIn: 0, tokensOut: 0, errors: 0 };
let stats = Object.assign({}, EMPTY_STATS);
let statsLoaded = false;
let statsTimer = null;

async function loadStats() {
  if (statsLoaded) return;
  statsLoaded = true;
  try {
    const raw = await chrome.storage.session.get(STATS_KEY);
    if (raw && raw[STATS_KEY]) stats = Object.assign({}, EMPTY_STATS, raw[STATS_KEY]);
  } catch (e) {
    // storage.session 不可用時忽略，統計僅存記憶體
  }
}

function persistStats() {
  if (statsTimer) return;
  statsTimer = setTimeout(() => {
    statsTimer = null;
    chrome.storage.session.set({ [STATS_KEY]: stats }).catch(() => {});
  }, 800);
}

// ------------------------------------------------------------------ 翻譯處理

async function handleTranslate(payload) {
  await loadStats();
  const settings = await syncLang();
  const cfg = Settings.activeProviderConfig(settings);
  concurrencyLimit = Math.min(8, Math.max(1, Number(settings.concurrency) || 3));

  const items = Array.isArray(payload && payload.items) ? payload.items : [];
  const results = [];
  const pending = [];

  for (const item of items) {
    const text = String(item.text || '');
    const key = cacheKey(settings, cfg, text);
    const cached = cacheGet(key);
    if (cached !== undefined) {
      results.push({ id: item.id, text: cached, cached: true });
      stats.cacheHits++;
    } else {
      pending.push({ id: item.id, text, key });
    }
  }

  if (!pending.length) {
    persistStats();
    return { ok: true, results, usage: { input: 0, output: 0, total: 0 } };
  }

  await acquireSlot();
  try {
    const res = await Providers.translateBatch(settings, cfg, pending.map((p) => ({ id: p.id, text: p.text })));
    stats.requests++;
    stats.tokensIn += res.usage.input || 0;
    stats.tokensOut += res.usage.output || 0;

    const missing = [];
    for (const p of pending) {
      const translated = res.map.get(p.id);
      if (typeof translated === 'string' && translated.length) {
        cacheSet(p.key, translated);
        results.push({ id: p.id, text: translated });
        stats.segments++;
      } else {
        missing.push(p.id);
      }
    }
    persistStats();
    return {
      ok: true,
      results,
      missing,
      usage: res.usage
    };
  } catch (err) {
    stats.errors++;
    persistStats();
    return {
      ok: false,
      results,
      error: {
        message: (err && err.message) || String(err),
        status: (err && err.status) || 0,
        code: (err && err.code) || ''
      }
    };
  } finally {
    releaseSlot();
  }
}

async function handleTest(payload) {
  const settings = await syncLang();
  const override = (payload && payload.settings) || null;
  const effective = override ? Settings.merge(settings, override) : settings;
  const cfg = Settings.activeProviderConfig(effective);
  const sample = (payload && payload.text) ||
    'Recently I deployed a mixture-of-experts model on a single machine, because waiting longer does not help: the wall is not speed, it is capacity.';
  const started = Date.now();
  const res = await Providers.translateBatch(effective, cfg, [{ id: 1, text: sample }]);
  return {
    ok: true,
    provider: cfg.label,
    model: cfg.model,
    ms: Date.now() - started,
    source: sample,
    text: res.map.get(1) || '',
    usage: res.usage
  };
}

async function handleListModels(payload) {
  const settings = await syncLang();
  const override = (payload && payload.settings) || null;
  const effective = override ? Settings.merge(settings, override) : settings;
  const cfg = Settings.activeProviderConfig(effective);
  const models = await Providers.listModels(effective, cfg);
  return { ok: true, models, provider: cfg.id };
}

// ------------------------------------------------------- content script 注入

async function ensureContentScript(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: MSG.PING });
    if (res && res.ok) return true;
  } catch (e) {
    // 尚未注入（例如擴充功能剛安裝、頁面在安裝前就開著）
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: C.CONTENT_CSS });
    await chrome.scripting.executeScript({ target: { tabId }, files: C.CONTENT_FILES });
    return true;
  } catch (err) {
    return false;
  }
}

async function toggleTab(tabId) {
  await syncLang();
  const injected = await ensureContentScript(tabId);
  if (!injected) return { ok: false, error: { message: t('sw.notAllowed') } };
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: MSG.TOGGLE });
    return res || { ok: true };
  } catch (err) {
    return { ok: false, error: { message: t('sw.noContact') } };
  }
}

function setBadge(tabId, active) {
  if (!tabId) return;
  chrome.action.setBadgeText({ tabId, text: active ? 'ON' : '' }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2a6f97' }).catch(() => {});
}

// ------------------------------------------------------------------ 訊息路由

async function route(msg, sender) {
  switch (msg.type) {
    case MSG.TRANSLATE:
      return handleTranslate(msg.payload);

    case MSG.SETTINGS_GET: {
      const settings = await Settings.load();
      await loadStats();
      return { ok: true, settings, stats };
    }

    case MSG.SETTINGS_SET: {
      const settings = await Settings.save(msg.payload || {});
      return { ok: true, settings };
    }

    case MSG.SETTINGS_RESET: {
      const settings = await Settings.reset();
      return { ok: true, settings };
    }

    case MSG.MODELS_LIST:
      return handleListModels(msg.payload);

    case MSG.TEST:
      return handleTest(msg.payload);

    case MSG.STATE:
      // content script 主動回報狀態，用來更新徽章
      setBadge(sender && sender.tab && sender.tab.id, msg.payload && msg.payload.active);
      return { ok: true };

    case MSG.TOGGLE:
      return toggleTab(msg.payload && msg.payload.tabId);

    case MSG.OPEN_OPTIONS:
      await chrome.runtime.openOptionsPage();
      return { ok: true };

    default:
      await syncLang();
      return { ok: false, error: { message: t('sw.unknownMessage', { type: msg.type }) } };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false;
  route(msg, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({
      ok: false,
      error: {
        message: (err && err.message) || String(err),
        status: (err && err.status) || 0,
        code: (err && err.code) || ''
      }
    }));
  return true;
});

// -------------------------------------------------------- 右鍵選單 / 快捷鍵

const MENU_TOGGLE = 'ait-toggle';
const MENU_OPTIONS = 'ait-options';

/** 選單標題無法事後改語言，只能整組重建 */
async function buildMenus() {
  await syncLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_TOGGLE,
      title: t('sw.menuToggle'),
      contexts: ['page', 'selection']
    });
    chrome.contextMenus.create({
      id: MENU_OPTIONS,
      title: t('sw.menuOptions'),
      contexts: ['action', 'page']
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  buildMenus();
});

Settings.onChanged((next) => {
  if (next.lang === I18N.getLang()) return;
  buildMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_OPTIONS) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId === MENU_TOGGLE && tab && tab.id) {
    toggleTab(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-translate') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) toggleTab(tab.id);
});

chrome.tabs.onRemoved.addListener(() => {
  // 徽章隨分頁消失，無需處理；保留 listener 讓 service worker 生命週期單純
});
