#!/usr/bin/env node
/* Loop 1 acceptance checks that need no browser. Run from the repo root: node tests/check_loop1.js
   Prints the hand-check values, tier counts, reason logic results and the v1 to v2 tier-change report. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const site = path.join(__dirname, '..', 'site');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(site, 'data.js'), 'utf8') + '\n;globalThis.__DATA = (typeof SCOUT_DATA !== "undefined") ? SCOUT_DATA : DATA;', ctx);
const L = require(path.join(site, 'loader.js'));
const model = L.load(ctx.__DATA);

let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures += 1; };
const r1 = v => v == null ? 'n/a' : v.toFixed(1);

console.log('\n== Hand-check practices ==');
for (const needle of ['AURORA MEDCARE', 'BALFOUR ROAD', 'FAIRCROSS']) {
  const p = model.practices.find(x => x.name.toUpperCase().includes(needle));
  if (!p) { check(false, `${needle} not found`); continue; }
  console.log(`${p.name} (${p.ods}) tier=${p.tier} reasons=[${p.reasons.join(', ')}] months_n=${p.months_n}`);
  console.log(`  totals ${JSON.stringify(p.tot)} patients=${p.patients}`);
  console.log(`  missed_pct=${r1(p.missed_pct)} fast2_pct=${r1(p.fast2_pct)} fast30_pct=${r1(p.fast30_pct)} calls_per_1000=${r1(p.calls_per_1000)} trend=${p.trend.state} ${r1(p.trend.delta_pp)} (Jul ${r1(p.trend.from_pct)}, Sep ${r1(p.trend.to_pct)})`);
}
const aurora = model.practices.find(x => /AURORA MEDCARE/i.test(x.name));
const balfour = model.practices.find(x => /BALFOUR ROAD/i.test(x.name));
check(aurora && aurora.reasons.includes('abandon'), 'Aurora Medcare carries abandon');
check(balfour && balfour.reasons.includes('slow'), 'Balfour Road carries slow');
check(balfour && balfour.reasons.includes('demand'), 'Balfour Road carries demand');
if (balfour) {
  const sep = balfour.raw.months['2026-09'];
  const sepCp = sep.inbound / balfour.patients * 1000;
  console.log(`  Balfour Road September-only calls per 1,000: ${r1(sepCp)} (cut-off ${r1(model.demand.cut)})`);
  check(sepCp >= model.demand.cut, 'Balfour Road lands in demand on its September figures too');
}

console.log('\n== Demand cut-off ==');
console.log(`90th percentile, nearest rank ${model.demand.rank} of ${model.demand.n}: ${r1(model.demand.cut)} calls per 1,000 patients a month`);

console.log('\n== Tier counts ==');
const c = model.counts;
console.log(`Priority ${c.priority}, Building ${c.building}, Holding ${c.holding}, No data ${c.nodata}`);
check(c.priority + c.building + c.holding + c.nodata === 261, 'tier counts add up to 261');
check(c.nodata === model.practices.filter(p => !p.raw.months['2026-09']).length, 'No data equals practices missing from September');

console.log('\n== Reason logic ==');
const pri = model.practices.filter(p => p.tier === 'priority');
check(pri.every(p => p.reasons.includes('abandon') || p.reasons.includes('slow')), `every Priority practice (${pri.length}) has abandon or slow`);
check(model.practices.every(p => p.primary_reason === (p.reasons[0] || null)), 'primary chip is the first match in order abandon, slow, demand');
check(model.practices.filter(p => p.tier === 'nodata').every(p => p.reasons.length === 0), 'No data practices carry no reasons');
const demandOnly = model.practices.filter(p => p.reasons.length === 1 && p.reasons[0] === 'demand');
console.log(`Demand-only practices: ${demandOnly.length} (${demandOnly.map(p => p.tier).join(', ')})`);
console.log(`Reason counts: abandon ${model.practices.filter(p => p.reasons.includes('abandon')).length}, slow ${model.practices.filter(p => p.reasons.includes('slow')).length}, demand ${model.practices.filter(p => p.reasons.includes('demand')).length}`);
const tr = s => model.practices.filter(p => p.tier !== 'nodata' && p.trend.state === s).length;
console.log(`Trend: worsening ${tr('up')}, improving ${tr('down')}, steady ${tr('flat')}, n/a ${tr('na')}`);

console.log('\n== Tier-change report, v1 (September only) to v2 (July to September) ==');
const moves = L.tierChangeReport(model);
console.log(`${moves.length} practices moved tier`);
console.table(moves);

process.exitCode = failures ? 1 : 0;
