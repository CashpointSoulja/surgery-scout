const tbody=document.getElementById('tbody'),count=document.getElementById('count'),
detail=document.getElementById('detail'),pcnSel=document.getElementById('pcnFilter'),
searchEl=document.getElementById('search');
const TIER_LABEL={high:'Priority',moderate:'Building',hold:'Holding',unknown:'No telephony data',low_volume:'Low volume'};
const TIER_CLASS={high:'priority',moderate:'building',hold:'holding',unknown:'nodata',low_volume:'nodata'};
let state={tier:'all',pcn:'',q:'',sortK:'missN',sortDir:-1};
const pct = v => (v == null || isNaN(v)) ? null : Number(v).toFixed(1) + '%';
const KEEP_UPPER = new Set(['PCN', 'NHS', 'GP', 'ICB', 'NEL']);
function tidyName(s) {
  return String(s).toLowerCase()
    .replace(/[a-z][a-z']*/g, w => w[0].toUpperCase() + w.slice(1))
    .replace(/[A-Za-z]+/g, w => KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w)
    .replace(/'/g, '\u2019').replace(/^At Medics/, 'AT Medics');
}
const TIER_SHORT={high:'Priority',moderate:'Building',hold:'Holding',unknown:'No data',low_volume:'Low volume'};


DATA.pcns.forEach(p=>{const o=document.createElement('option');o.value=p.pcn;o.textContent=tidyName(p.pcn);pcnSel.appendChild(o)});

function rows(){
  let r=DATA.practices.filter(p=>{
    if(state.tier!=='all'&&p.tier!==state.tier)return false;
    if(state.pcn&&p.pcn!==state.pcn)return false;
    if(state.q){const q=state.q.toLowerCase();if(!(p.name.toLowerCase().includes(q)||(p.pcn||'').toLowerCase().includes(q)||p.pc.toLowerCase().includes(q)))return false}
    return true});
  r.sort((a,b)=>{
    const ka=a[state.sortK],kb=b[state.sortK];
    if(ka==null&&kb==null)return a.name.localeCompare(b.name);
    if(ka==null)return 1;if(kb==null)return -1;
    return (ka<kb?-1:ka>kb?1:0)*state.sortDir});
  return r}

const NIL='<span class="nil">n/a</span>';
function fmt(v){return v==null?NIL:v}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function render(){hideDetail();
  const r=rows();
  count.textContent=r.length+' of '+DATA.practices.length+' practices shown';
  let h='';
  for(const p of r){
    h+=`<tr data-code="${p.code}" data-tier="${TIER_CLASS[p.tier]}"><td><button class="practice-name linkbtn">${esc(tidyName(p.name))}</button><span class="practice-meta"><span class="practice-code">${esc(p.pc)}</span><span class="badge ${TIER_CLASS[p.tier]}">${TIER_SHORT[p.tier]}</span></span></td>
    <td class="pcn">${esc(p.pcn?tidyName(p.pcn):'n/a')}</td>
    <td class="num">${fmt(p.patients?p.patients.toLocaleString():null)}</td>
    <td class="num">${fmt(p.inb810!=null?p.inb810.toLocaleString():null)}</td>
    <td class="num">${fmt(p.missN!=null?p.missN.toLocaleString():null)}</td>
    <td class="num">${fmt(pct(p.miss810))}</td>
    <td class="num">${fmt(pct(p.fast810))}</td></tr>`}
  tbody.innerHTML=h;
  renderPcn()}

function renderPcn(){
  let h='';
  for(const p of DATA.pcns){
    h+=`<tr><td><span class="practice-name">${esc(tidyName(p.pcn))}</span></td><td class="num">${p.practices}</td>
    <td class="num">${p.high?'<span class="badge priority">'+p.high+'</span>':NIL}</td>
    <td class="num">${p.moderate||NIL}</td><td class="num">${pct(p.miss810)||NIL}</td>
    <td class="num">${p.patients.toLocaleString()}</td></tr>`}
  document.getElementById('pcnbody').innerHTML=h}

const homeMarker=document.createComment('detail-home');detail.parentElement.insertBefore(homeMarker,detail);
let detailRow=null;
function placeDetail(row){
  document.querySelectorAll('tr.detail-row').forEach(t=>t.remove());
  const mobile=!window.matchMedia('(min-width:761px)').matches;
  if(mobile&&row){
    const tr=document.createElement('tr');tr.className='detail-row';
    const td=document.createElement('td');td.colSpan=document.querySelectorAll('#ptable thead th').length||7;
    td.appendChild(detail);tr.appendChild(td);row.after(tr);detailRow=tr;
    tr.scrollIntoView({block:'nearest'});
  }else{
    homeMarker.after(detail);detailRow=null;
  }}
function hideDetail(){
  detail.classList.add('hidden');
  if(detailRow){homeMarker.after(detail);detailRow.remove();detailRow=null}}
function showDetail(code){
  const p=DATA.practices.find(x=>x.code===code);if(!p)return;
  tbody.querySelectorAll('tr.selected').forEach(t=>t.classList.remove('selected'));
  const row=tbody.querySelector(`tr[data-code="${p.code}"]`);if(row)row.classList.add('selected');
  let why,opener;
  if(p.tier==='high'){
    why=`In September, ${p.missN.toLocaleString()} calls between 8 and 10am were missed: ${p.miss810}% of ${p.inb810.toLocaleString()} in that window, at one practice, in one month. Some callers will have rung again or been helped another way; the count is call outcomes, not unique patients.`;
    opener=`\u201cI read ${esc(tidyName(p.name))}\u2019s own NHS telephony return: ${p.missN.toLocaleString()} calls were missed between 8 and 10am in September alone. EMMA is built to answer every call within three rings. Worth ten minutes to walk through what that would look like for your ${p.patients?p.patients.toLocaleString():''} patients?\u201d`;
  }else if(p.tier==='moderate'){
    why=`Phone performance is middling: ${p.miss810}% missed at 8–10am, ${p.fast810}% answered within two minutes. Beaten by pressure spikes, not broken; a demo anchored to their own busiest hour lands better than a cold pitch.`;
    opener=`\u201cYour September data shows the phones holding up most mornings but slipping at peak: ${pct(p.miss810)} missed between 8 and 10. EMMA takes the overflow so no caller waits. Can I show you how practices like yours set that up?\u201d`;
  }else if(p.tier==='hold'){
    why=`Phones are performing well (${p.miss810}% missed, ${p.fast810}% within two minutes). Not a first call, but a good benchmark reference for neighbouring practices, and worth keeping warm.`;
    opener=`\u201cYour practice is one of the stronger performers on phone access in the area, which makes you exactly the reference point for what good looks like. Curious how you got there, and whether EMMA could free the team from the phone altogether.\u201d`;
  }else{
    why=`This practice isn\u2019t in the September cloud-telephony return, so step one of the call is a discovery question, not a stat.`;
    opener=`\u201cQuick one: are you on the NHS cloud-telephony framework yet? I ask because the answer changes what I can show you about your own phone data.\u201d`;}
  const stat=(v,l)=>`<div><dt>${l}</dt><dd>${v}</dd></div>`;
  detail.innerHTML=`<button class="detail-close" aria-label="Close details">×</button>
  <h3>${esc(p.name)}</h3><p class="detail-sub">${esc(p.pc)} · ${esc(p.pcn?tidyName(p.pcn):'PCN unknown')} · ODS ${esc(p.code)} · <span class="badge ${TIER_CLASS[p.tier]}">${TIER_LABEL[p.tier]}</span></p>
  <dl class="detail-grid">
    ${stat(p.patients?p.patients.toLocaleString():'n/a','Registered patients (Oct 2026)')}
    ${stat(p.inb810!=null?p.inb810.toLocaleString():'n/a','8–10am calls (Sept)')}
    ${stat(p.missN!=null?p.missN.toLocaleString():'n/a','Missed 8–10am calls (Sept)')}
    ${stat(pct(p.miss810)||'n/a','Missed, 8–10am')}
    ${stat(pct(p.fast810)||'n/a','Answered ≤2 min, 8–10am')}
    ${stat(p.inbAll!=null?p.inbAll.toLocaleString():'n/a','All-day calls (8–18:30)')}
  </dl>
  <h4>Why this practice</h4><p>${why}</p>
  <h4>Suggested opener</h4><blockquote class="opener">${opener}</blockquote>
  <h4>Discovery questions</h4><ul>
    <li>What happens to a caller at 8:05am today: queue, engaged tone, or a person?</li>
    <li>How do you currently measure whether every patient gets through, including patients with speech difficulties or English as an additional language?</li>
    <li>If calls were answered promptly, what would your reception team do with the freed hours?</li></ul>`;
  detail.classList.remove('hidden');placeDetail(row);const cb=detail.querySelector('.detail-close');if(cb)cb.focus()}

tbody.addEventListener('click',e=>{const tr=e.target.closest('tr');if(tr&&!tr.classList.contains('detail-row'))showDetail(tr.dataset.code)});
detail.addEventListener('click',e=>{if(e.target.classList.contains('detail-close'))hideDetail()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideDetail()});
document.querySelectorAll('.tf').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tf').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});
  b.classList.add('active');b.setAttribute('aria-pressed','true');
  const map={all:'all',priority:'high',building:'moderate',holding:'hold',nodata:'unknown'};
  state.tier=map[b.dataset.tier]||'all';render()}));
pcnSel.addEventListener('change',()=>{state.pcn=pcnSel.value;render()});
searchEl.addEventListener('input',()=>{state.q=searchEl.value;render()});
document.querySelectorAll('#ptable th').forEach(th=>th.addEventListener('click',()=>{
  const k=th.dataset.k;if(state.sortK===k)state.sortDir*=-1;else{state.sortK=k;state.sortDir=-1}render()}));
render();
if(location.hash.length>1){const p0=DATA.practices.find(x=>x.code===location.hash.slice(1));if(p0)showDetail(p0.code)}
