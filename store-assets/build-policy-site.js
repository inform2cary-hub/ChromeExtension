/**
 * 從各擴充功能的 store/PRIVACY_POLICY.md 產生 docs/ 底下的公開網站。
 *
 *   node store-assets/build-policy-site.js
 *
 * store/PRIVACY_POLICY.md 是唯一的事實來源，開頭那段給開發者看的說明
 * （第一條 --- 之前）不會被發布。改完政策重跑這支，再 commit + push 即可，
 * 商店那邊填的網址不需要更動。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

const ITEMS = [
  {
    dir: 'WebPage2MD',
    slug: 'web-page-to-markdown',
    title: 'Web Page to Markdown',
    zh: '網頁轉 Markdown'
  },
  {
    dir: 'WebPage2PDF',
    slug: 'web-page-to-pdf',
    title: 'Web Page to PDF',
    zh: '網頁轉 PDF'
  },
  {
    dir: 'TranslateExtension',
    slug: 'ai-bilingual-translate',
    title: 'AI Bilingual Translate',
    zh: 'AI 雙語翻譯'
  }
];

/** Jekyll 會把 {{ }} 當成 Liquid 語法解析，政策裡若出現會讓建置失敗 */
function assertNoLiquid(text, where) {
  if (/\{\{|\{%/.test(text)) throw new Error('含有會被 Jekyll 誤解析的語法: ' + where);
}

function policyBody(dir) {
  const src = fs.readFileSync(path.join(ROOT, dir, 'store', 'PRIVACY_POLICY.md'), 'utf8');
  const i = src.indexOf('\n---\n');
  if (i < 0) throw new Error('找不到分隔線: ' + dir);
  const body = src.slice(i + 5).replace(/^\s+/, '');
  if (/Host it at a public URL|Placeholders are already/.test(body)) {
    throw new Error('剝離後仍殘留內部說明: ' + dir);
  }
  assertNoLiquid(body, dir);
  return body;
}

fs.mkdirSync(path.join(DOCS, 'privacy'), { recursive: true });

fs.writeFileSync(path.join(DOCS, '_config.yml'),
  'title: Chrome Extensions by inform2cary\n' +
  'description: Privacy policies and support information\n' +
  'theme: jekyll-theme-cayman\n', 'utf8');

// 政策本文已經有自己的 H1，版面上不需要 Jekyll 再加一個標題
const FRONT = (title) => '---\nlayout: default\ntitle: "' + title + '"\n---\n\n';

for (const item of ITEMS) {
  const out = path.join(DOCS, 'privacy', item.slug + '.md');
  fs.writeFileSync(out, FRONT(item.title + ' — Privacy Policy') + policyBody(item.dir), 'utf8');
  console.log('OK  docs/privacy/' + item.slug + '.md');
}

const index =
  FRONT('Chrome Extensions') +
  '# Chrome Extensions\n\n' +
  'Privacy policies and support contact for three Chrome extensions.\n' +
  '三個 Chrome 擴充功能的隱私權政策與聯絡方式。\n\n' +
  '## Privacy policies · 隱私權政策\n\n' +
  ITEMS.map((i) =>
    '- [' + i.title + ' · ' + i.zh + '](privacy/' + i.slug + '.html)').join('\n') +
  '\n\n## Support · 技術支援\n\n' +
  'Questions, bug reports and feature requests: **inform2cary@gmail.com**\n\n' +
  '問題回報與功能建議請來信：**inform2cary@gmail.com**\n\n' +
  '## Source · 原始碼\n\n' +
  'These extensions are open source: ' +
  '[github.com/inform2cary-hub/ChromeExtension](https://github.com/inform2cary-hub/ChromeExtension)\n';

fs.writeFileSync(path.join(DOCS, 'index.md'), index, 'utf8');
console.log('OK  docs/index.md');
console.log('OK  docs/_config.yml');
