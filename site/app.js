const tbody=document.getElementById('tbody'),count=document.getElementById('count'),
detail=document.getElementById('detail'),pcnSel=document.getElementById('pcnFilter'),
searchEl=document.getElementById('search');
const TIER_LABEL={high:'Priority',moderate:'Building',hold:'Holding',unknown:'No telephony data',low_volume:'Low volume'};
let state={tier:'all',pcn:'',q:'',sortK:'missN',sortDir:-1};

DATA.pcns.forEach(p=>{const o=document.createElement('option');o.value=p.pcn;o.textContent=p.pcn;pcnSel.appendChild(o)});

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

function fmt(v){return v==null?'<span class="na">—</span>':v}
function render(){
  const r=rows();
  count.textContent=r.length+' of '+DATA.practices.length+' practices · '+DATA.icb+' · '+DATA.period;
  let h='';
  for(const p of r){
    h+=`<tr data-code="${p.code}"><td><button class="linkbtn tname">${esc(p.name)}</button><br><span class="tpcn">${esc(p.pc)}</span></td>
    <td><span class="tpcn">${esc(p.pcn||'—')}</span></td>
    <td class="num">${fmt(p.patients?p.patients.toLocaleString():null)}</td>
    <td class="num">${fmt(p.inb810!=null?p.inb810.toLocaleString():null)}</td>
    <td class="num">${fmt(p.missN!=null?p.missN.toLocaleString():null)}</td>
    <td class="num">${fmt(p.miss810!=null?p.miss810+'%':null)}</td>
    <td class="num">${fmt(p.fast810!=null?p.fast810+'%':null)}</td></tr>`}
  tbody.innerHTML=h;
  renderPcn()}
function renderPcn(){
  let h='';
  for(const p of DATA.pcns){
    h+=`<tr><td><span class="tname">${esc(p.pcn)}</span></td><td class="num">${p.practices}</td>
    <td class="num">${p.high?'<span class="badge b-high">'+p.high+'</span>':'—'}</td>
    <td class="num">${p.moderate||'—'}</td><td class="num">${p.miss810!=null?p.miss810+'%':'—'}</td>
    <td class="num">${p.patients.toLocaleString()}</td></tr>`}
  document.getElementById('pcnbody').innerHTML=h}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function showDetail(code){
  const p=DATA.practices.find(x=>x.code===code);if(!p)return;
  let why,opener;
  if(p.tier==='high'){
    why=`${p.missN.toLocaleString()} 8–10am calls went unanswered in September — ${p.miss810}% of ${p.inb810.toLocaleString()} calls in that window, at one practice, in one month. Some callers will have rung again or been helped another way — the count is call outcomes, not unique patients.`;
    opener=`"I read ${esc(p.name)}'s own NHS telephony return — ${p.missN.toLocaleString()} calls went unanswered between 8 and 10am in September alone. EMMA answers every call on the first ring. Worth ten minutes to walk through what that would look like for your ${p.patients?p.patients.toLocaleString():''} patients?"`;
  }else if(p.tier==='moderate'){
    why=`Phone performance is middling: ${p.miss810}% missed at 8–10am, ${p.fast810}% answered within two minutes. Beaten by pressure spikes, not broken — a demo anchored to their own busiest hour lands better than a cold pitch.`;
    opener=`"Your September data shows the phones holding up most mornings but slipping at peak — ${p.miss810}% missed between 8 and 10. EMMA takes the overflow so no caller waits. Can I show you how practices like yours set that up?"`;
  }else if(p.tier==='hold'){
    why=`Phones are performing well (${p.miss810}% missed, ${p.fast810}% within two minutes). Not a first call — but a good benchmark reference for neighbouring practices, and worth keeping warm.`;
    opener=`"Your practice is one of the stronger performers on phone access in the area — which makes you exactly the reference point for what good looks like. Curious how you got there, and whether EMMA could free the team from the phone altogether."`;
  }else{
    why=`This practice isn't in the September cloud-telephony return — so step one of the call is a discovery question, not a stat.`;
    opener=`"Quick one — are you on the NHS cloud-telephony framework yet? I ask because the answer changes what I can show you about your own phone data."`;}
  detail.innerHTML=`<button class="dclose" aria-label="Close">×</button>
  <h3>${esc(p.name)}</h3><div class="dmeta">${esc(p.pc)} · ${esc(p.pcn||'PCN unknown')} · ODS ${esc(p.code)} · <span class="badge b-${p.tier}">${TIER_LABEL[p.tier]}</span></div>
  <div class="dgrid">
    <div class="stat"><b>${p.patients?p.patients.toLocaleString():'—'}</b><span>Registered patients (Oct 2026)</span></div>
    <div class="stat"><b>${p.inb810!=null?p.inb810.toLocaleString():'—'}</b><span>8–10am calls (Sept)</span></div>
    <div class="stat"><b>${p.missN!=null?p.missN.toLocaleString():'—'}</b><span>Missed 8–10am calls (Sept)</span></div>
    <div class="stat"><b>${p.miss810!=null?p.miss810+'%':'—'}</b><span>Missed, 8–10am</span></div>
    <div class="stat"><b>${p.fast810!=null?p.fast810+'%':'—'}</b><span>Answered ≤2 min, 8–10am</span></div>
    <div class="stat"><b>${p.inbAll!=null?p.inbAll.toLocaleString():'—'}</b><span>All-day calls (8–18:30)</span></div>
    <div class="stat"><b>${p.missAll!=null?p.missAll+'%':'—'}</b><span>Missed, all day</span></div>
  </div>
  <h4>Why this practice</h4><p>${why}</p>
  <h4>Suggested opener</h4><p>${opener}</p>
  <h4>Discovery questions</h4><ul>
    <li>What happens to a caller at 8:05am today — queue, engaged tone, or a person?</li>
    <li>How do you currently measure whether every patient gets through — including patients with speech difficulties or English as an additional language?</li>
    <li>If calls were answered on the first ring, what would your reception team do with the freed hours?</li></ul>`;
  detail.classList.remove('hidden')}

tbody.addEventListener('click',e=>{const tr=e.target.closest('tr');if(tr)showDetail(tr.dataset.code)});
detail.addEventListener('click',e=>{if(e.target.classList.contains('dclose'))detail.classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')detail.classList.add('hidden')});
document.querySelectorAll('.tf').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tf').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  state.tier=b.dataset.tier;render()}));
pcnSel.addEventListener('change',()=>{state.pcn=pcnSel.value;render()});
searchEl.addEventListener('input',()=>{state.q=searchEl.value;render()});
document.querySelectorAll('#ptable th').forEach(th=>th.addEventListener('click',()=>{
  const k=th.dataset.k;if(state.sortK===k)state.sortDir*=-1;else{state.sortK=k;state.sortDir=-1}render()}));
render();
if(location.hash.length>1){const p0=DATA.practices.find(x=>x.code===location.hash.slice(1));if(p0)showDetail(p0.code)}
