// ═══ shifts.js ═══
function renderShiftSchedule(){
  const c=document.getElementById('shiftScheduleGrid'); if(!c)return;
  const offset=parseInt(document.getElementById('shWeekOffset')?.value||'0');
  const emps=DB.get('emps')||[];
  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date(); d.setDate(d.getDate()+offset+i);
    days.push(d);
  }
  const dayNames=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  const todayStr2=todayStr();
  let html=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="text-align:right;padding:8px 10px;color:var(--t3);border-bottom:1px solid var(--br);white-space:nowrap;min-width:90px">الموظف</th>
      ${days.map(d=>{
        const ds=d.toISOString().split('T')[0];
        const isToday=ds===todayStr2;
        return `<th style="text-align:center;padding:8px 6px;border-bottom:1px solid var(--br);white-space:nowrap;min-width:110px;${isToday?'background:rgba(0,229,255,.06)':''}">
          <div style="font-size:10px;color:${isToday?'var(--cyan)':'var(--t3)'};">${dayNames[d.getDay()]}</div>
          <div style="font-weight:800;color:${isToday?'var(--cyan)':'var(--t1)'}">${d.getDate()}/${d.getMonth()+1}</div>
          ${isToday?'<div style="font-size:9px;color:var(--cyan)">اليوم</div>':''}
        </th>`;
      }).join('')}
    </tr></thead>
    <tbody>
    ${emps.map(e=>`<tr>
      <td style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#1a1200;flex-shrink:0">${e.name[0]}</div>
          <span style="font-weight:600;font-size:11px;white-space:nowrap">${e.name}</span>
        </div>
      </td>
      ${days.map(d=>{
        const ds=d.toISOString().split('T')[0];
        const isToday=ds===todayStr2;
        const dayShift=getEmpShiftForDay(e,ds);
        const sh=SHIFTS[dayShift.sh]||{};
        const from=dayShift.sh==='custom'?(dayShift.customFrom||'--'):(sh.s||'--');
        const to=dayShift.sh==='custom'?(dayShift.customTo||'--'):(sh.e||'--');
        const shName=dayShift.sh==='custom'?'مخصص':sh.name||dayShift.sh;
        return `<td style="text-align:center;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.04);${isToday?'background:rgba(0,229,255,.04)':''}">
          <div style="background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.18);border-radius:8px;padding:5px 3px;cursor:pointer;transition:.15s"
               onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')"
               title="اضغط لتعديل الشفت">
            <div style="font-size:9px;font-weight:700;color:var(--gold)">${shName}</div>
            <div style="font-size:9px;color:var(--green)">${from}</div>
            <div style="font-size:9px;color:var(--cyan)">${to}</div>
            <div style="font-size:8px;color:var(--t3);margin-top:2px">✏️ تعديل</div>
          </div>
        </td>`;
      }).join('')}
    </tr>`).join('')}
    </tbody></table></div>`;
  c.innerHTML=html;
}

// فتح موديل تعديل شفت يوم محدد
let _editDayEmpId='',_editDayDate='';
function openDayShiftEdit(empId,empName,dateStr){
  _editDayEmpId=empId; _editDayDate=dateStr;
  const emp=(DB.get('emps')||[]).find(e=>e.id===empId);
  const cur=getEmpShiftForDay({id:empId,sh:emp?.sh||'',customFrom:emp?.customFrom||'',customTo:emp?.customTo||''},dateStr);
  document.getElementById('dseTitle').textContent=`✏️ ${empName} — ${fmtD(dateStr)}`;
  document.getElementById('dseShift').value=cur.sh;
  document.getElementById('dseCustomWrap').style.display=cur.sh==='custom'?'flex':'none';
  document.getElementById('dseFrom').value=cur.customFrom||'';
  document.getElementById('dseTo').value=cur.customTo||'';
  openModal('dayShiftEditModal');
}
function saveDayShiftEdit(){
  const sh=document.getElementById('dseShift').value;
  const from=document.getElementById('dseFrom').value;
  const to=document.getElementById('dseTo').value;
  saveDailyShift(_editDayEmpId,_editDayDate,sh,from,to);
  closeModal('dayShiftEditModal');
  renderShiftSchedule();
  // أشعر الموظف
  const emp=(DB.get('emps')||[]).find(e=>e.id===_editDayEmpId);
  if(emp){
    const shName=sh==='custom'?`مخصص ${from}—${to}`:(SHIFTS[sh]?.name||sh);
    const msg={id:genId(),eid:emp.id,ename:emp.name,
      text:`📅 تم تعديل شفتك ليوم ${fmtD(_editDayDate)} إلى: ${shName}`,
      date:todayStr(),time:fmtT(new Date()),ts:new Date().toISOString()};
    const msgs=DB.get('msg')||[];msgs.push(msg);DB.set('msg',msgs);
    sendTg(`📅 تعديل شفت\n👤 ${emp.name}\nاليوم: ${fmtD(_editDayDate)}\nالشفت: ${shName}`);
  }
  showToast('✅ تم تعديل الشفت اليومي','s');
}

// جدول الدوام للموظف (عرض للقراءة فقط)
function renderEmpSchedule(){
  const c=document.getElementById('empScheduleView'); if(!c)return;
  const emp=getEmp(); if(!emp){c.innerHTML='';return;}
  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date(); d.setDate(d.getDate()+i);
    days.push(d);
  }
  const dayNames=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const todayStr2=todayStr();
  c.innerHTML=`
    <div style="margin-bottom:12px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.15);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--t2)">
      📌 جدول دوامك لـ 7 أيام القادمة — يمكن للمدير تعديله يومياً
    </div>
    ${days.map(d=>{
      const ds=d.toISOString().split('T')[0];
      const isToday=ds===todayStr2;
      const dayShift=getEmpShiftForDay(emp,ds);
      const sh=SHIFTS[dayShift.sh]||{};
      const from=dayShift.sh==='custom'?(dayShift.customFrom||'--'):(sh.s||'--');
      const to=dayShift.sh==='custom'?(dayShift.customTo||'--'):(sh.e||'--');
      const shName=dayShift.sh==='custom'?'وقت مخصص':sh.name||dayShift.sh;
      const isFull=sh.full||false;
      return `<div style="background:${isToday?'rgba(0,229,255,.08)':'var(--bg2)'};border:${isToday?'2px solid rgba(0,229,255,.4)':'1px solid var(--br)'};border-radius:14px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:14px;font-weight:800;color:${isToday?'var(--cyan)':'var(--t1)'}">${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth()+1} ${isToday?'<span style="color:var(--cyan);font-size:11px">(اليوم)</span>':''}</div>
            <div style="font-size:16px;font-weight:900;color:var(--gold);margin-top:4px">${shName}</div>
          </div>
          <div style="text-align:left">
            <div style="font-size:13px;font-weight:700;color:var(--green)">⏰ ${from} — ${to}</div>
            <div style="font-size:11px;color:${isFull?'var(--gold)':'var(--cyan)'};margin-top:4px">${isFull?'⭐ دوام كامل (+10,000)':'دوام نصفي'}</div>
          </div>
        </div>
      </div>`;
    }).join('')}`;
}

function archiveShiftSchedule(){
  const offset=parseInt(document.getElementById('shWeekOffset')?.value||'0');
  const emps=DB.get('emps')||[];
  const startDay=new Date(); startDay.setDate(startDay.getDate()+offset);
  const endDay=new Date(); endDay.setDate(endDay.getDate()+offset+6);
  const label=`${startDay.getDate()}/${startDay.getMonth()+1} — ${endDay.getDate()}/${endDay.getMonth()+1}/${endDay.getFullYear()}`;
  const shiftArchives=DB.get('shiftArchives')||[];
  shiftArchives.unshift({
    id:genId(), label, archivedAt:new Date().toISOString(),
    emps:emps.map(e=>({id:e.id,name:e.name,sh:e.sh,customFrom:e.customFrom,customTo:e.customTo}))
  });
  if(shiftArchives.length>20)shiftArchives.length=20;
  DB.set('shiftArchives',shiftArchives);
  renderShiftArchive();
  showToast(`✅ تم أرشفة جدول: ${label}`,'s');
}

function renderShiftArchive(){
  const c=document.getElementById('shiftArchiveList'); if(!c)return;
  const archives=DB.get('shiftArchives')||[];
  if(!archives.length){c.innerHTML='<div class="empty"><div class="ei">📅</div><p>لا توجد جداول مؤرشفة</p></div>';return;}
  c.innerHTML=archives.map(a=>`
    <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:var(--purple)">📅 ${a.label}</div>
        <div style="font-size:10px;color:var(--t3)">${new Date(a.archivedAt).toLocaleDateString('ar-IQ')}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(a.emps||[]).map(e=>`<span style="font-size:10px;background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.15);border-radius:6px;padding:3px 8px;color:var(--gold)">${e.name}: ${SHIFTS[e.sh]?.name||e.sh||'مخصص'}</span>`).join('')}
      </div>
    </div>`).join('');
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
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    try{renderShiftSchedule();}catch(e){}
    try{renderShiftArchive();}catch(e){}
  },2000);
});

  window.addEventListener('load',()=>{
    console.log('PWA ready');
  });

// ══════════════════════════════════════════════════════
//  PENDING BADGES — أرقام الإشعارات على الخانات
// ══════════════════════════════════════════════════════
function updatePendingBadges(){
  // إجازات معلقة
  const leaves=(DB.get('leaveRequests')||[]).filter(r=>r.status==='pending').length;
  _setBadge('sideLeaveCount', leaves);
  _setBadge('mnavLeaveCount', leaves);

  // سلف معلقة
  const loans=(DB.get('loanRequests')||[]).filter(l=>l.status==='pending').length;
  _setBadge('sideLoanCount', loans);
  _setBadge('mnavLoanCount', loans);

  // رسائل غير مقروءة (من الموظفين للمدير)
  const msgs=(DB.get('empToAdminMsg')||[]).filter(m=>!m.readByAdmin).length;
  // أيضاً رسائل الدردشة الجماعية غير المقروءة
  const lastSeen=parseInt(localStorage.getItem('groupchatLastSeen')||'0');
  const chatMsgs=(DB.get('groupchat')||[]).filter(m=>m.uid!=='admin'&&new Date(m.ts).getTime()>lastSeen).length;
  const totalMsgs=msgs+chatMsgs;
  _setBadge('sideMsgCount', totalMsgs);
  _setBadge('mnavMsgCount', totalMsgs);
}

function _setBadge(id, count){
  const el=document.getElementById(id);
  if(!el)return;
  if(count>0){
    el.textContent=count>99?'99+':count;
    el.style.display='';
  } else {
    el.textContent='';
    el.style.display='none';
  }
}

// تحديث الـ badges كل 30 ثانية تلقائياً
setInterval(()=>{try{updatePendingBadges();}catch(e){}}, 30000);

// ══════════════════════════════════════════════════════
//  MANUAL ATTENDANCE — تسجيل حضور يدوي من المدير
// ══════════════════════════════════════════════════════

function _populateManAttEmps(){
  const sel=document.getElementById('manAttEmp'); if(!sel)return;
  const emps=DB.get('emps')||[];
  sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
}

// تسجيل يوم واحد
