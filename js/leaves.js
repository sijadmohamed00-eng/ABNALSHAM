// ═══ leaves.js ═══
function submitLeaveRequest(){
  const emp=getEmp();if(!emp)return;
  const type=document.getElementById('leaveTypeEmp').value;
  const date=document.getElementById('leaveDateEmp').value;
  const reason=document.getElementById('leaveReasonEmp').value.trim();
  if(!date){showToast('اختر التاريخ','e');return;}
  const req={id:genId(),eid:emp.id,ename:emp.name,type,date,reason,status:'pending',ts:new Date().toISOString(),requestedAt:fmtT(new Date())};
  const leaves=DB.get('leaveRequests')||[];leaves.push(req);DB.set('leaveRequests',leaves);
  sendTg(`🌴 طلب إجازة جديد\n👤 ${emp.name}\nالنوع: ${type}\nالتاريخ: ${fmtD(date)}\nالسبب: ${reason||'—'}`);
  playNotifSound('msg');
  document.getElementById('leaveDateEmp').value='';document.getElementById('leaveReasonEmp').value='';
  renderEmpLeaveHistory();
  showToast('✅ تم إرسال طلب الإجازة للمدير','s');
}
function renderEmpLeaveHistory(){
  const c=document.getElementById('empLeaveHistory');if(!c)return;
  const emp=getEmp();if(!emp){c.innerHTML='';return;}
  const leaves=(DB.get('leaveRequests')||[]).filter(r=>r.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!leaves.length){c.innerHTML='<div class="empty"><div class="ei">🌴</div><p>لا توجد طلبات</p></div>';return;}
  const statusMap={pending:'⏳ انتظار',approved:'✅ موافق',rejected:'❌ مرفوض'};
  const colMap={pending:'var(--gold)',approved:'var(--green)',rejected:'var(--red)'};
  c.innerHTML=leaves.map(r=>`
    <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <div><div style="font-size:13px;font-weight:700">${r.type} — ${fmtD(r.date)}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">${r.reason||''}</div></div>
        <span style="font-size:11px;font-weight:700;color:${colMap[r.status]}">${statusMap[r.status]}</span>
      </div>
      ${r.adminNote?`<div style="font-size:11px;color:var(--t2);margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06)">📝 المدير: ${r.adminNote}</div>`:''}
    </div>`).join('');
}
function renderLeaveRequests(){
  // Pending
  const pending=document.getElementById('leavePendingList');
  const archived=document.getElementById('leaveArchivedList');
  const cntEl=document.getElementById('leavePendingCount');
  const all=DB.get('leaveRequests')||[];
  const pend=all.filter(r=>r.status==='pending').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const done=all.filter(r=>r.status!=='pending').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(cntEl)cntEl.textContent=pend.length;
  if(pending){
    pending.innerHTML=pend.length?pend.map(r=>`
      <div style="background:var(--bg3);border:1px solid rgba(240,192,64,.2);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div><div style="font-size:14px;font-weight:700">👤 ${r.ename}</div>
          <div style="font-size:12px;color:var(--t2);margin-top:4px">${r.type} — ${fmtD(r.date)}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${r.reason||'—'}</div></div>
          <div class="flex g8">
            <button class="btn btn-ok btn-sm" onclick="respondLeave('${r.id}','approved')">✅ موافقة</button>
            <button class="btn btn-dn btn-sm" onclick="respondLeave('${r.id}','rejected')">❌ رفض</button>
          </div>
        </div>
      </div>`).join(''):'<div class="empty"><div class="ei">🌴</div><p>لا توجد طلبات معلقة</p></div>';
  }
  if(archived){
    const statusMap={approved:'✅ موافق',rejected:'❌ مرفوض'};
    const colMap={approved:'var(--green)',rejected:'var(--red)'};
    archived.innerHTML=done.length?done.map(r=>`
      <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <div><div style="font-size:13px;font-weight:600">${r.ename} — ${r.type} — ${fmtD(r.date)}</div>
        <div style="font-size:11px;color:var(--t3)">${r.reason||''}</div></div>
        <span style="font-size:12px;font-weight:700;color:${colMap[r.status]}">${statusMap[r.status]}</span>
      </div>`).join(''):'<div class="empty"><div class="ei">📋</div><p>لا توجد طلبات منتهية</p></div>';
  }
}
function respondLeave(id,status){
  const leaves=DB.get('leaveRequests')||[];
  const i=leaves.findIndex(r=>r.id===id);if(i===-1)return;
  leaves[i].status=status;leaves[i].respondedAt=fmtT(new Date());
  DB.set('leaveRequests',leaves);
  const r=leaves[i];
  // إضافة إجازة تلقائياً إذا وافق
  if(status==='approved'){
    const emps=DB.get('emps')||[];
    const ei=emps.findIndex(e=>e.id===r.eid);
    if(ei!==-1){
      const per=getPeriod();const lvKey='lvM';
      emps[ei][lvKey]=(emps[ei][lvKey]||0)+1;
      DB.set('emps',emps);
    }
    sendTg(`✅ تمت الموافقة على إجازة ${r.ename}\nالتاريخ: ${fmtD(r.date)}`);
  } else {
    sendTg(`❌ تم رفض طلب إجازة ${r.ename}\nالتاريخ: ${fmtD(r.date)}`);
  }
  addAdminLog('leave_'+status,`${status==='approved'?'موافقة':'رفض'} إجازة ${r.ename}`,{date:r.date});
  renderLeaveRequests();renderAdmin();updatePendingBadges();
  showToast(status==='approved'?'✅ تمت الموافقة':'❌ تم الرفض','s');
}

// ── جدول الغد ──
function renderTomorrowSchedule(){
  // تم استبدال جدول الغد بجدول الأسبوع الكامل
  try{renderShiftSchedule();renderShiftArchive();}catch(e){}
}

// ── تصدير Excel للحضور ──
function exportAttExcel(){
  const att=DB.get('att')||[];
  const df=document.getElementById('attDate')?.value||'';
  let data=df?att.filter(a=>a.date===df):att;
  data=data.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  let csv='الموظف,النوع,التاريخ,الوقت,المسافة (م)\n';
  data.forEach(a=>{
    csv+=`${a.ename||''},${a.type==='ci'?'حضور':'انصراف'},${a.date},${a.time},${a.dist||''}\n`;
  });
  const bom='\uFEFF';
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;
  link.download=`حضور-${df||todayStr()}.csv`;link.click();
  showToast('✅ تم تصدير Excel','s');
}

// ── تصدير رواتب Excel ──
function exportSalaryExcel(){
  const emps=DB.get('emps')||[];
  let csv='الموظف,الراتب الشهري,الحضور,الإجمالي المكتسب,الحوافز,الخصومات,الصافي\n';
  emps.forEach(e=>{
    const c=calcSalary(e);
    csv+=`${e.name},${e.sal},${c.daysPresent},${c.earnedSalary},${c.totalBon},${c.totalDed},${c.net}\n`;
  });
  const bom='\uFEFF';
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;
  link.download=`رواتب-${todayStr()}.csv`;link.click();
  showToast('✅ تم تصدير Excel','s');
}

// ── إحصائيات المبيعات/الطلبات ──
function addSaleRecord(){
  const eid=document.getElementById('saleEmpSel').value;
  const platform=document.getElementById('salePlatform').value;
  const subscribed=document.getElementById('saleSubscribed').value==='yes';
  const amount=parseInt(document.getElementById('saleAmount').value)||0;
  const note=document.getElementById('saleNote').value.trim();
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===eid);if(!emp)return;
  const now=new Date();
  const rec={id:genId(),eid,ename:emp.name,platform,subscribed,amount,note,date:todayStr(),time:fmtT(now),ts:now.toISOString()};
  const sales=DB.get('salesLog')||[];sales.push(rec);DB.set('salesLog',sales);
  closeModal('addSaleModal');
  document.getElementById('saleNote').value='';
  document.getElementById('saleAmount').value='';
  renderSalesLog();renderSalesToday();
  showToast(`✅ تم تسجيل طلب ${platform} — ${emp.name}`,'s');
}
function renderSalesToday(){
  const c=document.getElementById('salesTodaySummary');if(!c)return;
  const lbl=document.getElementById('salesTodayLabel');
  const today=todayStr();
  if(lbl)lbl.textContent=fmtD(today);
  const sales=(DB.get('salesLog')||[]).filter(s=>s.date===today);
  const emps=DB.get('emps')||[];
  if(!sales.length){c.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📦</div><p>لا توجد طلبات اليوم</p></div>';return;}
  const byEmp={};
  sales.forEach(s=>{
    if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,eid:s.eid,total:0,subs:0,subAmt:0,platforms:{},records:[]};
    byEmp[s.eid].total++;
    if(s.subscribed){byEmp[s.eid].subs++;byEmp[s.eid].subAmt+=(s.amount||0);}
    byEmp[s.eid].platforms[s.platform]=(byEmp[s.eid].platforms[s.platform]||0)+1;
    byEmp[s.eid].records.push(s);
  });
  const platColors={'سفري':'rgba(240,192,64,.15)','دلفري':'rgba(255,152,0,.15)','واتساب':'rgba(0,230,118,.15)','انستقرام':'rgba(206,147,216,.15)','فيسبوك':'rgba(66,165,245,.15)','حضوري':'rgba(0,229,255,.15)'};
  const platText={'سفري':'var(--gold)','دلفري':'var(--orange)','واتساب':'var(--green)','انستقرام':'var(--purple)','فيسبوك':'var(--blue)','حضوري':'var(--cyan)'};
  c.innerHTML=`<div style="padding:12px 16px">${Object.values(byEmp).map(e=>`
    <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <div style="font-size:14px;font-weight:800">${e.name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="background:rgba(0,229,255,.1);color:var(--cyan);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">إجمالي: ${e.total}</span>
          <span style="background:rgba(0,230,118,.1);color:var(--green);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">مشتركين: ${e.subs}</span>
          ${e.subAmt?`<span style="background:rgba(240,192,64,.1);color:var(--gold);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">💰 ${fmtN(e.subAmt)} د.ع</span>`:''}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${Object.entries(e.platforms).map(([p,n])=>`<span style="background:${platColors[p]||'rgba(255,255,255,.05)'};color:${platText[p]||'var(--t1)'};padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700">${p}: ${n}</span>`).join('')}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,.05);padding-top:8px">
        ${e.records.map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03);flex-wrap:wrap;gap:4px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="background:${platColors[r.platform]||'rgba(255,255,255,.05)'};color:${platText[r.platform]||'var(--t1)'};padding:2px 8px;border-radius:5px;font-size:11px">${r.platform}</span>
            ${r.subscribed?'<span style="color:var(--green);font-size:11px">✅ مشترك</span>':'<span style="color:var(--red);font-size:11px">❌</span>'}
            ${r.amount?`<span style="color:var(--gold);font-size:11px;font-weight:700">${fmtN(r.amount)} د.ع</span>`:''}
            ${r.note?`<span style="color:var(--t3);font-size:10px">${r.note}</span>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:var(--t3);font-size:10px">${r.time}</span>
            <button class="btn btn-sc btn-sm btn-ic" onclick="editSaleRecord('${r.id}')" style="padding:3px 6px;font-size:10px">✏️</button>
            <button class="btn btn-dn btn-sm btn-ic" onclick="deleteSaleRecord('${r.id}')" style="padding:3px 6px;font-size:10px">🗑️</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}
function renderSalesLog(){
  const c=document.getElementById('salesLogList');if(!c)return;
  let sales=DB.get('salesLog')||[];
  const ef=document.getElementById('salesEmpFilter')?.value||'';
  const df=document.getElementById('salesDateFilter')?.value||'';
  if(ef)sales=sales.filter(s=>s.eid===ef);
  if(df)sales=sales.filter(s=>s.date===df);
  sales.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!sales.length){c.innerHTML='<div class="empty" style="padding:20px"><div class="ei">📦</div><p>لا توجد سجلات</p></div>';return;}
  c.innerHTML=`<div class="tw"><table><thead><tr><th>الموظف</th><th>المنصة</th><th>مشترك؟</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th><th>إجراء</th></tr></thead><tbody>
  ${sales.map(s=>`<tr>
    <td><div class="tname"><div class="eav">${(s.ename||'?')[0]}</div>${s.ename}</div></td>
    <td><span style="font-weight:700">${s.platform}</span></td>
    <td>${s.subscribed?'<span class="tag tp">✅ نعم</span>':'<span class="tag ta">❌ لا</span>'}</td>
    <td>${s.amount?`<span class="tgld bold">${fmtN(s.amount)} د.ع</span>`:'—'}</td>
    <td>${fmtD(s.date)} <span style="color:var(--t3);font-size:10px">${s.time||''}</span></td>
    <td style="color:var(--t3);font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis">${s.note||'—'}</td>
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
  if(CU?.role!=='emp')return;
  const emp=getEmp();if(!emp)return;
  const now=new Date();
  const h=now.getHours(), mn=now.getMinutes();
  const totalMin=h*60+mn;
  const sh=SHIFTS[emp.sh];
  if(!sh||!sh.s)return;
  const [sh_h,sh_m]=sh.s.split(':').map(Number);
  const [se_h,se_m]=sh.e.split(':').map(Number);
  const shiftStartMin=sh_h*60+sh_m;
  let shiftEndMin=se_h*60+se_m;
  if(shiftEndMin<shiftStartMin)shiftEndMin+=24*60; // crosses midnight
  const today=todayStr();
  // قبل الدوام بساعة
  const alertKey1=today+'_pre60';
  if(!_smartAlertLast[alertKey1]&&totalMin===shiftStartMin-60){
    _smartAlertLast[alertKey1]=1;
    showToast('⏰ دوامك بعد ساعة، لا تنسى!','i');
    playNotifSound('alert');
    sendBrowserNotif('تذكير الدوام','دوامك بعد ساعة، استعد!');
  }
  // وقت الدوام الآن
  const alertKey2=today+'_start';
  if(!_smartAlertLast[alertKey2]&&totalMin===shiftStartMin){
    _smartAlertLast[alertKey2]=1;
    showToast('🔔 وقت الدوام الآن! سجّل حضورك','i');
    playNotifSound('alert');
    sendBrowserNotif('وقت الدوام','حان وقت الدوام، سجّل حضورك الآن!');
  }
  // قبل نهاية الدوام 30 دقيقة - تنبيه فقط إذا الموظف مسجل حضور ولم ينصرف
  const alertKey3=today+'_end30';
  const adjustedEnd=shiftEndMin>shiftStartMin?shiftEndMin:shiftEndMin+24*60;
  const totalMinAdj=totalMin<shiftStartMin?totalMin+24*60:totalMin;
  if(!_smartAlertLast[alertKey3]&&totalMinAdj===adjustedEnd-30){
    _smartAlertLast[alertKey3]=1;
    // فحص: هل هو مسجل حضور ولم ينصرف؟
    const empAtt2=DB.get('att')||[];
    const allCI2=empAtt2.filter(a=>a.eid===emp.id&&a.type==='ci').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    const openCI2=allCI2.find(c=>!empAtt2.find(co2=>co2.eid===emp.id&&co2.type==='co'&&co2.date===c.date));
    if(openCI2){
      // تحذير لطيف - مش إجباري
      showToast('⏰ باقي 30 دقيقة على نهاية شفتك','i');
      sendBrowserNotif('نهاية الشفت قريبة','باقي 30 دقيقة - سجّل انصرافك وقتك');
    }
  }
  // بعد نهاية الدوام 15 دقيقة - تذكير بلطف فقط
  const alertKey4=today+'_overdue15';
  if(!_smartAlertLast[alertKey4]&&totalMinAdj===adjustedEnd+15){
    _smartAlertLast[alertKey4]=1;
    const empAtt3=DB.get('att')||[];
    const allCI3=empAtt3.filter(a=>a.eid===emp.id&&a.type==='ci').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    const openCI3=allCI3.find(c=>!empAtt3.find(co3=>co3.eid===emp.id&&co3.type==='co'&&co3.date===c.date));
    if(openCI3){
      showToast('📌 تجاوزت وقت الشفت — يمكنك تسجيل الانصراف حين تريد','i');
      // لا صوت تحذيري - الموظف قد يكون شغال بظروف
    }
  }
}

// ── إشعارات المتصفح ──
function requestBrowserNotif(){
  if('Notification' in window&&Notification.permission!=='granted'){
    Notification.requestPermission();
  }
}
function sendBrowserNotif(title,body){
  if('Notification' in window&&Notification.permission==='granted'){
    new Notification('👑 سندريلا — '+title,{body,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👑</text></svg>'});
  }
}

// ── التقرير الأسبوعي (كل جمعة) ──
function checkWeeklyReport(){
  const now=new Date();
  if(now.getDay()!==5)return; // الجمعة
  const today=todayStr();
  const lastWeekly=DB.get('lastWeeklyReport')||'';
  if(lastWeekly===today)return;
  DB.set('lastWeeklyReport',today);
  buildWeeklyReport();
}
function buildWeeklyReport(){
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const now=new Date();
  // آخر 7 أيام
  const days=[];
  for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  let text=`📊 التقرير الأسبوعي — سندريلا\n`;
  text+=`الأسبوع: ${fmtD(days[0])} — ${fmtD(days[6])}\n`;
  text+=`━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  emps.forEach(e=>{
    const pres=days.filter(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type==='ci'));
    const c=calcSalary(e);
    text+=`👤 ${e.name}\n`;
    text+=`  حضور الأسبوع: ${pres.length}/7 أيام\n`;
    text+=`  الحوافز: +${fmtN(c.totalBon)} د.ع\n`;
    text+=`  الإجمالي حتى الآن: ${fmtN(c.net)} د.ع\n\n`;
  });
  sendTg(text);
  saveReportToArchive(text,'weekly');
}

// ══════════════════════════════════════════════════════
//  GROUP CHAT — الدردشة الجماعية
// ══════════════════════════════════════════════════════
function sendChatMsg(){
  const inp=document.getElementById('empChatInput');
  const text=(inp?.value||'').trim();
  if(!text)return;
  const emp=getEmp();if(!emp)return;
  const now=new Date();
  const msg={id:genId(),uid:emp.id,uname:emp.name,role:'emp',text,ts:now.toISOString(),time:fmtT(now),date:todayStr()};
  const chat=DB.get('groupChat')||[];chat.push(msg);DB.set('groupChat',chat);
  inp.value='';
  renderEmpChat();renderAdminChat();
  playNotifSound('msg');
}
function sendAdminChatMsg(){
  const inp=document.getElementById('adminChatInput');
  const text=(inp?.value||'').trim();
  if(!text)return;
  const now=new Date();
  const msg={id:genId(),uid:'admin',uname:'المدير 👑',role:'admin',text,ts:now.toISOString(),time:fmtT(now),date:todayStr()};
  const chat=DB.get('groupChat')||[];chat.push(msg);DB.set('groupChat',chat);
  inp.value='';
  renderEmpChat();renderAdminChat();
  playNotifSound('msg');
}
function renderEmpChat(){
  const c=document.getElementById('empChatMessages');if(!c)return;
  const emp=getEmp();
  const chat=(DB.get('groupChat')||[]).slice(-100);
  if(!chat.length){c.innerHTML='<div style="text-align:center;color:var(--t3);padding:30px;font-size:12px">لا توجد رسائل بعد. كن أول من يبدأ! 💬</div>';return;}
  c.innerHTML=chat.map(m=>{
    const mine=emp&&m.uid===emp.id;
    const isAdmin=m.role==='admin';
    const canDelete=mine;
    const av=getEmpAvatar(m.uid,m.uname,32);
    const delBtn=canDelete?`<button onclick="deleteChatMsg('${m.id}','emp')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--red);opacity:.6;padding:2px 4px;margin-top:2px" title="حذف">🗑️</button>`:'';
    if(mine){
      return `<div class="chat-bubble mine" style="display:flex;flex-direction:column;align-items:flex-end">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span class="chat-sender" style="font-size:10px">أنت</span>
          ${av}
        </div>
        <div>${m.text}</div>
        <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div>
      </div>`;
    }
    return `<div class="chat-bubble ${isAdmin?'other admin-bubble':'other'}" style="display:flex;flex-direction:column;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        ${av}
        <span class="chat-sender ${isAdmin?'admin-s':''}" style="font-size:10px">${m.uname}</span>
      </div>
      <div>${m.text}</div>
      <div class="chat-time">${m.time}</div>
    </div>`;
  }).join('');
  c.scrollTop=c.scrollHeight;
}
