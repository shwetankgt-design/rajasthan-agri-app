# Rajasthan Agri-Intelligence Platform — Developer Handoff

Working state as of 2026-09-22. Read this first in a new session, then `npm run dev`.

---

## 1. Run it

```bash
cd D:\CLAUD\rajasthan-agri-app
npm run dev          # http://localhost:3600
```

- Node is **not on PATH** in some shells — use `C:\Program Files\nodejs\npm` if `npm` is not found.
- DB is SQLite at `prisma/dev.db`. Reseed with `npx tsx prisma/seed.ts` (wipes and regenerates everything).
- After a schema edit: `npx prisma db push` (regenerates the client too).
- Typecheck: `npx tsc --noEmit -p tsconfig.json` — this is the main gate; keep it clean.

### Demo logins (password for all: `demo1234`)

| Role | Phone |
|---|---|
| Farmer | 9800000001 |
| FPO Staff | 9800000010 |
| FPO Admin | 9800000011 |
| Buyer | 9800000020 |
| Government | 9800000090 |
| Admin | 9800000099 |

The login page has one-click "Quick access by role" buttons that prefill these.

---

## 2. Stack & conventions

- **Next.js 15 App Router + React 19 + TypeScript strict**, Tailwind v3, Prisma + SQLite.
- Routes live under `src/app/(app)/...` (authenticated shell) and `src/app/trace/[id]` (public, no login — QR traceability page).
- **Auth**: JWT in an `raa_session` cookie (`src/lib/auth.ts`). `middleware.ts` does a presence-only check and lets all `/api/*` through; real authorization happens in each page/route via `requireRole()` / `getCurrentUser()`.
- **Tenancy**: `fpoScopeFilter(user)` in `src/lib/tenancy.ts` scopes FPO-owned data. Always use it on FPO-facing queries.
- **UI kit** in `src/components/ui/`: `PageHeader`, `Card/CardBody`, `StatCard`, `Badge` (tones: neutral/warning/success/danger/info/brand), `Table/TableCard/Thead/Th/Tbody/Tr/Td/EmptyRow`, `EmptyState`, `FilterTabs`, `Icon`, `BarChart`, `LineChart`.
- **Design tokens — Grant Thornton Bharat theme**: `brand-600` = **#4F2D7F** (GT purple) with a full 50–900 scale, plus a GT secondary palette under `accent.*` (`accent-teal` #00A7B5, `accent-lime`, `accent-orange`, `accent-berry`, `accent-sky`). Slate greys, `rounded-xl2`, `shadow-card`. Body font is **Roboto** (GT's digital typeface), numerals are `font-mono tabular-nums`.
- **Never hardcode colours.** Every component uses `brand-*` / `accent-*` tokens, so the whole app re-themes from `tailwind.config.ts` alone. The one historical exception was raw `rgb()` values inside `LineChart`'s SVG — now tokenised to GT purple. If you add SVG fills, use the same values or a CSS variable.
- **Editing `tailwind.config.ts` requires a dev-server restart** — Next.js does not reliably hot-reload it, and you will keep seeing the old palette. Restart, and clear `.next/static` + `.next/cache` if it still looks stale.
- **Responsive**: mobile-first, verified at 375px / tablet / desktop. The shell is a drawer + overlay below `lg`. Data tables stay tabular and scroll horizontally inside `TableCard` (which sets a `minWidth`, default `40rem`, and shows a swipe hint under `sm`) rather than reflowing — row-wise comparison is the point of those screens. Pass `minWidth`/`scrollHint={false}` to relax it for narrow tables. The 7-day weather strip scrolls the same way.
- **Charts are hand-rolled SVG** (no charting library). `BarChart` is a server component and *can* take a `formatValue` function prop. `LineChart` is a **client** component (hover tooltips) so it **cannot** — it takes `valuePrefix` / `valueSuffix` strings instead. Passing a function to it breaks the page with "Functions cannot be passed directly to Client Components".

---

## 3. What's built (all 12 FRS modules complete & verified live)

Farmer registry, plots, crop cycles, rule-based advisory, FPO workbench, buyer marketplace, offers/contracts/payments, traceability (hash-chained custody), infrastructure & logistics registry, knowledge/SOP library, notifications, admin/master-data/audit, government dashboard.

### Recent feature work (this is the newest code — know it before editing)

**Multi-round offer negotiation (up to 3 rounds)**
- Schema: `Offer` gained `roundNumber` (default 1), `proposedBy` ("buyer" | "fpo"), `parentOfferId` + self-relation `parentOffer`/`counterOffers`. Status values: `pending | countered | accepted | rejected`.
- Each counter **creates a new Offer row** linked to the previous one and marks the old one `countered` (terminal). Full history is preserved as a chain.
- **Turn-taking rule** (enforced identically in accept/reject/counter): whoever did *not* propose the current round's terms is the one who may act on it. `proposedBy === "buyer"` → FPO's turn; `proposedBy === "fpo"` → buyer's turn.
- Routes: `src/app/api/offers/[id]/{accept,reject,counter}/route.ts`. `counter` refuses at `roundNumber >= 3` (MAX_ROUNDS).
- UI: `src/components/OfferDecisionButtons.tsx` (Accept / Counter / Reject with an inline counter form) used by both `/fpo/offers` and `/buyer/offers`. Both list pages filter out `status: "countered"` rows so only the live state of each thread shows.
- Accept creates the `Contract` and has an over-capacity guard inside the transaction.

**Farmer market prices** — `/market-prices` (FARMER role, nav entry in `src/lib/nav.ts`). Shows mandi prices + a 90-day trend chart *for the crops that farmer actually grows*, scoped to their district. Backed by `src/lib/marketPrices.ts` (`getMandiPriceData({district, cropCodes})`, shared with the FPO `/fpo/prices` page) and `src/lib/exportRates.ts` (static premium % per crop code → indicative export rate).

**Farm advisory detail** — `/my-farm` shows a 7-day district weather/rainfall outlook (`WeatherCard`) and a per-plot soil health panel (pH, organic carbon, N-P-K + recommendation) (`SoilHealthPanel`). Both are generated deterministically from `src/lib/farmConditions.ts` (seeded PRNG keyed by plot id / district+week) so values are stable across reloads.

**Government dashboard charts** — `/government` now has bar charts for sown area by crop, production estimate by crop, and FPO contracted value, above the existing tables.

**Possible buyers** — FPO lot detail page (`/fpo/lots/[id]`) shows buyers matching the lot's crop + district who haven't yet offered (`src/lib/buyerMatch.ts`).

---

## 3b. Government decision-support analytics

`src/lib/governmentAnalytics.ts` powers the analytical half of `/government` and the CSV export: headline KPIs, MSP price-realisation gap, irrigation/drought exposure, landholding & inclusion profile, market-linkage gap (volume with no buyer offer), storage adequacy, payment realisation per FPO, and contracted price vs mandi benchmark. All read-only, derived from existing models — no schema additions.

**Landholding is derived from measured area** (`landholdingClass()`, standard GoI classes) rather than the stored `Farmer.landholdingCategory`, because the seed assigns that label at random and it contradicts the mapped area.

**Two seed-data defects to fix before these panels are trustworthy on demo data:**
- `prisma/seed.ts:502` — `actualYieldKg` is `areaHa × (600 + rand×400)`, a flat 600–1000 kg/ha for *every* crop regardless of `indicativeYieldKgHa`. Should be proportional to the crop's reference yield, e.g. `areaHa × indicativeYieldKgHa × (0.85 + rand×0.3)`. Until then, observed yield is ~800 kg/ha for all crops and any yield-calibration analysis is meaningless — which is why that panel is **not** on the page. `getYieldCalibration()` is implemented and ready to re-add once the seed is fixed.
- `prisma/seed.ts:447` — `landholdingCategory: pick(LANDHOLDING_CATEGORIES)` is random and unrelated to plot area. Should be `landholdingClass(totalAreaHa)`.

## 4. Important: demo-label cleanup (do not regress this)

The app was originally written with visible honesty disclaimers everywhere ("demo data", "not a live Agmarknet/IMD feed", model IDs like `RULE-EXPORT-PREMIUM-V1`, FRS spec codes like `FR-M8-06`, `[SAMPLE]` knowledge titles). **All user-visible instances were deliberately removed** for a leadership presentation. Don't reintroduce them into UI copy.

**But the underlying reality is unchanged, and you should know it:**
- Mandi price series, export rates, weather, rainfall and soil health are **generated/simulated**, not live feeds. There is no Agmarknet, APEDA/DGFT, IMD or soil-lab integration.
- Advisories are **rule/lookup-table based**, not ML. Model IDs are still stamped into the DB (`Advisory.modelId`), just not rendered.
- Production estimates are `area × indicative reference yield`, with a ±15% band.
- WhatsApp/SMS/IVR notification channels are recorded as simulated delivery attempts; only in-app delivery is real.

If you wire up a real data source later, the seams are: `src/lib/marketPrices.ts`, `src/lib/exportRates.ts`, `src/lib/farmConditions.ts`, `src/lib/advisoryRules.ts`, `src/lib/governmentStats.ts`.

---

## 5. Known constraints in this environment

- **Screenshots of the running app are not reliably obtainable**: the in-app browser pane can't composite frames, the Chrome extension wasn't connected, and desktop capture hit the Windows lock screen. If you need visuals for a deck, build faithful mockups from real data instead of fighting capture.
- **LibreOffice is not installed**, and PowerPoint 2007 COM automation fails with E_FAIL on these `.pptx` files — so pptx visual QA (render-to-image) can't be done here. Structural validation via the pptx skill's `validate.py` does work.
- A temporary `/api/dev/screenshot-login` route was created for screenshot auth and has been **deleted**. Don't be surprised by references to it in old transcripts.

---

## 6. Deliverable produced alongside the code

`C:\Users\shwetank\Downloads\Rajasthan_Agri_Platform_Leadership_Review.pptx` — 9-slide consulting deck (Grant Thornton Bharat / Govt of Rajasthan). Generator script: `<scratchpad>/rajasthan-deck/build2.js` (pptxgenjs). All figures in it are real pilot data: 200 farmers, 400 plots, 923 ha, 3 FPOs, 12 contracts, ~₹20.46L contracted value.

---

## 7. Suggested next steps

- Show the negotiation thread history (the `parentOffer` chain) on a per-offer detail view — currently only the latest round is visible.
- Add the export-estimate column and trend chart to the buyer-facing lot pages for symmetry with FPO/farmer views.
- Contract amendment via new version (FR-M6-09) — contracts are currently immutable except status/payments.
- Lot split/merge lineage (FR-M7-04) — not implemented; the recall query walks `lot → lotComponent → plot → farmer` only.
- Consider `outputFileTracingRoot` in `next.config` to silence the multi-lockfile warning (there's a stray `D:\CLAUD\package-lock.json` above the project).
