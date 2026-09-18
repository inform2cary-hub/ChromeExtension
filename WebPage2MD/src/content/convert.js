/**
 * 注入頁面後的協調腳本：擷取 -> 清理 -> 轉成 Markdown -> 組上 front matter。
 * 由 chrome.scripting 動態注入（isolated world），對外只暴露 window.__w2m.run。
 *
 * 全程都在複製出來的節點樹上工作，使用者的頁面不會被改動，
 * 唯一會碰到原頁面的是「捲動觸發延遲載入」，結束後會把捲動位置還原。
 *
 * 頁面環境拿不到 i18n，所以 notes / warnings / error 一律回傳
 * { key, params }，由 service worker 依使用者選的語言翻成文字。
 */
(function () {
  'use strict';

  const M = window.W2MMarkdown;
  const Extract = window.W2MExtract;
  const Html2Md = window.W2MHtml2Md;

  function mdOptions(settings) {
    return {
      headingStyle: settings.headingStyle,
      bulletMarker: settings.bulletMarker,
      strongMarker: settings.strongMarker,
      emphasisMarker: settings.emphasisMarker,
      codeFence: settings.codeFence,
      hrStyle: settings.hrStyle,
      linkStyle: settings.linkStyle,
      keepFragmentLinks: !!settings.keepFragmentLinks,
      imageMode: settings.imageMode,
      skipDataUrlImages: !!settings.skipDataUrlImages,
      absoluteUrls: !!settings.absoluteUrls,
      keepLineBreaks: !!settings.keepLineBreaks,
      gfmTables: !!settings.gfmTables,
      strikethrough: !!settings.strikethrough,
      taskLists: !!settings.taskLists,
      highlightMarker: !!settings.highlightMarker,
      mathAsTex: !!settings.mathAsTex,
      codeLanguageFromClass: !!settings.codeLanguageFromClass,
      baseUrl: location.href
    };
  }

  /** 內容本身開頭就是同名標題時不要再加一次 */
  function withTitle(markdown, title) {
    const text = M.collapseSpaces(title);
    if (!text) return markdown;
    const heading = /^#{1,2}\s+(.*)$/.exec(markdown.split('\n', 1)[0] || '');
    if (heading && M.looksSameTitle(heading[1], text)) return markdown;
    return '# ' + M.escapeInline(text) + '\n\n' + markdown;
  }

  async function run(settings) {
    const opts = settings || {};
    const notes = [];

    try {
      if (opts.expandLazyContent) {
        await Extract.expandLazyContent();
        notes.push({ key: 'conv.lazyExpanded' });
      }
      const settle = Math.min(5000, Math.max(0, Number(opts.settleMs) || 0));
      if (settle) await Extract.sleep(settle);

      const meta = Extract.collectMeta();
      let scope = null;
      let usedSelection = false;

      if (opts.preferSelection) {
        const fragment = Extract.selectionFragment();
        if (fragment) {
          scope = fragment;
          usedSelection = true;
          notes.push({ key: 'conv.selectionOnly' });
        }
      }

      if (!scope) {
        const picked = opts.mainContentOnly
          ? Extract.pickMain()
          : { node: document.body, applied: false, reason: null };
        const live = picked.node || document.body;
        if (!live) return { ok: false, error: { key: 'conv.noContent' } };

        if (picked.applied) notes.push({ key: 'conv.mainLocked', params: { ratio: picked.ratio } });
        else if (picked.reason) notes.push(picked.reason);

        const shot = Extract.snapshot(live);
        scope = shot.clone;
        if (shot.marked === -1) notes.push({ key: 'conv.tooManyNodes' });
        else if (shot.marked > 0) notes.push({ key: 'conv.hiddenSkipped', params: { count: shot.marked } });
      }

      for (const note of Extract.clean(scope, opts)) notes.push(note);

      const result = Html2Md.convert(scope, mdOptions(opts));
      let markdown = result.markdown;
      if (!markdown.trim()) return { ok: false, error: { key: 'conv.noMarkdown' } };

      if (opts.includeTitle && !usedSelection) markdown = withTitle(markdown, meta.title);

      const frontMatter = M.buildFrontMatter(meta, opts);
      const full = (frontMatter ? frontMatter + '\n' : '') + markdown + '\n';

      return {
        ok: true,
        markdown: full,
        meta,
        notes,
        warnings: result.warnings,
        stats: {
          chars: full.length,
          words: M.countWords(markdown),
          lines: full.split('\n').length,
          links: result.links,
          images: result.images,
          selection: usedSelection
        }
      };
    } catch (err) {
      return { ok: false, error: { key: 'conv.failed', params: { message: (err && err.message) || String(err) } } };
    }
  }

  window.__w2m = { run };
})();
