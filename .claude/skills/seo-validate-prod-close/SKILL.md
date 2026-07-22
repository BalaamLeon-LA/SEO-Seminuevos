---
name: seo-validate-prod-close
description: Validate SEO-project Jira tickets in "DEPLOY[QA PROD]" status against production, comment on the ticket, move it to "Finalizada", then comment on and transition its linked LATAM-xxx "Cloners" ticket to "Subido a producción". Use this whenever the user asks to close out DEPLOY[QA PROD] tickets, validate a deploy in production, confirm fixes are live, or wants a batch of SEO tickets finalized after a production release.
---

# SEO: Deploy[QA PROD] → Finalizada / Subido a producción

Second half of the release pipeline. The first half (`QA Demo` → `DEPLOY[QA PROD]`) is a separate skill: `seo-qa-demo-to-deploy`. By the time a ticket reaches this stage, the fix is assumed already implemented and merged — this skill only **validates and closes out paperwork**, it should not need to write test/product code. If validation reveals the fix isn't actually there, stop and say so instead of implementing it inline (send it back, don't quietly do the other skill's job).

## 1. Setup

- Jira cloud ID: `latamautos.atlassian.net`
- Find candidate tickets:
  ```
  project = SEO AND status = "DEPLOY[QA PROD]" ORDER BY updated DESC
  ```
  (Exact string, note there's no space before `[`.)
- For each ticket, get its `issuelinks` and find the one of type `Cloners` — the `outwardIssue` is the linked `LATAM-xxx` ticket (a JSM/service-desk request). Every SEO ticket in this stage should have exactly one.
- Each ticket has a `Portal` field that tells you which country to validate against: `Seminuevos` → `COUNTRY=MX`, `Patiotuerca` → `COUNTRY=EC`. Read this field for every ticket before validating — don't guess the country from the ticket text.

## 2. Validate in production

- Re-run whatever check validated the ticket in demo (see `seo-qa-demo-to-deploy` for what that was), but against **production** (`--project=production`, `COUNTRY=MX` or `EC` per the ticket's `Portal` field — see §1).
- For schema/meta/markup tickets: this is the Playwright checklist (`tests/seo-checklist.spec.ts`, `tests/seo-broken-links.spec.ts`, etc.) — same false-negative traps apply as in the demo skill (Cloudflare needs real browser nav, filter document responses by `response.frame() === page.mainFrame()` to avoid picking up hidden auth iframes, JSON-LD injection can take a few seconds to mount).
- For performance tickets (TTFB, JS execution time, main-thread work, render-blocking CSS): use `scripts/lighthouse-audit.mjs` with `TARGET=production`. These numbers are noisy — **run at least twice** before trusting a number, and if a metric looks worse than the ticket's original baseline, don't assume the fix regressed:
  - Open the saved JSON report in `lighthouse-reports/` and check the `bootup-time` / `mainthread-work-breakdown` audit's per-URL breakdown. If the time is dominated by the site's own first-party scripts, that's a real signal. If it's dominated by things like ad tech, GTM, FundingChoices, Clarity, or other third-party analytics/ad scripts, that's largely outside the fix's control and varies a lot run to run — don't fail the ticket over it.
  - Also sanity-check that Lighthouse actually reached the real page and not a bot-challenge/interstitial: check the `network-requests` audit's main document entry has a normal status/size for the real page (a challenge page is usually tiny). If in doubt, this is exactly the kind of ambiguity to bring to the user rather than resolve unilaterally (see below).
- Broken-link / auth-gated route checks: a fix might redirect an anonymous user through a login flow that lands on a **different domain** (e.g. an SSO provider). Don't require the final status to be `200` on the original domain — check that no response *on the site's own domain* in the redirect chain was a 4xx/5xx.

## 3. When the result is ambiguous — stop, don't decide alone

If a ticket's production numbers/behavior don't clearly confirm the fix (metric worse than baseline, a flaky result, an inconclusive redirect chain), **do not** unilaterally mark it pass or fail. Present the evidence to the user (what you measured, what the original ticket claimed, why it's ambiguous) and let them decide how to proceed — including whether to close it anyway with a more neutral comment, hold it, or investigate further (e.g. confirm it's not a Cloudflare/bot-detection artifact before concluding a real regression). This came up for real: two performance tickets showed worse numbers in prod than their original baseline, turned out to be legitimate third-party-script variance rather than a regression, and the resolution (close anyway, softer comment, let the SEO consultant have the final word) was the user's call, not something to infer.

## 4. Comment and transition — two different tickets, two different audiences

For each ticket that the user confirms should proceed:

1. **SEO ticket** (Jira board, engineering-facing): short and simple. Just confirm it was validated in production — don't restate the technical evidence in detail here, that's for the demo-stage comment. Typical phrasing: "Validado en producción." Optionally with a one-line specific if there's something worth calling out (e.g. "Validado en producción: el `<html>` ya trae `lang=\"es-EC\"`.").
2. Transition the SEO ticket: look up transitions via `getTransitionsForJiraIssue` and use the one targeting **Finalizada** — don't hardcode the transition ID.
3. **LATAM ticket** (JSM, read by the SEO consultant — not an engineer): different audience, different message. They don't need "validado en producción" restated (they didn't file it as a validation request) — they need to know the requested change was made and shipped: "Se realizaron los cambios solicitados y ya están en producción." If the result was ambiguous and the user chose to close anyway (see §3), keep it to this same neutral phrasing — don't claim specific metrics improved if that's not settled; let the SEO consultant's own tests be the source of truth on quality.
4. Transition the LATAM ticket: look up transitions and use the one targeting **Subido a producción**.

## 5. Batch execution rules

- Show the full list of tickets, their linked LATAM tickets, and the validation results (pass/ambiguous/fail) **before** writing anything to Jira.
- If the user says to omit a ticket (e.g. "more changes are still coming to that one"), skip it **completely** — no comment and no transition on either the SEO ticket or its LATAM clone.
- Independent tickets' comments/transitions can be fired in parallel once confirmed.
- Get the exact final wording confirmed before firing a batch of comments — message tone/wording is the thing most likely to need a round of correction, so it's cheaper to nail it on a couple of examples first than to redo a large batch.
