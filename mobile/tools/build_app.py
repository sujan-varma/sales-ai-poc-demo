"""Builds mobile/app/index.html from the UI mockup (mobile/mockups/index (25) 1.html).

The mockup hardcodes all of its data in JavaScript. This script keeps the mockup's markup, styling and behaviour
and swaps every hardcoded data set for the backend's GET /api/app/bootstrap payload (window.BOOT):
  * the main script becomes <script type="text/plain" id="appjs"> and only runs after the bootstrap has loaded
  * a small loader shows loading / error + retry states
  * data literals (users, territories, visits, actions, customers, products, charts, ...) are replaced by BOOT data

Every edit must match exactly once, so a changed mockup fails loudly instead of producing a half-wired app.
Run:  python mobile/tools/build_app.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "mockups" / "index (25) 1.html"
OUT = ROOT / "app" / "index.html"

html = SRC.read_text(encoding="utf-8")


def rep(old: str, new: str, count: int = 1) -> None:
    global html
    n = html.count(old)
    if n != count:
        raise SystemExit(f"expected {count} match(es), found {n}:\n{old[:200]}")
    html = html.replace(old, new)


def cut(start: str, end: str, new: str = "") -> None:
    """Replace everything from `start` up to and including `end` (both must be unique)."""
    global html
    i = html.find(start)
    if i < 0 or html.count(start) != 1:
        raise SystemExit(f"start marker not unique/found: {start[:120]}")
    j = html.find(end, i)
    if j < 0:
        raise SystemExit(f"end marker not found after start: {end[:120]}")
    html = html[:i] + new + html[j + len(end):]


# ------------------------------------------------------------------ markup

rep('<div id="app">\n', '''<div id="app">
<div id="boot" class="boot"><div class="bx"><div class="spin"></div><b id="bootMsg">Loading your day…</b><p id="bootErr"></p><button class="btn pri" id="bootRetry" style="display:none" onclick="retryBoot()">Try again</button></div></div>
''')
rep('''      <div class="st"><b id="tv">15</b><em> / 30</em><div>Total Visits</div></div>
      <div class="st"><b>2<small>Cr</small></b><em> / 3<small>Cr</small></em><div>Achievement</div></div>
      <div class="st"><b>8</b><em> / 20</em><div>Rank</div></div>''',
    '''      <div class="st"><b id="tv">–</b><em id="tvT"> / –</em><div>Total Visits</div></div>
      <div class="st"><b id="achV">–</b><em id="achT"> / –</em><div>Achievement</div></div>
      <div class="st"><b id="rankV">–</b><em id="rankT"> / –</em><div>Rank</div></div>''')
rep('<div class="week"><h3>SEPTEMBER</h3>', '<div class="week"><h3 id="weekMonth"></h3>')
rep('''    <div class="csec">Bathroom &amp; Kitchen</div>
    <div class="crow" id="catBath"></div>
    <div class="csec">Lights &amp; Lightings</div>
    <div class="crow" id="catLight"></div>''', '    <div id="catSecs"></div>')
rep('<datalist id="accList"><option value="Anil Kumar"><option value="Anil Building &amp; Materials Pvt."><option value="Deep Building &amp; Materials Pvt."><option value="Sri Lakshmi Builders"></datalist>',
    '<datalist id="accList"></datalist>')
rep('<div><small class="l">Order No</small><span class="v">19234</span></div><div><small class="l">Date</small><span class="v">19 March 2019</span></div>',
    '<div><small class="l">Order No</small><span class="v" id="sumNo"></span></div><div><small class="l">Date</small><span class="v" id="sumDate"></span></div>')
rep('<div class="dh"><b id="dName">Ajay Kumar</b><small id="dRole">Sales Executive · Saurashtra</small></div>',
    '<div class="dh"><b id="dName"></b><small id="dRole"></small></div>')
rep('<div class="wel" id="welName">Welcome Ajay!</div>', '<div class="wel" id="welName"></div>')
rep('<i id="badge">2</i>', '<i id="badge" class="hide">0</i>')

# loader styles
rep("</style>", """.boot{position:absolute;inset:0;z-index:999;background:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px}
.boot.hide{display:none}.boot .bx{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:280px}
.boot b{font-size:14px;color:#333;font-weight:600}.boot p{font-size:12px;color:#d94a5e;line-height:1.5;word-break:break-word}.boot p:empty{display:none}
.boot .btn{width:180px}.boot .spin{width:34px;height:34px;border-radius:50%;border:3px solid #d8eef0;border-top-color:#3d9aa3;animation:bspin .8s linear infinite}
.boot.err .spin{display:none}@keyframes bspin{to{transform:rotate(360deg)}}
</style>""")

# ------------------------------------------------------------------ script: run after the bootstrap loads

rep("<script>\n/* ---------- helpers ---------- */", '<script type="text/plain" id="appjs">\n/* ---------- helpers ---------- */')
rep("const inr=n=>'₹ '+Number(n).toLocaleString('en-IN');", """const inr=n=>'₹ '+Number(n).toLocaleString('en-IN');
/* ---------- backend data (GET /api/app/bootstrap) ---------- */
const B=window.BOOT,HOME_TERR=B.home_territory;
const TD=new Date(B.today+'T00:00:00'),TODAY0={y:TD.getFullYear(),m:TD.getMonth(),d:TD.getDate()},TODAY_DD=String(TODAY0.d).padStart(2,'0');
const crl=v=>v>=1e7?[(v/1e7).toFixed(2).replace(/\\.?0+$/,''),'Cr']:[(v/1e5).toFixed(1).replace(/\\.0$/,''),'L'];
// month labels from the workbook's data date: the MTD month and the month before it (the last full month's sales)
const M3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DA=new Date(B.data_as_of+'T00:00:00'),DATA_M=M3[DA.getMonth()],PREV_M=M3[(DA.getMonth()+11)%12];""")

# home: visits / calendar
rep("let totalVisits=15, curVisit=null;", "let totalVisits=B.home.visits_done, curVisit=null;")
rep("enter.dashboard=()=>barChart($('#chDash'),{max:100,ticks:4,bw:65,step:81,off:15,rl:'Primary Target Vs Achievement %',\n"
    "  bars:[{v:14,lbl:'14%',c:['#7fe6cc','#9ae9df'],t:'#3fd0b3'},{v:71,lbl:'71%',c:['#e9cc95','#e7da8b'],t:'#e6b64e'},{v:80,lbl:'80%',c:['#e88f9f','#e9a398'],t:'#e8667f'}]});",
    """const DCOL=[[['#7fe6cc','#9ae9df'],'#3fd0b3'],[['#e9cc95','#e7da8b'],'#e6b64e'],[['#e88f9f','#e9a398'],'#e8667f']];
enter.dashboard=()=>{
  const cats=B.dashboard.categories,L=v=>crl(v).join('');
  document.querySelectorAll('#dashboard .chips .chip').forEach((c,i)=>{c.textContent=cats[i]?cats[i].name:'';c.style.visibility=cats[i]?'':'hidden'});
  document.querySelectorAll('#dashboard .rows > div').forEach((r,i)=>{const c=cats[i];r.style.visibility=c?'':'hidden';if(!c)return;
    const [a,b]=r.querySelectorAll('p');a.lastChild.textContent=L(c.actual_value);b.lastChild.textContent=L(c.target_value)});
  const pct=c=>Math.round(c.achievement_pct||0),max=Math.max(100,Math.ceil(Math.max(...cats.map(pct))/25)*25);
  barChart($('#chDash'),{max,ticks:4,bw:65,step:81,off:15,rl:DATA_M+' MTD Achievement Vs Target %',
    bars:cats.map((c,i)=>({v:pct(c),lbl:pct(c)+'%',c:DCOL[i%3][0],t:DCOL[i%3][1]}))});
};""")
rep("const MON=[['JAN',25],['FEB',75],['MAR',200],['APR',100],['MAY',76],['JUN',82],['JUL',66]];", "const MON=B.charts.MON;")
rep("const DAILY=[8,12,6,10,14,4,9,11,7,13,5,10,12,8];", "const DAILY=B.charts.DAILY;")
rep("const COV=[['JAN',[49,22,30,30,23]],['FEB',[28,44,52,8,28]],['MAR',[21,27,42,25,30]],['APR',[28,36,20,42,24]]];", "const COV=B.coverage.months;")
rep("enter.coverage=()=>{\n", """enter.coverage=()=>{
  document.querySelectorAll('#coverage .chips .chip').forEach((c,i)=>{const x=B.coverage.chips[i];if(x)c.textContent=x[0]});
  document.querySelectorAll('#coverage .vals span').forEach((s,i)=>{const x=B.coverage.chips[i];if(x)s.textContent=x[1]});
""")
cut("const ACC={Distributors:[10,5,10],Retailers:[14,8,6],Dealers:[7,3,12]};", "enter.accounts=renderAccounts;", """const ACC=B.accounts_chart.by_type,TIERS=B.accounts_chart.tiers;
function renderAccounts(){
  const sel=$('#accSel');if(!sel.dataset.ready){sel.dataset.ready='1';sel.innerHTML='';Object.keys(ACC).forEach(k=>sel.add(new Option(k)))}
  document.querySelectorAll('#accounts .chips .chip').forEach((c,i)=>c.textContent=TIERS[i]||'');
  const k=sel.value,d=ACC[k],p=n=>String(n).padStart(2,'0'),max=Math.max(4,Math.ceil(Math.max(...d)*1.25/4)*4);
  $('#accVals').innerHTML=d.map(v=>`<span>${p(v)}</span>`).join('');
  const C=[[['#85cae8','#aed4fe'],'#62b3de'],[['#7fe0c8','#a3ebe0'],'#4fd1b5'],[['#e9cd95','#e7da8b'],'#e8c261']];
  barChart($('#chAcc'),{max,ticks:4,bw:65,step:82,off:16,rl:'Count Of '+k,bars:d.map((v,i)=>({x:TIERS[i],v,lbl:p(v),c:C[i%3][0],t:C[i%3][1]}))});
}
enter.accounts=renderAccounts;""")

# calendar: built from the backend visits
rep("let calM=2,calSel={m:2,d:12};", "let calM=TODAY0.m,calSel={m:TODAY0.m,d:TODAY0.d};")
cut("const calEvents={\n '2-12':", "status:'Open'}]};", """let calEvents={};
function buildCal(){calEvents={};const ST={completed:'Completed',checkedin:'Pending',missed:'Pending',scheduled:'Open'};
  VISITS.filter(v=>v.y===TODAY0.y).forEach(v=>{const k=v.m+'-'+v.d;(calEvents[k]=calEvents[k]||[]).push({id:v.id,t:v.s||v.t,n:v.n,r:v.s?t12(v.s)+' to '+t12(v.e):v.t,l:v.loc,status:ST[v.state]||'Open'})});
  Object.values(calEvents).forEach(l=>l.sort((a,b)=>a.t.localeCompare(b.t)))}""")
rep("function monthInfo(m){if(m===2)return{off:5,days:30};return{off:new Date(2020,m,1).getDay(),days:new Date(2020,m+1,0).getDate()}}",
    "function monthInfo(m){return{off:new Date(TODAY0.y,m,1).getDay(),days:new Date(TODAY0.y,m+1,0).getDate()}}")
rep("$('#mTitle').textContent=MN[calM]+' 2020';", "$('#mTitle').textContent=MN[calM]+' '+TODAY0.y;")
rep("const g=col===0||(calM===2&&d>28);", "const g=col===0;")
rep("enter.calendar=renderCal;", "enter.calendar=()=>{buildCal();renderCal()};")
rep("selDay==='30'", "selDay===TODAY_DD", count=3)
rep("selDay!=='30'", "selDay!==TODAY_DD")
rep("selDay='30';homeTab='visits'", "selDay=TODAY_DD;homeTab='visits'")

# catalogue / order / address
cut("const CAT={bath:", "['pI','Product I','SKU124425',7400]]};\n", "")
rep("""function renderCat(){
  const f=a=>a.map(([k,n,s,p])=>`<button class="pc" onclick="this.classList.toggle('on')"><img src="${IMG[k]}" alt="">${CK}<div class="ptx">${n}<br>${s}<b>${inr(p)}</b></div></button>`).join('');
  $('#catBath').innerHTML=f(CAT.bath);$('#catLight').innerHTML=f(CAT.light);
}""", """function renderCat(){const keys=Object.keys(IMG);let n=0;
  $('#catSecs').innerHTML=B.catalogue.map(sec=>`<div class="csec">${esc(sec.category)}</div><div class="crow">${sec.items.map(p=>`<button class="pc" onclick="this.classList.toggle('on')"><img src="${IMG[keys[n++%keys.length]]}" alt="">${CK}<div class="ptx">${esc(p.name)} · ${esc(p.pack||'')}<br>${esc(p.sku_id)}<b>${inr(p.price)}</b></div></button>`).join('')}</div>`).join('');
}""")
rep("const PRODS=[['Product A',80000],['Product B',8000],['Product C',25000],['Product D',2500],['Product E',4500],['Product F',12500]];", "const PRODS=B.products;")
rep("$('#oProd').innerHTML=PRODS.map(([n])=>`<option${n==='Product D'?' selected':''}>${n}</option>`).join('');",
    """$('#oProd').innerHTML='';PRODS.forEach(([n])=>$('#oProd').add(new Option(n)));
$('#accList').innerHTML='';B.accounts.forEach(a=>{const o=document.createElement('option');o.value=a;$('#accList').appendChild(o)});
let orderNo=B.next_order_no;""")
rep("$('#oProd').value='Product D';", "$('#oProd').value=PRODS[0][0];")
rep("function recentVisit(){$('#oAcc').value='Anil Kumar';",
    "function recentVisit(){$('#oAcc').value=(VISITS.filter(v=>v.state==='completed').sort((a,b)=>(b.y-a.y)||(b.m-a.m)||(b.d-a.d)||String(b.s||'').localeCompare(String(a.s||'')))[0]||{n:''}).n;")
rep("$('#sumAcc').textContent=a;", "$('#sumAcc').textContent=a;$('#sumNo').textContent='ORD'+orderNo;$('#sumDate').textContent=BASE.getDate()+' '+MN[BASE.getMonth()]+' '+BASE.getFullYear();")
rep("else{tab('home');toast('Order 19234 placed')}", "else{tab('home');toast('Order ORD'+(orderNo++)+' placed')}")
cut("const GEO={Karnataka:", "Coimbatore:['Coimbatore']}};", "const GEO=B.geo;")

# account / last-order sheets and call-process steps use the visit's real customer
cut("function openSheet(k){\n  const s=$('#sheet');", "  s.classList.add('show');$('#scrim').classList.add('show','dark');\n}", """function curCust(){const v=(typeof liveVisit==='function'&&liveVisit())||visitById(curVisitId);return v&&CUST[v.n]?{v,c:CUST[v.n]}:null}
function topSkus(c,k,n){return c?c.skus.filter(s=>s[k]>0).sort((a,b)=>b[k]-a[k]).slice(0,n):[]}
function openSheet(k){
  const s=$('#sheet'),x=curCust(),c=x&&x.c,row=(a,b)=>`<div class="row"><span>${a}</span><span>${esc(b==null||b===''?'—':b)}</span></div>`;
  s.innerHTML=k==='acct'
   ?'<h4>Account Details</h4>'+(c?row('Account',x.v.n)+row('Owner',c.owner)+row('Mobile',c.mobile)+row('Location',c.loc)+row('Category',c.type+' · Class '+c.class)+row('Distributor',c.distributor)+row('Outstanding',c.outstanding):'<p class="sp">Check in to a visit to see the account.</p>')
   :'<h4>Last Order</h4>'+(c?row('Order',c.lastOrder)+topSkus(c,'last_month_qty',6).map(p=>row(p.name+' · '+p.pack+' ('+PREV_M+')',p.last_month_qty+' Units')).join(''):'<p class="sp">Check in to a visit to see the last order.</p>');
  s.classList.add('show');$('#scrim').classList.add('show','dark');
}
enter.s2=()=>{const x=curCust(),l=topSkus(x&&x.c,'last_month_qty',3);
  document.querySelectorAll('#s2 .srow').forEach((r,i)=>{const p=l[i];r.style.display=p?'':'none';if(!p)return;
    r.querySelector('b').textContent=p.name+' · '+p.pack;r.querySelector('small').textContent=PREV_M+' Sales';r.querySelector('span').textContent=p.last_month_qty+' Units';
    const inp=r.querySelector('input');inp.value='';inp.setAttribute('aria-label',p.name+' current inventory')})};
enter.s3=()=>{const x=curCust(),l=topSkus(x&&x.c,'gap_qty',3);
  document.querySelectorAll('#s3 .rrow').forEach((r,i)=>{const p=l[i];r.style.display=p?'':'none';if(!p)return;
    r.querySelector('.n').textContent=p.name+' · '+p.pack;r.querySelector('.l').innerHTML=esc(p.sku_id)+'<br>'+inr(p.price);r.querySelector('.r span').textContent=p.gap_qty+' Units'})};""")

# people / territories / actions / notifications
cut("const U={ajay:{n:'Ajay Kumar'", "Delhi:['neha']};", "const U=B.users;\nlet role='ajay';\nconst isLead=()=>role==='rajesh';\nconst TERR=B.territories;")
rep("Huddle:'Raised by Rajesh Kumar in the weekly team Huddle.'", "Huddle:'Raised by '+U.rajesh.n+' in the weekly team Huddle.'")
rep("const BASE=new Date(2026,8,30); // the app's \"today\" (WED 30 SEP)", "const BASE=new Date(TODAY0.y,TODAY0.m,TODAY0.d); // the app's \"today\" (from the backend)")
cut("let ACTS=[\n mk('TKT-2331'", "'Complete the monthly stock count at the depot.')];", "let ACTS=B.actions;")
cut("let NOTIFS=[\n", " ];\n", "let NOTIFS=B.notifications;\n")
rep("$('#dRole').textContent=U[role].r+' · Saurashtra';", "$('#dRole').textContent=U[role].r+' · '+HOME_TERR;")
# the officer's role comes from the backend users (4. Retailer_Master's "Sales officer"), not the mockup's "Sales Executive"
rep("You (${U.ajay.n}, Sales Executive)", "You (${U.ajay.n}, ${U.ajay.r})")
rep("const who=id=>id===role?'You':(id==='rajesh'?'Rajesh':U[id].n);", "const who=id=>id===role?'You':(id==='rajesh'?U.rajesh.f:U[id].n);")
rep("let F={terr:'Saurashtra',", "let F={terr:HOME_TERR,")

# visits
cut("const VISITS=[\n {id:'VST-0112'", "VISITS.forEach(v=>{v.terr='Saurashtra';v.y=2026});",
    "const VISITS=B.visits;VISITS.forEach(v=>['cin','cout'].forEach(k=>{if(typeof v[k]==='string')v[k]=new Date(v[k]).getTime()}));")
cut("// visit-generated actions: [ticket, visitId, title, status, priority, dueDays, what]", "  a.visitId=vid;ACTS.push(a)});\n", "")
rep("const TODAY={m:8,d:30};\nconst at=(h,mm)=>new Date(2026,8,30,h,mm).getTime();",
    "const TODAY={m:TODAY0.m,d:TODAY0.d};\nconst at=(h,mm)=>new Date(TODAY0.y,TODAY0.m,TODAY0.d,h,mm).getTime();")
cut("[\n {id:'VST-0930A',n:'Deep Track Building Materials Pvt.'", "].forEach(v=>{v.terr='Saurashtra';v.y=2026;VISITS.push(v)});\n", "")
cut("// intelligence-assigned, visit-specific actions:", "  a.by='si';a.acts[0].a='si';a.visitId=vid;a.det=det;a.rec=rec;ACTS.push(a)});\n", "")
rep("week.splice(0,week.length,['MON','28'],['TUE','29'],['WED','30'],['THU','01'],['FRI','02'],['SAT','03']);\nselDay='30';",
    "{const mon=new Date(BASE);mon.setDate(BASE.getDate()-((BASE.getDay()+6)%7));\n"
    " week.splice(0,week.length,...[0,1,2,3,4,5].map(i=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return[WD[d.getDay()],pad2(d.getDate()),d]}))}\n"
    "selDay=TODAY_DD;")
rep("const dayKey=v=>v.y===2026&&(v.m===8||v.m===9)?pad2(v.d):'';",
    "const dayKey=v=>week.some(w=>w[2].getFullYear()===v.y&&w[2].getMonth()===v.m&&w[2].getDate()===v.d)?pad2(v.d):'';")
cut("// today's visits (replace the earlier placeholders)", "for(let i=ACTS.length-1;i>=0;i--)if(/^VST-0930/.test(ACTS[i].visitId||''))ACTS.splice(i,1);\n", "")
cut("[\n {id:'VST-0930A',n:'National Nikhil Cement'", "].forEach(([id,p])=>{const v=visitById(id);v.pitch=p;v.kind=v.kind||'Retailer';v.steps={stock:1,rec:1,cat:1,order:1}});\n", "")
cut("// intelligence-assigned executable actions:", "Object.assign(a,{by:'si',visitId:vid,det,rec,steps:steps.map((t,i)=>({t,done:i<nd}))});a.acts[0].a='si';ACTS.push(a)});\n", "")

# customers, beat, missed visit, cortex changes
cut("const BEAT={name:'Junagadh South", "prev:'Asked for the waterproofing price list; you promised a follow-up on 28 Sep.'}};",
    "const BEAT=B.beat;\nconst CUST=B.customers;")
cut("// the missed visit + the actions it and an earlier call created", "ACTS.forEach(a=>{if(OEXP[a.id])a.outcomeExp=OEXP[a.id]});\n", "")
rep("const a=mk('TKT-'+n,'Revisit '+v.n,v.n,'Saurashtra',", "const a=mk('TKT-'+n,'Revisit '+v.n,v.n,HOME_TERR,")
rep("function goTracker(st){F.st=st;F.terr='Saurashtra';tab('actions')}", "function goTracker(st){F.st=st;F.terr=HOME_TERR;tab('actions')}")
rep("function goOverdue(){F={terr:'Saurashtra',", "function goOverdue(){F={terr:HOME_TERR,")
rep("<div class=\"hrow\"><h3>TODAY · WED 30 SEP</h3>", "<div class=\"hrow\"><h3>TODAY · ${WD[BASE.getDay()]} ${BASE.getDate()} ${MON3(BASE.getMonth()).toUpperCase()}</h3>")
rep(" · ${BEAT.retailers} planned retailers · September plan</p>", " · ${BEAT.retailers} retailers · ${MN[BASE.getMonth()]} plan</p>")
cut("Object.assign(visitById('VST-0930B'),{cx:", "Huddle flagged the ₹1.2L payment dispute — resolve it on today\\'s visit.'}});\n", "")
rep("function addCortexVisit(v,acts){Object.assign(v,{terr:'Saurashtra',y:2026,state:'scheduled',kind:'Retailer',steps:{}});",
    "function addCortexVisit(v,acts){Object.assign(v,{terr:HOME_TERR,y:TODAY0.y,state:'scheduled',kind:v.kind||'Retailer',steps:{}});")
rep("const a=mk(tk,title,v.n,'Saurashtra','Sales Intelligence',pri,0,'owner','ajay',30,what,why);",
    "const a=mk(tk,title,v.n,HOME_TERR,'Sales Intelligence',pri,0,'owner','ajay',30,what,why);")
cut("// added earlier this morning when Sales AI re-planned the beat", "'Trial order captured and the outlet re-activated on the beat.']]);\n", "")
cut("const CX_NEW={id:'VST-0930E'", "prev:'Identified by Sales AI from Huddle and market data.'}};", "const CX_NEW=B.ai_visit&&B.ai_visit.visit;")
rep("function cortexAddsVisit(){if(visitById(CX_NEW.id))return;", "function cortexAddsVisit(){if(!CX_NEW||visitById(CX_NEW.id))return;")
rep("addCortexVisit(CX_NEW,[['TKT-2431','Take opening order','High','Introduce the brand and take the opening order.','New outlet identified by Sales AI.','Opening order captured and the outlet added to the beat.']]);",
    "addCortexVisit(CX_NEW,B.ai_visit.actions);")
rep("toast('Sales AI added a visit · Shiv Shakti Hardware · 3:30 PM');", "toast('Sales AI added a visit · '+CX_NEW.n+' · '+CX_NEW.t);")
rep("$('#tv').textContent=totalVisits;$('#progfill').style.width=Math.min(100,totalVisits/30*100)+'%';",
    "$('#tv').textContent=totalVisits;$('#progfill').style.width=Math.min(100,totalVisits/B.home.visits_target*100)+'%';")

# dead code in the mockup (overridden further down) — drop its placeholder data too
rep('<span class="v" id="sumAcc">Anil Kumar</span>', '<span class="v" id="sumAcc"></span>')
cut("const visitsData={'05':[", "state:'wait'}]};", "const visitsData={};")
cut("function openBell(el){\n  $('#badge').classList.add('hide');", "popAt(el,$('#pop').innerHTML);\n}", "")

# charts: scale to the real counts; daily view uses real per-day visits (no random split)
rep("$('#sumWt').textContent=(Math.round(u*0.1*10)/10)+' Kgs';", "$('#sumWt').textContent=(Math.round(u*(p[2]||0)*100)/100)+' '+(p[3]||'Kgs');")
rep("const el=$('#chCov'),H=244,max=200;let h=", "const el=$('#chCov'),H=244,max=Math.max(4,Math.ceil(Math.max(1,...COV.map(c=>c[1].reduce((a,b)=>a+b,0)))*1.2/4)*4);let h=")
rep("for(let i=0;i<=4;i++)h+=`<div class=\"ylab\" style=\"bottom:${26+i/4*H}px\">${i*50}</div>`;", "for(let i=0;i<=4;i++)h+=`<div class=\"ylab\" style=\"bottom:${26+i/4*H}px\">${Math.round(max*i/4)}</div>`;")
rep("o={max:200,bw:22,gap:3,step:61,off:16,rl:'Counts Of Monthly Visits'}", "o={max:Math.max(8,Math.ceil(Math.max(1,...MON.map(x=>x[1]))*1.25/4)*4),bw:22,gap:3,step:61,off:16,rl:'Counts Of Monthly Visits'}")
rep("const st=MON.map((_,m)=>monthStats(m)),H=244,max=200;", "const st=MON.map((_,m)=>monthStats(m)),H=244,max=Math.max(8,Math.ceil(Math.max(1,...st0().map(s=>s.t))*1.2/4)*4);")
rep("function drawActions(){", "const st0=()=>MON.map((_,m)=>monthStats(m));\nfunction drawActions(){")
rep("let selMonth=2;", "let selMonth=TODAY0.m;")
cut("function dailyData(m){", "return v.map((x,i)=>({v:x,c:c[i]}))}", "function dailyData(m){const d=B.charts.DAYS[m]||[];return[...Array(DIM(m))].map((_,i)=>({v:d[i]||0,c:0}))}")

rep("const MT=[[120,84,22,14],[150,110,26,14],[156,112,28,16],[140,100,25,15],[118,80,24,14],[126,88,23,15],[104,61,27,16]];", "const MT=B.charts.MT;")
rep("const VCB=[18,52,112,76,54,60,41];", "const VCB=B.charts.VCB;")

# menu: what the workbook doesn't have
rep('<button onclick="closeAll();fabGo(\'order\')">Create Order</button>\n</div>', '<button onclick="closeAll();fabGo(\'order\')">Create Order</button>\n  <button onclick="closeAll();showGaps()">Data Sources</button>\n</div>')

# header stats + first paint
rep("renderCat();render();\n</script>", """/* ---------- home header stats from the backend ---------- */
(function(){const h=B.home,[av,au]=crl(h.achievement_value),[tv,tu]=crl(h.target_value);
  $('#tv').textContent=totalVisits;$('#tvT').textContent=' / '+h.visits_target;
  $('#progfill').style.width=Math.min(100,totalVisits/h.visits_target*100)+'%';
  $('#achV').innerHTML=av+'<small>'+au+'</small>';$('#achT').innerHTML=' / '+tv+'<small>'+tu+'</small>';
  $('#rankV').textContent=h.rank??'–';$('#rankT').textContent=' / '+h.rank_of;
  $('#weekMonth').textContent=MN[TODAY0.m].toUpperCase();})();
function showGaps(){sheetHTML(`<h4>Not in the Excel file</h4><p class="sp">Excel data as of ${B.data_as_of}. Everything else in the app comes from the workbook.</p>`+
  B.data_gaps.map(g=>`<div style="padding:10px 0;border-top:1px solid #eee"><b style="display:block;font-size:12.5px;color:#222;margin-bottom:3px">${esc(g.area)}</b><span style="font-size:11.5px;color:#666;line-height:1.5">${esc(g.detail)}</span></div>`).join(''))}
renderCat();render();
</script>
<script>
/* ---------- loader: fetch the bootstrap from the backend, then start the app ---------- */
(function(){
  const qs=new URLSearchParams(location.search);
  // same origin when served by the backend (/app or port 8000); otherwise port 8000 of the same host; ?api= overrides
  const API=(qs.get('api')||(location.port==='8000'||location.pathname.startsWith('/app')?location.origin:location.protocol+'//'+(location.hostname||'localhost')+':8000')).replace(/\\/$/,'');
  const so=qs.get('so');window.API_BASE=API;
  // service worker messages (push arrived, notification tapped) before the app has started are kept for it
  window.SW_Q=[];
  if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const m=e.data||{};window.onSwMsg?window.onSwMsg(m):window.SW_Q.push(m)});
  const box=document.getElementById('boot'),msg=document.getElementById('bootMsg'),err=document.getElementById('bootErr'),btn=document.getElementById('bootRetry');
  let started=false;
  async function load(){
    box.classList.remove('hide','err');msg.textContent='Loading your day…';err.textContent='';btn.style.display='none';
    try{
      const r=await fetch(API+'/api/app/bootstrap'+(so?'?so='+encodeURIComponent(so):''),{cache:'no-store'});
      let j;try{j=await r.json()}catch(e){throw new Error('HTTP '+r.status)}
      if(!j.success)throw new Error(j.error||('HTTP '+r.status));
      window.BOOT=j.data;
      if(!started){started=true;const s=document.createElement('script');s.textContent=document.getElementById('appjs').textContent;document.body.appendChild(s)}
      box.classList.add('hide');
    }catch(e){
      box.classList.add('err');msg.textContent="Unable to load today's data.";
      err.textContent=(e&&e.message||String(e))+' · '+API;btn.style.display='';
    }
  }
  window.retryBoot=load;load();
})();
</script>""")

# ------------------------------------------------------------------ notifications: backend inbox, Web Push, status sync
# Actions the ASM assigns in the web app arrive here as notifications (a push when it's turned on, and the bell while
# the app is open). Start / update / complete is sent back to the backend, which notifies the ASM. Read state is saved.

rep("<title>BCG Field Sales</title>", """<title>BCG Field Sales</title>
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#3d9aa3">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="icon.png">
<link rel="icon" href="icon.png">""")
rep('  <button onclick="closeAll();showGaps()">Data Sources</button>\n</div>',
    '  <button onclick="closeAll();pushSettings()">Notifications</button>\n  <button onclick="closeAll();showGaps()">Data Sources</button>\n</div>')
rep("function showGaps(){", r"""/* ---------- notifications: backend inbox + push + status sync ---------- */
const API=window.API_BASE,SO=B.sales_officer.id;
function apiJ(p,o){return fetch(API+p,Object.assign({cache:'no-store',headers:{'Content-Type':'application/json'}},o||{}))
  .then(r=>r.json().catch(()=>{throw new Error('HTTP '+r.status)})).then(j=>{if(!j.success)throw new Error(j.error||'Request failed');return j.data})}
Object.assign(NK,{new:'NEW ACTION ASSIGNED',due:'ACTION DUE TODAY',overdue:'ACTION OVERDUE',started:'ACTION STARTED',comment:'ACTION UPDATE',completed:'ACTION COMPLETED',verified:'ACTION VERIFIED',sent_back:'ACTION SENT BACK'});
const _notifLine=notifLine;
notifLine=function(n,a){return n.k==='new'||!n.title?_notifLine(n,a):n.title};
const linkVisit=a=>{if(!a.visitId&&a.retailer_id){const v=VISITS.find(v=>v.retailer_id===a.retailer_id&&v.state==='scheduled');if(v)a.visitId=v.id}};
ACTS.forEach(a=>{if(a.src&&!SRC.includes(a.src))SRC.push(a.src)});

// new notifications (and the assigned actions they point to) while the app is open
let inboxSince=B.inbox_since||0,polling=null;
const inboxQ=since=>apiJ('/api/app/inbox?so='+encodeURIComponent(SO)+'&since='+since);
function mergeActions(d){Object.assign(U,d.users||{});
  d.actions.forEach(a=>{linkVisit(a);if(!SRC.includes(a.src))SRC.push(a.src);const i=ACTS.findIndex(x=>x.id===a.id);if(i<0)ACTS.unshift(a);else ACTS[i]=Object.assign(a,{visitId:a.visitId||ACTS[i].visitId})});
  // the ASM verified or sent back one of the officer's own field actions on the web
  (d.patches||[]).forEach(p=>{const a=byId(p.id);if(!a)return;a.st=p.st;p.acts.forEach(e=>{if(!a.acts.some(x=>x.ts===e.ts&&x.t===e.t))a.acts.push(e)})})}
// one request at a time; a caller that arrives meanwhile (a tap during the poll that coming back to the app starts) waits for it
function pollInbox(){return polling||(polling=(async()=>{
  try{const d=await inboxQ(inboxSince);
    // the web's "Reset for demo" cleared the backend: start again from it rather than keep stale actions
    if(d.epoch!=null&&d.epoch!==(B.tracker_epoch||0)){location.reload();return}
    inboxSince=d.since;mergeActions(d);
    const fresh=d.notifications.filter(n=>!NOTIFS.some(x=>x.id===n.id));
    fresh.forEach(n=>NOTIFS.unshift(n));
    if(fresh.length){const n=fresh[fresh.length-1],a=byId(n.aid);toast(fresh.length>1?fresh.length+' new notifications':n.title+(a?' · '+a.title:''));refreshAll()}
  }catch(e){}})().finally(()=>{polling=null}))}

// read state is kept by the backend, so the bell is the same after a reload
const sentRead=new Set(NOTIFS.filter(n=>n.read).map(n=>n.id));
const _sync=sync;
sync=function(){_sync();const ids=NOTIFS.filter(n=>n.read&&n.id&&!sentRead.has(n.id)).map(n=>n.id);
  if(ids.length){ids.forEach(i=>sentRead.add(i));apiJ('/api/notifications/inbox/read',{method:'POST',body:JSON.stringify({user:SO,ids})}).catch(()=>ids.forEach(i=>sentRead.delete(i)))}};

// every start / update / complete goes through logA: save it, so the ASM is told and it survives a reload
const _logA=logA;
logA=function(a,t,txt){_logA(a,t,txt);
  if(role!=='ajay'||a.to!=='ajay'||!(a.assigned||a.retailer_id)||!['started','comment','complete'].includes(t))return; // local-only (follow-ups, AI visit)
  const body={so:SO,type:t,text:txt||null};
  if(t==='complete'&&a.outcome)body.outcome=a.outcome;
  if(!a.assigned)Object.assign(body,{retailer_id:a.retailer_id,signal:a.signal,title:a.title});
  apiJ('/api/tracker/actions/'+encodeURIComponent(a.id)+'/events',{method:'POST',body:JSON.stringify(body)}).catch(e=>toast('Not saved: '+e.message))};

// check-in / check-out are saved too: a reload (or a push tap that reopens the app) keeps the visit checked in, and
// the actions it unlocks stay unlocked
const saveVisit=(v,type)=>{if(!v||!v.retailer_id)return;
  apiJ('/api/app/visits/'+encodeURIComponent(v.id)+'/events',{method:'POST',body:JSON.stringify({so:SO,type,retailer_id:v.retailer_id})}).catch(e=>toast('Not saved: '+e.message))};
const _checkIn=checkIn;
checkIn=function(i){const v=VISITS[i],was=v&&v.state;_checkIn(i);if(v&&was!=='checkedin'&&v.state==='checkedin')saveVisit(v,'checkin')};
const _checkOut=checkOut;
checkOut=function(){const v=visitById(curVisitId),was=v&&v.state;_checkOut();if(v&&was!=='completed'&&v.state==='completed')saveVisit(v,'checkout')};

// open an action from a notification tap (service worker) or a #a=<id> link. Not loaded yet: the new-notifications
// poll brings it; failing that (its notification was polled before), every assigned action is fetched again.
async function openFromPush(aid){if(!aid)return;
  if(!byId(aid))await pollInbox();
  if(!byId(aid))await inboxQ(0).then(mergeActions).catch(()=>{});
  NOTIFS.forEach(n=>{if(n.aid===aid)n.read=true});
  if(byId(aid))openAction(aid);else toast('This action is no longer available');sync()}

// Web Push needs HTTPS (or localhost); on iPhone the app must be added to the Home Screen first
const PUSH_OK='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&window.isSecureContext;
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent),STANDALONE=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const b64u=s=>{const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))};
let pushOn=false;
const swReg=()=>navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready);  // subscribe needs an active worker
async function enablePush(ask){
  if(!PUSH_OK)return ask&&pushSettings();
  try{const reg=await swReg();let perm=Notification.permission;
    if(perm==='default'&&ask)perm=await Notification.requestPermission();
    if(perm!=='granted'){pushOn=false;if(ask)toast(perm==='denied'?'Notifications are blocked in this browser\'s settings':'Notifications not turned on');return}
    const key=(await apiJ('/api/notifications/webpush/key')).publicKey;
    let sub=await reg.pushManager.getSubscription();
    if(sub&&lsGet('pushKey')!==key){await sub.unsubscribe();sub=null}  // the server's key changed
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(key)});
    lsSet('pushKey',key);
    await apiJ('/api/notifications/webpush/subscribe',{method:'POST',body:JSON.stringify({subscription:sub.toJSON(),user:SO,platform:IOS?'ios':/Android/.test(navigator.userAgent)?'android':'web'})});
    pushOn=true;if(ask){toast('Push notifications are on');closeAll()}
  }catch(e){pushOn=false;if(ask)toast('Could not turn on push: '+e.message);else console.warn('push:',e)}}
async function disablePush(){try{const reg=await swReg(),sub=await reg.pushManager.getSubscription();
  if(sub){await apiJ('/api/notifications/unregister',{method:'POST',body:JSON.stringify({token:sub.endpoint})}).catch(()=>{});await sub.unsubscribe()}}catch(e){}
  pushOn=false;closeAll();toast('Push notifications are off')}
function pushSettings(){
  let st,act='';
  if(!PUSH_OK&&IOS&&!STANDALONE)st='On iPhone, push works once the app is on your Home Screen: tap Share, then <b>Add to Home Screen</b>, open it from there and come back here.';
  else if(!PUSH_OK)st='Push needs the app to be opened over <b>HTTPS</b> (it is on '+esc(location.origin)+'). New actions still appear in the bell while the app is open.';
  else if(Notification.permission==='denied')st='Notifications are blocked for this site. Allow them in the browser\'s site settings, then come back here.';
  else if(pushOn){st='Push is on for this phone. You get a notification when your ASM assigns you an action, and when an assigned action is due or overdue.';act=`<button class="btn out" onclick="disablePush()">Turn Off</button>`}
  else{st='Get a notification on this phone when your ASM assigns you an action, and when an assigned action is due or overdue.';act=`<button class="btn pri" onclick="enablePush(true)">Turn On Notifications</button>`}
  sheetHTML(`<h4>Notifications</h4><p class="sp">${st}</p>${act}`)}

function startNotifications(){
  setInterval(()=>{if(document.visibilityState==='visible')pollInbox()},20000);
  // a notification tapped while the app was in the background: the service worker also keeps it, and the app asks
  // for it whenever it comes to the front, so a message a suspended page never got (iPhone) still opens the action
  const swPost=m=>{const c='serviceWorker' in navigator&&navigator.serviceWorker.controller;if(c)c.postMessage(m)};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){swPost({type:'pending?'});pollInbox()}});
  // the loader listens from the start and keeps what arrived before the app was ready (a tap during loading)
  let lastOpen={};
  window.onSwMsg=m=>{if(m.type==='push')pollInbox();
    else if(m.type==='open'){swPost({type:'opened'});if(lastOpen.aid===m.aid&&Date.now()-lastOpen.ts<5000)return;lastOpen={aid:m.aid,ts:Date.now()};openFromPush(m.aid)}};
  window.SW_Q.splice(0).forEach(window.onSwMsg);
  swPost({type:'pending?'});
  const m=location.hash.match(/^#a=(.+)$/);
  // (the service worker may also answer 'pending?' with this same tap: lastOpen keeps it from opening twice)
  if(m){history.replaceState(null,'',location.pathname+location.search);lastOpen={aid:decodeURIComponent(m[1]),ts:Date.now()};openFromPush(lastOpen.aid)}
  if(PUSH_OK&&Notification.permission==='granted')enablePush(false);   // keep this phone's subscription current
  else if(PUSH_OK&&Notification.permission==='default'&&!lsGet('pushAsked')){lsSet('pushAsked','1');
    setTimeout(()=>sheetHTML(`<h4>Turn on notifications?</h4><p class="sp">Get a notification when your ASM assigns you an action, and when an assigned action is due or overdue.</p>
      <div class="two"><button class="btn out" onclick="closeAll()">Not Now</button><button class="btn pri" onclick="enablePush(true)">Turn On</button></div>`),1500)}
}
function showGaps(){""")
rep("renderCat();render();\n</script>\n<script>", "renderCat();render();\nstartNotifications();\n</script>\n<script>")

# a notification whose action the app doesn't have (removed by a tracker reset, or not loaded yet) must not break the
# bell: the panel used to throw while rendering it and not open at all. It shows the notification's own text instead,
# in the same .nt row, and tapping it says the action is gone rather than throwing.
rep("const a=byId(n.aid),[t1,t2]=splitT(a),[dt]=dueTxt(a);",
    "const a=byId(n.aid);if(!a){const [b1,b2]=String(n.body||'').split(' · ');return`<button class=\"nt ${n.read?'':'un'}\" onclick=\"openNotif(${NOTIFS.indexOf(n)})\"><small>${NK[n.k]||'NOTIFICATION'}</small><time>${ago(n.ts)}</time><b>${esc(n.title||'Action update')}</b><span>${esc(b1||'')}</span><span>${esc(b2||'')}</span></button>`}const [t1,t2]=splitT(a),[dt]=dueTxt(a);",
    count=2)
# every action notification (due, overdue, update, sent back, verified — not only "new") carries the mockup's
# priority · due line, so all bell rows look like the mockup's
rep("${n.k==='new'?`<em>${a.pri} Priority · ${dt}</em>`:''}", "<em>${a.pri} Priority · ${dt}</em>", count=2)
# the bell measured itself before .ntp (max-height:70%) applied, so with ~6+ notifications it was too tall to fit
# below the bell and was placed above it, off the top of the screen: the bell "didn't open". Size it first.
rep("  popAt(el,`<div class=\"nh\">", "  $('#pop').classList.add('ntp');popAt(el,`<div class=\"nh\">", count=2)
rep("function openAction(id){const a=byId(id);if(a.to===role)",
    "function openAction(id){const a=byId(id);if(!a){closeAll();toast('This action is no longer available');return}if(a.to===role)")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")

# service worker, manifest and icon for push + "Add to Home Screen" (served next to index.html at /app/)
for f in (ROOT / "pwa").iterdir():
    (OUT.parent / f.name).write_bytes(f.read_bytes())
print(f"wrote {OUT} ({len(html) // 1024} KB)")
