/**
 * 背景 service worker：整個轉檔流程的協調者。
 *
 * 流程：注入內容腳本 -> 擷取並轉成 Markdown -> 依動作儲存／複製／預覽。
 * 轉換全部在頁面的 isolated world 完成，這裡只負責調度與輸出。
 */
'use strict';

importScripts(
  '/src/lib/constants.js',
  '/src/lib/i18n.js',
  '/src/lib/settings.js',
  '/src/lib/markdown.js'
);

const C = self.W2M_CONST;
const Settings = self.W2MSettings;
const M = self.W2MMarkdown;
const I18N = self.W2MI18N;
const t = I18N.t;
const MSG = C.MSG;

// ------------------------------------------------------------------ 小工具

/**
 * service worker 會被回收，重新喚醒時語言狀態是預設值，
 * 因此每個對使用者說話的流程開頭都要重新讀一次設定。
 */
async function syncLang(settings) {
  const current = settings || await Settings.load();
  I18N.setLang(current.lang);
  return current;
}

/** 內容腳本與離螢幕文件拿不到 i18n，只回傳 { key, params }，到這裡才轉成文字 */
function noteText(note) {
  if (note && typeof note === 'object' && note.key) return t(note.key, note.params);
  return note === null || note === undefined ? '' : String(note);
}

function errorText(err) {
  return (err && err.message) || String(err);
}

function reportProgress(text, stage) {
  chrome.runtime.sendMessage({ type: MSG.PROGRESS, payload: { text, stage } }).catch(() => {});
}

function setBadge(tabId, text, color) {
  const target = tabId ? { tabId } : {};
  chrome.action.setBadgeText(Object.assign({ text }, target)).catch(() => {});
  if (text) {
    chrome.action.setBadgeBackgroundColor(Object.assign({ color: color || '#0f766e' }, target)).catch(() => {});
  }
}

function friendlyInjectError(message) {
  const text = String(message || '');
  if (/Cannot access contents|Extension manifest must request permission/i.test(text)) {
    return t('sw.injectBlocked');
  }
  if (/No tab with id|No frame with id/i.test(text)) {
    return t('sw.injectNoTab');
  }
  if (/The extensions gallery cannot be scripted/i.test(text)) {
    return t('sw.injectGallery');
  }
  return t('sw.injectFailed', { message: text });
}

// -------------------------------------------------------------- 離螢幕文件

async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(C.OFFSCREEN_PATH)]
  });
  if (existing && existing.length) return;
  await chrome.offscreen.createDocument({
    url: C.OFFSCREEN_PATH,
    reasons: ['BLOBS', 'CLIPBOARD'],
    justification: t('sw.offscreenJustification')
  });
}

async function askOffscreen(type, payload) {
  await ensureOffscreen();
  try {
    const res = await chrome.runtime.sendMessage({ target: 'offscreen', type, payload });
    return res || { ok: false, error: t('sw.offscreenNoReply') };
  } catch (err) {
    return { ok: false, error: t('sw.offscreenNoComm', { message: errorText(err) }) };
  }
}

/** 等到下載真的落地（或被取消），才可以釋放 Blob URL */
function waitForDownload(downloadId, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      chrome.downloads.onChanged.removeListener(onChanged);
      clearTimeout(timer);
      resolve(result);
    };
    const onChanged = (delta) => {
      if (delta.id !== downloadId) return;
      if (delta.state && delta.state.current === 'complete') finish({ ok: true });
      if (delta.state && delta.state.current === 'interrupted') {
        const reason = (delta.error && delta.error.current) || '';
        finish({
          ok: false,
          canceled: /USER_CANCELED|USER_SHUTDOWN/i.test(reason),
          error: /USER_CANCELED/i.test(reason)
            ? t('sw.downloadCanceled')
            : t('sw.downloadInterrupted', { reason: reason || t('sw.unknownReason') })
        });
      }
    };
    const timer = setTimeout(() => finish({ ok: true, timedOut: true }), timeoutMs || 120000);
    chrome.downloads.onChanged.addListener(onChanged);
  });
}

/**
 * 儲存流程：離螢幕文件建 Blob URL -> service worker 下載 -> 完成後請它釋放。
 * 下載一定要在 service worker 做，因為離螢幕文件只有 chrome.runtime 可用。
 */
async function saveViaOffscreen(text, path, saveAs) {
  const made = await askOffscreen(MSG.OFFSCREEN_BLOB, { text, mime: C.MARKDOWN_MIME });
  if (!made.ok || !made.url) {
    return { ok: false, error: noteText(made.error) || t('sw.offscreenNoBlob') };
  }

  const release = () => chrome.runtime.sendMessage({
    target: 'offscreen',
    type: MSG.OFFSCREEN_REVOKE,
    payload: { url: made.url }
  }).catch(() => {});

  try {
    const downloadId = await chrome.downloads.download({ url: made.url, filename: path, saveAs: !!saveAs });
    const result = await waitForDownload(downloadId);
    if (!result.ok) return { ok: false, error: result.error, canceled: result.canceled };
    return { ok: true, downloadId, bytes: made.bytes || 0 };
  } catch (err) {
    const message = errorText(err);
    if (/cancel/i.test(message)) return { ok: false, error: t('sw.downloadCanceled'), canceled: true };
    return { ok: false, error: t('sw.saveFailed', { message }) };
  } finally {
    await release();
  }
}

// -------------------------------------------------------------- 主要流程

async function convertTab(tab, overrides) {
  const stored = await syncLang();
  if (!tab || !tab.id) throw new Error(t('sw.noTab'));
  if (C.isBlockedUrl(tab.url)) throw new Error(t('sw.blockedPage'));

  const settings = overrides ? Settings.merge(stored, overrides) : stored;
  I18N.setLang(settings.lang);

  reportProgress(t('sw.progExtract'), 'extract');
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: C.CONTENT_FILES });
  } catch (err) {
    throw new Error(friendlyInjectError(errorText(err)));
  }

  let entry;
  try {
    [entry] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (options) => window.__w2m.run(options),
      args: [settings]
    });
  } catch (err) {
    throw new Error(t('sw.convertFailed', { message: errorText(err) }));
  }

  const result = entry && entry.result;
  if (!result || !result.ok) throw new Error(noteText(result && result.error) || t('sw.noResult'));
  if (!String(result.markdown || '').trim()) throw new Error(t('sw.emptyMarkdown'));

  return { settings, result };
}

function outputInfo(tab, settings, result) {
  const filename = M.buildFilename(settings.filenameTemplate, {
    title: (result.meta && result.meta.title) || tab.title || '',
    url: (result.meta && result.meta.url) || tab.url || ''
  });
  return { filename, path: M.buildDownloadPath(settings.subfolder, filename) };
}

function summary(result, extra) {
  return Object.assign({
    ok: true,
    notes: (result.notes || []).map(noteText),
    warnings: (result.warnings || []).map(noteText),
    stats: result.stats || {},
    meta: result.meta || {}
  }, extra || {});
}

async function saveMarkdown(tab, overrides) {
  setBadge(tab && tab.id, '…', '#0f766e');
  try {
    const { settings, result } = await convertTab(tab, overrides);
    const { filename, path } = outputInfo(tab, settings, result);

    reportProgress(t('sw.progSave', { name: filename }), 'save');
    const saved = await saveViaOffscreen(result.markdown, path, settings.saveAs);
    if (!saved.ok) {
      setBadge(tab.id, saved.canceled ? '' : 'ERR');
      throw new Error(saved.error || t('sw.saveFailedPlain'));
    }

    setBadge(tab.id, 'OK', '#0f766e');
    setTimeout(() => setBadge(tab.id, ''), 3000);
    return summary(result, { filename, path, bytes: saved.bytes || 0 });
  } catch (err) {
    setBadge(tab && tab.id, 'ERR');
    setTimeout(() => setBadge(tab && tab.id, ''), 4000);
    throw err;
  }
}

async function copyMarkdown(tab, overrides) {
  const { result } = await convertTab(tab, overrides);
  reportProgress(t('sw.progCopy'), 'copy');
  const copied = await askOffscreen(MSG.OFFSCREEN_COPY, { text: result.markdown });
  if (!copied.ok) throw new Error(noteText(copied.error) || t('sw.copyFailed'));

  setBadge(tab.id, 'OK', '#0f766e');
  setTimeout(() => setBadge(tab.id, ''), 3000);
  return summary(result, { copied: true, bytes: copied.bytes || result.markdown.length });
}

async function previewMarkdown(tab, overrides) {
  const { settings, result } = await convertTab(tab, overrides);
  const { filename, path } = outputInfo(tab, settings, result);

  await chrome.storage.session.set({
    [C.PREVIEW_KEY]: {
      markdown: result.markdown,
      meta: result.meta,
      notes: (result.notes || []).map(noteText),
      warnings: (result.warnings || []).map(noteText),
      stats: result.stats,
      filename,
      path,
      saveAs: !!settings.saveAs,
      createdAt: Date.now()
    }
  });
  await chrome.tabs.create({ url: chrome.runtime.getURL(C.PREVIEW_PATH) });
  return summary(result, { filename, path, preview: true });
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// ------------------------------------------------------------------ 訊息

async function route(msg) {
  const payload = msg.payload || {};
  const tabOf = async () => payload.tab || await activeTab();

  switch (msg.type) {
    case MSG.CONVERT: {
      const { result } = await convertTab(await tabOf(), payload.overrides);
      return summary(result, { markdown: result.markdown });
    }
    case MSG.SAVE:
      return saveMarkdown(await tabOf(), payload.overrides);
    case MSG.COPY:
      return copyMarkdown(await tabOf(), payload.overrides);
    case MSG.PREVIEW:
      return previewMarkdown(await tabOf(), payload.overrides);
    case MSG.SETTINGS_GET:
      return { ok: true, settings: await Settings.load() };
    case MSG.SETTINGS_SET:
      return { ok: true, settings: await Settings.save(payload) };
    case MSG.SETTINGS_RESET:
      return { ok: true, settings: await Settings.reset() };
    case MSG.OPEN_OPTIONS:
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    default:
      await syncLang();
      return { ok: false, error: t('sw.unknownMessage', { type: msg.type }) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false;
  if (msg.target === 'offscreen') return false; // 給離螢幕文件的訊息不處理
  if (msg.type === MSG.PROGRESS) return false; // 進度訊息只給介面頁
  route(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: errorText(err) }));
  return true;
});

// -------------------------------------------------------- 選單與快捷鍵

const MENU = {
  SAVE: 'w2m-save',
  COPY: 'w2m-copy',
  PREVIEW: 'w2m-preview',
  SELECTION: 'w2m-selection',
  OPTIONS: 'w2m-options'
};

/** 選單標題無法事後改語言，只能整組重建 */
async function buildMenus() {
  await syncLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU.SAVE,
      title: t('sw.menuSave'),
      contexts: ['page', 'link', 'image']
    });
    chrome.contextMenus.create({
      id: MENU.COPY,
      title: t('sw.menuCopy'),
      contexts: ['page', 'link', 'image']
    });
    chrome.contextMenus.create({
      id: MENU.PREVIEW,
      title: t('sw.menuPreview'),
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: MENU.SELECTION,
      title: t('sw.menuSelection'),
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: MENU.OPTIONS,
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

async function runAction(action, tab, overrides) {
  try {
    const result = await action(tab, overrides);
    chrome.action.setTitle({
      tabId: tab.id,
      title: result.filename ? t('sw.actionSaved', { name: result.filename }) : t('sw.actionCopied')
    }).catch(() => {});
  } catch (err) {
    setBadge(tab && tab.id, 'ERR');
    chrome.action.setTitle({
      tabId: tab && tab.id,
      title: t('sw.actionFailed', { message: errorText(err) })
    }).catch(() => {});
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU.OPTIONS) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (!tab) return;
  if (info.menuItemId === MENU.SAVE) await runAction(saveMarkdown, tab);
  else if (info.menuItemId === MENU.COPY) await runAction(copyMarkdown, tab);
  else if (info.menuItemId === MENU.PREVIEW) await runAction(previewMarkdown, tab);
  else if (info.menuItemId === MENU.SELECTION) await runAction(copyMarkdown, tab, { preferSelection: true });
});

chrome.commands.onCommand.addListener(async (command) => {
  const tab = await activeTab();
  if (!tab) return;
  if (command === 'save-markdown') await runAction(saveMarkdown, tab);
  else if (command === 'copy-markdown') await runAction(copyMarkdown, tab);
});
