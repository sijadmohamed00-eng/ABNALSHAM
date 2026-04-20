async function sendTg(text){
const chatId=DB.get(‘tgId’)||TG_CHAT_DEFAULT;
const token=getActiveTgToken();
if(!chatId||chatId===‘YOUR_CHAT_ID’)return;
const maxLen=4000;
const chunks=[];
for(let i=0;i<text.length;i+=maxLen)chunks.push(text.slice(i,i+maxLen));
for(const chunk of chunks){
try{
const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
method:‘POST’,headers:{‘Content-Type’:‘application/json’},
body:JSON.stringify({chat_id:chatId.toString(),text:chunk})
});
const d=await r.json();
if(!d.ok)console.warn(‘TG:’,d.description);
}catch(e){console.log(‘TG err:’,e)}
}
}
function saveTgSettings(){
const chatId=document.getElementById(‘tgChatId’).value.trim();
const token=document.getElementById(‘tgTokenInput’).value.trim();
DB.set(‘tgId’,chatId||TG_CHAT_DEFAULT);
if(token)DB.set(‘tgToken’,token);
const disp=document.getElementById(‘tgTokenDisplay’);
if(disp){const t=getActiveTgToken();disp.textContent=t.substring(0,20)+’…’;}
showToast(‘✅ تم حفظ إعدادات تليجرام’,‘s’);
}
function getActiveTgToken(){return DB.get(‘tgToken’)||TG_TOKEN;}
function loadTgDisplay(){
const t=getActiveTgToken();
const disp=document.getElementById(‘tgTokenDisplay’);
if(disp)disp.textContent=t.substring(0,25)+’…’;
const inp=document.getElementById(‘tgTokenInput’);
if(inp)inp.value=DB.get(‘tgToken’)||’’;
const cid=document.getElementById(‘tgChatId’);
if(cid)cid.value=DB.get(‘tgId’)||TG_CHAT_DEFAULT;
// retry queue
setTimeout(_retryTgQueue,3000);
}

// ── سجل عمليات المدير ──
function addAdminLog(action, desc, data){
const logs=DB.get(‘adminLogs’)||[];
const now=new Date();
logs.unshift({
id:genId(),action,desc,data,
date:todayStr(),time:fmtT(now),ts:now.toISOString(),
by:CU?.role===‘admin’?‘المدير’:(getEmp()?.name||‘موظف’)
});
if(logs.length>500)logs.length=500;
DB.set(‘adminLogs’,logs);
}
function renderAdminLogs(){
const c=document.getElementById(‘adminLogsList’);if(!c)return;
let logs=DB.get(‘adminLogs’)||[];
const q=(document.getElementById(‘logsSearch’)?.value||’’).toLowerCase();
if(q)logs=logs.filter(l=>(l.desc||’’).toLowerCase().includes(q)||(l.action||’’).toLowerCase().includes(q));
if(!logs.length){c.innerHTML=’<div class="empty"><div class="ei">📝</div><p>لا توجد عمليات مسجلة</p></div>’;return;}
const icons={check_in:‘✅’,check_out:‘🚪’,salary_edit:‘💰’,bonus_add:‘🎁’,bonus_del:‘🗑️’,ded_add:‘📉’,ded_del:‘🗑️’,shift_edit:‘🕐’,emp_add:‘👤’,emp_del:‘🗑️’,leave_approve:‘✅’,leave_reject:‘❌’,att_delete:‘🗑️’,tg_token:‘🔑’,default:‘📝’};
c.innerHTML=logs.map(l=>` <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04)"> <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icons[l.action]||icons.default}</div> <div style="flex:1;min-width:0"> <div style="font-size:12px;font-weight:600">${l.desc}</div> <div style="font-size:10px;color:var(--t3);margin-top:2px">${fmtD(l.date)} — ${l.time} | ${l.by}</div> </div> </div>`).join(’’);
}
function clearAdminLogs(){
if(!confirm(‘مسح كل سجل العمليات؟’))return;
DB.del(‘adminLogs’);renderAdminLogs();showToast(‘تم المسح’,‘i’);
}

// ── حذف تسجيل حضور (للموظف) ──
function empDeleteLastAtt(){
const emp=getEmp();if(!emp)return;
const att=DB.get(‘att’)||[];
const empAtt=att.filter(a=>a.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(!empAtt.length){showToast(‘لا يوجد تسجيل لحذفه’,‘e’);return;}
const last=empAtt[0];
if(!confirm(`حذف تسجيل ${last.type==='ci'?'الحضور':'الانصراف'} بتاريخ ${fmtD(last.date)} — ${last.time}؟`))return;
const newAtt=att.filter(a=>a.id!==last.id);
DB.set(‘att’,newAtt);
addAdminLog(‘att_delete’,`حذف تسجيل ${last.type==='ci'?'حضور':'انصراف'}: ${emp.name}`,{eid:emp.id,date:last.date,time:last.time,type:last.type});
sendTg(`⚠️ حذف تسجيل\n👤 ${emp.name}\nالنوع: ${last.type==='ci'?'حضور':'انصراف'}\nالتاريخ: ${fmtD(last.date)} — ${last.time}\n📌 تم الحذف بواسطة الموظف`);
updTodayStatus(emp.id);renderEmpHist(emp.id);renderDayGrid(emp.id);updAttBtns();
renderEmpLastAtt();
showToast(‘✅ تم حذف التسجيل وإشعار المدير’,‘s’);
}
function renderEmpLastAtt(){
const c=document.getElementById(‘empLastAttRecord’);if(!c)return;
const emp=getEmp();if(!emp){c.innerHTML=’’;return;}
const att=DB.get(‘att’)||[];
const empAtt=att.filter(a=>a.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(!empAtt.length){c.innerHTML=’<div class="empty"><div class="ei">📭</div><p>لا توجد تسجيلات</p></div>’;return;}
const last=empAtt[0];
c.innerHTML=`<div style="background:rgba(233,69,96,.06);border:1px solid rgba(233,69,96,.2);border-radius:12px;padding:14px">
<div style="font-size:11px;color:var(--t3);margin-bottom:6px">آخر تسجيل:</div>
<div style="font-size:14px;font-weight:700">${last.type===‘ci’?‘✅ حضور’:‘🚪 انصراف’}</div>
<div style="font-size:12px;color:var(--t2);margin-top:4px">${fmtD(last.date)} — ${last.time}</div>

  </div>`;
}

// ── حذف تسجيل حضور (للمدير) ──
function adminDeleteAtt(attId){
if(!confirm(‘حذف هذا التسجيل نهائياً؟’))return;
const att=DB.get(‘att’)||[];
const rec=att.find(a=>a.id===attId);
if(!rec)return;
DB.set(‘att’,att.filter(a=>a.id!==attId));
addAdminLog(‘att_delete’,`حذف تسجيل ${rec.type==='ci'?'حضور':'انصراف'}: ${rec.ename}`,{date:rec.date,time:rec.time});
renderAdminAtt();renderAdmin();
showToast(‘🗑️ تم الحذف’,‘i’);
}

// ── رد الموظف على رسالة المدير ──
function empReplyToManager(){
const emp=getEmp();if(!emp)return;
const text=document.getElementById(‘empReplyText’).value.trim();
if(!text){showToast(‘اكتب ردك أولاً’,‘e’);return;}
const now=new Date();
const reply={id:genId(),eid:emp.id,ename:emp.name,type:‘reply’,text,date:todayStr(),time:fmtT(now),ts:now.toISOString()};
const msgs=DB.get(‘msg’)||[];msgs.push(reply);DB.set(‘msg’,msgs);
sendTg(`↩️ رد من موظف\n👤 ${emp.name}\n💬 ${text}\n🕐 ${fmtT(now)}`);
playNotifSound(‘msg’);
document.getElementById(‘empReplyText’).value=’’;
showToast(‘✅ تم إرسال ردك للمدير’,‘s’);
}

// ── طلبات الإجازة ──
function submitLeaveRequest(){
const emp=getEmp();if(!emp)return;
const type=document.getElementById(‘leaveTypeEmp’).value;
const date=document.getElementById(‘leaveDateEmp’).value;
const reason=document.getElementById(‘leaveReasonEmp’).value.trim();
if(!date){showToast(‘اختر التاريخ’,‘e’);return;}
const req={id:genId(),eid:emp.id,ename:emp.name,type,date,reason,status:‘pending’,ts:new Date().toISOString(),requestedAt:fmtT(new Date())};
const leaves=DB.get(‘leaveRequests’)||[];leaves.push(req);DB.set(‘leaveRequests’,leaves);
sendTg(`🌴 طلب إجازة جديد\n👤 ${emp.name}\nالنوع: ${type}\nالتاريخ: ${fmtD(date)}\nالسبب: ${reason||'—'}`);
playNotifSound(‘msg’);
document.getElementById(‘leaveDateEmp’).value=’’;document.getElementById(‘leaveReasonEmp’).value=’’;
renderEmpLeaveHistory();
showToast(‘✅ تم إرسال طلب الإجازة للمدير’,‘s’);
}
function renderEmpLeaveHistory(){
const c=document.getElementById(‘empLeaveHistory’);if(!c)return;
const emp=getEmp();if(!emp){c.innerHTML=’’;return;}
const leaves=(DB.get(‘leaveRequests’)||[]).filter(r=>r.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(!leaves.length){c.innerHTML=’<div class="empty"><div class="ei">🌴</div><p>لا توجد طلبات</p></div>’;return;}
const statusMap={pending:‘⏳ انتظار’,approved:‘✅ موافق’,rejected:‘❌ مرفوض’};
const colMap={pending:‘var(–gold)’,approved:‘var(–green)’,rejected:‘var(–red)’};
c.innerHTML=leaves.map(r=>` <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px"> <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"> <div><div style="font-size:13px;font-weight:700">${r.type} — ${fmtD(r.date)}</div> <div style="font-size:11px;color:var(--t3);margin-top:2px">${r.reason||''}</div></div> <span style="font-size:11px;font-weight:700;color:${colMap[r.status]}">${statusMap[r.status]}</span> </div> ${r.adminNote?`<div style="font-size:11px;color:var(--t2);margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06)">📝 المدير: ${r.adminNote}</div>`:''} </div>`).join(’’);
}
function renderLeaveRequests(){
// Pending
const pending=document.getElementById(‘leavePendingList’);
const archived=document.getElementById(‘leaveArchivedList’);
const cntEl=document.getElementById(‘leavePendingCount’);
const all=DB.get(‘leaveRequests’)||[];
const pend=all.filter(r=>r.status===‘pending’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const done=all.filter(r=>r.status!==‘pending’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(cntEl)cntEl.textContent=pend.length;
if(pending){
pending.innerHTML=pend.length?pend.map(r=>` <div style="background:var(--bg3);border:1px solid rgba(240,192,64,.2);border-radius:12px;padding:14px;margin-bottom:10px"> <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px"> <div><div style="font-size:14px;font-weight:700">👤 ${r.ename}</div> <div style="font-size:12px;color:var(--t2);margin-top:4px">${r.type} — ${fmtD(r.date)}</div> <div style="font-size:11px;color:var(--t3);margin-top:2px">${r.reason||'—'}</div></div> <div class="flex g8"> <button class="btn btn-ok btn-sm" onclick="respondLeave('${r.id}','approved')">✅ موافقة</button> <button class="btn btn-dn btn-sm" onclick="respondLeave('${r.id}','rejected')">❌ رفض</button> </div> </div> </div>`).join(’’):’<div class="empty"><div class="ei">🌴</div><p>لا توجد طلبات معلقة</p></div>’;
}
if(archived){
const statusMap={approved:‘✅ موافق’,rejected:‘❌ مرفوض’};
const colMap={approved:‘var(–green)’,rejected:‘var(–red)’};
archived.innerHTML=done.length?done.map(r=>` <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"> <div><div style="font-size:13px;font-weight:600">${r.ename} — ${r.type} — ${fmtD(r.date)}</div> <div style="font-size:11px;color:var(--t3)">${r.reason||''}</div></div> <span style="font-size:12px;font-weight:700;color:${colMap[r.status]}">${statusMap[r.status]}</span> </div>`).join(’’):’<div class="empty"><div class="ei">📋</div><p>لا توجد طلبات منتهية</p></div>’;
}
}
function respondLeave(id,status){
const leaves=DB.get(‘leaveRequests’)||[];
const i=leaves.findIndex(r=>r.id===id);if(i===-1)return;
leaves[i].status=status;leaves[i].respondedAt=fmtT(new Date());
DB.set(‘leaveRequests’,leaves);
const r=leaves[i];
// إضافة إجازة تلقائياً إذا وافق
if(status===‘approved’){
const emps=DB.get(‘emps’)||[];
const ei=emps.findIndex(e=>e.id===r.eid);
if(ei!==-1){
const per=getPeriod();const lvKey=‘lvM’;
emps[ei][lvKey]=(emps[ei][lvKey]||0)+1;
DB.set(‘emps’,emps);
}
sendTg(`✅ تمت الموافقة على إجازة ${r.ename}\nالتاريخ: ${fmtD(r.date)}`);
} else {
sendTg(`❌ تم رفض طلب إجازة ${r.ename}\nالتاريخ: ${fmtD(r.date)}`);
}
addAdminLog(‘leave_’+status,`${status==='approved'?'موافقة':'رفض'} إجازة ${r.ename}`,{date:r.date});
renderLeaveRequests();renderAdmin();updatePendingBadges();
showToast(status===‘approved’?‘✅ تمت الموافقة’:‘❌ تم الرفض’,‘s’);
}

// ── جدول الغد ──
function renderTomorrowSchedule(){
// تم استبدال جدول الغد بجدول الأسبوع الكامل
try{renderShiftSchedule();renderShiftArchive();}catch(e){}
}

// ── تصدير Excel للحضور ──
function exportAttExcel(){
const att=DB.get(‘att’)||[];
const df=document.getElementById(‘attDate’)?.value||’’;
let data=df?att.filter(a=>a.date===df):att;
data=data.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
let csv=‘الموظف,النوع,التاريخ,الوقت,المسافة (م)\n’;
data.forEach(a=>{
csv+=`${a.ename||''},${a.type==='ci'?'حضور':'انصراف'},${a.date},${a.time},${a.dist||''}\n`;
});
const bom=’\uFEFF’;
const blob=new Blob([bom+csv],{type:‘text/csv;charset=utf-8’});
const url=URL.createObjectURL(blob);
const link=document.createElement(‘a’);link.href=url;
link.download=`حضور-${df||todayStr()}.csv`;link.click();
showToast(‘✅ تم تصدير Excel’,‘s’);
}

// ── تصدير رواتب Excel ──
function exportSalaryExcel(){
const emps=DB.get(‘emps’)||[];
let csv=‘الموظف,الراتب الشهري,الحضور,الإجمالي المكتسب,الحوافز,الخصومات,الصافي\n’;
emps.forEach(e=>{
const c=calcSalary(e);
csv+=`${e.name},${e.sal},${c.daysPresent},${c.earnedSalary},${c.totalBon},${c.totalDed},${c.net}\n`;
});
const bom=’\uFEFF’;
const blob=new Blob([bom+csv],{type:‘text/csv;charset=utf-8’});
const url=URL.createObjectURL(blob);
const link=document.createElement(‘a’);link.href=url;
link.download=`رواتب-${todayStr()}.csv`;link.click();
showToast(‘✅ تم تصدير Excel’,‘s’);
}

// ── إحصائيات المبيعات/الطلبات ──
function addSaleRecord(){
const eid=document.getElementById(‘saleEmpSel’).value;
const platform=document.getElementById(‘salePlatform’).value;
const subscribed=document.getElementById(‘saleSubscribed’).value===‘yes’;
const amount=parseInt(document.getElementById(‘saleAmount’).value)||0;
const note=document.getElementById(‘saleNote’).value.trim();
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===eid);if(!emp)return;
const now=new Date();
const rec={id:genId(),eid,ename:emp.name,platform,subscribed,amount,note,date:todayStr(),time:fmtT(now),ts:now.toISOString()};
const sales=DB.get(‘salesLog’)||[];sales.push(rec);DB.set(‘salesLog’,sales);
closeModal(‘addSaleModal’);
document.getElementById(‘saleNote’).value=’’;
document.getElementById(‘saleAmount’).value=’’;
renderSalesLog();renderSalesToday();
showToast(`✅ تم تسجيل طلب ${platform} — ${emp.name}`,‘s’);
}
function renderSalesToday(){
const c=document.getElementById(‘salesTodaySummary’);if(!c)return;
const lbl=document.getElementById(‘salesTodayLabel’);
const today=todayStr();
if(lbl)lbl.textContent=fmtD(today);
const sales=(DB.get(‘salesLog’)||[]).filter(s=>s.date===today);
const emps=DB.get(‘emps’)||[];
if(!sales.length){c.innerHTML=’<div class="empty" style="padding:16px"><div class="ei">📦</div><p>لا توجد طلبات اليوم</p></div>’;return;}
const byEmp={};
sales.forEach(s=>{
if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,eid:s.eid,total:0,subs:0,subAmt:0,platforms:{},records:[]};
byEmp[s.eid].total++;
if(s.subscribed){byEmp[s.eid].subs++;byEmp[s.eid].subAmt+=(s.amount||0);}
byEmp[s.eid].platforms[s.platform]=(byEmp[s.eid].platforms[s.platform]||0)+1;
byEmp[s.eid].records.push(s);
});
const platColors={‘سفري’:‘rgba(240,192,64,.15)’,‘دلفري’:‘rgba(255,152,0,.15)’,‘واتساب’:‘rgba(0,230,118,.15)’,‘انستقرام’:‘rgba(206,147,216,.15)’,‘فيسبوك’:‘rgba(66,165,245,.15)’,‘حضوري’:‘rgba(0,229,255,.15)’};
const platText={‘سفري’:‘var(–gold)’,‘دلفري’:‘var(–orange)’,‘واتساب’:‘var(–green)’,‘انستقرام’:‘var(–purple)’,‘فيسبوك’:‘var(–blue)’,‘حضوري’:‘var(–cyan)’};
c.innerHTML=`<div style="padding:12px 16px">${Object.values(byEmp).map(e=>`
<div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:14px;margin-bottom:10px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
<div style="font-size:14px;font-weight:800">${e.name}</div>
<div style="display:flex;gap:6px;flex-wrap:wrap">
<span style="background:rgba(0,229,255,.1);color:var(--cyan);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">إجمالي: ${e.total}</span>
<span style="background:rgba(0,230,118,.1);color:var(--green);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">مشتركين: ${e.subs}</span>
${e.subAmt?`<span style="background:rgba(240,192,64,.1);color:var(--gold);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">💰 ${fmtN(e.subAmt)} د.ع</span>`:’’}
</div>
</div>
<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
${Object.entries(e.platforms).map(([p,n])=>`<span style="background:${platColors[p]||'rgba(255,255,255,.05)'};color:${platText[p]||'var(--t1)'};padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700">${p}: ${n}</span>`).join(’’)}
</div>
<div style="border-top:1px solid rgba(255,255,255,.05);padding-top:8px">
${e.records.map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03);flex-wrap:wrap;gap:4px"> <div style="display:flex;align-items:center;gap:8px"> <span style="background:${platColors[r.platform]||'rgba(255,255,255,.05)'};color:${platText[r.platform]||'var(--t1)'};padding:2px 8px;border-radius:5px;font-size:11px">${r.platform}</span> ${r.subscribed?'<span style="color:var(--green);font-size:11px">✅ مشترك</span>':'<span style="color:var(--red);font-size:11px">❌</span>'} ${r.amount?`<span style="color:var(--gold);font-size:11px;font-weight:700">${fmtN(r.amount)} د.ع</span>`:''} ${r.note?`<span style="color:var(--t3);font-size:10px">${r.note}</span>`:''} </div> <div style="display:flex;align-items:center;gap:6px"> <span style="color:var(--t3);font-size:10px">${r.time}</span> <button class="btn btn-sc btn-sm btn-ic" onclick="editSaleRecord('${r.id}')" style="padding:3px 6px;font-size:10px">✏️</button> <button class="btn btn-dn btn-sm btn-ic" onclick="deleteSaleRecord('${r.id}')" style="padding:3px 6px;font-size:10px">🗑️</button> </div> </div>`).join(’’)}
</div>
</div>`).join('')}</div>`;
}
function renderSalesLog(){
const c=document.getElementById(‘salesLogList’);if(!c)return;
let sales=DB.get(‘salesLog’)||[];
const ef=document.getElementById(‘salesEmpFilter’)?.value||’’;
const df=document.getElementById(‘salesDateFilter’)?.value||’’;
if(ef)sales=sales.filter(s=>s.eid===ef);
if(df)sales=sales.filter(s=>s.date===df);
sales.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(!sales.length){c.innerHTML=’<div class="empty" style="padding:20px"><div class="ei">📦</div><p>لا توجد سجلات</p></div>’;return;}
c.innerHTML=`<div class="tw"><table><thead><tr><th>الموظف</th><th>المنصة</th><th>مشترك؟</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th><th>إجراء</th></tr></thead><tbody> ${sales.map(s=>`<tr>
<td><div class="tname"><div class="eav">${(s.ename||’?’)[0]}</div>${s.ename}</div></td>
<td><span style="font-weight:700">${s.platform}</span></td>
<td>${s.subscribed?’<span class="tag tp">✅ نعم</span>’:’<span class="tag ta">❌ لا</span>’}</td>
<td>${s.amount?`<span class="tgld bold">${fmtN(s.amount)} د.ع</span>`:’—’}</td>
<td>${fmtD(s.date)} <span style="color:var(--t3);font-size:10px">${s.time||’’}</span></td>
<td style="color:var(--t3);font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis">${s.note||’—’}</td>
<td><div class="flex g8">
<button class="btn btn-wa btn-sm btn-ic" onclick="editSaleRecord('${s.id}')">✏️</button>
<button class="btn btn-dn btn-sm btn-ic" onclick="deleteSaleRecord('${s.id}')">🗑️</button>
</div></td>

  </tr>`).join('')}
  </tbody></table></div>`;
}
function deleteSaleRecord(id){
  if(!confirm('حذف هذا السجل؟'))return;
  let sales=DB.get('salesLog')||[];
  sales=sales.filter(s=>s.id!==id);
  DB.set('salesLog',sales);
  renderSalesLog();renderSalesToday();
  showToast('🗑️ تم الحذف','i');
}
function editSaleRecord(id){
  const sales=DB.get('salesLog')||[];
  const rec=sales.find(s=>s.id===id);if(!rec)return;
  // فتح موديل التعديل
  document.getElementById('editSaleId').value=id;
  document.getElementById('editSalePlatform').value=rec.platform;
  document.getElementById('editSaleSubscribed').value=rec.subscribed?'yes':'no';
  document.getElementById('editSaleAmount').value=rec.amount||0;
  document.getElementById('editSaleNote').value=rec.note||'';
  document.getElementById('editSaleAmountWrap').style.display=rec.subscribed?'block':'none';
  openModal('editSaleModal');
}
function saveEditSale(){
  const id=document.getElementById('editSaleId').value;
  const sales=DB.get('salesLog')||[];
  const i=sales.findIndex(s=>s.id===id);if(i===-1)return;
  sales[i].platform=document.getElementById('editSalePlatform').value;
  sales[i].subscribed=document.getElementById('editSaleSubscribed').value==='yes';
  sales[i].amount=parseInt(document.getElementById('editSaleAmount').value)||0;
  sales[i].note=document.getElementById('editSaleNote').value.trim();
  DB.set('salesLog',sales);
  closeModal('editSaleModal');
  renderSalesLog();renderSalesToday();
  showToast('✅ تم التعديل','s');
}
function initSaleFilter(){
  const sel=document.getElementById('saleEmpSel');
  const fsel=document.getElementById('salesEmpFilter');
  const emps=DB.get('emps')||[];
  if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  if(fsel&&fsel.options.length<=1)emps.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;fsel.appendChild(o);});
}

// ── الإشعارات الذكية (تذكير قبل الدوام / وقت الانصراف) ──
let _smartAlertLast={};
function checkSmartAlerts(){
if(CU?.role!==‘emp’)return;
const emp=getEmp();if(!emp)return;
const now=new Date();
const h=now.getHours(), mn=now.getMinutes();
const totalMin=h*60+mn;
const sh=SHIFTS[emp.sh];
if(!sh||!sh.s)return;
const [sh_h,sh_m]=sh.s.split(’:’).map(Number);
const [se_h,se_m]=sh.e.split(’:’).map(Number);
const shiftStartMin=sh_h*60+sh_m;
let shiftEndMin=se_h*60+se_m;
if(shiftEndMin<shiftStartMin)shiftEndMin+=24*60; // crosses midnight
const today=todayStr();
// قبل الدوام بساعة
const alertKey1=today+’_pre60’;
if(!_smartAlertLast[alertKey1]&&totalMin===shiftStartMin-60){
_smartAlertLast[alertKey1]=1;
showToast(‘⏰ دوامك بعد ساعة، لا تنسى!’,‘i’);
playNotifSound(‘alert’);
sendBrowserNotif(‘تذكير الدوام’,‘دوامك بعد ساعة، استعد!’);
}
// وقت الدوام الآن
const alertKey2=today+’_start’;
if(!_smartAlertLast[alertKey2]&&totalMin===shiftStartMin){
_smartAlertLast[alertKey2]=1;
showToast(‘🔔 وقت الدوام الآن! سجّل حضورك’,‘i’);
playNotifSound(‘alert’);
sendBrowserNotif(‘وقت الدوام’,‘حان وقت الدوام، سجّل حضورك الآن!’);
}
// قبل نهاية الدوام 30 دقيقة - تنبيه فقط إذا الموظف مسجل حضور ولم ينصرف
const alertKey3=today+’_end30’;
const adjustedEnd=shiftEndMin>shiftStartMin?shiftEndMin:shiftEndMin+24*60;
const totalMinAdj=totalMin<shiftStartMin?totalMin+24*60:totalMin;
if(!_smartAlertLast[alertKey3]&&totalMinAdj===adjustedEnd-30){
_smartAlertLast[alertKey3]=1;
// فحص: هل هو مسجل حضور ولم ينصرف؟
const empAtt2=DB.get(‘att’)||[];
const allCI2=empAtt2.filter(a=>a.eid===emp.id&&a.type===‘ci’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const openCI2=allCI2.find(c=>!empAtt2.find(co2=>co2.eid===emp.id&&co2.type===‘co’&&co2.date===c.date));
if(openCI2){
// تحذير لطيف - مش إجباري
showToast(‘⏰ باقي 30 دقيقة على نهاية شفتك’,‘i’);
sendBrowserNotif(‘نهاية الشفت قريبة’,‘باقي 30 دقيقة - سجّل انصرافك وقتك’);
}
}
// بعد نهاية الدوام 15 دقيقة - تذكير بلطف فقط
const alertKey4=today+’_overdue15’;
if(!_smartAlertLast[alertKey4]&&totalMinAdj===adjustedEnd+15){
_smartAlertLast[alertKey4]=1;
const empAtt3=DB.get(‘att’)||[];
const allCI3=empAtt3.filter(a=>a.eid===emp.id&&a.type===‘ci’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const openCI3=allCI3.find(c=>!empAtt3.find(co3=>co3.eid===emp.id&&co3.type===‘co’&&co3.date===c.date));
if(openCI3){
showToast(‘📌 تجاوزت وقت الشفت — يمكنك تسجيل الانصراف حين تريد’,‘i’);
// لا صوت تحذيري - الموظف قد يكون شغال بظروف
}
}
}

// ── إشعارات المتصفح ──
function requestBrowserNotif(){
if(‘Notification’ in window&&Notification.permission!==‘granted’){
Notification.requestPermission();
}
}
function sendBrowserNotif(title,body){
if(‘Notification’ in window&&Notification.permission===‘granted’){
new Notification(’👑 سندريلا — ’+title,{body,icon:‘data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👑</text></svg>’});
}
}

// ── التقرير الأسبوعي (كل جمعة) ──
function checkWeeklyReport(){
const now=new Date();
if(now.getDay()!==5)return; // الجمعة
const today=todayStr();
const lastWeekly=DB.get(‘lastWeeklyReport’)||’’;
if(lastWeekly===today)return;
DB.set(‘lastWeeklyReport’,today);
buildWeeklyReport();
}
function buildWeeklyReport(){
const emps=DB.get(‘emps’)||[];
const att=DB.get(‘att’)||[];
const now=new Date();
// آخر 7 أيام
const days=[];
for(let i=6;i>=0;i–){const d=new Date(now);d.setDate(d.getDate()-i);days.push(d.toISOString().split(‘T’)[0]);}
let text=`📊 التقرير الأسبوعي — سندريلا\n`;
text+=`الأسبوع: ${fmtD(days[0])} — ${fmtD(days[6])}\n`;
text+=`━━━━━━━━━━━━━━━━━━━━━━\n\n`;
emps.forEach(e=>{
const pres=days.filter(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type===‘ci’));
const c=calcSalary(e);
text+=`👤 ${e.name}\n`;
text+=`  حضور الأسبوع: ${pres.length}/7 أيام\n`;
text+=`  الحوافز: +${fmtN(c.totalBon)} د.ع\n`;
text+=`  الإجمالي حتى الآن: ${fmtN(c.net)} د.ع\n\n`;
});
sendTg(text);
saveReportToArchive(text,‘weekly’);
}

// ══════════════════════════════════════════════════════
//  GROUP CHAT — الدردشة الجماعية
// ══════════════════════════════════════════════════════
function sendChatMsg(){
const inp=document.getElementById(‘empChatInput’);
const text=(inp?.value||’’).trim();
if(!text)return;
const emp=getEmp();if(!emp)return;
const now=new Date();
const msg={id:genId(),uid:emp.id,uname:emp.name,role:‘emp’,text,ts:now.toISOString(),time:fmtT(now),date:todayStr()};
const chat=DB.get(‘groupChat’)||[];chat.push(msg);DB.set(‘groupChat’,chat);
inp.value=’’;
renderEmpChat();renderAdminChat();
playNotifSound(‘msg’);
}
function sendAdminChatMsg(){
const inp=document.getElementById(‘adminChatInput’);
const text=(inp?.value||’’).trim();
if(!text)return;
const now=new Date();
const msg={id:genId(),uid:‘admin’,uname:‘المدير 👑’,role:‘admin’,text,ts:now.toISOString(),time:fmtT(now),date:todayStr()};
const chat=DB.get(‘groupChat’)||[];chat.push(msg);DB.set(‘groupChat’,chat);
inp.value=’’;
renderEmpChat();renderAdminChat();
playNotifSound(‘msg’);
}
function renderEmpChat(){
const c=document.getElementById(‘empChatMessages’);if(!c)return;
const emp=getEmp();
const chat=(DB.get(‘groupChat’)||[]).slice(-100);
if(!chat.length){c.innerHTML=’<div style="text-align:center;color:var(--t3);padding:30px;font-size:12px">لا توجد رسائل بعد. كن أول من يبدأ! 💬</div>’;return;}
c.innerHTML=chat.map(m=>{
const mine=emp&&m.uid===emp.id;
const isAdmin=m.role===‘admin’;
const canDelete=mine;
const av=getEmpAvatar(m.uid,m.uname,32);
const delBtn=canDelete?`<button onclick="deleteChatMsg('${m.id}','emp')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--red);opacity:.6;padding:2px 4px;margin-top:2px" title="حذف">🗑️</button>`:’’;
if(mine){
return `<div class="chat-bubble mine" style="display:flex;flex-direction:column;align-items:flex-end"> <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"> <span class="chat-sender" style="font-size:10px">أنت</span> ${av} </div> <div>${m.text}</div> <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div> </div>`;
}
return `<div class="chat-bubble ${isAdmin?'other admin-bubble':'other'}" style="display:flex;flex-direction:column;align-items:flex-start"> <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"> ${av} <span class="chat-sender ${isAdmin?'admin-s':''}" style="font-size:10px">${m.uname}</span> </div> <div>${m.text}</div> <div class="chat-time">${m.time}</div> </div>`;
}).join(’’);
c.scrollTop=c.scrollHeight;
}
function renderAdminChat(){
const c=document.getElementById(‘adminChatMessages’);if(!c)return;
const chat=(DB.get(‘groupChat’)||[]).slice(-100);
if(!chat.length){c.innerHTML=’<div style="text-align:center;color:var(--t3);padding:30px;font-size:12px">لا توجد رسائل بعد 💬</div>’;return;}
c.innerHTML=chat.map(m=>{
const mine=m.role===‘admin’;
const av=getEmpAvatar(m.uid,m.uname,32);
const delBtn=`<button onclick="deleteChatMsg('${m.id}','admin')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--red);opacity:.6;padding:2px 4px;margin-top:2px" title="حذف">🗑️</button>`;
if(mine){
return `<div class="chat-bubble mine" style="display:flex;flex-direction:column;align-items:flex-end"> <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"> <span class="chat-sender" style="color:var(--gold);font-size:10px">أنت (المدير)</span> <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#1a1200;flex-shrink:0">م</div> </div> <div>${m.text}</div> <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div> </div>`;
}
return `<div class="chat-bubble other" style="display:flex;flex-direction:column;align-items:flex-start"> <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"> ${av} <span class="chat-sender" style="color:var(--cyan);font-size:10px">${m.uname}</span> </div> <div>${m.text}</div> <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div> </div>`;
}).join(’’);
c.scrollTop=c.scrollHeight;
}
// Listen for new chat messages in Firebase
function _startChatListener(){
if(!fbDB||!fbSyncEnabled)return;
if(window._chatListening)return;
window._chatListening=true;
fbDB.ref(‘ccs/groupChat’).on(‘value’,snap=>{
const v=snap.val();if(v===null)return;
localStorage.setItem(‘ccs2_groupChat’,JSON.stringify(v));
renderEmpChat();renderAdminChat();
// Notify on new message
const msgs=Array.isArray(v)?v:Object.values(v);
const last=msgs[msgs.length-1];
if(last&&last.ts&&(Date.now()-new Date(last.ts).getTime())<8000){
if(CU?.role===‘admin’&&last.role!==‘admin’)playNotifSound(‘msg’);
if(CU?.role===‘emp’&&last.uid!==getEmp()?.id)playNotifSound(‘msg’);
}
});
}

// ══════════════════════════════════════════════════════
//  AI BOT — بوت الذكاء الاصطناعي
// ══════════════════════════════════════════════════════
function askBotFromInput(){
const inp=document.getElementById(‘botInput’);
const q=(inp?.value||’’).trim();
if(!q)return;
if(inp)inp.value=’’;
askBot(q);
}
function askBot(question){
const c=document.getElementById(‘botMessages’);if(!c)return;
// Add user message
c.innerHTML+=`<div class="bot-msg user">${question}</div>`;
c.innerHTML+=`<div class="bot-msg thinking" id="botThinking">⏳ جاري التفكير...</div>`;
c.scrollTop=c.scrollHeight;
const answer=getBotAnswer(question);
setTimeout(()=>{
const th=document.getElementById(‘botThinking’);
if(th)th.remove();
c.innerHTML+=`<div class="bot-msg bot">${answer}</div>`;
c.scrollTop=c.scrollHeight;
},600);
}
function getBotAnswer(q){
const emp=getEmp();
if(!emp)return’عذراً، تعذّر الوصول لبياناتك.’;
const c=calcSalary(emp);
const att=DB.get(‘att’)||[];
const sd=shiftDateStr();
// Normalize question - handle typos and variations
const n=q.replace(/[؟?]/g,’’).replace(/\s+/g,’ ’).trim().toLowerCase();
const has=(…words)=>words.some(w=>n.includes(w));

// راتب
if(has(‘راتب’,‘مرتب’,‘أجر’,‘اجر’,‘فلوس’,‘مبلغ’,‘مكتسب’,‘صافي’,‘صالح’)){
if(has(‘يوم’,‘يومي’,‘يوميه’))return `💰 معدل يومك: <strong>${fmtN(c.dailyRate)} د.ع</strong>`;
if(has(‘شهر’,‘شهري’))return `💰 راتبك الشهري: <strong>${fmtN(emp.sal)} د.ع</strong>\nالمكتسب الآن: <strong>${fmtN(c.earnedSalary)} د.ع</strong>`;
return `💰 <strong>راتبك الآن:</strong>\n• الراتب الشهري: ${fmtN(emp.sal)} د.ع\n• المكتسب: ${fmtN(c.earnedSalary)} د.ع\n• الحوافز: +${fmtN(c.totalBon)} د.ع\n• الخصومات: -${fmtN(c.totalDed)} د.ع\n• <strong>الإجمالي: ${fmtN(c.net)} د.ع</strong>`;
}
// حضور
if(has(‘حضور’,‘حضرت’,‘جيت’,‘أيام’,‘ايام’,‘يوم حضر’)){
return `📅 حضرت <strong>${c.daysPresent} يوم</strong> في هذه الفترة (${c.per.label})`;
}
// غياب
if(has(‘غياب’,‘غبت’,‘تغيبت’,‘مو حاضر’,‘ما جيت’,‘غائب’)){
return `❌ أيام الغياب/الخصم: <strong>${c.deductDays} يوم</strong>`;
}
// إجازة
if(has(‘إجازة’,‘اجازة’,‘إجازات’,‘اجازات’,‘عطلة’,‘راحة’,‘بقيلي’)){
const remaining=Math.max(0,2-c.leavesUsed);
return `🌴 الإجازات المستخدمة: ${c.leavesUsed}\nالإجازات المجانية: 2 لكل فترة\nالمتبقية: <strong>${remaining} إجازة</strong>`;
}
// صرف / يوم صرف
if(has(‘صرف’,‘موعد’,‘متى’,‘متى يصرف’,‘يوم دفع’,‘اليوم’)){
return `💸 يوم صرف راتبك: <strong>${c.per.pay.toLocaleDateString('ar-IQ',{weekday:'long',day:'numeric',month:'long'})}</strong>`;
}
// حوافز
if(has(‘حافز’,‘حوافز’,‘مكافأ’,‘مكافآت’,‘بونس’,‘زيادة’)){
return `🎁 حوافزك هذه الفترة: <strong>+${fmtN(c.totalBon)} د.ع</strong>\n• حوافز الشفت: ${fmtN(c.shiftBonTotal)}\n• حوافز المبيعات: ${fmtN(c.salesBonTotal)}\n• حوافز أخرى: ${fmtN(c.otherBonTotal)}`;
}
// خصومات
if(has(‘خصم’,‘خصومات’,‘مخصوم’,‘طرح’)){
return `📉 الخصومات هذه الفترة: <strong>-${fmtN(c.totalDed)} د.ع</strong>`;
}
// شفت
if(has(‘شفت’,‘دوام’,‘وقت’,‘متى يبدأ’,‘يبدأ’,‘وقتي’,‘ساعات’)){
return `⏰ شفتك: <strong>${shiftLabel(emp)}</strong>`;
}
// هل أنا مسجل اليوم
if(has(‘سجلت’,‘مسجل’,‘حضوري اليوم’,‘اليوم’)){
const ci=att.find(a=>a.eid===emp.id&&a.date===sd&&a.type===‘ci’);
const co=att.find(a=>a.eid===emp.id&&a.date===sd&&a.type===‘co’);
if(co)return `✅ سجّلت الحضور الساعة ${ci?.time} وانصرفت الساعة ${co.time}`;
if(ci)return `✅ سجّلت الحضور اليوم الساعة ${ci.time} — لم تسجل الانصراف بعد`;
return `⚪ لم تسجل حضورك بعد اليوم`;
}
// الفترة
if(has(‘فترة’,‘نصف شهر’,‘من لـ’,‘من لغاية’)){
return `📆 الفترة الحالية: <strong>${c.per.label}</strong>\n(${c.per.start.toLocaleDateString('ar-IQ')} — ${c.per.end.toLocaleDateString('ar-IQ')})`;
}
// تحية
if(has(‘مرحبا’,‘هلا’,‘اهلا’,‘هاي’,‘hi’,‘hello’,‘السلام’)){
const h=new Date().getHours();
return `${h<12?'صباح الخير':h<17?'مساء الخير':'ليلة سعيدة'} ${emp.name}! 😊 كيف أساعدك؟`;
}
// default
return `🤖 عذراً، لم أفهم سؤالك تماماً.\nيمكنك سؤالي عن:\n• راتبك ومكتسباتك\n• أيام حضورك وغيابك\n• إجازاتك\n• موعد صرف الراتب\n• حوافزك\n• شفتك`;
}

// ══════════════════════════════════════════════════════
//  MAP — خريطة مواقع الموظفين
// ══════════════════════════════════════════════════════
function refreshMapData(){
const c=document.getElementById(‘empLocationList’);if(!c)return;
const emps=DB.get(‘emps’)||[];
const att=DB.get(‘att’)||[];
const wl=getWorkLoc();
let html=’’;
const colors=[’#f0c040’,’#00e676’,’#00e5ff’,’#ce93d8’,’#ff9800’,’#e94560’,’#42a5f5’];
emps.forEach((e,i)=>{
// آخر سجل له
const empAtt=att.filter(a=>a.eid===e.id&&a.lat!=null).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const last=empAtt[0];
const color=colors[i%colors.length];
const today=shiftDateStr();
const ci=att.find(a=>a.eid===e.id&&a.date===today&&a.type===‘ci’);
const co=att.find(a=>a.eid===e.id&&a.date===today&&a.type===‘co’);
const status=co?‘انصرف’:ci?‘حاضر’:‘غائب’;
const statusCol=co?‘var(–cyan)’:ci?‘var(–green)’:‘var(–red)’;
html+=`<div class="map-emp-card" onclick="showEmpOnMap('${e.id}','${e.name}',${last?.lat||0},${last?.lng||0},'${color}')"> <div class="map-emp-dot" style="background:${color};box-shadow:0 0 8px ${color}"></div> <div style="flex:1"> <div style="font-size:13px;font-weight:700">${e.name}</div> <div style="font-size:11px;color:var(--t3);margin-top:2px"> ${last?`آخر موقع: ${fmtD(last.date)} — ${last.time} | ${last.dist||’?’} م من العمل`:'لا يوجد موقع مسجل'} </div> </div> <span style="font-size:11px;font-weight:700;color:${statusCol}">${status}</span> </div>`;
});
c.innerHTML=html||’<div class="empty"><div class="ei">📍</div><p>لا توجد بيانات موقع</p></div>’;
}
function showEmpOnMap(eid,name,lat,lng,color){
const con=document.getElementById(‘adminMapContainer’);if(!con)return;
if(!lat||!lng){showToast(‘لا يوجد موقع مسجل لهذا الموظف’,‘e’);return;}
const wl=getWorkLoc();
// Use OpenStreetMap via iframe
const url=`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;
con.innerHTML=` <div style="position:relative"> <iframe src="${url}" style="width:100%;height:380px;border:none;border-radius:12px" loading="lazy"></iframe> <div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.8);border-radius:8px;padding:8px 12px;font-size:12px"> <div style="font-weight:700;color:${color}">${name}</div> <div style="color:#9095b8;margin-top:2px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div> <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" style="color:var(--cyan);font-size:11px;display:block;margin-top:4px">📍 فتح في خرائط جوجل</a> </div> </div> <div style="padding:10px;font-size:12px;color:var(--t2);text-align:center"> موقع العمل: <a href="https://maps.google.com/?q=${wl.lat},${wl.lng}" target="_blank" style="color:var(--gold)">📍 ${wl.lat.toFixed(4)}, ${wl.lng.toFixed(4)}</a> </div>`;
}

// ══════════════════════════════════════════════════════
//  ADVANCED REPORTS — تقارير متقدمة
// ══════════════════════════════════════════════════════
let _advCharts={};
function renderAdvReports(){
const days=parseInt(document.getElementById(‘advRepPeriod’)?.value||‘7’);
const emps=DB.get(‘emps’)||[];
const att=DB.get(‘att’)||[];
const now=new Date();
// Build date range
const dates=[];
for(let i=days-1;i>=0;i–){const d=new Date(now);d.setDate(d.getDate()-i);dates.push(d.toISOString().split(‘T’)[0]);}
const labels=dates.map(d=>new Date(d+‘T12:00:00’).toLocaleDateString(‘ar-IQ’,{day:‘numeric’,month:‘short’}));
const chartDefaults={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:’#9095b8’,font:{family:‘Cairo’,size:11}}}},scales:{y:{ticks:{color:’#5a6080’},grid:{color:‘rgba(255,255,255,.05)’}},x:{ticks:{color:’#9095b8’},grid:{display:false}}}};

// 1. Attendance trend
const attData=dates.map(d=>new Set(att.filter(a=>a.date===d&&a.type===‘ci’).map(a=>a.eid)).size);
_buildChart(‘attTrendChart’,‘line’,labels,[{label:‘عدد الحاضرين’,data:attData,borderColor:‘rgba(0,229,255,.9)’,backgroundColor:‘rgba(0,229,255,.15)’,borderWidth:2,fill:true,tension:0.4}],chartDefaults);

// 2. Salary + bonus per employee
const salLabels=emps.map(e=>e.name.split(’ ’)[0]);
const salData=emps.map(e=>calcSalary(e).earnedSalary);
const bonData=emps.map(e=>calcSalary(e).totalBon);
_buildChart(‘salDistChart’,‘bar’,salLabels,[
{label:‘الراتب المكتسب’,data:salData,backgroundColor:‘rgba(240,192,64,.5)’,borderColor:‘rgba(240,192,64,.9)’,borderWidth:2,borderRadius:6},
{label:‘الحوافز’,data:bonData,backgroundColor:‘rgba(0,230,118,.4)’,borderColor:‘rgba(0,230,118,.8)’,borderWidth:2,borderRadius:6}
],chartDefaults);

// 3. Per employee attendance % in period
const attPctData=emps.map(e=>{
const pDays=dates.filter(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type===‘ci’)).length;
return Math.round(pDays/days*100);
});
_buildChart(‘empAttChart’,‘bar’,salLabels,[{label:‘نسبة الحضور %’,data:attPctData,backgroundColor:attPctData.map(v=>v>=80?‘rgba(0,230,118,.5)’:v>=50?‘rgba(255,152,0,.5)’:‘rgba(233,69,96,.5)’),borderWidth:2,borderRadius:6}],{…chartDefaults,scales:{…chartDefaults.scales,y:{…chartDefaults.scales.y,max:100}}});

// 4. Bonus types pie
const allBon={shift:0,sales100:0,sales200:0,custom:0};
const per=getPeriod();
const ps=per.start.toISOString().split(‘T’)[0], pe=per.end.toISOString().split(‘T’)[0];
emps.forEach(e=>(e.bon||[]).filter(b=>b.date>=ps&&b.date<=pe).forEach(b=>{if(allBon[b.type]!==undefined)allBon[b.type]+=b.amount;else allBon.custom+=b.amount;}));
_buildChart(‘bonDistChart’,‘doughnut’,[‘شفت كامل’,‘100 قطعة’,‘200 قطعة’,‘مخصص’],[{data:Object.values(allBon),backgroundColor:[‘rgba(240,192,64,.6)’,‘rgba(0,229,255,.6)’,‘rgba(0,230,118,.6)’,‘rgba(206,147,216,.6)’],borderColor:[‘rgba(240,192,64,.9)’,‘rgba(0,229,255,.9)’,‘rgba(0,230,118,.9)’,‘rgba(206,147,216,.9)’],borderWidth:2}],{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:’#9095b8’,font:{family:‘Cairo’,size:11}}}}});
}
function _buildChart(id,type,labels,datasets,opts){
const canvas=document.getElementById(id);if(!canvas)return;
if(_advCharts[id]){_advCharts[id].destroy();}
_advCharts[id]=new Chart(canvas.getContext(‘2d’),{type,data:{labels,datasets},options:opts});
}
function exportAdvReportExcel(){
const days=parseInt(document.getElementById(‘advRepPeriod’)?.value||‘7’);
const emps=DB.get(‘emps’)||[];
const att=DB.get(‘att’)||[];
const now=new Date();
const dates=[];
for(let i=days-1;i>=0;i–){const d=new Date(now);d.setDate(d.getDate()-i);dates.push(d.toISOString().split(‘T’)[0]);}
let csv=‘الموظف,’;
csv+=dates.join(’,’)+’,الإجمالي\n’;
emps.forEach(e=>{
const row=dates.map(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type===‘ci’)?‘✓’:‘✗’);
const total=row.filter(r=>r===‘✓’).length;
csv+=`${e.name},${row.join(',')},${total}\n`;
});
const bom=’\uFEFF’;
const blob=new Blob([bom+csv],{type:‘text/csv;charset=utf-8’});
const url=URL.createObjectURL(blob);
const link=document.createElement(‘a’);link.href=url;link.download=`تقرير-متقدم-${todayStr()}.csv`;link.click();
showToast(‘✅ تم تصدير Excel’,‘s’);
}

// ══════════════════════════════════════════════════════
//  AUTO CLOUD BACKUP — نسخة احتياطية تلقائية
// ══════════════════════════════════════════════════════
function doAutoCloudBackup(){
if(!fbDB||!fbSyncEnabled){
// Fallback: export JSON locally
exportData();
return;
}
const backupKey=‘backup_’+todayStr();
const allData={};
SYNC_KEYS.forEach(k=>{const v=DB.get(k);if(v!==null)allData[k]=v;});
allData.backedUpAt=new Date().toISOString();
fbDB.ref(‘ccs_backups/’+backupKey).set(allData)
.then(()=>{
DB.set(‘lastCloudBackup’,new Date().toISOString());
showToast(‘☁️ نسخة احتياطية للسحابة — 4 صباحاً’,‘s’);
})
.catch(e=>console.error(‘Backup err:’,e));
}

function startTimers(){
startClock();
// فحص كل دقيقة للمهام المجدولة
const t=setInterval(()=>{
const now=new Date();
const h=now.getHours(), mn=now.getMinutes(), sec=now.getSeconds();
if(sec!==0)return;
// تقرير يومي 4:00 صباحاً
if(h===4&&mn===0){
const key=‘rep_’+todayStr();
if(!DB.get(key)){DB.set(key,1);const txt=buildReportText(‘auto’);sendTg(txt);saveReportToArchive(txt,‘auto’);showToast(‘📤 تم إرسال التقرير اليومي’,‘i’);}
}
// استفسار 3:00 صباحاً
if(h===3&&mn===0){
const key=‘prompt_’+todayStr();
if(!DB.get(key)){DB.set(key,1);open3amPromptAuto();}
}
// نسخ احتياطية للسحابة 2:00 صباحاً
if(h===2&&mn===0){
const key=‘bk_’+todayStr();
if(!DB.get(key)){DB.set(key,1);doAutoCloudBackup();}
}
// التقرير الأسبوعي جمعة 6:00 ص
if(h===6&&mn===0&&now.getDay()===5){
const key=‘wkrp_’+todayStr();
if(!DB.get(key)){DB.set(key,1);buildWeeklyReport();}
}
},1000);
autoTimers.push(t);
}

// renderAdmin patching removed - new renders integrated directly

// Override renderAdminAtt to include delete button
const _origRenderAdminAtt=renderAdminAtt;
function renderAdminAtt(){
const tb=document.getElementById(‘adminAttTable’);if(!tb)return;
const q=(document.getElementById(‘attSearch’)?.value||’’).toLowerCase();
const df=document.getElementById(‘attDate’)?.value||’’;
let att=DB.get(‘att’)||[];
if(q)att=att.filter(a=>(a.ename||’’).toLowerCase().includes(q));
if(df)att=att.filter(a=>a.date===df);
att.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
// تلوين الانصرافات المبكرة (أقل من 4 ساعات)
tb.innerHTML=att.length?att.map(a=>{
const isCI=a.type===‘ci’;
const isEarlyOut=!isCI&&a.durMins&&a.durMins<240;
return `<tr ${isEarlyOut?'style="background:rgba(233,69,96,.04)"':''}> <td><div class="tname"><div class="eav">${(a.ename||'?')[0]}</div><span style="font-weight:600">${a.ename||'؟'}</span></div></td> <td>${isCI?'<span class="tag tp">✅ حضور</span>':isEarlyOut?'<span class="tag ta">🚪 انصراف مبكر</span>':'<span class="tag tc">🚪 انصراف</span>'}</td> <td>${fmtD(a.date)}</td> <td class="bold">${a.time}</td> <td><span class="tgrn bold">${a.dist!=null?a.dist+' م':'—'}</span></td> <td>${!isCI&&a.durMins?`<span style="color:${a.durMins<240?'var(--red)':'var(--green)'};font-size:11px;font-weight:700">${Math.floor(a.durMins/60)}س ${a.durMins%60}د</span>`:'—'}</td> <td><button class="btn btn-dn btn-sm btn-ic" onclick="adminDeleteAtt('${a.id}')" title="حذف البصمة">🗑️</button></td> </tr>`;
}).join(’’):`<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--t3)">لا توجد سجلات</td></tr>`;
}

// logging integrated directly in saveSal, addBonD, addDedD, deleteEmp above

// ══════════════════════════════════════════════════════
//  SUB-ADMIN SYSTEM — نظام المديرين الفرعيين
// ══════════════════════════════════════════════════════

const ALL_PERMS=[‘view_overview’,‘view_emp’,‘manage_emp’,‘att’,‘salary’,‘incentives’,‘deductions’,‘shifts’,‘reports’,‘leave’,‘messages’,‘sales’,‘logs’,‘settings’];
const PERM_LABELS={
view_overview:‘نظرة عامة’,view_emp:‘عرض الموظفين’,manage_emp:‘إدارة الموظفين’,
att:‘سجل الحضور’,salary:‘الرواتب’,incentives:‘الحوافز’,deductions:‘الخصومات’,
shifts:‘الشفتات’,reports:‘التقارير’,leave:‘طلبات الإجازة’,
messages:‘الرسائل’,sales:‘المبيعات’,logs:‘سجل العمليات’,settings:‘الإعدادات’
};

// Tab → permission mapping
const TAB_PERM={
ov:‘view_overview’,emp:‘view_emp’,att:‘att’,sal:‘salary’,
inc:‘incentives’,sh:‘shifts’,rate:‘view_emp’,leave:‘leave’,
arch:‘reports’,rep:‘reports’,msg:‘messages’,logs:‘logs’,
sales:‘sales’,map:‘view_emp’,groupchat:‘messages’,advrep:‘reports’,cfg:‘settings’
};

let SA_MODE=false; // currently logged in as sub-admin
let CU_PERMS=null; // active sub-admin permissions (null = all)

function getSubAdmins(){return DB.get(‘subAdmins’)||[];}

function openAddSubAdmin(){
document.getElementById(‘subAdminEditId’).value=’’;
document.getElementById(‘subAdminModalTitle’).textContent=‘➕ إضافة مدير فرعي’;
[‘saName’,‘saUser’,‘saPass’].forEach(id=>document.getElementById(id).value=’’);
document.getElementById(‘saRole’).value=‘manager’;
ALL_PERMS.forEach(p=>{const el=document.getElementById(‘perm_’+p);if(el)el.checked=false;});
openModal(‘subAdminModal’);
}

function openEditSubAdmin(id){
const admins=getSubAdmins();
const sa=admins.find(a=>a.id===id);if(!sa)return;
document.getElementById(‘subAdminEditId’).value=id;
document.getElementById(‘subAdminModalTitle’).textContent=‘✏️ تعديل مدير فرعي’;
document.getElementById(‘saName’).value=sa.name;
document.getElementById(‘saUser’).value=sa.u;
document.getElementById(‘saPass’).value=sa.pw;
document.getElementById(‘saRole’).value=sa.role||‘manager’;
ALL_PERMS.forEach(p=>{const el=document.getElementById(‘perm_’+p);if(el)el.checked=(sa.perms||[]).includes(p);});
openModal(‘subAdminModal’);
}

function selectAllPerms(val){
ALL_PERMS.forEach(p=>{const el=document.getElementById(‘perm_’+p);if(el)el.checked=val;});
}

function saveSubAdmin(){
const name=document.getElementById(‘saName’).value.trim();
const u=document.getElementById(‘saUser’).value.trim();
const pw=document.getElementById(‘saPass’).value.trim();
const role=document.getElementById(‘saRole’).value;
if(!name||!u||!pw){showToast(‘يرجى ملء الحقول المطلوبة’,‘e’);return;}
const perms=ALL_PERMS.filter(p=>{const el=document.getElementById(‘perm_’+p);return el&&el.checked;});
const admins=getSubAdmins();
const editId=document.getElementById(‘subAdminEditId’).value;
if(editId){
const i=admins.findIndex(a=>a.id===editId);
if(i!==-1){admins[i]={…admins[i],name,u,pw,role,perms};}
showToast(‘✅ تم تعديل المدير الفرعي’,‘s’);
} else {
if(admins.find(a=>a.u===u)){showToast(‘اليوزر مستخدم مسبقاً’,‘e’);return;}
admins.push({id:genId(),name,u,pw,role,perms,jd:todayStr()});
showToast(`✅ تم إضافة ${name} كمدير فرعي`,‘s’);
}
DB.set(‘subAdmins’,admins);
closeModal(‘subAdminModal’);
renderSubAdminList();
}

function deleteSubAdmin(id){
if(!confirm(‘حذف هذا المدير الفرعي؟’))return;
const admins=getSubAdmins().filter(a=>a.id!==id);
DB.set(‘subAdmins’,admins);
renderSubAdminList();
showToast(‘تم الحذف’,‘i’);
}

function renderSubAdminList(){
const c=document.getElementById(‘subAdminList’);if(!c)return;
const admins=getSubAdmins();
if(!admins.length){
c.innerHTML=’<div class="empty"><div class="ei">👑</div><p>لا يوجد مديرون فرعيون<br><small>أضف مديراً فرعياً لتحديد صلاحياته</small></p></div>’;
return;
}
const roleNames={manager:‘مدير فرعي’,assistant:‘مساعد مدير’,supervisor:‘مشرف’};
const roleColors={manager:‘var(–gold)’,assistant:‘var(–cyan)’,supervisor:‘var(–purple)’};
c.innerHTML=admins.map(sa=>` <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px 14px;margin-bottom:10px"> <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px"> <div style="display:flex;align-items:center;gap:10px"> <div style="width:36px;height:36px;border-radius:10px;background:rgba(206,147,216,.15);border:1px solid rgba(206,147,216,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--purple)">${sa.name[0]}</div> <div> <div style="font-size:13px;font-weight:700">${sa.name}</div> <div style="font-size:11px;color:var(--t3)">@${sa.u} · <span style="color:${roleColors[sa.role]||'var(--t2)'}">${roleNames[sa.role]||sa.role}</span></div> </div> </div> <div style="display:flex;gap:6px"> <button class="btn btn-sc btn-sm" onclick="openEditSubAdmin('${sa.id}')">✏️ تعديل</button> <button class="btn btn-dn btn-sm" onclick="deleteSubAdmin('${sa.id}')">🗑️</button> </div> </div> <div style="display:flex;flex-wrap:wrap;gap:4px"> ${(sa.perms||[]).map(p=>`<span style="background:rgba(206,147,216,.1);color:var(--purple);border:1px solid rgba(206,147,216,.2);border-radius:6px;padding:2px 8px;font-size:10px">${PERM_LABELS[p]||p}</span>`).join('')} ${!(sa.perms||[]).length?'<span style="color:var(--t3);font-size:11px">لا توجد صلاحيات</span>':''} </div> </div>`).join(’’);
}

// Check if current sub-admin has a specific permission
function hasPerm(perm){
if(!SA_MODE||!CU_PERMS)return true; // main admin has all
return CU_PERMS.includes(perm);
}

// Hide sidebar/mobile-nav items based on permissions
function applySubAdminPermissions(){
if(!SA_MODE)return;
// Hide sidebar items
document.querySelectorAll(’#adminScreen .sitem’).forEach(item=>{
const onclick=item.getAttribute(‘onclick’)||’’;
const match=onclick.match(/showATab(’(\w+)’/);
if(match){
const tab=match[1];
const perm=TAB_PERM[tab];
if(perm&&!hasPerm(perm)){item.style.display=‘none’;}
}
});
// Hide mobile nav items
document.querySelectorAll(’#adminScreen .mnav-item’).forEach(item=>{
const onclick=item.getAttribute(‘onclick’)||’’;
const match=onclick.match(/showATab(’(\w+)’/);
if(match){
const tab=match[1];
const perm=TAB_PERM[tab];
if(perm&&!hasPerm(perm)){item.style.display=‘none’;}
}
});
// Hide add employee button if no manage_emp perm
if(!hasPerm(‘manage_emp’)){
document.querySelectorAll(’[onclick*=“openAddEmp”]’).forEach(el=>el.style.display=‘none’);
document.querySelectorAll(’[onclick*=“qDel”]’).forEach(el=>el.style.display=‘none’);
document.querySelectorAll(’[onclick*=“openDetail”]’).forEach(el=>{
// hide delete inside detail too
});
}
// Change topbar to show sub-admin info
const uname=document.querySelector(’#adminScreen .uname’);
const urole=document.querySelector(’#adminScreen .urole’);
if(uname&&CU?.saName)uname.textContent=CU.saName;
if(urole&&CU?.saRole){
const roleNames={manager:‘مدير فرعي’,assistant:‘مساعد مدير’,supervisor:‘مشرف’};
urole.textContent=roleNames[CU.saRole]||CU.saRole;
urole.style.color=‘var(–purple)’;
}
}

// ══════════════════════════════════════════════════════
//  END SUB-ADMIN SYSTEM
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  LOAN / سلفة SYSTEM
// ══════════════════════════════════════════════════════

// ── السلفة المخصصة ──
function selectLoanCustom(amt){
document.querySelectorAll(’.loan-opt’).forEach(e=>e.classList.remove(‘selected’));
const inp=document.getElementById(‘loanAmt’);
if(inp)inp.value=amt;
const lbl=document.getElementById(‘loanSelectedLabel’);
if(lbl)lbl.textContent=amt>=1000?‘✅ مبلغ مخصص: ‘+fmtN(amt)+’ د.ع’:’’;
}

function selectLoan(el,amt){
document.querySelectorAll(’.loan-opt’).forEach(e=>e.classList.remove(‘selected’));
el.classList.add(‘selected’);
const inp=document.getElementById(‘loanAmt’);
if(inp)inp.value=amt;
const cinp=document.getElementById(‘loanCustomInput’);
if(cinp)cinp.value=’’;
const lbl=document.getElementById(‘loanSelectedLabel’);
if(lbl)lbl.textContent=‘✅ اخترت: ‘+fmtN(amt)+’ د.ع’;
}

function submitLoanRequest(){
const emp=getEmp(); if(!emp){showToast(‘خطأ: لم يتم تحديد الموظف’,‘e’);return;}
const amtEl=document.getElementById(‘loanAmt’);
const amt=parseInt(amtEl?.value)||0;
const reasonEl=document.getElementById(‘loanReason’);
const reason=(reasonEl?.value||’’).trim();
if(!amt||amt<5000){showToast(‘اختر المبلغ أولاً’,‘e’);return;}
if(!reason){showToast(‘اكتب سبب طلب السلفة’,‘e’);return;}
const loans=DB.get(‘loanRequests’)||[];
const pending=loans.find(l=>l.eid===emp.id&&l.status===‘pending’);
if(pending){showToast(‘لديك طلب سلفة قيد الانتظار بالفعل’,‘e’);return;}
const newLoan={
id:genId(), eid:emp.id, ename:emp.name,
amount:amt, reason, status:‘pending’,
date:todayStr(), time:fmtT(new Date()), ts:new Date().toISOString()
};
loans.push(newLoan);
DB.set(‘loanRequests’,loans);
// clear form
if(amtEl)amtEl.value=’’;
if(reasonEl)reasonEl.value=’’;
document.querySelectorAll(’.loan-opt’).forEach(e=>e.classList.remove(‘selected’));
const lbl=document.getElementById(‘loanSelectedLabel’);
if(lbl)lbl.textContent=’’;
renderEmpLoanHistory();
sendTg(`💳 طلب سلفة جديد\n👤 ${emp.name}\n💰 ${fmtN(amt)} د.ع\n📝 ${reason}`);
playNotifSound(‘msg’);
showToast(‘✅ تم إرسال الطلب — بانتظار موافقة المدير’,‘s’);
}

function renderEmpLoanHistory(){
const c=document.getElementById(‘empLoanHistory’); if(!c)return;
const emp=getEmp(); if(!emp){c.innerHTML=’’;return;}
const loans=(DB.get(‘loanRequests’)||[]).filter(l=>l.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(!loans.length){c.innerHTML=’<div class="empty"><div class="ei">💳</div><p>لا توجد طلبات سلفة</p></div>’;return;}
const stMap={pending:{t:‘⏳ بانتظار الموافقة’,col:‘var(–gold)’},approved:{t:‘✅ تمت الموافقة’,col:‘var(–green)’},rejected:{t:‘❌ مرفوض’,col:‘var(–red)’},deducted:{t:‘💰 مخصوم من الراتب’,col:‘var(–cyan)’}};
c.innerHTML=loans.map(l=>{
const s=stMap[l.status]||stMap.pending;
return `<div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px 14px;margin-bottom:10px"> <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"> <div style="font-size:14px;font-weight:800;color:var(--gold)">${fmtN(l.amount)} د.ع</div> <span style="font-size:11px;font-weight:700;color:${s.col}">${s.t}</span> </div> <div style="font-size:12px;color:var(--t2);margin-top:4px">${l.reason}</div> <div style="font-size:10px;color:var(--t3);margin-top:4px">${fmtD(l.date)} — ${l.time}</div> ${l.status==='rejected'&&l.rejectReason?`<div style="font-size:11px;color:var(--red);margin-top:4px">سبب الرفض: ${l.rejectReason}</div>`:''} </div>`;
}).join(’’);
}

function renderAdminLoans(){
const pending=document.getElementById(‘loanPendingList’);
const archived=document.getElementById(‘loanArchivedList’);
const badge=document.getElementById(‘loanPendingCount’);
const loans=DB.get(‘loanRequests’)||[];
const pList=loans.filter(l=>l.status===‘pending’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
const aList=loans.filter(l=>l.status!==‘pending’).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
if(badge)badge.textContent=pList.length;
if(pending){
pending.innerHTML=pList.length?pList.map(l=>` <div style="background:var(--bg3);border:1px solid rgba(255,152,0,.25);border-radius:12px;padding:14px;margin-bottom:10px"> <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"> <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,152,0,.15);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--orange)">${l.ename[0]}</div> <div> <div style="font-size:13px;font-weight:700">${l.ename}</div> <div style="font-size:11px;color:var(--t3)">${fmtD(l.date)} — ${l.time}</div> </div> <div style="margin-right:auto;font-size:16px;font-weight:900;color:var(--gold)">${fmtN(l.amount)} د.ع</div> </div> <div style="font-size:12px;color:var(--t2);margin-bottom:10px">📝 ${l.reason}</div> <div style="display:flex;gap:8px;flex-wrap:wrap"> <button class="btn btn-ok btn-sm" onclick="approveLoan('${l.id}')">✅ موافقة وخصم من الراتب</button> <button class="btn btn-dn btn-sm" onclick="rejectLoan('${l.id}')">❌ رفض</button> </div> </div>`).join(’’):’<div class="empty"><div class="ei">💳</div><p>لا توجد طلبات معلقة</p></div>’;
}
if(archived){
const stMap={approved:‘✅’,rejected:‘❌’,deducted:‘💰’};
archived.innerHTML=aList.length?aList.map(l=>` <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;gap:6px"> <div> <div style="font-size:12px;font-weight:700">${stMap[l.status]||''} ${l.ename} — ${fmtN(l.amount)} د.ع</div> <div style="font-size:10px;color:var(--t3)">${l.reason} | ${fmtD(l.date)}</div> </div> <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:var(--bg2);color:var(--t2)">${l.status==='approved'?'موافق':l.status==='rejected'?'مرفوض':'مخصوم'}</span> </div>`).join(’’):’<div class="empty"><div class="ei">📋</div><p>لا توجد طلبات سابقة</p></div>’;
}
}

function approveLoan(id){
const loans=DB.get(‘loanRequests’)||[];
const i=loans.findIndex(l=>l.id===id); if(i===-1)return;
const loan=loans[i];
// خصم السلفة من راتب الموظف
const emps=DB.get(‘emps’)||[];
const ei=emps.findIndex(e=>e.id===loan.eid);
if(ei!==-1){
if(!emps[ei].ded)emps[ei].ded=[];
emps[ei].ded.push({amount:loan.amount,reason:`سلفة — ${loan.reason}`,date:todayStr(),isLoan:true,loanId:id});
DB.set(‘emps’,emps);
}
loans[i].status=‘deducted’;
loans[i].approvedAt=new Date().toISOString();
DB.set(‘loanRequests’,loans);
addAdminLog(‘loan_approve’,`موافقة سلفة: ${loan.ename} — ${fmtN(loan.amount)} د.ع`,{eid:loan.eid,amount:loan.amount});
sendTg(`✅ موافقة سلفة\n👤 ${loan.ename}\n💰 ${fmtN(loan.amount)} د.ع\n📌 ستُخصم من الراتب`);
renderAdminLoans(); renderAdmin(); updatePendingBadges();
showToast(`✅ تمت الموافقة — خُصمت ${fmtN(loan.amount)} د.ع من راتب ${loan.ename}`,‘s’);
}

function rejectLoan(id){
const reason=prompt(‘سبب الرفض (اختياري):’);
if(reason===null)return; // cancelled
const loans=DB.get(‘loanRequests’)||[];
const i=loans.findIndex(l=>l.id===id); if(i===-1)return;
loans[i].status=‘rejected’;
loans[i].rejectReason=reason||’’;
loans[i].rejectedAt=new Date().toISOString();
DB.set(‘loanRequests’,loans);
sendTg(`❌ رفض سلفة\n👤 ${loans[i].ename}\n💰 ${fmtN(loans[i].amount)} د.ع${reason?'\n📝 '+reason:''}`);
renderAdminLoans(); updatePendingBadges();
showToast(‘تم الرفض’,‘i’);
}

// ══════════════════════════════════════════════════════
//  USERNAME EDIT — تعديل اليوزر
// ══════════════════════════════════════════════════════

function saveEmpUser(){
const v=document.getElementById(‘eUserInp’)?.value.trim();
if(!v){showToast(‘أدخل اليوزر الجديد’,‘e’);return;}
const emps=DB.get(‘emps’)||[];
const conflict=emps.find(e=>e.u===v&&e.id!==DID);
if(conflict){showToast(‘اليوزر مستخدم من موظف آخر’,‘e’);return;}
const i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
const oldUser=emps[i].u;
emps[i].u=v;
DB.set(‘emps’,emps);
addAdminLog(‘user_edit’,`تعديل يوزر: ${emps[i].name} — ${oldUser} → ${v}`,{empId:DID});
openDetail(DID);
showToast(`✅ تم تغيير اليوزر إلى: ${v}`,‘s’);
}

// username field now populated directly in openDetail above

// ══════════════════════════════════════════════
//  جدول الأسبوع التفاعلي — تعديل شفت يومي
// ══════════════════════════════════════════════

// حفظ شفتات يومية مخصصة: {empId_dateStr: shiftKey}
function getDailyShifts(){return DB.get(‘dailyShifts’)||{};}
function saveDailyShift(empId,dateStr,sh,customFrom,customTo){
const ds=getDailyShifts();
ds[empId+’*’+dateStr]={sh,customFrom:customFrom||’’,customTo:customTo||’’};
DB.set(‘dailyShifts’,ds);
}
function getEmpShiftForDay(emp,dateStr){
const ds=getDailyShifts();
const k=emp.id+’*’+dateStr;
if(ds[k])return ds[k];
return{sh:emp.sh,customFrom:emp.customFrom||’’,customTo:emp.customTo||’’};
}

function renderShiftSchedule(){
const c=document.getElementById(‘shiftScheduleGrid’); if(!c)return;
const offset=parseInt(document.getElementById(‘shWeekOffset’)?.value||‘0’);
const emps=DB.get(‘emps’)||[];
const days=[];
for(let i=0;i<7;i++){
const d=new Date(); d.setDate(d.getDate()+offset+i);
days.push(d);
}
const dayNames=[‘أحد’,‘إثنين’,‘ثلاثاء’,‘أربعاء’,‘خميس’,‘جمعة’,‘سبت’];
const todayStr2=todayStr();
let html=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"> <thead><tr> <th style="text-align:right;padding:8px 10px;color:var(--t3);border-bottom:1px solid var(--br);white-space:nowrap;min-width:90px">الموظف</th> ${days.map(d=>{ const ds=d.toISOString().split('T')[0]; const isToday=ds===todayStr2; return `<th style="text-align:center;padding:8px 6px;border-bottom:1px solid var(--br);white-space:nowrap;min-width:110px;${isToday?'background:rgba(0,229,255,.06)':''}">
<div style="font-size:10px;color:${isToday?'var(--cyan)':'var(--t3)'};">${dayNames[d.getDay()]}</div>
<div style="font-weight:800;color:${isToday?'var(--cyan)':'var(--t1)'}">${d.getDate()}/${d.getMonth()+1}</div>
${isToday?’<div style="font-size:9px;color:var(--cyan)">اليوم</div>’:’’}
</th>`; }).join('')} </tr></thead> <tbody> ${emps.map(e=>`<tr>
<td style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.04)">
<div style="display:flex;align-items:center;gap:6px">
<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#1a1200;flex-shrink:0">${e.name[0]}</div>
<span style="font-weight:600;font-size:11px;white-space:nowrap">${e.name}</span>
</div>
</td>
${days.map(d=>{
const ds=d.toISOString().split(‘T’)[0];
const isToday=ds===todayStr2;
const dayShift=getEmpShiftForDay(e,ds);
const sh=SHIFTS[dayShift.sh]||{};
const from=dayShift.sh===‘custom’?(dayShift.customFrom||’–’):(sh.s||’–’);
const to=dayShift.sh===‘custom’?(dayShift.customTo||’–’):(sh.e||’–’);
const shName=dayShift.sh===‘custom’?‘مخصص’:sh.name||dayShift.sh;
return `<td style="text-align:center;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.04);${isToday?'background:rgba(0,229,255,.04)':''}"> <div style="background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.18);border-radius:8px;padding:5px 3px;cursor:pointer;transition:.15s" onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')" title="اضغط لتعديل الشفت"> <div style="font-size:9px;font-weight:700;color:var(--gold)">${shName}</div> <div style="font-size:9px;color:var(--green)">${from}</div> <div style="font-size:9px;color:var(--cyan)">${to}</div> <div style="font-size:8px;color:var(--t3);margin-top:2px">✏️ تعديل</div> </div> </td>`;
}).join(’’)}
</tr>`).join('')} </tbody></table></div>`;
c.innerHTML=html;
}

// فتح موديل تعديل شفت يوم محدد
let _editDayEmpId=’’,_editDayDate=’’;
function openDayShiftEdit(empId,empName,dateStr){
_editDayEmpId=empId; _editDayDate=dateStr;
const emp=(DB.get(‘emps’)||[]).find(e=>e.id===empId);
const cur=getEmpShiftForDay({id:empId,sh:emp?.sh||’’,customFrom:emp?.customFrom||’’,customTo:emp?.customTo||’’},dateStr);
document.getElementById(‘dseTitle’).textContent=`✏️ ${empName} — ${fmtD(dateStr)}`;
document.getElementById(‘dseShift’).value=cur.sh;
document.getElementById(‘dseCustomWrap’).style.display=cur.sh===‘custom’?‘flex’:‘none’;
document.getElementById(‘dseFrom’).value=cur.customFrom||’’;
document.getElementById(‘dseTo’).value=cur.customTo||’’;
openModal(‘dayShiftEditModal’);
}
function saveDayShiftEdit(){
const sh=document.getElementById(‘dseShift’).value;
const from=document.getElementById(‘dseFrom’).value;
const to=document.getElementById(‘dseTo’).value;
saveDailyShift(_editDayEmpId,_editDayDate,sh,from,to);
closeModal(‘dayShiftEditModal’);
renderShiftSchedule();
// أشعر الموظف
const emp=(DB.get(‘emps’)||[]).find(e=>e.id===_editDayEmpId);
if(emp){
const shName=sh===‘custom’?`مخصص ${from}—${to}`:(SHIFTS[sh]?.name||sh);
const msg={id:genId(),eid:emp.id,ename:emp.name,
text:`📅 تم تعديل شفتك ليوم ${fmtD(_editDayDate)} إلى: ${shName}`,
date:todayStr(),time:fmtT(new Date()),ts:new Date().toISOString()};
const msgs=DB.get(‘msg’)||[];msgs.push(msg);DB.set(‘msg’,msgs);
sendTg(`📅 تعديل شفت\n👤 ${emp.name}\nاليوم: ${fmtD(_editDayDate)}\nالشفت: ${shName}`);
}
showToast(‘✅ تم تعديل الشفت اليومي’,‘s’);
}

// جدول الدوام للموظف (عرض للقراءة فقط)
function renderEmpSchedule(){
const c=document.getElementById(‘empScheduleView’); if(!c)return;
const emp=getEmp(); if(!emp){c.innerHTML=’’;return;}
const days=[];
for(let i=0;i<7;i++){
const d=new Date(); d.setDate(d.getDate()+i);
days.push(d);
}
const dayNames=[‘الأحد’,‘الاثنين’,‘الثلاثاء’,‘الأربعاء’,‘الخميس’,‘الجمعة’,‘السبت’];
const todayStr2=todayStr();
c.innerHTML=`<div style="margin-bottom:12px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.15);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--t2)"> 📌 جدول دوامك لـ 7 أيام القادمة — يمكن للمدير تعديله يومياً </div> ${days.map(d=>{ const ds=d.toISOString().split('T')[0]; const isToday=ds===todayStr2; const dayShift=getEmpShiftForDay(emp,ds); const sh=SHIFTS[dayShift.sh]||{}; const from=dayShift.sh==='custom'?(dayShift.customFrom||'--'):(sh.s||'--'); const to=dayShift.sh==='custom'?(dayShift.customTo||'--'):(sh.e||'--'); const shName=dayShift.sh==='custom'?'وقت مخصص':sh.name||dayShift.sh; const isFull=sh.full||false; return`<div style="background:${isToday?'rgba(0,229,255,.08)':'var(--bg2)'};border:${isToday?'2px solid rgba(0,229,255,.4)':'1px solid var(--br)'};border-radius:14px;padding:14px 16px;margin-bottom:10px">
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
<div>
<div style="font-size:14px;font-weight:800;color:${isToday?'var(--cyan)':'var(--t1)'}">${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth()+1} ${isToday?’<span style="color:var(--cyan);font-size:11px">(اليوم)</span>’:’’}</div>
<div style="font-size:16px;font-weight:900;color:var(--gold);margin-top:4px">${shName}</div>
</div>
<div style="text-align:left">
<div style="font-size:13px;font-weight:700;color:var(--green)">⏰ ${from} — ${to}</div>
<div style="font-size:11px;color:${isFull?'var(--gold)':'var(--cyan)'};margin-top:4px">${isFull?‘⭐ دوام كامل (+10,000)’:‘دوام نصفي’}</div>
</div>
</div>
</div>`; }).join('')}`;
}

function archiveShiftSchedule(){
const offset=parseInt(document.getElementById(‘shWeekOffset’)?.value||‘0’);
const emps=DB.get(‘emps’)||[];
const startDay=new Date(); startDay.setDate(startDay.getDate()+offset);
const endDay=new Date(); endDay.setDate(endDay.getDate()+offset+6);
const label=`${startDay.getDate()}/${startDay.getMonth()+1} — ${endDay.getDate()}/${endDay.getMonth()+1}/${endDay.getFullYear()}`;
const shiftArchives=DB.get(‘shiftArchives’)||[];
shiftArchives.unshift({
id:genId(), label, archivedAt:new Date().toISOString(),
emps:emps.map(e=>({id:e.id,name:e.name,sh:e.sh,customFrom:e.customFrom,customTo:e.customTo}))
});
if(shiftArchives.length>20)shiftArchives.length=20;
DB.set(‘shiftArchives’,shiftArchives);
renderShiftArchive();
showToast(`✅ تم أرشفة جدول: ${label}`,‘s’);
}

function renderShiftArchive(){
const c=document.getElementById(‘shiftArchiveList’); if(!c)return;
const archives=DB.get(‘shiftArchives’)||[];
if(!archives.length){c.innerHTML=’<div class="empty"><div class="ei">📅</div><p>لا توجد جداول مؤرشفة</p></div>’;return;}
c.innerHTML=archives.map(a=>` <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px 14px;margin-bottom:8px"> <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"> <div style="font-size:13px;font-weight:700;color:var(--purple)">📅 ${a.label}</div> <div style="font-size:10px;color:var(--t3)">${new Date(a.archivedAt).toLocaleDateString('ar-IQ')}</div> </div> <div style="display:flex;flex-wrap:wrap;gap:6px"> ${(a.emps||[]).map(e=>`<span style="font-size:10px;background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.15);border-radius:6px;padding:3px 8px;color:var(--gold)">${e.name}: ${SHIFTS[e.sh]?.name||e.sh||‘مخصص’}</span>`).join('')} </div> </div>`).join(’’);
}

// ══════════════════════════════════════════════════════
//  HOOK: render loans tab in showATab + showETab
// ══════════════════════════════════════════════════════
// showATab loans/sh hooks integrated in original above

// showETab loan hook integrated directly above

// Add loanRequests to sync keys
// loanRequests and shiftArchives already in SYNC_KEYS above

// loan badge integrated directly in renderAdmin above
// renderEmpLoanHistory integrated in showETab and loadEmpScreen directly

// Initialize shift schedule on first load of sh tab
document.addEventListener(‘DOMContentLoaded’,()=>{
setTimeout(()=>{
try{renderShiftSchedule();}catch(e){}
try{renderShiftArchive();}catch(e){}
},2000);
});

window.addEventListener(‘load’,()=>{
console.log(‘PWA ready’);
});

// ══════════════════════════════════════════════════════
//  PENDING BADGES — أرقام الإشعارات على الخانات
// ══════════════════════════════════════════════════════
function updatePendingBadges(){
// إجازات معلقة
const leaves=(DB.get(‘leaveRequests’)||[]).filter(r=>r.status===‘pending’).length;
_setBadge(‘sideLeaveCount’, leaves);
_setBadge(‘mnavLeaveCount’, leaves);

// سلف معلقة
const loans=(DB.get(‘loanRequests’)||[]).filter(l=>l.status===‘pending’).length;
_setBadge(‘sideLoanCount’, loans);
_setBadge(‘mnavLoanCount’, loans);

// رسائل غير مقروءة (من الموظفين للمدير)
const msgs=(DB.get(‘empToAdminMsg’)||[]).filter(m=>!m.readByAdmin).length;
// أيضاً رسائل الدردشة الجماعية غير المقروءة
const lastSeen=parseInt(localStorage.getItem(‘groupchatLastSeen’)||‘0’);
const chatMsgs=(DB.get(‘groupchat’)||[]).filter(m=>m.uid!==‘admin’&&new Date(m.ts).getTime()>lastSeen).length;
const totalMsgs=msgs+chatMsgs;
_setBadge(‘sideMsgCount’, totalMsgs);
_setBadge(‘mnavMsgCount’, totalMsgs);
}

function _setBadge(id, count){
const el=document.getElementById(id);
if(!el)return;
if(count>0){
el.textContent=count>99?‘99+’:count;
el.style.display=’’;
} else {
el.textContent=’’;
el.style.display=‘none’;
}
}

// تحديث الـ badges كل 30 ثانية تلقائياً
setInterval(()=>{try{updatePendingBadges();}catch(e){}}, 30000);

// ══════════════════════════════════════════════════════
//  MANUAL ATTENDANCE — تسجيل حضور يدوي من المدير
// ══════════════════════════════════════════════════════

function _populateManAttEmps(){
const sel=document.getElementById(‘manAttEmp’); if(!sel)return;
const emps=DB.get(‘emps’)||[];
sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join(’’);
}

// تسجيل يوم واحد
function adminManualAtt(){
const empId=document.getElementById(‘manAttEmp’)?.value;
const date=document.getElementById(‘manAttDate’)?.value;
const ciTime=document.getElementById(‘manAttCiTime’)?.value||‘09:00’;
const coTime=document.getElementById(‘manAttCoTime’)?.value||‘18:00’;
if(!empId||!date){showToast(‘اختر الموظف والتاريخ’,‘e’);return;}

const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===empId);
if(!emp){showToast(‘الموظف غير موجود’,‘e’);return;}

const att=DB.get(‘att’)||[];

// تحقق إذا مسجل مسبقاً
const exists=att.some(a=>a.eid===empId&&a.date===date&&a.type===‘ci’);
if(exists){
showToast(`⚠️ ${emp.name} مسجل حضور بتاريخ ${date} مسبقاً`,‘e’);
return;
}

const ciTs=new Date(date+‘T’+ciTime+’:00’).toISOString();
const coTs=new Date(date+‘T’+coTime+’:00’).toISOString();
const durMins=Math.round((new Date(coTs)-new Date(ciTs))/60000);

att.push({id:genId(),eid:empId,ename:emp.name,type:‘ci’,date,time:ciTime,ts:ciTs,lat:0,lng:0,dist:0,manual:true,byAdmin:true});
att.push({id:genId(),eid:empId,ename:emp.name,type:‘co’,date,time:coTime,ts:coTs,lat:0,lng:0,dist:0,durMins,manual:true,byAdmin:true});
DB.set(‘att’,att);

addAdminLog(‘manual_att’,`تسجيل حضور يدوي: ${emp.name} — ${date}`,{eid:empId,date});

const fb=document.getElementById(‘manAttFeedback’);
if(fb){fb.textContent=`✅ تم تسجيل حضور ${emp.name} بتاريخ ${date} (${ciTime} – ${coTime})`;fb.style.display=‘block’;setTimeout(()=>{fb.style.display=‘none’;},4000);}

showToast(`✅ تم تسجيل حضور ${emp.name}`,‘s’);
renderAdminAtt();
renderAdmin();
}

// فتح modal الأيام المتعددة
function adminManualAttMulti(){
const empId=document.getElementById(‘manAttEmp’)?.value;
if(!empId){showToast(‘اختر موظفاً أولاً’,‘e’);return;}
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===empId);
if(!emp)return;

document.getElementById(‘manAttMultiEmpName’).textContent=emp.name;

// بناء قائمة أيام الفترة الحالية
const per=getPeriod();
const att=DB.get(‘att’)||[];
const ps=per.start.toISOString().split(‘T’)[0];
const pe=per.end.toISOString().split(‘T’)[0];
const registeredDays=new Set(att.filter(a=>a.eid===empId&&a.type===‘ci’).map(a=>a.date));

const today=todayStr();
const days=[];
let cur=new Date(ps+‘T00:00:00’);
const end=new Date(pe+‘T00:00:00’);
while(cur<=end&&cur.toISOString().split(‘T’)[0]<=today){
days.push(cur.toISOString().split(‘T’)[0]);
cur.setDate(cur.getDate()+1);
}

const container=document.getElementById(‘manAttMultiDaysList’);
container.innerHTML=days.map(d=>{
const isReg=registeredDays.has(d);
const dayName=new Date(d+‘T00:00:00’).toLocaleDateString(‘ar-IQ’,{weekday:‘short’,day:‘numeric’,month:‘numeric’});
return `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:${isReg?'default':'pointer'};background:${isReg?'rgba(0,230,118,.08)':'var(--bg3)'};border:1px solid ${isReg?'rgba(0,230,118,.3)':'var(--br)'};opacity:${isReg?'0.6':'1'}"> <input type="checkbox" value="${d}" ${isReg?'checked disabled':''} style="accent-color:var(--green);width:15px;height:15px"> <span style="font-size:12px;${isReg?'color:var(--green)':''}">${dayName}${isReg?' ✅':''}</span> </label>`;
}).join(’’);

// store empId on modal
document.getElementById(‘manAttMultiModal’).dataset.eid=empId;
openModal(‘manAttMultiModal’);
}

function selectAllMultiDays(){
document.querySelectorAll(’#manAttMultiDaysList input[type=checkbox]:not(:disabled)’).forEach(cb=>cb.checked=true);
}
function clearAllMultiDays(){
document.querySelectorAll(’#manAttMultiDaysList input[type=checkbox]:not(:disabled)’).forEach(cb=>cb.checked=false);
}

function confirmManualAttMulti(){
const empId=document.getElementById(‘manAttMultiModal’).dataset.eid;
const ciTime=document.getElementById(‘manAttMultiCi’)?.value||‘09:00’;
const coTime=document.getElementById(‘manAttMultiCo’)?.value||‘18:00’;
const selected=[…document.querySelectorAll(’#manAttMultiDaysList input[type=checkbox]:not(:disabled):checked’)].map(cb=>cb.value);

if(!selected.length){showToast(‘ما اخترت أي يوم’,‘e’);return;}

const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===empId);
if(!emp)return;

let att=DB.get(‘att’)||[];
let added=0;
selected.forEach(date=>{
const exists=att.some(a=>a.eid===empId&&a.date===date&&a.type===‘ci’);
if(exists)return;
const ciTs=new Date(date+‘T’+ciTime+’:00’).toISOString();
const coTs=new Date(date+‘T’+coTime+’:00’).toISOString();
const durMins=Math.round((new Date(coTs)-new Date(ciTs))/60000);
att.push({id:genId(),eid:empId,ename:emp.name,type:‘ci’,date,time:ciTime,ts:ciTs,lat:0,lng:0,dist:0,manual:true,byAdmin:true});
att.push({id:genId(),eid:empId,ename:emp.name,type:‘co’,date,time:coTime,ts:coTs,lat:0,lng:0,dist:0,durMins,manual:true,byAdmin:true});
added++;
});
DB.set(‘att’,att);
addAdminLog(‘manual_att_multi’,`تسجيل حضور يدوي متعدد: ${emp.name} — ${added} أيام`,{eid:empId,count:added});
closeModal(‘manAttMultiModal’);
showToast(`✅ تم تسجيل ${added} يوم حضور لـ ${emp.name}`,‘s’);
renderAdminAtt();
renderAdmin();
}

// تعبئة قائمة الموظفين عند فتح تاب الحضور
const _origShowATab=window.showATab;
window.showATab=function(id,el){
_origShowATab&&_origShowATab(id,el);
if(id===‘att’){
_populateManAttEmps();
// تعيين اليوم الحالي كافتراضي
const di=document.getElementById(‘manAttDate’);
if(di&&!di.value)di.value=todayStr();
}
};

// ══════════════════════════════════════════════════════
//  MONTH ATTENDANCE GRID — حضور الشهر الكامل
// ══════════════════════════════════════════════════════
function renderMonthAttGrid(emps,att,ps,pe,today){
const grid=document.getElementById(‘monthAttGrid’);
const badge=document.getElementById(‘monthAttBadge’);
if(!grid)return;
const leaveDays=DB.get(‘leaveDays’)||[];
const now2=new Date();
// دائماً من 1 الشهر لآخر يوم في الشهر
const y=now2.getFullYear(), m=now2.getMonth();
const monthStart=new Date(y,m,1).toISOString().split(‘T’)[0];
const monthEnd=new Date(y,m+1,0).toISOString().split(‘T’)[0]; // آخر يوم في الشهر
const days=[];
let cur=new Date(monthStart+‘T00:00:00’);
const end=new Date(monthEnd+‘T00:00:00’);
while(cur<=end){
days.push(cur.toISOString().split(‘T’)[0]);
cur.setDate(cur.getDate()+1);
}
let totalPresent=0, totalLeave=0;
const dayStats=days.map(d=>{
const pres=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===d&&a.type===‘ci’)).length;
const onLeave=emps.filter(e=>leaveDays.some(l=>l.eid===e.id&&l.date===d)).length;
if(d<=today){totalPresent+=pres;totalLeave+=onLeave;}
return{d,pres,onLeave};
});
const passedDays=days.filter(d=>d<=today).length;
if(badge)badge.textContent=`${totalPresent} تسجيل حضور في ${passedDays} يوم`;
grid.innerHTML=dayStats.map(({d,pres,onLeave})=>{
const isFuture=d>today;
const dayNum=parseInt(d.split(’-’)[2]);
let bg,color,title;
if(isFuture){bg=‘var(–bg3)’;color=‘var(–t3)’;title=d;}
else if(pres===emps.length&&emps.length>0){bg=‘rgba(0,230,118,.25)’;color=‘var(–green)’;title=`${d} — كل الموظفين حضروا`;}
else if(pres>0&&onLeave>0){bg=‘rgba(240,192,64,.2)’;color=‘var(–gold)’;title=`${d} — ${pres} حضور + ${onLeave} إجازة`;}
else if(pres>0){bg=‘rgba(240,192,64,.2)’;color=‘var(–gold)’;title=`${d} — ${pres}/${emps.length} حضروا`;}
else if(onLeave>0){bg=‘rgba(206,147,216,.25)’;color=‘var(–purple)’;title=`${d} — ${onLeave} مجاز 🌴`;}
else{bg=‘var(–bg3)’;color=‘var(–t3)’;title=`${d} — لا يوجد`;}
return `<div title="${title}" style="width:30px;height:30px;border-radius:6px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:default">${dayNum}</div>`;
}).join(’’);
}

// ══════════════════════════════════════════════════════
//  LEAVE MANAGEMENT — إدارة الإجازات من المدير
// ══════════════════════════════════════════════════════
function _populateLeaveMgmt(){
const sel=document.getElementById(‘leaveMgmtEmp’);
const fsel=document.getElementById(‘leaveMgmtFilter’);
const emps=DB.get(‘emps’)||[];
if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join(’’);
if(fsel&&fsel.options.length<=1)emps.forEach(e=>{const o=document.createElement(‘option’);o.value=e.id;o.textContent=e.name;fsel.appendChild(o);});
}

function addLeaveDayAdmin(){
const eid=document.getElementById(‘leaveMgmtEmp’)?.value;
const date=document.getElementById(‘leaveMgmtDate’)?.value;
const paid=document.getElementById(‘leaveMgmtPaid’)?.checked!==false;
if(!eid||!date){showToast(‘اختر الموظف والتاريخ’,‘e’);return;}
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===eid);
if(!emp)return;
let leaves=DB.get(‘leaveDays’)||[];
if(leaves.some(l=>l.eid===eid&&l.date===date)){showToast(‘هذا اليوم مسجل مسبقاً’,‘e’);return;}
// الإجازة المدفوعة تُحتسب كيوم واحد فقط (من leaveDays) — لا تُضاف لـ lvM لتجنب الحساب المزدوج
leaves.push({id:genId(),eid,ename:emp.name,date,paid,addedAt:new Date().toISOString()});
DB.set(‘leaveDays’,leaves);
// lvM للإجازات المطلوبة من الموظف نفسه فقط — هنا المدير يضيفها مباشرة بدون lvM
addAdminLog(‘leave_add’,`إجازة ${paid?'مدفوعة':'غير مدفوعة'}: ${emp.name} — ${date}`,{eid,date});
showToast(`✅ تم تسجيل إجازة ${emp.name} — ${fmtD(date)}`,‘s’);
renderLeaveMgmtList();
renderAdmin();
}

function renderLeaveMgmtList(){
const c=document.getElementById(‘leaveMgmtList’);if(!c)return;
let leaves=DB.get(‘leaveDays’)||[];
const ef=document.getElementById(‘leaveMgmtFilter’)?.value||’’;
if(ef)leaves=leaves.filter(l=>l.eid===ef);
leaves.sort((a,b)=>b.date.localeCompare(a.date));
if(!leaves.length){c.innerHTML=’<div class="empty"><div class="ei">🌴</div><p>لا توجد إجازات</p></div>’;return;}
c.innerHTML=leaves.map(l=>` <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;gap:6px"> <div style="display:flex;align-items:center;gap:8px"> <div class="eav">${(l.ename||'?')[0]}</div> <div> <div style="font-size:13px;font-weight:700">${l.ename}</div> <div style="font-size:11px;color:var(--t3)">${fmtD(l.date)}</div> </div> </div> <div style="display:flex;align-items:center;gap:8px"> <span style="font-size:11px;padding:3px 8px;border-radius:6px;${l.paid?'background:rgba(0,230,118,.1);color:var(--green)':'background:rgba(233,69,96,.1);color:var(--red)'}">${l.paid?'✅ مدفوعة':'❌ غير مدفوعة'}</span> <button class="btn btn-dn btn-sm btn-ic" onclick="deleteLeaveDay('${l.id}')">🗑️</button> </div> </div>`).join(’’);
}

function deleteLeaveDay(id){
let leaves=DB.get(‘leaveDays’)||[];
const lv=leaves.find(l=>l.id===id);
if(!lv)return;
// إزالة من lvM إذا كانت مدفوعة
if(lv.paid){
const emps=DB.get(‘emps’)||[];
const ei=emps.findIndex(e=>e.id===lv.eid);
if(ei!==-1&&emps[ei].lvM>0){emps[ei].lvM–;DB.set(‘emps’,emps);}
}
leaves=leaves.filter(l=>l.id!==id);
DB.set(‘leaveDays’,leaves);
renderLeaveMgmtList();
renderAdmin();
showToast(‘تم حذف الإجازة’,‘i’);
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE PHOTO — صورة الموظف
// ══════════════════════════════════════════════════════
function openPhotoUpload(){
const inp=document.createElement(‘input’);
inp.type=‘file’;inp.accept=‘image/*’;
inp.onchange=function(e){
const file=e.target.files[0];if(!file)return;
if(file.size>2*1024*1024){showToast(‘الصورة أكبر من 2MB’,‘e’);return;}
const reader=new FileReader();
reader.onload=function(ev){
if(!currentUser?.id)return;
const emps=DB.get(‘emps’)||[];
const i=emps.findIndex(e=>e.id===currentUser.id);
if(i===-1)return;
emps[i].photo=ev.target.result;
DB.set(‘emps’,emps);
updateEmpAvatar(emps[i]);
showToast(‘✅ تم رفع الصورة’,‘s’);
};
reader.readAsDataURL(file);
};
inp.click();
}

function updateEmpAvatar(emp){
const av=document.getElementById(‘empAvBig’);
if(!av)return;
if(emp.photo){
av.style.background=‘none’;
av.innerHTML=`<img src="${emp.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
}else{
av.style.background=‘linear-gradient(135deg,var(–gold),var(–gold2))’;
av.innerHTML=emp.name?emp.name[0]:‘م’;
}
}

// ══════════════════════════════════════════════════════
//  9AM ABSENT ALERT — تنبيه من لم يبصم
// ══════════════════════════════════════════════════════
let *absentAlertShown=false;
function check9amAbsent(){
const now=new Date();
const h=now.getHours(),mn=now.getMinutes();
if(h!==9||mn>5)return;
const today=todayStr();
const key=’absent9*’+today;
if(DB.get(key))return;
DB.set(key,1);
_absentAlertShown=false;
const emps=DB.get(‘emps’)||[];
const att=DB.get(‘att’)||[];
const leaveDays=DB.get(‘leaveDays’)||[];
const notCheckedIn=emps.filter(e=>{
const hasCi=att.some(a=>a.eid===e.id&&a.date===today&&a.type===‘ci’);
const onLeave=leaveDays.some(l=>l.eid===e.id&&l.date===today);
return !hasCi&&!onLeave;
});
if(!notCheckedIn.length)return;
// فتح موديل السؤال
const modal=document.getElementById(‘absentAlertModal’);
if(!modal)return;
document.getElementById(‘absentAlertList’).innerHTML=notCheckedIn.map(e=>` <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:8px"> <div style="font-size:14px;font-weight:700;margin-bottom:8px">👤 ${e.name}</div> <div style="display:flex;gap:8px;flex-wrap:wrap"> <button class="btn btn-dn btn-sm" onclick="markAbsent9('${e.id}')">❌ غائب (يُخصم)</button> <button class="btn btn-ok btn-sm" onclick="markLeave9('${e.id}','paid')">🌴 مجاز مدفوع</button> <button class="btn btn-sc btn-sm" onclick="markLeave9('${e.id}','unpaid')">🌴 مجاز بدون يومية</button> <button class="btn btn-wa btn-sm" onclick="skipAlert9('${e.id}')">⏭️ تخطي</button> </div> </div>`).join(’’);
openModal(‘absentAlertModal’);
}

function markAbsent9(eid){
// غائب — لا حاجة لإجراء، الغياب محسوب تلقائياً
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===eid);
addAdminLog(‘absent_marked’,`تأكيد غياب: ${emp?.name||eid}`,{eid,date:todayStr()});
_removeAbsent9Row(eid);
showToast(`❌ تم تسجيل غياب ${emp?.name}`,‘i’);
renderAdmin();
}

function markLeave9(eid,type){
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===eid);if(!emp)return;
const today=todayStr();
let leaves=DB.get(‘leaveDays’)||[];
if(!leaves.some(l=>l.eid===eid&&l.date===today)){
const paid=type===‘paid’;
leaves.push({id:genId(),eid,ename:emp.name,date:today,paid,addedAt:new Date().toISOString()});
DB.set(‘leaveDays’,leaves);
if(paid){
const ei=emps.findIndex(e=>e.id===eid);
if(ei!==-1){emps[ei].lvM=(emps[ei].lvM||0)+1;DB.set(‘emps’,emps);}
}
}
addAdminLog(‘leave_9am’,`إجازة من تنبيه 9ص: ${emp.name} — ${type==='paid'?'مدفوعة':'بدون يومية'}`,{eid});
_removeAbsent9Row(eid);
showToast(`🌴 تم تسجيل إجازة ${emp.name}`,‘s’);
renderAdmin();
}

function skipAlert9(eid){_removeAbsent9Row(eid);}

function _removeAbsent9Row(eid){
const row=document.querySelector(`#absentAlertList [onclick*="${eid}"]`);
if(row){const parent=row.closest(‘div[style*=“border-radius:10px”]’);if(parent)parent.remove();}
const list=document.getElementById(‘absentAlertList’);
if(list&&!list.children.length)closeModal(‘absentAlertModal’);
}

// ══════════════════════════════════════════════════════
//  NEW SALES — إحصائيات المبيعات الجديدة (فيس/انستا/واتساب)
// ══════════════════════════════════════════════════════
function openAddSaleNew(){
// تعبئة الموظفين
const sel=document.getElementById(‘saleEmpSel’);
const emps=DB.get(‘emps’)||[];
if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join(’’);
// التاريخ اليوم
const di=document.getElementById(‘saleDate’);
if(di)di.value=todayStr();
// ربط الـ inputs بالمجموع
[‘saleFb’,‘saleInsta’,‘saleWa’].forEach(id=>{
const el=document.getElementById(id);
if(el)el.oninput=updateSaleTotalPreview;
});
openModal(‘addSaleModal’);
}

function updateSaleTotalPreview(){
const fb=parseInt(document.getElementById(‘saleFb’)?.value)||0;
const insta=parseInt(document.getElementById(‘saleInsta’)?.value)||0;
const wa=parseInt(document.getElementById(‘saleWa’)?.value)||0;
const el=document.getElementById(‘saleTotalPreview’);
if(el)el.textContent=(fb+insta+wa)+’ طلب’;
}

function addSaleRecordNew(){
const eid=document.getElementById(‘saleEmpSel’)?.value;
const date=document.getElementById(‘saleDate’)?.value||todayStr();
const fb=parseInt(document.getElementById(‘saleFb’)?.value)||0;
const insta=parseInt(document.getElementById(‘saleInsta’)?.value)||0;
const wa=parseInt(document.getElementById(‘saleWa’)?.value)||0;
const note=document.getElementById(‘saleNote’)?.value.trim()||’’;
if(!eid){showToast(‘اختر الموظف’,‘e’);return;}
if(fb+insta+wa===0){showToast(‘أدخل عدد الطلبات في منصة واحدة على الأقل’,‘e’);return;}
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===eid);if(!emp)return;
const sales=DB.get(‘salesLog’)||[];
const now=new Date();
if(fb>0)sales.push({id:genId(),eid,ename:emp.name,platform:‘فيسبوك’,count:fb,note,date,time:fmtT(now),ts:now.toISOString()});
if(insta>0)sales.push({id:genId(),eid,ename:emp.name,platform:‘انستقرام’,count:insta,note,date,time:fmtT(now),ts:now.toISOString()});
if(wa>0)sales.push({id:genId(),eid,ename:emp.name,platform:‘واتساب’,count:wa,note,date,time:fmtT(now),ts:now.toISOString()});
DB.set(‘salesLog’,sales);
[‘saleFb’,‘saleInsta’,‘saleWa’].forEach(id=>{const el=document.getElementById(id);if(el)el.value=’’;});
const snEl=document.getElementById(‘saleNote’);if(snEl)snEl.value=’’;
const sp=document.getElementById(‘saleTotalPreview’);if(sp)sp.textContent=‘0 طلب’;
closeModal(‘addSaleModal’);
renderSalesToday();renderSalesLog();renderSalesStatsNew();
showToast(`✅ تم تسجيل ${fb+insta+wa} طلب — ${emp.name}`,‘s’);
}

function renderSalesToday(){
const c=document.getElementById(‘salesTodaySummary’);if(!c)return;
const lbl=document.getElementById(‘salesTodayLabel’);
const today=todayStr();
if(lbl)lbl.textContent=fmtD(today);
const sales=(DB.get(‘salesLog’)||[]).filter(s=>s.date===today);
const emps=DB.get(‘emps’)||[];
if(!sales.length){c.innerHTML=’<div class="empty" style="padding:16px"><div class="ei">📦</div><p>لا توجد طلبات اليوم</p></div>’;return;}
// تجميع حسب موظف
const byEmp={};
sales.forEach(s=>{
if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,fb:0,insta:0,wa:0,total:0};
const cnt=s.count||1;
if(s.platform===‘فيسبوك’)byEmp[s.eid].fb+=cnt;
else if(s.platform===‘انستقرام’)byEmp[s.eid].insta+=cnt;
else if(s.platform===‘واتساب’)byEmp[s.eid].wa+=cnt;
byEmp[s.eid].total+=cnt;
});
c.innerHTML=`<div style="padding:12px 16px"> <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px"> ${Object.values(byEmp).map(e=>`
<div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:14px">
<div style="font-size:14px;font-weight:800;margin-bottom:10px">${e.name}</div>
<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
${e.fb?`<div style="display:flex;align-items:center;gap:5px;background:rgba(66,165,245,.1);border:1px solid rgba(66,165,245,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#42a5f5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><span style="font-size:13px;font-weight:800;color:var(--blue)">${e.fb}</span></div>`:’’}
${e.insta?`<div style="display:flex;align-items:center;gap:5px;background:rgba(206,147,216,.1);border:1px solid rgba(206,147,216,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg><span style="font-size:13px;font-weight:800;color:var(--purple)">${e.insta}</span></div>`:’’}
${e.wa?`<div style="display:flex;align-items:center;gap:5px;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#00e676"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg><span style="font-size:13px;font-weight:800;color:var(--green)">${e.wa}</span></div>`:’’}
</div>
<div style="font-size:12px;color:var(--t2)">الإجمالي: <span style="color:var(--cyan);font-weight:800">${e.total}</span> طلب</div>
</div>`).join('')} </div></div>`;
}

function renderSalesStatsNew(){
const c=document.getElementById(‘salesRangeStats’);if(!c)return;
const eid=document.getElementById(‘salesFilterEmpNew’)?.value||’’;
const from=document.getElementById(‘salesFromDate’)?.value||’’;
const to=document.getElementById(‘salesToDate’)?.value||’’;
let sales=DB.get(‘salesLog’)||[];
if(eid)sales=sales.filter(s=>s.eid===eid);
if(from)sales=sales.filter(s=>s.date>=from);
if(to)sales=sales.filter(s=>s.date<=to);
if(!sales.length){c.innerHTML=’<div class="empty" style="padding:16px"><div class="ei">📊</div><p>لا توجد بيانات للفترة المحددة</p></div>’;return;}
const byEmp={};
sales.forEach(s=>{
if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,fb:0,insta:0,wa:0,total:0};
const cnt=s.count||1;
if(s.platform===‘فيسبوك’)byEmp[s.eid].fb+=cnt;
else if(s.platform===‘انستقرام’)byEmp[s.eid].insta+=cnt;
else if(s.platform===‘واتساب’)byEmp[s.eid].wa+=cnt;
byEmp[s.eid].total+=cnt;
});
// إجمالي التطبيقات
let totFb=0,totInsta=0,totWa=0;
Object.values(byEmp).forEach(e=>{totFb+=e.fb;totInsta+=e.insta;totWa+=e.wa;});
const grandTotal=totFb+totInsta+totWa;
const rangeLabel=from&&to?`${fmtD(from)} — ${fmtD(to)}`:from?`من ${fmtD(from)}`:to?`حتى ${fmtD(to)}`:‘كل الفترات’;
c.innerHTML=` <div style="font-size:11px;color:var(--t2);margin-bottom:12px">${rangeLabel}</div> <!-- إجمالي المنصات --> <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px"> <div style="background:rgba(66,165,245,.08);border:1px solid rgba(66,165,245,.2);border-radius:10px;padding:12px;text-align:center"> <svg width="22" height="22" viewBox="0 0 24 24" fill="#42a5f5" style="margin-bottom:6px"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> <div style="font-size:20px;font-weight:900;color:var(--blue)">${totFb}</div> <div style="font-size:10px;color:var(--t2)">فيسبوك</div> </div> <div style="background:rgba(206,147,216,.08);border:1px solid rgba(206,147,216,.2);border-radius:10px;padding:12px;text-align:center"> <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:6px"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg> <div style="font-size:20px;font-weight:900;color:var(--purple)">${totInsta}</div> <div style="font-size:10px;color:var(--t2)">انستقرام</div> </div> <div style="background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.2);border-radius:10px;padding:12px;text-align:center"> <svg width="22" height="22" viewBox="0 0 24 24" fill="#00e676" style="margin-bottom:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> <div style="font-size:20px;font-weight:900;color:var(--green)">${totWa}</div> <div style="font-size:10px;color:var(--t2)">واتساب</div> </div> </div> <div style="background:rgba(240,192,64,.06);border:1px solid rgba(240,192,64,.15);border-radius:10px;padding:10px;text-align:center;margin-bottom:16px"> <span style="font-size:12px;color:var(--t2)">إجمالي الطلبات: </span><span style="font-size:20px;font-weight:900;color:var(--gold)">${grandTotal}</span> </div> <!-- تفاصيل كل موظف --> <div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px">تفاصيل كل موظف</div> <div class="tw"><table><thead><tr><th>الموظف</th> <th><svg width="14" height="14" viewBox="0 0 24 24" fill="#42a5f5" style="vertical-align:middle"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></th> <th><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg></th> <th><svg width="14" height="14" viewBox="0 0 24 24" fill="#00e676" style="vertical-align:middle"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></th> <th>الإجمالي</th></tr></thead><tbody> ${Object.values(byEmp).sort((a,b)=>b.total-a.total).map(e=>`<tr>
<td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
<td><span class="bold" style="color:var(--blue)">${e.fb||’—’}</span></td>
<td><span class="bold" style="color:var(--purple)">${e.insta||’—’}</span></td>
<td><span class="bold" style="color:var(--green)">${e.wa||’—’}</span></td>
<td><span class="bold tcyn">${e.total}</span></td>
</tr>`).join('')} </tbody></table></div>`;
}

// تفعيل تنبيه 9 صباحاً في الـ timer
setInterval(()=>{try{check9amAbsent();}catch(e){}},60000);

// hook showATab لـ leave_mgmt وsales
const __origShowATab2=window.showATab;
window.showATab=function(id,el){
__origShowATab2&&__origShowATab2(id,el);
if(id===‘leave_mgmt’){_populateLeaveMgmt();renderLeaveMgmtList();}
if(id===‘sales’){
const emps=DB.get(‘emps’)||[];
const fsel=document.getElementById(‘salesFilterEmpNew’);
if(fsel&&fsel.options.length<=1)emps.forEach(e=>{const o=document.createElement(‘option’);o.value=e.id;o.textContent=e.name;fsel.appendChild(o);});
renderSalesToday();renderSalesLog();
}
};

// تحديث avatar عند تحميل شاشة الموظف
const __origLoadEmpScreen=window.loadEmpScreen;
if(__origLoadEmpScreen){
window.loadEmpScreen=function(emp){
__origLoadEmpScreen(emp);
updateEmpAvatar(emp);
};
}

// ══════════════════════════════════════════════════════
//  CUSTOM SHIFTS — إضافة شفتات جديدة
// ══════════════════════════════════════════════════════
function openAddShiftModal(){openModal(‘addShiftModal’);}
function saveNewShift(){
const name=document.getElementById(‘newShiftName’).value.trim();
const from=document.getElementById(‘newShiftFrom’).value;
const to=document.getElementById(‘newShiftTo’).value;
const bonType=document.getElementById(‘newShiftBonType’).value;
const bonAmt=parseInt(document.getElementById(‘newShiftBonAmt’).value)||0;
if(!name||!from||!to){showToast(‘أدخل اسم الشفت والأوقات’,‘e’);return;}
const key=from+’-’+to+(name.replace(/\s/g,’’)?’_’+Date.now():’’);
const customShifts=DB.get(‘customShifts’)||{};
const shObj={name,s:from,e:to,h:0,full:bonType===‘full’,display:name};
if(bonType===‘daily’){shObj.bonusType=‘daily’;shObj.dailyBonus=bonAmt;shObj.full=false;}
customShifts[key]=shObj;
DB.set(‘customShifts’,customShifts);
_reloadShifts();
closeModal(‘addShiftModal’);
renderShiftCards();
_addShiftToAllDropdowns(key,name);
showToast(’✅ تم إضافة الشفت: ’+name,‘s’);
}

function renderShiftCards(){
_reloadShifts();
const grid=document.getElementById(‘shiftCardsGrid’);if(!grid)return;
let html=’’;
Object.entries(SHIFTS).forEach(([k,s])=>{
if(k===‘custom’)return;
const bonTxt=s.full?‘كامل • +10,000’:s.bonusType===‘daily’?`يومي • +${(s.dailyBonus||0).toLocaleString('ar-IQ')}`:s.name===‘وقت مخصص’?‘موافقة المدير’:‘نصفي’;
const bc=s.full?’’:’’;
html+=`<div class="shcard"><div class="shn">${s.name}</div><div class="shh">${s.h?s.h+' ساعات':''}</div><div class="shs">${bonTxt}</div></div>`;
});
html+=`<div class="shcard" style="border-color:rgba(0,229,255,.2)"><div class="shn" style="color:var(--cyan)">وقت مخصص</div><div class="shh">يحدده المدير</div><div class="shs">موافقة المدير</div></div>`;
grid.innerHTML=html;
}

function _addShiftToAllDropdowns(key,name){
[‘qsShift’,‘dseShift’,‘eShiftInp’,‘neShift’].forEach(id=>{
const sel=document.getElementById(id);if(!sel)return;
if(!sel.querySelector(`option[value="${key}"]`)){
const opt=document.createElement(‘option’);opt.value=key;opt.textContent=name;
// Insert before ‘custom’ option
const customOpt=sel.querySelector(‘option[value=“custom”]’);
if(customOpt)sel.insertBefore(opt,customOpt);
else sel.appendChild(opt);
}
});
}

// Restore custom shifts into dropdowns on load
function _restoreCustomShiftsDropdowns(){
_reloadShifts();
const custom=DB.get(‘customShifts’)||{};
Object.entries(custom).forEach(([k,s])=>_addShiftToAllDropdowns(k,s.name));
}

// ══════════════════════════════════════════════════════
//  DAILY SCHEDULE PUSH (4 AM notification to employees)
// ══════════════════════════════════════════════════════
function pushTomorrowScheduleToChat(){
_reloadShifts();
const emps=DB.get(‘emps’)||[];
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
const tStr=tomorrow.toISOString().split(‘T’)[0];
const tLabel=tomorrow.toLocaleDateString(‘ar-IQ’,{weekday:‘long’,day:‘numeric’,month:‘long’});
let msg=`📅 جدول دوام ${tLabel}:\n━━━━━━━━━━━━━━\n`;
emps.forEach(e=>{
const dayShift=getEmpShiftForDay(e,tStr);
const sh=SHIFTS[dayShift.sh]||{};
let shName;
if(dayShift.sh===‘on_leave’)shName=‘🌴 إجازة’;
else if(dayShift.sh===‘custom’)shName=`مخصص ${dayShift.customFrom}—${dayShift.customTo}`;
else shName=sh.name||dayShift.sh;
msg+=`👤 ${e.name}: ${shName}\n`;
});
msg+=‘━━━━━━━━━━━━━━’;
// Add to group chat
const now=new Date();
const chatMsg={id:genId(),uid:‘admin’,uname:‘المدير 👑’,role:‘admin’,text:msg.replace(/\n/g,’\n’),ts:now.toISOString(),time:fmtT(now),date:todayStr(),isSchedule:true};
const chat=DB.get(‘groupChat’)||[];chat.push(chatMsg);DB.set(‘groupChat’,chat);
sendTg(msg.replace(/\n/g,’\n’));
renderEmpChat();renderAdminChat();
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE PHOTO DISPLAY IN CHAT
// ══════════════════════════════════════════════════════
function getEmpAvatar(uid,uname,size){
const emps=DB.get(‘emps’)||[];
const emp=emps.find(e=>e.id===uid);
const photo=emp?.photo;
const nm=uname||’؟’;
if(photo){
return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${nm}">`;
}
return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.45)}px;font-weight:800;color:#1a1200;flex-shrink:0">${nm[0]||'؟'}</div>`;
}

// ── _reloadShifts ──
function _reloadShifts(){
const custom=DB.get(‘customShifts’)||{};
SHIFTS=Object.assign({},SHIFTS_DEFAULT,custom);
}

// ── deleteChatMsg — حذف رسالة من الدردشة ──
function deleteChatMsg(id, role){
const chat=DB.get(‘groupChat’)||[];
const msg=chat.find(m=>m.id===id);
if(!msg){showToast(‘الرسالة غير موجودة’,‘e’);return;}
// الموظف: يحذف رسالته فقط | المدير: يحذف أي رسالة
const emp=getEmp();
if(role===‘emp’ && msg.uid!==emp?.id){showToast(‘لا يمكنك حذف رسالة شخص آخر’,‘e’);return;}
if(!confirm(‘حذف هذه الرسالة؟’))return;
const filtered=chat.filter(m=>m.id!==id);
DB.set(‘groupChat’,filtered);
renderEmpChat();renderAdminChat();
showToast(‘🗑️ تم حذف الرسالة’,‘i’);
}

// ── renderShiftSchedule — show مجاز cell ──
// (patched below in saveDayShiftEdit)

// ── Tomorrow schedule push — called at 4 AM ──
function *checkAndPushSchedule(){
const now=new Date();
if(now.getHours()===4&&now.getMinutes()===0){
const key=’schpush*’+todayStr();
if(!DB.get(key)){DB.set(key,1);pushTomorrowScheduleToChat();}
}
}

// ── Fix renderShiftSchedule for on_leave ──
const _origRenderShiftSchedule=typeof renderShiftSchedule===‘function’?renderShiftSchedule:null;
function renderShiftSchedule(){
_reloadShifts();
const c=document.getElementById(‘shiftScheduleGrid’); if(!c)return;
const offset=parseInt(document.getElementById(‘shWeekOffset’)?.value||‘0’);
const emps=DB.get(‘emps’)||[];
const days=[];
for(let i=0;i<7;i++){
const d=new Date(); d.setDate(d.getDate()+offset+i);
days.push(d);
}
const dayNames=[‘أحد’,‘إثنين’,‘ثلاثاء’,‘أربعاء’,‘خميس’,‘جمعة’,‘سبت’];
const todayStr2=todayStr();
let html=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"> <thead><tr> <th style="text-align:right;padding:8px 10px;color:var(--t3);border-bottom:1px solid var(--br);white-space:nowrap;min-width:90px">الموظف</th> ${days.map(d=>{ const ds=d.toISOString().split('T')[0]; const isToday=ds===todayStr2; return `<th style="text-align:center;padding:8px 6px;border-bottom:1px solid var(--br);white-space:nowrap;min-width:110px;${isToday?'background:rgba(0,229,255,.06)':''}">
<div style="font-size:10px;color:${isToday?'var(--cyan)':'var(--t3)'};">${dayNames[d.getDay()]}</div>
<div style="font-weight:800;color:${isToday?'var(--cyan)':'var(--t1)'}">${d.getDate()}/${d.getMonth()+1}</div>
${isToday?’<div style="font-size:9px;color:var(--cyan)">اليوم</div>’:’’}
</th>`; }).join('')} </tr></thead> <tbody> ${emps.map(e=>`<tr>
<td style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.04)">
<div style="display:flex;align-items:center;gap:6px">
${getEmpAvatar(e.id,e.name,26)}
<span style="font-weight:600;font-size:11px;white-space:nowrap">${e.name}</span>
</div>
</td>
${days.map(d=>{
const ds=d.toISOString().split(‘T’)[0];
const isToday=ds===todayStr2;
const dayShift=getEmpShiftForDay(e,ds);
const isOnLeave=dayShift.sh===‘on_leave’;
const sh=SHIFTS[dayShift.sh]||{};
const from=dayShift.sh===‘custom’?(dayShift.customFrom||’–’):(sh.s||’–’);
const to=dayShift.sh===‘custom’?(dayShift.customTo||’–’):(sh.e||’–’);
const shName=dayShift.sh===‘custom’?‘مخصص’:sh.name||dayShift.sh;
return `<td style="text-align:center;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.04);${isToday?'background:rgba(0,229,255,.04)':''}"> ${isOnLeave? `<div style="background:rgba(206,147,216,.15);border:1px solid rgba(206,147,216,.35);border-radius:8px;padding:5px 3px;cursor:pointer"
onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')" title="مجاز">
<div style="font-size:13px">🌴</div>
<div style="font-size:9px;color:var(--purple);font-weight:700">مجاز</div>
<div style="font-size:8px;color:var(--t3)">✏️</div>
</div>`: `<div style="background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.18);border-radius:8px;padding:5px 3px;cursor:pointer"
onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')" title="تعديل">
<div style="font-size:9px;font-weight:700;color:var(--gold)">${shName}</div>
<div style="font-size:9px;color:var(--green)">${from}</div>
<div style="font-size:9px;color:var(--cyan)">${to}</div>
<div style="font-size:8px;color:var(--t3)">✏️</div>
</div>`} </td>`;
}).join(’’)}
</tr>`).join('')} </tbody></table></div>`;
c.innerHTML=html;
}

// ── saveDayShiftEdit with leave registration ──
function saveDayShiftEdit(){
const sh=document.getElementById(‘dseShift’).value;
const from=document.getElementById(‘dseFrom’).value;
const to=document.getElementById(‘dseTo’).value;
saveDailyShift(_editDayEmpId,_editDayDate,sh,from,to);
if(sh===‘on_leave’){
const leaveDays=DB.get(‘leaveDays’)||[];
if(!leaveDays.some(l=>l.eid===_editDayEmpId&&l.date===_editDayDate)){
const emp2=(DB.get(‘emps’)||[]).find(e=>e.id===_editDayEmpId);
leaveDays.push({id:genId(),eid:_editDayEmpId,ename:emp2?.name||’’,date:_editDayDate,paid:true,byAdmin:true,note:‘مجاز جدول الشفتات’});
DB.set(‘leaveDays’,leaveDays);
}
} else {
const leaveDays=DB.get(‘leaveDays’)||[];
DB.set(‘leaveDays’,leaveDays.filter(l=>!(l.eid===_editDayEmpId&&l.date===_editDayDate&&l.note===‘مجاز جدول الشفتات’)));
}
closeModal(‘dayShiftEditModal’);
renderShiftSchedule();
const emp=(DB.get(‘emps’)||[]).find(e=>e.id===_editDayEmpId);
if(emp){
const shName=sh===‘on_leave’?‘🌴 إجازة’:sh===‘custom’?‘مخصص ‘+from+’—’+to:(SHIFTS[sh]?.name||sh);
const msg={id:genId(),eid:emp.id,ename:emp.name,text:’📅 تم تعديل شفتك ليوم ‘+fmtD(_editDayDate)+’ إلى: ’+shName,date:todayStr(),time:fmtT(new Date()),ts:new Date().toISOString()};
const msgs=DB.get(‘msg’)||[];msgs.push(msg);DB.set(‘msg’,msgs);
sendTg(’📅 تعديل شفت\n👤 ‘+emp.name+’\nاليوم: ‘+fmtD(_editDayDate)+’\nالشفت: ’+shName);
}
renderAdmin();
showToast(‘✅ تم حفظ الشفت’,‘s’);
}

// ── renderMonthAttGrid fix (current month only) ──

// ── renderDayGrid fix (current month only) ──
function renderDayGrid(eid){
const c=document.getElementById(‘empDG’);if(!c)return;
const att=DB.get(‘att’)||[];
const leaveDays=DB.get(‘leaveDays’)||[];
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
let cls=future?‘f’:hasCI?‘p’:isLeave?‘lv’:‘f’;
days.push(’<div class="dc '+cls+'" title="'+fmtD(ds)+'">’+cur.getDate()+’</div>’);
cur.setDate(cur.getDate()+1);
}
c.innerHTML=days.join(’’);
}

// ── renderEmpAttPattern fix (current month only) ──
function renderEmpAttPattern(eid){
const c=document.getElementById(‘empAttPattern’);if(!c)return;
const att=DB.get(‘att’)||[];
const leaveDays=DB.get(‘leaveDays’)||[];
const now=new Date(),y=now.getFullYear(),m=now.getMonth();
const monthStart=new Date(y,m,1);
const monthEnd=new Date(y,m+1,0);
const today=new Date();today.setHours(23,59,59);
let cur=new Date(monthStart);
const dots=[];
while(cur<=monthEnd){
const ds=cur.toISOString().split(‘T’)[0];
const future=cur>today;
const has=att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘ci’);
const isLeave=leaveDays.some(l=>l.eid===eid&&l.date===ds)||att.some(a=>a.eid===eid&&a.date===ds&&a.type===‘leave’);
const cls=future?‘future’:has?‘present’:isLeave?‘on-leave’:‘future’;
dots.push(’<div class="att-dot '+cls+'" title="'+cur.toLocaleDateString('ar-IQ')+'">’+cur.getDate()+’</div>’);
cur.setDate(cur.getDate()+1);
}
c.innerHTML=dots.join(’’);
}

// ── shiftLabel updated ──
function shiftLabel(emp){
_reloadShifts();
if(emp.sh===‘custom’&&emp.customFrom&&emp.customTo)return’مخصص ‘+emp.customFrom+’—’+emp.customTo;
return(SHIFTS[emp.sh]||{name:emp.sh||‘غير محدد’}).name;
}

// ── Hook: add _checkAndPushSchedule to timer ──
const _origStartTimers=window.startTimers;
window.startTimers=function(){
_origStartTimers&&_origStartTimers();
setInterval(()=>{try{_checkAndPushSchedule();}catch(e){}},60000);
};

// ── Hook: restore custom shifts on load ──
document.addEventListener(‘DOMContentLoaded’,()=>{
setTimeout(()=>{
try{_reloadShifts();_restoreCustomShiftsDropdowns();}catch(e){}
try{renderShiftCards();}catch(e){}
},500);
});

function openShiftCustomBon(){
// Use cbModal but label it as shift bonus
document.querySelector(’#cbModal .mh h3’).textContent=‘🎯 حافز شفتات مخصص’;
document.getElementById(‘cbReason’).placeholder=‘مثال: شفت ليلي إضافي، تمديد دوام…’;
openModal(‘cbModal’);
}
