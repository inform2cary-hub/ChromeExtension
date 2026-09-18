/**
 * 離螢幕文件：只做兩件 service worker 做不到的事 ——
 * 建立／釋放 Blob URL，以及把文字寫進剪貼簿。
 *
 * 兩個限制決定了這個分工：
 * 1. MV3 的 service worker 沒有 URL.createObjectURL，也沒有 document 可以複製；
 *    把長文塞進 data: URL 交給下載 API 又容易被截斷。
 * 2. 離螢幕文件「只」提供 chrome.runtime 這一個擴充功能 API（官方限制），
 *    chrome.downloads 在這裡是 undefined，因此實際下載必須回到 service worker 執行。
 *
 * 剪貼簿用 document.execCommand('copy')：離螢幕文件永遠沒有焦點，
 * navigator.clipboard.writeText 會因為缺少 focus 而被拒絕。
 */
(function () {
  'use strict';

  const MSG = window.W2M_CONST.MSG;
  const urls = new Set();

  function createBlobUrl(payload) {
    const text = String((payload && payload.text) || '');
    const mime = (payload && payload.mime) || 'text/plain;charset=utf-8';
    // 刻意不加 BOM：Markdown 慣例是純 UTF-8，開頭多出 BOM 會讓
    // Hugo／Pandoc 之類的工具認不出 --- 開頭的 front matter。
    const blob = new Blob([text], { type: mime });
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

  // 這裡沒有 i18n（只拿得到 chrome.runtime，讀不到設定裡的語言），
  // 所以只回傳翻譯鍵，由 service worker 轉成文字。
  function copyText(payload) {
    const text = String((payload && payload.text) || '');
    if (!text) return { ok: false, error: { key: 'off.noText' } };
    const sink = document.getElementById('sink');
    sink.value = text;
    sink.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      sink.value = '';
    }
    return ok ? { ok: true, bytes: text.length } : { ok: false, error: { key: 'off.copyDenied' } };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.target !== 'offscreen') return false;
    try {
      if (msg.type === MSG.OFFSCREEN_BLOB) sendResponse(createBlobUrl(msg.payload));
      else if (msg.type === MSG.OFFSCREEN_REVOKE) sendResponse(revoke(msg.payload));
      else if (msg.type === MSG.OFFSCREEN_COPY) sendResponse(copyText(msg.payload));
    } catch (err) {
      sendResponse({ ok: false, error: (err && err.message) || String(err) });
    }
    return false;
  });
})();
