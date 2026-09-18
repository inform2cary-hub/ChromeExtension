/** 設定頁：服務商切換、連線測試、模型清單、外觀預覽。所有欄位變更即時儲存。 */
(function () {
  'use strict';

  const C = window.AIT_CONST;
  const MSG = C.MSG;
  const Settings = window.AITSettings;
  const Render = window.AITRender;
  const I18N = window.AITI18N;
  const t = I18N.t;

  const $ = (id) => document.getElementById(id);

  const FIELDS = [
    { id: 'targetLang', key: 'targetLang', type: 'value' },
    { id: 'tone', key: 'tone', type: 'value' },
    { id: 'domainHint', key: 'domainHint', type: 'value' },
    { id: 'skipSameLanguage', key: 'skipSameLanguage', type: 'checked' },
    { id: 'minChars', key: 'minChars', type: 'number' },
    { id: 'style', key: 'style', type: 'value' },
    { id: 'color', key: 'color', type: 'value' },
    { id: 'fontScale', key: 'fontScale', type: 'number' },
    { id: 'cjkFont', key: 'cjkFont', type: 'checked' },
    { id: 'lazyTranslate', key: 'lazyTranslate', type: 'checked' },
    { id: 'batchChars', key: 'batchChars', type: 'number' },
    { id: 'batchMaxItems', key: 'batchMaxItems', type: 'number' },
    { id: 'concurrency', key: 'concurrency', type: 'number' },
    { id: 'timeoutSec', key: 'timeoutSec', type: 'number' },
    { id: 'disableThinking', key: 'disableThinking', type: 'checked' },
    { id: 'thinkingLevel', key: 'thinkingLevel', type: 'value' },
    { id: 'reasoningEffort', key: 'reasoningEffort', type: 'value' },
    { id: 'temperature', key: 'temperature', type: 'temperature' },
    { id: 'autoTranslate', key: 'autoTranslate', type: 'checked' },
    { id: 'autoTranslateHosts', key: 'autoTranslateHosts', type: 'lines' },
    { id: 'excludeHosts', key: 'excludeHosts', type: 'lines' },
    { id: 'skipSelectors', key: 'skipSelectors', type: 'value' }
  ];

  let settings = null;
  let saveTimer = null;
  // 目前服務商的自訂表頭，與 headersList 的 DOM 列一一對應（未存檔前允許暫時留空鍵名）
  let headersState = [];

  // -------------------------------------------------------------- 小工具

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
    fillSelect($('targetLang'), I18N.localizeList(C.LANGS));
    fillSelect($('tone'), I18N.localizeList(C.TONES));
    fillSelect($('style'), I18N.localizeList(C.STYLES));
    fillSelect($('thinkingLevel'), I18N.localizeList(C.THINKING_LEVELS));
    fillSelect($('reasoningEffort'), I18N.localizeList(C.REASONING_EFFORTS));
    $('langSelect').value = I18N.getLang();
    // 金鑰正顯示時，applyDom 會把按鈕寫回「顯示」，這裡按實際狀態補回來
    $('btnShowKey').textContent = $('apiKey').type === 'text' ? t('options.hide') : t('options.show');
    renderAll();
    renderStats();
  }

  async function onLangChange() {
    settings.lang = I18N.normalize($('langSelect').value);
    renderLanguage();
    settings = await Settings.save({ lang: settings.lang });
    flashSaved();
  }

  function toLines(value) {
    return Array.isArray(value) ? value.join('\n') : '';
  }

  function fromLines(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function flashSaved() {
    const tag = $('savedTag');
    tag.hidden = false;
    clearTimeout(flashSaved.timer);
    flashSaved.timer = setTimeout(() => {
      tag.hidden = true;
    }, 1400);
  }

  function setResult(text, isError) {
    const box = $('testResult');
    box.hidden = !text;
    box.textContent = text || '';
    box.classList.toggle('error', !!isError);
  }

  // -------------------------------------------------------------- 讀寫表單

  function readField(field) {
    const node = $(field.id);
    switch (field.type) {
      case 'checked':
        return node.checked;
      case 'number': {
        const n = Number(node.value);
        return Number.isFinite(n) ? n : Settings.DEFAULTS[field.key];
      }
      case 'lines':
        return fromLines(node.value);
      case 'temperature': {
        const raw = String(node.value).trim();
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      }
      default:
        return node.value;
    }
  }

  function writeField(field) {
    const node = $(field.id);
    const value = settings[field.key];
    switch (field.type) {
      case 'checked':
        node.checked = !!value;
        break;
      case 'lines':
        node.value = toLines(value);
        break;
      case 'temperature':
        node.value = (value === null || value === undefined) ? '' : String(value);
        break;
      default:
        node.value = value === null || value === undefined ? '' : String(value);
    }
  }

  function collectPatch() {
    const patch = {};
    for (const field of FIELDS) patch[field.key] = readField(field);
    patch.provider = settings.provider;
    patch.providers = Object.assign({}, settings.providers);
    patch.providers[settings.provider] = {
      apiKey: $('apiKey').value.trim(),
      baseUrl: $('baseUrl').value.trim(),
      model: $('model').value.trim(),
      headers: headersState
        .map((h) => ({ key: (h.key || '').trim(), value: (h.value || '').trim() }))
        .filter((h) => h.key)
    };
    return patch;
  }

  async function saveNow() {
    settings = await Settings.save(collectPatch());
    flashSaved();
    applyPreview();
    return settings;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }

  // ------------------------------------------------------------ 服務商 UI

  function renderProviders() {
    const list = $('providerList');
    list.textContent = '';
    for (const id of C.PROVIDER_ORDER) {
      const meta = C.PROVIDERS[id];
      const label = document.createElement('label');
      label.className = 'provider' + (settings.provider === id ? ' active' : '');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'provider';
      radio.value = id;
      radio.checked = settings.provider === id;
      radio.addEventListener('change', () => onProviderChange(id));

      const box = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = t(meta.labelKey);
      const hint = document.createElement('small');
      hint.textContent = t(meta.hintKey);
      box.appendChild(name);
      box.appendChild(hint);

      label.appendChild(radio);
      label.appendChild(box);
      list.appendChild(label);
    }
  }

  function renderProviderFields() {
    const meta = C.PROVIDERS[settings.provider];
    const cfg = (settings.providers && settings.providers[settings.provider]) || {};

    $('apiKey').value = cfg.apiKey || '';
    $('baseUrl').value = cfg.baseUrl || '';
    $('model').value = cfg.model || '';
    $('baseUrl').placeholder = meta.defaultBaseUrl || 'https://api.example.com/v1';
    $('model').placeholder = meta.defaultModel || t('options.modelPh');

    headersState = Array.isArray(cfg.headers) ? cfg.headers.map((h) => ({ key: h.key || '', value: h.value || '' })) : [];
    renderHeaders();

    const keyHint = $('keyHint');
    keyHint.textContent = '';
    if (!meta.needsKey) {
      keyHint.appendChild(document.createTextNode(t('options.keyHintLocal')));
    } else if (meta.keyUrl) {
      keyHint.appendChild(document.createTextNode(t('options.keyHintLink')));
      const link = document.createElement('a');
      link.href = meta.keyUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = meta.keyUrl;
      keyHint.appendChild(link);
    } else {
      keyHint.appendChild(document.createTextNode(t('options.keyHintPlain')));
    }

    const baseHint = $('baseHint');
    if (settings.provider === 'gemini') {
      baseHint.textContent = t('options.baseHintGemini');
    } else if (settings.provider === 'local' || settings.provider === 'custom') {
      baseHint.textContent = t('options.baseHintLocal');
    } else {
      baseHint.textContent = t('options.baseHintOpenai');
    }

    const modelHint = $('modelHint');
    modelHint.textContent = meta.suggestedModels.length
      ? t('options.modelHintSuggested', { list: meta.suggestedModels.join(t('options.listSep')) })
      : t('options.modelHintFetch');

    fillModelList(meta.suggestedModels);
    updateGrantButton();
  }

  // -------------------------------------------------------------- 自訂表頭

  function renderHeaders() {
    const list = $('headersList');
    list.textContent = '';
    headersState.forEach((header, index) => {
      const row = document.createElement('div');
      row.className = 'header-row';

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.spellcheck = false;
      keyInput.placeholder = t('options.headerKeyPh');
      keyInput.value = header.key || '';
      keyInput.addEventListener('change', () => {
        headersState[index].key = keyInput.value.trim();
        scheduleSave();
      });

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.spellcheck = false;
      valueInput.placeholder = t('options.headerValuePh');
      valueInput.value = header.value || '';
      valueInput.addEventListener('change', () => {
        headersState[index].value = valueInput.value.trim();
        scheduleSave();
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'header-remove';
      removeBtn.setAttribute('aria-label', t('options.headerRemoveAria'));
      removeBtn.textContent = '\u2715';
      removeBtn.addEventListener('click', () => {
        headersState.splice(index, 1);
        renderHeaders();
        scheduleSave();
      });

      row.appendChild(keyInput);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  }

  function addHeaderRow() {
    headersState.push({ key: '', value: '' });
    renderHeaders();
    const rows = $('headersList').querySelectorAll('.header-row input');
    const lastKeyInput = rows[rows.length - 2];
    if (lastKeyInput) lastKeyInput.focus();
  }

  function fillModelList(models) {
    const list = $('modelList');
    list.textContent = '';
    for (const id of models || []) {
      const option = document.createElement('option');
      option.value = id;
      list.appendChild(option);
    }
  }

  async function onProviderChange(id) {
    // 先把目前表單內容存回「原本的」服務商，再切換，
    // 否則 collectPatch() 會把舊服務商的 Base URL / 模型寫進新服務商。
    clearTimeout(saveTimer);
    settings = await Settings.save(collectPatch());
    settings = await Settings.save({ provider: id });
    renderProviders();
    renderProviderFields();
    applyPreview();
    setResult('');
    flashSaved();
  }

  // ----------------------------------------------------- 網域授權（權限）

  function originOf(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol + '//' + parsed.hostname + '/*';
    } catch (e) {
      return '';
    }
  }

  function currentBaseUrl() {
    const meta = C.PROVIDERS[settings.provider];
    return $('baseUrl').value.trim() || meta.defaultBaseUrl || '';
  }

  // 快取權限狀態：chrome.permissions.request 必須是使用者手勢中的第一個 await，
  // 若先 await permissions.contains() 會失去手勢資格而被瀏覽器拒絕。
  let hostGranted = true;

  async function hasHostPermission() {
    const origin = originOf(currentBaseUrl());
    if (!origin) return true;
    try {
      return await chrome.permissions.contains({ origins: [origin] });
    } catch (e) {
      return false;
    }
  }

  async function updateGrantButton() {
    hostGranted = await hasHostPermission();
    $('btnGrant').hidden = hostGranted;
    return hostGranted;
  }

  async function requestHostPermission() {
    const origin = originOf(currentBaseUrl());
    if (!origin) return false;
    try {
      const granted = await chrome.permissions.request({ origins: [origin] });
      hostGranted = granted;
      $('btnGrant').hidden = granted;
      return granted;
    } catch (e) {
      return false;
    }
  }

  async function ensureHostPermission() {
    if (hostGranted) return true;
    return requestHostPermission();
  }

  // ------------------------------------------------------------ 動作按鈕

  async function onFetchModels() {
    const granted = await ensureHostPermission();
    if (!granted) {
      setResult(t('options.needGrantModels', { url: currentBaseUrl() }), true);
      return;
    }
    await saveNow();
    const btn = $('btnFetchModels');
    btn.disabled = true;
    btn.textContent = t('options.fetching');
    const res = await chrome.runtime.sendMessage({ type: MSG.MODELS_LIST });
    btn.disabled = false;
    btn.textContent = t('options.fetchModels');
    if (!res || !res.ok) {
      setResult(t('options.fetchFailed', {
        message: (res && res.error && res.error.message) || t('options.unknownError')
      }), true);
      return;
    }
    fillModelList(res.models);
    setResult(t('options.modelsFound', { count: res.models.length }) + '\n' +
      res.models.slice(0, 30).join('\n'));
  }

  async function onTest() {
    const granted = await ensureHostPermission();
    if (!granted) {
      setResult(t('options.needGrantTest', { url: currentBaseUrl() }), true);
      return;
    }
    await saveNow();
    const btn = $('btnTest');
    btn.disabled = true;
    btn.textContent = t('options.testing');
    setResult(t('options.requesting'));
    const res = await chrome.runtime.sendMessage({ type: MSG.TEST });
    btn.disabled = false;
    btn.textContent = t('options.test');
    if (!res || !res.ok) {
      setResult(t('options.testFailed', {
        message: (res && res.error && res.error.message) || t('options.unknownError')
      }), true);
      return;
    }
    const usage = res.usage || {};
    setResult([
      t('options.testOk', { provider: res.provider, model: res.model, ms: res.ms }),
      '',
      t('options.testSource', { text: res.source }),
      t('options.testTarget', { text: res.text }),
      '',
      t('options.testTokens', { in: usage.input || 0, out: usage.output || 0 })
    ].join('\n'));
  }

  async function onReset() {
    if (!window.confirm(t('options.resetConfirm'))) return;
    const res = await chrome.runtime.sendMessage({ type: MSG.SETTINGS_RESET });
    settings = (res && res.settings) || await Settings.load();
    renderLanguage();
    setResult(t('options.resetDone'));
  }

  // -------------------------------------------------------------- 預覽

  function applyPreview() {
    Render.applyTheme(settings);
    const node = $('previewTr');
    if (node) node.setAttribute('data-ait-style', settings.style);
    $('fontScaleOut').textContent = Number(settings.fontScale).toFixed(2) + '×';
    $('colorText').value = settings.color;
    $('color').value = settings.color;
  }

  async function renderStats() {
    const res = await chrome.runtime.sendMessage({ type: MSG.SETTINGS_GET });
    const stats = (res && res.stats) || null;
    if (!stats) return;
    $('stats').textContent = t('options.stats', stats);
  }

  function renderAll() {
    for (const field of FIELDS) writeField(field);
    renderProviders();
    renderProviderFields();
    applyPreview();
  }

  // -------------------------------------------------------------- 事件綁定

  function bindEvents() {
    for (const field of FIELDS) {
      const node = $(field.id);
      node.addEventListener('change', () => {
        settings[field.key] = readField(field);
        applyPreview();
        scheduleSave();
      });
    }

    // 即時預覽（不等 change 事件）
    $('fontScale').addEventListener('input', () => {
      settings.fontScale = Number($('fontScale').value);
      applyPreview();
    });
    $('style').addEventListener('input', () => {
      settings.style = $('style').value;
      applyPreview();
    });
    $('color').addEventListener('input', () => {
      settings.color = $('color').value;
      applyPreview();
    });
    $('colorText').addEventListener('change', () => {
      const value = $('colorText').value.trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
        settings.color = value.startsWith('#') ? value : '#' + value;
        applyPreview();
        scheduleSave();
      } else {
        $('colorText').value = settings.color;
      }
    });

    for (const id of ['apiKey', 'baseUrl', 'model']) {
      $(id).addEventListener('change', () => {
        scheduleSave();
        if (id === 'baseUrl') updateGrantButton();
      });
    }

    $('btnShowKey').addEventListener('click', () => {
      const input = $('apiKey');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('btnShowKey').textContent = showing ? t('options.show') : t('options.hide');
    });

    $('btnAddHeader').addEventListener('click', addHeaderRow);
    $('btnFetchModels').addEventListener('click', onFetchModels);
    $('btnTest').addEventListener('click', onTest);
    $('btnReset').addEventListener('click', onReset);
    $('btnGrant').addEventListener('click', async () => {
      const granted = await requestHostPermission();
      setResult(granted ? t('options.grantOk', { url: currentBaseUrl() }) : t('options.grantFail'), !granted);
    });
  }

  /** 顯示版本，方便確認 chrome://extensions 是否已重新載入到新版程式碼 */
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
    bindEvents();
    $('langSelect').addEventListener('change', onLangChange);
  })();
})();
