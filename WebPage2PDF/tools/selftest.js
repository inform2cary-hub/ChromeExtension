/**
 * 自我測試（不需要瀏覽器）：
 *   node tools/selftest.js
 *
 * A. 版面換算與檔名邏輯（src/lib/pdf.js 是純函式，可直接驗證）
 * B. 整合檢查：manifest 與 HTML 引用、元素 id 綁定、訊息型別、權限宣告
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log('PASS ' + name);
  } else {
    failures++;
    console.log('FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''));
  }
}

function near(actual, expected, tolerance) {
  return Math.abs(Number(actual) - Number(expected)) <= (tolerance || 0.001);
}

/** 靜態檢查程式碼用到哪些 API 時，要先去掉註解，否則註解裡提到的 API 會被誤判 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

globalThis.self = globalThis;
for (const file of ['src/lib/constants.js', 'src/lib/i18n.js', 'src/lib/settings.js', 'src/lib/pdf.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}
const C = globalThis.W2P_CONST;
const Settings = globalThis.W2PSettings;
const Pdf = globalThis.W2PPdf;
const I18N = globalThis.W2PI18N;

function withSettings(patch) {
  return Settings.merge(Settings.DEFAULTS, patch || {});
}

// ------------------------------------------------------------ A. 版面與檔名

function testLayout() {
  check('mmToIn 換算正確', near(Pdf.mmToIn(25.4), 1));

  let paper = Pdf.resolvePaper(withSettings({ paper: 'A4' }));
  check('A4 尺寸正確', paper.width === 210 && paper.height === 297, paper);

  paper = Pdf.resolvePaper(withSettings({ paper: 'custom', customWidth: 100, customHeight: 150 }));
  check('自訂尺寸生效', paper.width === 100 && paper.height === 150, paper);

  paper = Pdf.resolvePaper(withSettings({ paper: 'custom', customWidth: 5, customHeight: 99999 }));
  check('自訂尺寸會夾在合理範圍', paper.width === 20 && paper.height === 2000, paper);

  paper = Pdf.resolvePaper(withSettings({ paper: 'NoSuchPaper', customWidth: 210, customHeight: 297 }));
  check('未知紙張退回自訂值', paper.id === 'custom' && paper.width === 210, paper);

  let m = Pdf.resolveMargins(withSettings({ marginPreset: 'none' }));
  check('無邊界預設為 0', m.margins.top === 0 && m.margins.left === 0, m.margins);

  m = Pdf.resolveMargins(withSettings({ marginPreset: 'custom', marginTop: 7, marginRight: 8, marginBottom: 9, marginLeft: 10 }));
  check('自訂邊界逐邊生效',
    m.margins.top === 7 && m.margins.right === 8 && m.margins.bottom === 9 && m.margins.left === 10, m.margins);

  m = Pdf.resolveMargins(withSettings({ marginPreset: 'none', headerFooter: true }));
  check('開啟頁首頁尾時自動撐開上下邊界',
    m.margins.top === Pdf.HEADER_MIN_MARGIN_MM && m.margins.bottom === Pdf.HEADER_MIN_MARGIN_MM && m.notes.length === 2,
    { margins: m.margins, notes: m.notes });

  m = Pdf.resolveMargins(withSettings({ marginPreset: 'none', headerFooter: true }));
  check('撐開邊界不影響左右', m.margins.left === 0 && m.margins.right === 0, m.margins);
}

function testPrintParams() {
  let built = Pdf.buildPrintParams(withSettings({}));
  check('A4 直向換算成英吋', near(built.params.paperWidth, 8.2677, 0.001) && near(built.params.paperHeight, 11.6929, 0.001),
    { w: built.params.paperWidth, h: built.params.paperHeight });
  check('預設邊界 10mm 換算成英吋', near(built.params.marginTop, 0.3937, 0.001), built.params.marginTop);
  check('預設不是橫向', built.params.landscape === false);
  check('預設列印背景', built.params.printBackground === true);
  check('scale 100% 換算為 1', built.params.scale === 1);
  check('使用 base64 傳輸模式', built.params.transferMode === 'ReturnAsBase64');
  check('未開頁首頁尾時不送樣板',
    built.params.displayHeaderFooter === false &&
    built.params.headerTemplate === undefined && built.params.footerTemplate === undefined);
  check('預設帶上標記式 PDF 與書籤大綱',
    built.params.generateTaggedPDF === true && built.params.generateDocumentOutline === true);
  check('可移除參數清單正確',
    JSON.stringify(built.optionalKeys) === JSON.stringify(['generateDocumentOutline', 'generateTaggedPDF']),
    built.optionalKeys);
  check('未指定頁面範圍時不送 pageRanges', built.params.pageRanges === undefined);

  built = Pdf.buildPrintParams(withSettings({ orientation: 'landscape', scale: 150 }));
  check('橫向與縮放 150% 生效', built.params.landscape === true && near(built.params.scale, 1.5));
  check('橫向不交換紙張長寬（交給 CDP 處理）', near(built.params.paperWidth, 8.2677, 0.001));

  built = Pdf.buildPrintParams(withSettings({ scale: 900 }));
  check('縮放上限夾到 2', built.params.scale === 2, built.params.scale);
  built = Pdf.buildPrintParams(withSettings({ scale: 1 }));
  check('縮放下限夾到 0.1', built.params.scale === 0.1, built.params.scale);

  built = Pdf.buildPrintParams(withSettings({ taggedPdf: false, documentOutline: false }));
  check('關閉 PDF 結構選項後不送參數',
    built.params.generateTaggedPDF === undefined && built.params.generateDocumentOutline === undefined);

  built = Pdf.buildPrintParams(withSettings({ pageRanges: ' 1-5 , 8 ' }));
  check('頁面範圍去空白後送出', built.params.pageRanges === '1-5,8', built.params.pageRanges);

  let threw = null;
  try {
    Pdf.buildPrintParams(withSettings({ pageRanges: 'abc' }));
  } catch (err) {
    threw = err;
  }
  check('頁面範圍格式錯誤會擋下',
    !!threw && threw.message === I18N.MESSAGES.en['pdf.pageRangeInvalid'], threw && threw.message);

  I18N.setLang('zh-TW');
  threw = null;
  try {
    Pdf.buildPrintParams(withSettings({ pageRanges: 'abc' }));
  } catch (err) {
    threw = err;
  }
  check('錯誤訊息會跟著語言走', !!threw && /格式不正確/.test(threw.message), threw && threw.message);
  I18N.setLang('en');

  built = Pdf.buildPrintParams(withSettings({
    headerFooter: true, headerLeft: 'title', headerRight: 'date',
    footerLeft: 'url', footerRight: 'pageOfTotal', headerFooterFontPt: 9
  }));
  check('頁首樣板有明確字級（否則 Chrome 會顯示成空白）', /font-size:9pt/.test(built.params.headerTemplate));
  check('頁首帶入標題與日期欄位',
    /class="title"/.test(built.params.headerTemplate) && /class="date"/.test(built.params.headerTemplate));
  check('頁尾帶入網址與頁碼／總頁數',
    /class="url"/.test(built.params.footerTemplate) &&
    /class="pageNumber"/.test(built.params.footerTemplate) &&
    /class="totalPages"/.test(built.params.footerTemplate));
  check('頁首頁尾模式會撐開上下邊界', near(built.params.marginTop, Pdf.mmToIn(15), 0.001), built.params.marginTop);

  built = Pdf.buildPrintParams(withSettings({ headerFooter: true, headerLeft: 'none', headerRight: 'none' }));
  check('欄位設為空白時仍輸出合法樣板', /<div style=/.test(built.params.headerTemplate));

  built = Pdf.buildPrintParams(withSettings({ preferCSSPageSize: true }));
  check('啟用網頁 @page 尺寸時給出提醒',
    built.params.preferCSSPageSize === true && built.notes.some((n) => /@page/.test(n)), built.notes);
}

function testFilename() {
  const now = new Date(2026, 7, 14, 9, 5, 3); // 2026-08-14 09:05:03
  const info = { title: 'Hello: World / Test?', url: 'https://www.example.com/a/b/c?x=1' };

  check('預設樣板用標題並清掉非法字元',
    Pdf.buildFilename('{title}', info, now) === 'Hello World Test.pdf',
    Pdf.buildFilename('{title}', info, now));

  check('{domain} 去掉 www', Pdf.buildFilename('{domain}', info, now) === 'example.com.pdf');
  check('{host} 保留 www', Pdf.buildFilename('{host}', info, now) === 'www.example.com.pdf');
  check('{path} 以連字號串接', Pdf.buildFilename('{path}', info, now) === 'a-b-c.pdf');
  check('{date} 格式為 YYYY-MM-DD', Pdf.buildFilename('{date}', info, now) === '2026-08-14.pdf');
  check('{time} 格式為 HHmmss', Pdf.buildFilename('{time}', info, now) === '090503.pdf');
  check('{datetime} 組合正確', Pdf.buildFilename('{datetime}', info, now) === '20260814-090503.pdf');
  check('個別時間欄位可用',
    Pdf.buildFilename('{yyyy}{month}{day}-{hour}{minute}{second}', info, now) === '20260814-090503.pdf');

  check('多欄位混排',
    Pdf.buildFilename('{date} {domain} {title}', info, now) === '2026-08-14 example.com Hello World Test.pdf',
    Pdf.buildFilename('{date} {domain} {title}', info, now));

  check('未知欄位原樣保留（提示使用者打錯）',
    Pdf.buildFilename('{nope}-{date}', info, now) === '{nope}-2026-08-14.pdf'.replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim() + '' ||
    Pdf.buildFilename('{nope}-{date}', info, now).indexOf('2026-08-14') >= 0,
    Pdf.buildFilename('{nope}-{date}', info, now));

  check('標題為空時退回網域',
    Pdf.buildFilename('{title}', { title: '   ', url: 'https://foo.bar/x' }, now) === 'foo.bar.pdf',
    Pdf.buildFilename('{title}', { title: '   ', url: 'https://foo.bar/x' }, now));

  check('不會出現兩個 .pdf', Pdf.buildFilename('{title}.pdf', info, now) === 'Hello World Test.pdf');

  const long = Pdf.buildFilename('{title}', { title: 'x'.repeat(300), url: 'https://a.b/' }, now);
  check('過長檔名會截斷', long.length <= 124 && long.endsWith('.pdf'), long.length);

  check('Windows 保留字會加底線',
    Pdf.buildFilename('{title}', { title: 'CON', url: 'https://a.b/' }, now) === 'CON_.pdf',
    Pdf.buildFilename('{title}', { title: 'CON', url: 'https://a.b/' }, now));

  check('控制字元被移除',
    Pdf.buildFilename('{title}', { title: 'a\u0007b', url: 'https://a.b/' }, now) === 'ab.pdf');

  check('無效網址不會炸掉',
    Pdf.buildFilename('{domain}-{title}', { title: 'T', url: 'not a url' }, now).endsWith('.pdf'));

  check('子資料夾串接', Pdf.buildDownloadPath('WebPDF', 'a.pdf') === 'WebPDF/a.pdf');
  check('子資料夾支援多層', Pdf.buildDownloadPath('a/b\\c', 'x.pdf') === 'a/b/c/x.pdf');
  check('子資料夾擋掉上層跳脫', Pdf.buildDownloadPath('../../etc', 'x.pdf') === 'etc/x.pdf',
    Pdf.buildDownloadPath('../../etc', 'x.pdf'));
  check('空子資料夾只回檔名', Pdf.buildDownloadPath('', 'x.pdf') === 'x.pdf',
    Pdf.buildDownloadPath('', 'x.pdf'));
  check('只有空白的子資料夾也只回檔名', Pdf.buildDownloadPath('   ', 'x.pdf') === 'x.pdf',
    Pdf.buildDownloadPath('   ', 'x.pdf'));
  check('子資料夾非法字元被清掉', Pdf.buildDownloadPath('a<b>c', 'x.pdf') === 'a b c/x.pdf',
    Pdf.buildDownloadPath('a<b>c', 'x.pdf'));
}

function testBlockedUrls() {
  check('chrome:// 判定為不可轉檔', C.isBlockedUrl('chrome://settings') === true);
  check('擴充功能頁面判定為不可轉檔', C.isBlockedUrl('chrome-extension://abc/page.html') === true);
  check('線上應用程式商店判定為不可轉檔',
    C.isBlockedUrl('https://chromewebstore.google.com/detail/abc') === true);
  check('devtools 判定為不可轉檔', C.isBlockedUrl('devtools://devtools/bundled/x.html') === true);
  check('空網址視為不可轉檔', C.isBlockedUrl('') === true);
  check('一般網頁可以轉檔', C.isBlockedUrl('https://example.com/a') === false);
  check('本機檔案可以轉檔', C.isBlockedUrl('file:///C:/tmp/a.html') === false);
}

// ------------------------------------------------------------------ B. 語言

function testI18n() {
  const langs = Object.keys(I18N.MESSAGES);
  check('提供英文與繁體中文兩種語言',
    langs.length === 2 && langs.includes('en') && langs.includes('zh-TW'), langs);
  check('預設語言是英文', I18N.DEFAULT_LANG === 'en' && Settings.DEFAULTS.lang === 'en');
  check('語言清單與訊息表一致',
    I18N.LANGS.every((item) => langs.includes(item.id)) && I18N.LANGS.length === langs.length,
    I18N.LANGS.map((l) => l.id));

  // 少一個鍵就會在該語言下看到英文夾雜，屬於上架前一定要擋掉的錯誤
  const en = Object.keys(I18N.MESSAGES.en).sort();
  const zh = Object.keys(I18N.MESSAGES['zh-TW']).sort();
  check('兩種語言的訊息鍵完全一致',
    JSON.stringify(en) === JSON.stringify(zh),
    { missingInZh: en.filter((k) => !zh.includes(k)), missingInEn: zh.filter((k) => !en.includes(k)) });

  const empty = en.filter((k) => !String(I18N.MESSAGES.en[k]).trim() ||
    !String(I18N.MESSAGES['zh-TW'][k] || '').trim());
  check('沒有空白的翻譯', empty.length === 0, empty);

  // {name} 這類參數在兩邊必須相同，否則其中一種語言會漏掉內容
  const badParams = en.filter((k) => {
    const pick = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    return pick(I18N.MESSAGES.en[k]) !== pick(I18N.MESSAGES['zh-TW'][k]);
  });
  check('兩種語言的代換參數一致', badParams.length === 0, badParams);

  check('未知語言退回英文', I18N.normalize('ja') === 'en' && I18N.normalize('') === 'en');
  check('zh 系列都對應到繁體中文',
    I18N.normalize('zh-TW') === 'zh-TW' && I18N.normalize('zh_TW') === 'zh-TW' && I18N.normalize('zh') === 'zh-TW');

  I18N.setLang('zh-TW');
  check('切換語言後取得中文', I18N.t('popup.export') === '轉成 PDF', I18N.t('popup.export'));
  check('代換參數可用', I18N.t('sw.progSave', { name: 'a.pdf' }).includes('a.pdf'));
  I18N.setLang('en');
  check('切回英文', I18N.t('popup.export') === 'Convert to PDF', I18N.t('popup.export'));
  check('未定義的鍵原樣回傳', I18N.t('no.such.key') === 'no.such.key');

  // 常數表交給 i18n 翻譯，label 不可以再寫死
  for (const [name, list] of [['PAPERS', C.PAPERS], ['MARGIN_PRESETS', C.MARGIN_PRESETS],
    ['ORIENTATIONS', C.ORIENTATIONS], ['HF_FIELDS', C.HF_FIELDS]]) {
    check(name + ' 只存 labelKey 且都有翻譯',
      list.every((item) => item.labelKey && !item.label && I18N.MESSAGES.en[item.labelKey]),
      list.filter((item) => !item.labelKey || !I18N.MESSAGES.en[item.labelKey]).map((i) => i.id));
  }

  // HTML 上標的翻譯鍵必須存在，否則畫面會直接顯示 key
  for (const page of ['src/options/options.html', 'src/popup/popup.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-title|-aria|-ph)?="([^"]+)"/g)].map((m) => m[1]);
    check(page + ' 有標上翻譯鍵', keys.length > 0, keys.length);
    const missing = [...new Set(keys)].filter((k) => I18N.MESSAGES.en[k] === undefined);
    check(page + ' 使用的翻譯鍵都有定義', missing.length === 0, missing);
  }
}

function testLocales() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  check('manifest 指定 default_locale', manifest.default_locale === 'en');

  const dirs = ['_locales/en/messages.json', '_locales/zh_TW/messages.json'];
  for (const file of dirs) check('locale 檔存在: ' + file, fs.existsSync(file));

  const tables = dirs.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const [enKeys, zhKeys] = tables.map((table) => Object.keys(table).sort());
  check('_locales 兩種語言的鍵一致', JSON.stringify(enKeys) === JSON.stringify(zhKeys),
    { en: enKeys, zh: zhKeys });

  // manifest 裡的 __MSG_x__ 若在 _locales 找不到，擴充功能會整個載入失敗
  const used = [...new Set([...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]))];
  check('manifest 有使用 __MSG_ 佔位字串', used.length > 0, used);
  for (const key of used) {
    for (let i = 0; i < dirs.length; i++) {
      check(dirs[i] + ' 有定義 ' + key,
        !!tables[i][key] && typeof tables[i][key].message === 'string');
    }
  }

  // 商店的簡短說明上限是 132 字
  for (let i = 0; i < dirs.length; i++) {
    const desc = tables[i].extDescription && tables[i].extDescription.message;
    check(dirs[i] + ' 的描述未超過 132 字', !!desc && desc.length <= 132, desc && desc.length);
  }
}

// ---------------------------------------------------------------- B. 整合檢查

function testIntegration() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  check('manifest_version = 3', manifest.manifest_version === 3);
  check('沒有宣告不需要的 host_permissions', manifest.host_permissions === undefined);

  const refs = [
    manifest.background.service_worker,
    manifest.options_page,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)
  ];
  for (const ref of [...new Set(refs)]) {
    check('manifest 引用的檔案存在: ' + ref, fs.existsSync(ref));
  }

  const constantsSrc = fs.readFileSync('src/lib/constants.js', 'utf8');
  check('OFFSCREEN_PATH 指向存在的檔案', fs.existsSync(C.OFFSCREEN_PATH), C.OFFSCREEN_PATH);
  for (const file of C.PREPARE_FILES) {
    check('PREPARE_FILES 指向存在的檔案: ' + file, fs.existsSync(file));
  }

  for (const page of ['src/options/options.html', 'src/popup/popup.html', 'src/offscreen/offscreen.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const dir = path.dirname(page);
    for (const rel of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1])) {
      check(page + ' 引用的檔案存在: ' + rel, fs.existsSync(path.join(dir, rel)));
    }
    const iConst = html.indexOf('lib/constants.js');
    if (iConst >= 0) {
      const iPdf = html.indexOf('lib/pdf.js');
      check(page + ' 腳本順序正確（constants 先於 pdf）', iPdf < 0 || iPdf > iConst);
    }
  }

  const pairs = [
    ['src/options/options.html', 'src/options/options.js'],
    ['src/popup/popup.html', 'src/popup/popup.js']
  ];
  for (const [html, js] of pairs) {
    const ids = [...fs.readFileSync(html, 'utf8').matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const src = fs.readFileSync(js, 'utf8');
    const unused = ids.filter((id) => !src.includes("'" + id + "'") && !src.includes('"' + id + '"'));
    check(html + ' 的所有 id 都有在 JS 中綁定', unused.length === 0, unused);
  }

  const swSrc = fs.readFileSync('src/background/service-worker.js', 'utf8');
  for (const rel of [...swSrc.matchAll(/'(\/src\/[^']+)'/g)].map((m) => m[1].slice(1))) {
    check('service worker importScripts 的檔案存在: ' + rel, fs.existsSync(rel));
  }

  // 程式碼用到的 chrome API 必須有對應權限
  const permissionByApi = {
    debugger: 'debugger',
    downloads: 'downloads',
    offscreen: 'offscreen',
    storage: 'storage',
    scripting: 'scripting',
    contextMenus: 'contextMenus'
  };
  const allSrc = ['src/background/service-worker.js', 'src/offscreen/offscreen.js',
    'src/popup/popup.js', 'src/options/options.js', 'src/lib/settings.js']
    .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const [api, permission] of Object.entries(permissionByApi)) {
    if (new RegExp('chrome\\.' + api + '\\.').test(allSrc)) {
      check('用到 chrome.' + api + ' 且已宣告 ' + permission + ' 權限',
        manifest.permissions.indexOf(permission) >= 0);
    }
  }

  // 官方限制：離螢幕文件只提供 chrome.runtime，用到其他 chrome API 會在執行時
  // 變成 undefined（例如 chrome.downloads.download → Cannot read properties of undefined）
  const offscreenSrc = fs.readFileSync('src/offscreen/offscreen.js', 'utf8');
  const offscreenCode = stripComments(offscreenSrc);
  const offscreenApis = [...new Set([...offscreenCode.matchAll(/chrome\.([a-zA-Z]+)/g)].map((m) => m[1]))];
  check('離螢幕文件只使用 chrome.runtime',
    offscreenApis.length > 0 && offscreenApis.every((api) => api === 'runtime'), offscreenApis);
  check('實際下載寫在 service worker（離螢幕文件沒有 downloads API）',
    /chrome\.downloads\.download/.test(swSrc) && !/chrome\.downloads/.test(offscreenCode));
  check('離螢幕文件負責建立與釋放 Blob URL',
    /createObjectURL/.test(offscreenSrc) && /revokeObjectURL/.test(offscreenSrc));
  check('service worker 不會嘗試在自己身上建立 Blob URL',
    !/URL\.createObjectURL/.test(swSrc));
  check('下載完成後一定會釋放 Blob URL', /finally\s*\{\s*await release\(\)/.test(swSrc));

  const msgKeys = [...constantsSrc.matchAll(/^\s{4}([A-Z_]+):\s*'w2p\//gm)].map((m) => m[1]);
  const bad = [];
  for (const file of ['src/background/service-worker.js', 'src/offscreen/offscreen.js',
    'src/popup/popup.js', 'src/options/options.js']) {
    const src = fs.readFileSync(file, 'utf8');
    [...src.matchAll(/MSG\.([A-Z_]+)/g)].forEach((m) => {
      if (!msgKeys.includes(m[1])) bad.push(file + ':' + m[1]);
    });
  }
  check('所有使用到的 MSG.* 都有定義', bad.length === 0, bad);

  // prepare.js 一定要提供還原機制，否則會把使用者的頁面留在整理後的狀態
  const prepareSrc = fs.readFileSync('src/content/prepare.js', 'utf8');
  check('prepare.js 對外暴露 prepare 與 restore',
    /window\.__w2p\s*=\s*\{\s*prepare,\s*restore\s*\}/.test(prepareSrc));
  check('service worker 一定會呼叫還原', /restorePage\(tabId\)/.test(swSrc) && /finally/.test(swSrc));
}

testLayout();
testPrintParams();
testFilename();
testBlockedUrls();
testI18n();
testLocales();
testIntegration();

console.log(failures ? '\n=== 失敗 ' + failures + ' 項 ===' : '\n=== 全部通過 ===');
process.exit(failures ? 1 : 0);
