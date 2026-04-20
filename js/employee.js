function loadEmpScreen(emp){
document.getElementById(‘empAv’).textContent=emp.name[0];
document.getElementById(‘empAvBig’).textContent=emp.name[0];
document.getElementById(‘empNameBar’).textContent=emp.name;
document.getElementById(‘empNameBadge’).textContent=emp.name;
document.getElementById(‘empWelcome’).textContent=`مرحباً،`;
const nb=document.getElementById(‘empNameBig’);if(nb)nb.textContent=emp.name+’ 👋’;
const now=new Date();
document.getElementById(‘empDateBar’).textContent=now.toLocaleDateString(‘ar-IQ’,{weekday:‘long’,month:‘long’,day:‘numeric’});
document.getElementById(‘empWelcomeSub’).textContent=now.toLocaleDateString(‘ar-IQ’,{weekday:‘long’,year:‘numeric’,month:‘long’,day:‘numeric’});
document.getElementById(‘empShiftBar’).textContent=`الشفت: ${shiftLabel(emp)}`;
refreshEmpUI(emp);
updTodayStatus(emp.id);
renderEmpHist(emp.id);
renderDayGrid(emp.id);
renderEmpAttPattern(emp.id);
updAttBtns();
renderEmpMessages(emp.id);
renderEmpArchive(emp.id);
startClock();
// New v3/v4
try{renderEmpLeaveHistory();}catch(e){}
try{renderEmpLastAtt();}catch(e){}
try{renderEmpChat();}catch(e){}
try{requestBrowserNotif();}catch(e){}
try{renderEmpLoanHistory();}catch(e){}
setTimeout(()=>{try{_startChatListener();}catch(e){}},1500);
}

function refreshEmpUI(emp){
const c=calcSalary(emp);
document.getElementById(‘es-net’).textContent=fmtN(c.net);
document.getElementById(‘es-pres’).textContent=c.daysPresent;
document.getElementById(‘es-abs’).textContent=c.deductDays;
document.getElementById(‘es-bon’).textContent=fmtN(c.totalBon);
document.getElementById(‘accBig’).innerHTML=`${fmtN(c.net)} <span style="font-size:14px;color:var(--t2)">د.ع</span>`;
document.getElementById(‘accSub2’).textContent=`${c.daysPresent} حضور + ${c.paidLeaves} إجازة × ${fmtN(c.dailyRate)} د.ع/يوم`;
document.getElementById(‘empPeriodLabel’).textContent=‘الفترة: ‘+c.per.label;
const pct=Math.min(100,Math.round(c.paidDays/c.per.totalDays*100));
document.getElementById(‘accBar’).style.width=pct+’%’;
document.getElementById(‘accS’).textContent=c.per.start.toLocaleDateString(‘ar-IQ’,{day:‘numeric’,month:‘short’});
document.getElementById(‘accE’).textContent=c.per.end.toLocaleDateString(‘ar-IQ’,{day:‘numeric’,month:‘short’});
document.getElementById(‘slipEmpName’).textContent=emp.name+’ — ‘+c.per.label;
document.getElementById(‘empPBadge’).textContent=c.per.label;
document.getElementById(‘sl-monthly’).textContent=fmtN(emp.sal)+’ د.ع’;
document.getElementById(‘sl-daily’).textContent=fmtN(c.dailyRate)+’ د.ع’;
document.getElementById(‘sl-present’).textContent=c.daysPresent+’ يوم’;
document.getElementById(‘sl-paidleave’).textContent=c.paidLeaves+’ يوم’;
document.getElementById(‘sl-deductdays’).textContent=
(c.daysAbsent>0?c.daysAbsent+’ غياب’:’’) +
(c.daysAbsent>0&&c.deductLeaves>0?’ + ‘:’’) +
(c.deductLeaves>0?c.deductLeaves+’ إجازة زائدة’:’’) ||
‘لا يوجد’;
document.getElementById(‘sl-earned’).textContent=fmtN(c.earnedSalary)+’ د.ع’;
document.getElementById(‘sl-shiftbon’).textContent=’+’+fmtN(c.shiftBonTotal)+’ د.ع’;
document.getElementById(‘sl-salesbon’).textContent=’+’+fmtN(c.salesBonTotal)+’ د.ع’;
document.getElementById(‘sl-otherbon’).textContent=’+’+fmtN(c.otherBonTotal)+’ د.ع’;
document.getElementById(‘sl-ded’).textContent=’-’+fmtN(c.totalDed)+’ د.ع’;
document.getElementById(‘sl-total’).textContent=fmtN(c.net)+’ د.ع’;
}

function updTodayStatus(eid){
const att=DB.get(‘att’)||[];
const t=document.getElementById(‘empTT1’), s=document.getElementById(‘empTSub1’);
if(!t)return;
// ابحث عن آخر CI مع حالته
const allCI=att.filter(a=>a.eid===eid&&a.type===‘ci’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const lastCI=allCI[0];
if(!lastCI){
t.textContent=‘⚪ لم تسجل حضوراً بعد’;
s.textContent=‘اضغط تسجيل الحضور لبدء دوامك’;
return;
}
const co=att.find(a=>a.eid===eid&&a.type===‘co’&&a.date===lastCI.date);
if(co){
// حسب المدة
const mins=co.durMins||0;
const h=Math.floor(mins/60),m=mins%60;
const warningTxt=mins<240?’ ⚠️ (أقل من 4 ساعات)’:’’;
t.textContent=`✅ تم تسجيل الانصراف${warningTxt}`;
s.textContent=`📅 ${fmtD(lastCI.date)} | حضور: ${lastCI.time} | انصراف: ${co.time} | المدة: ${h}س ${m}د`;
t.style.color=mins<240?‘var(–red)’:‘var(–green)’;
} else {
// لا يزال مسجل الحضور
const now=new Date();
const mins=Math.round((now-new Date(lastCI.ts))/60000);
const h=Math.floor(mins/60),m=mins%60;
t.textContent=‘🟢 مسجل الحضور الآن’;
t.style.color=‘var(–green)’;
s.textContent=`📅 ${fmtD(lastCI.date)} | حضور: ${lastCI.time} | مدة الدوام: ${h}س ${m}د`;
}
}

function updAttBtns(){
const emp=getEmp(); if(!emp)return;
const sd=shiftDateStr(), att=DB.get(‘att’)||[];
const ci=att.find(a=>a.eid===emp.id&&a.date===sd&&a.type===‘ci’);
const co=ci?att.find(a=>a.eid===emp.id&&a.date===ci.date&&a.type===‘co’):null;
// أيضاً: بحث عن أي CI بدون CO (للحالات العابرة للأيام)
const allCI=att.filter(a=>a.eid===emp.id&&a.type===‘ci’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const openCI=allCI.find(c=>!att.find(co2=>co2.eid===emp.id&&co2.type===‘co’&&co2.date===c.date));
const bci=document.getElementById(‘btnCI’), bco=document.getElementById(‘btnCO’);
// حضور: يُعطَّل إذا هناك ci اليوم أو ci مفتوح
if(bci)bci.disabled=(!!ci||!!openCI)||!gpsOk;
// انصراف: يُفعَّل إذا هناك ci مفتوح بدون co (بدون قيد وقت)
if(bco)bco.disabled=!openCI;
}

// ═══ SHIFT-AWARE DATE: يرجع تاريخ “يوم الدوام” بدلاً من التاريخ الفعلي
// الدوام يبدأ بعد الظهر، فساعات 0-10 صباحاً = امتداد للدوام السابق
function shiftDateStr(){
const now=new Date();
const h=now.getHours();
// ساعات 0-10 صباحاً = امتداد دوام البارحة → نستخدم تاريخ الأمس
if(h<11){
const d=new Date(now); d.setDate(d.getDate()-1);
return d.toISOString().split(‘T’)[0];
}
return now.toISOString().split(‘T’)[0];
}

function doCI(){
const emp=getEmp(); if(!emp)return;
if(!gpsOk){showToast(‘يجب أن تكون في موقع العمل’,‘e’);return}
const shiftDate=shiftDateStr(), att=DB.get(‘att’)||[];
if(att.find(a=>a.eid===emp.id&&a.date===shiftDate&&a.type===‘ci’)){showToast(‘سجلت حضورك مسبقاً’,‘e’);return}
const now=new Date();
const wl=getWorkLoc();
const dist=Math.round(calcDist(uLat,uLng,wl.lat,wl.lng));
const rec={id:genId(),eid:emp.id,ename:emp.name,type:‘ci’,date:shiftDate,time:fmtT(now),ts:now.toISOString(),lat:uLat,lng:uLng,dist};
att.push(rec); DB.set(‘att’,att);
addAdminLog(‘check_in’,’تسجيل حضور: ’+emp.name,{eid:emp.id,date:shiftDate,time:fmtT(now),dist});
updTodayStatus(emp.id); renderEmpHist(emp.id); renderDayGrid(emp.id); renderEmpAttPattern(emp.id); updAttBtns(); refreshEmpUI(emp);
sendTg(‘✅ تسجيل حضور\n👤 ‘+emp.name+’\n🕐 ‘+fmtT(now)+’\n📅 ‘+fmtD(shiftDate)+’\n📍 ‘+dist+’ متر’);
playNotifSound(‘in’);
showToast(’✅ تم تسجيل الحضور — ’+fmtT(now),‘s’);
}

function doCO(){
const emp=getEmp(); if(!emp)return;
const att=DB.get(‘att’)||[];
const allCI=att.filter(a=>a.eid===emp.id&&a.type===‘ci’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const ci=allCI.find(ci=>{
return !att.find(co=>co.eid===emp.id&&co.type===‘co’&&co.date===ci.date);
});
if(!ci){showToast(‘سجّل الحضور أولاً’,‘e’);return}
const now=new Date();
const mins=Math.round((now-new Date(ci.ts))/60000);
const h=Math.floor(mins/60), m=mins%60;
const wl=getWorkLoc();
const dist=Math.round(calcDist(uLat||wl.lat,uLng||wl.lng,wl.lat,wl.lng));
att.push({id:genId(),eid:emp.id,ename:emp.name,type:‘co’,date:ci.date,time:fmtT(now),ts:now.toISOString(),lat:uLat,lng:uLng,dist,durMins:mins});
DB.set(‘att’,att);
addAdminLog(‘check_out’,’تسجيل انصراف: ’+emp.name,{eid:emp.id,date:ci.date,time:fmtT(now),durMins:mins});
updTodayStatus(emp.id); renderEmpHist(emp.id); renderDayGrid(emp.id); renderEmpAttPattern(emp.id); updAttBtns(); refreshEmpUI(emp);
sendTg(’🚪 تسجيل انصراف\n👤 ‘+emp.name+’\n🕐 ‘+fmtT(now)+’\n📅 ‘+fmtD(ci.date)+’\n⏱️ ’+h+’س ’+m+‘د’);
playNotifSound(‘out’);
showToast(’🚪 تم تسجيل الانصراف — ’+h+’س ’+m+‘د’,‘i’);
}

function toggleAutoCo(){
_autoCoEnabled=!_autoCoEnabled;
const btn=document.getElementById(‘autoCoBtn’);
if(btn){
btn.textContent=_autoCoEnabled?‘🚗 تلقائي’:‘🚗 موقوف’;
btn.style.color=_autoCoEnabled?‘var(–green)’:‘var(–red)’;
}
showToast(_autoCoEnabled?‘✅ الانصراف التلقائي مُفعَّل عند 750م’:‘⏸️ الانصراف التلقائي موقوف’,_autoCoEnabled?‘s’:‘i’);
}

function renderEmpHist(eid){
const c=document.getElementById(‘empHL’); if(!c)return;
const att=(DB.get(‘att’)||[]).filter(a=>a.eid===eid).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
c.innerHTML=att.length?att.map(a=>` <div class="hi"> <div class="hic ${a.type==='ci'?'in':'out'}">${a.type==='ci'?'✅':a.isAuto?'🚗':'🚪'}</div> <div class="hinfo"> <div class="htype">${a.type==='ci'?'تسجيل حضور':a.isAuto?'انصراف تلقائي 🚗':'تسجيل انصراف'}${a.type==='co'&&a.durMins?` — ${Math.floor(a.durMins/60)}س ${a.durMins%60}د`:''}</div> <div class="hdate">${fmtD(a.date)}${a.isAuto&&a.dist?` • ابتعاد ${a.dist}م`:''}</div> </div> <div class="htime">${a.time}</div> </div>`).join(’’):`<div class="empty"><div class="ei">📭</div><p>لا توجد سجلات</p></div>`;
}

function renderDayGrid(eid){
const c=document.getElementById(‘empDG’); if(!c)return;
const att=DB.get(‘att’)||[];
const leaveDays=DB.get(‘leaveDays’)||[];
const per=getPeriod();
// دائماً من اليوم 1 للشهر
const now=new Date();
const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0);
const today=todayStr();
const days=[];
let cur=new Date(monthStart);
while(cur<=monthEnd){
const ds=cur.toISOString().split(‘T’)[0];
const future=ds>today;
const hasCI=att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘ci’);
const isLeave=leaveDays.some(l=>l.eid===eid&&l.date===ds)||att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘leave’);
let cls,title;
if(future){cls=‘f’;title=fmtD(ds);}
else if(hasCI){cls=‘p’;title=’حضور — ’+fmtD(ds);}
else if(isLeave){cls=‘lv’;title=‘إجازة — ‘+fmtD(ds);}
else{cls=‘f’;title=fmtD(ds);} // لا يوجد غياب، فقط أيام بدون بصمة
days.push(`<div class="dc ${cls}" title="${title}">${cur.getDate()}</div>`);
cur.setDate(cur.getDate()+1);
}
c.innerHTML=days.join(’’);
}

function renderEmpAttPattern(eid){
const c=document.getElementById(‘empAttPattern’); if(!c)return;
const att=DB.get(‘att’)||[];
const leaveDays=DB.get(‘leaveDays’)||[];
const dots=[];
const now=new Date(), y=now.getFullYear(), m=now.getMonth();
const monthStart=new Date(y,m,1);
const monthEnd=new Date(y,m+1,0);
const today=new Date(); today.setHours(23,59,59);
let cur=new Date(monthStart);
while(cur<=monthEnd){
const ds=cur.toISOString().split(‘T’)[0];
const future=cur>today;
const has=att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘ci’);
const isLeave=leaveDays.some(l=>l.eid===eid&&l.date===ds)||att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘leave’);
let cls=future?‘future’:has?‘present’:isLeave?‘on-leave’:‘future’; // لا يوجد absent
dots.push(`<div class="att-dot ${cls}" title="${cur.toLocaleDateString('ar-IQ')}">${cur.getDate()}</div>`);
cur.setDate(cur.getDate()+1);
}
c.innerHTML=dots.join(’’);
}

function renderEmpMessages(eid){
var c=document.getElementById(‘empMsgList’); if(!c)return;
var msgs=(DB.get(‘msg’)||[]).filter(function(m){return m.eid===eid&&m.type!==‘reply’;}).sort(function(a,b){return new Date(b.ts)-new Date(a.ts);});
if(!msgs.length){c.innerHTML=’<div class="empty"><div class="ei">📭</div><p>لا توجد رسائل من المدير</p></div>’;return;}
var html=’’;
msgs.forEach(function(m){
html+=’<div class="msg-item">’;
html+=’<div class="msg-head">’;
html+=’<div class="msg-avatar">👑</div>’;
html+=’<div>’;
html+=’<div class="msg-name" style="color:var(--gold)">المدير — سجاد محمد</div>’;
html+=’<div class="msg-time">’+fmtD(m.date)+’ — ‘+m.time+’</div>’;
html+=’</div></div>’;
html+=’<div class="msg-text">’+m.text+’</div>’;
html+=’</div>’;
});
c.innerHTML=html;
}

function renderEmpArchive(eid){
const c=document.getElementById(‘empArchList’); if(!c)return;
const archive=DB.get(‘archive’)||{periods:[]};
const periods=archive.periods.filter(p=>p.employees.some(e=>e.id===eid));
if(!periods.length){c.innerHTML=`<div class="empty"><div class="ei">🗄️</div><p>لا توجد فترات مؤرشفة بعد<br><small>ستُحفظ الفترات تلقائياً عند انتهائها</small></p></div>`;return;}
c.innerHTML=periods.map(per=>{
const empData=per.employees.find(e=>e.id===eid);
if(!empData)return’’;
return `<div class="arch-period" onclick="showEmpArchDetail('${per.key}','${eid}')"> <div class="arch-ph"> <div><div style="font-size:14px;font-weight:700">${per.label}</div><div style="font-size:11px;color:var(--t2);margin-top:3px">يوم الصرف: ${fmtD(per.payDate)}</div></div> <div style="text-align:left"><div class="gnum" style="font-size:16px">${fmtN(empData.net)} د.ع</div><div style="font-size:11px;color:var(--t2)">${empData.daysPresent} يوم حضور</div></div> </div> </div>`;
}).join(’’);
}

function showEmpArchDetail(periodKey,eid){
const archive=DB.get(‘archive’)||{periods:[]};
const per=archive.periods.find(p=>p.key===periodKey); if(!per)return;
const emp=per.employees.find(e=>e.id===eid); if(!emp)return;
document.getElementById(‘archDetailTitle’).textContent=`أرشيف: ${per.label}`;
document.getElementById(‘archDetailContent’).innerHTML=` <div class="slip"> <div class="sliph"><h4>👑 سندريلا — ${per.label}</h4><p>${emp.name}</p></div> <div class="srow"><div class="sl2">الراتب الشهري</div><div class="sv2 gnum">${fmtN(emp.sal)} د.ع</div></div> <div class="srow"><div class="sl2">أيام الحضور</div><div class="sv2 tgrn">${emp.daysPresent} يوم</div></div> <div class="srow grn"><div class="sl2">الراتب المكتسب</div><div class="sv2">${fmtN(emp.earnedSalary)} د.ع</div></div> <div class="srow grn"><div class="sl2">مكافآت الشفتات</div><div class="sv2">+${fmtN(emp.shiftBonTotal)} د.ع</div></div> <div class="srow grn"><div class="sl2">حوافز المبيعات</div><div class="sv2">+${fmtN(emp.salesBonTotal)} د.ع</div></div> <div class="srow grn"><div class="sl2">حوافز أخرى</div><div class="sv2">+${fmtN(emp.otherBonTotal)} د.ع</div></div> <div class="srow ded"><div class="sl2">الخصومات</div><div class="sv2">-${fmtN(emp.totalDed)} د.ع</div></div> <div class="divider"></div> <div class="srow tot"><div class="sl2">💰 الإجمالي</div><div class="sv2">${fmtN(emp.net)} د.ع</div></div> </div>`;
openModal(‘archDetailModal’);
}

function showETab(id,el){
document.querySelectorAll(’#empScreen .tab’).forEach(t=>t.classList.remove(‘active’));
document.querySelectorAll(’#empScreen .mnav-item’).forEach(s=>s.classList.remove(‘active’));
document.querySelectorAll(’#empSidebar .sitem’).forEach(s=>s.classList.remove(‘active’));
const tabEl=document.getElementById(‘et-’+id);
if(tabEl)tabEl.classList.add(‘active’);
if(el)el.classList.add(‘active’);
// sync sidebar highlight
const sidebarItems=document.querySelectorAll(’#empSidebar .sitem’);
sidebarItems.forEach(s=>{if((s.getAttribute(‘onclick’)||’’).includes(”’”+id+”’”))s.classList.add(‘active’);});
const emp=getEmp(); if(emp)refreshEmpUI(emp);
// Tab-specific renders
if(id===‘schedule’){renderEmpSchedule();}
if(id===‘chat’){renderEmpChat();setTimeout(()=>{const c=document.getElementById(‘empChatMessages’);if(c)c.scrollTop=c.scrollHeight;},100);}
if(id===‘msg’&&emp)renderEmpMessages(emp.id);
if(id===‘leave’&&emp)renderEmpLeaveHistory();
if(id===‘delatt’)renderEmpLastAtt();
if(id===‘loan’)renderEmpLoanHistory();
document.getElementById(‘empMainScroll’)?.scrollTo(0,0);
}

// ═══════════════════════════════════════════════════
//  ADMIN RENDER
// ═══════════════════════════════════════════════════
