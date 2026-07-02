# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Automated SEO QA test suite for the two nearly-identical **seminuevos.com** portals — MX (`www.seminuevos.com`) and EC (`ecuador.patiotuerca.com`). Validates what Googlebot actually sees — raw server HTML — plus JS-injected schema. Run before/after deployments to catch SEO regressions.

## Commands

```bash
npm run test            # Run all tests (production + demo), MX by default
npm run test:prod       # Production only
npm run test:demo       # Demo only
npm run test:prod:ec    # Production, EC portal
npm run test:demo:ec    # Demo, EC portal
npm run report          # Open HTML report in browser

# Run a single spec file
npx playwright test tests/seo-checklist.spec.ts --project=production

# Run tests for specific pages only
TEST_PATHS=/usados/-/autos npm run test:prod

# Combine COUNTRY with TEST_PATHS/TEST_TYPE
COUNTRY=EC TEST_TYPE=details npm run test:prod

# Run a single named test
npx playwright test --project=production -g "title"
```

## Setup

Copy `.env.example` to `.env` and set `DEMO_BASE_URL_MX` / `DEMO_BASE_URL_EC`. `PRODUCTION_BASE_URL` is derived from `COUNTRY` (default `MX`) and rarely needs to be set explicitly.

## Architecture

```
playwright.config.ts   → two projects (production, demo) reading from .env
tests/
  config.ts            → country selection (COUNTRY) + page definitions + schema expectations per page type
  seo-domain.spec.ts   → domain-level checks (robots.txt, sitemaps)
  seo-checklist.spec.ts → per-page 10-point checklist
```

### Country selection (MX / EC)

`COUNTRY` (env var, `MX` or `EC`, default `MX`) drives `tests/config.ts`:
- `productionBaseURL` — resolved per country (MX/EC domains above), overridable via `PRODUCTION_BASE_URL`.
- `demoBaseURL` — read from `DEMO_BASE_URL_MX` or `DEMO_BASE_URL_EC`.
- `pagesByType.details` — the vehicle detail path is looked up per country in `detailsPathByCountry`, since the two portals don't share a catalog. Every other page type (`home`, `hub`, `brand`, `model`) uses the same paths for both countries.

### How tests work

Each page is tested via two fetches:
1. **Raw HTTP** (`request.get`) — validates status code, canonical, meta robots, internal links (what crawlers see without JS).
2. **Browser render** (`page.goto`) — validates schema JSON-LD blocks that may be JS-injected.

Tests are generated dynamically by iterating `allPages` from `config.ts`, so every page listed there gets the full 10-point check automatically.

### Adding pages to test

Edit `tests/config.ts` → `pagesByType`. Pick the correct type (`home`, `hub`, `brand`, `model`, `details`); the type drives which JSON-LD `@type` values are required. Schema expectations live in `schemaByPageType` in the same file.

### Schema expectation system

`SchemaExpectations` has three keys:
- `required` — every listed `@type` must appear in some JSON-LD block
- `anyOf` — for each sub-array, at least one `@type` must be present (e.g. `Organization` or `AutomotiveBusiness`)
- `fields` — top-level JSON keys that must appear somewhere in the schema (used for `details` pages: `Mileage`, `PriceCurrency`, etc.)

### Severity reference (from internal checklist)

| Priority | Meaning |
|----------|---------|
| Pr0 | Stop deploy — status ≠ 200, noindex, wrong canonical, missing title/H1, absent schema |
| Pr1 | SEO review required before merge — missing meta description, multiple H1s, schema errors |
| Pr2 | Backlog ticket — minor alt text issues, schema warnings |
