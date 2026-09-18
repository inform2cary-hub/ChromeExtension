# AI 雙語翻譯（Chrome 擴充功能）

用自己的 AI 服務把網頁翻成**雙語對照**：原文段落保留，下方接一段譯文（預設樣式為彩色文字 + 逐行虛線底線，與 `image.png` 的呈現方式相同）。翻譯提示詞以**意譯與語法潤飾**為目標，不做逐字直譯。

支援的 AI 服務：

| 服務 | 協定 | 預設模型 | 需要 API Key |
| --- | --- | --- | --- |
| Google Gemini | `generateContent` | `gemini-3.6-flash` | 是 |
| OpenAI | `/chat/completions` | `gpt-5.6-luna` | 是 |
| 地端 AI（Ollama / LM Studio / llama.cpp / vLLM） | OpenAI 相容 | 按「取得清單」查詢 | 視伺服器設定 |
| 自訂（OpenRouter、Groq、DeepSeek、Azure、Anthropic 相容端點…） | OpenAI 相容 | 自行填寫 | 視服務而定 |

模型名稱可在設定頁按「取得清單」直接向服務端查詢，不必依賴內建清單。

---

## 安裝

1. 開啟 Chrome，前往 `chrome://extensions`。
2. 右上角開啟「開發人員模式」。
3. 點「載入未封裝項目」，選擇這個專案資料夾（含 `manifest.json` 的那一層）。
4. 建議把工具列圖示釘選起來。

## 開始使用

1. 點工具列圖示 → 齒輪，或在擴充功能頁點「選項」，開啟設定頁。
2. 選擇 AI 服務，填入 API Key（Gemini 可在 <https://aistudio.google.com/apikey> 申請；OpenAI 在 <https://platform.openai.com/api-keys>）。
3. 按「測試連線並試譯」，確認會回傳一段中文譯文。
4. 回到任一網頁，按 `Alt+T`，或點圖示 →「翻譯此頁」。
5. 再按一次 `Alt+T` 可切回只看原文（譯文只是隱藏，不會重新請求 API）。

翻譯進度會顯示在右下角的小提示條上；有段落失敗時可直接在那裡按「重試」。

## 主要行為

- **逐段對照**：譯文以 `<span>` 插在原文段落尾端，不改動原始節點，關閉翻譯只是隱藏。
- **只翻看得到的內容**：預設啟用「只翻譯捲動到的區域」，用 `IntersectionObserver` 邊捲邊翻，省 token。
- **動態內容**：`MutationObserver` 會處理無限捲動、AJAX 載入後才出現的段落。
- **自動跳過**：程式碼區塊（`pre`/`code`）、輸入框、`contenteditable`、隱藏元素、純數字或純符號、已是目標語言的段落。
- **批次與併發**：依「每批字元數 / 每批段落數 / 同時請求數」分批送出，並在背景做快取，重複段落不會重複計費。
- **參數自動退避**：若端點不支援 `temperature`、`response_format`、`reasoning_effort`、`thinkingLevel`，會自動移除該參數重試（各家模型限制不同，這樣才不會整批失敗）。`429` 與 `5xx` 會指數退避重試。
- **介面雙語**：英文與繁體中文，**預設英文**，在設定頁右上角即時切換（含頁面上的翻譯 HUD 與右鍵選單）。這是**介面語言**，與「翻譯的目標語言」是兩回事。送給模型的提示詞整份固定用中文寫，不受介面語言影響，否則指令會前後語言不一致而影響翻譯品質。

## 設定說明（重點欄位）

| 欄位 | 說明 |
| --- | --- |
| 語氣風格 | 自然流暢 / 專業技術文件 / 學術嚴謹 / 輕鬆口語 / 新聞報導，決定潤飾方向。 |
| 領域提示 | 例如「大型語言模型推論與 GPU 硬體」，讓術語更準確。 |
| 對照樣式 | 虛線底線（預設）、虛線外框、純色文字、淡色底、左側色條。 |
| 每批字元數 | 太大容易被模型截斷（會提示 MAX_TOKENS），太小則請求次數變多。預設 1800。 |
| 關閉思考模式 | 針對地端／自訂端點送出 `chat_template_kwargs.enable_thinking=false`。reasoning 模型不關會慢數十倍，請保持勾選。 |
| Gemini 思考等級 | 翻譯不需深度推理，`low` 或 `minimal` 最快。 |
| OpenAI reasoning_effort | 建議 `none`，不支援時會自動略過。 |
| temperature | Gemini 3 與 GPT-5 系列建議留空（官方建議使用預設值）。 |
| 標頭（選填） | 每個服務商可各自設定多組自訂 HTTP 表頭（鍵/值），會附加在每次請求上。用於企業內部閘道（如 OpenWebUI）要求的識別表頭，例如 `X-OpenWebUI-User-Email`。不會覆蓋 `Authorization` 或 `x-goog-api-key`。 |
| 跳過的 CSS 選擇器 | 例如 `.highlight, nav`，符合的區塊不翻譯。 |
| 自動翻譯 | 可全站自動，或只對指定網域自動（也能在彈出視窗勾選「此網站自動翻譯」）。 |
| 介面語言 | 英文（預設）或繁體中文，設定頁右上角切換。只影響擴充功能自己的介面，不影響翻譯的目標語言。 |

API Key 只寫入 `chrome.storage.local`（本機瀏覽器設定檔），不會同步、不會傳給第三方；所有 API 請求都由背景 service worker 發出，網頁環境拿不到金鑰。

## 地端模型設定要點

以區網上的 llama.cpp server（`http://10.20.5.226:8090/v1`）實測後歸納出三件必做的事：

1. **授權網域**：`manifest.json` 只預先宣告 Gemini、OpenAI 與 `localhost` / `127.0.0.1`。Base URL 指向其他主機（區網 IP、自架網域）時，設定頁會出現「授權存取此網域」按鈕，按下讓 Chrome 授權後才連得上。
2. **填模型名稱**：按「取得清單」向伺服器查詢實際載入的模型並選用，不要沿用預設值。
3. **勾選「關閉思考模式」**（預設已勾選）：會送出 `chat_template_kwargs: {"enable_thinking": false}`。

第 3 點影響非常大。同一台伺服器、同一個 35B-A3B reasoning 模型的實測：

| 設定 | 結果 |
| --- | --- |
| 不關思考 | 3 段翻譯耗時 288 秒、輸出 9,440 tokens，其中 26,819 字元是思考內容 → 逾時 |
| 關閉思考 | 8 段 / 1,370 字元耗時 14～16 秒、輸出約 435 tokens，8/8 正確 |

實測中 `reasoning_effort: none`、`reasoning_budget: 0`、`thinking: false`、prompt 加 `/no_think` 對 llama.cpp 都無效，只有 `chat_template_kwargs.enable_thinking = false` 有作用。若你的伺服器不支援這個欄位而回 400，擴充功能會自動移除它重試，並記住該模型不支援，之後不再重複嘗試。

### 小模型的輸出協定退階

小模型（3B 等級）常常寫壞 JSON。實測 `Llama-Breeze2-3B-Instruct-v0_1` 會吐出 `{"id":1,"text:"譯文"}`（鍵少了收尾引號），而許多地端伺服器的 `response_format: json_object` 並沒有真的做格式約束。因此解析採三層退階：

1. **JSON 協定**：`{"items":[{"id":1,"text":"…"}]}`，最省請求。解析前會先修補常見瑕疵（漏引號的鍵、結尾多餘逗號、內嵌的 `<think>` 區塊）。
2. **編號行協定**：每段一行、行首 `#編號#`。小模型對這種格式的遵循度明顯更高。
3. **純文字**：僅在單段時使用，直接要求「只輸出譯文本身」。

哪一種協定成功就會被記住，同一個模型之後直接用它，不再浪費第一次請求。若三層都失敗，錯誤訊息會附上模型的實際輸出開頭，方便判斷問題。

實測 Breeze2-3B（10.20.5.226:18081）：單段 2.7 秒、5 段 8.8 秒、10 段／930 字元 16.7 秒，全部走 JSON 協定且 10/10 正確。

伺服器若以 `--api-key` 啟動（llama.cpp、vLLM 都支援），沒填 API Key 會拿到 401，請在 API Key 欄位貼上。

另外，單一實例的地端伺服器會把並行請求排隊，等待時間也算進逾時。若只有一個推論槽（llama.cpp 未加大 `-np`），把「同時請求數」設成 1～2 會比 3 穩定。

## 打包與發布

先產出封裝檔（會自動跑 `tools/selftest.js`、檢查 manifest 引用、排除 `tools/`、`dist/`、`README.md` 等非上架檔案）：

```powershell
# 只產生上架用 zip
powershell -ExecutionPolicy Bypass -File tools\package.ps1

# 同時產生企業自架用的簽章 crx 與 update.xml
powershell -ExecutionPolicy Bypass -File tools\package.ps1 -Crx -CrxBaseUrl 'https://intranet.example.com/chrome'
```

產物放在 `dist/`：

| 檔案 | 用途 |
| --- | --- |
| `ai-bilingual-translate-<版本>.zip` | 上傳 Chrome Web Store 用 |
| `ai-bilingual-translate-<版本>.crx` | 企業自架安裝用（已簽章） |
| `ai-bilingual-translate.pem` | 簽章私鑰，決定擴充功能 ID。**只產生一次，務必備份且不要進版控** |
| `update.xml` | 企業政策的更新檢查清單 |

`dist/` 與 `*.pem` 已列入 `.gitignore`。

### 路線 A：Chrome Web Store（最常見）

1. 到 [開發人員控制台](https://chrome.google.com/webstore/devconsole) 註冊，需一次性 5 美元費用。
2. 上傳 zip，填寫商店資訊：單一用途說明、每一項權限的使用理由、資料使用揭露、隱私權政策網址。這個擴充功能會用到使用者的 API Key 與網頁文字，這些欄位必填。
3. 選擇可見性：
   - **公開**：所有人可搜尋安裝。
   - **不公開（Unlisted）**：不會被搜尋到，知道網址的人才能安裝，適合小範圍散布。
   - **私人**：僅限同一 Google Workspace 網域成員，需要企業帳號。
4. 素材需求：128×128 圖示（已內含）、至少一張 1280×800 或 640×400 螢幕截圖、132 字元以內的簡短說明。
5. 每次更新都必須提高 `manifest.json` 的 `version`，否則無法上傳。近期審查時間有拉長，首次送審請預留時間。

送審前要準備好的權限說明（本專案實際用到的）：

| 權限 | 理由 |
| --- | --- |
| `storage` | 儲存使用者的服務設定與 API Key（只存在本機） |
| `activeTab`、`scripting` | 使用者按下翻譯時，才注入譯文到當前分頁 |
| `contextMenus` | 提供右鍵切換翻譯 |
| `content_scripts` 對 `<all_urls>` | 使用者可能在任何網站要求翻譯 |
| `optional_host_permissions` | 允許連到使用者自己指定的地端或自架 AI 端點，安裝時不索取，需要時才詢問 |

### 路線 B：企業內部自架（不上架）

Windows 與 macOS 從 Chrome 33 起**不允許直接安裝本機 CRX**，把 crx 拖進瀏覽器只會得到 `CRX_REQUIRED_PROOF_MISSING`。內部部署要走群組原則：

1. 用 `-Crx` 打包，取得 crx、`update.xml` 與擴充功能 ID（腳本會直接印出 ID）。
2. 把 crx 與 `update.xml` 放到內部 HTTP 伺服器。crx 必須以 `Content-Type: application/x-chrome-extension` 提供，否則瀏覽器不會視為可安裝套件。
3. 設定政策 `ExtensionInstallForcelist`，值為 `<擴充功能ID>;<update.xml 的網址>`：
   - 網域環境：GPO →「電腦設定 › 系統管理範本 › Google Chrome › 擴充功能」，需先匯入 Chrome ADMX。
   - 單機測試：登錄檔 `HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist`，新增字串值 `1` = `ahgfapmgopbelipejopmhbdfdohhljio;http://your-host/chrome/update.xml`（ID 換成你自己打包出來的）。
4. 之後要更新版本，只要提高 `version`、重新打包（沿用同一把 `.pem` 才會是同一個 ID）、覆蓋伺服器上的檔案並更新 `update.xml` 的 `version` 與 `codebase`。

強制安裝的擴充功能使用者無法自行移除，適合公司統一部署；同時也繞過商店審查，因為完全由你自己散布。

### 路線 C：自己或少數人使用

保持現在的方式即可：`chrome://extensions` →「載入未封裝項目」。不需要簽章、不需要審查，缺點是每台機器都要手動載入，且不會自動更新。

## 專案結構

```
manifest.json                  擴充功能宣告（MV3）
src/lib/constants.js           服務商定義、樣式、語言、訊息型別
src/lib/settings.js            設定預設值與讀寫（chrome.storage.local）
src/lib/prompt.js              潤飾用提示詞與批次 JSON 協定解析
src/lib/providers.js           Gemini / OpenAI 相容 API 轉接、重試與錯誤訊息
src/background/service-worker.js  請求發送、譯文快取、併發控制、右鍵選單與快捷鍵
src/content/extract.js         把 DOM 拆成可翻譯段落
src/content/render.js          插入譯文節點、外觀變數、右下角進度提示
src/content/content.js         主控流程（收集、排程、批次、切換、重試）
src/content/content.css        譯文與提示條樣式
src/options/*                  設定頁（含即時樣式預覽）
src/popup/*                    工具列彈出視窗
tools/selftest.js              自我測試（不需瀏覽器、不呼叫真實 API）
tools/package.ps1              打包 zip / 簽章 crx / 產生 update.xml
```

## 開發與驗證

```powershell
node tools/selftest.js
```

會檢查：提示詞解析容錯、Gemini/OpenAI 請求組裝、參數退避與重試、錯誤訊息轉換，以及 `manifest.json` 與各 HTML 的檔案引用、元素 id 綁定、訊息型別定義是否一致。

改完程式後在 `chrome://extensions` 按該擴充功能的「重新載入」，已開啟的頁面需重新整理才會套用新的 content script。

## 疑難排解

| 症狀 | 處理方式 |
| --- | --- |
| 按了沒反應 | 該頁是 `chrome://`、擴充功能商店或 PDF 檢視器時無法注入；一般網頁請重新整理後再試。 |
| 顯示「API Key 無效或沒有權限」 | 檢查金鑰、所選模型是否對該金鑰開放。 |
| 顯示「無法連線到 AI 服務」 | 檢查 Base URL、地端服務是否啟動，並在設定頁按「授權存取此網域」。 |
| 顯示「請求逾時」 | 幾乎都是地端 reasoning 模型在思考。勾選「關閉思考模式」、把「每批字元數」降到 800～1200，必要時提高逾時秒數。 |
| 地端顯示 401 | 伺服器啟用了 API Key，請在 API Key 欄位填入。 |
| 顯示「輸出被截斷」 | 降低「每批字元數」。 |
| 譯文出現「翻譯失敗」 | 滑鼠移上去看原因，或按右下角提示條的「重試」。 |
| 顯示「模型回傳的格式無法解析」 | 已自動試過 JSON 與編號行兩種協定仍失敗。把「每批段落數」降到 1～3 再試，或換指令遵循較好的模型；訊息末端會附上模型實際輸出，可據此判斷。 |
| 譯文字型不好看 | 設定頁勾選「譯文使用中文字型」。 |
| iframe 內的文字沒翻到 | 目前只處理最上層頁面（`all_frames: false`），內嵌框架的內容不翻譯。 |
