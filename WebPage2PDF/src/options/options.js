/** 設定頁：檔名、頁首頁尾、PDF 結構與頁面整理規則。所有欄位變更即時儲存。 */
(function () {
  'use strict';

  const C = window.W2P_CONST;
  const MSG = C.MSG;
  const Settings = window.W2PSettings;
  const Pdf = window.W2PPdf;
  const I18N = window.W2PI18N;
  const t = I18N.t;

  const $ = (id) => document.getElementById(id);

  const HF_SELECTS = ['headerLeft', 'headerRight', 'footerLeft', 'footerRight'];

  const FIELDS = [
    { id: 'filenameTemplate', key: 'filenameTemplate', type: 'value' },
    { id: 'subfolder', key: 'subfolder', type: 'value' },
    { id: 'saveAs', key: 'saveAs', type: 'checked' },
    { id: 'headerLeft', key: 'headerLeft', type: 'value' },
    { id: 'headerRight', key: 'headerRight', type: 'value' },
    { id: 'footerLeft', key: 'footerLeft', type: 'value' },
    { id: 'footerRight', key: 'footerRight', type: 'value' },
    { id: 'headerFooterFontPt', key: 'headerFooterFontPt', type: 'number' },
    { id: 'taggedPdf', key: 'taggedPdf', type: 'checked' },
    { id: 'documentOutline', key: 'documentOutline', type: 'checked' },
    { id: 'preferCSSPageSize', key: 'preferCSSPageSize', type: 'checked' },
    { id: 'removeSelectors', key: 'removeSelectors', type: 'value' },
    { id: 'expandDetails', key: 'expandDetails', type: 'checked' },
    { id: 'settleMs', key: 'settleMs', type: 'number' }
  ];

  const SAMPLE = {
    title: 'Running a trillion parameter model on one machine',
    url: 'https://blog.example.com/posts/trillion-parameters?ref=hn'
  };

  let settings = null;
  let saveTimer = null;

  function fillSelect(select, list) {
    const keep = select.value;
    select.textContent = '';
    for (const item of list) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    }
    if (keep) select.value = keep;
  }

  /** 語言換掉之後，靜態文字與所有以常數表產生的選單都要重畫 */
  function renderLanguage() {
    I18N.setLang(settings.lang);
    I18N.applyDom();
    fillSelect($('langSelect'), I18N.LANGS);
    for (const id of HF_SELECTS) fillSelect($(id), I18N.localizeList(C.HF_FIELDS));
    $('langSelect').value = I18N.getLang();
    writeFields();
    updatePreview();
  }

  async function onLangChange() {
    settings.lang = I18N.normalize($('langSelect').value);
    renderLanguage();
    settings = await Settings.save(settings);
    flashSaved();
  }

  function flashSaved() {
    const tag = $('savedTag');
    tag.hidden = false;
    clearTimeout(flashSaved.timer);
    flashSaved.timer = setTimeout(() => {
      tag.hidden = true;
    }, 1400);
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

  function updatePreview() {
    let name;
    try {
      name = Pdf.buildFilename(settings.filenameTemplate, SAMPLE);
    } catch (e) {
      name = t('popup.badTemplate');
    }
    const path = Pdf.buildDownloadPath(settings.subfolder, name);
    $('filenamePreview').textContent =
      t('options.sampleTitle', { title: SAMPLE.title }) + '\n' +
      t('options.sampleUrl', { url: SAMPLE.url }) + '\n' +
      t('options.samplePath', { path });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      settings = await Settings.save(settings);
      flashSaved();
    }, 250);
  }

  async function onReset() {
    if (!window.confirm(t('options.resetConfirm'))) return;
    const res = await chrome.runtime.sendMessage({ type: MSG.SETTINGS_RESET });
    settings = (res && res.settings) || await Settings.load();
    renderLanguage();
    flashSaved();
  }

  function showVersion() {
    try {
      $('version').textContent = 'v' + chrome.runtime.getManifest().version;
    } catch (e) {
      $('version').textContent = '';
    }
  }

  (async function init() {
    showVersion();

    settings = await Settings.load();
    renderLanguage();

    $('langSelect').addEventListener('change', onLangChange);

    for (const field of FIELDS) {
      const node = $(field.id);
      const handler = () => {
        settings[field.key] = readField(field);
        updatePreview();
        scheduleSave();
      };
      node.addEventListener('change', handler);
      if (field.id === 'filenameTemplate' || field.id === 'subfolder') {
        node.addEventListener('input', () => {
          settings[field.key] = readField(field);
          updatePreview();
        });
      }
    }

    $('btnReset').addEventListener('click', onReset);
  })();
})();
