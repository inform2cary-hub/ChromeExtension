/**
 * 自我測試（不需要瀏覽器）：
 *   node tools/selftest.js
 *
 * A. src/lib/markdown.js 是純函式，直接驗證轉義、程式碼區塊、表格、front matter、檔名
 * B. src/content/html2md.js 只用最小的 DOM 介面，這裡用一個極簡 HTML 解析器造假 DOM 來驗證轉換結果
 * C. 介面語言：src/lib/i18n.js 的訊息表與 _locales 的鍵是否兩種語言一致
 * D. 整合檢查：manifest 與 HTML 引用、元素 id 綁定、訊息型別、權限宣告、圖示、模組邊界
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

/** 靜態檢查程式碼用到哪些 API 時，要先去掉註解，否則註解裡提到的 API 會被誤判 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

globalThis.self = globalThis;
for (const file of ['src/lib/constants.js', 'src/lib/i18n.js', 'src/lib/settings.js',
  'src/lib/markdown.js', 'src/content/html2md.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}
const C = globalThis.W2M_CONST;
const Settings = globalThis.W2MSettings;
const M = globalThis.W2MMarkdown;
const Html2Md = globalThis.W2MHtml2Md;
const I18N = globalThis.W2MI18N;

function withSettings(patch) {
  return Settings.merge(Settings.DEFAULTS, patch || {});
}

// ------------------------------------------------------- 極簡 HTML 解析器
// 只為測試存在：足以造出 html2md 需要的節點介面
// （nodeType / tagName / childNodes / nodeValue / getAttribute），
// 不處理 script 內含 `<` 這類需要真正 tokenizer 的情況。

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: '\u00a0',
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013'
};

function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body.charAt(0) === '#') {
      const code = body.charAt(1).toLowerCase() === 'x'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const key = body.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : match;
  });
}

function makeElement(tagName, attrs) {
  return {
    nodeType: 1,
    tagName: String(tagName).toUpperCase(),
    attrs: attrs || {},
    childNodes: [],
    getAttribute(name) {
      const key = String(name).toLowerCase();
      return Object.prototype.hasOwnProperty.call(this.attrs, key) ? this.attrs[key] : null;
    }
  };
}

function makeText(value) {
  return { nodeType: 3, nodeValue: value };
}

function parseAttrs(source) {
  const attrs = {};
  const re = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`]+)))?/g;
  let hit;
  while ((hit = re.exec(source || ''))) {
    const name = hit[1].toLowerCase();
    let value = '';
    if (hit[2] !== undefined) value = hit[2];
    else if (hit[3] !== undefined) value = hit[3];
    else if (hit[4] !== undefined) value = hit[4];
    attrs[name] = decodeEntities(value);
  }
  return attrs;
}

function parseHtml(html) {
  const root = makeElement('div');
  const stack = [root];
  const push = (node) => stack[stack.length - 1].childNodes.push(node);
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let last = 0;
  let hit;

  while ((hit = re.exec(html))) {
    if (hit.index > last) push(makeText(decodeEntities(html.slice(last, hit.index))));
    last = re.lastIndex;
    if (hit[0].indexOf('<!--') === 0) continue;
    if (hit[1]) {
      const name = hit[1].toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const node = makeElement(hit[2], parseAttrs(hit[3]));
    push(node);
    if (!hit[4] && !VOID_TAGS.has(hit[2].toLowerCase())) stack.push(node);
  }
  if (last < html.length) push(makeText(decodeEntities(html.slice(last))));
  return root;
}

const BASE = 'https://example.com/a/b';

function convert(html, options) {
  return Html2Md.convert(parseHtml(html), Object.assign({ baseUrl: BASE }, options || {}));
}

function md(html, options) {
  return convert(html, options).markdown;
}

// -------------------------------------------------------- A. 純函式測試

function testEscaping() {
  check('星號與方括號會轉義', M.escapeInline('2 * 3 [x]') === '2 \\* 3 \\[x\\]', M.escapeInline('2 * 3 [x]'));
  check('反斜線與反引號會轉義', M.escapeInline('a\\b `c`') === 'a\\\\b \\`c\\`', M.escapeInline('a\\b `c`'));
  check('詞邊界的底線會轉義', M.escapeInline('_yes_') === '\\_yes\\_', M.escapeInline('_yes_'));
  check('詞中間的底線不轉義（snake_case 保持可讀）',
    M.escapeInline('snake_case_name') === 'snake_case_name', M.escapeInline('snake_case_name'));
  check('看起來像標籤的 < 會轉成實體',
    M.escapeInline('a <b> c') === 'a &lt;b> c', M.escapeInline('a <b> c'));
  check('數學比較的 < 不動', M.escapeInline('1 < 2') === '1 < 2', M.escapeInline('1 < 2'));
  check('看起來像實體的 & 會轉義',
    M.escapeInline('a &amp; b') === 'a &amp;amp; b', M.escapeInline('a &amp; b'));
  check('單純的 & 不動', M.escapeInline('R&D 部門') === 'R&D 部門', M.escapeInline('R&D 部門'));

  check('行首井字號會轉義', M.escapeLineStart('# 不是標題') === '\\# 不是標題');
  check('行首減號會轉義', M.escapeLineStart('- 不是清單') === '\\- 不是清單');
  check('行首數字加點會轉義', M.escapeLineStart('1. 不是清單') === '1\\. 不是清單');
  check('行首引言符號會轉義', M.escapeLineStart('> 不是引言') === '\\> 不是引言');
  check('句中的減號不動', M.escapeLineStart('a - b') === 'a - b');

  check('儲存格的直線會轉義', M.escapeCell('a|b') === 'a\\|b');
  check('儲存格的換行改成 <br>', M.escapeCell('a\nb') === 'a<br>b', M.escapeCell('a\nb'));
}

function testCodeAndUrls() {
  check('行內程式碼包起來', M.inlineCode('x') === '`x`');
  check('內容有反引號時加長圍籬', M.inlineCode('a ` b') === '``a ` b``', M.inlineCode('a ` b'));
  check('內容本身以反引號開頭時左右補空白',
    M.inlineCode('`x') === '`` `x ``', M.inlineCode('`x'));
  check('空內容不產生行內程式碼', M.inlineCode('   ') === '');

  check('程式碼區塊帶語言', M.codeBlock('a=1', '```', 'js') === '```js\na=1\n```', M.codeBlock('a=1', '```', 'js'));
  check('程式碼含三個反引號時圍籬加長',
    M.codeBlock('```\nx\n```', '```', '') === '````\n```\nx\n```\n````',
    M.codeBlock('```\nx\n```', '```', ''));
  check('可以改用波浪號圍籬', M.codeBlock('a', '~~~', 'sh') === '~~~sh\na\n~~~');

  check('乾淨網址不加角括號', M.encodeUrl('https://a.b/c') === 'https://a.b/c');
  check('含空白的網址用角括號包住並編碼',
    M.encodeUrl('https://a.b/c d') === '<https://a.b/c%20d>', M.encodeUrl('https://a.b/c d'));
  check('含括號的網址用角括號包住',
    M.encodeUrl('https://a.b/c(1)') === '<https://a.b/c(1)>');

  check('相對網址補成絕對網址',
    M.resolveUrl('https://a.b/x/y', '../z') === 'https://a.b/z', M.resolveUrl('https://a.b/x/y', '../z'));
  check('絕對網址不動', M.resolveUrl('https://a.b/', 'https://c.d/e') === 'https://c.d/e');
  check('片段連結保持原樣', M.resolveUrl('https://a.b/', '#top') === '#top');
  check('mailto 不被改寫', M.resolveUrl('https://a.b/', 'mailto:x@y.z') === 'mailto:x@y.z');
  check('協定相對網址補上協定',
    M.resolveUrl('https://a.b/', '//c.d/e') === 'https://c.d/e', M.resolveUrl('https://a.b/', '//c.d/e'));

  check('srcset 取最大寬度',
    M.pickFromSrcset('s.jpg 320w, m.jpg 800w, l.jpg 1600w') === 'l.jpg');
  check('srcset 只有 x 描述子時取最大',
    M.pickFromSrcset('a.png 1x, b.png 3x, c.png 2x') === 'b.png');
  check('srcset 沒有描述子時取最後一個',
    M.pickFromSrcset('a.png, b.png') === 'b.png');
  check('srcset 是 data URL 時原樣回傳',
    M.pickFromSrcset('data:image/png;base64,AAA,BBB') === 'data:image/png;base64,AAA,BBB');
}

function testTidyAndTable() {
  check('連續空行壓成一行', M.tidy('a\n\n\n\nb') === 'a\n\nb', M.tidy('a\n\n\n\nb'));
  check('去掉頭尾空行', M.tidy('\n\na\n\n') === 'a');
  check('程式碼區塊內的空行不動',
    M.tidy('```\na\n\n\nb\n```') === '```\na\n\n\nb\n```', M.tidy('```\na\n\n\nb\n```'));

  const table = M.buildTable([['a', 'b'], ['1', '2']], ['left', 'right']);
  check('表格含對齊資訊',
    table === '| a | b |\n| :--- | ---: |\n| 1 | 2 |', table);
  check('欄數不齊時補空白儲存格',
    M.buildTable([['a', 'b'], ['1']], []) === '| a | b |\n| --- | --- |\n| 1 |  |',
    M.buildTable([['a', 'b'], ['1']], []));

  check('中文與英文都算得出字數', M.countWords('hello world 你好') === 4, M.countWords('hello world 你好'));
  check('標題相同時判定為同一個', M.looksSameTitle('Hello World!', 'hello world') === true);
  check('標題不同時不誤判', M.looksSameTitle('Hello', 'Something else') === false);
  check('標題去掉站名後綴',
    M.stripSiteSuffix('好文章 - Example 部落格', 'Example 部落格') === '好文章',
    M.stripSiteSuffix('好文章 - Example 部落格', 'Example 部落格'));
  check('站名不在尾端時不動標題',
    M.stripSiteSuffix('Example 部落格的介紹', 'Example 部落格') === 'Example 部落格的介紹');
}

function testFrontMatter() {
  const now = new Date(2026, 7, 14, 9, 5, 3);
  const meta = {
    title: '標題: 有冒號',
    url: 'https://a.b/c',
    author: '林小明',
    published: '2026-08-01T10:00:00+08:00',
    description: '摘要',
    siteName: 'A 站',
    lang: 'zh-TW',
    tags: ['x', 'y']
  };

  check('關閉時不產生 front matter',
    M.buildFrontMatter(meta, withSettings({ frontMatter: 'none' }), now) === '');

  const yaml = M.buildFrontMatter(meta, withSettings({ fmTags: true, fmDescription: true, fmLang: true }), now);
  check('front matter 以 --- 包住', /^---\n[\s\S]*\n---\n$/.test(yaml), yaml);
  check('含冒號的值會加引號', yaml.indexOf('title: "標題: 有冒號"') >= 0, yaml);
  check('網址不會被加引號', yaml.indexOf('source: https://a.b/c') >= 0, yaml);
  check('標籤輸出成 YAML 清單', /tags:\n  - x\n  - y/.test(yaml), yaml);
  check('擷取時間帶時區', /captured: 2026-08-14T09:05:03[+-]\d\d:\d\d/.test(yaml), yaml);

  const partial = M.buildFrontMatter(meta, withSettings({
    fmAuthor: false, fmPublished: false, fmSiteName: false, fmCaptured: false
  }), now);
  check('關掉的欄位不會出現',
    partial.indexOf('author') < 0 && partial.indexOf('captured') < 0, partial);

  const extra = M.buildFrontMatter({ title: 'T' }, withSettings({
    fmSource: false, fmAuthor: false, fmPublished: false, fmSiteName: false, fmCaptured: false,
    frontMatterExtra: 'type: clipping\nstatus: inbox'
  }), now);
  check('自訂欄位原樣附加',
    extra === '---\ntitle: T\ntype: clipping\nstatus: inbox\n---\n', extra);

  check('沒有任何欄位時不輸出空的 front matter',
    M.buildFrontMatter({}, withSettings({ fmCaptured: false, fmTitle: true, fmSource: false }), now) === '');

  check('YAML 保留字會加引號', M.yamlScalar('yes') === '"yes"');
  check('純數字會加引號', M.yamlScalar('2026') === '"2026"');
  check('一般文字不加引號', M.yamlScalar('一般標題') === '一般標題');
}

function testFilename() {
  const now = new Date(2026, 7, 14, 9, 5, 3);
  const info = { title: 'Hello: World / Test?', url: 'https://www.example.com/a/b/c?x=1' };

  check('預設樣板用標題並清掉非法字元',
    M.buildFilename('{title}', info, now) === 'Hello World Test.md', M.buildFilename('{title}', info, now));
  check('副檔名是 .md', M.buildFilename('{domain}', info, now) === 'example.com.md');
  check('{host} 保留 www', M.buildFilename('{host}', info, now) === 'www.example.com.md');
  check('{path} 以連字號串接', M.buildFilename('{path}', info, now) === 'a-b-c.md');
  check('{date} 格式為 YYYY-MM-DD', M.buildFilename('{date}', info, now) === '2026-08-14.md');
  check('{datetime} 組合正確', M.buildFilename('{datetime}', info, now) === '20260814-090503.md');
  check('多欄位混排',
    M.buildFilename('{date} {domain} {title}', info, now) === '2026-08-14 example.com Hello World Test.md',
    M.buildFilename('{date} {domain} {title}', info, now));
  check('標題為空時退回網域',
    M.buildFilename('{title}', { title: '   ', url: 'https://foo.bar/x' }, now) === 'foo.bar.md');
  check('不會出現兩個 .md', M.buildFilename('{title}.md', info, now) === 'Hello World Test.md');
  check('Windows 保留字會加底線',
    M.buildFilename('{title}', { title: 'CON', url: 'https://a.b/' }, now) === 'CON_.md');
  check('控制字元被移除',
    M.buildFilename('{title}', { title: 'a\u0007b', url: 'https://a.b/' }, now) === 'ab.md');
  const long = M.buildFilename('{title}', { title: 'x'.repeat(300), url: 'https://a.b/' }, now);
  check('過長檔名會截斷', long.length <= 124 && long.endsWith('.md'), long.length);
  check('無效網址不會炸掉',
    M.buildFilename('{domain}-{title}', { title: 'T', url: 'not a url' }, now).endsWith('.md'));

  check('子資料夾串接', M.buildDownloadPath('Clippings', 'a.md') === 'Clippings/a.md');
  check('子資料夾支援多層', M.buildDownloadPath('a/b\\c', 'x.md') === 'a/b/c/x.md');
  check('子資料夾擋掉上層跳脫', M.buildDownloadPath('../../etc', 'x.md') === 'etc/x.md');
  check('空子資料夾只回檔名', M.buildDownloadPath('   ', 'x.md') === 'x.md');
}

function testBlockedUrls() {
  check('chrome:// 判定為不可擷取', C.isBlockedUrl('chrome://settings') === true);
  check('擴充功能頁面判定為不可擷取', C.isBlockedUrl('chrome-extension://abc/page.html') === true);
  check('線上應用程式商店判定為不可擷取',
    C.isBlockedUrl('https://chromewebstore.google.com/detail/abc') === true);
  check('空網址視為不可擷取', C.isBlockedUrl('') === true);
  check('一般網頁可以擷取', C.isBlockedUrl('https://example.com/a') === false);
  check('本機檔案可以擷取', C.isBlockedUrl('file:///C:/tmp/a.html') === false);
}

// ------------------------------------------------------ B. 轉換結果測試

function testBlocks() {
  check('段落與粗體', md('<p>Hello <b>world</b></p>') === 'Hello **world**', md('<p>Hello <b>world</b></p>'));
  check('標題與段落之間空一行',
    md('<h1>Title</h1><p>Body</p>') === '# Title\n\nBody', md('<h1>Title</h1><p>Body</p>'));
  check('六層標題都支援', md('<h6>x</h6>') === '###### x');
  check('可切換成前後都加井字號',
    md('<h2>A</h2>', { headingStyle: 'atxClosed' }) === '## A ##');
  check('只有行內內容的 div 也會變段落',
    md('<div>just text</div>') === 'just text');
  check('巢狀容器不會產生空白區塊',
    md('<div><div><div><p>deep</p></div></div></div>') === 'deep');
  check('分隔線', md('<p>a</p><hr><p>b</p>') === 'a\n\n---\n\nb', md('<p>a</p><hr><p>b</p>'));
  check('分隔線樣式可換', md('<hr>', { hrStyle: '***' }) === '***');
  check('空段落被丟掉', md('<p></p><p>  </p><p>x</p>') === 'x', md('<p></p><p>  </p><p>x</p>'));

  check('引言每行都加前綴',
    md('<blockquote><p>a</p><p>b</p></blockquote>') === '> a\n>\n> b',
    md('<blockquote><p>a</p><p>b</p></blockquote>'));
  check('巢狀引言',
    md('<blockquote><blockquote><p>x</p></blockquote></blockquote>') === '> > x',
    md('<blockquote><blockquote><p>x</p></blockquote></blockquote>'));

  check('figure 的說明變斜體',
    md('<figure><img src="/i.png" alt="C"><figcaption>說明</figcaption></figure>') ===
      '![C](https://example.com/i.png)\n\n_說明_',
    md('<figure><img src="/i.png" alt="C"><figcaption>說明</figcaption></figure>'));
  check('details 的摘要變粗體',
    md('<details><summary>更多</summary><p>內容</p></details>') === '**更多**\n\n內容',
    md('<details><summary>更多</summary><p>內容</p></details>'));
  check('定義清單轉成粗體加冒號',
    md('<dl><dt>詞</dt><dd>解釋</dd></dl>') === '**詞**\n\n: 解釋',
    md('<dl><dt>詞</dt><dd>解釋</dd></dl>'));
}

function testInline() {
  check('斜體與粗體符號可設定',
    md('<p><em>a</em> <strong>b</strong></p>', { emphasisMarker: '*', strongMarker: '__' }) === '*a* __b__');
  check('標記不會貼著空白（Markdown 才生效）',
    md('<p>a <em> b </em> c</p>') === 'a _b_ c', md('<p>a <em> b </em> c</p>'));
  check('全是空白的行內元素不留下空標記',
    md('<p>a<em>  </em>b</p>') === 'a b', md('<p>a<em>  </em>b</p>'));
  check('刪除線',
    md('<p><del>x</del></p>') === '~~x~~');
  check('可關閉刪除線',
    md('<p><del>x</del></p>', { strikethrough: false }) === 'x');
  check('螢光標記預設只留文字',
    md('<p><mark>x</mark></p>') === 'x');
  check('螢光標記可轉成 ==x==',
    md('<p><mark>x</mark></p>', { highlightMarker: true }) === '==x==');
  check('行內程式碼',
    md('<p>用 <code>npm i</code> 安裝</p>') === '用 `npm i` 安裝', md('<p>用 <code>npm i</code> 安裝</p>'));
  check('行內程式碼內容不做 Markdown 轉義',
    md('<p><code>a * b</code></p>') === '`a * b`', md('<p><code>a * b</code></p>'));
  check('上下標保留最小 HTML',
    md('<p>x<sup>2</sup>H<sub>2</sub>O</p>') === 'x<sup>2</sup>H<sub>2</sub>O');
  check('br 轉成行尾兩個空白',
    md('<p>a<br>b</p>') === 'a  \nb', JSON.stringify(md('<p>a<br>b</p>')));
  check('可關閉換行保留',
    md('<p>a<br>b</p>', { keepLineBreaks: false }) === 'a b');
  check('段落結尾的 br 不留下多餘空白',
    md('<p>a<br></p>') === 'a', JSON.stringify(md('<p>a<br></p>')));
  check('引號元素轉成半角引號',
    md('<p><q>hi</q></p>') === '"hi"');
  check('ruby 的注音被略過',
    md('<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby></p>') === '漢字',
    md('<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby></p>'));
}

function testLists() {
  check('無序清單', md('<ul><li>a</li><li>b</li></ul>') === '- a\n- b', md('<ul><li>a</li><li>b</li></ul>'));
  check('清單符號可設定',
    md('<ul><li>a</li></ul>', { bulletMarker: '*' }) === '* a');
  check('巢狀清單縮排兩格',
    md('<ul><li>a<ul><li>b</li></ul></li></ul>') === '- a\n  - b',
    md('<ul><li>a<ul><li>b</li></ul></li></ul>'));
  check('有序清單', md('<ol><li>a</li><li>b</li></ol>') === '1. a\n2. b');
  check('有序清單起始號碼',
    md('<ol start="3"><li>a</li><li>b</li></ol>') === '3. a\n4. b');
  check('反向有序清單',
    md('<ol start="3" reversed><li>a</li><li>b</li></ol>') === '3. a\n2. b');
  check('有序清單的續行縮排對齊號碼寬度',
    md('<ol start="9"><li><p>a</p><p>b</p></li></ol>') === '9. a\n\n   b',
    JSON.stringify(md('<ol start="9"><li><p>a</p><p>b</p></li></ol>')));
  check('待辦清單',
    md('<ul><li><input type="checkbox" checked>做完了</li><li><input type="checkbox">還沒</li></ul>') ===
      '- [x] 做完了\n- [ ] 還沒',
    md('<ul><li><input type="checkbox" checked>做完了</li><li><input type="checkbox">還沒</li></ul>'));
  check('可關閉待辦清單語法',
    md('<ul><li><input type="checkbox" checked>x</li></ul>', { taskLists: false }) === '- x');
  check('空的清單項目被略過',
    md('<ul><li></li><li>b</li></ul>') === '- b', md('<ul><li></li><li>b</li></ul>'));
  check('清單項目內含程式碼區塊時整段縮排',
    md('<ul><li><p>a</p><pre><code>x</code></pre></li></ul>') === '- a\n\n  ```\n  x\n  ```',
    JSON.stringify(md('<ul><li><p>a</p><pre><code>x</code></pre></li></ul>')));
}

function testCodeBlocks() {
  check('程式碼區塊保留原始排版與縮排',
    md('<pre><code>if (a) {\n  b();\n}</code></pre>') === '```\nif (a) {\n  b();\n}\n```',
    JSON.stringify(md('<pre><code>if (a) {\n  b();\n}</code></pre>')));
  check('language- class 帶出語言',
    md('<pre><code class="language-js">a=1</code></pre>') === '```js\na=1\n```');
  check('hljs 風格的 class 也能帶出語言',
    md('<pre class="highlight highlight-source-python"><code>a=1</code></pre>') === '```python\na=1\n```',
    md('<pre class="highlight highlight-source-python"><code>a=1</code></pre>'));
  check('直接用語言當 class 也認得',
    md('<pre><code class="hljs rust">a</code></pre>') === '```rust\na\n```');
  check('plaintext 不當成語言',
    md('<pre><code class="language-plaintext">a</code></pre>') === '```\na\n```');
  check('可關閉語言推測',
    md('<pre><code class="language-js">a</code></pre>', { codeLanguageFromClass: false }) === '```\na\n```');
  check('程式碼裡的 Markdown 符號不會被轉義',
    md('<pre><code>a * b _c_ [d]</code></pre>') === '```\na * b _c_ [d]\n```',
    md('<pre><code>a * b _c_ [d]</code></pre>'));
  check('pre 內有多個元素時取整段文字',
    md('<pre><span>a</span>\n<span>b</span></pre>') === '```\na\nb\n```',
    JSON.stringify(md('<pre><span>a</span>\n<span>b</span></pre>')));
  check('pre 裡的 br 變成換行',
    md('<pre>a<br>b</pre>') === '```\na\nb\n```', JSON.stringify(md('<pre>a<br>b</pre>')));
}

function testLinksAndImages() {
  check('行內連結會補成絕對網址',
    md('<p><a href="/x">text</a></p>') === '[text](https://example.com/x)',
    md('<p><a href="/x">text</a></p>'));
  check('連結標題會帶上',
    md('<p><a href="/x" title="說明">t</a></p>') === '[t](https://example.com/x "說明")');
  check('參考式連結把網址集中在文末',
    md('<p><a href="/x">t</a></p>', { linkStyle: 'referenced' }) === '[t][1]\n\n[1]: https://example.com/x',
    md('<p><a href="/x">t</a></p>', { linkStyle: 'referenced' }));
  check('相同網址共用同一個參考編號',
    md('<p><a href="/x">a</a> <a href="/x">b</a></p>', { linkStyle: 'referenced' }) ===
      '[a][1] [b][1]\n\n[1]: https://example.com/x');
  check('只留網址',
    md('<p><a href="/x">t</a></p>', { linkStyle: 'bare' }) === '<https://example.com/x>');
  check('移除連結只留文字',
    md('<p><a href="/x">t</a></p>', { linkStyle: 'strip' }) === 't');
  check('頁內片段連結預設只留文字',
    md('<p><a href="#s">t</a></p>') === 't');
  check('可以選擇保留片段連結',
    md('<p><a href="#s">t</a></p>', { keepFragmentLinks: true }) === '[t](#s)');
  check('javascript: 連結只留文字',
    md('<p><a href="javascript:void(0)">t</a></p>') === 't');
  check('空連結不留下空語法',
    md('<p><a href="/x"></a>tail</p>') === 'tail', md('<p><a href="/x"></a>tail</p>'));
  check('連結文字的前後空白留在標記外',
    md('<p>see <a href="/x"> here </a>now</p>') === 'see [here](https://example.com/x) now',
    md('<p>see <a href="/x"> here </a>now</p>'));
  check('關閉絕對網址時保留原樣',
    md('<p><a href="/x">t</a></p>', { absoluteUrls: false }) === '[t](/x)');

  check('圖片轉成 Markdown 語法',
    md('<p><img src="/i.png" alt="Cat"></p>') === '![Cat](https://example.com/i.png)');
  check('只留替代文字',
    md('<p><img src="/i.png" alt="Cat"></p>', { imageMode: 'alt' }) === 'Cat');
  check('完全移除圖片',
    md('<p><img src="/i.png" alt="Cat"></p>', { imageMode: 'strip' }) === '');
  check('沒有 src 時退回替代文字',
    md('<p><img alt="Cat"></p>') === 'Cat');
  check('lazy 圖片改用 data-src',
    md('<p><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/real.png" alt="A"></p>') ===
      '![A](https://example.com/real.png)',
    md('<p><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/real.png" alt="A"></p>'));
  check('srcset 取最大的那張',
    md('<p><img srcset="/s.png 320w, /l.png 1600w" alt="A"></p>') === '![A](https://example.com/l.png)');
  check('picture 取內含的 img',
    md('<p><picture><source srcset="/a.webp"><img src="/a.png" alt="A"></picture></p>') ===
      '![A](https://example.com/a.png)');
  check('內嵌 data 圖片預設只留替代文字',
    md('<p><img src="data:image/png;base64,iVBORw0KAAAA" alt="A"></p>') === 'A');
  check('連結包圖片時兩層語法都保留',
    md('<p><a href="/p"><img src="/i.png" alt="C"></a></p>') ===
      '[![C](https://example.com/i.png)](https://example.com/p)',
    md('<p><a href="/p"><img src="/i.png" alt="C"></a></p>'));
  check('巢狀連結不會產生壞掉的語法',
    md('<p><a href="/o">out <a href="/i">in</a></a></p>').indexOf('[in]') < 0,
    md('<p><a href="/o">out <a href="/i">in</a></a></p>'));

  const counted = convert('<p><a href="/x">a</a><img src="/i.png" alt="b"></p>');
  check('統計連結與圖片數量', counted.links === 1 && counted.images === 1, counted);
}

function testTables() {
  const simple = md('<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
    '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
  check('表格含表頭與分隔列',
    simple === '| A | B |\n| --- | --- |\n| 1 | 2 |', simple);

  const aligned = md('<table><tr><th align="left">A</th><th style="text-align:right">B</th></tr>' +
    '<tr><td>1</td><td>2</td></tr></table>');
  check('表格對齊來自 align 屬性與 style',
    aligned === '| A | B |\n| :--- | ---: |\n| 1 | 2 |', aligned);

  const cellBreak = md('<table><tr><th>A</th></tr><tr><td>x<br>y</td></tr></table>');
  check('儲存格換行改成 <br>', cellBreak.indexOf('| x<br>y |') >= 0, cellBreak);

  const spanned = convert('<table><tr><th colspan="2">A</th></tr><tr><td>1</td><td>2</td></tr></table>');
  check('合併儲存格會提出警告',
    spanned.warnings.some((note) => note.key === 'warn.tableSpan'), spanned.warnings);
  check('合併儲存格補上空欄維持欄數',
    spanned.markdown.split('\n')[0] === '| A |  |', spanned.markdown);

  const noHead = convert('<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>');
  check('沒有表頭時第一列當表頭並提醒',
    noHead.warnings.some((note) => note.key === 'warn.tableNoHead') &&
    noHead.markdown === '| 1 | 2 |\n| --- | --- |\n| 3 | 4 |', noHead);

  check('可關閉表格轉換（退回逐格文字）',
    md('<table><tr><td>1</td><td>2</td></tr></table>', { gfmTables: false }).indexOf('|') < 0,
    md('<table><tr><td>1</td><td>2</td></tr></table>', { gfmTables: false }));
}

function testDropAndMath() {
  check('script 與 style 不會出現在輸出',
    md('<p>a</p><script>var x = 1;</script><style>p{color:red}</style><p>b</p>') === 'a\n\nb',
    md('<p>a</p><script>var x = 1;</script><style>p{color:red}</style><p>b</p>'));
  check('hidden 元素被略過', md('<p hidden>x</p><p>y</p>') === 'y');
  check('aria-hidden 元素被略過', md('<p aria-hidden="true">x</p><p>y</p>') === 'y');
  check('擷取階段標記為隱藏的元素被略過',
    md('<p data-w2m-drop="1">x</p><p>y</p>') === 'y');
  check('表單控制項不會變成文字',
    md('<p>a</p><button>送出</button><select><option>x</option></select>') === 'a',
    md('<p>a</p><button>送出</button><select><option>x</option></select>'));

  const katex = '<p>公式 <span class="katex"><span class="katex-mathml"><math>' +
    '<semantics><annotation encoding="application/x-tex">a^2+b^2</annotation></semantics>' +
    '</math></span><span class="katex-html" aria-hidden="true">a2+b2</span></span> 結束</p>';
  check('KaTeX 還原成行內 TeX',
    md(katex) === '公式 $a^2+b^2$ 結束', md(katex));
  check('可關閉數學式還原',
    md(katex, { mathAsTex: false }).indexOf('$') < 0, md(katex, { mathAsTex: false }));

  const display = '<div class="katex-display"><span class="katex"><span class="katex-mathml"><math>' +
    '<semantics><annotation encoding="application/x-tex">\\int x</annotation></semantics>' +
    '</math></span></span></div>';
  check('顯示型數學式輸出成 $$ 區塊',
    md(display) === '$$\n\\int x\n$$', md(display));

  check('MathJax 的 script 標籤也能取回 TeX',
    md('<p><span class="MathJax"><script type="math/tex">x_1</script></span></p>') === '$x_1$',
    md('<p><span class="MathJax"><script type="math/tex">x_1</script></span></p>'));
}

function testTextSafety() {
  check('看起來像清單的內文會被轉義',
    md('<p>- 這不是清單</p>') === '\\- 這不是清單', md('<p>- 這不是清單</p>'));
  check('段落內的星號會轉義',
    md('<p>3 * 4 = 12</p>') === '3 \\* 4 = 12');
  check('連結文字裡的方括號會轉義',
    md('<p><a href="/x">[1] 參考</a></p>') === '[\\[1\\] 參考](https://example.com/x)',
    md('<p><a href="/x">[1] 參考</a></p>'));
  check('HTML 實體會還原成文字',
    md('<p>a &amp; b &lt; c &nbsp;d</p>') === 'a & b < c \u00a0d', JSON.stringify(md('<p>a &amp; b &lt; c &nbsp;d</p>')));
  check('多個空白節點不會產生連續空白',
    md('<p>a <span> </span> <span>b</span></p>') === 'a b', JSON.stringify(md('<p>a <span> </span> <span>b</span></p>')));
  check('輸出結尾沒有多餘空行',
    /[^\n]$/.test(md('<p>a</p><p>b</p>')), JSON.stringify(md('<p>a</p><p>b</p>')));
}

// ------------------------------------------------------------------ C. 語言

function testI18n() {
  const langs = Object.keys(I18N.MESSAGES);
  check('提供英文與繁體中文兩種語言',
    langs.length === 2 && langs.includes('en') && langs.includes('zh-TW'), langs);
  check('預設語言是英文', I18N.DEFAULT_LANG === 'en' && Settings.DEFAULTS.lang === 'en');
  check('語言清單與訊息表一致',
    I18N.LANGS.every((item) => langs.includes(item.id)) && I18N.LANGS.length === langs.length,
    I18N.LANGS.map((item) => item.id));

  // 少一個鍵就會在該語言下看到英文夾雜，屬於上架前一定要擋掉的錯誤
  const en = Object.keys(I18N.MESSAGES.en).sort();
  const zh = Object.keys(I18N.MESSAGES['zh-TW']).sort();
  check('兩種語言的訊息鍵完全一致',
    JSON.stringify(en) === JSON.stringify(zh),
    { missingInZh: en.filter((key) => !zh.includes(key)), missingInEn: zh.filter((key) => !en.includes(key)) });

  const empty = en.filter((key) => !String(I18N.MESSAGES.en[key]).trim() ||
    !String(I18N.MESSAGES['zh-TW'][key] || '').trim());
  check('沒有空白的翻譯', empty.length === 0, empty);

  // {name} 這類參數在兩邊必須相同，否則其中一種語言會漏掉內容
  const badParams = en.filter((key) => {
    const pick = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((hit) => hit[1]).sort().join(',');
    return pick(I18N.MESSAGES.en[key]) !== pick(I18N.MESSAGES['zh-TW'][key]);
  });
  check('兩種語言的代換參數一致', badParams.length === 0, badParams);

  check('未知語言退回英文', I18N.normalize('ja') === 'en' && I18N.normalize('') === 'en');
  check('zh 系列都對應到繁體中文',
    I18N.normalize('zh-TW') === 'zh-TW' && I18N.normalize('zh_TW') === 'zh-TW' && I18N.normalize('zh') === 'zh-TW');

  I18N.setLang('zh-TW');
  check('切換語言後取得中文', I18N.t('popup.copy') === '複製', I18N.t('popup.copy'));
  check('代換參數可用', I18N.t('sw.progSave', { name: 'a.md' }).includes('a.md'));
  I18N.setLang('en');
  check('切回英文', I18N.t('popup.copy') === 'Copy', I18N.t('popup.copy'));
  check('未定義的鍵原樣回傳', I18N.t('no.such.key') === 'no.such.key');

  // 常數表交給 i18n 翻譯，label 不可以再寫死
  const lists = ['BULLET_MARKERS', 'STRONG_MARKERS', 'EMPHASIS_MARKERS', 'CODE_FENCES',
    'HR_STYLES', 'HEADING_STYLES', 'LINK_STYLES', 'IMAGE_MODES', 'FRONT_MATTER_MODES'];
  for (const name of lists) {
    const list = C[name];
    check(name + ' 只存 labelKey 且都有翻譯',
      list.every((item) => item.labelKey && !item.label && I18N.MESSAGES.en[item.labelKey]),
      list.filter((item) => !item.labelKey || !I18N.MESSAGES.en[item.labelKey]).map((item) => item.id));
  }

  // HTML 上標的翻譯鍵必須存在，否則畫面會直接顯示 key
  for (const page of ['src/options/options.html', 'src/popup/popup.html', 'src/preview/preview.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-title|-aria|-ph)?="([^"]+)"/g)].map((hit) => hit[1]);
    check(page + ' 有標上翻譯鍵', keys.length > 0, keys.length);
    const missing = [...new Set(keys)].filter((key) => I18N.MESSAGES.en[key] === undefined);
    check(page + ' 使用的翻譯鍵都有定義', missing.length === 0, missing);
  }

  // 內容腳本與離螢幕文件回傳的翻譯鍵一樣要存在
  for (const file of ['src/content/convert.js', 'src/content/extract.js',
    'src/content/html2md.js', 'src/offscreen/offscreen.js']) {
    const keys = [...fs.readFileSync(file, 'utf8').matchAll(/key:\s*'([a-z]+\.[A-Za-z]+)'/g)].map((hit) => hit[1]);
    const missing = [...new Set(keys)].filter((key) => I18N.MESSAGES.en[key] === undefined);
    check(file + ' 回傳的翻譯鍵都有定義', missing.length === 0, missing);
  }
}

function testLocales() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  check('manifest 指定 default_locale', manifest.default_locale === 'en');

  const dirs = ['_locales/en/messages.json', '_locales/zh_TW/messages.json'];
  for (const file of dirs) check('locale 檔存在: ' + file, fs.existsSync(file));

  const tables = dirs.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  const [enKeys, zhKeys] = tables.map((table) => Object.keys(table).sort());
  check('_locales 兩種語言的鍵一致', JSON.stringify(enKeys) === JSON.stringify(zhKeys),
    { en: enKeys, zh: zhKeys });

  // manifest 裡的 __MSG_x__ 若在 _locales 找不到，擴充功能會整個載入失敗
  const used = [...new Set([...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((hit) => hit[1]))];
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

// ---------------------------------------------------------------- D. 整合檢查

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function testIntegration() {
  const manifest = JSON.parse(readFile('manifest.json'));
  check('manifest_version = 3', manifest.manifest_version === 3);
  check('沒有宣告不需要的 host_permissions', manifest.host_permissions === undefined);
  check('沒有宣告 debugger 權限（純文字擷取不需要）',
    manifest.permissions.indexOf('debugger') < 0);

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

  for (const [size, file] of Object.entries(manifest.icons)) {
    const info = pngSize(file);
    check('圖示是有效的 PNG 且尺寸正確: ' + file,
      !!info && info.width === Number(size) && info.height === Number(size), info);
  }

  check('OFFSCREEN_PATH 指向存在的檔案', fs.existsSync(C.OFFSCREEN_PATH), C.OFFSCREEN_PATH);
  check('PREVIEW_PATH 指向存在的檔案', fs.existsSync(C.PREVIEW_PATH), C.PREVIEW_PATH);
  for (const file of C.CONTENT_FILES) {
    check('CONTENT_FILES 指向存在的檔案: ' + file, fs.existsSync(file));
  }
  check('注入順序正確（markdown -> html2md -> extract -> convert）',
    C.CONTENT_FILES.indexOf('src/lib/markdown.js') === 0 &&
    C.CONTENT_FILES.indexOf('src/content/html2md.js') === 1 &&
    C.CONTENT_FILES.indexOf('src/content/convert.js') === C.CONTENT_FILES.length - 1,
    C.CONTENT_FILES);

  const pages = ['src/options/options.html', 'src/popup/popup.html',
    'src/offscreen/offscreen.html', 'src/preview/preview.html'];
  for (const page of pages) {
    const html = readFile(page);
    const dir = path.dirname(page);
    for (const rel of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((hit) => hit[1])) {
      check(page + ' 引用的檔案存在: ' + rel, fs.existsSync(path.join(dir, rel)));
    }
    const own = path.basename(page, '.html') + '.js';
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((hit) => hit[1]);
    check(page + ' 自己的腳本排在最後（依賴要先載入）',
      scripts.length > 0 && scripts[scripts.length - 1] === own, scripts);
  }

  const pairs = [
    ['src/options/options.html', 'src/options/options.js'],
    ['src/popup/popup.html', 'src/popup/popup.js'],
    ['src/preview/preview.html', 'src/preview/preview.js'],
    ['src/offscreen/offscreen.html', 'src/offscreen/offscreen.js']
  ];
  for (const [html, js] of pairs) {
    const ids = [...readFile(html).matchAll(/id="([^"]+)"/g)].map((hit) => hit[1]);
    const src = readFile(js);
    const unused = ids.filter((id) => !src.includes('\'' + id + '\'') && !src.includes('"' + id + '"'));
    check(html + ' 的所有 id 都有在 JS 中綁定', unused.length === 0, unused);
  }

  // 設定頁與彈出視窗的欄位一定要對得上 settings 的鍵，否則使用者的調整會存不進去
  for (const js of ['src/options/options.js', 'src/popup/popup.js']) {
    const src = readFile(js);
    const keys = [...src.matchAll(/key:\s*'([A-Za-z]+)'/g)].map((hit) => hit[1]);
    const unknown = keys.filter((key) => !(key in Settings.DEFAULTS));
    check(js + ' 的欄位都對應到既有設定鍵', unknown.length === 0, unknown);
    const ids = [...src.matchAll(/id:\s*'([A-Za-z]+)',\s*key:\s*'([A-Za-z]+)'/g)];
    const mismatched = ids.filter((hit) => hit[1] !== hit[2]).map((hit) => hit[1] + '/' + hit[2]);
    check(js + ' 的欄位 id 與設定鍵同名', mismatched.length === 0, mismatched);
  }

  const swSrc = readFile('src/background/service-worker.js');
  for (const rel of [...swSrc.matchAll(/'(\/src\/[^']+)'/g)].map((hit) => hit[1].slice(1))) {
    check('service worker importScripts 的檔案存在: ' + rel, fs.existsSync(rel));
  }

  // 程式碼用到的 chrome API 必須有對應權限
  const permissionByApi = {
    downloads: 'downloads',
    offscreen: 'offscreen',
    storage: 'storage',
    scripting: 'scripting',
    contextMenus: 'contextMenus'
  };
  const allSrc = ['src/background/service-worker.js', 'src/offscreen/offscreen.js',
    'src/popup/popup.js', 'src/options/options.js', 'src/preview/preview.js', 'src/lib/settings.js']
    .map(readFile).join('\n');
  for (const [api, permission] of Object.entries(permissionByApi)) {
    if (new RegExp('chrome\\.' + api + '\\.').test(allSrc)) {
      check('用到 chrome.' + api + ' 且已宣告 ' + permission + ' 權限',
        manifest.permissions.indexOf(permission) >= 0);
    }
  }
  if (/execCommand\('copy'\)/.test(allSrc)) {
    check('用到 execCommand(copy) 且已宣告 clipboardWrite 權限',
      manifest.permissions.indexOf('clipboardWrite') >= 0);
  }
  for (const command of Object.keys(manifest.commands)) {
    check('快捷鍵 ' + command + ' 有對應的處理程式碼', swSrc.includes('\'' + command + '\''));
  }

  // 官方限制：離螢幕文件只提供 chrome.runtime，用到其他 chrome API 會在執行時
  // 變成 undefined（例如 chrome.downloads.download -> Cannot read properties of undefined）
  const offscreenSrc = readFile('src/offscreen/offscreen.js');
  const offscreenCode = stripComments(offscreenSrc);
  const offscreenApis = [...new Set([...offscreenCode.matchAll(/chrome\.([a-zA-Z]+)/g)].map((hit) => hit[1]))];
  check('離螢幕文件只使用 chrome.runtime',
    offscreenApis.length > 0 && offscreenApis.every((api) => api === 'runtime'), offscreenApis);
  check('實際下載寫在 service worker（離螢幕文件沒有 downloads API）',
    /chrome\.downloads\.download/.test(swSrc) && !/chrome\.downloads/.test(offscreenCode));
  check('離螢幕文件負責建立與釋放 Blob URL',
    /createObjectURL/.test(offscreenCode) && /revokeObjectURL/.test(offscreenCode));
  check('service worker 不會嘗試在自己身上建立 Blob URL',
    !/URL\.createObjectURL/.test(stripComments(swSrc)));
  check('下載完成後一定會釋放 Blob URL', /finally\s*\{\s*await release\(\)/.test(swSrc));

  const msgKeys = [...readFile('src/lib/constants.js').matchAll(/^\s{4}([A-Z_]+):\s*'w2m\//gm)].map((hit) => hit[1]);
  const badMsg = [];
  for (const file of ['src/background/service-worker.js', 'src/offscreen/offscreen.js',
    'src/popup/popup.js', 'src/options/options.js', 'src/preview/preview.js']) {
    [...readFile(file).matchAll(/MSG\.([A-Z_]+)/g)].forEach((hit) => {
      if (!msgKeys.includes(hit[1])) badMsg.push(file + ':' + hit[1]);
    });
  }
  check('所有使用到的 MSG.* 都有定義', badMsg.length === 0, badMsg);

  // html2md 必須維持「只用最小 DOM 介面」，否則就沒辦法離線測試了
  const html2mdCode = stripComments(readFile('src/content/html2md.js'));
  const browserOnly = ['document\\.', 'getComputedStyle', 'querySelector', '\\.closest\\(',
    'outerHTML', 'innerHTML', 'chrome\\.'];
  const leaked = browserOnly.filter((pattern) => new RegExp(pattern).test(html2mdCode));
  check('html2md.js 沒有用到瀏覽器專屬 API（維持可離線測試）', leaked.length === 0, leaked);

  // 擷取階段一定要把暫時加上的標記清掉，否則會改到使用者的頁面
  const extractSrc = readFile('src/content/extract.js');
  check('extract.js 複製完一定會移除暫時標記',
    /finally\s*\{[\s\S]*?unmarkHidden\(liveEl\)/.test(extractSrc));
  check('extract.js 只在複製出來的節點上做清理（不呼叫 live 節點的 remove）',
    /cloneNode\(true\)/.test(extractSrc));
  check('可見性判斷不看 opacity（進場動畫會誤判）',
    !/opacity/.test(stripComments(extractSrc).replace(/\/\/.*$/gm, '')) ||
    !/style\.opacity/.test(stripComments(extractSrc)));

  const convertSrc = readFile('src/content/convert.js');
  check('convert.js 對外暴露 window.__w2m.run',
    /window\.__w2m\s*=\s*\{\s*run\s*\}/.test(convertSrc));
  check('service worker 呼叫的是 __w2m.run', /window\.__w2m\.run\(options\)/.test(swSrc));
}

testEscaping();
testCodeAndUrls();
testTidyAndTable();
testFrontMatter();
testFilename();
testBlockedUrls();
testBlocks();
testInline();
testLists();
testCodeBlocks();
testLinksAndImages();
testTables();
testDropAndMath();
testTextSafety();
testI18n();
testLocales();
testIntegration();

console.log(failures ? '\n=== 失敗 ' + failures + ' 項 ===' : '\n=== 全部通過 ===');
process.exit(failures ? 1 : 0);
