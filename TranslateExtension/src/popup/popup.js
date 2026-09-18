/** 彈出視窗：切換翻譯、顯示進度、快速調整語言與樣式。 */
(function () {
  'use strict';

  const C = window.AIT_CONST;
  const MSG = C.MSG;
  const Settings = window.AITSettings;
  const I18N = window.AITI18N;
  const t = I18N.t;

  const el = {
    providerLine: document.getElementById('providerLine'),
    toggle: document.getElementById('btnToggle'),
    status: document.getElementById('status'),
    retry: document.getElementById('btnRetry'),
    targetLang: document.getElementById('targetLang'),
    style: document.getElementById('style'),
    autoHost: document.getElementById('autoHost'),
    autoHostLabel: document.getElementById('autoHostLabel'),
    options: document.getElementById('btnOptions'),
    linkOptions: document.getElementById('linkOptions')
  };

  let settings = null;
  let tab = null;
  let host = '';

  function fillSelect(select, list) {
    select.textContent = '';
    for (const item of list) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.appendChild(option);
    }
  }

  function setStatus(text, isError) {
    el.status.textContent = text;
    el.status.classList.toggle('error', !!isError);
  }

  function describeProvider() {
    const cfg = Settings.activeProviderConfig(settings);
    const meta = C.PROVIDERS[cfg.id];
    const missingKey = meta.needsKey && !cfg.apiKey;
    el.providerLine.textContent = cfg.label + ' · ' + (cfg.model || t('popup.noModel'));
    return { cfg, missingKey };
  }

  async function getTab() {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    return active || null;
  }

  function isSupportedUrl(url) {
    return /^https?:|^file:/i.test(String(url || ''));
  }

  async function askContentState() {
    if (!tab || !tab.id) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: MSG.STATE });
    } catch (e) {
      return null;
    }
  }

  function renderState(snapshot) {
    const active = !!(snapshot && snapshot.active);
    el.toggle.textContent = active ? t('popup.showOriginal') : t('popup.translate');
    el.toggle.classList.toggle('on', active);
    el.retry.hidden = !(snapshot && snapshot.failed);

    if (!snapshot) {
      setStatus(t('popup.notRunYet'));
      return;
    }
    if (snapshot.lastError) {
      setStatus(snapshot.lastError.split('\n')[0], true);
      return;
    }
    const parts = [];
    if (snapshot.done) parts.push(t('popup.doneN', { n: snapshot.done }));
    if (snapshot.working) parts.push(t('popup.workingN', { n: snapshot.working }));
    if (snapshot.failed) parts.push(t('popup.failedN', { n: snapshot.failed }));
    setStatus(parts.length
      ? parts.join(t('popup.statusSep'))
      : (active ? t('popup.activeIdle') : t('popup.ready')));
  }

  async function refresh() {
    renderState(await askContentState());
  }

  async function onToggle() {
    if (!tab || !tab.id) return;
    const { missingKey } = describeProvider();
    if (missingKey) {
      setStatus(t('popup.needKeyOpen'), true);
      chrome.runtime.sendMessage({ type: MSG.OPEN_OPTIONS });
      return;
    }
    el.toggle.disabled = true;
    setStatus(t('popup.working'));
    const res = await chrome.runtime.sendMessage({ type: MSG.TOGGLE, payload: { tabId: tab.id } });
    el.toggle.disabled = false;
    if (res && res.ok === false) {
      setStatus((res.error && res.error.message) || t('popup.toggleFailed'), true);
      return;
    }
    renderState(res);
    setTimeout(refresh, 900);
  }

  async function onRetry() {
    if (!tab || !tab.id) return;
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: MSG.RETRY_FAILED });
      renderState(res);
    } catch (e) {
      setStatus(t('popup.noContact'), true);
    }
  }

  async function onChangeLang() {
    settings = await Settings.save({ targetLang: el.targetLang.value });
    describeProvider();
    setStatus(t('popup.langUpdated', { lang: el.targetLang.options[el.targetLang.selectedIndex].textContent }));
  }

  async function onChangeStyle() {
    settings = await Settings.save({ style: el.style.value });
    setStatus(t('popup.styleUpdated'));
  }

  async function onToggleAutoHost() {
    if (!host) return;
    const list = Array.isArray(settings.autoTranslateHosts) ? settings.autoTranslateHosts.slice() : [];
    const index = list.indexOf(host);
    if (el.autoHost.checked && index < 0) list.push(host);
    if (!el.autoHost.checked && index >= 0) list.splice(index, 1);
    settings = await Settings.save({ autoTranslateHosts: list });
    setStatus(el.autoHost.checked ? t('popup.autoOn', { host }) : t('popup.autoOff', { host }));
  }

  function openOptions(ev) {
    if (ev) ev.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  }

  (async function init() {
    settings = await Settings.load();
    I18N.setLang(settings.lang);
    I18N.applyDom();

    fillSelect(el.targetLang, I18N.localizeList(C.LANGS));
    fillSelect(el.style, I18N.localizeList(C.STYLES));
    el.targetLang.value = settings.targetLang;
    el.style.value = settings.style;

    tab = await getTab();
    if (tab && tab.url) {
      try {
        host = new URL(tab.url).hostname;
      } catch (e) {
        host = '';
      }
    }
    el.autoHostLabel.textContent = t('popup.autoHost', { host: host || t('popup.thisPage') });
    el.autoHost.checked = !!host && Array.isArray(settings.autoTranslateHosts) &&
      settings.autoTranslateHosts.indexOf(host) >= 0;
    el.autoHost.disabled = !host;

    const { missingKey } = describeProvider();
    const supported = tab && isSupportedUrl(tab.url);
    el.toggle.disabled = !supported;

    if (!supported) {
      setStatus(t('popup.unsupported'));
    } else if (missingKey) {
      setStatus(t('popup.needKey'), true);
    } else {
      await refresh();
    }

    el.toggle.addEventListener('click', onToggle);
    el.retry.addEventListener('click', onRetry);
    el.targetLang.addEventListener('change', onChangeLang);
    el.style.addEventListener('change', onChangeStyle);
    el.autoHost.addEventListener('change', onToggleAutoHost);
    el.options.addEventListener('click', openOptions);
    el.linkOptions.addEventListener('click', openOptions);
  })();
})();
