# Surgery Scout

An unofficial concept built by **Ayo Ahmed** for the QuantumLoopAI SDR role — a prioritised prospecting view of NHS North East London GP practices, built entirely from public NHS England data. Not affiliated with, endorsed by, or commissioned by QuantumLoopAI.

## What it does

Ranks all 261 NEL practices by September 2026 cloud-telephony performance (8–10am inbound calls, missed-call share, share answered within two minutes), tiers them with stated editorial thresholds, rolls up to PCN level, and gives a per-practice reason-to-call, opener and discovery questions — plus prepped answers to the two objections AI receptionists get in public (accent/access concerns; GP-contract telephony data-sharing advice).

## Why (5 Whys, short form)

1. SDRs at QuantumLoopAI sell EMMA, an AI receptionist; the core pain is unanswered calls in the 8am rush.
2. Proving that pain practice-by-practice normally takes manual research per call.
3. NHS England already publishes the exact metric (missed calls, answer times) practice-by-practice, monthly, publicly.
4. Nobody in the market is handing their SDR team that data shaped into a call list.
5. So the fastest proof of "I can do this job" is the tool itself: data → tiered call list → objection prep.

## Data & method

- NHS England, *Cloud-based telephony* publication, September 2026 (published 29 Oct 2026): practice-level daily inbound/missed/answered-within-2-min calls. Files: `files.digital.nhs.uk/DF/67D81E` (calls answered), `files.digital.nhs.uk/7E/33E844` (by day and time).
- NHS England, *Patients Registered at a GP Practice*, October 2026 extract: list sizes, PCN and ICB mapping.
- All public data under the Open Government Licence v3.0. No patient-level data.
- Tier thresholds are editorial choices, stated on the page; they are a targeting hypothesis, not an NHS rating.
- Scope: NHS North East London ICB (QMF) — home patch for a Canary Wharf SDR, best London data coverage (244/261 practices in the return).

## Stack

Static site: plain HTML/CSS/JS, no build step. `site/` is the whole app (`index.html`, `style.css`, `app.js`, `data.js`).

## Roadmap (week one)

GP Patient Survey phone-access layer (perception vs performance), national rollout, monthly auto-refresh, CRM-shaped CSV export.
