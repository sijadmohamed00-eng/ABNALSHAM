function buildReportText(type='manual'){
  const emps=DB.get('emps')||[], att=DB.get('att')||[], today=todayStr();
  const pres=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===today&&a.type==='ci'));
  const abs=emps.filter(e=>!att.some(a=>a.eid===e.id&&a.date===today&&a.type==='ci'));
  const per=getPeriod();
  const totalNet=emps.reduce((s,e)=>s+calcSalary(e).net,0);
  const now=new Date();
  let text=`━━━━━━━━━━━━━━━━━━━━━━\n👑 تقرير سندريلا — بغداد\n📅 ${now.toLocaleDateString('ar-IQ',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n🕐 ${fmtT(now)}\n━━━━━━━━━━━━━━━━━━━━━━\n\n📊 ملخص:\n• الموظفون: ${emps.length} | الحاضرون: ${pres.length} | الغائبون: ${abs.length}\n\n`;
  if(pres.length){
    text+=`✅ الحاضرون (${pres.length}):\n`;
    pres.forEach(e=>{const ci=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='ci');const co=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='co');text+=`• ${e.name} [${shiftLabel(e)}] — حضور: ${ci?.time||'?'} | انصراف: ${co?co.time:'لم ينصرف'}\n`;});
    text+='\n';
  }
  if(abs.length){text+=`❌ الغائبون (${abs.length}):\n`;abs.forEach(e=>{text+=`• ${e.name}\n`;});text+='\n';}
  text+=`━━━━━━━━━━━━━━━━━━━━━━\n💰 الرواتب — ${per.label}\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  emps.forEach(e=>{const c=calcSalary(e);text+=`• ${e.name}: راتب ${fmtN(c.earnedSalary)} + حوافز ${fmtN(c.totalBon)} - خصم ${fmtN(c.totalDed)} = ${fmtN(c.net)} د.ع\n`;});
  text+=`\n💵 الإجمالي: ${fmtN(totalNet)} د.ع\n📆 الصرف: ${per.pay.toLocaleDateString('ar-IQ',{day:'numeric',month:'long'})}\n━━━━━━━━━━━━━━━━━━━━━━`;
  return text;
}

function saveReportToArchive(text,type='manual'){
  const reports=DB.get('reports')||[];
  const now=new Date();
  reports.unshift({id:genId(),text,date:todayStr(),time:fmtT(now),ts:now.toISOString(),type});
  if(reports.length>100)reports.length=100;
  DB.set('reports',reports);
  renderReportsList();
}

function genAndSaveReport(){
  const text=buildReportText('manual');
  saveReportToArchive(text,'manual');
  showToast('✅ تم حفظ التقرير','s');
}

function sendTgReport(){
  const text=buildReportText();
  sendTg(text);
  saveReportToArchive(text,'manual');
  showToast('📤 تم الإرسال لتليجرام','i');
}

function renderReportsList(){
  const c=document.getElementById('repList'); if(!c)return;
  const reports=DB.get('reports')||[];
  const rc=document.getElementById('repCount'), rl=document.getElementById('repLast');
  if(rc)rc.textContent=reports.length;
  if(rl)rl.textContent=reports.length?`${fmtD(reports[0].date)} ${reports[0].time}`:'--';
  c.innerHTML=reports.length?reports.map(r=>`
    <div class="report-item" onclick="viewReport('${r.id}')">
      <div class="rep-head"><div class="rep-title">📋 تقرير ${r.type==='auto'?'تلقائي':'يدوي'} — ${fmtD(r.date)}</div><div class="rep-date">${r.time}</div></div>
      <span class="rep-type ${r.type==='auto'?'rep-daily':'rep-manual'}">${r.type==='auto'?'تلقائي':'يدوي'}</span>
      <div style="font-size:11px;color:var(--t3);margin-top:6px;overflow:hidden;max-height:40px">${r.text.substring(0,100)}...</div>
    </div>`).join(''):`<div class="empty"><div class="ei">📋</div><p>لا توجد تقارير<br><small>تُرسل تلقائياً كل 4 صباحاً</small></p></div>`;
}

function viewReport(id){
  const rep=(DB.get('reports')||[]).find(r=>r.id===id); if(!rep)return;
  viewingReportId=id;
  document.getElementById('repViewContent').textContent=rep.text;
  openModal('repViewModal');
}

function sendSavedReportToTg(){
  const rep=(DB.get('reports')||[]).find(r=>r.id===viewingReportId);
  if(rep){sendTg(rep.text);showToast('📤 تم الإرسال','s');}
}

// ═══════════════════════════════════════════════════
//  ADD EMPLOYEE
// ═══════════════════════════════════════════════════
function handleShiftChange(prefix){
  const sel=document.getElementById(prefix==='ne'?'neShift':prefix==='e'?'eShiftInp':'qsShift');
  const wrap=document.getElementById(prefix==='ne'?'neCustomWrap':prefix==='e'?'eCustomWrap':'qsCustomWrap');
  if(wrap)wrap.style.display=sel.value==='custom'?'block':'none';
}

function openAddEmp(){
  ['neName','neUser','nePass','neSalary','neNotes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  document.getElementById('neCustomWrap').style.display='none';
  openModal('addEmpModal');
}

function addEmp(){
  const name=document.getElementById('neName').value.trim();
  const u=document.getElementById('neUser').value.trim()||name.split(' ')[0].toLowerCase();
  const pw=document.getElementById('nePass').value.trim();
  const sh=document.getElementById('neShift').value;
  const sal=parseInt(document.getElementById('neSalary').value)||0;
  const notes=document.getElementById('neNotes').value.trim();
  if(!name||!pw||!sal){showToast('يرجى ملء الحقول المطلوبة','e');return}
  const emps=DB.get('emps')||[];
  if(emps.find(e=>e.u===u)){showToast('اليوزر مستخدم مسبقاً','e');return}
  const newEmp={id:genId(),name,u,pw,sh,sal,notes,rating:0,bon:[],ded:[],lvM:0,jd:todayStr()};
  if(sh==='custom'){newEmp.customFrom=document.getElementById('neCustomFrom').value;newEmp.customTo=document.getElementById('neCustomTo').value;}
  emps.push(newEmp);
  DB.set('emps',emps); closeModal('addEmpModal'); renderAdmin();
  sendTg(`👤 موظف جديد\nالاسم: ${name}\nاليوزر: ${u}\nالراتب: ${fmtN(sal)} د.ع`);
  showToast(`✅ تم إضافة ${name}`,'s');
}

// ═══════════════════════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════════════════════
function openDetail(empId){
  DID=empId;
  const emp=(DB.get('emps')||[]).find(e=>e.id===empId); if(!emp)return;
  document.getElementById('detailTitle').textContent=`تفاصيل: ${emp.name}`;
  document.getElementById('eSalInp').value=emp.sal;
  document.getElementById('eShiftInp').value=emp.sh;
  if(emp.sh==='custom'){
    document.getElementById('eCustomWrap').style.display='block';
    document.getElementById('eCustomFrom').value=emp.customFrom||'';
    document.getElementById('eCustomTo').value=emp.customTo||'';
  }else{document.getElementById('eCustomWrap').style.display='none';}
  document.getElementById('ePassInp').value='';
  const eUserInp=document.getElementById('eUserInp');
  if(eUserInp)eUserInp.value=emp.u||'';
  document.getElementById('eNotesInp').value=emp.notes||'';
  const per=getPeriod();
  document.getElementById('eLvInp').value=emp['lvM']||0;
  const sh=SHIFTS[emp.sh]||{};
  document.getElementById('detailIG').innerHTML=`
    <div class="ii"><div class="lb">الاسم</div><div class="vl">${emp.name}</div></div>
    <div class="ii"><div class="lb">اليوزر</div><div class="vl cyan">${emp.u}</div></div>
    <div class="ii"><div class="lb">الشفت</div><div class="vl">${shiftLabel(emp)}</div></div>
    <div class="ii"><div class="lb">الراتب/شهر</div><div class="vl gold">${fmtN(emp.sal)} د.ع</div></div>
    <div class="ii"><div class="lb">معدل اليوم</div><div class="vl gold">${fmtN(Math.round(emp.sal/30))} د.ع</div></div>
    <div class="ii"><div class="lb">نوع الدوام</div><div class="vl">${sh.full?'كامل ⭐':'نصفي'}</div></div>
    <div class="ii"><div class="lb">التقييم</div><div class="vl gold">${emp.rating||0} ⭐</div></div>`;
  const c=calcSalary(emp);
  document.getElementById('dSlipName').textContent=emp.name+' — '+c.per.label;
  document.getElementById('ds-monthly').textContent=fmtN(emp.sal)+' د.ع';
  document.getElementById('ds-daily').textContent=fmtN(c.dailyRate)+' د.ع';
  document.getElementById('ds-pres').textContent=c.daysPresent+' يوم';
  document.getElementById('ds-lv').textContent=c.paidLeaves+' يوم';
  document.getElementById('ds-absd').textContent=c.deductDays+' يوم';
  document.getElementById('ds-earned').textContent=fmtN(c.earnedSalary)+' د.ع';
  document.getElementById('ds-shbon').textContent='+'+fmtN(c.shiftBonTotal)+' د.ع';
  document.getElementById('ds-sbon').textContent='+'+fmtN(c.salesBonTotal)+' د.ع';
  document.getElementById('ds-obon').textContent='+'+fmtN(c.otherBonTotal)+' د.ع';
  document.getElementById('ds-ded').textContent='-'+fmtN(c.totalDed)+' د.ع';
  document.getElementById('ds-tot').textContent=fmtN(c.net)+' د.ع';
  renderDBon(emp); renderDDed(emp);
  const att=(DB.get('att')||[]).filter(a=>a.eid===empId).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  document.getElementById('dAttList').innerHTML=att.length?att.map(a=>`
    <div class="hi">
      <div class="hic ${a.type==='ci'?'in':'out'}">${a.type==='ci'?'✅':'🚪'}</div>
      <div class="hinfo"><div class="htype">${a.type==='ci'?'حضور':'انصراف'}${a.type==='co'&&a.durMins?` — ${Math.floor(a.durMins/60)}س ${a.durMins%60}د`:''}</div><div class="hdate">${fmtD(a.date)}</div></div>
      <div class="htime">${a.time}</div>
    </div>`).join(''):`<div class="empty"><div class="ei">📭</div><p>لا توجد سجلات</p></div>`;
  showDTab('info'); openModal('empDetailModal');
}

function openDetailBon(empId){openDetail(empId);setTimeout(()=>showDTab('bon'),150);}

function renderDBon(emp){
  const c=document.getElementById('dBonList'); if(!c)return;
  const bon=emp.bon||[];
  c.innerHTML=bon.length?[...bon].reverse().map((b,ri)=>{
    const i=bon.length-1-ri;
    return `<div class="bi"><div><div class="br2">${b.note||b.type}</div><div class="bd">${fmtD(b.date)}</div></div>
      <div class="flex g8" style="align-items:center"><div class="ba">+${fmtN(b.amount)} د.ع</div>
      <button class="btn btn-dn btn-sm btn-ic" onclick="rmBon(${i})" title="إلغاء الحافز">🗑️</button></div></div>`;
  }).join(''):`<div class="empty" style="padding:20px"><div class="ei">🎁</div><p>لا توجد حوافز</p></div>`;
}

function renderDDed(emp){
  const c=document.getElementById('dDedList'); if(!c)return;
  const ded=emp.ded||[];
  c.innerHTML=ded.length?[...ded].reverse().map((d,ri)=>{
    const i=ded.length-1-ri;
    return `<div class="di"><div><div class="br2">${d.reason}</div><div class="dd">${fmtD(d.date)}</div></div>
      <div class="flex g8" style="align-items:center"><div class="da">-${fmtN(d.amount)} د.ع</div>
      <button class="btn btn-dn btn-sm btn-ic" onclick="rmDed(${i})">🗑️</button></div></div>`;
  }).join(''):`<div class="empty" style="padding:20px"><div class="ei">✅</div><p>لا توجد خصومات</p></div>`;
}

function addBonD(){
  const type=document.getElementById('dbType').value;
  const custom=parseInt(document.getElementById('dbCustomAmt').value)||0;
  const note=document.getElementById('dbNote').value.trim();
  let amount,nm;
  if(type==='sales100'){amount=INC100;nm='حافز 100 قطعة جبن';}
  else if(type==='sales200'){amount=INC200;nm='حافز 200 قطعة جبن';}
  else if(type==='shift'){amount=SHIFT_BON;nm='دوام كامل';}
  else if(type==='shiftcustom'){amount=custom;nm='حافز شفتات مخصص';}
  else{amount=custom;nm='حافز مخصص';}
  if(!amount){showToast('أدخل مبلغاً صحيحاً','e');return}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  if(!emps[i].bon)emps[i].bon=[];
  emps[i].bon.push({type,amount,note:note||nm,date:todayStr()});
  DB.set('emps',emps);
  addAdminLog('bonus_add',`إضافة حافز: ${emps[i].name} +${fmtN(amount)} د.ع`,{empId:DID,amount});
  document.getElementById('dbNote').value=''; document.getElementById('dbCustomAmt').value='';
  openDetail(DID); renderAdmin();
  sendTg(`🎁 حافز جديد\n👤 ${emps[i].name}\n💰 +${fmtN(amount)} د.ع\n📝 ${note||nm}`);
  showToast(`✅ +${fmtN(amount)} د.ع`,'s');
}

function rmBon(idx){
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  const removed=emps[i].bon.splice(idx,1)[0];
  DB.set('emps',emps); openDetail(DID); renderAdmin();
  showToast(`تم إلغاء الحافز: ${fmtN(removed?.amount)} د.ع`,'i');
}

function addDedD(){
  const amt=parseInt(document.getElementById('ddAmt').value)||0;
  const reason=document.getElementById('ddReason').value.trim();
  if(!amt||!reason){showToast('أدخل المبلغ والسبب','e');return}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  if(!emps[i].ded)emps[i].ded=[];
  emps[i].ded.push({amount:amt,reason,date:todayStr()});
  DB.set('emps',emps);
  addAdminLog('ded_add',`خصم: ${emps[i].name} — ${fmtN(amt)} د.ع (${reason})`,{empId:DID,amt,reason});
  document.getElementById('ddAmt').value=''; document.getElementById('ddReason').value='';
  openDetail(DID); renderAdmin();
  showToast(`خصم -${fmtN(amt)} د.ع`,'i');
}

function rmDed(idx){
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  emps[i].ded.splice(idx,1); DB.set('emps',emps); openDetail(DID); renderAdmin();
  showToast('تم حذف الخصم','i');
}

function saveSal(){
  const v=parseInt(document.getElementById('eSalInp').value)||0; if(!v){showToast('راتب غير صحيح','e');return}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  addAdminLog('salary_edit',`تعديل راتب: ${emps[i].name} → ${fmtN(v)} د.ع`,{empId:DID,newSal:v});
  emps[i].sal=v; DB.set('emps',emps); openDetail(DID); renderAdmin(); showToast('✅ تم تعديل الراتب','s');
}

function saveShift(){
  const v=document.getElementById('eShiftInp').value;
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  emps[i].sh=v;
  if(v==='custom'){emps[i].customFrom=document.getElementById('eCustomFrom').value;emps[i].customTo=document.getElementById('eCustomTo').value;}
  DB.set('emps',emps); openDetail(DID); renderAdmin(); showToast('✅ تم تعديل الشفت','s');
}

function saveEmpPw(){
  const v=document.getElementById('ePassInp').value.trim(); if(!v){showToast('أدخل كلمة المرور','e');return}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  emps[i].pw=v; DB.set('emps',emps); showToast('✅ تم تغيير كلمة المرور','s');
}

function saveLv(){
  const v=parseInt(document.getElementById('eLvInp').value)||0;
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  const per=getPeriod(); emps[i]['lvM']=v;
  DB.set('emps',emps); openDetail(DID); renderAdmin(); showToast(`✅ تم تسجيل ${v} إجازة`,'s');
}

function saveNotes(){
  const v=document.getElementById('eNotesInp').value.trim();
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  emps[i].notes=v; DB.set('emps',emps); showToast('✅ تم حفظ الملاحظات','s');
}

function deleteEmp(){
  if(!confirm('حذف هذا الموظف نهائياً؟'))return;
  let emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===DID);
  addAdminLog('emp_del',`حذف موظف: ${emp?.name||DID}`,{empId:DID});
  emps=emps.filter(e=>e.id!==DID);
  DB.set('emps',emps); closeModal('empDetailModal'); renderAdmin(); showToast('تم الحذف','i');
}

function qDel(id){
  const emps=DB.get('emps')||[], emp=emps.find(e=>e.id===id);
  if(!confirm(`حذف ${emp?.name}?`))return;
  DB.set('emps',emps.filter(e=>e.id!==id)); renderAdmin(); showToast('تم الحذف','i');
}

function showDTab(id,el){
  document.querySelectorAll('.dtc').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.dtab').forEach(t=>t.classList.remove('active'));
  const ct=document.getElementById('dt-'+id); if(ct)ct.classList.add('active');
  if(el)el.classList.add('active');
  else{const ids=['info','sal','bon','ded','att'];const j=ids.indexOf(id);const tabs=document.querySelectorAll('.dtab');if(j>=0&&tabs[j])tabs[j].classList.add('active');}
}

// ═══════════════════════════════════════════════════
//  INCENTIVES
// ═══════════════════════════════════════════════════
function qInc(type){
  const empId=document.getElementById('incEmpSel').value; if(!empId){showToast('اختر موظفاً','e');return}
  let amount,nm;
  if(type==='sales100'){amount=INC100;nm='حافز 100 قطعة جبن';}
  else if(type==='sales200'){amount=INC200;nm='حافز 200 قطعة جبن';}
  else{amount=SHIFT_BON;nm='دوام كامل';}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===empId); if(i===-1)return;
  if(!emps[i].bon)emps[i].bon=[];
  emps[i].bon.push({type,amount,note:nm,date:todayStr()});
  DB.set('emps',emps); renderAdmin();
  sendTg(`🎁 ${nm}\n👤 ${emps[i].name}\n💰 +${fmtN(amount)} د.ع`);
  showToast(`✅ ${nm} — ${emps[i].name}`,'s');
}

function addCustomBon(){
  const empId=document.getElementById('incEmpSel').value; if(!empId){showToast('اختر موظفاً','e');return}
  const amt=parseInt(document.getElementById('cbAmt').value)||0;
  const reason=document.getElementById('cbReason').value.trim()||'حافز مخصص';
  if(!amt){showToast('أدخل المبلغ','e');return}
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===empId); if(i===-1)return;
  if(!emps[i].bon)emps[i].bon=[];
  emps[i].bon.push({type:'custom',amount:amt,note:reason,date:todayStr()});
  DB.set('emps',emps); closeModal('cbModal'); renderAdmin();
  sendTg(`🎁 حافز مخصص\n👤 ${emps[i].name}\n💰 +${fmtN(amt)} د.ع\n📝 ${reason}`);
  showToast(`✅ +${fmtN(amt)} د.ع`,'s');
}

// ═══════════════════════════════════════════════════
//  QUICK SHIFT
// ═══════════════════════════════════════════════════
let QSEID=null;
function openQS(id,name,sh){
  QSEID=id;
  document.getElementById('qsName').value=name;
  document.getElementById('qsShift').value=sh;
  document.getElementById('qsCustomWrap').style.display=sh==='custom'?'block':'none';
  openModal('qsModal');
}
function saveQS(){
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===QSEID); if(i===-1)return;
  const sh=document.getElementById('qsShift').value;
  emps[i].sh=sh;
  if(sh==='custom'){emps[i].customFrom=document.getElementById('qsCustomFrom').value;emps[i].customTo=document.getElementById('qsCustomTo').value;}
  DB.set('emps',emps); closeModal('qsModal'); renderAdmin(); showToast('✅ تم تعديل الشفت','s');
}

// ═══════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════
function changeAdminCreds(){
  const u=document.getElementById('newAdminUser').value.trim();
  const pw=document.getElementById('newAdminPw').value.trim();
  if(!u){showToast('أدخل اليوزر','e');return}
  const creds={u:u||DB.get('adminCreds')?.u||'sajjad_admin',pw:pw||DB.get('adminCreds')?.pw||'Admin@2025'};
  DB.set('adminCreds',creds); document.getElementById('newAdminPw').value='';
  showToast('✅ تم حفظ بيانات المدير','s');
}

function saveWorkLocation(){
  const lat=parseFloat(document.getElementById('inpLat').value);
  const lng=parseFloat(document.getElementById('inpLng').value);
  const rad=parseInt(document.getElementById('inpRad').value)||100;
  if(isNaN(lat)||isNaN(lng)){showToast('أدخل إحداثيات صحيحة','e');return}
  DB.set('workLoc',{lat,lng,rad});
  // Update display immediately
  const cfgLat=document.getElementById('cfgLat'),cfgLng=document.getElementById('cfgLng'),cfgRad=document.getElementById('cfgRad');
  if(cfgLat)cfgLat.textContent=lat.toFixed(6);
  if(cfgLng)cfgLng.textContent=lng.toFixed(6);
  if(cfgRad)cfgRad.textContent=rad+' متر';
  // Update Google Maps link
  const mapLink=document.querySelector('a[href*="maps.google.com"]');
  if(mapLink)mapLink.href='https://maps.google.com/?q='+lat+','+lng;
  showToast('✅ تم حفظ موقع العمل: '+lat.toFixed(4)+', '+lng.toFixed(4),'s');
}

function useCurrentAsWork(){
  if(!navigator.geolocation){showToast('GPS غير مدعوم','e');return}
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude;
    const lng=pos.coords.longitude;
    const rad=parseInt(document.getElementById('inpRad').value)||100;
    DB.set('workLoc',{lat,lng,rad});
    const inpLat=document.getElementById('inpLat'),inpLng=document.getElementById('inpLng');
    if(inpLat)inpLat.value=lat;
    if(inpLng)inpLng.value=lng;
    const cfgLat=document.getElementById('cfgLat'),cfgLng=document.getElementById('cfgLng'),cfgRad=document.getElementById('cfgRad');
    if(cfgLat)cfgLat.textContent=lat.toFixed(6);
    if(cfgLng)cfgLng.textContent=lng.toFixed(6);
    if(cfgRad)cfgRad.textContent=rad+' متر';
    showToast(`✅ تم تعيين موقعك: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,'s');
  },()=>showToast('تعذّر تحديد الموقع','e'),{enableHighAccuracy:true,timeout:10000});
}

function saveTgId(){saveTgSettings();}

function testTg(){
  sendTg(`🧪 اختبار اتصال\n✅ البوت يعمل بشكل صحيح!\n👑 نظام سندريلا — بغداد\n⏰ ${new Date().toLocaleTimeString('ar-IQ')}`);
  showToast('تم إرسال رسالة اختبار — تحقق من تليجرام','i');
}

function sendMessage(){
  const empId=document.getElementById('msgEmpSel').value;
  const text=document.getElementById('msgText').value.trim();
  if(!text){showToast('اكتب الرسالة أولاً','e');return}
  const emps=DB.get('emps')||[], emp=emps.find(e=>e.id===empId); if(!emp)return;
  const msg={id:genId(),eid:empId,ename:emp.name,text,date:todayStr(),time:fmtT(new Date()),ts:new Date().toISOString()};
  const msgs=DB.get('msg')||[]; msgs.push(msg); DB.set('msg',msgs);
  document.getElementById('msgText').value='';
  renderSentMessages();
  sendTg(`💬 رسالة لـ ${emp.name}\n${text}`);
  showToast(`✅ تم الإرسال لـ ${emp.name}`,'s');
}

function exportData(){
  const data={emps:DB.get('emps')||[],att:DB.get('att')||[],msg:DB.get('msg')||[],reports:DB.get('reports')||[],archive:DB.get('archive')||{},date:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`cinderella-${todayStr()}.json`; a.click();
  showToast('تم التصدير','s');
}

function exportSalaryPDF(empId){
  const emp=(DB.get('emps')||[]).find(e=>e.id===empId); if(!emp)return;
  const c=calcSalary(emp);
  const content=`سندريلا — كول سنتر بغداد\nكشف الراتب\n━━━━━━━━━━━━━━━━━━━━━\nالموظف: ${emp.name}\nالفترة: ${c.per.label}\n━━━━━━━━━━━━━━━━━━━━━\nالراتب الشهري: ${fmtN(emp.sal)} د.ع\nأيام الحضور: ${c.daysPresent}\nالراتب المكتسب: ${fmtN(c.earnedSalary)} د.ع\nمكافآت الشفتات: +${fmtN(c.shiftBonTotal)} د.ع\nحوافز: +${fmtN(c.salesBonTotal+c.otherBonTotal)} د.ع\nخصومات: -${fmtN(c.totalDed)} د.ع\n━━━━━━━━━━━━━━━━━━━━━\nالإجمالي: ${fmtN(c.net)} د.ع\n━━━━━━━━━━━━━━━━━━━━━`;
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`${emp.name}-${todayStr()}.txt`; a.click();
  showToast('✅ تم التصدير','s');
}

function resetDemo(){if(!confirm('إعادة تهيئة؟'))return;['emps','att','msg','reports','archive','lastReset','remembered'].forEach(k=>DB.del(k));initData();renderAdmin();showToast('تمت الإعادة','i')}
function clearAll(){if(!confirm('⚠️ مسح كل البيانات نهائياً؟'))return;['emps','att','msg','reports','archive','lastReset','remembered'].forEach(k=>DB.del(k));renderAdmin();showToast('تم المسح','i')}

// ═══════════════════════════════════════════════════
//  MODAL UTILS
// ═══════════════════════════════════════════════════
function openModal(id){document.getElementById(id)?.classList.add('open')}
function closeModal(id){document.getElementById(id)?.classList.remove('open')}
document.addEventListener('click',e=>{if(e.target.classList.contains('mov'))e.target.classList.remove('open');});

// ═══════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════
function showToast(msg,type='i'){
  const c=document.getElementById('toastWrap');
  const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
  c.appendChild(t); setTimeout(()=>t.remove(),3200);
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
