# Pre-Submission Checklist — AI Bilingual Translate v1.1.0

Work top to bottom. Steps marked **[BLOCKER]** will stop the upload or guarantee a rejection.

This is the highest-scrutiny of the three extensions: a `<all_urls>` content script, broad optional
host permissions, and — the part that actually matters — **page text leaving the user's device**.
Almost all the risk is in Phase 3.

---

## Phase 0 — Before you open the dashboard

- [ ] **[BLOCKER]** Register a Chrome Web Store developer account (one-time US$5 fee) and verify the
      publisher email.
- [ ] **[BLOCKER]** Decide visibility: **Public**, **Unlisted** (link-only), or **Private**.
- [ ] **[BLOCKER]** Publish the privacy policy at a public URL. Use `PRIVACY_POLICY.md`, fill in
      the effective date and contact email (already done: 18 September 2026, inform2cary@gmail.com), and confirm it loads in a private window with
      no login. **For this extension the policy is not a formality** — a reviewer will read it and
      compare it against the code and the disclosure checkboxes.
- [ ] Bump `manifest.json` `version` if `1.1.0` has already been uploaded.
- [ ] Run `node tools/selftest.js` — it must pass clean.
- [ ] Build the package: `powershell -ExecutionPolicy Bypass -File tools\package.ps1`. Upload the
      **zip**, never the `.crx`.
- [ ] **[BLOCKER]** Confirm the zip contains no `.pem`, no `dist/`, no `tools/`, no `README.md`.
      The `dist/` folder in this repo currently contains `ai-bilingual-translate.pem` — **make
      absolutely sure it is not in the upload.** Shipping your signing key compromises the
      extension's identity permanently.
- [ ] **[BLOCKER]** Search the package for a hardcoded API key before uploading. There must be
      none. Verify the defaults in `src/lib/settings.js` ship with an empty key.
- [ ] Confirm the bilingual (EN/ZH-TW) UI work is finished and English is the default, since the
      listing copy claims it.
- [ ] Test the packaged build end to end with a real Gemini key, a real OpenAI key, and a local
      endpoint. Confirm "Test connection" works, and confirm the "Grant access to this domain"
      button appears and works for a non-declared origin.

---

## Phase 1 — Assets

| Asset | Spec | Required? | Notes |
| --- | --- | --- | --- |
| Store icon | **128×128 PNG** | **[BLOCKER]** | Already in the repo: `src/icons/icon128.png`. |
| Screenshots | **1280×800** (or 640×400), **1–5 images** | **[BLOCKER]** — at least 1 | Use 1280×800 for all. See `SCREENSHOTS.md`. |
| Small promo tile | **440×280 PNG/JPEG** | Optional | Needed for featuring eligibility. |
| Marquee promo tile | **1400×560 PNG/JPEG** | Optional | Editorial placement only. |

Asset rules, with two that are specific to this extension:

- [ ] No alpha channel on promo tiles — they must be fully opaque.
- [ ] Screenshots must show the real extension running, not a mockup or a marketing collage.
- [ ] **[BLOCKER] No Google, Gemini, OpenAI, or ChatGPT logos or wordmarks** in the icon, the promo
      tiles, or the screenshots-as-artwork. Naming them in text to say what the extension connects
      to is fine and necessary; using their branding implies partnership and will get the listing
      pulled. Your own icon must not resemble theirs.
- [ ] **[BLOCKER] Blur or redact your API key** in every screenshot of the options page. Also blur
      any internal hostname or IP address (e.g. a company LAN endpoint) you do not want public.

---

## Phase 2 — Store listing tab

- [ ] **Name and Summary** — these are **not dashboard fields**. The store reads the title from the
      manifest `name` and the summary from the manifest `description`, localized via
      `_locales/en` and `_locales/zh_TW` inside the zip. They are already set to `STORE_LISTING.md`
      §1 and §2 (with the "Bring Your Own API Key" suffix). After upload, confirm the dashboard shows
      them as expected; to change either, edit `_locales`, bump `version`, rebuild, re-upload.
- [ ] **Description** — from §3. Keep the "Privacy, plainly" section; it does real work with both
      users and reviewers.
- [ ] **Category** — `Tools` (see §4).
- [ ] **Language** — default listing language English, then add a `zh-TW` locale and paste the
      Traditional Chinese **description** from §3. Name and summary localize automatically from
      `_locales/zh_TW`.
- [ ] **Store icon** and **screenshots** uploaded.
- [ ] **Support / homepage URL** — `https://inform2cary-hub.github.io/ChromeExtension/`
      (important for a bring-your-own-key product: users need somewhere to ask setup questions)
- [ ] **Privacy policy URL** —
      `https://inform2cary-hub.github.io/ChromeExtension/privacy/ai-bilingual-translate.html`

---

## Phase 3 — Privacy practices tab

**This is where this extension lives or dies.** Read `PERMISSIONS.md` alongside this section.

- [ ] **[BLOCKER] Single purpose** — paste the sentence from `STORE_LISTING.md` §6.
- [ ] **[BLOCKER] Permission justifications** — paste each English block from `PERMISSIONS.md`:
      `storage`, `activeTab`, `scripting`, `contextMenus`.
- [ ] **[BLOCKER] Host permission justification** — paste the declared-hosts block (the four AI
      endpoints). Do not merge it with the optional-permission text.
- [ ] **[BLOCKER] Optional host permissions** — paste the separate `optional_host_permissions`
      block. This is the one most likely to be misread; the whole argument is that the address is
      chosen by the user, requested one origin at a time, and prompted by Chrome itself.
- [ ] **[BLOCKER] Remote code** — answer **No**, and paste the remote-code justification **in
      full**, including the data-versus-code distinction. Do not shorten it. Reviewers see an
      extension calling `api.openai.com` and reach for the remote-code policy; the paragraph
      explaining that JSON responses are parsed as data and inserted as text content — never
      `eval()`, never `innerHTML` — is what prevents that.
- [ ] **[BLOCKER] Data collection disclosure** — tick exactly two:
      - [x] **Website content** (the paragraph text sent for translation)
      - [x] **Authentication information** (the user's own API key, transmitted to their chosen
            provider as the request credential)
      Do **not** tick web history — the page URL and title are not sent. Do **not** tick personally
      identifiable information, location, user activity, personal communications, health, or
      financial information.
- [ ] **[BLOCKER]** Tick all three certifications. The "no sale or transfer outside approved use
      cases" certification is compatible: transmitting text to the provider **the user selected and
      authenticated to, to perform the translation they just requested** is necessary to deliver
      the single advertised feature. The privacy policy says this in the same words — keep them
      consistent.
- [ ] **[BLOCKER] Privacy policy URL** — paste your hosted URL.

---

## Expected review friction for THIS extension

Ranked by likelihood.

**1. Remote-code confusion. High.** Calling third-party APIs gets mistaken for remote code
execution more often than anything else on this list. Mitigation is already in the justification;
just do not trim it.

**2. `optional_host_permissions: http://*/*, https://*/*` read as "access to all websites".
High.** A reviewer scanning the manifest sees an all-sites pattern. The answer: it is optional, not
granted at install, never requested as a wildcard, and only ever requested for one specific origin
that the user typed into the options page. If challenged, point at `src/options/options.js`, where
`chrome.permissions.request` is called with a single derived origin behind an explicit "Grant
access to this domain" button.

**3. `<all_urls>` content script questioned under "Request minimum permissions". Medium-high.**
The answer is that no domain subset is correct for a translator — the tool is needed precisely
where the user did not expect foreign-language content. Reinforce with what the script does *not*
do: inert until the user acts, top frame only, never sees the API key, never modifies original
content.

**4. Data-disclosure scrutiny. Medium.** This is the one extension here that genuinely transmits
user data. Expect the privacy policy to actually be read. Under-disclosing is far worse than
over-disclosing: if in doubt, disclose and explain. The two ticks above are the honest answer.

**5. "Uses a third-party API without clear disclosure to users." Medium.** Prominent disclosure
needs to be in the *user-facing* listing, not only the privacy policy. The "PRIVACY, PLAINLY"
section of the description is that disclosure — do not cut it to make the copy shorter.

**6. Trademark or impersonation flag. Low-medium.** Triggered by provider logos or a name that
implies official status. Keep the name as written and the artwork your own.

**7. Review duration. Medium-high.** Broad host patterns plus data transmission usually means
extended manual review. Budget weeks for the first submission. Do not resubmit while a review is
pending — it restarts the queue.

---

## If you are rejected

**Read the email properly.** The rejection names a specific policy section — *Request minimum
permissions*, *Single purpose*, *Prominent disclosure*, *Use of permissions*, *Remote code*, or
*Privacy policy*. The body is usually boilerplate; **the policy name is the actual signal.**

**Decide: fix and resubmit, or appeal.**

- **Fix and resubmit** whenever the rejection points at something changeable: a thin justification,
  a disclosure mismatch, a missing prominent disclosure, an asset problem. Most rejections are
  this. Edit, bump the version if the package changed, submit again.
- **Appeal** (link in the rejection email, or the dashboard support form) when the reviewer has
  misread the code. For this extension that means one of three things, each with a specific reply:

  - **"Uses remote code."** State that no executable code is fetched; the package contains all
    logic. Explain that API responses are JSON parsed with `JSON.parse` and inserted as text
    content in created `<span>` elements — never `eval()`, never `new Function()`, never
    `innerHTML`. Invite them to search the package for those.
  - **"Requests access to all websites."** Distinguish the two things they have merged: the
    `<all_urls>` **content script**, which is needed because translation must work anywhere and is
    inert until the user acts, and `optional_host_permissions`, which grants **nothing at install**
    and is only ever requested one user-typed origin at a time behind a visible button. Name the
    file and function.
  - **"Collects user data without adequate disclosure."** Point at the ticked categories, the
    privacy policy URL, and the "PRIVACY, PLAINLY" section of the public description. State
    precisely what is and is not sent — text yes, URL and title no, no identifiers — and that the
    developer operates no server and receives nothing.

  Keep any appeal under a page. State the single purpose first, then the correction, then an
  invitation to verify a named file. Factual, not aggrieved.

**Do not** try to get through review by removing the optional host permissions — that would break
every local and self-hosted setup, which is a large part of why this extension exists.

**Do not** under-disclose on the data checkboxes to look cleaner. A false disclosure found later is
a takedown and a developer-account strike, not a rejection.
