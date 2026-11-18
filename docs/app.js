const LS=k=>JSON.parse(localStorage.getItem(k)||'null'),SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let DATA=null,done=LS('fpm_done')||{},seen=LS('fpm_seen');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>d.split('-').reverse().join('/');
function allIds(){const a=[];DATA.categories.forEach(c=>c.items.forEach(i=>a.push(i)));(DATA.skills?.groups||[]).forEach(g=>g.items.forEach(i=>a.push(i)));(DATA.templates||[]).forEach(i=>a.push(i));return a}
function initSeen(){if(seen)return;const cut=new Date(Date.now()-14*864e5).toISOString().slice(0,10);seen={};allIds().forEach(i=>{if(i.added_on<cut)seen[i.id]=1});SV('fpm_seen',seen)}
const isNew=i=>!seen[i.id];
function itemHTML(i,showCat){const n=isNew(i);return `<div class="item ${done[i.id]?'done':''} ${n?'isnew':''}" id="it-${i.id}"><input type="checkbox" data-id="${i.id}" ${done[i.id]?'checked':''}><div><div class="t">${esc(i.title)}${n?'<span class="badge">NEW</span>':''}</div><div class="d">${esc(i.detail)}</div><div class="meta">${showCat?`<span class="tag">${esc(showCat)}</span>`:''}<span class="tag">${i.frequency}</span><span class="tag ${i.priority}">${i.priority}</span><span>Added ${fmt(i.added_on)}</span>${done[i.id]?`<span>✔ ${done[i.id]}</span>`:''}</div></div></div>`}
function newItems(){const L=[];DATA.categories.forEach(c=>c.items.forEach(i=>isNew(i)&&L.push({k:'c',i,c:c.name})));(DATA.skills?.groups||[]).forEach(g=>g.items.forEach(i=>isNew(i)&&L.push({k:'s',i,c:'PM Skills - '+g.name})));return L.sort((a,b)=>b.i.added_on.localeCompare(a.i.added_on))}
function renderList(){const q=document.getElementById('q').value.toLowerCase(),f=document.getElementById('freq').value,dn=document.getElementById('done').value;let h='';
 DATA.categories.forEach(c=>{const its=c.items.filter(i=>(!f||i.frequency==f)&&(!dn||(!!done[i.id])==(dn=='1'))&&(!q||(i.title+' '+i.detail).toLowerCase().includes(q)));if(!its.length)return;const nd=c.items.filter(i=>done[i.id]).length,nn=c.items.filter(isNew).length;
 h+=`<details class="cat" ${q||f||dn?'open':''}><summary><span>${c.icon} ${esc(c.name)}${nn?`<span class="badge">${nn} NEW</span>`:''}</span><small>${nd}/${c.items.length}</small></summary>${its.map(i=>itemHTML(i)).join('')}</details>`});
 document.getElementById('list').innerHTML=h||'<div class="empty">Kuch nahi mila</div>';
 const N=newItems();document.getElementById('newc').textContent=N.length||'';
 document.getElementById('newbox').innerHTML=N.length?`<div class="newbox"><b>🆕 Naya kya hai (${N.length})</b><ul>${N.slice(0,5).map(x=>`<li>${esc(x.i.title||x.i.name)} <small>(${esc(x.c)})</small></li>`).join('')}</ul><button class="btn" data-tab="new">Sab naye dekho</button> <button class="btn" onclick="markSeen()">Sab dekh liya ✔</button></div>`:'';
 renderNew();renderSkills()}
function renderNew(){const N=newItems();document.getElementById('newlist').innerHTML=N.length?`<div class="newbox"><b>${N.length} naye points</b><button class="btn" onclick="markSeen()">Sab dekh liya ✔</button></div><details class="cat" open><summary>🆕 Naye points</summary>${N.map(x=>x.k=='c'?itemHTML(x.i,x.c):skHTML(x.i,x.c)).join('')}</details>`:'<div class="empty">Abhi koi naya point nahi. Naye points aayenge to yaha yellow me dikhenge.</div>'}
function skHTML(s,cat){const n=isNew(s);return `<div class="sk ${n?'isnew':''}"><div class="t">${esc(s.name)}${n?'<span class="badge">NEW</span>':''}</div><div class="w"><span class="lbl">Kyun zaroori:</span> ${esc(s.why)}</div><div class="h"><span class="lbl">Kaise seekhe:</span> ${esc(s.how)}</div><div class="meta">${cat?`<span class="tag">${esc(cat)}</span>`:''}<span class="tag">${esc(s.area)}</span><span>Added ${fmt(s.added_on)}</span></div></div>`}
function renderSkills(){const S=DATA.skills;if(!S){document.getElementById('skills').innerHTML='';return}
 document.getElementById('skills').innerHTML=S.groups.map(g=>{const nn=g.items.filter(isNew).length;return `<details class="cat" open><summary><span>${g.id=='must'?'⭐':'📘'} ${esc(g.name)}${nn?`<span class="badge">${nn} NEW</span>`:''}</span><small>${g.items.length}</small></summary>${g.items.map(s=>skHTML(s)).join('')}</details>`}).join('')}
function markSeen(){allIds().forEach(i=>seen[i.id]=1);SV('fpm_seen',seen);renderList()}
const TABS=['home','sites','list','new','tools','letters','skills','more'];
function tab(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab==t));TABS.forEach(x=>{const el=document.getElementById('tab-'+x);if(el)el.hidden=x!=t});const nb=document.querySelector('nav button.on');if(nb)nb.scrollIntoView({inline:'center',block:'nearest'});if(window.PM)PM.onTab(t);scrollTo(0,0)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t)tab(t.dataset.tab)});
document.addEventListener('change',e=>{if(e.target.dataset.id){const id=e.target.dataset.id;if(e.target.checked)done[id]=new Date().toLocaleDateString('en-GB');else delete done[id];SV('fpm_done',done);renderList()}});
['q','freq','done'].forEach(id=>document.getElementById(id).addEventListener('input',renderList));
async function load(){try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});DATA=await r.json();SV('fpm_data',DATA)}catch(e){DATA=LS('fpm_data')}
 if(!DATA){document.getElementById('list').innerHTML='<div class="empty">Internet on karke app kholo (pehli baar data load hoga).</div>';return}
 initSeen();const n=DATA.categories.reduce((a,c)=>a+c.items.length,0);
 document.getElementById('upd').textContent='Updated '+fmt(DATA.last_updated);
 document.getElementById('foot').textContent=`${DATA.categories.length} sections · ${n} points · ${DATA.skills?DATA.skills.groups.reduce((a,g)=>a+g.items.length,0):0} skills · v${DATA.version}`;renderList()}
load().then(()=>{if(window.PM)PM.init();const h=location.hash.slice(1);tab(TABS.includes(h)?h:'home')});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');

window.DATA_REF=()=>DATA;window.IS_NEW=i=>isNew(i);
