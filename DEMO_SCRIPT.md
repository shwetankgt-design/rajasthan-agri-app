# Live Demo Runbook — Rajasthan Agri-Intelligence Platform

Audience: senior IAS officers, Government of Rajasthan. Total run time **~20 minutes** + Q&A.
Verified against live data on 2026-09-22.

---

## 0. Pre-flight (do this 10 minutes before they walk in)

1. **Start the server** and leave it running:
   ```bash
   cd D:\CLAUD\rajasthan-agri-app
   npm run dev
   ```
   Confirm http://localhost:3600/login loads.

2. **Open two browser windows** — this is important. Sessions are cookie-based per browser profile, so you cannot be logged in as two roles in one window:
   - **Window A (normal)** → you will use this as the **FPO**
   - **Window B (incognito)** → you will use this as the **Buyer**

   Without this you'll be logging in and out live, which kills the pace of the negotiation demo.

3. **Zoom the browser to ~110–125%** for projector readability. The tables are dense at 100%.

4. Pre-load these tabs so nothing loads cold on screen:
   - Window A: `/login`
   - Window B: `/login`
   - A third tab with the deck (`Rajasthan_Agri_Platform_Leadership_Review.pptx` in Downloads)

5. **Close unrelated tabs and notifications.** Your browser tab bar is visible on the projector.

### Logins (password `demo1234` for all)

| Role | Phone | Used in |
|---|---|---|
| Farmer | 9800000001 | Act 2 |
| FPO Admin | 9800000011 | Acts 3–4 (Window A) |
| Buyer | 9800000020 | Act 4 (Window B) |
| Government | 9800000090 | Act 6 |

The login page has one-click role buttons — use those, don't type phone numbers on stage.

---

## Act 1 — Frame the problem (deck, 3 min)

Slides 1–4: title → agenda → executive summary → the challenge.

**Land this line before touching the app:** *"Everything you're about to see is a working system, not a prototype walkthrough. Every number on screen comes out of the database live."*

---

## Act 2 — The farmer (3 min) · Window A · login **Farmer**

| Go to | Point at | Say |
|---|---|---|
| `/my-farm` | Weather & Rainfall — Jodhpur | 7-day outlook, and 46mm received in last 30 days against a 40mm normal — the farmer sees this without asking anyone |
| same page | "What to do today" cards | Two live advisories: shoot-fly pest risk on Bajra, and a **sell/hold alert because Bajra is trading below MSP** — ₹2,560 against an MSP of ₹2,625 |
| same page, scroll | Soil Health panel under each plot | Per-plot pH, organic carbon, N-P-K with a plain-language recommendation — "potassium is low, top up before next sowing" |
| `/market-prices` | Trend charts | **Hover over the line** — price at every point. This is the crop *this* farmer actually grows, in *his* district's mandis |
| same page | Export estimate column | This is the headline for the farmer: he sees the mandi rate, the MSP, and an indicative export benchmark side by side. That's negotiating power he has never had |

**The point to make:** the farmer is no longer price-blind.

---

## Act 3 — The FPO (4 min) · Window A · login **FPO Admin** (Rajendra Singh, Marudhara FPC)

| Go to | Point at | Say |
|---|---|---|
| `/fpo/output` | 231.5 ha, 5 crops | The FPO knows its aggregate sellable volume before harvest — that's what lets it negotiate as a block |
| `/fpo/prices` | Six crop trend charts + table | Price comparison across every mandi in the district, with MSP and export benchmark |
| `/fpo/lots` → open any lot | **Possible Buyers** panel | The system tells the FPO which buyers match this crop and district and *haven't offered yet* — it pushes them to sell, not just wait |
| same lot page | Custody chain table | Every movement hash-chained. Tamper with a historical row and the chain breaks visibly |

---

## Act 4 — The negotiation ⭐ (4 min) · **two windows** · THE CENTREPIECE

This is the single most convincing part of the demo. It proves a real transactional system.

**Step 1 — Window A (FPO Admin):** go to `/fpo/offers?status=pending`
- Point at the **Round** column: "every offer carries its negotiation round, capped at three before a final decision"
- Pick any pending row → click **Counter**
- Enter a new quantity and price (e.g. change the price up by ₹2–3/kg) → **Send counter**
- The row flips to **Round 2 / 3** and the action changes to **"Awaiting buyer response"**

**Step 2 — Window B (Buyer, Ashok Traders):** go to `/buyer/offers?status=pending`
- The countered offer is sitting there at **Round 2 / 3** with **Accept · Counter · Reject**
- Say: *"The buyer was notified. Either side can counter back — up to three rounds — then it's a final yes or no."*

**Step 3 — Buyer clicks Accept**
- The offer moves to accepted and a **contract is created** with a View contract link
- Open it — the contract carries the negotiated terms, not the original ask

**Step 4 — back to Window A:** the FPO now sees it under `/fpo/contracts`

**The line to land:** *"That was a real price negotiation, executed and recorded, with an audit trail. No phone calls, no verbal agreements, no disputes about what was agreed."*

> ⚠️ Each demo run consumes one pending offer. Marudhara has **3 actionable pending offers**, so you can run this three times before needing a reseed (`npx tsx prisma/seed.ts`).

---

## Act 5 — Traceability (2 min) · **no login needed**

Open in a **fresh tab** (this is the point — it's public, like scanning a QR code on a sack):

```
http://localhost:3600/trace/cmsmz3cgv02unus6g2oiyuhg7
```

That's a Guar lot from Marudhara FPC with 4 custody events and 3 source plots.

| Point at | Say |
|---|---|
| The whole page loading without login | A consumer or export buyer scans a QR code and gets this — no account, no app |
| Origin district + FPO, chain of custody | Full provenance from farm-gate to dispatch |
| **Absence of farmer names** | Deliberate. Individual farmer identity is never disclosed on the public page — the page says so explicitly |
| Record integrity badge | Hash-verified; if any historical record had been altered, this would read as failed |

---

## Act 6 — The government view (3 min) · login **Government**

Go to `/government`.

| Point at | Say |
|---|---|
| Three bar charts | Sown area by crop, production estimate, FPO performance — all computed live from farmer-level records, not a manual return |
| Sown area figures | Bajra 311.8 ha, Mustard 245.4 ha, Guar 113.3 ha across the two pilot districts |
| Production estimate table | Every estimate carries a ±15% band — we show the uncertainty rather than hiding it |
| FPO Performance table | ₹9.62L / ₹7.08L / ₹3.76L contracted value by FPO — a real performance signal for scheme targeting |
| **Click Export CSV** | Actually click it. The data leaves the system in a usable form for the department's own analysis |

**The line to land:** *"This is bottom-up. Every number here aggregates from an individual farmer's plot record — not a district-level self-report."*

---

## Act 7 — Close (deck, 2 min)

Slides 8–9: pilot impact (200 farmers, 400 plots, 923 ha, 3 FPOs, 12 contracts, ₹20.5L+ contracted) → roadmap → **the ask**.

State the ask plainly and stop talking:
1. Department sponsorship for state-wide rollout
2. Nomination of Phase 2 pilot districts
3. Data-sharing partnership — Cooperation Dept, IMD, soil-testing labs

---

## Q&A — the honest answers

Have these ready. Senior officers will ask, and a straight answer builds more credibility than a dodge.

| Question | Answer |
|---|---|
| **"Is this live market data?"** | No — the pilot runs on a generated price series. The integration points are built and identified: Agmarknet / e-NAM for mandi prices, APEDA/DGFT for export rates. That's Phase 3, and it's a data-sharing decision, not an engineering one. |
| **"Is the advisory AI/ML?"** | Today it's a rule engine on agronomic calendars and price-vs-MSP logic, and every advisory is version-stamped in the database. It is deliberately not a black box. ML yield forecasting is Phase 3 and needs multi-season ground-truth data we don't have yet. |
| **"Where does the weather and soil data come from?"** | Generated for the pilot. Real integration needs an IMD feed and a soil-testing-lab tie-up — that's part of the Phase 3 ask. |
| **"How do you protect farmer data?"** | Three ways: an audit log on personal-data access, a data-subject rights module (access / correction / erasure / portability, with a retention exception where a contract references the record), and the public trace page excludes farmer identity by design. |
| **"Will this scale to all 33 districts?"** | The pilot runs on SQLite; state rollout moves to PostgreSQL. The data model is already district- and FPO-scoped, so it's a deployment change, not a rewrite. |
| **"What about farmers without smartphones / who don't read English?"** | Honest gap. In-app delivery is what works today; WhatsApp, SMS and IVR fallback are modelled in the delivery ledger but not integrated with a telephony provider. Voice and local-language interaction is not built. Both are Phase 2 items and they matter more than anything else on the roadmap for actual farmer adoption. |
| **"What's it cost to run?"** | Don't improvise a number. Say you'll come back with a costed Phase 2 proposal — that's a natural follow-up meeting. |

---

## Risk list — what NOT to do live

- ❌ **Do not reseed** during or just before the demo — it regenerates all IDs, invalidates open sessions, and the trace URL above will stop working.
- ❌ **Do not counter the same offer more than twice** — it hits the 3-round cap and returns an error on screen.
- ❌ Don't open `/admin/*` unless asked. It's functional but dry (master data, audit log) and kills momentum.
- ❌ Don't make the Notifications page a centrepiece — it's a plain list, not a wow moment. Mention it in passing if a notification fires during Act 4.
- ⚠️ If a page errors, the fastest recovery is to reload. If the server itself dies, `npm run dev` again — data is unaffected.
- ⚠️ If you reseeded at any point, **re-run the trace lot lookup** — the ID in Act 5 will have changed.

---

## Timing summary

| Act | Content | Min |
|---|---|---|
| 1 | Deck: frame the problem | 3 |
| 2 | Farmer: advisory + market prices | 3 |
| 3 | FPO: aggregation, prices, buyers, custody | 4 |
| 4 | **Negotiation, two windows** | 4 |
| 5 | Public traceability page | 2 |
| 6 | Government dashboard + CSV export | 3 |
| 7 | Deck: impact, roadmap, the ask | 2 |
| | **Total** | **~21** |

If you're squeezed to 10 minutes: keep Acts 2, 4 and 6 (farmer value → real transaction → government visibility). Drop 3 and 5.
