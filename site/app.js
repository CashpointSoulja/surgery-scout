/* Surgery Scout page script (Loop 1). All figures come from loader.js, which derives them from data.js. */
const RAW = (typeof window.SCOUT_DATA !== 'undefined') ? window.SCOUT_DATA : DATA;
const MODEL = ScoutLoader.load(RAW);

const tbody = document.getElementById('tbody'), count = document.getElementById('count'),
  detail = document.getElementById('detail'), pcnSel = document.getElementById('pcnFilter'),
  searchEl = document.getElementById('search');

const TIER_LABEL = { priority: 'Priority', building: 'Building', holding: 'Holding', nodata: 'No telephony data' };
const TIER_SHORT = { priority: 'Priority', building: 'Building', holding: 'Holding', nodata: 'No data' };
const REASON_LABEL = Object.fromEntries(MODEL.reasons.map(r => [r.code, r.label]));

const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthIdx = m => Number(m.slice(5, 7)) - 1;
const longMonth = m => MONTH_LONG[monthIdx(m)];
const shortMonth = m => MONTH_SHORT[monthIdx(m)];
const FIRST = MODEL.months[0], LAST = MODEL.months[MODEL.months.length - 1];
const YEAR = LAST.slice(0, 4);
const FROM = longMonth(FIRST), TO = longMonth(LAST);                       // July, September
const PERIOD_SHORT = shortMonth(FIRST) + '–' + shortMonth(LAST);       // Jul–Sep

const KEEP_UPPER = new Set(['PCN', 'NHS', 'GP', 'ICB', 'NEL']);
function tidyName(s) {
  return String(s).toLowerCase()
    .replace(/[a-z][a-z']*/g, w => w[0].toUpperCase() + w.slice(1))
    .replace(/[A-Za-z]+/g, w => KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w)
    .replace(/'/g, '’').replace(/^At Medics/, 'AT Medics');
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Number formatting: thresholds are compared on unrounded values in the loader; rounding is display only.
const int = v => (v == null || isNaN(v)) ? null : Math.round(v).toLocaleString('en-GB');
const pct1 = v => (v == null || isNaN(v)) ? null : Number(v).toFixed(1);
const pctStr = v => pct1(v) == null ? 'n/a' : pct1(v) + '%';
const NIL = '<span class="nil">n/a</span>';
const cell = v => v == null ? NIL : v;
const q = s => '“' + s + '”';

function trendHtml(t) {
  if (!t || t.state === 'na') return '<span class="trend na">n/a</span>';
  const abs = Math.abs(t.delta_pp).toFixed(1);
  const span = `${FROM} to ${TO}`;
  if (t.state === 'up') return `<span class="trend up" role="img" aria-label="Missed rate up ${abs} points, ${span}">▲ +${abs} pp</span>`;
  if (t.state === 'down') return `<span class="trend down" role="img" aria-label="Missed rate down ${abs} points, ${span}">▼ −${abs} pp</span>`;
  const r = Number(t.delta_pp.toFixed(1));
  const sign = r > 0 ? '+' : r < 0 ? '−' : '';
  return `<span class="trend flat" role="img" aria-label="Missed rate steady, ${span}">${sign}${abs} pp</span>`;
}

/* Copy templates (section 7 of the brief). Every number comes from the loader. */
function whyText(p) {
  const name = esc(tidyName(p.name));
  const parts = [];
  for (const code of p.reasons) {
    if (code === 'abandon') parts.push(`Between ${FROM} and ${TO}, ${int(p.tot.missed)} of ${int(p.tot.inbound)} calls between 8 and 10am ended while the caller was still waiting: ${pct1(p.missed_pct)}%.`);
    if (code === 'slow') parts.push(`Between ${FROM} and ${TO}, ${pct1(p.fast2_pct)}% of answered calls between 8 and 10am were picked up within 2 minutes, and ${pct1(p.fast30_pct)}% within 30 seconds.`);
    if (code === 'demand') parts.push(`${name} averaged ${int(p.calls_per_1000)} calls per 1,000 patients between 8 and 10am each month, in the top tenth of North East London practices.`);
  }
  if (!parts.length) {
    const fast = p.fast2_pct == null
      ? ' The return has no answer-time data for this practice.'
      : ` Of the calls answered, ${pct1(p.fast2_pct)}% were picked up within 2 minutes.`;
    parts.push(`No reason code applies. Between ${FROM} and ${TO}, ${int(p.tot.missed)} of ${int(p.tot.inbound)} calls between 8 and 10am ended while the caller was still waiting: ${pctStr(p.missed_pct)}.${fast}`);
  }
  parts.push('Some callers will have rung again or been helped another way; the count is call outcomes, not unique patients.');
  return parts.join(' ');
}

function openerText(p) {
  const name = esc(tidyName(p.name));
  switch (p.primary_reason) {
    case 'abandon': {
      const rise = p.trend.state === 'up'
        ? `The rate went from ${pct1(p.trend.from_pct)}% in ${FROM} to ${pct1(p.trend.to_pct)}% in ${TO}. `
        : '';
      return q(`I was looking at ${name}’s published NHS telephony data: between ${FROM} and ${TO}, ${int(p.tot.missed)} calls between 8 and 10am ended while the caller was still waiting. ${rise}EMMA is built to answer every call within three rings. Would ten minutes on what that would mean for your ${int(p.patients)} patients be useful?`);
    }
    case 'slow':
      return q(`${name}’s published NHS telephony data shows ${pct1(p.fast2_pct)}% of answered calls between 8 and 10am were picked up within 2 minutes from ${FROM} to ${TO}, and ${pct1(p.fast30_pct)}% within 30 seconds. EMMA is built to answer every call within three rings. Would it be worth ten minutes to compare that with how your mornings run today?`);
    case 'demand':
      return q(`${name} averaged ${int(p.calls_per_1000)} calls per 1,000 patients between 8 and 10am each month from ${FROM} to ${TO}, in the top tenth of practices in North East London. EMMA is built to take calls at the same time rather than in a queue. Would ten minutes on what that would mean for your reception team be useful?`);
    default:
      return q(`${name}’s published NHS telephony data shows ${pctStr(p.missed_pct)} of calls between 8 and 10am ended while the caller was waiting from ${FROM} to ${TO}, so the queue may not be your biggest pressure. Is reception workload something you’re looking at this year?`);
  }
}

/* Table */
let state = { tier: 'all', pcn: '', q: '', sortK: null, sortDir: -1 };
const SORT_KEY = {
  name: p => tidyName(p.name),
  pcn: p => p.pcn_name ? tidyName(p.pcn_name) : null,
  patients: p => p.patients || null,
  inbound: p => p.tier === 'nodata' ? null : p.tot.inbound,
  missed: p => p.tier === 'nodata' ? null : p.tot.missed,
  missed_pct: p => p.tier === 'nodata' ? null : p.missed_pct,
  fast2_pct: p => p.tier === 'nodata' ? null : p.fast2_pct,
  trend: p => p.tier === 'nodata' ? null : p.trend.delta_pp,
};
const TEXT_KEYS = new Set(['name', 'pcn']);

function rows() {
  const needle = state.q.toLowerCase();
  const r = MODEL.practices.filter(p => {
    if (state.tier !== 'all' && p.tier !== state.tier) return false;
    if (state.pcn && p.pcn_name !== state.pcn) return false;
    if (needle && !(p.name.toLowerCase().includes(needle) || (p.pcn_name || '').toLowerCase().includes(needle) || (p.postcode || '').toLowerCase().includes(needle))) return false;
    return true;
  });
  if (!state.sortK) return r.sort(ScoutLoader.defaultCompare);
  const get = SORT_KEY[state.sortK];
  return r.sort((a, b) => {
    const ka = get(a), kb = get(b);
    if (ka == null && kb == null) return ScoutLoader.defaultCompare(a, b);
    if (ka == null) return 1;            // n/a always last, whichever direction
    if (kb == null) return -1;
    const c = typeof ka === 'string' ? ka.localeCompare(kb) : (ka < kb ? -1 : ka > kb ? 1 : 0);
    return (c * state.sortDir) || ScoutLoader.defaultCompare(a, b);
  });
}

function rowHtml(p) {
  const nodata = p.tier === 'nodata';
  const chip = p.primary_reason ? `<span class="reason">${REASON_LABEL[p.primary_reason]}</span>` : '';
  return `<tr data-code="${esc(p.ods)}" data-tier="${p.tier}"><td><button class="practice-name linkbtn">${esc(tidyName(p.name))}</button><span class="practice-meta"><span class="practice-code">${esc(p.postcode)}</span><span class="badge ${p.tier}">${TIER_SHORT[p.tier]}</span>${chip}</span></td>
    <td class="pcn">${esc(p.pcn_name ? tidyName(p.pcn_name) : 'n/a')}</td>
    <td class="num">${cell(int(p.patients || null))}</td>
    <td class="num">${nodata ? NIL : cell(int(p.tot.inbound))}</td>
    <td class="num">${nodata ? NIL : cell(int(p.tot.missed))}</td>
    <td class="num">${nodata ? NIL : cell(pct1(p.missed_pct) == null ? null : pct1(p.missed_pct) + '%')}</td>
    <td class="num">${nodata ? NIL : cell(pct1(p.fast2_pct) == null ? null : pct1(p.fast2_pct) + '%')}</td>
    <td class="num">${nodata ? '<span class="trend na">n/a</span>' : trendHtml(p.trend)}</td></tr>`;
}

function render() {
  hideDetail();
  const r = rows();
  count.textContent = r.length + ' of ' + MODEL.practices.length + ' practices shown';
  tbody.innerHTML = r.map(rowHtml).join('');
  document.querySelectorAll('#ptable th').forEach(th => {
    if (th.dataset.k === state.sortK) th.setAttribute('aria-sort', state.sortDir === 1 ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });
}

function renderPcn() {
  document.getElementById('pcnbody').innerHTML = MODEL.pcns.map(g => `<tr><td><span class="practice-name">${esc(tidyName(g.pcn))}</span></td><td class="num">${g.practices}</td>
    <td class="num">${g.priority ? '<span class="badge priority">' + g.priority + '</span>' : NIL}</td>
    <td class="num">${g.building || NIL}</td><td class="num">${pct1(g.missed_pct) == null ? NIL : pct1(g.missed_pct) + '%'}</td>
    <td class="num">${int(g.patients)}</td></tr>`).join('');
}

/* Drawer */
const homeMarker = document.createComment('detail-home'); detail.parentElement.insertBefore(homeMarker, detail);
let detailRow = null;
function placeDetail(row) {
  document.querySelectorAll('tr.detail-row').forEach(t => t.remove());
  const mobile = !window.matchMedia('(min-width:761px)').matches;
  if (mobile && row) {
    const tr = document.createElement('tr'); tr.className = 'detail-row';
    const td = document.createElement('td'); td.colSpan = document.querySelectorAll('#ptable thead th').length || 8;
    td.appendChild(detail); tr.appendChild(td); row.after(tr); detailRow = tr;
    tr.scrollIntoView({ block: 'nearest' });
  } else {
    homeMarker.after(detail); detailRow = null;
  }
}
let lastOpener = null;
function hideDetail() {
  const wasOpen = !detail.classList.contains('hidden');
  detail.classList.add('hidden');
  if (detailRow) { homeMarker.after(detail); detailRow.remove(); detailRow = null; }
  if (wasOpen && lastOpener && lastOpener.isConnected) { const b = lastOpener.querySelector('.practice-name'); (b || lastOpener).focus(); lastOpener = null; }
}

const DISCOVERY = `<h4>Discovery questions</h4><ul>
    <li>What happens to a caller at 8:05am today: queue, engaged tone, or a person?</li>
    <li>How do you currently measure whether every patient gets through, including patients with speech difficulties or English as an additional language?</li>
    <li>If calls were answered promptly, what would your reception team do with the freed hours?</li></ul>`;

function drawerBody(p) {
  const name = esc(tidyName(p.name));
  if (p.tier === 'nodata') {
    const last = p.last_seen ? `<p>Last appeared in the ${longMonth(p.last_seen)} ${p.last_seen.slice(0, 4)} return.</p>` : '';
    return `<h4>Not in the ${TO} ${YEAR} return</h4>
  <p>This practice does not appear in NHS England’s ${TO} ${YEAR} cloud-telephony publication. Practices can be missing for several reasons, including a telephony supplier that does not yet report into the collection. The published data cannot tell us which applies here.</p>${last}
  <h4>Ask first</h4><blockquote class="opener">${q(`I noticed ${name} isn’t in NHS England’s ${TO} telephony publication, so I can’t see from the outside how your mornings run. How do calls reach your team between 8 and 10am today, and who supplies your phone system?`)}</blockquote>
  ${DISCOVERY}`;
  }
  const stat = (v, l) => `<div><dt>${l}</dt><dd>${v == null ? 'n/a' : v}</dd></div>`;
  const pc = v => pct1(v) == null ? null : pct1(v) + '%';
  const monthRows = p.monthRows.map(m => m.absent
    ? `<tr><td>${shortMonth(m.month)}</td><td colspan="3" class="nil">Not in return</td></tr>`
    : `<tr><td>${shortMonth(m.month)}</td><td class="num">${int(m.inbound)}</td><td class="num">${int(m.missed)}</td><td class="num">${cell(pc(m.missed_pct))}</td></tr>`).join('');
  const notes = [];
  if (p.months_n < MODEL.months.length) notes.push(`<p class="detail-note">Based on ${p.months_n} months.</p>`);
  if (p.low_volume) notes.push('<p class="detail-note">Low call volume: rates move a lot from month to month.</p>');
  return `<dl class="detail-grid">
    ${stat(int(p.patients || null), 'Registered patients (Oct 2026)')}
    ${stat(int(p.tot.inbound), `8–10am calls (${PERIOD_SHORT})`)}
    ${stat(int(p.tot.missed), `Missed 8–10am calls (${PERIOD_SHORT})`)}
    ${stat(pc(p.missed_pct), `Missed % (${PERIOD_SHORT})`)}
    ${stat(pc(p.fast2_pct), `Answered ≤2 min (${PERIOD_SHORT})`)}
    ${stat(pc(p.fast30_pct), `Answered ≤30 s (${PERIOD_SHORT})`)}
    ${stat(int(p.calls_per_1000), 'Calls per 1,000 patients, 8–10am, monthly average')}
    ${stat(trendHtml(p.trend), `Trend, ${shortMonth(LAST)} vs ${shortMonth(FIRST)}`)}
    ${stat(int(p.tot.inbound_allday), `All-day calls (${PERIOD_SHORT})`)}
  </dl>
  <p class="detail-note">EMMA’s published standard is three rings, but EMMA does not publish how long a ring is, and NHS data groups answer times into 30-second bands. The three-ring promise cannot be checked against these bands. Answered within 30 seconds is the closest available proxy, not the same measure.</p>
  <h4>Month by month</h4>
  <table class="months-table"><thead><tr><th>Month</th><th class="num">Calls</th><th class="num">Missed</th><th class="num">Missed %</th></tr></thead><tbody>${monthRows}</tbody></table>
  ${notes.join('')}
  <h4>Why this practice</h4><p>${whyText(p)}</p>
  <h4>Suggested opener</h4><blockquote class="opener">${openerText(p)}</blockquote>
  ${DISCOVERY}`;
}

function showDetail(code) {
  const p = MODEL.practices.find(x => x.ods === code); if (!p) return;
  tbody.querySelectorAll('tr.selected').forEach(t => t.classList.remove('selected'));
  const row = tbody.querySelector(`tr[data-code="${CSS.escape(p.ods)}"]`); if (row) row.classList.add('selected');
  const reasons = p.reasons.length
    ? `<ul class="reasons">${p.reasons.map(c => `<li><span class="reason">${REASON_LABEL[c]}</span></li>`).join('')}</ul>`
    : '';
  detail.innerHTML = `<button class="detail-close" aria-label="Close details">×</button>
  <h3>${esc(p.name)}</h3><p class="detail-sub">${esc(p.postcode)} · ${esc(p.pcn_name ? tidyName(p.pcn_name) : 'PCN unknown')} · ODS ${esc(p.ods)} · <span class="badge ${p.tier}">${TIER_LABEL[p.tier]}</span></p>
  ${reasons}
  ${drawerBody(p)}`;
  lastOpener = row; detail.classList.remove('hidden'); placeDetail(row);
  const cb = detail.querySelector('.detail-close'); if (cb) cb.focus();
}

/* Static figures that come from the loader: pill counts and the Method */
function fillFigures() {
  for (const t of MODEL.tierOrder) {
    const el = document.querySelector(`.tf[data-tier="${t}"] .count`);
    if (el) el.textContent = MODEL.counts[t];
  }
  const fig = {
    demandCut: MODEL.demand.cut == null ? 'n/a' : MODEL.demand.cut.toFixed(1),
    demandN: int(MODEL.demand.n),
    demandRank: int(MODEL.demand.rank),
    benchPct: pctStr(MODEL.benchmark.missed_pct),
    benchMissed: int(MODEL.benchmark.missed),
    benchInbound: int(MODEL.benchmark.inbound),
    lowVolume: int(MODEL.counts.lowVolume),
    inLast: int(MODEL.counts.inLast),
    total: int(MODEL.counts.total),
    inLastPct: Math.round(MODEL.counts.inLast / MODEL.counts.total * 100) + '%',
  };
  document.querySelectorAll('[data-fig]').forEach(el => { if (fig[el.dataset.fig] != null) el.textContent = fig[el.dataset.fig]; });

  const src = document.getElementById('m-sources');
  if (src) {
    const fmtDate = d => { const [y, m, day] = d.split('-'); return `${Number(day)} ${MONTH_SHORT[Number(m) - 1]} ${y}`; };
    src.innerHTML = MODEL.months.map(m => {
      const s = MODEL.meta.sources[m];
      return `<span class="src-month">${longMonth(m)} ${m.slice(0, 4)} (published ${fmtDate(s.published)}): <a href="${esc(s.answeredUrl)}" target="_blank" rel="noopener">Calls-answered file</a> &middot; <a href="${esc(s.dayTimeUrl)}" target="_blank" rel="noopener">By-day-and-time file</a></span>`;
    }).join('<br>');
  }
  const reg = document.getElementById('m-registration');
  if (reg && MODEL.meta.registration) reg.href = MODEL.meta.registration.url;
}

/* Review aid, not for the page: add ?tierreport to the URL to print v1 to v2 tier moves. */
if (/[?&]tierreport\b/.test(location.search)) {
  const moves = ScoutLoader.tierChangeReport(MODEL);
  console.log(`Tier changes, v1 (${TO} only) to v2 (${FROM} to ${TO}): ${moves.length} practices`);
  console.table(moves);
}

/* Wiring */
tbody.addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr && !tr.classList.contains('detail-row') && tr.dataset.code) showDetail(tr.dataset.code); });
detail.addEventListener('click', e => { if (e.target.classList.contains('detail-close')) hideDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideDetail(); });
document.querySelectorAll('.tf').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tf').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
  b.classList.add('active'); b.setAttribute('aria-pressed', 'true');
  state.tier = b.dataset.tier || 'all'; render();
}));
pcnSel.addEventListener('change', () => { state.pcn = pcnSel.value; render(); });
searchEl.addEventListener('input', () => { state.q = searchEl.value; render(); });
document.querySelectorAll('#ptable th').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.k;
  if (state.sortK === k) state.sortDir *= -1;
  else { state.sortK = k; state.sortDir = TEXT_KEYS.has(k) ? 1 : -1; }
  render();
}));

[...new Set(MODEL.practices.map(p => p.pcn_name).filter(Boolean))]
  .sort((a, b) => tidyName(a).localeCompare(tidyName(b)))
  .forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = tidyName(n); pcnSel.appendChild(o); });

fillFigures();
render();
renderPcn();
if (location.hash.length > 1) { const p0 = MODEL.practices.find(x => x.ods === location.hash.slice(1)); if (p0) showDetail(p0.ods); }
