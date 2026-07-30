<p align="center">
  <a href="https://github.com/D3S-Gaurav/CollegePredictor/actions/workflows/ci.yml"><img src="https://github.com/D3S-Gaurav/CollegePredictor/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/github/license/D3S-Gaurav/CollegePredictor?style=flat-square" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Playwright-1.60-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" />
</p>

<h1 align="center">🎓 CollegePredictor</h1>

<p align="center">
  Rank-based college eligibility prediction for <strong>JoSAA</strong> and <strong>CSAB</strong> counselling —
  built on cutoff data scraped directly from the official archives.<br/>
  Enter your JEE rank, category and preferences; get NITs, IIITs and GFTIs banded by how likely each is.
</p>

<!-- 🔗 Live demo: TODO — add URL after deployment -->

---

## 📑 Contents

- [Why this exists](#-why-this-exists)
- [Features](#-features)
- [How prediction works](#-how-prediction-works)
- [Data provenance](#-data-provenance)
- [The scraping problem](#-the-scraping-problem)
- [Performance](#-performance)
- [Architecture](#-architecture)
- [Getting started](#-getting-started)
- [Testing](#-testing)
- [Scripts](#-scripts)

---

## 🌐 Why this exists

JoSAA publishes opening and closing ranks for every institute–branch–category
combination across six counselling rounds, but only through an ASP.NET
WebForms archive that you must query one dropdown combination at a time.
Answering a simple question — *"with rank 12,000 in OBC-NCL, where can I
actually get in?"* — means dozens of manual lookups.

This project scrapes that archive once, normalises it into PostgreSQL, and
answers the question in a single request.

---

## ✨ Features

**Prediction**
- Rank-based eligibility across JoSAA and CSAB, 2024 and 2025
- Four-band confidence model — `SAFE` / `LIKELY` / `DREAM` / `REACH`
- Home-state vs other-state (HS/OS) quota resolution
- Composite ranking blending institute tier, branch preference order, confidence and rank proximity
- Filters for round, institute type, state, branch group and confidence band
- Infinite-scroll pagination over the result set

**Beyond the search**
- **Analytics** — year-over-year cutoff trend charts per institute and branch (Recharts)
- **Compare** — side-by-side comparison of shortlisted institute–branch pairs
- **Wishlist** — bookmark results, persisted locally, exportable to CSV
- **Export** — results to PDF (jsPDF) and XLSX
- Dedicated landing pages for JoSAA, CSAB, NIT and IIIT prediction
- Light/dark theming via `next-themes`

---

## 🎯 How prediction works

A row is *eligible* when your rank is at or below its closing rank. Eligibility
alone is a weak signal though — a rank one place inside last year's cutoff is
not the same bet as one 40% clear of it. So each result is banded against the
**average closing rank across the years in scope**:

| Band | Condition | Reading |
| :--- | :--- | :--- |
| `SAFE` | rank ≤ 0.80 × avg | Comfortably inside |
| `LIKELY` | rank ≤ 1.00 × avg | Inside, but not by much |
| `DREAM` | rank ≤ 1.20 × avg | Needs the cutoff to move your way |
| `REACH` | rank > 1.20 × avg | Shown but flagged |

Results are then ordered by a composite score out of 110:

```
institute tier (0–30)   NIT 30 · IIIT 25 · GFTI 15
branch match   (0–40)   first preference 40, decaying by preference index
confidence     (0–30)   SAFE 30 · LIKELY 20 · DREAM 10 · REACH 0
rank proximity (0–10)   peaks when your rank sits at the closing rank
```

Both functions are pure and unit-tested — see
[`__tests__/prediction-engine.test.ts`](__tests__/prediction-engine.test.ts).

---

## 📊 Data provenance

Every figure below is produced by `npm run verify:data`, which queries the
live table rather than restating a claim. Regenerate after any import:

```bash
npm run verify:data
```

| Source | Year | Rounds | Institutes | Branches | Rows |
| :--- | :---: | :---: | :---: | :---: | ---: |
| JoSAA | 2024 | — | — | — | — |
| JoSAA | 2025 | — | — | — | — |
| CSAB | 2024 | — | — | — | — |
| CSAB | 2025 | — | — | — | — |
| **Total** | 2024–2025 | — | — | — | — |

> **Not yet populated.** Run the importers, then `npm run verify:data` and
> paste its markdown output over this table. Row counts should not be quoted
> anywhere until that output exists.

**Upstream source:** [`josaa.admissions.nic.in`](https://josaa.admissions.nic.in) —
`applicant/seatmatrix/openingclosingrankarchieve.aspx`

**Schema:** a single denormalised `cutoffs` table keyed by
`(counselling_type, year, round, institute, branch, quota, category, gender)`
with opening and closing rank. Denormalised deliberately — the workload is
read-only, filter-heavy and never joins.

---

## 🕷 The scraping problem

The archive is a legacy ASP.NET WebForms page, which makes it materially
harder to scrape than a JSON API. Four distinct failures had to be solved —
each documented at the top of
[`scripts/scrape-josaa.ts`](scripts/scrape-josaa.ts):

| Problem | Resolution |
| :--- | :--- |
| Playwright's bundled Chromium is refused by the host | Drive the real browser via `channel: "chrome"` |
| jQuery Chosen replaces native `<select>` with hidden markup | Inject CSS to force the underlying elements visible, then operate on them |
| Calling `__doPostBack` through `page.evaluate()` **corrupts `VIEWSTATE`** | Use Playwright's `selectOption(..., { force: true })` and wait for real navigation, letting ASP.NET manage its own postback token |
| Submit is gated behind ASP.NET client-side validation | Click with `force: true` once the validators settle |

Every dropdown combination is retried up to `MAX_RETRIES` with escalating
backoff, and each failure writes a screenshot to disk so a broken run can be
diagnosed after the fact rather than re-run blind.

---

## ⚡ Performance

**Indexes.** Eight — one per independently filterable column, plus a composite
for the query shape that actually runs:

```prisma
@@index([counsellingType])                            // idx_counselling_type
@@index([year])                                       // idx_year
@@index([round])                                      // idx_round
@@index([category])                                   // idx_category
@@index([gender])                                     // idx_gender
@@index([quota])                                      // idx_quota
@@index([closingRank])                                // idx_closing_rank
@@index([counsellingType, year, category, gender])    // idx_composite_main
```

**Batched cross-year lookup.** Confidence banding needs the historical closing
ranks for every `(institute, branch, quota)` tuple on the page. Done naively
that is one query per result row — 50 rows, 50 round trips. Instead
[`api/predict/route.ts`](src/app/api/predict/route.ts):

1. collects the unique tuples into a `Map`,
2. issues **one** `findMany` with an `OR` over those tuples,
3. groups the rows in memory by composite key,
4. resolves each row's band with an `O(1)` lookup.

One query regardless of page size.

**Other guards.** `pageSize` is capped at 200 so a crafted request cannot ask
for the whole table, and the filter payload is validated by Zod at the route
boundary before Prisma sees it.

> `EXPLAIN ANALYZE` output and measured p95 latency will be recorded in
> [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) once the dataset is loaded.

---

## 🏗 Architecture

```
Browser
  │  POST /api/predict  (Zod-validated filter payload)
  ▼
Next.js 16 App Router ── route handlers ──┐
  │                                       │
  │  lib/prediction-engine.ts             │  lib/prisma.ts
  │  (pure banding + scoring)             │  (PrismaPg driver adapter)
  ▼                                       ▼
  results, ranked                    PostgreSQL 17
                                      cutoffs table, 8 indexes
                                           ▲
                                           │ importers
                    Playwright scraper ────┘
                    (JoSAA WebForms archive)
```

```
src/
├── app/
│   ├── page.tsx                     Predictor
│   ├── analytics/                   Trend charts
│   ├── compare/                     Side-by-side comparison
│   ├── wishlist/                    Saved results
│   ├── admin/                       Data import panel
│   ├── {josaa,csab,nit,iiit}-*/     Landing pages
│   └── api/
│       ├── predict/                 Eligibility engine
│       ├── analytics/               Year-over-year trends
│       ├── branches/                Branch list per counselling type
│       └── admin/import/            Authenticated import trigger
├── components/                      UI, Radix primitives under ui/
├── lib/
│   ├── prediction-engine.ts         Pure banding and scoring
│   ├── use-local-storage-state.ts   useSyncExternalStore-backed persistence
│   ├── constants.ts                 Categories, quotas, thresholds, keys
│   └── prisma.ts                    Client singleton
└── proxy.ts                         Admin route guard

scripts/
├── scrape-josaa.ts                  Playwright scraper
├── discover-url.ts                  Locates the archive endpoint
├── import-{josaa,csab}-{2024,2025}.ts
└── verify-data.ts                   Dataset audit
```

---

## 🚀 Getting started

**Requirements:** Node 22+, PostgreSQL 17+, and Google Chrome (the scraper uses
the real browser channel).

```bash
git clone https://github.com/D3S-Gaurav/CollegePredictor.git
cd CollegePredictor
npm install

cp .env.example .env          # set DATABASE_URL
npx prisma generate
npx prisma migrate deploy
```

Load data — either import the committed archives:

```bash
npm run import:josaa-2024
npm run import:josaa-2025
npm run import:csab-2024
npm run import:csab-2025
npm run verify:data
```

…or scrape from source (slow; hits the live site):

```bash
npm run scrape-josaa
npm run import:josaa-scraped
```

Then:

```bash
npm run dev     # http://localhost:3000
```

> `src/generated/prisma` is gitignored, so `npx prisma generate` must run after
> every clone and after any schema change.

---

## 🧪 Testing

**34 unit tests** across the prediction engine and the `/api/predict` request
contract, running in CI on every push. No database required — the engine is
pure, and the API tests assert validation rejections, which Zod resolves before
any query is issued.

```bash
npm test          # vitest run
npm run test:watch
npm run typecheck # tsc --noEmit
npm run lint
```

End-to-end specs drive a real browser and therefore need a populated database,
so they sit outside the CI unit run:

```bash
npm run test:e2e                          # against localhost
E2E_BASE_URL=https://… npm run test:e2e   # against a deployment
```

---

## 📜 Scripts

| Script | Purpose |
| :--- | :--- |
| `dev` / `build` / `start` | Next.js lifecycle |
| `lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `test` / `test:watch` / `test:e2e` | Vitest units, watch mode, Playwright E2E |
| `verify:data` | Audit the dataset and emit the provenance table |
| `scrape-josaa` | Scrape the JoSAA archive |
| `import:josaa-2024` … `import:csab-2025` | Load a source/year into PostgreSQL |
| `import:josaa-scraped` | Load the scraper's own output |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Prisma tooling |

---

## 📄 License

[MIT](LICENSE)

<p align="center"><i>Built for students navigating counselling season.</i></p>
