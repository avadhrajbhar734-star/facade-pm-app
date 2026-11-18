/* Facade PM - BOQ driven control: items, dated logs, alerts, variations, reconciliation, RA bills, import */
(function(){
const X=()=>PM.X,$=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>parseFloat(String(v??'').replace(/[,₹\s]/g,''))||0,q=v=>Math.round(num(v)*100)/100;
const today=()=>X().today(),dmy=d=>X().dmy(d),inr=v=>X().inr(v),lakh=v=>X().lakh(v),uid=()=>Math.random().toString(36).slice(2,9);
const TYPES={recd:'Material received',inst:'Installed',waste:'Wastage / breakage',cbm:'Client billed - Material',cbi:'Client billed - Installation',cbh:'Client billed - Handover',cont:'Contractor / labour billed'};
const REFL={recd:'DC no.',inst:'JMR no.',waste:'Report',cbm:'RA bill no.',cbi:'RA bill no.',cbh:'RA bill no.',cont:'Contractor bill no.'};
let bsite=null,bview='items',bitem=null,imp=null,raEdit=null;
const site=()=>X().ST.sites.find(s=>s.id==bsite);
function B(s){if(!s.boq)s.boq={items:[],logs:[],vos:[],ras:[],stages:{m:60,i:30,h:10}};const b=s.boq;['items','logs','vos','ras'].forEach(k=>b[k]=b[k]||[]);b.stages=b.stages||{m:60,i:30,h:10};return b}
function sums(b,id){const r={recd:0,inst:0,waste:0,cbm:0,cbi:0,cbh:0,cont:0};b.logs.forEach(l=>{if(l.item==id&&r[l.type]!=null)r[l.type]+=num(l.qty)});for(const k in r)r[k]=q(r[k]);return r}
function calc(b,it){const c=sums(b,it.id),Q=num(it.qty),R=num(it.rate),st=b.stages;
 c.qty=Q;c.amt=Q*R;c.bal=q(Q-c.inst);c.pct=Q?Math.round(c.inst/Q*1000)/10:0;c.billed=R*(c.cbm*st.m+c.cbi*st.i+c.cbh*st.h)/100;c.exec=c.inst*R;c.stock=q(c.recd-c.inst-c.waste);c.wpct=c.recd?Math.round(c.waste/c.recd*1000)/10:0;
 c.excess=q(Math.max(c.recd,c.inst,c.cbm,c.cbi,c.cbh,c.cont)-Q);const A=[];
 if(c.cont>c.inst)A.push(['red',`Contractor billed ${c.cont} > installed ${c.inst}`]);
 if(c.cont>Q)A.push(['red',`Contractor billed ${c.cont} > BOQ ${Q}`]);
 if(c.cbm>c.recd)A.push(['red',`Client material billed ${c.cbm} > received ${c.recd}`]);
 if(c.cbi>c.inst||c.cbh>c.inst)A.push(['red',`Client billed > executed (${c.inst})`]);
 if(c.cbh>c.cbi)A.push(['amber','Handover billed > installation billed']);
 if(c.excess>0){const v=b.vos.find(v=>v.item==it.id);A.push([v&&v.status=='Approved'?'amber':'red',`Variation needed: ${c.excess} ${it.unit||''} BOQ se zyada${v?' ('+v.no+' '+v.status+')':''}`])}
 c.alerts=A;return c}
function roll(s){const b=s.boq;if(!b||!b.items||!b.items.length)return;B(s);let cv=0,rev=0,bl=0,ex=0,al=0;
 b.items.forEach(it=>{const c=calc(b,it);if(!it.ni)cv+=c.amt;rev+=c.amt;bl+=c.billed;ex+=c.exec;al+=c.alerts.filter(a=>a[0]=='red').length;
  let v=b.vos.find(v=>v.auto&&v.item==it.id);
  if(c.excess>0){if(!v){v={id:uid(),no:'VO-'+String(b.vos.length+1).padStart(2,'0'),date:today(),item:it.id,desc:'Extra qty - '+it.desc,qty:c.excess,amount:Math.round(c.excess*num(it.rate)),status:'Pending',ref:'',auto:true};b.vos.push(v)}else if(v.status=='Pending'){v.qty=c.excess;v.amount=Math.round(c.excess*num(it.rate))}}
  else if(v&&v.status=='Pending'&&!v.ref)b.vos.splice(b.vos.indexOf(v),1)});
 s.cv=Math.round(cv);s.cvRev=Math.round(rev);s.billed=Math.round(bl);s.progress=rev?Math.min(100,Math.round(ex/rev*1000)/10):0;s._alerts=al;s._vosPending=b.vos.filter(v=>v.status!='Approved').length}
const save=()=>X().save();

/* ---------- render ---------- */
function render(){const S=X().ST.sites,el=$('#tab-boq');if(!S.length){el.innerHTML='<div class="card">Pehle Sites tab me site add karo.</div>';return}
 if(!site())bsite=(S.find(s=>s.boq&&s.boq.items.length)||S[0]).id;const s=site(),b=B(s);
 const V={items:'📋 Items',log:'✍️ Log entry',vo:'✏️ Variations',reco:'🧱 Material reco',ra:'🧾 RA bill',imp:'⬆️ Import'};
 let h=`<div class="card"><div class="row"><label class="f" style="flex:2 1 200px">Site<select class="i" data-b="site">${S.map(x=>`<option value="${x.id}" ${x.id==s.id?'selected':''}>${E(x.name)}${x._alerts?' ⚠️'+x._alerts:''}</option>`).join('')}</select></label>
 <label class="f">Material %<input class="i" type="number" data-b="st_m" value="${b.stages.m}"></label><label class="f">Installation %<input class="i" type="number" data-b="st_i" value="${b.stages.i}"></label><label class="f">Handover %<input class="i" type="number" data-b="st_h" value="${b.stages.h}"></label></div>
 ${b.stages.m+b.stages.i+b.stages.h!=100?'<div class="small red">Stage % ka total 100 nahi hai</div>':''}
 <div class="grid" style="margin-top:6px"><div>BOQ value<b>${lakh(s.cv)}</b></div><div>Revised (with NI)<b>${lakh(s.cvRev||s.cv)}</b></div><div>Billed<b>${lakh(s.billed)}</b></div><div>Unbilled<b>${lakh((s.cvRev||s.cv)-s.billed)}</b></div><div>Progress<b>${s.progress||0}%</b></div><div>Alerts<b class="${s._alerts?'red':''}">${s._alerts||0} red · ${s._vosPending||0} VO</b></div></div>
 <div class="row" style="margin-top:6px">${Object.entries(V).map(([k,v])=>`<button class="${bview==k?'btn':'btn2'}" data-b="view" data-v="${k}" style="flex:0 0 auto">${v}</button>`).join('')}</div></div>`;
 h+=({items:vItems,log:vLog,vo:vVo,reco:vReco,ra:vRa,imp:vImp}[bview])(s,b);el.innerHTML=h}
function alertHTML(c){return c.alerts.map(a=>`<div class="small ${a[0]}" style="font-weight:600">${a[0]=='red'?'🔴':'🟠'} ${E(a[1])}</div>`).join('')}
function vItems(s,b){if(bitem&&b.items.find(i=>i.id==bitem))return vItem(s,b,b.items.find(i=>i.id==bitem));
 let h=`<div class="row"><button class="btn" data-b="additem" style="flex:0 0 auto">+ BOQ item</button><button class="btn2" data-b="addni" style="flex:0 0 auto">+ NI item (non-tendered)</button><button class="btn2" data-b="view" data-v="imp" style="flex:0 0 auto">⬆️ Excel/CSV import</button><button class="btn2" data-b="tpl" style="flex:0 0 auto">⬇️ Blank BOQ template</button></div>`;
 if(!b.items.length)return h+'<div class="card">Is site ka BOQ abhi khali hai. Excel/CSV import karo ya item add karo. Template download karke usme BOQ bharo.</div>';
 const al=b.items.map(it=>[it,calc(b,it)]).filter(x=>x[1].alerts.length);
 if(al.length)h+=`<div class="due over"><b>⚠️ BOQ alerts (${al.length} items)</b>${al.map(([it,c])=>`<div style="padding:3px 0;cursor:pointer" data-b="item" data-id="${it.id}"><b>${E(it.no)} ${E(it.desc)}</b>${alertHTML(c)}</div>`).join('')}</div>`;
 h+=`<div class="card" style="overflow-x:auto;padding:4px"><table class="t boqt"><tr><th>No</th><th style="min-width:160px">Description</th><th>Unit</th><th>BOQ qty</th><th>Rate</th><th>Amount</th><th>Recd</th><th>Installed</th><th>Balance</th><th>% done</th><th>Client billed M / I / H</th><th>Billed ₹</th><th>Contractor</th><th>Flag</th></tr>
 ${b.items.map(it=>{const c=calc(b,it),r=c.alerts.some(a=>a[0]=='red');return `<tr data-b="item" data-id="${it.id}" style="cursor:pointer;${r?'background:#ffebee':c.alerts.length?'background:#fff3e0':''}"><td>${E(it.no)}${it.ni?' <span class="st">NI</span>':''}</td><td style="text-align:left">${E(it.desc)}</td><td>${E(it.unit)}</td><td>${q(it.qty)}</td><td>${inr(it.rate)}</td><td>${lakh(c.amt)}</td><td class="${c.recd>c.qty?'red':''}">${c.recd}</td><td class="${c.inst>c.qty?'red':''}">${c.inst}</td><td>${c.bal}</td><td>${c.pct}%</td><td>${c.cbm} / ${c.cbi} / ${c.cbh}</td><td>${lakh(c.billed)}</td><td class="${c.cont>c.inst?'red':''}">${c.cont}</td><td>${c.alerts.length?(r?'🔴':'🟠')+(c.excess>0?' VO':''):'✔'}</td></tr>`}).join('')}
 <tr><th colspan="5">Total</th><th>${lakh(s.cvRev)}</th><th colspan="5"></th><th>${lakh(s.billed)}</th><th colspan="2"></th></tr></table></div><div class="small">Row par tap karo - item detail, logs aur edit.</div>`;return h}
function vItem(s,b,it){const c=calc(b,it),logs=b.logs.filter(l=>l.item==it.id).sort((a,b)=>b.date.localeCompare(a.date));
 return `<div class="row"><button class="btn2" data-b="back" style="flex:0 0 auto">← Sab items</button></div><div class="two"><div class="card"><h4>${it.ni?'NI item':'BOQ item'} ${E(it.no)}</h4>
 <div class="row"><label class="f">Item no<input class="i" data-bi="no" value="${E(it.no)}"></label><label class="f">Unit<input class="i" data-bi="unit" value="${E(it.unit)}"></label></div>
 <label class="f">Description<input class="i" data-bi="desc" value="${E(it.desc)}"></label>
 <div class="row"><label class="f">BOQ qty<input class="i" type="number" data-bi="qty" value="${E(it.qty)}"></label><label class="f">Rate ₹<input class="i" type="number" data-bi="rate" value="${E(it.rate)}"></label></div>
 ${it.ni?`<label class="f">Linked variation<select class="i" data-bi="vo"><option value="">--</option>${b.vos.map(v=>`<option value="${v.id}" ${it.vo==v.id?'selected':''}>${E(v.no)} - ${E(v.desc)}</option>`).join('')}</select></label>`:''}
 <div class="res">Amount ${inr(c.amt)} · Recd ${c.recd} · Installed ${c.inst} (${c.pct}%) · Balance ${c.bal}<br>Client billed: M ${c.cbm} / I ${c.cbi} / H ${c.cbh} = <b>${inr(c.billed)}</b><br>Contractor billed ${c.cont} · Wastage ${c.waste} (${c.wpct}%) · Site stock ${c.stock}</div>${alertHTML(c)}
 <button class="btn red" data-b="delitem" style="margin-top:8px">Item delete</button></div>
 <div class="card"><h4>Dated log (${logs.length})</h4>${logForm(b,it.id)}${logs.map(logRow).join('')||'<div class="small">Abhi koi entry nahi</div>'}</div></div>`}
function logForm(b,item){return `<div class="row addlog">${item?`<input type="hidden" data-lf="item" value="${item}">`:`<select class="i" data-lf="item" style="flex:2 1 220px">${b.items.map(it=>`<option value="${it.id}">${E(it.no)} ${E(it.desc).slice(0,40)}</option>`).join('')}</select>`}
 <select class="i" data-lf="type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><input class="i" type="date" data-lf="date" value="${today()}"><input class="i" type="number" data-lf="qty" placeholder="Qty" inputmode="decimal"><input class="i" data-lf="ref" placeholder="Ref (DC / JMR / RA / bill no)"><button class="btn" data-b="addlog" style="flex:0 0 auto">Add</button></div>`}
function logRow(l){const it=site().boq.items.find(i=>i.id==l.item);return `<div class="li"><div class="tt"><b>${dmy(l.date)}</b> · ${TYPES[l.type]} · <b>${q(l.qty)}</b> ${E(it?it.unit:'')} ${l.ref?'· '+E(REFL[l.type]||'Ref')+' '+E(l.ref):''}<div class="small">${E(it?it.no+' '+it.desc:'')}${l.ra?' · RA generator':''}</div></div><button class="x" data-b="dellog" data-id="${l.id}">×</button></div>`}
function vLog(s,b){if(!b.items.length)return '<div class="card">Pehle BOQ items daalo.</div>';const L=[...b.logs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60);
 return `<div class="card"><h4>Nayi entry</h4>${logForm(b)}<div class="small">Material received = DC ke saath, Installed = JMR ke saath, Client billed = RA bill no, Contractor = bill no. Enter dabane se bhi add hota hai.</div></div><div class="card"><h4>Recent entries (${b.logs.length})</h4>${L.map(logRow).join('')||'<div class="small">Koi entry nahi</div>'}</div>`}
function vVo(s,b){return `<div class="card"><h4>Variations / Extra work register <span class="small">BOQ se zyada qty par auto entry banti hai</span></h4><div class="row"><button class="btn" data-b="addvo" style="flex:0 0 auto">+ Manual variation</button></div>
 <div style="overflow-x:auto"><table class="t"><tr><th>VO no</th><th>Date</th><th>Item</th><th style="min-width:150px">Description</th><th>Qty</th><th>Amount ₹</th><th>Status</th><th>Ref letter</th><th></th></tr>${b.vos.map(v=>{const it=b.items.find(i=>i.id==v.item);return `<tr><td><input class="i" data-vo="no" data-id="${v.id}" value="${E(v.no)}" style="width:70px"></td><td><input class="i" type="date" data-vo="date" data-id="${v.id}" value="${v.date}"></td><td>${E(it?it.no:'-')}${v.auto?' <span class="st">auto</span>':''}</td><td><input class="i" data-vo="desc" data-id="${v.id}" value="${E(v.desc)}"></td><td><input class="i" type="number" data-vo="qty" data-id="${v.id}" value="${E(v.qty)}" style="width:80px"></td><td><input class="i" type="number" data-vo="amount" data-id="${v.id}" value="${E(v.amount)}" style="width:110px"></td><td><select class="i" data-vo="status" data-id="${v.id}">${['Pending','Submitted','Approved','Rejected'].map(o=>`<option ${v.status==o?'selected':''}>${o}</option>`).join('')}</select></td><td><input class="i" data-vo="ref" data-id="${v.id}" value="${E(v.ref)}" placeholder="Letter / email ref"></td><td><button class="btn2" data-b="vo2ni" data-id="${v.id}" title="NI item banao">+NI</button><button class="x" data-b="delvo" data-id="${v.id}">×</button></td></tr>`}).join('')||'<tr><td colspan="9">Koi variation nahi</td></tr>'}</table></div>
 <div class="small">Total: ${inr(b.vos.reduce((a,v)=>a+num(v.amount),0))} · Approved: ${inr(b.vos.filter(v=>v.status=='Approved').reduce((a,v)=>a+num(v.amount),0))}. Letters tab se "Variation / extra work request" letter banao aur ref yaha likho.</div></div>`}
function vReco(s,b){return `<div class="card" style="overflow-x:auto"><h4>Material reconciliation</h4><table class="t"><tr><th>No</th><th style="min-width:150px">Item</th><th>Unit</th><th>BOQ</th><th>Received</th><th>Installed</th><th>Wastage</th><th>Wastage %</th><th>Site stock</th><th>Balance to receive</th></tr>${b.items.map(it=>{const c=calc(b,it);return `<tr><td>${E(it.no)}</td><td style="text-align:left">${E(it.desc)}</td><td>${E(it.unit)}</td><td>${c.qty}</td><td>${c.recd}</td><td>${c.inst}</td><td>${c.waste}</td><td class="${c.wpct>5?'red':''}">${c.wpct}%</td><td class="${c.stock<0?'red':''}">${c.stock}</td><td>${q(c.qty-c.recd)}</td></tr>`}).join('')}</table><div class="small">Site stock = received - installed - wastage. Negative stock = entry galat ya material bina DC ke aaya. Wastage % 5 se upar red.</div></div>`}

/* ---------- RA bill ---------- */
function raLines(b,ra){const idx=b.ras.indexOf(ra),earlier=new Set(b.ras.slice(0,idx).map(r=>r.id)),st=b.stages,L=[];
 b.items.forEach(it=>[['cbm','Material',st.m],['cbi','Installation',st.i],['cbh','Handover',st.h]].forEach(([k,n,p])=>{let pr=0,th=0;b.logs.forEach(l=>{if(l.item!=it.id||l.type!=k)return;if(l.ra==ra.id)th+=num(l.qty);else if(l.ra?earlier.has(l.ra):l.date<=ra.date)pr+=num(l.qty)});
  if(pr||th){const r=num(it.rate)*p/100;L.push({it,stage:n,pct:p,rate:r,pq:q(pr),tq:q(th),cq:q(pr+th),pa:pr*r,ta:th*r,ca:(pr+th)*r})}}));return L}
function vRa(s,b){if(!b.items.length)return '<div class="card">Pehle BOQ items daalo.</div>';
 if(raEdit){const st=b.stages;return `<div class="card"><h4>Naya RA bill</h4><div class="row"><label class="f">RA bill no<input class="i" id="ra_no" value="${E(raEdit.no)}"></label><label class="f">Date<input class="i" type="date" id="ra_dt" value="${raEdit.date}"></label></div>
 <div class="row"><button class="btn2" data-b="ramax" style="flex:0 0 auto">Max eligible qty bharo</button><button class="btn2" data-b="racancel" style="flex:0 0 auto">Cancel</button></div>
 <div style="overflow-x:auto"><table class="t"><tr><th rowspan="2">No</th><th rowspan="2" style="min-width:140px">Item</th><th rowspan="2">Unit</th><th colspan="3">Material ${st.m}% (eligible = recd)</th><th colspan="3">Installation ${st.i}% (eligible = installed)</th><th colspan="3">Handover ${st.h}% (eligible = installed)</th></tr><tr>${'<th>Prev</th><th>Eligible</th><th>This bill</th>'.repeat(3)}</tr>
 ${b.items.map(it=>{const c=calc(b,it),el={cbm:q(Math.min(c.recd,c.qty)-c.cbm),cbi:q(Math.min(c.inst,c.qty)-c.cbi),cbh:q(Math.min(c.inst,c.qty)-c.cbh)};return `<tr><td>${E(it.no)}</td><td style="text-align:left">${E(it.desc)}</td><td>${E(it.unit)}</td>${['cbm','cbi','cbh'].map(k=>`<td>${c[k]}</td><td>${Math.max(0,el[k])}</td><td><input class="i" type="number" data-ra="${k}" data-id="${it.id}" data-max="${Math.max(0,el[k])}" value="${raEdit.q[it.id+k]||''}" style="width:80px"></td>`).join('')}</tr>`}).join('')}</table></div>
 <div class="res" id="ra_tot"></div><button class="btn" data-b="rasave" style="margin-top:6px">RA bill save karo</button><div class="small">Save karne par har qty "Client billed" log ban jaati hai (ref = RA no). Eligible se zyada qty par red alert aayega.</div></div>`}
 return `<div class="card"><h4>RA bills (${b.ras.length})</h4><button class="btn" data-b="ranew">+ Naya RA bill</button>${b.ras.map(r=>{const L=raLines(b,r),t=L.reduce((a,x)=>a+x.ta,0),c=L.reduce((a,x)=>a+x.ca,0);return `<div class="li"><div class="tt"><b>${E(r.no)}</b> · ${dmy(r.date)} · This bill <b>${inr(t)}</b> · Cumulative ${inr(c)}</div><button class="btn2" data-b="raprint" data-id="${r.id}">🖨️ A4</button><button class="btn2" data-b="raxlsx" data-id="${r.id}">📊 xlsx</button><button class="x" data-b="radel" data-id="${r.id}">×</button></div>`}).join('')||'<div class="small" style="margin-top:6px">Abhi koi RA bill nahi.</div>'}</div>`}
function raTot(){const s=site(),b=B(s),st=b.stages;let t=0,over=0;document.querySelectorAll('[data-ra]').forEach(i=>{const it=b.items.find(x=>x.id==i.dataset.id),v=num(i.value);raEdit.q[i.dataset.id+i.dataset.ra]=i.value;t+=v*num(it.rate)*st[{cbm:'m',cbi:'i',cbh:'h'}[i.dataset.ra]]/100;if(v>num(i.dataset.max)){over++;i.style.borderColor='#c62828'}else i.style.borderColor=''});const e=$('#ra_tot');if(e)e.innerHTML=`Is RA bill ka amount: <b>${inr(t)}</b>${over?` <span class="red">· ${over} qty eligible se zyada</span>`:''}`}
function raHead(s,r){return ['Sr','Item no','Description','Unit','Stage','Stage rate','Prev qty','This qty','Cum qty','Prev amount','This amount','Cum amount']}
function raPrint(s,b,r){const L=raLines(b,r),T=k=>L.reduce((a,x)=>a+x[k],0);
 PM.X.printDiv(`<h2>RA Bill Abstract - ${E(r.no)}</h2><table style="margin-bottom:6px"><tr><th>Site</th><td>${E(s.name)}</td><th>Client</th><td>${E(s.client)}</td><th>Date</th><td>${dmy(r.date)}</td></tr><tr><th>Stages</th><td colspan="5">Material ${b.stages.m}% · Installation ${b.stages.i}% · Handover ${b.stages.h}% of item rate</td></tr></table>
 <table><tr>${raHead().map(x=>`<th>${x}</th>`).join('')}</tr>${L.map((x,i)=>`<tr><td>${i+1}</td><td>${E(x.it.no)}</td><td style="text-align:left">${E(x.it.desc)}</td><td>${E(x.it.unit)}</td><td>${x.stage} ${x.pct}%</td><td>${Math.round(x.rate).toLocaleString('en-IN')}</td><td>${x.pq}</td><td>${x.tq}</td><td>${x.cq}</td><td>${Math.round(x.pa).toLocaleString('en-IN')}</td><td>${Math.round(x.ta).toLocaleString('en-IN')}</td><td>${Math.round(x.ca).toLocaleString('en-IN')}</td></tr>`).join('')}
 <tr><th colspan="9">Total</th><th>${Math.round(T('pa')).toLocaleString('en-IN')}</th><th>${Math.round(T('ta')).toLocaleString('en-IN')}</th><th>${Math.round(T('ca')).toLocaleString('en-IN')}</th></tr></table>
 <table style="margin-top:8px;width:60%;margin-left:auto"><tr><th>Cumulative value</th><td>${inr(T('ca'))}</td></tr><tr><th>Less previous bills</th><td>${inr(T('pa'))}</td></tr><tr><th>This bill (before tax / deductions)</th><td><b>${inr(T('ta'))}</b></td></tr></table>
 <table style="margin-top:30px;border:0"><tr><td style="border:0">Prepared by</td><td style="border:0">Checked by</td><td style="border:0">Client engineer</td></tr></table>`)}
async function raXlsx(s,b,r){await X().loadX();const L=raLines(b,r),T=k=>Math.round(L.reduce((a,x)=>a+x[k],0));
 const rows=L.map((x,i)=>[i+1,x.it.no,x.it.desc,x.it.unit,x.stage+' '+x.pct+'%',Math.round(x.rate),x.pq,x.tq,x.cq,Math.round(x.pa),Math.round(x.ta),Math.round(x.ca)]);rows.push(['','','Total','','','','','','',T('pa'),T('ta'),T('ca')]);
 const wb=XLSX.utils.book_new(),ws=X().sheet(raHead(),rows,[5,8,40,7,16,11,9,9,9,14,14,14]);
 XLSX.utils.sheet_add_aoa(ws,[[],['Site',s.name,'Client',s.client],['RA bill',r.no,'Date',dmy(r.date)],['This bill amount',T('ta')]],{origin:-1});
 XLSX.utils.book_append_sheet(wb,ws,'RA_Abstract');X().download(`${s.name.replace(/\W+/g,'_')}_${r.no.replace(/\W+/g,'_')}.xlsx`,XLSX.write(wb,{bookType:'xlsx',type:'array'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}

/* ---------- Import ---------- */
const FIELDS=[['no','Item no'],['desc','Description'],['unit','Unit'],['qty','BOQ qty'],['rate','Rate']];
function guess(h){h=String(h).toLowerCase();if(/desc|particular|item of work|work/.test(h))return 'desc';if(/^(sr|s\.? ?no|item ?no|item code|no\.?|sl)/.test(h))return 'no';if(/unit|uom/.test(h))return 'unit';if(/qty|quant/.test(h))return 'qty';if(/rate/.test(h))return 'rate';return ''}
function vImp(s,b){let h=`<div class="card"><h4>BOQ import (.xlsx / .csv)</h4><div class="small">1) Blank template download karo ya client ka BOQ Excel use karo. 2) File chuno. 3) Columns match karo. 4) Import.</div><div class="row"><label class="btn" style="flex:0 0 auto">File chuno<input type="file" id="boqfile" accept=".xlsx,.xls,.csv" style="display:none"></label><button class="btn2" data-b="tpl" style="flex:0 0 auto">⬇️ Blank BOQ template</button></div></div>`;
 if(!imp)return h;const sh=imp.wb.Sheets[imp.sheet],aoa=XLSX.utils.sheet_to_json(sh,{header:1,defval:''}),hr=imp.hr,head=aoa[hr]||[];
 if(!imp.map){imp.map={};head.forEach((c,i)=>{const g=guess(c);if(g&&imp.map[g]==null)imp.map[g]=i})}
 const rows=buildRows(aoa);
 h+=`<div class="card"><div class="row"><label class="f">Sheet<select class="i" data-b="imsheet">${imp.wb.SheetNames.map(n=>`<option ${n==imp.sheet?'selected':''}>${E(n)}</option>`).join('')}</select></label><label class="f">Header row no.<input class="i" type="number" data-b="imhr" value="${hr+1}" min="1"></label></div>
 <div class="row">${FIELDS.map(([k,n])=>`<label class="f">${n}<select class="i" data-b="immap" data-k2="${k}"><option value="">--</option>${head.map((c,i)=>`<option value="${i}" ${imp.map[k]==i?'selected':''}>${String.fromCharCode(65+i)}: ${E(String(c).slice(0,25))}</option>`).join('')}</select></label>`).join('')}</div>
 <div class="small">Amount = qty x rate (auto). Jin rows me description ya qty nahi hai (headings) wo skip hongi.</div>
 <div style="overflow-x:auto"><table class="t"><tr><th>No</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${rows.slice(0,8).map(r=>`<tr><td>${E(r.no)}</td><td style="text-align:left">${E(r.desc)}</td><td>${E(r.unit)}</td><td>${r.qty}</td><td>${r.rate}</td><td>${Math.round(r.qty*r.rate).toLocaleString('en-IN')}</td></tr>`).join('')}</table></div>
 <div class="res">${rows.length} items milenge · Total ${inr(rows.reduce((a,r)=>a+r.qty*r.rate,0))}</div>
 <div class="row"><select class="i" id="immode" style="flex:0 0 auto"><option value="append">Existing items ke saath jodo</option><option value="replace">Existing BOQ replace karo</option></select><button class="btn" data-b="imgo" style="flex:0 0 auto">Import ${rows.length} items</button></div></div>`;return h}
function buildRows(aoa){const m=imp.map,o=[];for(let r=imp.hr+1;r<aoa.length;r++){const a=aoa[r],g=k=>m[k]!=null&&m[k]!==''?a[m[k]]:'';const d=String(g('desc')).trim(),qq=num(g('qty'));if(!d||!qq)continue;o.push({no:String(g('no')).trim(),desc:d,unit:String(g('unit')).trim(),qty:qq,rate:num(g('rate'))})}return o}
async function readFile(f){try{await X().loadX()}catch(e){X().toast('Excel library load nahi hui');return}const buf=await f.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});const sh=wb.SheetNames[0];
 const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:''});let hr=aoa.findIndex(r=>r.some(c=>/desc|particular/i.test(String(c))));imp={wb,sheet:sh,hr:Math.max(0,hr),map:null};render()}
async function template(){await X().loadX();const ws=X().sheet(['Item No','Description','Unit','BOQ Qty','Rate','Amount'],[['1','Unitised curtain wall panel incl. glass fixing','sqm',1000,14500,''],['2','ACP cladding 4mm FR','sqm',500,3200,'']],[9,50,8,11,11,14]);
 ws['F2']={t:'n',f:'D2*E2',s:ws['F2'].s};ws['F3']={t:'n',f:'D3*E3',s:ws['F3'].s};const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'BOQ');X().download('FacadePM_BOQ_Template.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'array'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}

/* ---------- events ---------- */
const root=()=>$('#tab-boq');
document.addEventListener('click',async e=>{const a=e.target.closest('#tab-boq [data-b]');if(!a)return;const s=site(),b=B(s),k=a.dataset.b,id=a.dataset.id;
 if(k=='view'){bview=a.dataset.v;bitem=null;raEdit=null;render()}
 else if(k=='item'){bitem=id;bview='items';render();scrollTo(0,0)}
 else if(k=='back'){bitem=null;render()}
 else if(k=='additem'||k=='addni'){const it={id:uid(),no:String(b.items.length+1)+(k=='addni'?'-NI':''),desc:k=='addni'?'Non-tendered item':'New item',unit:'sqm',qty:0,rate:0,ni:k=='addni',vo:''};b.items.push(it);bitem=it.id;await save();render();const d=$('#tab-boq [data-bi=desc]');d&&(d.select(),d.focus())}
 else if(k=='delitem'){if(!confirm('Item aur uske sab logs delete karein?'))return;b.items=b.items.filter(i=>i.id!=bitem);b.logs=b.logs.filter(l=>l.item!=bitem);bitem=null;await save();render()}
 else if(k=='addlog')addLog(a.closest('.addlog'));
 else if(k=='dellog'){if(!confirm('Entry delete?'))return;b.logs=b.logs.filter(l=>l.id!=id);await save();render()}
 else if(k=='addvo'){b.vos.push({id:uid(),no:'VO-'+String(b.vos.length+1).padStart(2,'0'),date:today(),item:'',desc:'Extra work',qty:'',amount:'',status:'Pending',ref:''});await save();render()}
 else if(k=='delvo'){if(!confirm('Variation delete?'))return;b.vos=b.vos.filter(v=>v.id!=id);await save();render()}
 else if(k=='vo2ni'){const v=b.vos.find(x=>x.id==id),src=b.items.find(i=>i.id==v.item);const it={id:uid(),no:(v.no||'NI')+'-NI',desc:v.desc,unit:src?src.unit:'nos',qty:num(v.qty),rate:src?num(src.rate):(num(v.qty)?Math.round(num(v.amount)/num(v.qty)):0),ni:true,vo:v.id};b.items.push(it);bview='items';bitem=it.id;await save();render()}
 else if(k=='tpl')template();
 else if(k=='imgo'){const aoa=XLSX.utils.sheet_to_json(imp.wb.Sheets[imp.sheet],{header:1,defval:''}),rows=buildRows(aoa);if(!rows.length){X().toast('Koi item nahi mila - mapping check karo');return}
  if($('#immode').value=='replace'){if(!confirm('Existing BOQ items aur logs hat jayenge. Pakka?'))return;b.items=[];b.logs=[];b.vos=[];b.ras=[]}
  rows.forEach(r=>b.items.push({id:uid(),...r,ni:false,vo:''}));imp=null;bview='items';await save();X().toast(rows.length+' items import ho gaye');render()}
 else if(k=='ranew'){raEdit={no:'RA-'+String(b.ras.length+1).padStart(2,'0'),date:today(),q:{}};render();raTot()}
 else if(k=='racancel'){raEdit=null;render()}
 else if(k=='ramax'){document.querySelectorAll('[data-ra]').forEach(i=>i.value=num(i.dataset.max)||'');raTot()}
 else if(k=='rasave'){raTot();const r={id:uid(),no:$('#ra_no').value||raEdit.no,date:$('#ra_dt').value||today()};let n=0;
  document.querySelectorAll('[data-ra]').forEach(i=>{const v=num(i.value);if(v>0){b.logs.push({id:uid(),item:i.dataset.id,type:i.dataset.ra,date:r.date,qty:v,ref:r.no,ra:r.id});n++}});
  if(!n){X().toast('Koi qty nahi daali');return}b.ras.push(r);raEdit=null;await save();X().toast(r.no+' save ho gaya');render()}
 else if(k=='radel'){if(!confirm('RA bill aur uski billed entries delete karein?'))return;b.ras=b.ras.filter(r=>r.id!=id);b.logs=b.logs.filter(l=>l.ra!=id);await save();render()}
 else if(k=='raprint')raPrint(s,b,b.ras.find(r=>r.id==id));
 else if(k=='raxlsx')raXlsx(s,b,b.ras.find(r=>r.id==id));
});
async function addLog(row){const s=site(),b=B(s),l={id:uid()};row.querySelectorAll('[data-lf]').forEach(i=>l[i.dataset.lf]=i.value.trim());l.qty=num(l.qty);if(!l.qty){X().toast('Qty daalo');return}if(!l.date)l.date=today();b.logs.push(l);await save();
 const it=b.items.find(i=>i.id==l.item),c=calc(b,it);render();X().toast(c.alerts.length?'⚠️ '+c.alerts[0][1]:'Entry add ho gayi');const qn=$('#tab-boq .addlog [data-lf=qty]');qn&&qn.focus()}
document.addEventListener('change',async e=>{const t=e.target;if(!t.closest||!t.closest('#tab-boq'))return;const s=site(),b=B(s);
 if(t.dataset.b=='site'){bsite=t.value;bitem=null;imp=null;raEdit=null;render()}
 else if(/^st_/.test(t.dataset.b||'')){b.stages[t.dataset.b.slice(3)]=num(t.value);await save();render()}
 else if(t.dataset.bi){const it=b.items.find(i=>i.id==bitem);it[t.dataset.bi]=['qty','rate'].includes(t.dataset.bi)?num(t.value):t.value;await save();render()}
 else if(t.dataset.vo){const v=b.vos.find(x=>x.id==t.dataset.id);v[t.dataset.vo]=t.value;if(t.dataset.vo!='status'&&t.dataset.vo!='ref')v.auto=false;await save();if(t.dataset.vo=='status')render()}
 else if(t.id=='boqfile'&&t.files[0])readFile(t.files[0]);
 else if(t.dataset.b=='imsheet'){imp.sheet=t.value;imp.map=null;imp.hr=0;render()}
 else if(t.dataset.b=='imhr'){imp.hr=Math.max(0,num(t.value)-1);imp.map=null;render()}
 else if(t.dataset.b=='immap'){imp.map[t.dataset.k2]=t.value===''?null:+t.value;render()}});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.ra)raTot()});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.closest&&e.target.closest('#tab-boq .addlog')){e.preventDefault();addLog(e.target.closest('.addlog'))}});

/* ---------- export + demo ---------- */
function exportSheets(wb,sheet){const S=X().ST.sites.filter(s=>s.boq&&s.boq.items.length);if(!S.length)return;const r1=[],r2=[],r3=[],r4=[];
 S.forEach(s=>{const b=B(s);b.items.forEach(it=>{const c=calc(b,it);r1.push([s.name,it.no,it.desc,it.unit,c.qty,num(it.rate),Math.round(c.amt),c.recd,c.inst,c.bal,c.pct,c.cbm,c.cbi,c.cbh,Math.round(c.billed),c.cont,it.ni?'NI':'',c.alerts.map(a=>a[1]).join('; ')]);r4.push([s.name,it.no,it.desc,it.unit,c.qty,c.recd,c.inst,c.waste,c.wpct,c.stock,q(c.qty-c.recd)])});
  [...b.logs].sort((a,b)=>a.date.localeCompare(b.date)).forEach(l=>{const it=b.items.find(i=>i.id==l.item)||{};r2.push([s.name,dmy(l.date),it.no,it.desc,TYPES[l.type],num(l.qty),it.unit,l.ref||''])});
  b.vos.forEach(v=>{const it=b.items.find(i=>i.id==v.item)||{};r3.push([s.name,v.no,dmy(v.date),it.no||'',v.desc,num(v.qty),num(v.amount),v.status,v.ref||''])})});
 const sr=a=>a.map((r,i)=>[i+1,...r]);
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Item no','Description','Unit','BOQ qty','Rate','Amount','Received','Installed','Balance','% done','Billed Mat','Billed Inst','Billed H/O','Billed amount','Contractor billed','NI','Alerts'],sr(r1),[5,16,8,36,7,10,10,13,10,10,10,8,10,10,10,13,11,5,40]),'BOQ_Control');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Date','Item no','Description','Entry type','Qty','Unit','Ref'],sr(r2),[5,16,11,8,36,24,9,7,16]),'BOQ_Log');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','VO no','Date','Item no','Description','Qty','Amount','Status','Ref letter'],sr(r3),[5,16,9,11,8,40,9,13,11,20]),'Variations');
 XLSX.utils.book_append_sheet(wb,sheet(['Sr','Site','Item no','Description','Unit','BOQ','Received','Installed','Wastage','Wastage %','Site stock','Balance to receive'],sr(r4),[5,16,8,36,7,9,10,10,9,9,10,12]),'Material_Reco')}
function addDemo(ST){if(ST.sites.some(s=>s.demo))return;const I=[['1','Unitised curtain wall panel (incl. glass fixing)','sqm',3200,14500],['2','Stick glazing system - lobby','sqm',900,9800],['3','ACP cladding 4mm FR','sqm',1500,3200],['4','Glass installation - client supplied DGU','sqm',4100,650],['5','Spider fittings 4-way SS 316','nos',120,6500],['6','Aluminium louvers 150mm','rmt',600,2400],['7','Weather silicone sealant','rmt',8000,95],['8','MS brackets with anchor fasteners','nos',2600,850],['9','Top hung openable windows','nos',180,7800],['10','Frameless glass door with patch fittings','nos',12,65000],['11','Fire stop sealant at slab edge','rmt',900,450],['12','Aluminium coping / flashing','rmt',500,1200]];
 const items=I.map((r,i)=>({id:'d'+(i+1),no:r[0],desc:r[1],unit:r[2],qty:r[3],rate:r[4],ni:false,vo:''}));let n=0;const L=(it,type,date,qty,ref,ra)=>({id:'dl'+(++n),item:'d'+it,type,date,qty,ref,ra});
 const logs=[L(1,'recd','2026-09-05',1200,'DC-1021'),L(1,'recd','2026-10-10',1100,'DC-1088'),L(1,'inst','2026-10-25',1850,'JMR-04'),L(1,'waste','2026-10-12',15,'Breakage report'),L(1,'cont','2026-10-31',1800,'CB-07'),
 L(3,'recd','2026-09-20',1650,'DC-1050'),L(3,'inst','2026-11-05',1560,'JMR-05'),L(3,'waste','2026-11-05',60,'Cutting wastage'),L(3,'cont','2026-11-10',1560,'CB-08'),
 L(6,'recd','2026-10-01',450,'DC-1060'),L(6,'inst','2026-10-28',300,'JMR-04'),L(6,'cont','2026-11-02',320,'CB-08'),
 L(7,'recd','2026-09-15',3000,'DC-1033'),L(7,'inst','2026-10-30',2600,'JMR-04'),L(8,'recd','2026-08-25',2600,'DC-0990'),L(8,'inst','2026-09-30',2450,'JMR-03'),
 L(1,'cbm','2026-09-30',1200,'RA-01','dra1'),L(3,'cbm','2026-09-30',1500,'RA-01','dra1'),L(8,'cbm','2026-09-30',2600,'RA-01','dra1'),L(8,'cbi','2026-09-30',2400,'RA-01','dra1')];
 ST.sites.push({id:'demo',demo:true,name:'Demo site',client:'Demo Client (delete kar sakte ho)',received:'2000000',status:'Amber',nextDate:'',nextAction:'Demo - BOQ tab dekho, phir site delete karo',notes:'Ye sample data hai. Sites tab -> Demo site -> Site delete.',fu:[],hold:[],mat:[],rem:[],
 boq:{items,logs,vos:[],ras:[{id:'dra1',no:'RA-01',date:'2026-09-30'}],stages:{m:60,i:30,h:10}}})}
window.BOQ={roll,render,exportSheets,addDemo,open(id){bsite=id;bitem=null;bview='items';window.tab('boq')}};
})();
