# Surgery Scout - PRD

Owner: Ayo Ahmed. Status: v1 shipped 1 Nov 2026. Unofficial concept; not affiliated with or commissioned by QuantumLoopAI.

## Problem

QuantumLoopAI's SDRs sell EMMA, an AI receptionist for NHS GP surgeries. The core pain is the 8am phone rush: patients ring, calls get missed. Proving that pain for a specific practice currently means manual research per call, so first touches are generic and the objections (press coverage of AI receptionists, contract questions) arrive unprepared.

NHS England already publishes the exact behavioural data - practice-level daily inbound, missed and answered-by-wait-time calls - monthly, publicly. Nobody on the sales side has shaped it into a call list.

## Goals

1. Turn the September 2026 cloud-telephony return into a prioritised, per-practice call list for one demonstration geography (NHS North East London ICB).
2. Make every figure checkable: definitions, editorial thresholds and exact source URLs on the page; every practice traceable by ODS code.
3. Pre-load the two objections an SDR will actually meet, with sourced, honest handling.
4. Prove the seller workflow, not a data-science exercise: tier, why, opener, discovery questions.

## Non-goals (v1)

- No national rollout, no live refresh, no CRM export.
- No GP Patient Survey perception layer (public but not merged in v1).
- No scoring model that implies buying intent, budget or authority. Tiers are measured phone pressure only.
- No patient-level data of any kind. None exists in the sources.

## Users

Primary: an SDR starting a morning block who needs to know which 10 practices to call first and what to say. Secondary: a hiring manager evaluating whether the candidate can do the actual job.

## Requirements

- Practice table: name, postcode, PCN, list size, 8-10am calls, missed call count, missed %, answered-within-2-min %. Search, tier filter, PCN filter, column sort; default sort = raw missed 8-10am count.
- Tiers with stated editorial thresholds: Priority = missed >=15% of 8-10am calls OR <=40% answered within 2 min; Building = missed 8-15% or 40-60% fast-answer; Holding = missed <8% and >60% fast-answer; No telephony data = not in the return (treated as an open question, never as "good").
- Detail card per practice: six stats, ODS code, tier-specific why + opener + three discovery questions. Deep-linkable via #ODS-code.
- PCN roll-up: practices, Priority/Building counts, network missed share, patients - because PCNs share telephony and buying decisions.
- Objection cards: accents/access (Healthwatch Rotherham + BBC, with the company's published response) and GP-contract telephony data-sharing (Pulse, 9 Apr 2026). Honest answer first, then a discovery question.
- Method section: exact metric definitions (missed excludes IVR-stage exits; voicemails count as missed; outcomes are call volumes, not people), NHS data-quality note, benchmarks (NEL 10.0% missed at 8-10am; England 10.9% core hours), coverage caveats, customer-status caveat, clinical safety note.
- Footer: unofficial concept by Ayo Ahmed; OGL v3.0.

## Metrics and definitions

- 8-10am = the publication's 08:00-10:00 reporting category, September weekdays. All-day = core hours 08:00-18:30.
- Missed % = missed / inbound. <=2min % = answered within 120s / all answered.
- Benchmarks: NEL missed 32,109 of 321,082 8-10am calls (10.0%); England 10.9% of core-hours calls.

## Success criteria

A hirer can verify any number against the NHS source in under a minute, and an SDR could run a real call block from the tool unaided.
