/* Facade PM - sites, calculators, letters, export. User data sirf is device par (localStorage). */
(function(){
const $=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const dmy=d=>d?d.split('-').reverse().join('/'):'';
const days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
const inr=v=>'₹'+Math.round(num(v)).toLocaleString('en-IN');
const lakh=v=>{v=num(v);return Math.abs(v)>=1e7?(v/1e7).toFixed(2)+' Cr':Math.abs(v)>=1e5?(v/1e5).toFixed(2)+' L':Math.round(v).toLocaleString('en-IN')};
const uid=()=>Math.random().toString(36).slice(2,9);
const AND=window.Android;
let ST=JSON.parse(localStorage.getItem('fpm_pm')||'null')||{sites:[]};
const save=()=>localStorage.setItem('fpm_pm',JSON.stringify(ST));
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2500)}
let cur=null; // open site id

/* ---------- NEW feature badges ---------- */
const FEATS={home:'Home dashboard',sites:'Site tracker',tools:'Calculators',letters:'Letters',more:'Export/Backup'};
let fseen=JSON.parse(localStorage.getItem('fpm_feat')||'{}');
function badges(){document.querySelectorAll('nav [data-feat]').forEach(b=>{let x=b.querySelector('.fbadge');if(!fseen[b.dataset.feat]){if(!x){x=document.createElement('span');x.className='fbadge';x.textContent='NEW';b.appendChild(x)}}else if(x)x.remove()})}

/* ---------- Due / reminders ---------- */
function dueList(){const T=today(),L=[];
 ST.sites.forEach(s=>{
  (s.rem||[]).forEach(r=>!r.done&&r.due&&L.push({s,d:r.due,t:(r.type?r.type+': ':'')+r.t}));
  (s.fu||[]).forEach(r=>!r.done&&r.due&&L.push({s,d:r.due,t:'Follow-up: '+r.t}));
  (s.mat||[]).forEach(r=>!r.recd&&r.exp&&L.push({s,d:r.exp,t:'Material: '+r.t+(r.qty?' ('+r.qty+')':'')}));
  if(s.nextDate)L.push({s,d:s.nextDate,t:'Target: '+(s.nextAction||'next target')});
 });
 return{over:L.filter(x=>x.d<T).sort((a,b)=>a.d.localeCompare(b.d)),tod:L.filter(x=>x.d==T),soon:L.filter(x=>x.d>T&&days(T,x.d)<=3).sort((a,b)=>a.d.localeCompare(b.d))}}
function openHolds(){const L=[];ST.sites.forEach(s=>(s.hold||[]).forEach(h=>!h.closed&&L.push({s,h,n:h.since?days(h.since,today()):0})));return L.sort((a,b)=>b.n-a.n)}
function notifyOnce(){const D=dueList(),n=D.over.length+D.tod.length;if(!n)return;const k='fpm_notified',T=today();if(localStorage.getItem(k)==T)return;
 const msg=`${D.tod.length} aaj due, ${D.over.length} overdue`;
 try{if(AND&&AND.notify){AND.notify('Facade PM',msg);localStorage.setItem(k,T)}else if('Notification'in window&&Notification.permission=='granted'){navigator.serviceWorker.ready.then(r=>r.showNotification('Facade PM',{body:msg,icon:'icon-192.png'}));localStorage.setItem(k,T)}}catch(e){}}
function askNotify(){if(AND&&AND.askNotify){AND.askNotify();toast('Permission maangi gayi')}else if('Notification'in window)Notification.requestPermission().then(p=>{toast('Notification: '+p);notifyOnce()});else toast('Is browser me notification support nahi')}

/* ---------- Home ---------- */
function li(x){return `<li><b style="display:inline">${E(x.s.name)}</b> - ${E(x.t)} <span class="small">(${dmy(x.d)})</span></li>`}
function renderHome(){const D=dueList(),H=openHolds(),S=ST.sites;
 const tot=k=>S.reduce((a,s)=>a+num(s[k]),0),cv=tot('cv'),bl=tot('billed'),rc=tot('received');
 const cnt=c=>S.filter(s=>s.status==c).length;
 let h='';
 if(D.over.length)h+=`<div class="due over"><b>⚠️ Overdue (${D.over.length})</b><ul>${D.over.map(li).join('')}</ul></div>`;
 h+=`<div class="due"><b>📌 Aaj ka due (${D.tod.length})</b>${D.tod.length?`<ul>${D.tod.map(li).join('')}</ul>`:'<span class="small">Aaj kuch due nahi.</span>'}${D.soon.length?`<div class="small" style="margin-top:4px">Agle 3 din: ${D.soon.map(x=>E(x.s.name)+' - '+E(x.t)+' ('+dmy(x.d)+')').join('; ')}</div>`:''}</div>`;
 if(H.length)h+=`<div class="card"><h4>⏳ Client decision / reply pending (${H.length})</h4>${H.slice(0,8).map(x=>`<div class="small" style="padding:2px 0"><b>${E(x.s.name)}</b>: ${E(x.h.t)} ${x.h.party?'('+E(x.h.party)+')':''} - <span class="${x.n>14?'red':x.n>7?'amber':''}">${x.n} din se</span></div>`).join('')}</div>`;
 h+=`<div class="card"><h4>Total - ${S.length} sites <span class="small">🟢${cnt('Green')} 🟠${cnt('Amber')} 🔴${cnt('Red')}</span></h4><div class="grid"><div>Contract<b>${lakh(cv)}</b></div><div>Billed<b>${lakh(bl)}</b></div><div>Received<b>${lakh(rc)}</b></div><div>Pending<b>${lakh(bl-rc)}</b></div><div>Unbilled<b>${lakh(cv-bl)}</b></div><div>Avg progress<b>${S.length?Math.round(S.reduce((a,s)=>a+num(s.progress),0)/S.length):0}%</b></div></div></div>`;
 h+=`<div class="row" style="margin-bottom:8px"><button class="btn" data-act="addsite">+ Site add karo</button><button class="btn2" data-act="print">🖨️ Weekly summary (A4)</button><button class="btn2" data-act="xlsx">📊 Excel export</button></div>`;
 if(S.length){
  h+=`<div class="dtable card"><table class="t"><tr><th>Site</th><th>Client</th><th>Status</th><th>Progress</th><th>Contract</th><th>Billed</th><th>Received</th><th>Pending</th><th>Open hold-ups</th><th>Next target</th><th>Next action</th></tr>${S.map(s=>`<tr data-site="${s.id}" style="cursor:pointer"><td>${E(s.name)}</td><td>${E(s.client)}</td><td><span class="st ${s.status}">${E(s.status||'-')}</span></td><td>${num(s.progress)}%</td><td>${lakh(s.cv)}</td><td>${lakh(s.billed)}</td><td>${lakh(s.received)}</td><td>${lakh(num(s.billed)-num(s.received))}</td><td>${(s.hold||[]).filter(x=>!x.closed).length}</td><td>${dmy(s.nextDate)}</td><td>${E(s.nextAction)}</td></tr>`).join('')}</table></div>`;
  h+=`<div class="cards">${S.map(siteCard).join('')}</div>`;
 } else h+=`<div class="card">Abhi koi site nahi hai. "+ Site add karo" dabao, ya Export/Backup tab se purana backup restore karo.</div>`;
 h+=`<div class="card small">💾 Data sirf is phone/laptop me save hota hai. Phone ↔ laptop data le jaane ke liye <b>Export/Backup</b> tab me "Backup file" banao aur dusre device par "Restore" karo. <button class="btn2" data-act="backup">Backup file</button> <button class="btn2" data-tab="more">Restore</button> <button class="btn2" data-act="notify">🔔 Notification on karo</button> <button class="btn2" id="instbtn" data-act="install" style="display:${deferred?'inline-block':'none'}">⬇️ App install karo</button></div>`;
 $('#tab-home').innerHTML=h}
function siteCard(s){const p=num(s.billed)-num(s.received),oh=(s.hold||[]).filter(x=>!x.closed).length,of=(s.fu||[]).filter(x=>!x.done).length,om=(s.mat||[]).filter(x=>!x.recd).length;
 return `<div class="card site ${s.status}" data-site="${s.id}"><h4><span>${E(s.name)}</span><span class="st ${s.status}">${E(s.status||'-')}</span></h4><div class="small">${E(s.client)}</div><div class="pbar"><i style="width:${Math.min(100,num(s.progress))}%"></i></div><div class="small">Progress ${num(s.progress)}%</div>
 <div class="grid" style="margin-top:5px"><div>Contract<b>${lakh(s.cv)}</b></div><div>Billed<b>${lakh(s.billed)}</b></div><div>Pending<b class="${p>0?'amber':''}">${lakh(p)}</b></div></div>
 <div class="small" style="margin-top:5px">Next: <b>${dmy(s.nextDate)||'-'}</b> ${E(s.nextAction)}</div><div class="small">Follow-up ${of} · Hold-ups ${oh} · Material pending ${om}</div></div>`}

/* ---------- Sites ---------- */
const FIELDS=[['name','Site name','text'],['client','Client','text'],['cv','Contract value (₹)','number'],['billed','Billed till date (₹)','number'],['received','Received (₹)','number'],['progress','Progress %','number'],['status','Status','sel:Green,Amber,Red'],['nextDate','Next target date','date'],['nextAction','Next action','text'],['notes','Notes','textarea']];
const LISTS={
 fu:{title:'📋 Follow-up list',f:[['t','Kya follow-up karna hai','text'],['due','Due date','date']],chk:'done',show:r=>`${E(r.t)} ${r.due?`<span class="small ${r.due<today()&&!r.done?'red':''}">(${dmy(r.due)})</span>`:''}`},
 hold:{title:'⏳ Client decisions / hold-ups',f:[['t','Decision / hold-up','text'],['party','Kisse (client/architect)','text'],['since','Since date','date']],chk:'closed',chkLabel:'Clear',show:r=>`${E(r.t)} ${r.party?'('+E(r.party)+')':''} <span class="small">since ${dmy(r.since)} - <b class="${days(r.since||today(),today())>14?'red':''}">${r.since?days(r.since,r.closed||today()):0} din</b>${r.closed?' · clear '+dmy(r.closed):''}</span>`},
 mat:{title:'🪟 Glass / material pending',f:[['t','Item (glass lot, ACP, hardware...)','text'],['qty','Qty','text'],['exp','Expected date','date']],chk:'recd',chkLabel:'Recd',show:r=>`${E(r.t)} ${r.qty?'- '+E(r.qty):''} <span class="small ${r.exp&&r.exp<today()&&!r.recd?'red':''}">(exp ${dmy(r.exp)})</span>`},
 rem:{title:'🔔 Reminders (billing, client reply, contractor bill)',f:[['type','Type','sel:Billing date,Client reply pending,Contractor bill due,Payment follow-up,Other'],['t','Detail','text'],['due','Due date','date'],['monthly','Har mahine repeat','chk']],chk:'done',show:r=>`<b>${E(r.type)}</b>: ${E(r.t)} <span class="small ${r.due<today()&&!r.done?'red':''}">(${dmy(r.due)}${r.monthly?', monthly':''})</span>`}
};
function inp(k,l,t,v){if(t=='textarea')return `<label class="f">${l}<textarea data-k="${k}">${E(v)}</textarea></label>`;
 if(t.startsWith('sel:'))return `<label class="f">${l}<select data-k="${k}"><option></option>${t.slice(4).split(',').map(o=>`<option ${v==o?'selected':''}>${o}</option>`).join('')}</select></label>`;
 if(t=='chk')return `<label class="f"><input type="checkbox" data-k="${k}" style="width:auto"> ${l}</label>`;
 return `<label class="f">${l}<input type="${t}" data-k="${k}" value="${E(v)}" ${t=='number'?'inputmode="decimal"':''}></label>`}
function renderSites(){const el=$('#tab-sites');const s=ST.sites.find(x=>x.id==cur);
 if(!s){el.innerHTML=`<div class="row" style="margin-bottom:8px"><button class="btn" data-act="addsite">+ Site add karo</button></div>`+(ST.sites.length?`<div class="cards">${ST.sites.map(siteCard).join('')}</div>`:'<div class="card">Koi site nahi. Upar se add karo.</div>');return}
 let h=`<div class="row"><button class="btn2" data-act="back">← Sab sites</button></div><div class="two"><div class="card" id="sform"><h4>🏢 Site details</h4><div class="row">${FIELDS.slice(0,2).map(f=>inp(f[0],f[1],f[2],s[f[0]])).join('')}</div><div class="row">${FIELDS.slice(2,5).map(f=>inp(f[0],f[1],f[2],s[f[0]])).join('')}</div><div class="row">${FIELDS.slice(5,8).map(f=>inp(f[0],f[1],f[2],s[f[0]])).join('')}</div>${inp('nextAction','Next action','text',s.nextAction)}${inp('notes','Notes','textarea',s.notes)}
 <div class="res">Pending payment: <b>${inr(num(s.billed)-num(s.received))}</b> · Unbilled: <b>${inr(num(s.cv)-num(s.billed))}</b> · Billed ${s.cv?Math.round(num(s.billed)/num(s.cv)*100):0}%</div>
 <button class="btn red" data-act="delsite" style="margin-top:8px">Site delete</button></div><div>`;
 for(const k in LISTS){const L=LISTS[k],arr=s[k]||[];
  h+=`<div class="card"><h4>${L.title} <span class="small">${arr.filter(r=>!r[L.chk]).length} open</span></h4>${arr.map(r=>`<div class="li ${r[L.chk]?'ok':''}"><input type="checkbox" data-lchk="${k}" data-id="${r.id}" ${r[L.chk]?'checked':''} title="${L.chkLabel||'Done'}"><div class="tt">${L.show(r)}</div><button class="x" data-ldel="${k}" data-id="${r.id}">×</button></div>`).join('')}
  <div class="row addrow" data-list="${k}">${L.f.map(f=>f[2]=='chk'?`<label class="small"><input type="checkbox" data-f="${f[0]}"> ${f[1]}</label>`:f[2].startsWith('sel:')?`<select class="i" data-f="${f[0]}">${f[2].slice(4).split(',').map(o=>`<option>${o}</option>`).join('')}</select>`:`<input class="i" type="${f[2]}" data-f="${f[0]}" placeholder="${f[1]}" ${f[2]=='date'?`title="${f[1]}" value="${f[0]=='since'?today():''}"`:''}>`).join('')}<button class="btn" data-ladd="${k}" style="flex:0 0 auto">Add</button></div></div>`}
 el.innerHTML=h+'</div></div>'}
function addSite(){const s={id:uid(),name:'Nayi site '+(ST.sites.length+1),client:'',cv:'',billed:'',received:'',progress:0,status:'Green',nextDate:'',nextAction:'',fu:[],hold:[],mat:[],rem:[]};ST.sites.push(s);save();cur=s.id;window.tab('sites');setTimeout(()=>{const i=$('#sform [data-k=name]');i&&(i.select(),i.focus())},50)}
function listAdd(k,row){const s=ST.sites.find(x=>x.id==cur),r={id:uid()};row.querySelectorAll('[data-f]').forEach(i=>r[i.dataset.f]=i.type=='checkbox'?i.checked:i.value.trim());if(!r.t){toast('Detail likho');return}(s[k]=s[k]||[]).push(r);save();renderSites();const n=$(`.addrow[data-list=${k}] [data-f=t]`);n&&n.focus()}

/* ---------- Calculators ---------- */
function renderTools(){$('#tab-tools').innerHTML=`<div class="tools">
<details class="cat" open><summary>🪟 Glass sqm / nos</summary><div style="padding:0 10px 10px"><div class="small">Har line: Width x Height (mm) x Nos. Example: 1200x2400x10</div><textarea class="i" id="g_in">1200x2400x10
1500x2400x6</textarea><div class="row"><label class="f">Wastage / extra %<input type="number" id="g_w" value="0"></label></div><div class="res" id="g_out"></div></div></details>
<details class="cat" open><summary>🧴 Silicone consumption</summary><div style="padding:0 10px 10px"><div class="row"><label class="f">Bead width (mm)<input type="number" id="s_w" value="10"></label><label class="f">Depth (mm)<input type="number" id="s_d" value="10"></label></div><div class="row"><label class="f">Running metre (rmt)<input type="number" id="s_l" value="500"></label><label class="f">Wastage %<input type="number" id="s_x" value="10"></label></div><div class="res" id="s_out"></div></div></details>
<details class="cat" open><summary>🧾 RA / stage billing</summary><div style="padding:0 10px 10px"><div class="row"><label class="f">Rate (₹ per unit)<input type="number" id="b_r" value="12000"></label><label class="f">BOQ qty<input type="number" id="b_q" value="6600"></label></div>
<table class="t"><tr><th>Stage</th><th>%</th><th>Cum. qty</th></tr><tr><td>Material receipt</td><td><input class="i" type="number" id="b_p1" value="60"></td><td><input class="i" type="number" id="b_q1" value="4000"></td></tr><tr><td>Installation</td><td><input class="i" type="number" id="b_p2" value="30"></td><td><input class="i" type="number" id="b_q2" value="3000"></td></tr><tr><td>Handover</td><td><input class="i" type="number" id="b_p3" value="10"></td><td><input class="i" type="number" id="b_q3" value="1000"></td></tr></table>
<label class="f">Previous billed (₹)<input type="number" id="b_prev" value="0"></label><div class="res" id="b_out"></div></div></details>
<details class="cat" open><summary>📅 Delay days</summary><div style="padding:0 10px 10px"><div class="row"><label class="f">From<input type="date" id="d_a"></label><label class="f">To<input type="date" id="d_b"></label></div><label class="f"><input type="checkbox" id="d_sun" style="width:auto"> Sunday ko count mat karo</label><div class="res" id="d_out"></div></div></details>
<details class="cat" open><summary>⚖️ Penalty / LD</summary><div style="padding:0 10px 10px"><div class="row"><label class="f">Order value (₹)<input type="number" id="p_v" value="50000000"></label><label class="f">Glass value minus (₹)<input type="number" id="p_g" value="15000000"></label></div><div class="row"><label class="f">Penalty %<input type="number" id="p_r" value="3"></label><label class="f">Per<select id="p_per"><option value="30">Month</option><option value="7">Week</option></select></label></div><div class="row"><label class="f">Delay days<input type="number" id="p_d" value="60"></label><label class="f">Max cap % (0 = no cap)<input type="number" id="p_c" value="10"></label></div><div class="res" id="p_out"></div></div></details>
<details class="cat" open><summary>⏱️ EOT (longest path)</summary><div style="padding:0 10px 10px"><div class="small">Har line: Reason, start date, end date (DD/MM/YYYY). Same period ke reasons ko sum mat karo.</div><textarea class="i" id="e_in">Glass delay, 06/06/2026, 25/08/2026
Area clearance, 01/07/2026, 15/09/2026
Rain, 10/07/2026, 20/07/2026</textarea><label class="f">Original completion date<input type="date" id="e_c" value="2026-08-18"></label><div class="res" id="e_out"></div></div></details>
</div>`;calc()}
const V=id=>num(($('#'+id)||{}).value);
function pd(s){const m=String(s).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}
function calc(){if(!$('#g_in'))return;
 let tn=0,ta=0,rows=[];$('#g_in').value.split('\n').forEach(l=>{const m=l.match(/(\d+(?:\.\d+)?)\s*[x*×X]\s*(\d+(?:\.\d+)?)(?:\s*[x*×X]\s*(\d+))?/);if(!m)return;const n=+(m[3]||1),a=m[1]*m[2]/1e6;tn+=n;ta+=a*n;rows.push(`${m[1]}x${m[2]}: ${a.toFixed(3)} sqm x ${n} = <b>${(a*n).toFixed(2)}</b>`)});
 const w=V('g_w');$('#g_out').innerHTML=rows.join('<br>')+`<br>Total nos: <b>${tn}</b> · Total area: <b>${ta.toFixed(2)} sqm</b>${w?` · With ${w}%: <b>${(ta*(1+w/100)).toFixed(2)} sqm</b>`:''}`;
 const ml=V('s_w')*V('s_d')*V('s_l')*(1+V('s_x')/100);$('#s_out').innerHTML=`Volume: <b>${(ml/1000).toFixed(2)} litre</b><br>300 ml cartridge: <b>${Math.ceil(ml/300)}</b> nos<br>600 ml sausage: <b>${Math.ceil(ml/600)}</b> nos<br><span class="small">Formula: width x depth (mm) x rmt = ml</span>`;
 const r=V('b_r'),q=V('b_q'),st=[1,2,3].map(i=>r*V('b_q'+i)*V('b_p'+i)/100),tot=st.reduce((a,b)=>a+b,0),ok=V('b_p1')+V('b_p2')+V('b_p3');
 $('#b_out').innerHTML=`Material: ${inr(st[0])}<br>Installation: ${inr(st[1])}<br>Handover: ${inr(st[2])}<br>Cumulative: <b>${inr(tot)}</b> (${q&&r?(tot/(q*r)*100).toFixed(1):0}% of BOQ ${inr(q*r)})<br>Is RA bill: <b>${inr(tot-V('b_prev'))}</b>${ok!=100?`<br><span class="red">Stage % ka total ${ok}% hai, 100% hona chahiye</span>`:''}${[1,2,3].some(i=>V('b_q'+i)>q)?'<br><span class="red">Qty BOQ se zyada hai - amendment chahiye</span>':''}`;
 const a=$('#d_a').value,b=$('#d_b').value;if(a&&b){let n=days(a,b),s=0;if($('#d_sun').checked){for(let d=new Date(a);d<new Date(b);d.setDate(d.getDate()+1))if(d.getDay()==0)s++}n-=s;$('#d_out').innerHTML=`<b>${n} din</b>${s?` (${s} Sunday hataye)`:''} · ${(n/7).toFixed(1)} week · ${(n/30).toFixed(1)} month`}else $('#d_out').textContent='Dono date daalo';
 const base=V('p_v')-V('p_g'),pen=base*V('p_r')/100*V('p_d')/num($('#p_per').value),cap=V('p_c')?base*V('p_c')/100:Infinity;
 $('#p_out').innerHTML=`Base value (glass excluded): <b>${inr(base)}</b><br>Penalty: ${inr(pen)}${cap<Infinity?`<br>Cap ${V('p_c')}%: ${inr(cap)}`:''}<br>Final penalty: <b>${inr(Math.min(pen,cap))}</b>${pen>cap?' (cap lag gaya)':''}<br><span class="small">Base value contract clause ke hisab se check karo.</span>`;
 const ev=[];$('#e_in').value.split('\n').forEach(l=>{const p=l.split(',');if(p.length<3)return;const s=pd(p[1]),e=pd(p[2]);if(s&&e&&e>=s)ev.push({n:p[0].trim(),s,e,d:days(s,e)+1})});
 if(ev.length){const sum=ev.reduce((a,x)=>a+x.d,0),lg=ev.reduce((a,x)=>x.d>a.d?x:a);const sr=[...ev].sort((a,b)=>a.s.localeCompare(b.s));let un=0,cs=null,ce=null;sr.forEach(x=>{if(!cs){cs=x.s;ce=x.e}else if(x.s<=addDays(ce,1)){if(x.e>ce)ce=x.e}else{un+=days(cs,ce)+1;cs=x.s;ce=x.e}});un+=days(cs,ce)+1;const c=$('#e_c').value;
  $('#e_out').innerHTML=ev.map(x=>`${E(x.n)}: ${dmy(x.s)} - ${dmy(x.e)} = ${x.d} din`).join('<br>')+`<br>Longest path: <b>${E(lg.n)} = ${lg.d} din</b> (EOT claim isi par)<br>Combined period (overlap hata ke): ${un} din<br><span class="small">Simple sum ${sum} din - sirf reference, claim me mat jodo.</span>${c?`<br>Revised completion: <b>${dmy(addDays(c,lg.d))}</b>`:''}`}else $('#e_out').textContent='Line format: Reason, DD/MM/YYYY, DD/MM/YYYY';
}

/* ---------- Letters ---------- */
let tsel=null;
function renderLetters(){const T=(window.DATA_REF()||{}).templates||[];if(!T.length){$('#tab-letters').innerHTML='<div class="card">Templates load nahi hue (internet on karke kholo).</div>';return}
 if(!tsel)tsel=T[0].id;const t=T.find(x=>x.id==tsel)||T[0];const ph=[...new Set((t.subject+'\n'+t.body).match(/\{\{[^}]+\}\}/g)||[])].map(x=>x.slice(2,-2));
 const vals=JSON.parse(localStorage.getItem('fpm_tv')||'{}');const sn=window.IS_NEW||(()=>false);
 $('#tab-letters').innerHTML=`<div class="two"><div class="card"><label class="f">Template<select class="i" id="t_sel">${T.map(x=>`<option value="${x.id}" ${x.id==t.id?'selected':''}>${E(x.name)}${sn(x)?' (NEW)':''}</option>`).join('')}</select></label>
 <label class="f">Site se bharo<select class="i" id="t_site"><option value="">-- site chuno --</option>${ST.sites.map(s=>`<option value="${s.id}">${E(s.name)}</option>`).join('')}</select></label>
 ${ph.map(p=>`<label class="f">${E(p)}<input class="i" data-ph="${E(p)}" value="${E(p=='Date'?dmy(today()):vals[p]||'')}"></label>`).join('')}</div>
 <div class="card"><h4>Preview <span class="small">${E(t.lang||'')}</span></h4><label class="f">Subject<input class="i" id="t_subj"></label><textarea class="i" id="t_out" style="min-height:300px"></textarea><div class="row"><button class="btn" data-act="tcopy">📋 Copy</button><button class="btn2" data-act="tshare">📤 Share</button><button class="btn2" data-act="tmail">✉️ Email</button></div><div class="small">Bhejne se pehle text check kar lo. Saboot (photo, MOM, email ref) attach karo.</div></div></div>`;fillT()}
function fillT(){const T=(window.DATA_REF()||{}).templates||[],t=T.find(x=>x.id==tsel);if(!t||!$('#t_out'))return;const v={};document.querySelectorAll('[data-ph]').forEach(i=>v[i.dataset.ph]=i.value);
 const rep=s=>s.replace(/\{\{([^}]+)\}\}/g,(m,k)=>v[k]||'['+k+']');$('#t_subj').value=rep(t.subject||'');$('#t_out').value=rep(t.body);
 const sv=JSON.parse(localStorage.getItem('fpm_tv')||'{}');Object.assign(sv,v);delete sv.Date;localStorage.setItem('fpm_tv',JSON.stringify(sv))}
function copyText(s){if(AND&&AND.copy){AND.copy(s);toast('Copy ho gaya');return}if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>toast('Copy ho gaya'),()=>fb());else fb();function fb(){const t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();toast('Copy ho gaya')}}
function shareText(s,sub){if(AND&&AND.shareText)AND.shareText(sub||'',s);else if(navigator.share)navigator.share({title:sub,text:s}).catch(()=>{});else copyText(s)}

/* ---------- Export / backup ---------- */
function renderMore(){$('#tab-more').innerHTML=`<div class="two"><div class="card"><h4>📊 Excel export</h4><div class="small">Sites master, follow-ups, hold-ups, material pending, reminders - .xlsx (plain grey header, borders).</div><button class="btn" data-act="xlsx" style="margin-top:6px">Excel (.xlsx) banao</button></div>
<div class="card"><h4>🖨️ Weekly summary (A4, 1 page)</h4><div class="small">Boss ke liye: status, billing, issues, help chahiye. Print ya "Save as PDF".</div><button class="btn" data-act="print" style="margin-top:6px">Print / PDF</button></div>
<div class="card"><h4>💾 Backup / Restore (phone ↔ laptop)</h4><div class="small">1) Is device par "Backup file" dabao - .json file banegi (WhatsApp/Drive/Email se bhej sakte ho). 2) Dusre device par "Restore" dabao aur wo file chuno. Restore se us device ka data replace hoga.</div><button class="btn" data-act="backup" style="margin-top:6px">Backup file</button><label class="btn2" style="display:inline-block">Restore<input type="file" id="restore" accept=".json,application/json" style="display:none"></label><div class="small" style="margin-top:6px">Last backup: ${localStorage.getItem('fpm_lastbk')||'kabhi nahi'}</div></div>
<div class="card"><h4>🔔 Notifications</h4><div class="small">Battery bachane ke liye koi background alarm nahi. App kholne par hi "Aaj ka due / Overdue" dikhega, aur din me ek baar notification (permission ho to).</div><button class="btn2" data-act="notify">Notification allow karo</button></div>
<div class="card"><h4>🗑️ Data clear</h4><div class="small">Sirf is device ka site data hatega.</div><button class="btn red" data-act="clear" style="margin-top:6px">Sab site data delete</button></div></div>`}
function b64(buf){let s='',b=new Uint8Array(buf);for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return btoa(s)}
function download(name,data,mime){if(AND&&AND.saveFile){AND.saveFile(name,typeof data=='string'?btoa(unescape(encodeURIComponent(data))):b64(data),mime);return}
 const u=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);toast(name+' download ho gaya')}
function backup(){const d={app:'Facade PM',type:'backup',at:new Date().toISOString(),pm:ST,done:JSON.parse(localStorage.getItem('fpm_done')||'{}'),tv:JSON.parse(localStorage.getItem('fpm_tv')||'{}')};
 download(`FacadePM_backup_${today()}.json`,JSON.stringify(d,null,1),'application/json');localStorage.setItem('fpm_lastbk',dmy(today()))}
function restore(f){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.pm||!Array.isArray(d.pm.sites))throw 0;if(!confirm(`Backup (${d.pm.sites.length} sites, ${(d.at||'').slice(0,10)}) restore karein? Is device ka current data replace hoga.`))return;ST=d.pm;save();if(d.done)localStorage.setItem('fpm_done',JSON.stringify(d.done));if(d.tv)localStorage.setItem('fpm_tv',JSON.stringify(d.tv));toast('Restore ho gaya');setTimeout(()=>location.reload(),800)}catch(e){alert('Ye Facade PM backup file nahi lagti')}};r.readAsText(f)}
function loadX(){return window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='lib/xlsx.min.js';s.onload=ok;s.onerror=()=>no();document.head.appendChild(s)})}
function sheet(head,rows,widths){const ws=XLSX.utils.aoa_to_sheet([head,...rows]);const bd={style:'thin',color:{rgb:'808080'}},B={top:bd,bottom:bd,left:bd,right:bd};
 const rg=XLSX.utils.decode_range(ws['!ref']);for(let R=rg.s.r;R<=rg.e.r;R++)for(let C=rg.s.c;C<=rg.e.c;C++){const a=XLSX.utils.encode_cell({r:R,c:C});if(!ws[a])ws[a]={t:'s',v:''};ws[a].s={border:B,alignment:{horizontal:'center',vertical:'center',wrapText:true},font:{name:'Calibri',sz:10,bold:R==0},...(R==0?{fill:{fgColor:{rgb:'D9D9D9'}}}:{})};if(R>0&&typeof ws[a].v=='number'&&ws[a].v>999)ws[a].z='#,##0'}
 ws['!cols']=widths.map(w=>({wch:w}));return ws}
async function xlsx(){try{await loadX()}catch(e){toast('Excel library load nahi hui - internet on karo');return}
 const S=ST.sites,wb=XLSX.utils.book_new(),n=v=>num(v),d=dmy;
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Client','Status','Progress %','Contract value','Billed','Received','Pending','Unbilled','Open hold-ups','Next target','Next action','Notes'],S.map((s,i)=>[i+1,s.name,s.client,s.status,n(s.progress),n(s.cv),n(s.billed),n(s.received),n(s.billed)-n(s.received),n(s.cv)-n(s.billed),(s.hold||[]).filter(x=>!x.closed).length,d(s.nextDate),s.nextAction,s.notes||'']),[5,22,18,9,10,14,14,14,14,14,10,12,30,30]),'Sites_Master');
 const flat=(k,f)=>{const o=[];S.forEach(s=>(s[k]||[]).forEach(r=>o.push(f(s,r))));return o.map((r,i)=>[i+1,...r])};
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Follow-up','Due date','Status'],flat('fu',(s,r)=>[s.name,r.t,d(r.due),r.done?'Done':(r.due&&r.due<today()?'Overdue':'Pending')]),[5,22,45,12,10]),'Follow_ups');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Decision / hold-up','Pending from','Since','Clear date','Days','Status'],flat('hold',(s,r)=>[s.name,r.t,r.party||'',d(r.since),d(r.closed),r.since?days(r.since,r.closed||today()):'',r.closed?'Clear':'Pending']),[5,22,45,16,12,12,8,10]),'Hold_ups');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Item','Qty','Expected','Status'],flat('mat',(s,r)=>[s.name,r.t,r.qty||'',d(r.exp),r.recd?'Received':(r.exp&&r.exp<today()?'Overdue':'Pending')]),[5,22,40,12,12,10]),'Material_Pending');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Type','Detail','Due date','Monthly','Status'],flat('rem',(s,r)=>[s.name,r.type,r.t,d(r.due),r.monthly?'Yes':'No',r.done?'Done':(r.due<today()?'Overdue':'Pending')]),[5,22,20,40,12,9,10]),'Reminders');
 const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});download(`FacadePM_Sites_${today()}.xlsx`,out,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
function printSummary(){const S=ST.sites,D=dueList(),H=openHolds(),tot=k=>S.reduce((a,s)=>a+num(s[k]),0);
 const wk=new Date();const st=new Date(wk-6*864e5).toISOString().slice(0,10);
 $('#print').innerHTML=`<h2>Weekly Site Summary - ${dmy(st)} to ${dmy(today())}</h2>
 <table><tr><th>Sr</th><th>Site</th><th>Client</th><th>Status</th><th>Progress</th><th>Contract</th><th>Billed</th><th>Received</th><th>Pending</th><th>Next target</th><th>Next action</th></tr>${S.map((s,i)=>`<tr><td>${i+1}</td><td>${E(s.name)}</td><td>${E(s.client)}</td><td>${E(s.status)}</td><td>${num(s.progress)}%</td><td>${lakh(s.cv)}</td><td>${lakh(s.billed)}</td><td>${lakh(s.received)}</td><td>${lakh(num(s.billed)-num(s.received))}</td><td>${dmy(s.nextDate)}</td><td>${E(s.nextAction)}</td></tr>`).join('')}<tr><th colspan="5">Total</th><th>${lakh(tot('cv'))}</th><th>${lakh(tot('billed'))}</th><th>${lakh(tot('received'))}</th><th>${lakh(tot('billed')-tot('received'))}</th><th colspan="2"></th></tr></table>
 <h3>Pending client decisions / hold-ups</h3><table><tr><th>Site</th><th>Decision / hold-up</th><th>Pending from</th><th>Since</th><th>Days</th></tr>${H.length?H.slice(0,12).map(x=>`<tr><td>${E(x.s.name)}</td><td>${E(x.h.t)}</td><td>${E(x.h.party)}</td><td>${dmy(x.h.since)}</td><td>${x.n}</td></tr>`).join(''):'<tr><td colspan="5">Nil</td></tr>'}</table>
 <h3>Overdue / due items</h3><table><tr><th>Site</th><th>Item</th><th>Date</th></tr>${[...D.over,...D.tod].length?[...D.over,...D.tod].slice(0,12).map(x=>`<tr><td>${E(x.s.name)}</td><td>${E(x.t)}</td><td>${dmy(x.d)}</td></tr>`).join(''):'<tr><td colspan="3">Nil</td></tr>'}</table>
 <h3>Help required from management</h3><table><tr><th>Site</th><th>Point</th></tr>${S.filter(s=>s.status=='Red').map(s=>`<tr><td>${E(s.name)}</td><td>${E(s.notes||s.nextAction)}</td></tr>`).join('')||'<tr><td colspan="2">Nil</td></tr>'}</table>`;
 if(AND&&AND.print){document.body.classList.add('printing');setTimeout(()=>{AND.print('FacadePM_Weekly_'+today());setTimeout(()=>document.body.classList.remove('printing'),1500)},300)}else window.print()}

/* ---------- install prompt ---------- */
let deferred=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=$('#instbtn');if(b)b.style.display='inline-block'});

/* ---------- events ---------- */
document.addEventListener('click',e=>{const a=e.target.closest('[data-act],[data-site],[data-ladd],[data-ldel]');if(!a)return;
 if(a.dataset.site){cur=a.dataset.site;window.tab('sites');return}
 if(a.dataset.ladd){listAdd(a.dataset.ladd,a.closest('.addrow'));return}
 if(a.dataset.ldel){if(!confirm('Delete?'))return;const s=ST.sites.find(x=>x.id==cur);s[a.dataset.ldel]=s[a.dataset.ldel].filter(r=>r.id!=a.dataset.id);save();renderSites();return}
 const act=a.dataset.act;
 if(act=='addsite')addSite();else if(act=='back'){cur=null;renderSites()}
 else if(act=='delsite'){if(confirm('Is site ka sara data delete karein?')){ST.sites=ST.sites.filter(s=>s.id!=cur);cur=null;save();renderSites()}}
 else if(act=='print')printSummary();else if(act=='xlsx')xlsx();else if(act=='backup')backup();else if(act=='notify')askNotify();
 else if(act=='clear'){if(confirm('Pakka? Pehle backup le lo.')){ST={sites:[]};save();toast('Clear ho gaya')}}
 else if(act=='tcopy')copyText($('#t_subj').value+'\n\n'+$('#t_out').value);else if(act=='tshare')shareText($('#t_out').value,$('#t_subj').value);
 else if(act=='tmail')location.href='mailto:?subject='+encodeURIComponent($('#t_subj').value)+'&body='+encodeURIComponent($('#t_out').value);
 else if(act=='install'&&deferred){deferred.prompt();deferred=null}});
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.k&&cur){const s=ST.sites.find(x=>x.id==cur);s[t.dataset.k]=t.value;save();if(['cv','billed','received','status','name'].includes(t.dataset.k))renderSites()}
 if(t.dataset.lchk){const s=ST.sites.find(x=>x.id==cur),L=LISTS[t.dataset.lchk],r=s[t.dataset.lchk].find(x=>x.id==t.dataset.id);
  if(t.dataset.lchk=='rem'&&r.monthly&&t.checked){const d=new Date(r.due||today());d.setMonth(d.getMonth()+1);r.due=d.toISOString().slice(0,10);toast('Agla due: '+dmy(r.due))}
  else r[L.chk]=L.chk=='closed'?(t.checked?today():''):t.checked;save();renderSites()}
 if(t.id=='t_sel'){tsel=t.value;renderLetters()}
 if(t.id=='t_site'){const s=ST.sites.find(x=>x.id==t.value);if(s){const m={'Site name':s.name,'Client':s.client,'Project':s.name};document.querySelectorAll('[data-ph]').forEach(i=>{if(m[i.dataset.ph]!=null)i.value=m[i.dataset.ph]});fillT()}}
 if(t.id=='restore'&&t.files[0])restore(t.files[0]);
 if(t.closest&&t.closest('#tab-tools'))calc()});
document.addEventListener('input',e=>{if(e.target.closest('#tab-tools'))calc();if(e.target.dataset.ph!=null)fillT()});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.closest('.addrow')&&e.target.tagName=='INPUT'){e.preventDefault();listAdd(e.target.closest('.addrow').dataset.list,e.target.closest('.addrow'))}});

window.PM={init(){badges();notifyOnce()},onTab(t){if(FEATS[t]&&!fseen[t]){fseen[t]=1;localStorage.setItem('fpm_feat',JSON.stringify(fseen));badges()}
 if(t=='home')renderHome();else if(t=='sites')renderSites();else if(t=='tools'){if(!$('#g_in'))renderTools()}else if(t=='letters')renderLetters();else if(t=='more')renderMore()},
 _st:()=>ST};
})();
