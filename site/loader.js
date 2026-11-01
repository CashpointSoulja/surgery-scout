/* Surgery Scout loader (Loop 1).
   Reads the raw per-month counts in data.js and derives every figure the page shows:
   combined rates, tiers, reason codes, trend, the demand cut-off and the PCN roll-up.
   Pure functions, no DOM: runs in the browser (window.ScoutLoader) and in Node (require). */
(function (root) {
  'use strict';

  const RULES = {
    priorityMissed: 15.0,   // missed_pct at or above: Priority, and the abandon reason
    priorityFast2: 40.0,    // fast2_pct at or below: Priority, and the slow reason
    buildingMissed: 8.0,    // missed_pct at or above: Building
    buildingFast2: 60.0,    // fast2_pct at or below: Building
    demandPercentile: 90,   // nearest-rank percentile for the demand cut-off
    demandMinMonths: 2,     // months of data needed to be ranked for demand
    trendPp: 3.0,           // editorial: points of change that count as worsening or improving
    trendMinInbound: 100,   // inbound calls needed in both July and September for a trend
    lowVolume: 300,         // total inbound under this sets the low-volume flag
  };

  const TIER_ORDER = ['priority', 'building', 'holding', 'nodata'];
  const REASONS = [
    { code: 'abandon', label: 'High abandonment' },
    { code: 'slow', label: 'Slow answer' },
    { code: 'demand', label: 'Demand surge' },
  ];
  const V1_TIER = { high: 'priority', moderate: 'building', hold: 'holding', unknown: 'nodata', low_volume: 'nodata' };

  const ratio = (num, den) => (num == null || den == null || den === 0) ? null : num / den * 100;

  function sumField(list, key) {
    let total = null;
    for (const m of list) {
      const v = m[key];
      if (v == null) continue;
      total = (total || 0) + v;
    }
    return total;
  }

  // Nearest-rank percentile: the value at rank ceil(p/100 * n) of the ascending list.
  function nearestRank(sortedAsc, p) {
    const n = sortedAsc.length;
    if (!n) return { value: null, rank: null, n: 0 };
    const rank = Math.max(1, Math.ceil(p / 100 * n));
    return { value: sortedAsc[rank - 1], rank, n };
  }

  function derivePractice(raw, months) {
    const last = months[months.length - 1];
    const first = months[0];
    const present = months.filter(m => raw.months && raw.months[m]);
    const list = present.map(m => raw.months[m]);
    const n = list.length;

    const tot = {
      inbound: sumField(list, 'inbound'),
      missed: sumField(list, 'missed'),
      answered: sumField(list, 'answered'),
      ans_le30: sumField(list, 'ans_le30'),
      ans_le120: sumField(list, 'ans_le120'),
      inbound_allday: sumField(list, 'inbound_allday'),
    };

    const p = {
      ods: raw.ods,
      name: raw.name,
      postcode: raw.postcode,
      pcn_code: raw.pcn_code,
      pcn_name: raw.pcn_name,
      patients: raw.patients,
      raw,
      months_n: n,
      months_present: present,
      tot,
      missed_pct: ratio(tot.missed, tot.inbound),
      fast2_pct: ratio(tot.ans_le120, tot.answered),
      fast30_pct: ratio(tot.ans_le30, tot.answered),
      calls_per_1000: (n && tot.inbound != null && raw.patients > 0) ? (tot.inbound / n) / raw.patients * 1000 : null,
      low_volume: n > 0 && (tot.inbound || 0) < RULES.lowVolume,
      in_last: !!(raw.months && raw.months[last]),
      monthRows: months.map(m => {
        const x = raw.months && raw.months[m];
        return x ? { month: m, inbound: x.inbound, missed: x.missed, missed_pct: ratio(x.missed, x.inbound) } : { month: m, absent: true };
      }),
      last_seen: present.length ? present[present.length - 1] : null,
    };

    // Tier: set from the combined figures; a practice missing from the latest return is not tiered.
    if (!p.in_last) {
      p.tier = 'nodata';
    } else {
      const mp = p.missed_pct, f2 = p.fast2_pct;
      if ((mp != null && mp >= RULES.priorityMissed) || (f2 != null && f2 <= RULES.priorityFast2)) p.tier = 'priority';
      else if (mp != null && mp < RULES.buildingMissed && f2 != null && f2 > RULES.buildingFast2) p.tier = 'holding';
      // Building: missed 8%+ or fast2 60% or less. A practice with no answer-time data cannot
      // show it is Holding, so it lands here too.
      else p.tier = 'building';
    }

    // Trend: September missed % minus July missed %, both months with enough calls.
    const a = raw.months && raw.months[first], b = raw.months && raw.months[last];
    if (a && b && a.inbound >= RULES.trendMinInbound && b.inbound >= RULES.trendMinInbound) {
      const fromPct = ratio(a.missed, a.inbound), toPct = ratio(b.missed, b.inbound);
      const delta = toPct - fromPct;
      p.trend = {
        state: delta >= RULES.trendPp ? 'up' : delta <= -RULES.trendPp ? 'down' : 'flat',
        delta_pp: delta, from_pct: fromPct, to_pct: toPct,
      };
    } else {
      p.trend = { state: 'na', delta_pp: null, from_pct: null, to_pct: null };
    }
    return p;
  }

  function assignReasons(p, demandCut) {
    const codes = [];
    if (p.tier !== 'nodata') {
      if (p.missed_pct != null && p.missed_pct >= RULES.priorityMissed) codes.push('abandon');
      if (p.fast2_pct != null && p.fast2_pct <= RULES.priorityFast2) codes.push('slow');
      if (p.demand_eligible && demandCut != null && p.calls_per_1000 >= demandCut) codes.push('demand');
    }
    p.reasons = codes;
    p.primary_reason = codes.length ? codes[0] : null;
  }

  function buildPcns(practices) {
    const by = new Map();
    for (const p of practices) {
      if (p.tier === 'nodata') continue;
      const key = p.pcn_name || 'No PCN recorded';
      if (!by.has(key)) by.set(key, { pcn: key, practices: 0, priority: 0, building: 0, inbound: 0, missed: 0, patients: 0 });
      const g = by.get(key);
      g.practices += 1;
      if (p.tier === 'priority') g.priority += 1;
      if (p.tier === 'building') g.building += 1;
      g.inbound += p.tot.inbound || 0;
      g.missed += p.tot.missed || 0;
      g.patients += p.patients || 0;
    }
    const out = [...by.values()];
    out.forEach(g => { g.missed_pct = ratio(g.missed, g.inbound); });
    out.sort((x, y) => y.missed - x.missed || x.pcn.localeCompare(y.pcn));
    return out;
  }

  function load(data) {
    const meta = data.meta;
    const months = meta.months;
    const practices = data.practices.map(r => derivePractice(r, months));

    // Demand cut-off: rank practices in the latest return with a list size and two or more months.
    const ranked = practices.filter(p => p.in_last && p.patients > 0 && p.months_n >= RULES.demandMinMonths && p.calls_per_1000 != null);
    ranked.forEach(p => { p.demand_eligible = true; });
    const pr = nearestRank(ranked.map(p => p.calls_per_1000).sort((x, y) => x - y), RULES.demandPercentile);
    const demand = { cut: pr.value, rank: pr.rank, n: pr.n, percentile: RULES.demandPercentile };
    practices.forEach(p => assignReasons(p, demand.cut));

    const counts = { total: practices.length, priority: 0, building: 0, holding: 0, nodata: 0, inLast: 0, lowVolume: 0 };
    for (const p of practices) {
      counts[p.tier] += 1;
      if (p.in_last) counts.inLast += 1;
      if (p.tier !== 'nodata' && p.low_volume) counts.lowVolume += 1;
    }

    const tiered = practices.filter(p => p.tier !== 'nodata');
    const nelInbound = tiered.reduce((s, p) => s + (p.tot.inbound || 0), 0);
    const nelMissed = tiered.reduce((s, p) => s + (p.tot.missed || 0), 0);

    return {
      meta, months, rules: RULES, reasons: REASONS, tierOrder: TIER_ORDER,
      practices, pcns: buildPcns(practices), demand, counts,
      benchmark: { inbound: nelInbound, missed: nelMissed, missed_pct: ratio(nelMissed, nelInbound) },
    };
  }

  // Default order: tier, then total missed calls (highest first), then name.
  function defaultCompare(a, b) {
    const t = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (t) return t;
    const ma = a.tier === 'nodata' ? -1 : (a.tot.missed || 0), mb = b.tier === 'nodata' ? -1 : (b.tot.missed || 0);
    return (mb - ma) || a.name.localeCompare(b.name);
  }

  // Tier-change report, v1 (September only, from data.js v1 block) against v2 (July to September).
  function tierChangeReport(model) {
    const rows = [];
    for (const p of model.practices) {
      const v1 = p.raw.v1 || {};
      const oldTier = V1_TIER[v1.tier] || 'nodata';
      if (oldTier === p.tier) continue;
      rows.push({
        ods: p.ods, name: p.name, old_tier: oldTier, new_tier: p.tier,
        old_missed_pct: v1.miss810 == null ? null : v1.miss810,
        new_missed_pct: p.missed_pct == null ? null : Math.round(p.missed_pct * 10) / 10,
        old_fast2_pct: v1.fast810 == null ? null : v1.fast810,
        new_fast2_pct: p.fast2_pct == null ? null : Math.round(p.fast2_pct * 10) / 10,
      });
    }
    rows.sort((x, y) => TIER_ORDER.indexOf(x.new_tier) - TIER_ORDER.indexOf(y.new_tier) || x.name.localeCompare(y.name));
    return rows;
  }

  const api = { RULES, REASONS, TIER_ORDER, load, derivePractice, nearestRank, defaultCompare, tierChangeReport };
  root.ScoutLoader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
