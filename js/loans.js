// ═══ loans.js ═══
function submitLoanRequest(){
  const emp=getEmp(); if(!emp){showToast('خطأ: لم يتم تحديد الموظف','e');return;}
  const amtEl=document.getElementById('loanAmt');
  const amt=parseInt(amtEl?.value)||0;
  const reasonEl=document.getElementById('loanReason');
  const reason=(reasonEl?.value||'').trim();
  if(!amt||amt<5000){showToast('اختر المبلغ أولاً','e');return;}
  if(!reason){showToast('اكتب سبب طلب السلفة','e');return;}
  const loans=DB.get('loanRequests')||[];
  const pending=loans.find(l=>l.eid===emp.id&&l.status==='pending');
  if(pending){showToast('لديك طلب سلفة قيد الانتظار بالفعل','e');return;}
  const newLoan={
    id:genId(), eid:emp.id, ename:emp.name,
    amount:amt, reason, status:'pending',
    date:todayStr(), time:fmtT(new Date()), ts:new Date().toISOString()
  };
  loans.push(newLoan);
  DB.set('loanRequests',loans);
  // clear form
  if(amtEl)amtEl.value='';
  if(reasonEl)reasonEl.value='';
  document.querySelectorAll('.loan-opt').forEach(e=>e.classList.remove('selected'));
  const lbl=document.getElementById('loanSelectedLabel');
  if(lbl)lbl.textContent='';
  renderEmpLoanHistory();
  sendTg(`💳 طلب سلفة جديد\n👤 ${emp.name}\n💰 ${fmtN(amt)} د.ع\n📝 ${reason}`);
  playNotifSound('msg');
  showToast('✅ تم إرسال الطلب — بانتظار موافقة المدير','s');
}

function renderEmpLoanHistory(){
  const c=document.getElementById('empLoanHistory'); if(!c)return;
  const emp=getEmp(); if(!emp){c.innerHTML='';return;}
  const loans=(DB.get('loanRequests')||[]).filter(l=>l.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!loans.length){c.innerHTML='<div class="empty"><div class="ei">💳</div><p>لا توجد طلبات سلفة</p></div>';return;}
  const stMap={pending:{t:'⏳ بانتظار الموافقة',col:'var(--gold)'},approved:{t:'✅ تمت الموافقة',col:'var(--green)'},rejected:{t:'❌ مرفوض',col:'var(--red)'},deducted:{t:'💰 مخصوم من الراتب',col:'var(--cyan)'}};
  c.innerHTML=loans.map(l=>{
    const s=stMap[l.status]||stMap.pending;
    return `<div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <div style="font-size:14px;font-weight:800;color:var(--gold)">${fmtN(l.amount)} د.ع</div>
        <span style="font-size:11px;font-weight:700;color:${s.col}">${s.t}</span>
      </div>
      <div style="font-size:12px;color:var(--t2);margin-top:4px">${l.reason}</div>
      <div style="font-size:10px;color:var(--t3);margin-top:4px">${fmtD(l.date)} — ${l.time}</div>
      ${l.status==='rejected'&&l.rejectReason?`<div style="font-size:11px;color:var(--red);margin-top:4px">سبب الرفض: ${l.rejectReason}</div>`:''}
    </div>`;
  }).join('');
}

function renderAdminLoans(){
  const pending=document.getElementById('loanPendingList');
  const archived=document.getElementById('loanArchivedList');
  const badge=document.getElementById('loanPendingCount');
  const loans=DB.get('loanRequests')||[];
  const pList=loans.filter(l=>l.status==='pending').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const aList=loans.filter(l=>l.status!=='pending').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(badge)badge.textContent=pList.length;
  if(pending){
    pending.innerHTML=pList.length?pList.map(l=>`
      <div style="background:var(--bg3);border:1px solid rgba(255,152,0,.25);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,152,0,.15);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--orange)">${l.ename[0]}</div>
          <div>
            <div style="font-size:13px;font-weight:700">${l.ename}</div>
            <div style="font-size:11px;color:var(--t3)">${fmtD(l.date)} — ${l.time}</div>
          </div>
          <div style="margin-right:auto;font-size:16px;font-weight:900;color:var(--gold)">${fmtN(l.amount)} د.ع</div>
        </div>
        <div style="font-size:12px;color:var(--t2);margin-bottom:10px">📝 ${l.reason}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ok btn-sm" onclick="approveLoan('${l.id}')">✅ موافقة وخصم من الراتب</button>
          <button class="btn btn-dn btn-sm" onclick="rejectLoan('${l.id}')">❌ رفض</button>
        </div>
      </div>`).join(''):'<div class="empty"><div class="ei">💳</div><p>لا توجد طلبات معلقة</p></div>';
  }
  if(archived){
    const stMap={approved:'✅',rejected:'❌',deducted:'💰'};
    archived.innerHTML=aList.length?aList.map(l=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;gap:6px">
        <div>
          <div style="font-size:12px;font-weight:700">${stMap[l.status]||''} ${l.ename} — ${fmtN(l.amount)} د.ع</div>
          <div style="font-size:10px;color:var(--t3)">${l.reason} | ${fmtD(l.date)}</div>
        </div>
        <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:var(--bg2);color:var(--t2)">${l.status==='approved'?'موافق':l.status==='rejected'?'مرفوض':'مخصوم'}</span>
      </div>`).join(''):'<div class="empty"><div class="ei">📋</div><p>لا توجد طلبات سابقة</p></div>';
  }
}

function approveLoan(id){
  const loans=DB.get('loanRequests')||[];
  const i=loans.findIndex(l=>l.id===id); if(i===-1)return;
  const loan=loans[i];
  // خصم السلفة من راتب الموظف
  const emps=DB.get('emps')||[];
  const ei=emps.findIndex(e=>e.id===loan.eid);
  if(ei!==-1){
    if(!emps[ei].ded)emps[ei].ded=[];
    emps[ei].ded.push({amount:loan.amount,reason:`سلفة — ${loan.reason}`,date:todayStr(),isLoan:true,loanId:id});
    DB.set('emps',emps);
  }
  loans[i].status='deducted';
  loans[i].approvedAt=new Date().toISOString();
  DB.set('loanRequests',loans);
  addAdminLog('loan_approve',`موافقة سلفة: ${loan.ename} — ${fmtN(loan.amount)} د.ع`,{eid:loan.eid,amount:loan.amount});
  sendTg(`✅ موافقة سلفة\n👤 ${loan.ename}\n💰 ${fmtN(loan.amount)} د.ع\n📌 ستُخصم من الراتب`);
  renderAdminLoans(); renderAdmin(); updatePendingBadges();
  showToast(`✅ تمت الموافقة — خُصمت ${fmtN(loan.amount)} د.ع من راتب ${loan.ename}`,'s');
}

function rejectLoan(id){
  const reason=prompt('سبب الرفض (اختياري):');
  if(reason===null)return; // cancelled
  const loans=DB.get('loanRequests')||[];
  const i=loans.findIndex(l=>l.id===id); if(i===-1)return;
  loans[i].status='rejected';
  loans[i].rejectReason=reason||'';
  loans[i].rejectedAt=new Date().toISOString();
  DB.set('loanRequests',loans);
  sendTg(`❌ رفض سلفة\n👤 ${loans[i].ename}\n💰 ${fmtN(loans[i].amount)} د.ع${reason?'\n📝 '+reason:''}`);
  renderAdminLoans(); updatePendingBadges();
  showToast('تم الرفض','i');
}

// ══════════════════════════════════════════════════════
//  USERNAME EDIT — تعديل اليوزر
// ══════════════════════════════════════════════════════

function saveEmpUser(){
  const v=document.getElementById('eUserInp')?.value.trim();
  if(!v){showToast('أدخل اليوزر الجديد','e');return;}
  const emps=DB.get('emps')||[];
  const conflict=emps.find(e=>e.u===v&&e.id!==DID);
  if(conflict){showToast('اليوزر مستخدم من موظف آخر','e');return;}
  const i=emps.findIndex(e=>e.id===DID); if(i===-1)return;
  const oldUser=emps[i].u;
  emps[i].u=v;
  DB.set('emps',emps);
  addAdminLog('user_edit',`تعديل يوزر: ${emps[i].name} — ${oldUser} → ${v}`,{empId:DID});
  openDetail(DID);
  showToast(`✅ تم تغيير اليوزر إلى: ${v}`,'s');
}

// username field now populated directly in openDetail above

// ══════════════════════════════════════════════
//  جدول الأسبوع التفاعلي — تعديل شفت يومي
// ══════════════════════════════════════════════

// حفظ شفتات يومية مخصصة: {empId_dateStr: shiftKey}
function getDailyShifts(){return DB.get('dailyShifts')||{};}
function saveDailyShift(empId,dateStr,sh,customFrom,customTo){
  const ds=getDailyShifts();
  ds[empId+'_'+dateStr]={sh,customFrom:customFrom||'',customTo:customTo||''};
  DB.set('dailyShifts',ds);
}
function getEmpShiftForDay(emp,dateStr){
  const ds=getDailyShifts();
  const k=emp.id+'_'+dateStr;
  if(ds[k])return ds[k];
  return{sh:emp.sh,customFrom:emp.customFrom||'',customTo:emp.customTo||''};
}

