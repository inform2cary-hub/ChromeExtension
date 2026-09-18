# Pre-Submission Checklist — Web Page to Markdown v1.0.0

Work top to bottom. Steps marked **[BLOCKER]** will stop the upload or guarantee a rejection.

This is the lowest-risk of the three extensions: no host permissions, no `debugger`, no network.
Most of the work here is filling the form accurately rather than defending anything.

---

## Phase 0 — Before you open the dashboard

- [ ] **[BLOCKER]** Register a Chrome Web Store developer account (one-time US$5 fee) and verify the
      publisher email.
- [ ] **[BLOCKER]** Decide visibility: **Public**, **Unlisted** (link-only), or **Private**.
- [ ] **[BLOCKER]** Publish the privacy policy at a public URL. Use `PRIVACY_POLICY.md`, fill in
      the effective date and contact email (already done: 18 September 2026, inform2cary@gmail.com), and confirm it loads in a private window.
- [ ] Bump `manifest.json` `version` if `1.0.0` has already been uploaded.
- [ ] Run `node tools/selftest.js` — all 298 checks must pass.
- [ ] Build the package: `powershell -ExecutionPolicy Bypass -File tools\package.ps1`. Upload the
      **zip**.
- [ ] **[BLOCKER]** The packaging script already checks that the injected files listed in
      `constants.js` are present in the zip — **do not skip it and zip by hand.** Those files are
      not referenced from `manifest.json`, so if one is missing the extension fails silently at
      runtime and you will ship a broken build.
- [ ] **[BLOCKER]** Confirm the zip has no `.pem`, no `dist/`, no `tools/`, no `README.md`.
- [ ] Confirm the bilingual (EN/ZH-TW) UI work is finished and English is the default, since the
      listing copy claims it.
- [ ] Smoke-test the packaged build on five different site shapes: a long-form article, a docs page
      with code blocks, a page with tables, a page with MathJax or KaTeX, and a page with
      lazy-loaded images. Check save, copy, and preview each time.

---

## Phase 1 — Assets

| Asset | Spec | Required? | Notes |
| --- | --- | --- | --- |
| Store icon | **128×128 PNG** | **[BLOCKER]** | Already in the repo: `src/icons/icon128.png`. |
| Screenshots | **1280×800** (or 640×400), **1–5 images** | **[BLOCKER]** — at least 1 | Use 1280×800 for all. See `SCREENSHOTS.md`. |
| Small promo tile | **440×280 PNG/JPEG** | Optional | Required to be eligible for featuring. Worth making. |
| Marquee promo tile | **1400×560 PNG/JPEG** | Optional | Editorial placement only. Skip unless you have time. |

Asset rules that get listings rejected:

- [ ] No alpha channel on promo tiles — they must be fully opaque.
- [ ] Screenshots must show the real extension running, not a mockup or a marketing collage.
- [ ] No third-party logos (Obsidian, Notion, Hugo) used in a way that implies endorsement or
      partnership. You may **say** the output works in Obsidian; do not put its logo on a tile.
- [ ] No text in screenshots claiming things the extension does not do.

---

## Phase 2 — Store listing tab

- [ ] **Name and Summary** — these are **not dashboard fields**. The store reads the title from the
      manifest `name` and the summary from the manifest `description`, localized via
      `_locales/en` and `_locales/zh_TW` inside the zip. They are already set to `STORE_LISTING.md`
      §1 and §2. After upload, confirm the dashboard shows them as expected; to change either, edit
      `_locales`, bump `version`, rebuild, re-upload.
- [ ] **Description** — from §3.
- [ ] **Category** — `Tools` (see §4).
- [ ] **Language** — default listing language English, then add a `zh-TW` locale and paste the
      Traditional Chinese **description** from §3. Name and summary localize automatically from
      `_locales/zh_TW`.
- [ ] **Store icon** and **screenshots** uploaded.
- [ ] **Support / homepage URL** — `{{HOMEPAGE_URL}}` if you have one.

---

## Phase 3 — Privacy practices tab

- [ ] **[BLOCKER] Single purpose** — paste the sentence from `STORE_LISTING.md` §6.
- [ ] **[BLOCKER] Permission justifications** — paste each English block from `PERMISSIONS.md`:
      `activeTab`, `scripting`, `downloads`, `offscreen`, `clipboardWrite`, `storage`,
      `contextMenus`. Every declared permission needs a non-empty justification.
- [ ] **[BLOCKER] Remote code** — answer **No**, and paste the remote-code justification.
- [ ] **Host permissions** — none declared. If the field appears, use the text in `PERMISSIONS.md`.
- [ ] **[BLOCKER] Data collection disclosure** — tick **nothing**. In particular, do **not** tick
      *Website content*. It is tempting, because the extension obviously reads the page — but that
      checkbox means you **collect** website content, i.e. transmit it off the user's device. This
      extension does not. Ticking it would be a false disclosure that contradicts your own privacy
      policy, and mismatches between the two are an automatic rejection.
- [ ] **[BLOCKER]** Tick all three certifications (no sale/transfer, nothing unrelated to single
      purpose, not for creditworthiness).
- [ ] **[BLOCKER] Privacy policy URL** — paste your hosted URL.

---

## Expected review friction for THIS extension

Ranked by likelihood. Overall risk: **low**.

**1. `clipboardWrite` questioned. Low-medium.** It is an uncommon permission and reviewers
sometimes ask what it is for. The justification already answers it: Copy is a headline feature,
it only ever writes, and `clipboardRead` is deliberately not requested. Nothing more is needed.

**2. `offscreen` questioned. Low-medium.** Reviewers occasionally ask why a converter needs an
offscreen document. The answer is a platform constraint, not a design choice: an MV3 service worker
has no DOM, so it cannot create a Blob URL and cannot write to the clipboard. The justification
spells this out. If pressed, add that the offscreen document has access to no `chrome.*` API other
than `chrome.runtime`, which is a Chrome-enforced limit, not a promise.

**3. Data-disclosure mismatch on *Website content*. Low, but fatal if it happens.** See the
warning in Phase 3. The single most likely way to get this extension rejected is to over-disclose
out of caution and then contradict yourself.

**4. Single-purpose question from having three outputs. Low.** Save, copy, and preview can read as
three features. They are three destinations for one conversion. The single-purpose sentence in
`STORE_LISTING.md` §6 is deliberately worded to make that clear — use it verbatim.

**5. Review duration. Low.** With no host permissions, no `debugger`, and no data collection, this
should clear faster than the other two extensions in this repo. Days rather than weeks is realistic,
though nothing is guaranteed.

---

## If you are rejected

**Read the email properly.** The rejection names a specific policy section — for example *Request
minimum permissions*, *Single purpose*, or *Privacy policy*. The body text is usually boilerplate;
**the policy name is the actual signal.**

**Decide: fix and resubmit, or appeal.**

- **Fix and resubmit** for anything you can change — an unclear justification, a screenshot problem,
  a disclosure mismatch, an over-broad description. This covers almost every rejection this
  extension is likely to receive. Edit the field, bump the version if the package itself changed,
  submit again.
- **Appeal** (link in the rejection email, or the dashboard support form) only when you believe the
  reviewer misread the code — most plausibly, an assumption that the extension transmits page
  content somewhere. If so:
  - State the single purpose in one sentence.
  - State plainly: the extension declares no host permissions, contains no `fetch`, no
    `XMLHttpRequest`, and no `WebSocket`, and therefore cannot make a network request at all.
    Invite them to verify by searching the package.
  - Explain that reading page content is processing, not collection: the Markdown goes to a local
    file, the clipboard, or a preview tab, and nothing leaves the device.
  - Keep it under a page. Factual, not aggrieved.

**Do not** resubmit an unchanged package with no explanation — it reads as queue-shopping.
