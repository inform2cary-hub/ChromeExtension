/** 設定頁：擷取規則、Markdown 語法風格、front matter 與輸出。所有欄位變更即時儲存。 */
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
    // 內容擷取
    { id: 'mainContentOnly', key: 'mainContentOnly', type: 'checked' },
    { id: 'stripJunk', key: 'stripJunk', type: 'checked' },
    { id: 'preferSelection', key: 'preferSelection', type: 'checked' },
    { id: 'includeTitle', key: 'includeTitle', type: 'checked' },
    { id: 'removeSelectors', key: 'removeSelectors', type: 'value' },
    { id: 'expandLazyContent', key: 'expandLazyContent', type: 'checked' },
    { id: 'settleMs', key: 'settleMs', type: 'number' },

    // 語法風格
    { id: 'headingStyle', key: 'headingStyle', type: 'value' },
    { id: 'bulletMarker', key: 'bulletMarker', type: 'value' },
    { id: 'strongMarker', key: 'strongMarker', type: 'value' },
    { id: 'emphasisMarker', key: 'emphasisMarker', type: 'value' },
    { id: 'codeFence', key: 'codeFence', type: 'value' },
    { id: 'hrStyle', key: 'hrStyle', type: 'value' },
    { id: 'gfmTables', key: 'gfmTables', type: 'checked' },
    { id: 'taskLists', key: 'taskLists', type: 'checked' },
    { id: 'strikethrough', key: 'strikethrough', type: 'checked' },
    { id: 'highlightMarker', key: 'highlightMarker', type: 'checked' },
    { id: 'keepLineBreaks', key: 'keepLineBreaks', type: 'checked' },
    { id: 'codeLanguageFromClass', key: 'codeLanguageFromClass', type: 'checked' },
    { id: 'mathAsTex', key: 'mathAsTex', type: 'checked' },

    // 連結與圖片
    { id: 'linkStyle', key: 'linkStyle', type: 'value' },
    { id: 'imageMode', key: 'imageMode', type: 'value' },
    { id: 'absoluteUrls', key: 'absoluteUrls', type: 'checked' },
    { id: 'keepFragmentLinks', key: 'keepFragmentLinks', type: 'checked' },
    { id: 'skipDataUrlImages', key: 'skipDataUrlImages', type: 'checked' },

    // front matter
    { id: 'frontMatter', key: 'frontMatter', type: 'value' },
    { id: 'fmTitle', key: 'fmTitle', type: 'checked' },
    { id: 'fmSource', key: 'fmSource', type: 'checked' },
    { id: 'fmAuthor', key: 'fmAuthor', type: 'checked' },
    { id: 'fmPublished', key: 'fmPublished', type: 'checked' },
    { id: 'fmSiteName', key: 'fmSiteName', type: 'checked' },
    { id: 'fmCaptured', key: 'fmCaptured', type: 'checked' },
    { id: 'fmDescription', key: 'fmDescription', type: 'checked' },
    { id: 'fmLang', key: 'fmLang', type: 'checked' },
    { id: 'fmTags', key: 'fmTags', type: 'checked' },
    { id: 'frontMatterExtra', key: 'frontMatterExtra', type: 'value' },

    // 輸出
    { id: 'filenameTemplate', key: 'filenameTemplate', type: 'value' },
    { id: 'subfolder', key: 'subfolder', type: 'value' },
    { id: 'saveAs', key: 'saveAs', type: 'checked' }
  ];

  const LIVE_PREVIEW_IDS = ['filenameTemplate', 'subfolder', 'frontMatterExtra'];

  /** 選單清單與所在的常數表，換語言時要整批重畫 */
  const LIST_SELECTS = [
    ['headingStyle', 'HEADING_STYLES'],
    ['bulletMarker', 'BULLET_MARKERS'],
    ['strongMarker', 'STRONG_MARKERS'],
    ['emphasisMarker', 'EMPHASIS_MARKERS'],
    ['codeFence', 'CODE_FENCES'],
    ['hrStyle', 'HR_STYLES'],
    ['linkStyle', 'LINK_STYLES'],
    ['imageMode', 'IMAGE_MODES'],
    ['frontMatter', 'FRONT_MATTER_MODES']
  ];

  /** 範例資料也翻譯，否則英文介面會冒出中文的 front matter 預覽 */
  function sampleDoc() {
    return {
      title: t('sample.title'),
      url: 'https://blog.example.com/posts/trillion-parameters?ref=hn',
      author: t('sample.author'),
      published: '2026-08-14T09:05:03+08:00',
      description: t('sample.description'),
      siteName: t('sample.siteName'),
      lang: t('sample.lang'),
      tags: [t('sample.tag1'), t('sample.tag2')]
    };
  }

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
    for (const [id, table] of LIST_SELECTS) fillSelect($(id), I18N.localizeList(C[table]));
    fillSelect($('langSelect'), I18N.LANGS);
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
    const sample = sampleDoc();
    const frontMatter = M.buildFrontMatter(sample, settings);
    $('frontMatterPreview').textContent = frontMatter || t('options.noFrontMatter');

    let name;
    try {
      name = M.buildFilename(settings.filenameTemplate, sample);
    } catch (e) {
      name = t('popup.badTemplate');
    }
    $('filenamePreview').textContent =
      t('options.sampleTitle', { title: sample.title }) + '\n' +
      t('options.sampleUrl', { url: sample.url }) + '\n' +
      t('options.samplePath', { path: M.buildDownloadPath(settings.subfolder, name) });
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
      node.addEventListener('change', () => {
        settings[field.key] = readField(field);
        updatePreview();
        scheduleSave();
      });
      if (LIVE_PREVIEW_IDS.includes(field.id)) {
        node.addEventListener('input', () => {
          settings[field.key] = readField(field);
          updatePreview();
        });
      }
    }

    $('btnReset').addEventListener('click', onReset);
  })();
})();
