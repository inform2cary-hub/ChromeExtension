# Pre-Submission Checklist — Web Page to PDF v1.0.1

Work top to bottom. Steps marked **[BLOCKER]** will stop the upload or guarantee a rejection.

---

## Phase 0 — Before you open the dashboard

- [ ] **[BLOCKER]** Register a Chrome Web Store developer account (one-time US$5 fee), and verify
      the publisher email. New accounts with unverified contact email cannot publish.
- [ ] **[BLOCKER]** Decide the visibility: **Public**, **Unlisted** (link-only), or **Private**
      (same Workspace domain). `debugger` gets the same scrutiny either way, but Unlisted is a
      reasonable way to get the extension into users' hands while a public review runs.
- [ ] **[BLOCKER]** Publish the privacy policy at a public URL. Use `PRIVACY_POLICY.md`, fill in
      the effective date and contact email (already done: 18 September 2026, inform2cary@gmail.com), and confirm the URL loads in a private window
      with no login.
- [ ] Bump `manifest.json` `version` if `1.0.1` has already been uploaded. Every upload needs a
      higher version than the last.
- [ ] Run `node tools/selftest.js` — it must pass clean.
- [ ] Build the package: `powershell -ExecutionPolicy Bypass -File tools\package.ps1`. Upload the
      **zip**, never the `.crx`.
- [ ] **[BLOCKER]** Confirm the zip contains no `.pem`, no `dist/`, no `tools/`, no `README.md`,
      and no source maps. Reviewers flag stray files, and shipping the `.pem` would compromise
      your extension identity.
- [ ] Confirm the bilingual (EN/ZH-TW) UI work is finished and English is the default, since the
      listing copy claims it.
- [ ] Load the packaged zip unpacked one last time and export a PDF from three different sites,
      including one dark-themed site and one with lazy-loaded images.

---

## Phase 1 — Assets

Prepare these before you start filling the form; the dashboard will not let you save a
half-finished listing cleanly.

| Asset | Spec | Required? | Notes |
| --- | --- | --- | --- |
| Store icon | **128×128 PNG** | **[BLOCKER]** | Already in the repo: `src/icons/icon128.png`. Check it has no transparent-edge artefacts and reads clearly at small size. |
| Screenshots | **1280×800** (or 640×400), PNG or JPEG, **1–5 images** | **[BLOCKER]** — at least 1 | Use 1280×800 for all of them; mixing sizes looks bad in the carousel. See `SCREENSHOTS.md`. |
| Small promo tile | **440×280 PNG/JPEG** | Optional | Needed if you ever want to be featured. Cheap to make — do it. |
| Marquee promo tile | **1400×560 PNG/JPEG** | Optional | Only used for editorial placement. Skip unless you have the time. |

Asset rules that get listings rejected:

- [ ] No alpha channel on promo tiles (they must be fully opaque).
- [ ] No text in screenshots claiming things the extension does not do.
- [ ] No Chrome, Google, or third-party logos used as if they endorse the product.
- [ ] Screenshots must show the real extension running, not a mockup or a marketing collage.

---

## Phase 2 — Store listing tab

- [ ] **Name and Summary** — these are **not dashboard fields**. The store reads the title from the
      manifest `name` and the summary from the manifest `description`, localized via
      `_locales/en` and `_locales/zh_TW` inside the zip. They are already set to `STORE_LISTING.md`
      §1 and §2. After upload, confirm the dashboard shows them as expected; to change either, edit
      `_locales`, bump `version`, rebuild, re-upload.
- [ ] **Description** — from §3.
- [ ] **Category** — `Tools` (see §4).
- [ ] **Language** — set the default listing language to English, then add a `zh-TW` locale and
      paste the Traditional Chinese **description** from §3. Name and summary localize automatically
      from `_locales/zh_TW`.
- [ ] **Store icon** and **screenshots** uploaded.
- [ ] **Support / homepage URL** — `{{HOMEPAGE_URL}}` if you have one. Optional, but a listing with
      no support link looks abandoned.

---

## Phase 3 — Privacy practices tab

This is where this extension lives or dies.

- [ ] **[BLOCKER] Single purpose** — paste the sentence from `STORE_LISTING.md` §6. One sentence.
      Do not list features here; a multi-purpose-sounding answer triggers a "Purpose" rejection.
- [ ] **[BLOCKER] Permission justifications** — paste each English block from `PERMISSIONS.md`:
      `debugger`, `downloads`, `offscreen`, `activeTab`, `scripting`, `storage`, `contextMenus`.
      Every declared permission needs a non-empty justification or the form will not submit.
- [ ] **[BLOCKER] Remote code** — answer **No**, and paste the remote-code justification.
- [ ] **Host permissions** — none declared. If the field appears, use the text in `PERMISSIONS.md`.
- [ ] **[BLOCKER] Data collection disclosure** — tick **nothing** in the data-type list. This
      extension collects none of: personally identifiable information, health information,
      financial and payment information, authentication information, personal communications,
      location, web history, user activity, website content.
- [ ] **[BLOCKER]** Tick all three certifications:
      - I do not sell or transfer user data to third parties, outside of approved use cases
      - I do not use or transfer user data for purposes unrelated to my item's single purpose
      - I do not use or transfer user data to determine creditworthiness or for lending purposes
- [ ] **[BLOCKER] Privacy policy URL** — required whenever any permission touches user data. Paste
      your hosted URL.

---

## Phase 4 — Reviewer notes

There is no dedicated "notes to reviewer" field, but the **justification fields are read by a
human**. Make the `debugger` field do that job — it already does. Optionally add this line at the
end of the `debugger` justification if you want to be maximally cooperative:

```
To verify: the only chrome.debugger calls in the package are in src/background/service-worker.js
(attach, detach, and sendCommand), and the only CDP methods passed to sendCommand are
"Page.enable", "Page.printToPDF" and "Emulation.setEmulatedMedia".
```

That is a checkable claim, and it is true — which is exactly why it helps.

---

## Expected review friction for THIS extension

Ranked by likelihood.

**1. `debugger` — "Request minimum permissions" / "Purpose" rejection. High likelihood.**
`debugger` is one of the most heavily scrutinised permissions on the store, and the most common
reviewer reaction is to assume there must be a lesser way. There is not. If challenged, respond
with the concrete alternatives and why each fails:
- `chrome.tabs.captureVisibleTab` → produces an image; the resulting "PDF" would have no
  selectable, searchable text, which is the entire point of the product.
- `chrome.printing` → ChromeOS printer submission, not PDF generation, and not available here.
- `window.print()` → opens the system dialog; cannot be automated, cannot apply the user's saved
  paper/margin/header/page-range settings, and cannot hand a file back to the extension.
- Rendering the page in a bundled JS PDF library → would require reimplementing Chrome's layout
  engine and would produce different, worse output. Not equivalent.

**2. Review duration. High likelihood.** Extensions requesting `debugger` routinely go to extended
manual review. Budget weeks, not days, for the first submission. Do not resubmit while a review is
pending — it restarts the queue.

**3. "Does not match single purpose" from the fallback print-dialog button. Medium.** The popup's
"use Chrome's print dialog instead" button could look like a second feature. It is not — it is a
fallback for the same purpose. If asked, say: it is an alternative path to the same single
outcome, for pages where a debugger cannot be attached.

**4. Screenshot rejection. Low-medium.** Chrome's own "is debugging this browser" infobar will be
visible in any honest screenshot of an export in progress. **Leave it in.** Cropping it out to make
the product look cleaner is the kind of thing that reads as concealment. Better: caption it.

**5. Missing privacy policy or mismatched disclosure. Low, but fatal.** The policy says "no data
collected"; the dashboard checkboxes must say the same. Any mismatch between the two is an
automatic rejection.

---

## If you are rejected

**Read the email properly.** The rejection names a specific policy section — for example
*Request minimum permissions*, *Single purpose*, *Prominent disclosure*, or *Privacy policy*. The
body text is often boilerplate; the **policy name is the actual signal.** Everything else in the
email is template.

**Decide: fix and resubmit, or appeal.**

- **Fix and resubmit** when the rejection points at something you can change: an unclear
  justification, a missing disclosure, a screenshot problem, an over-broad description. This is the
  right answer for most rejections. Edit the field, bump the version if the package itself changed,
  and submit again.
- **Appeal** (the link is in the rejection email, or via the dashboard's support form) when you
  believe the reviewer has misread the code — which for this extension most likely means they
  assumed `debugger` could be replaced by a lesser permission. Appeals are read by a different
  person, so:
  - State the single purpose in one sentence.
  - State that `Page.printToPDF` is reachable only via CDP and `chrome.debugger` is the only CDP
    surface Chrome exposes to extensions.
  - List the alternatives you evaluated and why each fails (copy the four bullets above).
  - Point at the exact file and the exact three CDP method names. Invite verification.
  - Note the attach-on-user-action / detach-in-finally lifecycle and Chrome's own infobar.
  - Keep it under a page. Be factual, not aggrieved.

**Do not** silently remove the `debugger` permission to get through review. Without it the
extension cannot produce a text-based PDF, and shipping a degraded product is worse than waiting.

**Do not** submit the same package unchanged with no explanation. That reads as an attempt to get a
different reviewer, and it works against you.
