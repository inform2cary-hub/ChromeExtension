# 網頁轉 Markdown（Chrome 擴充功能）

把目前開啟的網頁擷取成**乾淨的 Markdown**：自動找出文章本體，捨棄導覽、側欄、分享按鈕與 Cookie 提示，再轉成可以直接丟進 Obsidian、Hugo 或筆記軟體的文字。

主要能力：

- 只取主要內容：比較候選區塊的文字量與連結密度，判斷不夠明確時自動退回整頁並說明原因
- 三種輸出方式：存成 `.md` 檔、複製到剪貼簿、另開分頁預覽（可先改再存）
- 頁面上有選取文字時只轉換選取範圍（可關閉）
- 完整的區塊支援：標題、清單（含巢狀與待辦）、引言、表格、程式碼區塊（含語言推測）、圖片、圖說、折疊區塊、定義清單
- 數學式還原：MathML／KaTeX／MathJax 轉回 `$LaTeX$`
- 連結四種處理方式（行內／參考式／只留網址／移除）、圖片三種處理方式（保留／只留替代文字／移除）
- YAML front matter：標題、原始網址、作者、發布時間、站名、擷取時間、標籤，另可加自訂欄位
- 檔名樣板與下載子資料夾
- 快捷鍵 `Alt+M`（存檔）、`Alt+Shift+M`（複製）、右鍵選單
- 介面支援英文與繁體中文，**預設英文**，在設定頁右上角即時切換

---

## 安裝

1. 開啟 `chrome://extensions`，右上角開啟「開發人員模式」。
2. 點「載入未封裝項目」，選擇這個資料夾（含 `manifest.json` 的那一層）。
3. 建議把工具列圖示釘選起來。

## 使用

1. 在要擷取的網頁按工具列圖示，或直接按 `Alt+M`。
2. 彈出視窗可以立即調整連結、圖片、front matter 等常用選項（會即時記住）。
3. 三個動作：
   - **存成 .md 檔**：存到瀏覽器的下載資料夾（勾「每次詢問儲存位置」會開另存新檔對話框）
   - **複製**：整份 Markdown 進剪貼簿，直接貼到筆記軟體
   - **預覽**：另開分頁顯示 Markdown 原始碼，可以先改掉轉得不理想的段落再存檔或複製

完整規則（擷取範圍、語法風格、front matter 欄位、檔名樣板）在設定頁調整（圖示旁的齒輪）。

## 運作方式

```
注入內容腳本 → 挑出主要內容 → 複製節點樹並清理 → DOM 轉 Markdown → 存檔／複製／預覽
```

幾個關鍵設計：

- **不會動到你的頁面**：判斷元素是否看得見需要 `getComputedStyle`，做法是在原始節點上暫時加一個 `data-w2m-drop` 屬性，`cloneNode` 完立刻在 `finally` 裡移除，之後所有清理都只發生在複製出來的那份樹上。轉換結束後頁面的 DOM 節點數與 HTML 長度都不變。
- **不需要「偵錯工具」權限**：這裡輸出的是文字，不用 Chrome 的列印引擎，因此和同目錄的「網頁轉 PDF」不同，不必附加除錯器，分頁上方也不會出現偵錯提示列。
- **為什麼需要離螢幕文件**：MV3 的 service worker 沒有 `URL.createObjectURL`，也沒有可以複製的 DOM。離螢幕文件只負責建立／釋放 Blob URL 與寫入剪貼簿，真正的 `chrome.downloads.download` 必須回到 service worker 執行（離螢幕文件只有 `chrome.runtime` 這一個擴充功能 API）。剪貼簿用 `document.execCommand('copy')`，因為離螢幕文件永遠沒有焦點，`navigator.clipboard.writeText` 會被拒絕。
- **只取主要內容的判斷**：優先找 `article`、`main`、`[role=main]`、`.post-content` 等容器，以「文字量 ×（1 − 連結密度）」評分，佔全頁人眼可見文字不到 35% 就放棄、改輸出整頁。計算文字量時排除 `script`／`style`／`noscript`／`template`／`svg`／`iframe`，否則網頁內嵌的 JSON-LD 與水合資料會讓比例嚴重失真。
- **干擾區塊的移除很保守**：依標籤（`nav`／`aside`／`footer`）與 id/class 名稱（share、sidebar、comment、promo…）判斷，但只要該區塊的文字量超過整體三成就不動它。名稱像廣告其實是內容包裝的情況很常見，誤刪整篇文章的代價遠大於留下一段側欄。
- **可見性只看 `display` 與 `visibility`**：不看 `opacity`。很多網站用 `opacity: 0` 做進場動畫，拿它判斷會把整篇文章誤刪。
- **轉換器刻意不依賴瀏覽器**：`src/content/html2md.js` 只用 `nodeType` / `tagName` / `childNodes` / `nodeValue` / `getAttribute` 這幾個介面，不碰 `getComputedStyle`、`querySelector`、`outerHTML`，所以 `tools/selftest.js` 能用假 DOM 直接驗證轉換結果。自我測試裡有一項靜態檢查會擋住「在轉換器裡使用瀏覽器 API」這種寫法。
- **轉義只做必要的**：底線只在詞邊界轉義（`snake_case` 保持原樣）、`<` 與 `&` 只在看起來像 HTML 時才轉。過度轉義會讓輸出長滿反斜線。
- **標記不會貼著空白**：`** 粗體 **` 在 Markdown 裡不生效，所以前後空白一律挪到標記外面。
- **圍籬長度會自動避開衝突**：程式碼內容裡有三個反引號時圍籬自動加長到四個。
- **介面語言為什麼不用 `chrome.i18n`**：`chrome.i18n` 綁瀏覽器語言，無法讓使用者在執行期自己切換，所以介面文字走自製的 `src/lib/i18n.js`，語言存在設定裡（`lang`）。`_locales/` 與 `chrome.i18n` 仍然保留，但只負責該跟著瀏覽器語言走的部分：manifest 的名稱、描述、快捷鍵說明，以及商店上架資訊。
- **內容腳本與離螢幕文件拿不到 i18n**：它們分別跑在網頁環境與只有 `chrome.runtime` 的環境，因此只回傳 `{ key, params }`，由 service worker 翻成文字，翻譯表不必複製好幾份。

## 設定說明

| 項目 | 說明 |
| --- | --- |
| 只取主要內容 | 找出文章區塊，捨棄導覽、側欄、頁尾。判斷不夠明確時會自動放棄並在結果訊息中說明。 |
| 移除導覽與側欄 | 額外依標籤與 id/class 名稱移除分享、推薦、Cookie 提示等干擾。文字量超過三成的區塊不會被移除。 |
| 有選取就只轉選取 | 頁面上有選取文字時只轉換選取範圍；沒有選取時照正常流程走。 |
| 開頭加上標題 | 在最前面補一個 H1。內容本身第一個標題就是網頁標題時不會重複加。 |
| 先捲動整頁觸發延遲載入 | 只有在圖片抓不到網址時才需要。一般情況下直接讀 `data-src`／`srcset` 就夠，所以預設關閉。 |
| 連結處理 | 行內 `[文字](網址)`、參考式（網址集中在文末）、只留 `<網址>`、移除連結只留文字。 |
| 保留頁內片段連結 | `#section` 這種連結在單一檔案裡通常沒有意義，預設只留文字。 |
| 圖片處理 | 保留 `![說明](網址)`、只留替代文字、完全移除。lazy 圖片會依序試 `src`／`data-src`／`srcset`。 |
| 跳過內嵌圖片 | base64 圖片會讓 `.md` 檔暴增，預設改成只留替代文字並在結果訊息中提醒。 |
| 螢光標記轉成 `==文字==` | Obsidian 語法，非標準 Markdown，預設關閉（只留文字）。 |
| 保留段落內的換行 | `<br>` 轉成行尾兩個空白。關閉時換成一個空格。 |
| Front matter | YAML 格式，欄位可逐一開關；值只在需要時加引號。另可用「自訂欄位」直接寫 YAML 附加。 |
| 檔名樣板 | 可用 `{title}` `{host}` `{domain}` `{path}` `{date}` `{time}` `{datetime}` `{yyyy}` `{month}` `{day}` `{hour}` `{minute}` `{second}`。非法字元會自動清掉。 |
| 介面語言 | 英文（預設）或繁體中文，設定頁右上角切換，即時生效並同步套用到右鍵選單。 |

## 專案結構

```
manifest.json
src/lib/constants.js              選項清單、訊息型別、注入檔案清單、不可擷取的網址判斷
src/lib/settings.js               設定預設值與讀寫（chrome.storage.local）
src/lib/markdown.js               純函式：轉義、程式碼區塊、表格、front matter、檔名
src/content/html2md.js            DOM → Markdown 轉換器（只用最小 DOM 介面，可離線測試）
src/content/extract.js            主要內容判斷、節點樹複製與清理、中介資料收集（瀏覽器端）
src/content/convert.js            注入頁面的協調腳本，對外暴露 window.__w2m.run
src/background/service-worker.js  流程調度、下載、剪貼簿、選單與快捷鍵
src/offscreen/*                   Blob URL 與剪貼簿（service worker 的能力限制所需）
src/popup/*                       常用選項與三個動作
src/options/*                     完整設定
src/preview/*                     Markdown 原始碼預覽，可改完再存檔
tools/selftest.js                 自我測試（不需瀏覽器）
tools/make-icons.js               產生圖示 PNG（改配色或造型時才需要重跑）
tools/package.ps1                 打包 zip / 簽章 crx / 產生 update.xml
```

## 開發與驗證

```powershell
node tools/selftest.js
```

298 項檢查，分成四塊（第四塊是語言：兩種語言的訊息鍵完全一致、沒有空白翻譯、代換參數兩邊相同、HTML 上標的 `data-i18n` 鍵都有定義、`_locales` 鍵一致、manifest 的每個 `__MSG_x__` 都找得到、商店描述沒超過 132 字。漏翻一句就會讓測試失敗）：

- **純函式**：轉義規則、行內程式碼與圍籬長度、網址編碼與解析、srcset 挑選、空行整理、表格組裝、YAML 引號、檔名樣板與路徑清理
- **轉換結果**：用一個極簡 HTML 解析器造假 DOM，驗證段落、標題、清單（巢狀／有序／待辦）、引言、程式碼區塊、連結四種模式、圖片三種模式、表格（對齊／合併儲存格／無表頭）、數學式、隱藏元素略過、Markdown 符號轉義
- **整合檢查**：manifest 與 HTML 的引用、圖示尺寸、元素 id 是否都在 JS 中綁定、設定欄位是否對得上 `Settings.DEFAULTS` 的鍵、訊息型別是否都有定義、`chrome.*` API 與權限宣告是否一致、離螢幕文件是否只用 `chrome.runtime`、轉換器有沒有偷用瀏覽器 API

改完程式後在 `chrome://extensions` 按該擴充功能的「重新載入」；設定頁標題旁會顯示版本號，可用來確認是否載到新版。

真實網頁的驗證方式：把 `src/lib/markdown.js`、`src/content/*.js` 依序載入頁面後直接呼叫 `window.__w2m.run(settings)`，就能在不安裝擴充功能的情況下檢查整條流程的輸出。

## 打包與發布

```powershell
# 上架用 zip
powershell -ExecutionPolicy Bypass -File tools\package.ps1

# 企業自架用的簽章 crx 與 update.xml
powershell -ExecutionPolicy Bypass -File tools\package.ps1 -Crx -CrxBaseUrl 'https://intranet.example.com/chrome'
```

打包會先跑一次自我測試，並額外檢查 `constants.js` 裡列出的注入檔案是否都在包裡（這些檔案不在 manifest 中，漏掉不會有任何錯誤訊息）。`dist/` 與 `*.pem` 已列入 `.gitignore`；`.pem` 決定擴充功能 ID，只產生一次並務必備份。

上架 Chrome Web Store 的權限理由：

| 權限 | 理由 |
| --- | --- |
| `activeTab`、`scripting` | 使用者按下擷取時，在當前分頁讀取內容並轉成 Markdown |
| `downloads` | 儲存產生的 `.md` 檔 |
| `offscreen` | service worker 無法建立 Blob URL 也無法寫入剪貼簿，需要離螢幕文件完成 |
| `clipboardWrite` | 提供「複製 Markdown」功能 |
| `storage` | 記住使用者的設定，並暫存預覽頁要顯示的內容 |
| `contextMenus` | 提供右鍵擷取與「把選取範圍複製成 Markdown」 |

## 疑難排解

| 症狀 | 處理方式 |
| --- | --- |
| 顯示「這個頁面無法擷取」 | `chrome://`、擴充功能頁面與 Chrome 線上應用程式商店受瀏覽器限制無法注入腳本。 |
| 內容被切掉，只留一小段 | 該站的文章容器判斷失準。關掉「只取主要內容」改輸出整頁，或用「額外要移除的 CSS 選擇器」自己指定要清掉的區塊。 |
| 導覽或推薦文章跟著出來 | 開啟「移除導覽與側欄」，或把該區塊的選擇器加進設定頁的移除清單。 |
| 圖片網址是空的或 base64 | 開啟「先捲動整頁觸發延遲載入」；若原本就是內嵌圖片，關閉「跳過內嵌圖片」才會保留（檔案會變很大）。 |
| 表格欄位對不上 | 原始表格有合併儲存格，Markdown 表格無法表達，結果訊息會提醒。可到預覽頁手動修。 |
| 剪貼簿沒有東西 | 複製由離螢幕文件執行，需要 `clipboardWrite` 權限；若失敗可改用預覽頁的「複製」按鈕。 |
| 數學式變成一堆亂碼 | 該站沒有提供 TeX 原始碼（沒有 MathML annotation 或 `data-latex`），只能取到渲染後的文字。 |
| 檔案在編輯器裡是亂碼 | 輸出是不含 BOM 的 UTF-8（Markdown 慣例）。請把編輯器的編碼設為 UTF-8。 |
| 改了程式卻沒生效 | 未封裝擴充功能要到 `chrome://extensions` 按該卡片的「重新載入」；設定頁標題旁的版本號可用來確認。 |
