/**
 * 介面語言（英文 / 繁體中文）。
 *
 * 與 chrome.i18n 的分工：
 *   - chrome.i18n + _locales 只負責「跟著瀏覽器語言走」的部分，也就是
 *     manifest 裡的擴充功能名稱、描述、快捷鍵說明，以及商店上架資訊。
 *   - 這個模組負責介面文字，因為 chrome.i18n 無法在執行期切換語言，
 *     而使用者要能在設定頁自己選。
 *
 * 語言存在設定物件的 lang 欄位（與其他設定共用一份 storage），
 * 載入設定後呼叫 setLang() 再 applyDom() 即可。
 * 預設英文，所以 HTML 內建的文字就寫英文，英文使用者不會看到切換閃爍。
 */
(function (root) {
  'use strict';

  const DEFAULT_LANG = 'en';

  const LANGS = [
    { id: 'en', label: 'English' },
    { id: 'zh-TW', label: '繁體中文' }
  ];

  const MESSAGES = {
    en: {
      'app.name': 'Web Page to Markdown',
      'app.optionsTitle': 'Web Page to Markdown — Settings',

      'popup.loading': 'Loading…',
      'popup.openSettings': 'Open settings',
      'popup.save': 'Save as .md',
      'popup.copy': 'Copy',
      'popup.preview': 'Preview',
      'popup.ready': 'Ready',
      'popup.links': 'Links',
      'popup.images': 'Images',
      'popup.frontMatter': 'Front matter',
      'popup.mainContentOnly': 'Main content only',
      'popup.stripJunk': 'Remove navigation and sidebars',
      'popup.preferSelection': 'Convert the selection when there is one',
      'popup.includeTitle': 'Add the page title at the top',
      'popup.gfmTables': 'Convert tables',
      'popup.saveAs': 'Ask where to save every time',
      'popup.previewHint': 'Preview opens the Markdown source in a new tab, so you can check it before saving.',
      'popup.shortcutSave': 'Save',
      'popup.shortcutCopy': 'Copy',
      'popup.allSettings': 'All settings',
      'popup.savesTo': 'Saves to: Downloads/{path}',
      'popup.badTemplate': '(invalid filename template)',
      'popup.starting': 'Starting the conversion…',
      'popup.copying': 'Converting and copying…',
      'popup.converting': 'Converting…',
      'popup.convertFailed': 'Conversion failed',
      'popup.saved': 'Saved {name}',
      'popup.savedWithSize': 'Saved {name} ({kb} KB)',
      'popup.copied': 'Copied to the clipboard',
      'popup.noTab': 'No active tab found.',
      'popup.blockedPage': "This page can't be captured (Chrome built-in or Web Store page). Switch to a normal web page.",

      'stats.words': '{count} words',
      'stats.links': '{count} links',
      'stats.images': '{count} images',
      'stats.wrap': ' ({list})',
      'sep.list': ', ',
      'sep.note': '; ',
      'sep.colon': ': ',

      'options.lead': 'Everyday options live in the toolbar popup. This page holds the full capture rules, Markdown style and output settings.',
      'options.saved': 'Saved',
      'options.language': 'Language',
      'options.languageHint': 'Applies to this extension’s interface only.',

      'options.sec1': '1. Content capture',
      'options.mainContentOnly': 'Main content only (find the article block and drop navigation, sidebars and footers; falls back to the whole page when the call is not clear)',
      'options.stripJunk': 'Also remove share, recommendation and cookie-notice blocks (anything holding more than a third of the text is kept, so body copy is never cut)',
      'options.preferSelection': 'When text is selected on the page, convert only the selection',
      'options.includeTitle': 'Add the page title as an H1 at the top (skipped when the content already starts with the same heading)',
      'options.removeSelectors': 'Extra CSS selectors to remove',
      'options.removeSelectorsHint': 'One per line, or comma separated. Invalid selectors are ignored and never break the conversion.',
      'options.expandLazy': 'Scroll the whole page first to trigger lazy loading (only needed when image URLs come back empty; adds a few seconds)',
      'options.settleMs': 'Extra wait before capture (ms)',
      'options.settleMsHint': 'Raise this when the page fills in its content after loading. 0 is usually enough.',

      'options.sec2': '2. Markdown style',
      'options.headingStyle': 'Headings',
      'options.bulletMarker': 'List marker',
      'options.strongMarker': 'Bold',
      'options.emphasisMarker': 'Italic',
      'options.codeFence': 'Code fence',
      'options.hrStyle': 'Horizontal rule',
      'options.gfmTables': 'Convert tables (GFM table syntax)',
      'options.taskLists': 'Convert task lists (<code>- [x]</code>)',
      'options.strikethrough': 'Turn strikethrough into <code>~~text~~</code>',
      'options.highlightMarker': 'Turn highlights into <code>==text==</code> (Obsidian syntax)',
      'options.keepLineBreaks': 'Keep line breaks inside paragraphs (<code><br></code> becomes two trailing spaces)',
      'options.codeLanguageFromClass': 'Guess the code language from the class name',
      'options.mathAsTex': 'Restore maths (MathML / KaTeX) as <code>$LaTeX$</code>',

      'options.sec3': '3. Links and images',
      'options.linkStyle': 'Link handling',
      'options.imageMode': 'Image handling',
      'options.absoluteUrls': 'Expand relative URLs into absolute ones (recommended, or the links break once you leave the site)',
      'options.keepFragmentLinks': 'Keep links that only point inside the page (<code>#section</code>)',
      'options.skipDataUrlImages': 'Skip inline (<code>data:</code>) images and keep only the alt text (stops base64 bloating the file)',

      'options.sec4': '4. Front matter',
      'options.fmFormat': 'Format',
      'options.fmTitle': '<code>title</code> title',
      'options.fmSource': '<code>source</code> original URL',
      'options.fmAuthor': '<code>author</code> author',
      'options.fmPublished': '<code>published</code> published time',
      'options.fmSiteName': '<code>site</code> site name',
      'options.fmCaptured': '<code>captured</code> capture time',
      'options.fmDescription': '<code>description</code> summary',
      'options.fmLang': '<code>lang</code> language',
      'options.fmTags': '<code>tags</code> tags (taken from the page’s keywords / article:tag)',
      'options.fmExtra': 'Custom fields (one per line, written as raw YAML)',
      'options.fmExtraHint': 'Appended as-is after the automatic fields. The syntax is not checked.',
      'options.fmPreview': 'Preview',
      'options.noFrontMatter': '(no front matter)',

      'options.sec5': '5. Filename and location',
      'options.filenameTemplate': 'Filename template',
      'options.filenameFields': 'Available fields:',
      'options.subfolder': 'Download subfolder (optional)',
      'options.subfolderPh': 'e.g. Clippings',
      'options.subfolderHint': 'Relative to the browser’s download folder. Leave blank to save directly there.',
      'options.saveAs': 'Always open the “Save as” dialog',
      'options.filenamePreview': 'Filename preview',

      'options.sec6': '6. How it works',
      'options.note1': 'Capture only reads the page and never changes what you are browsing: every clean-up step runs on a copy of the node tree.',
      'options.note2': '“Main content only” weighs candidate blocks by text volume and link density. When the winner holds less than 35% of the page text it gives up, converts the whole page instead, and says so in the result message.',
      'options.note3': 'Chrome’s built-in pages (<code>chrome://</code>), extension pages and the Chrome Web Store cannot be captured. That is a browser restriction.',
      'options.note4': 'Copying writes to the clipboard through an offscreen document, which is why the extension needs the “clipboardWrite” permission.',
      'options.note5': 'The preview page is editable, so you can fix the few paragraphs that converted badly before saving.',

      'options.autosave': 'Settings save automatically.',
      'options.reset': 'Restore defaults',
      'options.resetConfirm': 'Restore every setting to its default value?',
      'options.sampleTitle': 'Sample title: {title}',
      'options.sampleUrl': 'Sample URL: {url}',
      'options.samplePath': 'Output path: Downloads/{path}',

      'preview.title': 'Markdown preview',
      'preview.loading': 'Loading…',
      'preview.selectAll': 'Select all',
      'preview.copy': 'Copy',
      'preview.download': 'Save as .md',
      'preview.editorAria': 'Markdown source, editable before you save',
      'preview.docTitle': '{title} — Markdown preview',
      'preview.statWords': 'Words',
      'preview.statChars': 'Characters',
      'preview.statLines': 'Lines',
      'preview.statLinks': 'Links',
      'preview.statImages': 'Images',
      'preview.statFilename': 'Filename',
      'preview.warnPrefix': 'Heads up: ',
      'preview.copiedChars': 'Copied {count} characters to the clipboard.',
      'preview.copyDenied': 'The browser refused the copy. Everything is selected — press Ctrl+C.',
      'preview.selectedAll': 'Everything is selected. Press Ctrl+C to copy.',
      'preview.nothingToSave': 'There is nothing to save.',
      'preview.downloading': 'Handed to the browser to download: {path}',
      'preview.saveFailed': 'Save failed: {message}',
      'preview.noPayload': 'Nothing to preview. Go back to the page and press “Preview” again.',
      'preview.editHint': 'Edit below, then press “Save as .md” or “Copy”.',

      'bullet.dash': '- Hyphen (most portable)',
      'bullet.star': '* Asterisk',
      'bullet.plus': '+ Plus sign',

      'strong.stars': '**bold** (asterisks)',
      'strong.underscores': '__bold__ (underscores)',

      'em.underscore': '_italic_ (underscores)',
      'em.star': '*italic* (asterisks)',

      'fence.backtick': '``` Backticks (most portable)',
      'fence.tilde': '~~~ Tildes',

      'hr.dash': '---',
      'hr.star': '***',
      'hr.underscore': '___',

      'heading.atx': '# Heading (recommended)',
      'heading.atxClosed': '# Heading # (closed on both sides)',

      'link.inline': 'Inline: [text](url)',
      'link.referenced': 'Reference: [text][1], URLs collected at the end',
      'link.bare': 'URL only: <url>',
      'link.strip': 'Drop the link, keep the text',

      'image.inline': 'Keep images: ![alt](url)',
      'image.alt': 'Alt text only',
      'image.strip': 'Remove images entirely',

      'fm.none': 'None',
      'fm.yaml': 'YAML (--- fenced, for Obsidian and Hugo)',

      'prep.noBody': 'The page has no body',
      'prep.tooLittleText': 'Too little text on the page, so the whole page was used',
      'prep.noMainBlock': 'No main content block found, so the whole page was used',
      'prep.ratioTooLow': 'The main block held only {ratio}% of the page text, so the whole page was used',
      'prep.droppedNodes': 'Removed {count} script, form and hidden elements',
      'prep.droppedCustom': 'Removed {count} elements matching your selectors',
      'prep.droppedJunk': 'Removed {count} navigation, share and sidebar blocks',

      'conv.lazyExpanded': 'Scrolled the page to trigger lazy loading',
      'conv.selectionOnly': 'Converted the selection only',
      'conv.mainLocked': 'Locked on to the main content ({ratio}% of the page text)',
      'conv.tooManyNodes': 'Too many nodes on the page, so the visibility check was skipped',
      'conv.hiddenSkipped': 'Skipped {count} invisible elements',
      'conv.noContent': 'There is nothing to capture on this page.',
      'conv.noMarkdown': 'Nothing on this page could be converted.',
      'conv.failed': 'Capture failed: {message}',

      'warn.tableSpan': 'The table has merged cells, which Markdown tables cannot express. Cells were mapped one by one, so columns may shift.',
      'warn.tableNoHead': 'The table has no header row, so the first row was used as the header',
      'warn.dataUrlImage': 'Inline (data:) images were replaced with their alt text, to keep the Markdown file small',

      'off.noText': 'There is nothing to copy',
      'off.copyDenied': 'The browser refused the copy',

      'sw.injectBlocked': 'This page does not let extensions read its content. Check that it is not a Chrome built-in page, or reload it and try again.',
      'sw.injectNoTab': 'The tab was closed or navigated away. Open the page again and retry.',
      'sw.injectGallery': 'Chrome Web Store pages cannot be captured. That is a browser restriction.',
      'sw.injectFailed': 'Could not run the capture script on this page: {message}',
      'sw.offscreenJustification': 'The service worker cannot create Blob URLs or write to the clipboard, so a context with a DOM does it instead.',
      'sw.offscreenNoReply': 'The offscreen document did not respond',
      'sw.offscreenNoComm': 'Could not reach the offscreen document: {message}',
      'sw.offscreenNoBlob': 'The offscreen document returned no Blob URL',
      'sw.downloadCanceled': 'Save canceled',
      'sw.downloadInterrupted': 'Download interrupted: {reason}',
      'sw.unknownReason': 'unknown reason',
      'sw.saveFailed': 'Save failed: {message}',
      'sw.saveFailedPlain': 'Save failed',
      'sw.copyFailed': 'Could not copy to the clipboard',
      'sw.noTab': 'No active tab found.',
      'sw.blockedPage': 'This page cannot be captured (Chrome built-in page, extension page or Chrome Web Store). Switch to a normal web page and try again.',
      'sw.convertFailed': 'The conversion failed: {message}',
      'sw.noResult': 'Capture failed; the page returned nothing.',
      'sw.emptyMarkdown': 'Nothing on this page could be converted.',
      'sw.progExtract': 'Capturing the content…',
      'sw.progSave': 'Saving {name}…',
      'sw.progCopy': 'Copying to the clipboard…',
      'sw.menuSave': 'Save as a Markdown file (Alt+M)',
      'sw.menuCopy': 'Copy as Markdown (Alt+Shift+M)',
      'sw.menuPreview': 'Preview the Markdown…',
      'sw.menuSelection': 'Copy the selection as Markdown',
      'sw.menuOptions': 'Web Page to Markdown settings…',
      'sw.actionSaved': 'Saved {name}',
      'sw.actionCopied': 'Copied the Markdown',
      'sw.actionFailed': 'Conversion failed: {message}',
      'sw.unknownMessage': 'Unknown message type: {type}',

      'sample.title': 'Running a trillion parameter model on one machine',
      'sample.author': 'Alex Lin',
      'sample.description': 'Full notes, from memory mapping to tiered offloading.',
      'sample.siteName': 'Example Engineering Blog',
      'sample.lang': 'en',
      'sample.tag1': 'LLM',
      'sample.tag2': 'Performance tuning'
    },

    'zh-TW': {
      'app.name': '網頁轉 Markdown',
      'app.optionsTitle': '網頁轉 Markdown - 設定',

      'popup.loading': '載入中…',
      'popup.openSettings': '開啟設定',
      'popup.save': '存成 .md 檔',
      'popup.copy': '複製',
      'popup.preview': '預覽',
      'popup.ready': '準備就緒',
      'popup.links': '連結',
      'popup.images': '圖片',
      'popup.frontMatter': 'Front matter',
      'popup.mainContentOnly': '只取主要內容',
      'popup.stripJunk': '移除導覽與側欄',
      'popup.preferSelection': '有選取就只轉選取',
      'popup.includeTitle': '開頭加上標題',
      'popup.gfmTables': '轉換表格',
      'popup.saveAs': '每次詢問儲存位置',
      'popup.previewHint': '預覽會另開分頁顯示 Markdown 原始碼，可以先確認再存檔。',
      'popup.shortcutSave': '存檔',
      'popup.shortcutCopy': '複製',
      'popup.allSettings': '完整設定',
      'popup.savesTo': '儲存為：下載/{path}',
      'popup.badTemplate': '（檔名樣板有誤）',
      'popup.starting': '開始轉換…',
      'popup.copying': '正在轉換並複製…',
      'popup.converting': '正在轉換…',
      'popup.convertFailed': '轉換失敗',
      'popup.saved': '已儲存 {name}',
      'popup.savedWithSize': '已儲存 {name}（{kb} KB）',
      'popup.copied': '已複製到剪貼簿',
      'popup.noTab': '找不到目前的分頁。',
      'popup.blockedPage': '這個頁面無法擷取（Chrome 內建頁面或商店頁面），請切換到一般網頁。',

      'stats.words': '{count} 字',
      'stats.links': '{count} 連結',
      'stats.images': '{count} 圖片',
      'stats.wrap': '（{list}）',
      'sep.list': '、',
      'sep.note': '；',
      'sep.colon': '：',

      'options.lead': '常用選項在工具列的彈出視窗裡；這裡放完整的擷取規則、Markdown 語法風格與輸出設定。',
      'options.saved': '已儲存',
      'options.language': '語言',
      'options.languageHint': '只影響這個擴充功能的介面文字。',

      'options.sec1': '1. 內容擷取',
      'options.mainContentOnly': '只取主要內容（找出文章區塊，捨棄導覽、側欄、頁尾；判斷不夠明確時會自動改成整頁）',
      'options.stripJunk': '額外移除分享、推薦、Cookie 提示等干擾區塊（文字量超過三成的區塊不會被移除，避免誤刪內文）',
      'options.preferSelection': '頁面上有選取文字時，只轉換選取範圍',
      'options.includeTitle': '在開頭補上網頁標題當成 H1（內容本身已有同名標題時不會重複）',
      'options.removeSelectors': '額外要移除的 CSS 選擇器',
      'options.removeSelectorsHint': '一行或以逗號分隔多個選擇器。無效的選擇器會被忽略，不會中斷轉換。',
      'options.expandLazy': '先捲動整頁觸發延遲載入（只有在圖片抓不到網址時才需要，會多花幾秒）',
      'options.settleMs': '擷取前額外等待（毫秒）',
      'options.settleMsHint': '網頁內容是載入後才補上的時候可以調高，一般 0 就夠。',

      'options.sec2': '2. Markdown 語法風格',
      'options.headingStyle': '標題',
      'options.bulletMarker': '清單符號',
      'options.strongMarker': '粗體',
      'options.emphasisMarker': '斜體',
      'options.codeFence': '程式碼圍籬',
      'options.hrStyle': '分隔線',
      'options.gfmTables': '轉換表格（GFM 表格語法）',
      'options.taskLists': '轉換待辦清單（<code>- [x]</code>）',
      'options.strikethrough': '刪除線轉成 <code>~~文字~~</code>',
      'options.highlightMarker': '螢光標記轉成 <code>==文字==</code>（Obsidian 語法）',
      'options.keepLineBreaks': '保留段落內的換行（<code><br></code> 轉成行尾兩個空白）',
      'options.codeLanguageFromClass': '從 class 推測程式碼語言',
      'options.mathAsTex': '把數學式（MathML／KaTeX）還原成 <code>$LaTeX$</code>',

      'options.sec3': '3. 連結與圖片',
      'options.linkStyle': '連結處理',
      'options.imageMode': '圖片處理',
      'options.absoluteUrls': '把相對網址補成絕對網址（建議開啟，否則離開網站後連結會失效）',
      'options.keepFragmentLinks': '保留只指向頁內位置的連結（<code>#section</code>）',
      'options.skipDataUrlImages': '跳過內嵌（<code>data:</code>）圖片，只留替代文字（避免 Markdown 檔被 base64 塞爆）',

      'options.sec4': '4. Front matter',
      'options.fmFormat': '格式',
      'options.fmTitle': '<code>title</code> 標題',
      'options.fmSource': '<code>source</code> 原始網址',
      'options.fmAuthor': '<code>author</code> 作者',
      'options.fmPublished': '<code>published</code> 發布時間',
      'options.fmSiteName': '<code>site</code> 網站名稱',
      'options.fmCaptured': '<code>captured</code> 擷取時間',
      'options.fmDescription': '<code>description</code> 摘要',
      'options.fmLang': '<code>lang</code> 語言',
      'options.fmTags': '<code>tags</code> 標籤（取自網頁的 keywords／article:tag）',
      'options.fmExtra': '自訂欄位（每行一個，直接寫成 YAML）',
      'options.fmExtraHint': '內容會原樣附在自動欄位後面，格式錯誤不會被檢查。',
      'options.fmPreview': '預覽',
      'options.noFrontMatter': '（不加 front matter）',

      'options.sec5': '5. 檔名與儲存位置',
      'options.filenameTemplate': '檔名樣板',
      'options.filenameFields': '可用欄位：',
      'options.subfolder': '下載子資料夾（選填）',
      'options.subfolderPh': '例如 Clippings',
      'options.subfolderHint': '相對於瀏覽器的下載資料夾，留空就直接放在下載資料夾。',
      'options.saveAs': '每次都開啟「另存新檔」對話框',
      'options.filenamePreview': '檔名預覽',

      'options.sec6': '6. 使用說明',
      'options.note1': '擷取只讀取頁面內容，不會修改你正在瀏覽的網頁：所有清理都在複製出來的節點樹上進行。',
      'options.note2': '「只取主要內容」會比較候選區塊的文字量與連結密度；佔全頁文字不到 35% 時會自動放棄，改輸出整頁並在結果訊息中說明。',
      'options.note3': 'Chrome 內建頁面（<code>chrome://</code>）、擴充功能頁面與 Chrome 線上應用程式商店無法擷取，這是瀏覽器的限制。',
      'options.note4': '複製功能會用到離螢幕文件寫入剪貼簿，所以擴充功能需要「剪貼簿寫入」權限。',
      'options.note5': '預覽頁可以直接改內容再存檔，適合存檔前手動修掉少數轉換不理想的段落。',

      'options.autosave': '設定會即時儲存。',
      'options.reset': '恢復預設值',
      'options.resetConfirm': '確定要把所有設定恢復預設值嗎？',
      'options.sampleTitle': '範例標題：{title}',
      'options.sampleUrl': '範例網址：{url}',
      'options.samplePath': '輸出路徑：下載/{path}',

      'preview.title': 'Markdown 預覽',
      'preview.loading': '讀取中…',
      'preview.selectAll': '全選',
      'preview.copy': '複製',
      'preview.download': '存成 .md 檔',
      'preview.editorAria': 'Markdown 原始碼，可直接編輯後再存檔',
      'preview.docTitle': '{title} - Markdown 預覽',
      'preview.statWords': '字數',
      'preview.statChars': '字元',
      'preview.statLines': '行數',
      'preview.statLinks': '連結',
      'preview.statImages': '圖片',
      'preview.statFilename': '檔名',
      'preview.warnPrefix': '注意：',
      'preview.copiedChars': '已複製 {count} 個字元到剪貼簿。',
      'preview.copyDenied': '瀏覽器拒絕了複製動作，內容已全選，請按 Ctrl+C。',
      'preview.selectedAll': '已全選，可以按 Ctrl+C 複製。',
      'preview.nothingToSave': '沒有內容可以儲存。',
      'preview.downloading': '已交給瀏覽器下載：{path}',
      'preview.saveFailed': '儲存失敗：{message}',
      'preview.noPayload': '沒有可預覽的內容，請回到網頁重新按一次「預覽」。',
      'preview.editHint': '可以直接在下方修改，再按「存成 .md 檔」或「複製」。',

      'bullet.dash': '- 減號（最通用）',
      'bullet.star': '* 星號',
      'bullet.plus': '+ 加號',

      'strong.stars': '**粗體**（星號）',
      'strong.underscores': '__粗體__（底線）',

      'em.underscore': '_斜體_（底線）',
      'em.star': '*斜體*（星號）',

      'fence.backtick': '``` 反引號（最通用）',
      'fence.tilde': '~~~ 波浪號',

      'hr.dash': '---',
      'hr.star': '***',
      'hr.underscore': '___',

      'heading.atx': '# 標題（建議）',
      'heading.atxClosed': '# 標題 #（前後都加）',

      'link.inline': '行內：[文字](網址)',
      'link.referenced': '參考式：[文字][1]，網址集中在文末',
      'link.bare': '只留網址：<網址>',
      'link.strip': '移除連結，只留文字',

      'image.inline': '保留圖片：![說明](網址)',
      'image.alt': '只留替代文字',
      'image.strip': '完全移除圖片',

      'fm.none': '不加',
      'fm.yaml': 'YAML（--- 包住，Obsidian／Hugo 適用）',

      'prep.noBody': '頁面沒有 body',
      'prep.tooLittleText': '頁面文字太少，改用整頁內容',
      'prep.noMainBlock': '找不到主要內容區塊，改用整頁內容',
      'prep.ratioTooLow': '主要內容只佔全頁文字 {ratio}%，改用整頁內容',
      'prep.droppedNodes': '移除 {count} 個腳本／表單／隱藏元素',
      'prep.droppedCustom': '依自訂選擇器移除 {count} 個元素',
      'prep.droppedJunk': '移除 {count} 個導覽／分享／側欄區塊',

      'conv.lazyExpanded': '已捲動整頁觸發延遲載入',
      'conv.selectionOnly': '只轉換選取範圍',
      'conv.mainLocked': '已鎖定主要內容（佔全頁文字 {ratio}%）',
      'conv.tooManyNodes': '頁面節點過多，略過看不見元素的判斷',
      'conv.hiddenSkipped': '略過 {count} 個看不見的元素',
      'conv.noContent': '這個頁面沒有可擷取的內容。',
      'conv.noMarkdown': '這個頁面沒有擷取到可轉換的內容。',
      'conv.failed': '擷取失敗：{message}',

      'warn.tableSpan': '表格有合併儲存格，Markdown 表格無法表達，已改成逐格對應（欄位可能位移）',
      'warn.tableNoHead': '表格沒有表頭列，已把第一列當成表頭',
      'warn.dataUrlImage': '有內嵌（data:）圖片已改成替代文字，避免 Markdown 檔被塞爆',

      'off.noText': '沒有可複製的內容',
      'off.copyDenied': '瀏覽器拒絕了複製動作',

      'sw.injectBlocked': '這個頁面不允許擴充功能存取內容。請確認不是 Chrome 內建頁面，或重新載入頁面後再試。',
      'sw.injectNoTab': '分頁已經關閉或跳轉，請重新開啟頁面再試。',
      'sw.injectGallery': 'Chrome 線上應用程式商店的頁面無法擷取，這是瀏覽器的限制。',
      'sw.injectFailed': '無法在這個頁面執行擷取腳本：{message}',
      'sw.offscreenJustification': 'service worker 無法建立 Blob URL，也無法寫入剪貼簿，需要一個有 DOM 的情境代勞。',
      'sw.offscreenNoReply': '離螢幕文件沒有回應',
      'sw.offscreenNoComm': '無法與離螢幕文件溝通：{message}',
      'sw.offscreenNoBlob': '離螢幕文件沒有回傳 Blob URL',
      'sw.downloadCanceled': '已取消儲存',
      'sw.downloadInterrupted': '下載被中斷：{reason}',
      'sw.unknownReason': '未知原因',
      'sw.saveFailed': '儲存失敗：{message}',
      'sw.saveFailedPlain': '儲存失敗',
      'sw.copyFailed': '複製到剪貼簿失敗',
      'sw.noTab': '找不到目前的分頁。',
      'sw.blockedPage': '這個頁面無法擷取（Chrome 內建頁面、擴充功能頁面或 Chrome 線上應用程式商店）。請切換到一般網頁再試。',
      'sw.convertFailed': '轉換過程失敗：{message}',
      'sw.noResult': '擷取失敗，頁面沒有回傳內容。',
      'sw.emptyMarkdown': '這個頁面沒有擷取到可轉換的內容。',
      'sw.progExtract': '正在擷取內容…',
      'sw.progSave': '正在儲存 {name}…',
      'sw.progCopy': '正在複製到剪貼簿…',
      'sw.menuSave': '存成 Markdown 檔（Alt+M）',
      'sw.menuCopy': '複製 Markdown（Alt+Shift+M）',
      'sw.menuPreview': '預覽 Markdown…',
      'sw.menuSelection': '把選取範圍複製成 Markdown',
      'sw.menuOptions': '網頁轉 Markdown 設定…',
      'sw.actionSaved': '已儲存 {name}',
      'sw.actionCopied': '已複製 Markdown',
      'sw.actionFailed': '轉換失敗：{message}',
      'sw.unknownMessage': '未知的訊息類型：{type}',

      'sample.title': '在一台機器上跑完一兆參數模型',
      'sample.author': '林小明',
      'sample.description': '從記憶體對映到分層卸載的完整筆記。',
      'sample.siteName': 'Example 工程誌',
      'sample.lang': 'zh-TW',
      'sample.tag1': 'LLM',
      'sample.tag2': '效能調校'
    }
  };

  let current = DEFAULT_LANG;

  /** 'zh_TW'、'zh-tw'、'zh' 一律視為繁體中文，其餘退回英文 */
  function normalize(lang) {
    const value = String(lang || '').replace('_', '-').toLowerCase();
    if (value.startsWith('zh')) return 'zh-TW';
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    current = normalize(lang);
    return current;
  }

  function getLang() {
    return current;
  }

  function t(key, params) {
    const table = MESSAGES[current] || MESSAGES[DEFAULT_LANG];
    let text = table[key];
    if (text === undefined) text = MESSAGES[DEFAULT_LANG][key];
    if (text === undefined) return key;
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (match, name) =>
        params[name] === undefined ? match : String(params[name]));
    }
    return text;
  }

  /** constants.js 只存 labelKey，顯示時才翻譯，這樣常數表不必依賴語言狀態 */
  function localizeList(list) {
    return list.map((item) => Object.assign({}, item, { label: t(item.labelKey) }));
  }

  /**
   * 部分說明文字含 <code> 片段。這裡自己拆成文字節點與 <code> 元素，
   * 不用 innerHTML，避免無謂的注入面（也讓商店審查少一個問號）。
   */
  function setRich(el, text) {
    el.textContent = '';
    const parts = String(text).split(/<code>([\s\S]*?)<\/code>/);
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (i % 2 === 1) {
        const code = el.ownerDocument.createElement('code');
        code.textContent = parts[i];
        el.appendChild(code);
      } else {
        el.appendChild(el.ownerDocument.createTextNode(parts[i]));
      }
    }
  }

  const ATTR_MAP = [
    ['data-i18n-title', 'title'],
    ['data-i18n-aria', 'aria-label'],
    ['data-i18n-ph', 'placeholder']
  ];

  function applyDom(scope) {
    const node = scope || document;
    for (const el of node.querySelectorAll('[data-i18n]')) {
      const text = t(el.getAttribute('data-i18n'));
      if (text.indexOf('<code>') >= 0) setRich(el, text);
      else el.textContent = text;
    }
    for (const [attr, target] of ATTR_MAP) {
      for (const el of node.querySelectorAll('[' + attr + ']')) {
        el.setAttribute(target, t(el.getAttribute(attr)));
      }
    }
    if (node === document || !scope) {
      document.documentElement.lang = current;
      const title = document.querySelector('title[data-i18n]');
      if (title) document.title = t(title.getAttribute('data-i18n'));
    }
  }

  root.W2MI18N = {
    DEFAULT_LANG,
    LANGS,
    MESSAGES,
    normalize,
    setLang,
    getLang,
    t,
    localizeList,
    applyDom
  };
})(typeof self !== 'undefined' ? self : this);
