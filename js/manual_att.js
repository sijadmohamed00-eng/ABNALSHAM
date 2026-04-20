// ═══ manual_att.js ═══
function adminManualAtt(){
  const empId=document.getElementById('manAttEmp')?.value;
  const date=document.getElementById('manAttDate')?.value;
  const ciTime=document.getElementById('manAttCiTime')?.value||'09:00';
  const coTime=document.getElementById('manAttCoTime')?.value||'18:00';
  if(!empId||!date){showToast('اختر الموظف والتاريخ','e');return;}

  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===empId);
  if(!emp){showToast('الموظف غير موجود','e');return;}

  const att=DB.get('att')||[];

  // تحقق إذا مسجل مسبقاً
  const exists=att.some(a=>a.eid===empId&&a.date===date&&a.type==='ci');
  if(exists){
    showToast(`⚠️ ${emp.name} مسجل حضور بتاريخ ${date} مسبقاً`,'e');
    return;
  }

  const ciTs=new Date(date+'T'+ciTime+':00').toISOString();
  const coTs=new Date(date+'T'+coTime+':00').toISOString();
  const durMins=Math.round((new Date(coTs)-new Date(ciTs))/60000);

  att.push({id:genId(),eid:empId,ename:emp.name,type:'ci',date,time:ciTime,ts:ciTs,lat:0,lng:0,dist:0,manual:true,byAdmin:true});
  att.push({id:genId(),eid:empId,ename:emp.name,type:'co',date,time:coTime,ts:coTs,lat:0,lng:0,dist:0,durMins,manual:true,byAdmin:true});
  DB.set('att',att);

  addAdminLog('manual_att',`تسجيل حضور يدوي: ${emp.name} — ${date}`,{eid:empId,date});

  const fb=document.getElementById('manAttFeedback');
  if(fb){fb.textContent=`✅ تم تسجيل حضور ${emp.name} بتاريخ ${date} (${ciTime} – ${coTime})`;fb.style.display='block';setTimeout(()=>{fb.style.display='none';},4000);}

  showToast(`✅ تم تسجيل حضور ${emp.name}`,'s');
  renderAdminAtt();
  renderAdmin();
}

// فتح modal الأيام المتعددة
function adminManualAttMulti(){
  const empId=document.getElementById('manAttEmp')?.value;
  if(!empId){showToast('اختر موظفاً أولاً','e');return;}
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===empId);
  if(!emp)return;

  document.getElementById('manAttMultiEmpName').textContent=emp.name;

  // بناء قائمة أيام الفترة الحالية
  const per=getPeriod();
  const att=DB.get('att')||[];
  const ps=per.start.toISOString().split('T')[0];
  const pe=per.end.toISOString().split('T')[0];
  const registeredDays=new Set(att.filter(a=>a.eid===empId&&a.type==='ci').map(a=>a.date));

  const today=todayStr();
  const days=[];
  let cur=new Date(ps+'T00:00:00');
  const end=new Date(pe+'T00:00:00');
  while(cur<=end&&cur.toISOString().split('T')[0]<=today){
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate()+1);
  }

  const container=document.getElementById('manAttMultiDaysList');
  container.innerHTML=days.map(d=>{
    const isReg=registeredDays.has(d);
    const dayName=new Date(d+'T00:00:00').toLocaleDateString('ar-IQ',{weekday:'short',day:'numeric',month:'numeric'});
    return `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:${isReg?'default':'pointer'};background:${isReg?'rgba(0,230,118,.08)':'var(--bg3)'};border:1px solid ${isReg?'rgba(0,230,118,.3)':'var(--br)'};opacity:${isReg?'0.6':'1'}">
      <input type="checkbox" value="${d}" ${isReg?'checked disabled':''} style="accent-color:var(--green);width:15px;height:15px">
      <span style="font-size:12px;${isReg?'color:var(--green)':''}">${dayName}${isReg?' ✅':''}</span>
    </label>`;
  }).join('');

  // store empId on modal
  document.getElementById('manAttMultiModal').dataset.eid=empId;
  openModal('manAttMultiModal');
}

function selectAllMultiDays(){
  document.querySelectorAll('#manAttMultiDaysList input[type=checkbox]:not(:disabled)').forEach(cb=>cb.checked=true);
}
function clearAllMultiDays(){
  document.querySelectorAll('#manAttMultiDaysList input[type=checkbox]:not(:disabled)').forEach(cb=>cb.checked=false);
}

function confirmManualAttMulti(){
  const empId=document.getElementById('manAttMultiModal').dataset.eid;
  const ciTime=document.getElementById('manAttMultiCi')?.value||'09:00';
  const coTime=document.getElementById('manAttMultiCo')?.value||'18:00';
  const selected=[...document.querySelectorAll('#manAttMultiDaysList input[type=checkbox]:not(:disabled):checked')].map(cb=>cb.value);

  if(!selected.length){showToast('ما اخترت أي يوم','e');return;}

  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===empId);
  if(!emp)return;

  let att=DB.get('att')||[];
  let added=0;
  selected.forEach(date=>{
    const exists=att.some(a=>a.eid===empId&&a.date===date&&a.type==='ci');
    if(exists)return;
    const ciTs=new Date(date+'T'+ciTime+':00').toISOString();
    const coTs=new Date(date+'T'+coTime+':00').toISOString();
    const durMins=Math.round((new Date(coTs)-new Date(ciTs))/60000);
    att.push({id:genId(),eid:empId,ename:emp.name,type:'ci',date,time:ciTime,ts:ciTs,lat:0,lng:0,dist:0,manual:true,byAdmin:true});
    att.push({id:genId(),eid:empId,ename:emp.name,type:'co',date,time:coTime,ts:coTs,lat:0,lng:0,dist:0,durMins,manual:true,byAdmin:true});
    added++;
  });
  DB.set('att',att);
  addAdminLog('manual_att_multi',`تسجيل حضور يدوي متعدد: ${emp.name} — ${added} أيام`,{eid:empId,count:added});
  closeModal('manAttMultiModal');
  showToast(`✅ تم تسجيل ${added} يوم حضور لـ ${emp.name}`,'s');
  renderAdminAtt();
  renderAdmin();
}

// تعبئة قائمة الموظفين عند فتح تاب الحضور
const _origShowATab=window.showATab;
window.showATab=function(id,el){
  _origShowATab&&_origShowATab(id,el);
  if(id==='att'){
    _populateManAttEmps();
    // تعيين اليوم الحالي كافتراضي
    const di=document.getElementById('manAttDate');
    if(di&&!di.value)di.value=todayStr();
  }
};


// ══════════════════════════════════════════════════════
//  MONTH ATTENDANCE GRID — حضور الشهر الكامل
// ══════════════════════════════════════════════════════
function renderMonthAttGrid(emps,att,ps,pe,today){
  const grid=document.getElementById('monthAttGrid');
  const badge=document.getElementById('monthAttBadge');
  if(!grid)return;
  const leaveDays=DB.get('leaveDays')||[];
  const now2=new Date();
  const monthStart=new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0];
  // بناء أيام الشهر كله من اليوم 1
  const days=[];
  let cur=new Date(monthStart+'T00:00:00');
  const end=new Date(pe+'T00:00:00');
  while(cur<=end){
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate()+1);
  }
  let totalPresent=0, totalLeave=0;
  const dayStats=days.map(d=>{
    const pres=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===d&&a.type==='ci')).length;
    const onLeave=emps.filter(e=>leaveDays.some(l=>l.eid===e.id&&l.date===d)).length;
    if(d<=today){totalPresent+=pres;totalLeave+=onLeave;}
    return{d,pres,onLeave};
  });
  const passedDays=days.filter(d=>d<=today).length;
  if(badge)badge.textContent=`${totalPresent} تسجيل حضور في ${passedDays} يوم`;
  grid.innerHTML=dayStats.map(({d,pres,onLeave})=>{
    const isFuture=d>today;
    const dayNum=parseInt(d.split('-')[2]);
    let bg,color,title;
    if(isFuture){bg='var(--bg3)';color='var(--t3)';title=d;}
    else if(pres===emps.length&&emps.length>0){bg='rgba(0,230,118,.25)';color='var(--green)';title=`${d} — كل الموظفين حضروا`;}
    else if(pres>0&&onLeave>0){bg='rgba(240,192,64,.2)';color='var(--gold)';title=`${d} — ${pres} حضور + ${onLeave} إجازة`;}
    else if(pres>0){bg='rgba(240,192,64,.2)';color='var(--gold)';title=`${d} — ${pres}/${emps.length} حضروا`;}
    else if(onLeave>0){bg='rgba(206,147,216,.25)';color='var(--purple)';title=`${d} — ${onLeave} مجاز 🌴`;}
    else{bg='var(--bg3)';color='var(--t3)';title=`${d} — لا يوجد`;}
    return `<div title="${title}" style="width:30px;height:30px;border-radius:6px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:default">${dayNum}</div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  LEAVE MANAGEMENT — إدارة الإجازات من المدير
// ══════════════════════════════════════════════════════
function _populateLeaveMgmt(){
  const sel=document.getElementById('leaveMgmtEmp');
  const fsel=document.getElementById('leaveMgmtFilter');
  const emps=DB.get('emps')||[];
  if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  if(fsel&&fsel.options.length<=1)emps.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;fsel.appendChild(o);});
}

function addLeaveDayAdmin(){
  const eid=document.getElementById('leaveMgmtEmp')?.value;
  const date=document.getElementById('leaveMgmtDate')?.value;
  const paid=document.getElementById('leaveMgmtPaid')?.checked!==false;
  if(!eid||!date){showToast('اختر الموظف والتاريخ','e');return;}
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===eid);
  if(!emp)return;
  let leaves=DB.get('leaveDays')||[];
  if(leaves.some(l=>l.eid===eid&&l.date===date)){showToast('هذا اليوم مسجل مسبقاً','e');return;}
  // الإجازة المدفوعة تُحتسب كيوم واحد فقط (من leaveDays) — لا تُضاف لـ lvM لتجنب الحساب المزدوج
  leaves.push({id:genId(),eid,ename:emp.name,date,paid,addedAt:new Date().toISOString()});
  DB.set('leaveDays',leaves);
  // lvM للإجازات المطلوبة من الموظف نفسه فقط — هنا المدير يضيفها مباشرة بدون lvM
  addAdminLog('leave_add',`إجازة ${paid?'مدفوعة':'غير مدفوعة'}: ${emp.name} — ${date}`,{eid,date});
  showToast(`✅ تم تسجيل إجازة ${emp.name} — ${fmtD(date)}`,'s');
  renderLeaveMgmtList();
  renderAdmin();
}

function renderLeaveMgmtList(){
  const c=document.getElementById('leaveMgmtList');if(!c)return;
  let leaves=DB.get('leaveDays')||[];
  const ef=document.getElementById('leaveMgmtFilter')?.value||'';
  if(ef)leaves=leaves.filter(l=>l.eid===ef);
  leaves.sort((a,b)=>b.date.localeCompare(a.date));
  if(!leaves.length){c.innerHTML='<div class="empty"><div class="ei">🌴</div><p>لا توجد إجازات</p></div>';return;}
  c.innerHTML=leaves.map(l=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;gap:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="eav">${(l.ename||'?')[0]}</div>
        <div>
          <div style="font-size:13px;font-weight:700">${l.ename}</div>
          <div style="font-size:11px;color:var(--t3)">${fmtD(l.date)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;padding:3px 8px;border-radius:6px;${l.paid?'background:rgba(0,230,118,.1);color:var(--green)':'background:rgba(233,69,96,.1);color:var(--red)'}">${l.paid?'✅ مدفوعة':'❌ غير مدفوعة'}</span>
        <button class="btn btn-dn btn-sm btn-ic" onclick="deleteLeaveDay('${l.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function deleteLeaveDay(id){
  let leaves=DB.get('leaveDays')||[];
  const lv=leaves.find(l=>l.id===id);
  if(!lv)return;
  // إزالة من lvM إذا كانت مدفوعة
  if(lv.paid){
    const emps=DB.get('emps')||[];
    const ei=emps.findIndex(e=>e.id===lv.eid);
    if(ei!==-1&&emps[ei].lvM>0){emps[ei].lvM--;DB.set('emps',emps);}
  }
  leaves=leaves.filter(l=>l.id!==id);
  DB.set('leaveDays',leaves);
  renderLeaveMgmtList();
  renderAdmin();
  showToast('تم حذف الإجازة','i');
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE PHOTO — صورة الموظف
// ══════════════════════════════════════════════════════
function openPhotoUpload(){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/*';
  inp.onchange=function(e){
    const file=e.target.files[0];if(!file)return;
    if(file.size>2*1024*1024){showToast('الصورة أكبر من 2MB','e');return;}
    const reader=new FileReader();
    reader.onload=function(ev){
      if(!currentUser?.id)return;
      const emps=DB.get('emps')||[];
      const i=emps.findIndex(e=>e.id===currentUser.id);
      if(i===-1)return;
      emps[i].photo=ev.target.result;
      DB.set('emps',emps);
      updateEmpAvatar(emps[i]);
      showToast('✅ تم رفع الصورة','s');
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function updateEmpAvatar(emp){
  const av=document.getElementById('empAvBig');
  if(!av)return;
  if(emp.photo){
    av.style.background='none';
    av.innerHTML=`<img src="${emp.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
  }else{
    av.style.background='linear-gradient(135deg,var(--gold),var(--gold2))';
    av.innerHTML=emp.name?emp.name[0]:'م';
  }
}

// ══════════════════════════════════════════════════════
//  9AM ABSENT ALERT — تنبيه من لم يبصم
// ══════════════════════════════════════════════════════
let _absentAlertShown=false;
function check9amAbsent(){
  const now=new Date();
  const h=now.getHours(),mn=now.getMinutes();
  if(h!==9||mn>5)return;
  const today=todayStr();
  const key='absent9_'+today;
  if(DB.get(key))return;
  DB.set(key,1);
  _absentAlertShown=false;
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const leaveDays=DB.get('leaveDays')||[];
  const notCheckedIn=emps.filter(e=>{
    const hasCi=att.some(a=>a.eid===e.id&&a.date===today&&a.type==='ci');
    const onLeave=leaveDays.some(l=>l.eid===e.id&&l.date===today);
    return !hasCi&&!onLeave;
  });
  if(!notCheckedIn.length)return;
  // فتح موديل السؤال
  const modal=document.getElementById('absentAlertModal');
  if(!modal)return;
  document.getElementById('absentAlertList').innerHTML=notCheckedIn.map(e=>`
    <div style="background:var(--bg3);border:1px solid var(--br);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px">👤 ${e.name}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-dn btn-sm" onclick="markAbsent9('${e.id}')">❌ غائب (يُخصم)</button>
        <button class="btn btn-ok btn-sm" onclick="markLeave9('${e.id}','paid')">🌴 مجاز مدفوع</button>
        <button class="btn btn-sc btn-sm" onclick="markLeave9('${e.id}','unpaid')">🌴 مجاز بدون يومية</button>
        <button class="btn btn-wa btn-sm" onclick="skipAlert9('${e.id}')">⏭️ تخطي</button>
      </div>
    </div>`).join('');
  openModal('absentAlertModal');
}

function markAbsent9(eid){
  // غائب — لا حاجة لإجراء، الغياب محسوب تلقائياً
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===eid);
  addAdminLog('absent_marked',`تأكيد غياب: ${emp?.name||eid}`,{eid,date:todayStr()});
  _removeAbsent9Row(eid);
  showToast(`❌ تم تسجيل غياب ${emp?.name}`,'i');
  renderAdmin();
}

function markLeave9(eid,type){
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===eid);if(!emp)return;
  const today=todayStr();
  let leaves=DB.get('leaveDays')||[];
  if(!leaves.some(l=>l.eid===eid&&l.date===today)){
    const paid=type==='paid';
    leaves.push({id:genId(),eid,ename:emp.name,date:today,paid,addedAt:new Date().toISOString()});
    DB.set('leaveDays',leaves);
    if(paid){
      const ei=emps.findIndex(e=>e.id===eid);
      if(ei!==-1){emps[ei].lvM=(emps[ei].lvM||0)+1;DB.set('emps',emps);}
    }
  }
  addAdminLog('leave_9am',`إجازة من تنبيه 9ص: ${emp.name} — ${type==='paid'?'مدفوعة':'بدون يومية'}`,{eid});
  _removeAbsent9Row(eid);
  showToast(`🌴 تم تسجيل إجازة ${emp.name}`,'s');
  renderAdmin();
}

function skipAlert9(eid){_removeAbsent9Row(eid);}

function _removeAbsent9Row(eid){
  const row=document.querySelector(`#absentAlertList [onclick*="${eid}"]`);
  if(row){const parent=row.closest('div[style*="border-radius:10px"]');if(parent)parent.remove();}
  const list=document.getElementById('absentAlertList');
  if(list&&!list.children.length)closeModal('absentAlertModal');
}

// ══════════════════════════════════════════════════════
//  NEW SALES — إحصائيات المبيعات الجديدة (فيس/انستا/واتساب)
