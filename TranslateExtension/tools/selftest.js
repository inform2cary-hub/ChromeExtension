/**
 * 自我測試（不需要瀏覽器、不會呼叫真實 API）：
 *   node tools/selftest.js
 *
 * 檢查兩件事：
 *   A. 服務商轉接層與提示詞解析邏輯（用假的 fetch 驗證請求組裝、參數退避、錯誤訊息）
 *   B. 整合檢查：manifest 與各 HTML 引用的檔案是否存在、id 是否都有綁定、訊息型別是否都有定義
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

// ---------------------------------------------------------------- A. 邏輯測試

globalThis.self = globalThis;
for (const file of ['src/lib/constants.js', 'src/lib/i18n.js', 'src/lib/prompt.js', 'src/lib/providers.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}
const C = globalThis.AIT_CONST;
const P = globalThis.AITPrompt;
const V = globalThis.AITProviders;
const I18N = globalThis.AITI18N;

function testPrompt() {
  const items = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }];

  let m = P.parseResult('{"items":[{"id":1,"text":"甲"},{"id":2,"text":"乙"}]}', items);
  check('parseResult 標準 JSON', m.get(1) === '甲' && m.get(2) === '乙');

  m = P.parseResult('```json\n{"items":[{"id":2,"text":"乙"},{"id":1,"text":"甲"}]}\n```', items);
  check('parseResult 去除 markdown 圍欄且順序不影響對應', m.get(1) === '甲' && m.get(2) === '乙');

  m = P.parseResult('結果如下：[{"id":1,"t":"甲"},{"text":"乙"}]', items);
  check('parseResult 容錯：陣列 / t 欄位 / 缺 id 依序對應', m.get(1) === '甲' && m.get(2) === '乙');

  m = P.parseResult('這是一段純文字譯文', [{ id: 9, text: 'x' }]);
  check('parseResult 單筆時可退回純文字', m.get(9) === '這是一段純文字譯文');

  check('parseResult 無法解析時回空 Map', P.parseResult('', items).size === 0);

  m = P.parseResult('<think>使用者要我翻譯 {兩段}，先想一下…</think>{"items":[{"id":1,"text":"甲"},{"id":2,"text":"乙"}]}', items);
  check('parseResult 移除內嵌 <think> 區塊', m.get(1) === '甲' && m.get(2) === '乙', [...m]);

  m = P.parseResult('思考中 {錯誤的括號}\n</think>\n{"items":[{"id":1,"text":"甲"}]}', [{ id: 1, text: 'a' }]);
  check('parseResult 處理只有結束標籤的思考內容', m.get(1) === '甲', [...m]);

  // 實測 Breeze2-3B 產出的壞 JSON：鍵少了收尾引號
  const broken = '{"items":[{"id":1,"text:"最近我在公司部署了 Kimi K3。"}]}';
  m = P.parseResult(broken, [{ id: 1, text: 'a' }]);
  check('parseResult 修補 "text:" 這類壞掉的鍵', m.get(1) === '最近我在公司部署了 Kimi K3。', [...m]);

  m = P.parseResult('{"items":[{"id":1,"text":"甲"},{"id":2,"text":"乙"},]}', items);
  check('parseResult 容許結尾多餘逗號', m.get(1) === '甲' && m.get(2) === '乙', [...m]);

  // 編號行協定
  const lineItems = [{ id: 3, text: 'a' }, { id: 4, text: 'b' }];
  m = P.parseResult('#3# 甲的譯文\n#4# 乙的譯文', lineItems, P.MODES.LINES);
  check('parseResult 解析 #編號# 行協定', m.get(3) === '甲的譯文' && m.get(4) === '乙的譯文', [...m]);

  m = P.parseResult('這是結果：\n3. 甲的譯文\n4) 乙的譯文', lineItems, P.MODES.LINES);
  check('parseResult 放寬支援「3. 譯文」寫法', m.get(3) === '甲的譯文' && m.get(4) === '乙的譯文', [...m]);

  m = P.parseResult('#3# 第一行\n續接的第二行\n#4# 乙的譯文', lineItems, P.MODES.LINES);
  check('parseResult 編號行支援模型多斷一行', m.get(3) === '第一行 續接的第二行' && m.get(4) === '乙的譯文', [...m]);

  m = P.parseResult('直接就是譯文，沒有任何編號', [{ id: 7, text: 'x' }], P.MODES.PLAIN);
  check('parseResult PLAIN 模式接受純譯文', m.get(7) === '直接就是譯文，沒有任何編號');

  const linesSys = P.buildSystemPrompt({ targetLang: 'zh-TW', tone: 'natural' }, P.MODES.LINES);
  check('LINES 提示詞要求保留 #編號#', /#編號#/.test(linesSys) && !/只輸出 JSON/.test(linesSys));
  check('LINES 使用者輸入帶上編號標記',
    P.buildUserPayload(lineItems, P.MODES.LINES) === '#3# a\n#4# b');

  const sys = P.buildSystemPrompt({ targetLang: 'zh-TW', tone: 'technical', domainHint: 'GPU 推論' });
  check('提示詞要求意譯與語法潤飾', /意譯優先/.test(sys) && /語法潤飾/.test(sys));
  check('提示詞包含臺灣用語規則', /記憶體/.test(sys));
  check('提示詞帶入領域提示', /GPU 推論/.test(sys));
  check('提示詞定義 JSON 輸出協定', /\{"items":\[\{"id":數字,"text":"譯文"\}\]\}/.test(sys));

  check('normalizeOpenAIBase 自動補 /v1', V.normalizeOpenAIBase('http://localhost:11434') === 'http://localhost:11434/v1');
  check('normalizeOpenAIBase 保留既有路徑', V.normalizeOpenAIBase('http://localhost:1234/v1/') === 'http://localhost:1234/v1');
  check('normalizeGeminiBase 去掉多餘的 /v1beta',
    V.normalizeGeminiBase('https://generativelanguage.googleapis.com/v1beta') === 'https://generativelanguage.googleapis.com');
}

const calls = [];
let script = [];

function reply(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body)
  };
}

globalThis.fetch = async (url, options) => {
  calls.push({ url, options, body: JSON.parse(options.body || '{}') });
  return script.shift()(url, options);
};

const baseSettings = {
  targetLang: 'zh-TW', tone: 'natural', domainHint: '',
  temperature: null, thinkingLevel: 'low', reasoningEffort: 'none', timeoutSec: 30
};
const geminiCfg = {
  id: 'gemini', kind: 'gemini', label: 'Google Gemini', needsKey: true,
  apiKey: 'KEY', model: 'gemini-3.6-flash', baseUrl: 'https://generativelanguage.googleapis.com'
};
const openaiCfg = {
  id: 'openai', kind: 'openai', label: 'OpenAI', needsKey: true,
  apiKey: 'sk-test', model: 'gpt-5.6-luna', baseUrl: 'https://api.openai.com/v1'
};

async function testProviders() {
  // 以下錯誤訊息的斷言沿用中文原文，因此這一段固定切到繁體中文
  I18N.setLang('zh-TW');

  // Gemini 正常路徑
  calls.length = 0;
  script = [() => reply(200, {
    candidates: [{ content: { parts: [{ thought: true, text: '思考' }, { text: '{"items":[{"id":1,"text":"哈囉"}]}' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
  })];
  let res = await V.translateBatch(baseSettings, geminiCfg, [{ id: 1, text: 'hello' }]);
  check('Gemini 端點路徑正確',
    calls[0].url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', calls[0].url);
  check('Gemini 使用 x-goog-api-key 標頭', calls[0].options.headers['x-goog-api-key'] === 'KEY');
  check('Gemini 送出 thinkingLevel 與 responseMimeType',
    calls[0].body.generationConfig.thinkingConfig.thinkingLevel === 'low' &&
    calls[0].body.generationConfig.responseMimeType === 'application/json');
  check('temperature 留空時不送出該參數', calls[0].body.generationConfig.temperature === undefined);
  check('Gemini 會過濾 thought 片段', res.map.get(1) === '哈囉');
  check('usage 正規化', res.usage.input === 10 && res.usage.output === 5);

  // Gemini 400：不支援 thinking_level 時自動移除重試
  calls.length = 0;
  script = [
    () => reply(400, { error: { code: 400, message: 'Invalid value at generation_config.thinking_level' } }),
    () => reply(200, { candidates: [{ content: { parts: [{ text: '{"items":[{"id":1,"text":"好"}]}' }] } }] })
  ];
  res = await V.translateBatch(baseSettings, geminiCfg, [{ id: 1, text: 'ok' }]);
  check('400 後自動移除 thinkingConfig 重試',
    calls.length === 2 && calls[1].body.generationConfig.thinkingConfig === undefined && res.map.get(1) === '好');

  // OpenAI 400：依 error.param 移除 temperature
  calls.length = 0;
  script = [
    () => reply(400, { error: { message: "Unsupported value: 'temperature'", param: 'temperature' } }),
    () => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"嗨"}]}' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } })
  ];
  res = await V.translateBatch(Object.assign({}, baseSettings, { temperature: 0.3 }), openaiCfg, [{ id: 1, text: 'hi' }]);
  check('OpenAI 端點與 Authorization 正確',
    calls[0].url === 'https://api.openai.com/v1/chat/completions' &&
    calls[0].options.headers.authorization === 'Bearer sk-test');
  check('400 後只移除被拒的 temperature，保留 reasoning_effort',
    calls[1].body.temperature === undefined && calls[1].body.reasoning_effort === 'none' && res.map.get(1) === '嗨');

  // 地端：不支援 response_format 時移除，且沒有 Key 不送 Authorization
  calls.length = 0;
  script = [
    () => reply(400, { error: { message: 'json_object response_format is not supported by this model' } }),
    () => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"本機"}]}' } }] })
  ];
  res = await V.translateBatch(baseSettings,
    Object.assign({}, openaiCfg, { id: 'local', needsKey: false, apiKey: '', baseUrl: 'http://localhost:11434' }),
    [{ id: 1, text: 'local' }]);
  check('地端 Base URL 自動補 /v1 且不帶 Authorization',
    calls[0].url === 'http://localhost:11434/v1/chat/completions' && calls[0].options.headers.authorization === undefined);
  check('response_format 被拒後移除並成功', calls[1].body.response_format === undefined && res.map.get(1) === '本機');

  // 地端 reasoning 模型：預設要送出關閉思考的參數，且被拒後只移除該欄位
  calls.length = 0;
  script = [() => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"關思考"}]}' } }] })];
  const localCfg = {
    id: 'local', kind: 'openai', label: '地端 AI', needsKey: false,
    apiKey: '', model: 'llamacpp-model', baseUrl: 'http://10.0.0.5:8090/v1'
  };
  res = await V.translateBatch(Object.assign({}, baseSettings, { disableThinking: true }), localCfg, [{ id: 1, text: 'x' }]);
  check('地端預設送出 chat_template_kwargs.enable_thinking=false',
    calls[0].body.chat_template_kwargs && calls[0].body.chat_template_kwargs.enable_thinking === false, calls[0].body.chat_template_kwargs);
  check('地端關閉思考時仍成功解析', res.map.get(1) === '關思考');

  calls.length = 0;
  script = [() => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"不關"}]}' } }] })];
  await V.translateBatch(Object.assign({}, baseSettings, { disableThinking: false }), localCfg, [{ id: 1, text: 'x' }]);
  check('取消勾選後不送 chat_template_kwargs', calls[0].body.chat_template_kwargs === undefined);

  calls.length = 0;
  script = [() => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"雲端"}]}' } }] })];
  await V.translateBatch(Object.assign({}, baseSettings, { disableThinking: true }), openaiCfg, [{ id: 1, text: 'x' }]);
  check('雲端 OpenAI 不送 chat_template_kwargs（避免白費一次 400）',
    calls[0].body.chat_template_kwargs === undefined);

  // 同一模型第二次請求不再重試已知被拒的參數
  calls.length = 0;
  const pickyCfg = Object.assign({}, localCfg, { model: 'picky-model' });
  script = [
    () => reply(400, { error: { message: 'Unknown field: chat_template_kwargs' } }),
    () => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"一"}]}' } }] }),
    () => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"二"}]}' } }] })
  ];
  await V.translateBatch(baseSettings, pickyCfg, [{ id: 1, text: 'x' }]);
  const firstRoundCalls = calls.length;
  await V.translateBatch(baseSettings, pickyCfg, [{ id: 1, text: 'y' }]);
  check('被拒的參數會被記住，第二次不再白費請求',
    firstRoundCalls === 2 && calls.length === 3 && calls[2].body.chat_template_kwargs === undefined,
    { firstRoundCalls, total: calls.length });

  // 小模型寫壞 JSON -> 自動改用編號行協定，並記住這個模型只吃編號行
  calls.length = 0;
  const weakCfg = Object.assign({}, localCfg, { model: 'weak-3b' });
  script = [
    () => reply(200, { choices: [{ message: { content: '好的！{"items":[{"id":1,"text:"甲"},{"id":2,"text' } }] }),
    () => reply(200, { choices: [{ message: { content: '#1# 甲的譯文\n#2# 乙的譯文' } }] }),
    () => reply(200, { choices: [{ message: { content: '#5# 丙的譯文' } }] })
  ];
  res = await V.translateBatch(baseSettings, weakCfg, [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]);
  check('JSON 解析失敗後自動改用編號行協定',
    res.mode === 'lines' && res.map.get(1) === '甲的譯文' && res.map.get(2) === '乙的譯文' && calls.length === 2,
    { mode: res.mode, calls: calls.length });
  check('第二次請求送出的是 JSON 協定內容', /"items"/.test(calls[0].body.messages[1].content));
  check('退階後送出的是 #編號# 內容', /^#1# a/.test(calls[1].body.messages[1].content), calls[1].body.messages[1].content);
  check('累計兩次請求的 usage', typeof res.usage.total === 'number');

  res = await V.translateBatch(baseSettings, weakCfg, [{ id: 5, text: 'c' }]);
  check('記住協定後直接用編號行，不再白試 JSON',
    res.mode === 'lines' && calls.length === 3 && /^#5# c/.test(calls[2].body.messages[1].content),
    { calls: calls.length });

  // 單段時最後還能退到「只輸出譯文」
  calls.length = 0;
  const uselessCfg = Object.assign({}, localCfg, { model: 'no-format-model' });
  script = [
    () => reply(200, { choices: [{ message: { content: '{壞掉的 JSON' } }] }),
    () => reply(200, { choices: [{ message: { content: '{也不是編號行' } }] }),
    () => reply(200, { choices: [{ message: { content: '這就是譯文' } }] })
  ];
  res = await V.translateBatch(baseSettings, uselessCfg, [{ id: 1, text: 'a' }]);
  check('單段兩種協定都失敗時退到純文字', res.mode === 'plain' && res.map.get(1) === '這就是譯文' && calls.length === 3,
    { mode: res.mode, calls: calls.length });

  // 多段全部失敗時要給出可行動訊息並附上模型原始輸出
  calls.length = 0;
  script = [
    () => reply(200, { choices: [{ message: { content: '完全不照格式的一堆字' } }] }),
    () => reply(200, { choices: [{ message: { content: '還是不照格式' } }] })
  ];
  let parseErr = null;
  try {
    await V.translateBatch(baseSettings, Object.assign({}, localCfg, { model: 'bad-model' }),
      [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]);
  } catch (err) {
    parseErr = err;
  }
  check('多段解析失敗的訊息含建議與模型輸出',
    !!parseErr && parseErr.code === 'parse-failed' &&
    /每批段落數/.test(parseErr.message) && /還是不照格式/.test(parseErr.message),
    parseErr && parseErr.message);

  // 逾時要給出可行動的訊息，而不是「無法連線」
  calls.length = 0;
  script = [() => Promise.resolve({
    ok: false, status: 0, headers: { get: () => null }, text: async () => '請求逾時'
  })];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body || '{}') });
    const err = new Error('The operation was aborted.');
    err.name = 'AbortError';
    throw err;
  };
  let timeoutErr = null;
  try {
    await V.translateBatch(Object.assign({}, baseSettings, { timeoutSec: 30 }), localCfg, [{ id: 1, text: 'x' }]);
  } catch (err) {
    timeoutErr = err;
  }
  check('逾時錯誤標記為 timeout 並提示關閉思考模式',
    !!timeoutErr && timeoutErr.code === 'timeout' && /關閉思考模式/.test(timeoutErr.message) && /30 秒/.test(timeoutErr.message),
    timeoutErr && timeoutErr.message);
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body || '{}') });
    return script.shift()(url, options);
  };

  // 錯誤訊息與前置檢查
  calls.length = 0;
  script = [() => reply(401, { error: { message: 'invalid api key' } })];
  let caught = null;
  try {
    await V.translateBatch(baseSettings, geminiCfg, [{ id: 1, text: 'x' }]);
  } catch (err) {
    caught = err;
  }
  check('401 轉成可讀的中文訊息', !!caught && /API Key 無效或沒有權限/.test(caught.message));

  caught = null;
  try {
    await V.translateBatch(baseSettings, Object.assign({}, geminiCfg, { apiKey: '' }), [{ id: 1, text: 'x' }]);
  } catch (err) {
    caught = err;
  }
  check('未填 API Key 時直接擋下不發請求', !!caught && caught.code === 'no-key');

  // 429 退避重試
  calls.length = 0;
  script = [
    () => reply(429, { error: { message: 'rate limit' } }),
    () => reply(429, { error: { message: 'rate limit' } }),
    () => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"通"}]}' } }] })
  ];
  res = await V.translateBatch(baseSettings, openaiCfg, [{ id: 1, text: 'x' }]);
  check('429 會退避重試直到成功', res.map.get(1) === '通' && calls.length === 3, calls.length);

  // 自訂表頭：OpenAI 相容端點應把使用者設定的表頭一起送出
  calls.length = 0;
  script = [() => reply(200, { choices: [{ message: { content: '{"items":[{"id":1,"text":"表頭"}]}' } }] })];
  const headerCfg = Object.assign({}, openaiCfg, {
    headers: [{ key: 'X-OpenWebUI-User-Email', value: 'jc_lee@tachen.com.tw' }]
  });
  res = await V.translateBatch(baseSettings, headerCfg, [{ id: 1, text: 'x' }]);
  check('自訂表頭會附加在 OpenAI 相容請求上',
    calls[0].options.headers['X-OpenWebUI-User-Email'] === 'jc_lee@tachen.com.tw' &&
    calls[0].options.headers.authorization === 'Bearer sk-test' && res.map.get(1) === '表頭',
    calls[0].options.headers);

  // 自訂表頭：Gemini 端點也要一起送出，且不能覆蓋掉 x-goog-api-key
  calls.length = 0;
  script = [() => reply(200, { candidates: [{ content: { parts: [{ text: '{"items":[{"id":1,"text":"通過"}]}' }] } }] })];
  const geminiHeaderCfg = Object.assign({}, geminiCfg, {
    headers: [{ key: 'X-Custom', value: 'v1' }]
  });
  res = await V.translateBatch(baseSettings, geminiHeaderCfg, [{ id: 1, text: 'x' }]);
  check('自訂表頭會附加在 Gemini 請求上，且不覆蓋既有金鑰表頭',
    calls[0].options.headers['X-Custom'] === 'v1' && calls[0].options.headers['x-goog-api-key'] === 'KEY' &&
    res.map.get(1) === '通過', calls[0].options.headers);

  I18N.setLang(I18N.DEFAULT_LANG);
}

// ---------------------------------------------------------------- B. 介面語言

function testI18n() {
  const langs = Object.keys(I18N.MESSAGES);
  check('提供英文與繁體中文兩種語言',
    langs.length === 2 && langs.includes('en') && langs.includes('zh-TW'), langs);
  check('語言清單與訊息表一致',
    I18N.LANGS.every((item) => langs.includes(item.id)) && I18N.LANGS.length === langs.length,
    I18N.LANGS.map((l) => l.id));

  const settingsSrc = fs.readFileSync('src/lib/settings.js', 'utf8');
  check('預設語言是英文', I18N.DEFAULT_LANG === 'en' && /\blang:\s*'en'/.test(settingsSrc));

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
  check('切換語言後取得中文', I18N.t('popup.translate') === '翻譯此頁', I18N.t('popup.translate'));
  check('代換參數可用', I18N.t('hud.retryN', { failed: 3 }).includes('3'));
  I18N.setLang('en');
  check('切回英文', I18N.t('popup.translate') === 'Translate this page', I18N.t('popup.translate'));
  check('未定義的鍵原樣回傳', I18N.t('no.such.key') === 'no.such.key');

  // 常數表交給 i18n 翻譯，label 不可以再寫死
  for (const [name, list] of [['STYLES', C.STYLES], ['LANGS', C.LANGS], ['TONES', C.TONES],
    ['THINKING_LEVELS', C.THINKING_LEVELS], ['REASONING_EFFORTS', C.REASONING_EFFORTS]]) {
    check(name + ' 只存 labelKey 且都有翻譯',
      list.every((item) => item.labelKey && !item.label && I18N.MESSAGES.en[item.labelKey]),
      list.filter((item) => !item.labelKey || !I18N.MESSAGES.en[item.labelKey]).map((i) => i.id));
  }
  const providers = Object.values(C.PROVIDERS);
  check('PROVIDERS 只存 labelKey / hintKey 且都有翻譯',
    providers.every((meta) => meta.labelKey && meta.hintKey && !meta.label && !meta.hint &&
      I18N.MESSAGES.en[meta.labelKey] && I18N.MESSAGES.en[meta.hintKey]),
    providers.filter((meta) => !meta.labelKey || !meta.hintKey).map((m) => m.id));
  check('localizeList 會翻出 label',
    I18N.localizeList(C.TONES)[0].label === I18N.MESSAGES.en['tone.natural']);

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

// ---------------------------------------------------------------- C. 整合檢查

function testIntegration() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  check('manifest_version = 3', manifest.manifest_version === 3);

  const refs = [
    manifest.background.service_worker,
    manifest.options_page,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)
  ];
  manifest.content_scripts.forEach((cs) => refs.push(...cs.js, ...cs.css));
  for (const ref of [...new Set(refs)]) {
    check('manifest 引用的檔案存在: ' + ref, fs.existsSync(ref));
  }

  const constantsSrc = fs.readFileSync('src/lib/constants.js', 'utf8');
  const pickList = (name) => {
    const match = constantsSrc.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'));
    return match ? match[1].match(/'([^']+)'/g).map((s) => s.replace(/'/g, '')) : null;
  };
  check('CONTENT_FILES 與 manifest content_scripts.js 一致',
    JSON.stringify(pickList('CONTENT_FILES')) === JSON.stringify(manifest.content_scripts[0].js));
  check('CONTENT_CSS 與 manifest content_scripts.css 一致',
    JSON.stringify(pickList('CONTENT_CSS')) === JSON.stringify(manifest.content_scripts[0].css));

  for (const page of ['src/options/options.html', 'src/popup/popup.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const dir = path.dirname(page);
    for (const rel of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1])) {
      check(page + ' 引用的檔案存在: ' + rel, fs.existsSync(path.join(dir, rel)));
    }
    const iConst = html.indexOf('lib/constants.js');
    const iSettings = html.indexOf('lib/settings.js');
    check(page + ' 腳本相依順序正確（constants 先於 settings）', iConst >= 0 && iSettings > iConst);
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

  const msgKeys = [...constantsSrc.matchAll(/^\s{4}([A-Z_]+):\s*'ait\//gm)].map((m) => m[1]);
  const bad = [];
  for (const file of ['src/content/content.js', 'src/popup/popup.js', 'src/options/options.js', 'src/background/service-worker.js']) {
    const src = fs.readFileSync(file, 'utf8');
    [...src.matchAll(/MSG\.([A-Z_]+)/g)].forEach((m) => {
      if (!msgKeys.includes(m[1])) bad.push(file + ':' + m[1]);
    });
  }
  check('所有使用到的 MSG.* 都有定義', bad.length === 0, bad);
}

(async function main() {
  testPrompt();
  await testProviders();
  testI18n();
  testLocales();
  testIntegration();
  console.log(failures ? '\n=== 失敗 ' + failures + ' 項 ===' : '\n=== 全部通過 ===');
  process.exit(failures ? 1 : 0);
})();
