# 網頁轉 PDF（Chrome 擴充功能）

把目前開啟的網頁轉成 **可選取、可搜尋文字的 PDF**。轉檔走 Chrome 內建的列印引擎（CDP `Page.printToPDF`），也就是 headless Chrome 產生 PDF 的同一條管線，不是把畫面截圖貼進 PDF，所以文字、連結、分頁、書籤都保留。

主要能力：

- 紙張（A3/A4/A5/B4/B5/Letter/Legal/Tabloid/自訂 mm）、直橫向、邊界預設或逐邊自訂、縮放、頁面範圍
- 頁首頁尾（標題／網址／日期／頁碼／頁碼+總頁數，可選字級）
- 轉檔前自動整理頁面：只輸出主要內容、取消固定與浮動元素、強制白底黑字、展開折疊區塊、捲動整頁觸發延遲載入圖片、依自訂 CSS 選擇器隱藏干擾
- 標記式 PDF（無障礙結構）與依標題層級產生書籤大綱
- 檔名樣板與下載子資料夾
- 快捷鍵 `Alt+P`、右鍵選單、備用的 Chrome 列印對話框
- 介面支援英文與繁體中文，**預設英文**，在設定頁右上角即時切換

---

## 安裝

1. 開啟 `chrome://extensions`，右上角開啟「開發人員模式」。
2. 點「載入未封裝項目」，選擇這個資料夾（含 `manifest.json` 的那一層）。
3. 建議把工具列圖示釘選起來。

## 使用

1. 在要轉檔的網頁按工具列圖示，或直接按 `Alt+P`。
2. 在彈出視窗調整紙張、邊界等常用選項（會即時記住），按「轉成 PDF」。
3. 檔案存到瀏覽器的下載資料夾；勾選「每次詢問儲存位置」就會開啟另存新檔對話框。

檔名、頁首頁尾欄位、PDF 結構與頁面整理規則在設定頁調整（圖示旁的齒輪）。

## 運作方式

```
整理頁面 → 附加除錯器 → Page.printToPDF → 還原頁面 → 離螢幕文件轉 Blob → 下載
```

幾個關鍵設計：

- **為什麼需要「偵錯工具」權限**：`Page.printToPDF` 只能透過 Chrome DevTools Protocol 呼叫，而擴充功能存取 CDP 的唯一途徑是 `chrome.debugger`。轉檔期間分頁上方會出現「正在偵錯這個瀏覽器」提示列，完成後自動消失。
- **為什麼需要離螢幕文件**：MV3 的 service worker 沒有 `URL.createObjectURL`，而把 PDF 塞進 `data:` URL 交給下載 API 在檔案較大時會被截斷。因此改由具備 DOM 環境的離螢幕文件建立 Blob URL。
- **離螢幕文件只能做這件事**：Chrome 只在離螢幕文件裡提供 `chrome.runtime`，其他擴充功能 API 一律是 `undefined`。所以它只負責建立與釋放 Blob URL，真正的 `chrome.downloads.download` 必須回到 service worker 執行。`tools/selftest.js` 有一項靜態檢查會擋住「在離螢幕文件裡呼叫其他 chrome API」這種寫法。
- **頁面整理一定會還原**：所有變更都以 `data-w2p-*` 屬性與單一 `<style>` 實作，轉檔結束（含失敗）都會在 `finally` 裡還原，包含捲動位置、`<details>` 開合與 `loading="lazy"`。
- **只輸出主要內容的判斷**：優先找 `article`、`main`、`[role=main]` 等容器，計算它佔全頁「人眼可見文字」的比例，低於 40% 就放棄、維持整頁輸出。計算時會排除 `script`/`style`/`noscript`/`template`，否則網頁內嵌的 JSON-LD 與水合資料會讓比例嚴重失真。
- **頁首頁尾的邊界陷阱**：Chrome 的頁首頁尾畫在紙張邊界內，邊界太小就會看不見。開啟頁首頁尾時，上下邊界不足 15 mm 會自動撐開，並在結果訊息中告知。
- **較新的 PDF 參數會自動降級**：`generateTaggedPDF`、`generateDocumentOutline` 若被 Chrome 拒絕，會逐一移除後重試，而不是整個失敗。
- **介面語言為什麼不用 `chrome.i18n`**：`chrome.i18n` 綁瀏覽器語言，無法讓使用者在執行期自己切換，所以介面文字走自製的 `src/lib/i18n.js`，語言存在設定裡（`lang`）。`_locales/` 與 `chrome.i18n` 仍然保留，但只負責該跟著瀏覽器語言走的部分：manifest 的名稱、描述、快捷鍵說明，以及商店上架資訊。
- **內容腳本拿不到 i18n**：`src/content/prepare.js` 注入在網頁環境，因此只回傳 `{ key, params }`，由 service worker 翻成文字，翻譯表不必複製一份到頁面裡。

## 設定說明

| 項目 | 說明 |
| --- | --- |
| 只輸出主要內容 | 隱藏導覽、側欄、頁尾等區塊，只留文章本文。判斷不夠明確時會自動放棄並提示。 |
| 取消固定／浮動元素 | 固定頁首、側邊懸浮列在列印時會擋住內容或每頁重複，轉檔時改為靜態定位。 |
| 強制白底黑字 | 深色網站在開啟「列印背景」時會輸出整片黑，勾選這項可強制白底。 |
| 用螢幕樣式取代列印樣式 | 有些網站的列印 CSS 壞掉（版面崩掉或內容消失），這時改用螢幕樣式輸出。 |
| 先捲動整頁載入圖片 | 延遲載入的圖片若沒進過視窗就不會有內容，轉檔前先捲一遍。最多捲 60 屏以避免無限捲動頁面卡住。 |
| 頁面範圍 | 例如 `1-5, 8`。只接受數字、逗號與連字號。 |
| 標記式 PDF | 帶入語意結構，螢幕閱讀器可正確朗讀，也讓 PDF 內容更容易被再利用。 |
| 書籤大綱 | 依網頁的標題層級（h1/h2/…）產生 PDF 書籤。 |
| 檔名樣板 | 可用 `{title}` `{host}` `{domain}` `{path}` `{date}` `{time}` `{datetime}` `{yyyy}` `{month}` `{day}` `{hour}` `{minute}` `{second}`。非法字元會自動清掉。 |
| 介面語言 | 英文（預設）或繁體中文，設定頁右上角切換，即時生效並同步套用到右鍵選單。 |

## 專案結構

```
manifest.json
src/lib/constants.js              紙張規格、邊界預設、訊息型別、不可轉檔的網址判斷
src/lib/settings.js               設定預設值與讀寫（chrome.storage.local）
src/lib/pdf.js                    純函式：mm/inch 換算、CDP 參數組裝、頁首頁尾樣板、檔名處理
src/background/service-worker.js  轉檔流程協調、除錯器附加、選單與快捷鍵
src/content/prepare.js            列印前的頁面整理與還原（動態注入）
src/offscreen/*                   Blob URL 與下載（service worker 的能力限制所需）
src/popup/*                       常用版面選項與轉檔按鈕
src/options/*                     檔名、頁首頁尾、PDF 結構、頁面整理規則
tools/selftest.js                 自我測試（不需瀏覽器）
tools/package.ps1                 打包 zip / 簽章 crx / 產生 update.xml
```

## 開發與驗證

```powershell
node tools/selftest.js
```

會驗證 mm/inch 換算、紙張與邊界解析、頁首頁尾邊界自動撐開、CDP 參數組裝、頁面範圍驗證、檔名樣板與路徑清理、不可轉檔網址判斷，以及 manifest 引用、HTML 引用、元素 id 綁定、訊息型別、`chrome.*` API 與權限宣告是否一致。

語言的部分另外驗證：兩種語言的訊息鍵完全一致、沒有空白翻譯、代換參數（`{name}` 這類）兩邊相同、HTML 上標的 `data-i18n` 鍵都有定義、`_locales` 兩種語言鍵一致、manifest 的每個 `__MSG_x__` 都找得到、商店描述沒超過 132 字。漏翻一句就會讓測試失敗。

改完程式後在 `chrome://extensions` 按該擴充功能的「重新載入」；設定頁標題旁會顯示版本號，可用來確認是否載到新版。

## 打包與發布

```powershell
# 上架用 zip
powershell -ExecutionPolicy Bypass -File tools\package.ps1

# 企業自架用的簽章 crx 與 update.xml
powershell -ExecutionPolicy Bypass -File tools\package.ps1 -Crx -CrxBaseUrl 'https://intranet.example.com/chrome'
```

`dist/` 與 `*.pem` 已列入 `.gitignore`。`.pem` 決定擴充功能 ID，只產生一次並務必備份。

上架 Chrome Web Store 時，「偵錯工具」權限會被審查關注，權限理由可以這樣寫：

| 權限 | 理由 |
| --- | --- |
| `debugger` | 呼叫 Chrome 內建列印引擎（`Page.printToPDF`）產生高品質 PDF，只在使用者主動按下轉檔時附加，完成後立即卸離 |
| `downloads` | 儲存產生的 PDF 檔 |
| `offscreen` | service worker 無法建立 Blob URL，需要離螢幕文件完成儲存 |
| `activeTab`、`scripting` | 使用者按下轉檔時，整理當前分頁的頁面內容並在完成後還原 |
| `storage` | 記住使用者的版面與檔名設定 |
| `contextMenus` | 提供右鍵轉檔 |

企業內部部署（不上架）的完整步驟與 `ExtensionInstallForcelist` 政策設定，與同目錄的另一個擴充功能相同，可參考該專案 README 的「路線 B」。

## 疑難排解

| 症狀 | 處理方式 |
| --- | --- |
| 顯示「已經有其他除錯器連著」 | 該分頁開著開發人員工具，關閉 DevTools 再試。 |
| 顯示「這個頁面無法轉檔」 | `chrome://`、擴充功能頁面與 Chrome 線上應用程式商店受瀏覽器限制無法附加除錯器。 |
| PDF 少了圖片 | 開啟「先捲動整頁載入圖片」，必要時把「整理後額外等待」調高到 1000 以上。 |
| PDF 整頁黑底 | 勾選「強制白底黑字」，或關閉「列印背景與圖片」。 |
| 版面跟畫面差很多 | 勾選「用螢幕樣式取代列印樣式」。 |
| 頁首頁尾沒出現 | 上下邊界太小，改用預設邊界（轉檔時也會自動撐開到 15 mm）。 |
| 內容被切掉或跨頁重複 | 勾選「取消固定／浮動元素」。 |
| 想連 `chrome://` 頁面也印 | 無法透過擴充功能達成，請改用彈出視窗的「改用 Chrome 列印對話框」。 |
| 改了程式卻沒生效 | 未封裝擴充功能要到 `chrome://extensions` 按該卡片的「重新載入」；設定頁標題旁的版本號可用來確認。 |
