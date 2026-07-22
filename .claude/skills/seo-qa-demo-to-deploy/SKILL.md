---
name: seo-qa-demo-to-deploy
description: Triage SEO-project Jira tickets in "QA Demo" status, implement whatever test/code changes they need, validate the fix in the demo environment, comment on the ticket, and move it to "DEPLOY[QA PROD]". Use this whenever the user asks to work through QA Demo tickets, "revisa los tickets de QA Demo", "implementa lo que falte para el checklist SEO", or wants a batch of SEO tickets triaged and validated in demo before they go to prod QA.
---

# SEO: QA Demo → Deploy[QA PROD]

Moves SEO Jira tickets from `QA Demo` to `DEPLOY[QA PROD]`. This is the **first half** of the release pipeline — the second half (`DEPLOY[QA PROD]` → `Finalizada` / `Subido a producción`) is a separate skill: `seo-validate-prod-close`.

This skill is investigation- and judgment-heavy, not a mechanical script. Implementing a fix for a SEO ticket often requires real engineering decisions (new test capabilities, scope calls about what's even testable). **Pause for the user's confirmation before writing code, and again before writing anything to Jira.** Don't try to run this end-to-end without checkpoints — the value here is in getting the triage and evidence right, not in speed.

## 1. Setup

- Jira cloud ID: `latamautos.atlassian.net`
- Jira project: `SEO`
- Repo: this repo (`SEO-Seminuevos`), an SEO QA Playwright test suite for two portals — MX (`www.seminuevos.com`) and EC (`ecuador.patiotuerca.com`). See `CLAUDE.md` for the architecture (`tests/config.ts`, `tests/seo-checklist.spec.ts`, etc.) before touching test code.
- Find candidate tickets:
  ```
  project = SEO AND status = "QA Demo" ORDER BY updated DESC
  ```
  (Note the exact status string — no typos like "QA DEMO" in caps, it won't match.)
- Each SEO ticket has a `Cloners` issue link pointing outward to a `LATAM-xxx` ticket (a JSM/service-desk ticket). This skill does **not** touch the LATAM ticket — that only happens in `seo-validate-prod-close`, after prod validation.
- Each ticket has a `Portal` field that tells you which country to test against: `Seminuevos` → `COUNTRY=MX`, `Patiotuerca` → `COUNTRY=EC`. Read this field for every ticket before implementing/validating — don't guess the country from the ticket text.

## 2. Triage each ticket

For every ticket found, decide which bucket it falls in. Say this triage out loud to the user before doing anything else — don't silently decide and start coding.

- **Testable via the existing Playwright checklist** — e.g. a missing schema field, a wrong `<html lang>`, a missing meta tag. Usually just needs a new field/check in `tests/config.ts` + `tests/seo-checklist.spec.ts`.
- **Testable but needs new test infrastructure** — e.g. "schema must be in the raw server HTML, not just client-injected" needed capturing the raw document response body (not just `page.content()`, which reflects the post-hydration DOM). Design the new capability, explain the tradeoff, and confirm before implementing — these are genuine architecture decisions, not boilerplate.
- **Out of scope for this repo** — performance/Core Web Vitals tickets (JS execution time, main-thread work, TTFB, render-blocking CSS) are Lighthouse/PageSpeed findings, not something the raw-HTML/schema checklist here can validate meaningfully as a pass/fail gate (Lighthouse numbers are noisy run-to-run). Don't try to shoehorn a Lighthouse assertion into the Playwright suite as a hard gate. If the user wants these validated at all, that's a separate manual/scripted process outside `npm run test` — see `scripts/lighthouse-audit.mjs` for the existing one-off Lighthouse runner (`TARGET=demo|production`, `COUNTRY=MX|EC`).
- **Ambiguous / can't be validated as an isolated page load** — e.g. a ticket about a redirect behavior triggered by a specific navigation flow, not by loading one URL fresh. Flag it and ask rather than guessing.

## 3. Implement (with a checkpoint)

For tickets that need code:
- Read `tests/config.ts` and `tests/seo-checklist.spec.ts` first — most new checks are additive entries in `schemaByPageType` or small new sections in the checklist, following the existing lettered-section pattern (A. status code, B. meta robots, ... K, L, ...). Keep new sections in alphabetical order in the file, don't just append at the end.
- Country-specific requirements (a ticket that only applies to EC, say) should be modeled the same way `expectedHtmlLangByCountry` / `localSchemaFieldsByCountry` are — a `Partial<Record<Country, ...>>` map, empty/absent for the country that doesn't need the check, so the check silently doesn't apply rather than needing an `if` scattered through the spec file.
- **Before implementing something non-trivial (new capture mechanism, new spec file, broken-link crawling strategy), stop and present the design + tradeoff to the user.** Past examples of decisions that needed a check-in: whether to capture raw pre-JS HTML at all, whether broken-link checks should use a fixed URL list vs. a generic crawl, whether to treat a redirect chain's final cross-domain status as pass/fail.
- After implementing, run the relevant spec against **demo** (`COUNTRY=MX` or `EC`, per the ticket's `Portal` field — see §1, `--project=demo`), not against production — this skill's job stops at DEPLOY[QA PROD], prod validation is the other skill.

## 4. Validate in demo — watch for false negatives

Before trusting a "fails" result, rule out that the test itself is broken, not the site:

- **Cloudflare**: `request.get()` is blocked by Cloudflare's bot challenge on this site — every check must use a real browser navigation (`page.goto` + `page.content()`), per the existing pattern in `seo-checklist.spec.ts`.
- **Hidden iframes counted as "document" responses**: pages that embed auth/SSO iframes (e.g. Keycloak's `silent-check-sso.html`) fire a `response` event with `resourceType() === 'document'` on the same origin. If you're capturing "the" document response by matching on resourceType + origin, you'll silently grab the iframe's HTML instead of the real page. Always add `response.frame() === page.mainFrame()` to that filter. This exact bug produced a false "no schema in source HTML" result once — don't repeat it.
- **JSON-LD injection timing**: schema is injected client-side after `load` and can take a couple of seconds to mount — a `page.content()` taken immediately can show 0 `ld+json` blocks even when the schema is present later. The existing suite already waits for `document.querySelectorAll('script[type="application/ld+json"]').length > 0` with a timeout before capturing.

## 5. Comment and transition

Once a fix is validated in demo, for that specific ticket:

1. Add a Jira comment on the SEO ticket confirming what was checked in demo, with concrete evidence (an actual value found — the JSON-LD snippet, the `<html lang>` value, the status code — not just "looks good"). Keep it short and casual, no mention of this repo's internal file/test names — the reader is SEO/PM audience, not an engineer.
2. Look up the available transitions with `getTransitionsForJiraIssue` and transition to the one whose target status name is `DEPLOY[QA PROD]` — don't hardcode a transition ID, workflow transition IDs aren't guaranteed stable across issue types.

## 6. Batch execution rules

- **Show the full list of tickets and your proposed comment text before writing anything to Jira.** The user will often want to adjust wording, tone, or exclude specific tickets (e.g. "skip this one, more changes are still coming").
- If the user says to skip/omit a ticket, skip it **entirely** — no comment, no transition. Don't half-apply a step.
- Fire independent Jira writes (comments, transitions) in parallel batches once confirmed — no need to serialize tickets that don't depend on each other.
