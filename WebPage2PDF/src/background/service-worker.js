/**
 * 背景 service worker：整個轉檔流程的協調者。
 *
 * 流程：整理頁面 -> 附加除錯器 -> CDP Page.printToPDF -> 還原頁面 -> 交給離螢幕文件下載。
 * 用 CDP 而不是 html2canvas，PDF 才會是可選取文字的向量輸出，並支援分頁、頁首頁尾與書籤。
 */
'use strict';

importScripts(
  '/src/lib/constants.js',
  '/src/lib/i18n.js',
  '/src/lib/settings.js',
  '/src/lib/pdf.js'
);

const C = self.W2P_CONST;
const Settings = self.W2PSettings;
const Pdf = self.W2PPdf;
const I18N = self.W2PI18N;
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

function reportProgress(text, stage) {
  chrome.runtime.sendMessage({ type: MSG.EXPORT_PROGRESS, payload: { text, stage } }).catch(() => {});
}

function setBadge(tabId, text, color) {
  const target = tabId ? { tabId } : {};
  chrome.action.setBadgeText(Object.assign({ text }, target)).catch(() => {});
  if (text) {
    chrome.action.setBadgeBackgroundColor(Object.assign({ color: color || '#c0392b' }, target)).catch(() => {});
  }
}

function friendlyAttachError(message) {
  const text = String(message || '');
  if (/already attached/i.test(text)) return t('sw.attachBusy');
  if (/Cannot access|chrome:\/\/|extension/i.test(text)) return t('sw.attachBlocked');
  if (/Cannot attach|No target/i.test(text)) return t('sw.attachUnavailable');
  return t('sw.attachFailed', { message: text });
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
    reasons: ['BLOBS'],
    justification: t('sw.offscreenJustification')
  });
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
    const timer = setTimeout(() => finish({ ok: true, timedOut: true }), timeoutMs || 180000);
    chrome.downloads.onChanged.addListener(onChanged);
  });
}

/**
 * 儲存流程：離螢幕文件建 Blob URL -> service worker 下載 -> 完成後請它釋放。
 * 下載一定要在 service worker 做，因為離螢幕文件只有 chrome.runtime 可用。
 */
async function saveViaOffscreen(base64, path, saveAs) {
  await ensureOffscreen();

  let made;
  try {
    made = await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: MSG.OFFSCREEN_BLOB,
      payload: { base64 }
    });
  } catch (err) {
    return { ok: false, error: t('sw.offscreenNoComm', { message: (err && err.message) || err }) };
  }
  if (!made || !made.ok || !made.url) {
    return { ok: false, error: (made && made.error) || t('sw.offscreenNoBlob') };
  }

  const release = () => chrome.runtime.sendMessage({
    target: 'offscreen',
    type: MSG.OFFSCREEN_REVOKE,
    payload: { url: made.url }
  }).catch(() => {});

  try {
    const downloadId = await chrome.downloads.download({
      url: made.url,
      filename: path,
      saveAs: !!saveAs
    });
    const result = await waitForDownload(downloadId);
    if (!result.ok) return { ok: false, error: result.error, canceled: result.canceled };
    return { ok: true, downloadId, bytes: made.bytes || 0 };
  } catch (err) {
    const message = (err && err.message) || String(err);
    if (/cancel/i.test(message)) return { ok: false, error: t('sw.downloadCanceled'), canceled: true };
    return { ok: false, error: t('sw.saveFailed', { message }) };
  } finally {
    await release();
  }
}

// ------------------------------------------------------------------ CDP

function sendCommand(tabId, method, params) {
  return chrome.debugger.sendCommand({ tabId }, method, params || {});
}

/**
 * 產生 PDF。generateTaggedPDF / generateDocumentOutline 屬於較新的參數，
 * 舊版 Chrome 會直接回錯，這裡逐一移除後重試，而不是整個失敗。
 */
async function printToPdf(tabId, params, optionalKeys) {
  const working = Object.assign({}, params);
  const removable = (optionalKeys || []).filter((key) => key in working);

  for (let attempt = 0; attempt <= removable.length; attempt++) {
    try {
      const result = await sendCommand(tabId, 'Page.printToPDF', working);
      if (!result || !result.data) throw new Error(t('sw.noPdfData'));
      return result.data;
    } catch (err) {
      const message = (err && err.message) || String(err);
      const hit = removable.find((key) => working[key] !== undefined &&
        (message.indexOf(key) >= 0 || /invalid parameters|unknown/i.test(message)));
      if (hit) {
        delete working[hit];
        continue;
      }
      if (/page range/i.test(message)) {
        throw new Error(t('sw.pageRangeBad', { message }));
      }
      throw new Error(t('sw.printFailed', { message }));
    }
  }
  throw new Error(t('sw.printFailedAll'));
}

// -------------------------------------------------------------- 主要流程

function prepareOptions(settings) {
  return {
    mainContentOnly: !!settings.mainContentOnly,
    removeFixed: !!settings.removeFixed,
    forceLightBackground: !!settings.forceLightBackground,
    expandLazyContent: !!settings.expandLazyContent,
    expandDetails: !!settings.expandDetails,
    removeSelectors: settings.removeSelectors || '',
    settleMs: Number(settings.settleMs) || 0
  };
}

async function injectPrepare(tabId, settings) {
  await chrome.scripting.executeScript({ target: { tabId }, files: C.PREPARE_FILES });
  const [entry] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (options) => window.__w2p.prepare(options),
    args: [prepareOptions(settings)]
  });
  return (entry && entry.result) || { ok: false, notes: [] };
}

async function restorePage(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.__w2p ? window.__w2p.restore() : null)
    });
  } catch (e) {
    // 頁面可能已經關閉或跳轉，還原失敗不影響已產生的 PDF
  }
}

async function exportPdf(tab, overrides) {
  const stored = await syncLang();
  if (!tab || !tab.id) throw new Error(t('sw.noTab'));
  if (C.isBlockedUrl(tab.url)) throw new Error(t('sw.blockedPage'));

  const settings = overrides ? Settings.merge(stored, overrides) : stored;
  I18N.setLang(settings.lang);
  const { params, notes, optionalKeys } = Pdf.buildPrintParams(settings);
  const tabId = tab.id;

  setBadge(tabId, '…', '#2a6f97');
  const allNotes = notes.slice();

  reportProgress(t('sw.progPrepare'), 'prepare');
  let prep = { notes: [] };
  try {
    prep = await injectPrepare(tabId, settings);
  } catch (err) {
    setBadge(tabId, '');
    throw new Error(t('sw.prepareFailed', { message: (err && err.message) || err }));
  }
  // prepare.js 跑在網頁環境裡拿不到 i18n，因此只回傳翻譯鍵，到這裡才轉成文字
  if (prep && Array.isArray(prep.notes)) {
    allNotes.push(...prep.notes.map((note) => t(note.key, note.params)));
  }

  let base64 = '';
  try {
    reportProgress(t('sw.progPrint'), 'print');
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
    } catch (err) {
      throw new Error(friendlyAttachError((err && err.message) || err));
    }
    try {
      await sendCommand(tabId, 'Page.enable');
      if (settings.emulateScreenMedia) {
        await sendCommand(tabId, 'Emulation.setEmulatedMedia', { media: 'screen' });
        allNotes.push(t('sw.noteScreenMedia'));
      }
      base64 = await printToPdf(tabId, params, optionalKeys);
    } finally {
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        // 分頁關閉時 detach 會失敗，忽略
      }
    }
  } finally {
    await restorePage(tabId);
  }

  const filename = Pdf.buildFilename(settings.filenameTemplate, {
    title: (prep && prep.title) || tab.title || '',
    url: (prep && prep.url) || tab.url || ''
  });
  const path = Pdf.buildDownloadPath(settings.subfolder, filename);

  reportProgress(t('sw.progSave', { name: filename }), 'save');
  const saved = await saveViaOffscreen(base64, path, settings.saveAs);
  if (!saved.ok) {
    setBadge(tabId, saved.canceled ? '' : 'ERR');
    throw new Error(saved.error || t('sw.saveFailedPlain'));
  }

  setBadge(tabId, 'OK', '#1e8e6a');
  setTimeout(() => setBadge(tabId, ''), 3000);

  return {
    ok: true,
    filename,
    path,
    bytes: saved.bytes || 0,
    notes: allNotes
  };
}

/** 備用路徑：直接呼叫網頁的列印對話框，由使用者自己選「另存為 PDF」 */
async function openPrintDialog(tab) {
  const settings = await syncLang();
  if (!tab || !tab.id) throw new Error(t('sw.noTab'));
  await injectPrepare(tab.id, settings);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window.setTimeout(() => window.print(), 100);
    }
  });
  // 對話框關閉的時機無法偵測，延遲一段時間後還原頁面
  setTimeout(() => restorePage(tab.id), 60000);
  return { ok: true };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// ------------------------------------------------------------------ 訊息

async function route(msg) {
  switch (msg.type) {
    case MSG.EXPORT: {
      const tab = (msg.payload && msg.payload.tab) || await activeTab();
      return exportPdf(tab, msg.payload && msg.payload.overrides);
    }
    case MSG.PRINT_DIALOG: {
      const tab = (msg.payload && msg.payload.tab) || await activeTab();
      return openPrintDialog(tab);
    }
    case MSG.SETTINGS_GET:
      return { ok: true, settings: await Settings.load() };
    case MSG.SETTINGS_SET:
      return { ok: true, settings: await Settings.save(msg.payload || {}) };
    case MSG.SETTINGS_RESET:
      return { ok: true, settings: await Settings.reset() };
    case MSG.OPEN_OPTIONS:
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    default:
      return { ok: false, error: t('sw.unknownMessage', { type: msg.type }) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false;
  if (msg.target === 'offscreen') return false; // 給離螢幕文件的訊息不處理
  if (msg.type === MSG.EXPORT_PROGRESS) return false; // 進度訊息只給 popup
  route(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: (err && err.message) || String(err) }));
  return true;
});

// -------------------------------------------------------- 選單與快捷鍵

const MENU_EXPORT = 'w2p-export';
const MENU_OPTIONS = 'w2p-options';

/** 選單標題無法事後改語言，只能整組重建 */
async function buildMenus() {
  await syncLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_EXPORT,
      title: t('sw.menuExport'),
      contexts: ['page', 'selection', 'link', 'image']
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

async function runFromShortcut(tab) {
  try {
    const result = await exportPdf(tab);
    chrome.action.setTitle({ tabId: tab.id, title: t('sw.actionSaved', { name: result.filename }) }).catch(() => {});
  } catch (err) {
    setBadge(tab && tab.id, 'ERR');
    chrome.action.setTitle({
      tabId: tab && tab.id,
      title: t('sw.actionFailed', { message: (err && err.message) || err })
    }).catch(() => {});
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_OPTIONS) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId === MENU_EXPORT && tab) await runFromShortcut(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'export-pdf') return;
  const tab = await activeTab();
  if (tab) await runFromShortcut(tab);
});
