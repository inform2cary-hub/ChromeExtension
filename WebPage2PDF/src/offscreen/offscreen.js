/**
 * 離螢幕文件：只做一件事 —— 把 PDF 的 base64 轉成 Blob URL，並在用完後釋放。
 *
 * 兩個限制決定了這個分工：
 * 1. MV3 的 service worker 沒有 URL.createObjectURL，而 data: URL 交給下載 API
 *    在檔案較大時會被截斷，所以必須有一個具備 DOM 的情境來建立 Blob URL。
 * 2. 離螢幕文件「只」提供 chrome.runtime 這一個擴充功能 API（官方限制），
 *    chrome.downloads 在這裡是 undefined，因此實際下載必須回到 service worker 執行。
 */
(function () {
  'use strict';

  const MSG = window.W2P_CONST.MSG;
  const urls = new Set();

  function base64ToBlob(base64, mime) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  function createBlobUrl(payload) {
    const blob = base64ToBlob(payload.base64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    urls.add(url);
    return { ok: true, url, bytes: blob.size };
  }

  function revoke(payload) {
    const url = payload && payload.url;
    if (url && urls.has(url)) {
      URL.revokeObjectURL(url);
      urls.delete(url);
      return { ok: true, revoked: true };
    }
    return { ok: true, revoked: false };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.target !== 'offscreen') return false;
    try {
      if (msg.type === MSG.OFFSCREEN_BLOB) {
        sendResponse(createBlobUrl(msg.payload || {}));
        return false;
      }
      if (msg.type === MSG.OFFSCREEN_REVOKE) {
        sendResponse(revoke(msg.payload || {}));
        return false;
      }
    } catch (err) {
      sendResponse({ ok: false, error: (err && err.message) || String(err) });
      return false;
    }
    return false;
  });
})();
