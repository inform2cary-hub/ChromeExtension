/**
 * AI 服務商轉接層。
 * 目前支援兩種協定：
 *   gemini -> POST {base}/v1beta/models/{model}:generateContent
 *   openai -> POST {base}/chat/completions（OpenAI / Ollama / LM Studio / vLLM 等相容端點）
 *
 * 設計重點：
 * 1. 可選參數（temperature / thinkingLevel / reasoning_effort / response_format）
 *    若被端點以 400 拒絕，會自動移除該參數重試，避免因模型差異整批失敗。
 * 2. 429 與 5xx 會指數退避重試，並尊重 Retry-After。
 */
(function (root) {
  'use strict';

  const C = root.AIT_CONST;
  const P = root.AITPrompt;
  const t = root.AITI18N.t;

  const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);
  const MAX_RETRY = 2;

  class ApiError extends Error {
    constructor(message, info) {
      super(message);
      this.name = 'ApiError';
      Object.assign(this, info || {});
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function trimSlash(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  /** Gemini：使用者可能填到 /v1beta，統一移除，由本層自行接上版本路徑 */
  function normalizeGeminiBase(url) {
    let base = trimSlash(url) || C.PROVIDERS.gemini.defaultBaseUrl;
    base = base.replace(/\/v1beta(\/models)?$/i, '').replace(/\/v1(\/models)?$/i, '');
    return trimSlash(base);
  }

  /** OpenAI 相容：只填到主機時自動補 /v1 */
  function normalizeOpenAIBase(url) {
    const base = trimSlash(url);
    if (!base) return '';
    let parsed;
    try {
      parsed = new URL(base);
    } catch (e) {
      return base;
    }
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      return trimSlash(parsed.origin) + '/v1';
    }
    return base;
  }

  function baseUrlFor(cfg) {
    return cfg.kind === 'gemini' ? normalizeGeminiBase(cfg.baseUrl) : normalizeOpenAIBase(cfg.baseUrl);
  }

  /** 把使用者設定的自訂表頭套進 headers 物件（不覆蓋既有的 content-type / authorization 等關鍵表頭） */
  function applyCustomHeaders(headers, cfg) {
    const list = (cfg && cfg.headers) || [];
    for (const h of list) {
      if (!h || !h.key) continue;
      headers[h.key] = h.value || '';
    }
    return headers;
  }

  function pickErrorMessage(status, data, text) {
    if (data && data.error) {
      if (typeof data.error === 'string') return data.error;
      if (data.error.message) return data.error.message;
    }
    if (data && typeof data.message === 'string') return data.message;
    if (data && data.detail) {
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    }
    if (text) return text.slice(0, 400);
    return 'HTTP ' + status;
  }

  function timeoutError(timeoutMs) {
    return t('err.timeout', { sec: Math.round((timeoutMs || 0) / 1000) });
  }

  function friendlyError(status, message) {
    switch (status) {
      case 0:
        return t('err.network', { message });
      case 401:
      case 403:
        return t('err.auth', { status, message });
      case 404:
        return t('err.notFound', { message });
      case 413:
        return t('err.tooLarge');
      case 429:
        return t('err.rateLimit', { message });
      default:
        if (status >= 500) return t('err.server', { status, message });
        return t('err.other', { status, message });
    }
  }

  /** 單次 HTTP 呼叫，含逾時控制 */
  async function rawFetch(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      const text = await res.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }
      }
      return { ok: res.ok, status: res.status, headers: res.headers, data, text, timeoutMs };
    } catch (err) {
      const aborted = err && (err.name === 'AbortError');
      return {
        ok: false,
        status: 0,
        headers: null,
        data: null,
        text: aborted ? t('err.timeoutRaw') : (err && err.message ? err.message : String(err)),
        aborted,
        timeoutMs
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** 加上 429 / 5xx / 網路錯誤的退避重試 */
  async function fetchWithRetry(url, options, timeoutMs) {
    let last = null;
    for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
      last = await rawFetch(url, options, timeoutMs);
      if (last.ok) return last;
      if (last.aborted) return last;
      const retryable = last.status === 0 || RETRY_STATUS.has(last.status);
      if (!retryable || attempt === MAX_RETRY) return last;
      let wait = 700 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      const retryAfter = last.headers && last.headers.get && last.headers.get('retry-after');
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds) && seconds > 0) wait = Math.min(seconds * 1000, 15000);
      }
      await sleep(wait);
    }
    return last;
  }

  /**
   * 記住某個服務商 + 模型曾經拒絕過哪些可選參數，
   * 之後同一組合就不再白費一次請求（service worker 存活期間有效）。
   */
  const rejectedFields = new Map();

  function rejectKey(cfg) {
    return cfg.id + '|' + cfg.model;
  }

  function buildOptionalSet(cfg, candidates) {
    const known = rejectedFields.get(rejectKey(cfg));
    const set = new Set(candidates);
    if (known) known.forEach((field) => set.delete(field));
    return set;
  }

  function rememberRejected(cfg, field) {
    const key = rejectKey(cfg);
    if (!rejectedFields.has(key)) rejectedFields.set(key, new Set());
    rejectedFields.get(key).add(field);
  }

  /**
   * 從 400 錯誤訊息判斷是哪個可選參數不被支援。
   * OpenAI 會直接給 error.param，其他端點只能靠訊息比對。
   */
  function detectRejectedField(result, candidates) {
    const param = result.data && result.data.error && result.data.error.param;
    if (param) {
      const hit = candidates.find((f) => String(param).indexOf(f) >= 0 || f.indexOf(String(param)) >= 0);
      if (hit) return hit;
    }
    const msg = (pickErrorMessage(result.status, result.data, result.text) || '').toLowerCase();
    const aliases = {
      temperature: ['temperature'],
      response_format: ['response_format', 'response format', 'json_object', 'json mode', 'json_schema'],
      reasoning_effort: ['reasoning_effort', 'reasoning effort', 'reasoning'],
      thinkingConfig: ['thinkingconfig', 'thinking_config', 'thinkinglevel', 'thinking_level', 'thinkingbudget', 'thinking_budget'],
      responseMimeType: ['responsemimetype', 'response_mime_type'],
      chat_template_kwargs: ['chat_template_kwargs', 'chat template kwargs', 'enable_thinking'],
      max_tokens: ['max_tokens', 'max_completion_tokens']
    };
    for (const field of candidates) {
      const keys = aliases[field] || [field.toLowerCase()];
      if (keys.some((k) => msg.indexOf(k) >= 0)) return field;
    }
    return null;
  }

  function throwApiError(result, providerLabel) {
    if (result.aborted) {
      throw new ApiError(timeoutError(result.timeoutMs), {
        status: 0,
        code: 'timeout',
        raw: t('err.timeoutRaw'),
        provider: providerLabel
      });
    }
    const message = pickErrorMessage(result.status, result.data, result.text);
    throw new ApiError(friendlyError(result.status, message), {
      status: result.status,
      raw: message,
      provider: providerLabel
    });
  }

  // ---------------------------------------------------------------- Gemini

  function geminiText(data) {
    const candidate = data && data.candidates && data.candidates[0];
    if (!candidate) return '';
    const parts = (candidate.content && candidate.content.parts) || [];
    return parts
      .filter((p) => p && typeof p.text === 'string' && p.thought !== true)
      .map((p) => p.text)
      .join('');
  }

  async function geminiGenerate(cfg, sys, userText, opts) {
    const base = normalizeGeminiBase(cfg.baseUrl);
    const model = cfg.model || C.PROVIDERS.gemini.defaultModel;
    const url = base + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
    const candidates = ['responseMimeType'];
    if (opts.thinkingLevel) candidates.push('thinkingConfig');
    if (opts.temperature !== null && opts.temperature !== undefined) candidates.push('temperature');
    const optional = buildOptionalSet(cfg, candidates);

    for (let round = 0; round <= 3; round++) {
      const generationConfig = {};
      if (optional.has('responseMimeType')) generationConfig.responseMimeType = 'application/json';
      if (optional.has('temperature')) generationConfig.temperature = opts.temperature;
      if (optional.has('thinkingConfig')) generationConfig.thinkingConfig = { thinkingLevel: opts.thinkingLevel };

      const body = {
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }]
      };
      if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

      const result = await fetchWithRetry(url, {
        method: 'POST',
        headers: applyCustomHeaders({
          'content-type': 'application/json',
          'x-goog-api-key': cfg.apiKey
        }, cfg),
        body: JSON.stringify(body)
      }, opts.timeoutMs);

      if (result.ok) {
        const blocked = result.data && result.data.promptFeedback && result.data.promptFeedback.blockReason;
        if (blocked) {
          throw new ApiError(t('err.blocked', { reason: blocked }), { status: 200, code: 'blocked' });
        }
        const candidate = result.data && result.data.candidates && result.data.candidates[0];
        const text = geminiText(result.data);
        if (!text) {
          const reason = (candidate && candidate.finishReason) || 'EMPTY';
          if (reason === 'MAX_TOKENS') {
            throw new ApiError(t('err.truncatedTokens'), { status: 200, code: 'truncated' });
          }
          throw new ApiError(t('err.noContentGemini', { reason }), { status: 200, code: 'empty' });
        }
        return { text, usage: normalizeUsage(result.data && result.data.usageMetadata) };
      }

      if (result.status === 400 && optional.size) {
        const field = detectRejectedField(result, Array.from(optional));
        if (field) {
          optional.delete(field);
          rememberRejected(cfg, field);
          continue;
        }
      }
      throwApiError(result, 'Gemini');
    }
    throw new ApiError(t('err.geminiRetryFailed'), { status: 400 });
  }

  async function geminiListModels(cfg, timeoutMs) {
    const base = normalizeGeminiBase(cfg.baseUrl);
    const result = await fetchWithRetry(base + '/v1beta/models?pageSize=200', {
      method: 'GET',
      headers: applyCustomHeaders({ 'x-goog-api-key': cfg.apiKey }, cfg)
    }, timeoutMs);
    if (!result.ok) throwApiError(result, 'Gemini');
    const models = (result.data && result.data.models) || [];
    return models
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.indexOf('generateContent') >= 0)
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((id) => id && !/embedding|imagen|image|tts|audio|live|veo|aqa/i.test(id))
      .sort();
  }

  // ---------------------------------------------------------------- OpenAI 相容

  function openaiContent(data) {
    const choice = data && data.choices && data.choices[0];
    if (!choice) return '';
    const message = choice.message || {};
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .map((part) => (typeof part === 'string' ? part : (part && typeof part.text === 'string' ? part.text : '')))
        .join('');
    }
    if (typeof choice.text === 'string') return choice.text;
    return '';
  }

  async function openaiGenerate(cfg, sys, userText, opts) {
    const base = normalizeOpenAIBase(cfg.baseUrl);
    if (!base) throw new ApiError(t('err.noBaseUrl'), { status: 0 });
    const url = base + '/chat/completions';
    const candidates = ['response_format'];
    if (opts.reasoningEffort) candidates.push('reasoning_effort');
    if (opts.temperature !== null && opts.temperature !== undefined) candidates.push('temperature');
    // 地端 / 自訂端點才送關閉思考的參數（llama.cpp、vLLM、SGLang 等吃這個欄位）
    if (opts.disableThinking && (cfg.id === 'local' || cfg.id === 'custom')) {
      candidates.push('chat_template_kwargs');
    }
    const optional = buildOptionalSet(cfg, candidates);

    for (let round = 0; round <= 4; round++) {
      const body = {
        model: cfg.model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userText }
        ],
        stream: false
      };
      if (optional.has('response_format')) body.response_format = { type: 'json_object' };
      if (optional.has('temperature')) body.temperature = opts.temperature;
      if (optional.has('reasoning_effort')) body.reasoning_effort = opts.reasoningEffort;
      if (optional.has('chat_template_kwargs')) body.chat_template_kwargs = { enable_thinking: false };

      const headers = { 'content-type': 'application/json' };
      if (cfg.apiKey) headers.authorization = 'Bearer ' + cfg.apiKey;
      applyCustomHeaders(headers, cfg);

      const result = await fetchWithRetry(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }, opts.timeoutMs);

      if (result.ok) {
        const text = openaiContent(result.data);
        if (!text) {
          const choice = result.data && result.data.choices && result.data.choices[0];
          const reason = (choice && (choice.finish_reason || choice.finishReason)) || 'EMPTY';
          if (reason === 'length') {
            throw new ApiError(t('err.truncatedLength'), { status: 200, code: 'truncated' });
          }
          throw new ApiError(t('err.noContentOpenai', { reason }), { status: 200, code: 'empty' });
        }
        return { text, usage: normalizeUsage(result.data && result.data.usage) };
      }

      if (result.status === 400 && optional.size) {
        const field = detectRejectedField(result, Array.from(optional));
        if (field) {
          optional.delete(field);
          rememberRejected(cfg, field);
          continue;
        }
      }
      throwApiError(result, cfg.label || t('err.openaiCompatible'));
    }
    throw new ApiError(t('err.retryFailed'), { status: 400 });
  }

  async function openaiListModels(cfg, timeoutMs) {
    const base = normalizeOpenAIBase(cfg.baseUrl);
    if (!base) throw new ApiError(t('err.noBaseUrlShort'), { status: 0 });
    const headers = {};
    if (cfg.apiKey) headers.authorization = 'Bearer ' + cfg.apiKey;
    applyCustomHeaders(headers, cfg);
    const result = await fetchWithRetry(base + '/models', { method: 'GET', headers }, timeoutMs);
    if (!result.ok) throwApiError(result, cfg.label || t('err.openaiCompatible'));
    const list = (result.data && (result.data.data || result.data.models)) || [];
    return list
      .map((m) => (typeof m === 'string' ? m : (m.id || m.name || '')))
      .filter(Boolean)
      .sort();
  }

  // ---------------------------------------------------------------- 對外介面

  function normalizeUsage(usage) {
    if (!usage) return { input: 0, output: 0, total: 0 };
    const input = usage.promptTokenCount || usage.prompt_tokens || usage.input_tokens || 0;
    const output = usage.candidatesTokenCount || usage.completion_tokens || usage.output_tokens || 0;
    const total = usage.totalTokenCount || usage.total_tokens || (input + output);
    return { input, output, total };
  }

  function requestOptions(settings) {
    return {
      temperature: (settings.temperature === null || settings.temperature === undefined || settings.temperature === '')
        ? null
        : Number(settings.temperature),
      thinkingLevel: settings.thinkingLevel || '',
      reasoningEffort: settings.reasoningEffort || '',
      disableThinking: settings.disableThinking !== false,
      timeoutMs: Math.max(10, Number(settings.timeoutSec) || 90) * 1000
    };
  }

  function validate(cfg) {
    if (!cfg.model) throw new ApiError(t('err.noModel'), { status: 0, code: 'no-model' });
    if (cfg.needsKey && !cfg.apiKey) {
      throw new ApiError(t('err.noKey', { provider: cfg.label }), { status: 0, code: 'no-key' });
    }
    if (!baseUrlFor(cfg)) throw new ApiError(t('err.noBaseUrl'), { status: 0, code: 'no-base' });
  }

  /**
   * 翻譯一批段落。
   * @param {object} settings 完整設定
   * @param {object} cfg AITSettings.activeProviderConfig(settings) 的結果
   * @param {Array<{id:number,text:string}>} items
   * @returns {Promise<{map: Map<number,string>, usage: object}>}
   */
  /**
   * 記住每個服務商 + 模型實際能用的輸出協定。
   * 小模型常寫壞 JSON，一旦確認它只吃編號行協定，之後就直接用，不再浪費第一次請求。
   */
  const protocolMemory = new Map();

  async function translateBatch(settings, cfg, items) {
    validate(cfg);
    const opts = requestOptions(settings);
    const call = cfg.kind === 'gemini' ? geminiGenerate : openaiGenerate;
    const key = rejectKey(cfg);

    const preferred = protocolMemory.get(key) || P.MODES.JSON;
    const order = preferred === P.MODES.JSON
      ? [P.MODES.JSON, P.MODES.LINES]
      : [P.MODES.LINES, P.MODES.JSON];
    // 單段時最後還能退到「只輸出譯文」，連協定都不要求
    if (items.length === 1) order.push(P.MODES.PLAIN);

    let usage = { input: 0, output: 0, total: 0 };
    let lastText = '';

    for (const mode of order) {
      const sys = P.buildSystemPrompt(settings, mode);
      const user = P.buildUserPayload(items, mode);
      const res = await call(cfg, sys, user, opts);
      usage = {
        input: usage.input + (res.usage.input || 0),
        output: usage.output + (res.usage.output || 0),
        total: usage.total + (res.usage.total || 0)
      };
      lastText = res.text;
      const map = P.parseResult(res.text, items, mode);
      if (map.size) {
        // PLAIN 只是單段救援，不要記成這個模型的常用協定
        if (mode !== P.MODES.PLAIN) protocolMemory.set(key, mode);
        return { map, usage, mode };
      }
    }

    throw new ApiError(
      t('err.parseFailed', { output: String(lastText || '').replace(/\s+/g, ' ').slice(0, 160) }),
      {
        status: 200,
        code: 'parse-failed',
        raw: String(lastText || '').slice(0, 300)
      }
    );
  }

  async function listModels(settings, cfg) {
    const opts = requestOptions(settings);
    if (cfg.kind === 'gemini') {
      if (!cfg.apiKey) throw new ApiError(t('err.needKeyModels'), { status: 0 });
      return geminiListModels(cfg, opts.timeoutMs);
    }
    return openaiListModels(cfg, opts.timeoutMs);
  }

  root.AITProviders = {
    ApiError,
    translateBatch,
    listModels,
    baseUrlFor,
    normalizeGeminiBase,
    normalizeOpenAIBase
  };
})(typeof self !== 'undefined' ? self : this);
