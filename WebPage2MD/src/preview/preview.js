/**
 * 預覽頁：顯示轉換結果的 Markdown 原始碼，可以直接改完再存檔或複製。
 * 內容由 service worker 放進 chrome.storage.session（長文塞不進網址）。
 *
 * 這裡是擴充功能頁面，有完整的 DOM 與 chrome.downloads，
 * 所以存檔不需要繞道離螢幕文件。
 */
(function () {
  'use strict';

  const C = window.W2M_CONST;
  const M = window.W2MMarkdown;
  const Settings = window.W2MSettings;
  const I18N = window.W2MI18N;
  const t = I18N.t;

  const $ = (id) => document.getElementById(id);

  let payload = null;

  function setStatus(text, kind) {
    const node = $('status');
    node.textContent = text || '';
    node.classList.toggle('ok', kind === 'ok');
    node.classList.toggle('error', kind === 'error');
  }

  function renderStats() {
    const stats = payload.stats || {};
    const markdown = $('editor').value;
    const bits = [
      ['preview.statWords', M.countWords(markdown).toLocaleString()],
      ['preview.statChars', markdown.length.toLocaleString()],
      ['preview.statLines', markdown.split('\n').length.toLocaleString()],
      ['preview.statLinks', String(stats.links || 0)],
      ['preview.statImages', String(stats.images || 0)],
      ['preview.statFilename', payload.filename || '']
    ];
    const bar = $('statsBar');
    bar.textContent = '';
    for (const [label, value] of bits) {
      const span = document.createElement('span');
      span.textContent = t(label) + t('sep.colon');
      const strong = document.createElement('b');
      strong.textContent = value;
      span.appendChild(strong);
      bar.appendChild(span);
    }
  }

  function renderNotes() {
    const node = $('notes');
    node.textContent = '';
    const notes = payload.notes || [];
    const warnings = payload.warnings || [];
    if (notes.length) {
      const line = document.createElement('span');
      line.textContent = notes.join(t('sep.note'));
      node.appendChild(line);
    }
    if (warnings.length) {
      if (notes.length) node.appendChild(document.createElement('br'));
      const line = document.createElement('span');
      line.className = 'warn';
      line.textContent = t('preview.warnPrefix') + warnings.join(t('sep.note'));
      node.appendChild(line);
    }
  }

  async function onCopy() {
    const text = $('editor').value;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t('preview.copiedChars', { count: text.length.toLocaleString() }), 'ok');
    } catch (err) {
      $('editor').select();
      setStatus(t('preview.copyDenied'), 'error');
    }
  }

  function onSelectAll() {
    const editor = $('editor');
    editor.focus();
    editor.select();
    setStatus(t('preview.selectedAll'));
  }

  async function onDownload() {
    const text = $('editor').value;
    if (!text.trim()) {
      setStatus(t('preview.nothingToSave'), 'error');
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: C.MARKDOWN_MIME }));
    try {
      await chrome.downloads.download({
        url,
        filename: payload.path || payload.filename || 'webpage.md',
        saveAs: !!payload.saveAs
      });
      setStatus(t('preview.downloading', { path: payload.path || payload.filename }), 'ok');
    } catch (err) {
      setStatus(t('preview.saveFailed', { message: (err && err.message) || String(err) }), 'error');
    } finally {
      // 下載會非同步讀取這個 URL，太早釋放會讓檔案變成 0 位元組
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  (async function init() {
    // 預覽頁跟 popup 一樣，先套用設定裡的語言再畫內容
    const settings = await Settings.load();
    I18N.setLang(settings.lang);
    I18N.applyDom();

    const stored = await chrome.storage.session.get(C.PREVIEW_KEY);
    payload = stored && stored[C.PREVIEW_KEY];

    if (!payload || !payload.markdown) {
      $('docSource').textContent = t('preview.noPayload');
      $('btnCopy').disabled = true;
      $('btnDownload').disabled = true;
      $('btnSelectAll').disabled = true;
      return;
    }

    const meta = payload.meta || {};
    document.title = t('preview.docTitle', { title: meta.title || 'Markdown' });
    $('docTitle').textContent = meta.title || t('preview.title');
    $('docSource').textContent = meta.url || '';
    $('editor').value = payload.markdown;

    renderStats();
    renderNotes();
    setStatus(t('preview.editHint'));

    $('editor').addEventListener('input', renderStats);
    $('btnCopy').addEventListener('click', onCopy);
    $('btnDownload').addEventListener('click', onDownload);
    $('btnSelectAll').addEventListener('click', onSelectAll);
  })();
})();
