/** 彈出視窗：常用選項與三個動作（存檔／複製／預覽），所有變更即時儲存。 */
(function () {
  'use strict';

  const C = window.W2M_CONST;
  const MSG = C.MSG;
  const Settings = window.W2MSettings;
  const M = window.W2MMarkdown;
  const I18N = window.W2MI18N;
  const t = I18N.t;

  const $ = (id) => document.getElementById(id);

  const FIELDS = [
    { id: 'linkStyle', key: 'linkStyle', type: 'value' },
    { id: 'imageMode', key: 'imageMode', type: 'value' },
    { id: 'frontMatter', key: 'frontMatter', type: 'value' },
    { id: 'mainContentOnly', key: 'mainContentOnly', type: 'checked' },
    { id: 'stripJunk', key: 'stripJunk', type: 'checked' },
    { id: 'preferSelection', key: 'preferSelection', type: 'checked' },
    { id: 'includeTitle', key: 'includeTitle', type: 'checked' },
    { id: 'gfmTables', key: 'gfmTables', type: 'checked' },
    { id: 'saveAs', key: 'saveAs', type: 'checked' }
  ];

  const ACTIONS = ['btnSave', 'btnCopy', 'btnPreview'];

  let settings = null;
  let tab = null;
  let busy = false;
  let saveTimer = null;

  function fillSelect(select, list) {
    select.textContent = '';
    for (const item of I18N.localizeList(list)) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    }
  }

  function setStatus(text, kind) {
    const node = $('status');
    node.textContent = text;
    node.classList.toggle('error', kind === 'error');
    node.classList.toggle('ok', kind === 'ok');
  }

  function setBusy(value) {
    busy = value;
    for (const id of ACTIONS) $(id).disabled = value;
  }

  function readField(field) {
    const node = $(field.id);
    return field.type === 'checked' ? node.checked : node.value;
  }

  function writeFields() {
    for (const field of FIELDS) {
      const node = $(field.id);
      const value = settings[field.key];
      if (field.type === 'checked') node.checked = !!value;
      else node.value = value === null || value === undefined ? '' : String(value);
    }
  }

  function updateFilenamePreview() {
    if (!tab) return;
    let name;
    try {
      name = M.buildFilename(settings.filenameTemplate, { title: tab.title, url: tab.url });
    } catch (e) {
      name = t('popup.badTemplate');
    }
    $('filenamePreview').textContent =
      t('popup.savesTo', { path: M.buildDownloadPath(settings.subfolder, name) });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      settings = await Settings.save(settings);
    }, 200);
  }

  function describe(result) {
    const stats = result.stats || {};
    const bits = [];
    if (stats.words) bits.push(t('stats.words', { count: stats.words.toLocaleString() }));
    if (stats.links) bits.push(t('stats.links', { count: stats.links }));
    if (stats.images) bits.push(t('stats.images', { count: stats.images }));
    const head = bits.length ? t('stats.wrap', { list: bits.join(t('sep.list')) }) : '';
    const notes = (result.notes || []).concat(result.warnings || []);
    return head + (notes.length ? '\n' + notes.join(t('sep.note')) : '');
  }

  async function send(type, overrides) {
    return chrome.runtime.sendMessage({
      type,
      payload: {
        tab: { id: tab.id, url: tab.url, title: tab.title },
        overrides: overrides || null
      }
    }).catch((err) => ({ ok: false, error: (err && err.message) || String(err) }));
  }

  async function act(type, working) {
    if (busy || !tab) return;
    setBusy(true);
    setStatus(working);
    clearTimeout(saveTimer);
    settings = await Settings.save(settings);

    const res = await send(type);
    setBusy(false);

    if (!res || !res.ok) {
      setStatus((res && res.error) || t('popup.convertFailed'), 'error');
      return res;
    }
    return res;
  }

  async function onSave() {
    const res = await act(MSG.SAVE, t('popup.starting'));
    if (!res || !res.ok) return;
    const kb = res.bytes ? Math.max(1, Math.round(res.bytes / 1024)) : 0;
    const head = kb
      ? t('popup.savedWithSize', { name: res.filename, kb: kb.toLocaleString() })
      : t('popup.saved', { name: res.filename });
    setStatus(head + describe(res), 'ok');
  }

  async function onCopy() {
    const res = await act(MSG.COPY, t('popup.copying'));
    if (!res || !res.ok) return;
    setStatus(t('popup.copied') + describe(res), 'ok');
  }

  async function onPreview() {
    const res = await act(MSG.PREVIEW, t('popup.converting'));
    if (!res || !res.ok) return;
    window.close();
  }

  function openOptions(ev) {
    if (ev) ev.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === MSG.PROGRESS && msg.payload) setStatus(msg.payload.text);
    return false;
  });

  (async function init() {
    // 先讀設定才知道語言，選單內容也才翻得對
    settings = await Settings.load();
    I18N.setLang(settings.lang);
    I18N.applyDom();

    fillSelect($('linkStyle'), C.LINK_STYLES);
    fillSelect($('imageMode'), C.IMAGE_MODES);
    fillSelect($('frontMatter'), C.FRONT_MATTER_MODES);
    writeFields();

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
        setBusy(false);
      }
    }

    for (const field of FIELDS) {
      $(field.id).addEventListener('change', () => {
        settings[field.key] = readField(field);
        updateFilenamePreview();
        scheduleSave();
      });
    }
    $('btnSave').addEventListener('click', onSave);
    $('btnCopy').addEventListener('click', onCopy);
    $('btnPreview').addEventListener('click', onPreview);
    $('btnOptions').addEventListener('click', openOptions);
    $('linkOptions').addEventListener('click', openOptions);
  })();
})();
