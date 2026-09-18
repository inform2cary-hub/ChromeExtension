/** 彈出視窗：常用版面選項與轉檔動作，所有變更即時儲存。 */
(function () {
  'use strict';

  const C = window.W2P_CONST;
  const MSG = C.MSG;
  const Settings = window.W2PSettings;
  const Pdf = window.W2PPdf;
  const I18N = window.W2PI18N;
  const t = I18N.t;

  const $ = (id) => document.getElementById(id);

  const FIELDS = [
    { id: 'paper', key: 'paper', type: 'value' },
    { id: 'customWidth', key: 'customWidth', type: 'number' },
    { id: 'customHeight', key: 'customHeight', type: 'number' },
    { id: 'orientation', key: 'orientation', type: 'value' },
    { id: 'marginPreset', key: 'marginPreset', type: 'value' },
    { id: 'marginTop', key: 'marginTop', type: 'number' },
    { id: 'marginRight', key: 'marginRight', type: 'number' },
    { id: 'marginBottom', key: 'marginBottom', type: 'number' },
    { id: 'marginLeft', key: 'marginLeft', type: 'number' },
    { id: 'scale', key: 'scale', type: 'number' },
    { id: 'pageRanges', key: 'pageRanges', type: 'value' },
    { id: 'printBackground', key: 'printBackground', type: 'checked' },
    { id: 'headerFooter', key: 'headerFooter', type: 'checked' },
    { id: 'mainContentOnly', key: 'mainContentOnly', type: 'checked' },
    { id: 'removeFixed', key: 'removeFixed', type: 'checked' },
    { id: 'forceLightBackground', key: 'forceLightBackground', type: 'checked' },
    { id: 'emulateScreenMedia', key: 'emulateScreenMedia', type: 'checked' },
    { id: 'expandLazyContent', key: 'expandLazyContent', type: 'checked' },
    { id: 'saveAs', key: 'saveAs', type: 'checked' }
  ];

  let settings = null;
  let tab = null;
  let busy = false;
  let saveTimer = null;

  function fillSelect(select, list) {
    const keep = select.value;
    select.textContent = '';
    for (const item of I18N.localizeList(list)) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    }
    if (keep) select.value = keep;
  }

  function setStatus(text, kind) {
    const node = $('status');
    node.textContent = text;
    node.classList.toggle('error', kind === 'error');
    node.classList.toggle('ok', kind === 'ok');
  }

  function readField(field) {
    const node = $(field.id);
    if (field.type === 'checked') return node.checked;
    if (field.type === 'number') {
      const n = Number(node.value);
      return Number.isFinite(n) ? n : Settings.DEFAULTS[field.key];
    }
    return node.value;
  }

  function writeFields() {
    for (const field of FIELDS) {
      const node = $(field.id);
      const value = settings[field.key];
      if (field.type === 'checked') node.checked = !!value;
      else node.value = value === null || value === undefined ? '' : String(value);
    }
  }

  function syncConditionalRows() {
    $('customSizeRow').hidden = settings.paper !== 'custom';
    $('customMarginRow').hidden = settings.marginPreset !== 'custom';
  }

  function updateFilenamePreview() {
    if (!tab) return;
    let name = '';
    try {
      name = Pdf.buildFilename(settings.filenameTemplate, { title: tab.title, url: tab.url });
    } catch (e) {
      name = t('popup.badTemplate');
    }
    const path = Pdf.buildDownloadPath(settings.subfolder, name);
    $('filenamePreview').textContent = t('popup.savesTo', { path });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      settings = await Settings.save(settings);
    }, 200);
  }

  function onFieldChange(field) {
    settings[field.key] = readField(field);
    syncConditionalRows();
    updateFilenamePreview();
    if (field.key === 'headerFooter' && settings.headerFooter) {
      const min = Pdf.HEADER_MIN_MARGIN_MM;
      if (Number(settings.marginTop) < min || settings.marginPreset === 'none' || settings.marginPreset === 'minimum') {
        setStatus(t('popup.headerMarginNote', { mm: min }));
      }
    }
    scheduleSave();
  }

  async function onExport() {
    if (busy || !tab) return;
    busy = true;
    $('btnExport').disabled = true;
    setStatus(t('popup.starting'));
    clearTimeout(saveTimer);
    settings = await Settings.save(settings);

    const res = await chrome.runtime.sendMessage({
      type: MSG.EXPORT,
      payload: { tab: { id: tab.id, url: tab.url, title: tab.title } }
    }).catch((err) => ({ ok: false, error: (err && err.message) || String(err) }));

    busy = false;
    $('btnExport').disabled = false;

    if (!res || !res.ok) {
      setStatus((res && res.error) || t('popup.exportFailed'), 'error');
      return;
    }
    const kb = res.bytes ? Math.max(1, Math.round(res.bytes / 1024)) : 0;
    const head = kb
      ? t('popup.savedWithSize', { name: res.filename, kb: kb.toLocaleString() })
      : t('popup.saved', { name: res.filename });
    const notes = (res.notes || []).length ? '\n' + res.notes.join('; ') : '';
    setStatus(head + notes, 'ok');
  }

  async function onPrintDialog() {
    if (!tab) return;
    setStatus(t('popup.printDialogOpened'));
    const res = await chrome.runtime.sendMessage({
      type: MSG.PRINT_DIALOG,
      payload: { tab: { id: tab.id, url: tab.url, title: tab.title } }
    }).catch((err) => ({ ok: false, error: (err && err.message) || String(err) }));
    if (!res || !res.ok) setStatus((res && res.error) || t('popup.printDialogFailed'), 'error');
    else window.close();
  }

  function openOptions(ev) {
    if (ev) ev.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === MSG.EXPORT_PROGRESS && msg.payload) setStatus(msg.payload.text);
    return false;
  });

  (async function init() {
    // 先載設定才知道語言，選單標籤與靜態文字都要用翻譯後的版本
    settings = await Settings.load();
    I18N.setLang(settings.lang);
    I18N.applyDom();

    fillSelect($('paper'), C.PAPERS);
    fillSelect($('orientation'), C.ORIENTATIONS);
    fillSelect($('marginPreset'), C.MARGIN_PRESETS);

    writeFields();
    syncConditionalRows();

    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = active || null;

    if (!tab) {
      setStatus(t('popup.noTab'), 'error');
    } else {
      $('pageLine').textContent = tab.title || tab.url || '';
      $('pageLine').title = tab.url || '';
      updateFilenamePreview();
      if (C.isBlockedUrl(tab.url)) {
        setStatus(t('popup.blockedPage'), 'error');
      } else {
        $('btnExport').disabled = false;
      }
    }

    for (const field of FIELDS) {
      const node = $(field.id);
      node.addEventListener('change', () => onFieldChange(field));
    }
    $('btnExport').addEventListener('click', onExport);
    $('btnPrintDialog').addEventListener('click', onPrintDialog);
    $('btnOptions').addEventListener('click', openOptions);
    $('linkOptions').addEventListener('click', openOptions);
  })();
})();
