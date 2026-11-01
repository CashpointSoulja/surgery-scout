# Surgery Scout - test plan and recorded results

All tests run 1 Nov 2026 against the deployed build (surgery-scout.ayomideahmedcp.workers.dev) unless noted. Desktop tests in Chrome (server-side, 1280px); mobile tests in headless Chrome at 390x844.

## Functional

| # | Test | Result | Evidence |
|---|------|--------|----------|
| F1 | Page loads, all assets 200 (HTML, CSS, JS, data, logo) | Pass (all 200, expected sizes) | curl status checks |
| F2 | Tier filter "Priority" reduces list to Priority practices only | Pass: "81 of 261 practices" | desktop screenshot |
| F3 | Default sort = raw missed 8-10am calls, descending | Pass: top row Aurora Medcare, 2,214 missed (41.2%) | desktop screenshot |
| F4 | Row click opens detail card with 6 stats, ODS code, why/opener/discovery | Pass (Balfour Road Surgery, Aurora Medcare) | desktop + mobile screenshots |
| F5 | Deep link #ODS-code opens the matching practice card | Pass: /#F82042 opened Aurora Medcare | mobile screenshot |
| F6 | PCN roll-up table renders 49 rows (48 PCNs + "No PCN recorded") | Pass | desktop screenshot |
| F7 | Search box and PCN dropdown present and wired (input handlers bound) | Pass (code inspection + event bindings verified; full manual sweep not recorded) | app.js |
| F8 | app.js parses cleanly | Pass: node --check after every edit | terminal |

## Responsive (390px width)

| # | Test | Result |
|---|------|--------|
| R1 | Header, logo, hero copy stack and stay readable | Pass |
| R2 | Search, tier pills, PCN dropdown wrap full-width; no clipped controls | Pass |
| R3 | Table shows Practice/PCN/Patients and scrolls horizontally for metric columns | Pass (scroll container; cut edge visible) |
| R4 | Detail card fits inside viewport, close control reachable | Pass |

## Data integrity

| # | Test | Result |
|---|------|--------|
| D1 | Practice count = 261; practices with telephony data = 244; tiers = 81/85/78/17 | Pass, computed from source CSVs |
| D2 | NEL aggregate check: 32,109 missed of 321,082 8-10am calls = 10.0% | Pass |
| D3 | England benchmark 10.9% matches the release's own Table 1 (September 2026) | Pass |
| D4 | London ICB coverage figures (82-93%) computed from the same extract | Pass |
| D5 | Metric definitions match NHS metadata (missed excludes IVR exits; voicemails included) | Pass, against cbt-metadata.xlsx + summary workbook notes |
| D6 | All outbound source links resolve (publication page, 3 data files, metadata, 4 incident articles, Pulse) | Pass; one Pulse URL corrected after review |

## Known limitations (not bugs)

- GP Patient Survey perception layer not merged in v1 (public but not integrated).
- No national rollout or auto-refresh; data is the September 2026 return + October 2026 registration extract.
- The >=100-call low-volume guardrail never triggered in NEL (smallest in-scope practice still exceeded it); the rule is documented but untested against a real low-volume practice.
- Practices outside the telephony return are "No telephony data" - includes practices whose supplier doesn't report and possibly existing AI-receptionist users; numbers for the latter may be distorted.
- Customer status is not known per practice (vendor list isn't public); the page says to check the CRM.
