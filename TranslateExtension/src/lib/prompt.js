/**
 * 翻譯提示詞（prompt）與批次 JSON 協定。
 * 核心目標：意譯 + 語法潤飾，而不是逐字直譯。
 */
(function (root) {
  'use strict';

  const C = root.AIT_CONST;

  const TONE_RULES = {
    natural: '自然流暢、好讀，像母語人士親手撰寫的文章。',
    technical: '專業技術文件語氣，用語精準、術語前後一致，句子簡潔不拖沓。',
    academic: '學術書面語，結構嚴謹、論述完整，避免口語化表達。',
    casual: '輕鬆口語，像跟同事朋友解說，可使用日常說法但不失準確。',
    news: '新聞報導語氣，客觀中立、資訊密度高、句子俐落。'
  };

  /**
   * 提示詞整份是中文寫的，語言名稱也固定取中文表，
   * 否則使用者把介面切成英文時，送給模型的指令會前後語言不一致。
   */
  function langLabel(id) {
    const hit = (C.LANGS || []).find((l) => l.id === id);
    if (!hit) return id;
    const table = root.AITI18N && root.AITI18N.MESSAGES['zh-TW'];
    return (table && table[hit.labelKey]) || id;
  }

  function isCJKTarget(lang) {
    return /^(zh|ja|ko)/i.test(lang || '');
  }

  /**
   * 三種輸出協定，依模型能力退階：
   *   json  -> {"items":[{"id":1,"text":"…"}]}，最省請求，但小模型常寫壞 JSON
   *   lines -> 每段一行，行首 #編號#，小模型明顯更穩
   *   plain -> 只輸出譯文本身（僅用於單段），最後手段
   */
  const MODES = { JSON: 'json', LINES: 'lines', PLAIN: 'plain' };

  function buildSystemPrompt(settings, mode) {
    const target = settings.targetLang || 'zh-TW';
    const label = langLabel(target);
    const tone = TONE_RULES[settings.tone] || TONE_RULES.natural;
    const lines = [];

    lines.push('你是一位資深的雙語譯者兼母語潤稿編輯，專長是把外語內容改寫成讀起來毫無翻譯腔的' + label + '。');
    lines.push('');
    lines.push('翻譯原則（依重要度排序）：');
    lines.push('1. 意譯優先，嚴禁逐字直譯。先讀懂整段的意思與邏輯關係，再用' + label + '重新組織表達。');
    lines.push('2. 主動做語法潤飾：調整語序、拆解或合併過長的子句、補上目標語言需要的主詞與連接詞、把被動語態改成更自然的說法，讓句子通順自然。');
    lines.push('3. 忠實不加料：不新增原文沒有的資訊、不省略事實或數據、不加入你的評論、註解或譯註。');
    lines.push('4. 專有名詞、人名、產品名、程式碼、指令、檔名、變數、縮寫（例如 GPU、API、Mixture of Experts）保留原文；數字、單位、日期與原文一致。');

    if (target === 'zh-TW' || target === 'zh-HK') {
      lines.push('5. 使用臺灣／繁體中文的慣用詞（例如 memory 記憶體、file 檔案、data 資料、program 程式、performance 效能），不要出現簡體字或大陸用語。');
    } else if (target === 'zh-CN') {
      lines.push('5. 使用中國大陸的簡體中文慣用詞。');
    } else {
      lines.push('5. 使用目標語言的慣用詞彙與地道表達。');
    }

    if (isCJKTarget(target)) {
      lines.push('6. 排版慣例：中文與英文、數字之間留一個半形空格；標點使用全形（，。、；：？！），引號用「」，括號用（）。');
    } else {
      lines.push('6. 遵守目標語言的標點與大小寫慣例。');
    }

    lines.push('7. 語氣風格：' + tone);
    if (settings.domainHint && settings.domainHint.trim()) {
      lines.push('8. 內容領域背景（請據此挑選正確術語）：' + settings.domainHint.trim());
    }

    lines.push('');

    if (mode === MODES.PLAIN) {
      lines.push('輸出格式（務必嚴格遵守）：');
      lines.push('- 只輸出譯文本身，不要輸出原文、編號、引號、JSON、markdown 或任何說明文字。');
    } else if (mode === MODES.LINES) {
      lines.push('輸入格式：每段一行，行首是 #編號#，例如「#3# Hello world」。');
      lines.push('輸出格式（務必嚴格遵守）：');
      lines.push('- 每段譯文各占一行，行首保留原本的 #編號#，例如「#3# 哈囉世界」。');
      lines.push('- 行數與編號必須和輸入完全相同，不可合併、拆分、重新編號或遺漏。');
      lines.push('- 除了這些行以外，不要輸出任何說明文字、原文或 markdown。');
      lines.push('- 譯文中不要出現換行。');
      lines.push('- 若某段本來就是' + label + '、或只有符號與數字而無需翻譯，請原樣回傳。');
    } else {
      lines.push('輸入格式：{"items":[{"id":數字,"text":"原文"}]}');
      lines.push('輸出格式（務必嚴格遵守）：');
      lines.push('- 只輸出 JSON，不要 markdown 圍欄、不要任何說明文字。');
      lines.push('- 結構固定為 {"items":[{"id":數字,"text":"譯文"}]}');
      lines.push('- 每個鍵都要用雙引號包好：{"id":1,"text":"譯文"}，不可寫成 "text: 或漏掉引號。');
      lines.push('- items 的數量、順序與 id 必須和輸入完全相同，不可合併、拆分或遺漏任何一項。');
      lines.push('- 每個 text 只放該段的譯文；譯文不要包含原文。');
      lines.push('- 若某段本來就是' + label + '、或只有符號與數字而無需翻譯，text 請原樣回傳。');
    }

    return lines.join('\n');
  }

  /** items: [{ id, text }] */
  function buildUserPayload(items, mode) {
    if (mode === MODES.PLAIN) {
      return items.map((it) => it.text).join('\n');
    }
    if (mode === MODES.LINES) {
      return items.map((it) => '#' + it.id + '# ' + it.text).join('\n');
    }
    return JSON.stringify({
      items: items.map((it) => ({ id: it.id, text: it.text }))
    });
  }

  function stripFences(raw) {
    let text = String(raw || '').trim();
    // 去掉 ```json ... ``` 圍欄
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    return text;
  }

  /**
   * 移除 reasoning 模型直接寫在 content 裡的思考區塊。
   * 有些地端伺服器會把思考放在 message.reasoning_content（不影響解析），
   * 但也有不少會直接內嵌 <think>…</think>，若不清掉會讓 JSON 解析失敗。
   */
  function stripReasoning(raw) {
    let text = String(raw || '');
    text = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    // 只有結束標籤（開頭被伺服器吃掉）時，丟掉結束標籤之前的內容
    text = text.replace(/^[\s\S]*?<\/(?:think|thinking|reasoning)>/i, '');
    return text.trim();
  }

  function sliceJson(text) {
    const objStart = text.indexOf('{');
    const arrStart = text.indexOf('[');
    let start = -1;
    let endChar = '}';
    if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
      start = objStart;
      endChar = '}';
    } else if (arrStart >= 0) {
      start = arrStart;
      endChar = ']';
    }
    if (start < 0) return '';
    const end = text.lastIndexOf(endChar);
    if (end <= start) return '';
    return text.slice(start, end + 1);
  }

  /**
   * 修補小模型常見的 JSON 瑕疵。
   * 實測 Breeze2-3B 會吐出 {"id":1,"text:"譯文"}（鍵少了收尾引號），
   * 這類單字元錯誤修掉就能救回整批，不必重打一次請求。
   */
  function repairJson(text) {
    return String(text)
      // "text:"值"  ->  "text":"值"
      .replace(/"([A-Za-z_][A-Za-z0-9_]*):"/g, '"$1":"')
      // "text" :  值 前後空白統一（避免下一條規則誤判）
      .replace(/"\s*:\s*/g, '":')
      // 去掉物件／陣列結尾多餘的逗號
      .replace(/,\s*([}\]])/g, '$1');
  }

  /** 編號行協定：#3# 譯文 */
  function parseLines(text, items) {
    const out = new Map();
    const ids = new Set(items.map((it) => it.id));
    const rows = text.split(/\r?\n/);

    const collect = (re) => {
      const map = new Map();
      let currentId = null;
      let buffer = [];
      const flush = () => {
        if (currentId !== null && buffer.length) {
          const value = buffer.join(' ').trim();
          if (value) map.set(currentId, value);
        }
        buffer = [];
      };
      for (const row of rows) {
        const hit = row.match(re);
        if (hit && ids.has(Number(hit[1]))) {
          flush();
          currentId = Number(hit[1]);
          if (hit[2] && hit[2].trim()) buffer.push(hit[2].trim());
        } else if (currentId !== null && row.trim()) {
          buffer.push(row.trim());
        }
      }
      flush();
      return map;
    };

    // 先用嚴格的 #編號# 標記，找不到才放寬成「1. 譯文」這類寫法。
    // 這裡刻意不做「整段當譯文」的退路：那會把不照格式的垃圾輸出
    // 誤當成譯文，也會讓 PLAIN 模式（有明確指令）永遠用不到。
    let map = collect(/^\s*#\s*(\d+)\s*#?\s*(.*)$/);
    if (!map.size) map = collect(/^\s*(\d+)\s*[.)、:：]\s*(.*)$/);
    map.forEach((value, key) => out.set(key, value));
    return out;
  }

  /**
   * 把模型輸出解析成 Map<id, 譯文>。
   * json 模式容錯順序：直接 parse -> 擷取片段 -> 修補瑕疵 -> 單筆時退回純文字。
   */
  function parseResult(raw, items, mode) {
    const out = new Map();
    const text = stripFences(stripReasoning(raw));
    if (!text) return out;

    if (mode === MODES.PLAIN) {
      if (items.length === 1) out.set(items[0].id, text);
      return out;
    }
    if (mode === MODES.LINES) return parseLines(text, items);

    const sliced = sliceJson(text);
    const candidates = [text, sliced, repairJson(text), repairJson(sliced)].filter(Boolean);
    for (const candidate of candidates) {
      let data;
      try {
        data = JSON.parse(candidate);
      } catch (e) {
        continue;
      }
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
      if (!list) continue;
      list.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return;
        const translated = typeof entry.text === 'string' ? entry.text
          : (typeof entry.t === 'string' ? entry.t : null);
        if (translated === null) return;
        let id = entry.id;
        if (typeof id === 'string' && /^\d+$/.test(id)) id = Number(id);
        if (typeof id !== 'number' || !Number.isFinite(id)) {
          // 模型沒回 id 時，依序對應
          id = items[index] ? items[index].id : null;
        }
        if (id === null) return;
        out.set(id, translated.trim());
      });
      if (out.size) return out;
    }

    // 最後手段：單筆請求時，把整段輸出當成譯文
    if (items.length === 1 && text.length && !/^[{[]/.test(text)) {
      out.set(items[0].id, text);
    }
    return out;
  }

  root.AITPrompt = {
    MODES,
    buildSystemPrompt,
    buildUserPayload,
    parseResult,
    repairJson,
    stripReasoning,
    langLabel
  };
})(typeof self !== 'undefined' ? self : this);
