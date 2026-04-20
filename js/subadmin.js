// ═══ subadmin.js ═══
function renderAdvReports(){
  const days=parseInt(document.getElementById('advRepPeriod')?.value||'7');
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const now=new Date();
  // Build date range
  const dates=[];
  for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);dates.push(d.toISOString().split('T')[0]);}
  const labels=dates.map(d=>new Date(d+'T12:00:00').toLocaleDateString('ar-IQ',{day:'numeric',month:'short'}));
  const chartDefaults={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9095b8',font:{family:'Cairo',size:11}}}},scales:{y:{ticks:{color:'#5a6080'},grid:{color:'rgba(255,255,255,.05)'}},x:{ticks:{color:'#9095b8'},grid:{display:false}}}};

  // 1. Attendance trend
  const attData=dates.map(d=>new Set(att.filter(a=>a.date===d&&a.type==='ci').map(a=>a.eid)).size);
  _buildChart('attTrendChart','line',labels,[{label:'عدد الحاضرين',data:attData,borderColor:'rgba(0,229,255,.9)',backgroundColor:'rgba(0,229,255,.15)',borderWidth:2,fill:true,tension:0.4}],chartDefaults);

  // 2. Salary + bonus per employee
  const salLabels=emps.map(e=>e.name.split(' ')[0]);
  const salData=emps.map(e=>calcSalary(e).earnedSalary);
  const bonData=emps.map(e=>calcSalary(e).totalBon);
  _buildChart('salDistChart','bar',salLabels,[
    {label:'الراتب المكتسب',data:salData,backgroundColor:'rgba(240,192,64,.5)',borderColor:'rgba(240,192,64,.9)',borderWidth:2,borderRadius:6},
    {label:'الحوافز',data:bonData,backgroundColor:'rgba(0,230,118,.4)',borderColor:'rgba(0,230,118,.8)',borderWidth:2,borderRadius:6}
  ],chartDefaults);

  // 3. Per employee attendance % in period
  const attPctData=emps.map(e=>{
    const pDays=dates.filter(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type==='ci')).length;
    return Math.round(pDays/days*100);
  });
  _buildChart('empAttChart','bar',salLabels,[{label:'نسبة الحضور %',data:attPctData,backgroundColor:attPctData.map(v=>v>=80?'rgba(0,230,118,.5)':v>=50?'rgba(255,152,0,.5)':'rgba(233,69,96,.5)'),borderWidth:2,borderRadius:6}],{...chartDefaults,scales:{...chartDefaults.scales,y:{...chartDefaults.scales.y,max:100}}});

  // 4. Bonus types pie
  const allBon={shift:0,sales100:0,sales200:0,custom:0};
  const per=getPeriod();
  const ps=per.start.toISOString().split('T')[0], pe=per.end.toISOString().split('T')[0];
  emps.forEach(e=>(e.bon||[]).filter(b=>b.date>=ps&&b.date<=pe).forEach(b=>{if(allBon[b.type]!==undefined)allBon[b.type]+=b.amount;else allBon.custom+=b.amount;}));
  _buildChart('bonDistChart','doughnut',['شفت كامل','100 قطعة','200 قطعة','مخصص'],[{data:Object.values(allBon),backgroundColor:['rgba(240,192,64,.6)','rgba(0,229,255,.6)','rgba(0,230,118,.6)','rgba(206,147,216,.6)'],borderColor:['rgba(240,192,64,.9)','rgba(0,229,255,.9)','rgba(0,230,118,.9)','rgba(206,147,216,.9)'],borderWidth:2}],{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9095b8',font:{family:'Cairo',size:11}}}}});
}
function _buildChart(id,type,labels,datasets,opts){
  const canvas=document.getElementById(id);if(!canvas)return;
  if(_advCharts[id]){_advCharts[id].destroy();}
  _advCharts[id]=new Chart(canvas.getContext('2d'),{type,data:{labels,datasets},options:opts});
}
function exportAdvReportExcel(){
  const days=parseInt(document.getElementById('advRepPeriod')?.value||'7');
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const now=new Date();
  const dates=[];
  for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);dates.push(d.toISOString().split('T')[0]);}
  let csv='الموظف,';
  csv+=dates.join(',')+',الإجمالي\n';
  emps.forEach(e=>{
    const row=dates.map(d=>att.some(a=>a.eid===e.id&&a.date===d&&a.type==='ci')?'✓':'✗');
    const total=row.filter(r=>r==='✓').length;
    csv+=`${e.name},${row.join(',')},${total}\n`;
  });
  const bom='\uFEFF';
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`تقرير-متقدم-${todayStr()}.csv`;link.click();
  showToast('✅ تم تصدير Excel','s');
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
  const backupKey='backup_'+todayStr();
  const allData={};
  SYNC_KEYS.forEach(k=>{const v=DB.get(k);if(v!==null)allData[k]=v;});
  allData.backedUpAt=new Date().toISOString();
  fbDB.ref('ccs_backups/'+backupKey).set(allData)
    .then(()=>{
      DB.set('lastCloudBackup',new Date().toISOString());
      showToast('☁️ نسخة احتياطية للسحابة — 4 صباحاً','s');
    })
    .catch(e=>console.error('Backup err:',e));
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
      const key='rep_'+todayStr();
      if(!DB.get(key)){DB.set(key,1);const txt=buildReportText('auto');sendTg(txt);saveReportToArchive(txt,'auto');showToast('📤 تم إرسال التقرير اليومي','i');}
    }
    // استفسار 3:00 صباحاً
    if(h===3&&mn===0){
      const key='prompt_'+todayStr();
      if(!DB.get(key)){DB.set(key,1);open3amPromptAuto();}
    }
    // نسخ احتياطية للسحابة 2:00 صباحاً
    if(h===2&&mn===0){
      const key='bk_'+todayStr();
      if(!DB.get(key)){DB.set(key,1);doAutoCloudBackup();}
    }
    // التقرير الأسبوعي جمعة 6:00 ص
    if(h===6&&mn===0&&now.getDay()===5){
      const key='wkrp_'+todayStr();
      if(!DB.get(key)){DB.set(key,1);buildWeeklyReport();}
    }
  },1000);
  autoTimers.push(t);
}

// renderAdmin patching removed - new renders integrated directly

// Override renderAdminAtt to include delete button
const _origRenderAdminAtt=renderAdminAtt;
function renderAdminAtt(){
  const tb=document.getElementById('adminAttTable');if(!tb)return;
  const q=(document.getElementById('attSearch')?.value||'').toLowerCase();
  const df=document.getElementById('attDate')?.value||'';
  let att=DB.get('att')||[];
  if(q)att=att.filter(a=>(a.ename||'').toLowerCase().includes(q));
  if(df)att=att.filter(a=>a.date===df);
  att.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  // تلوين الانصرافات المبكرة (أقل من 4 ساعات)
  tb.innerHTML=att.length?att.map(a=>{
    const isCI=a.type==='ci';
    const isEarlyOut=!isCI&&a.durMins&&a.durMins<240;
    return `<tr ${isEarlyOut?'style="background:rgba(233,69,96,.04)"':''}>
      <td><div class="tname"><div class="eav">${(a.ename||'?')[0]}</div><span style="font-weight:600">${a.ename||'؟'}</span></div></td>
      <td>${isCI?'<span class="tag tp">✅ حضور</span>':isEarlyOut?'<span class="tag ta">🚪 انصراف مبكر</span>':'<span class="tag tc">🚪 انصراف</span>'}</td>
      <td>${fmtD(a.date)}</td>
      <td class="bold">${a.time}</td>
      <td><span class="tgrn bold">${a.dist!=null?a.dist+' م':'—'}</span></td>
      <td>${!isCI&&a.durMins?`<span style="color:${a.durMins<240?'var(--red)':'var(--green)'};font-size:11px;font-weight:700">${Math.floor(a.durMins/60)}س ${a.durMins%60}د</span>`:'—'}</td>
      <td><button class="btn btn-dn btn-sm btn-ic" onclick="adminDeleteAtt('${a.id}')" title="حذف البصمة">🗑️</button></td>
    </tr>`;
  }).join(''):`<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--t3)">لا توجد سجلات</td></tr>`;
}

// logging integrated directly in saveSal, addBonD, addDedD, deleteEmp above



// ══════════════════════════════════════════════════════
//  SUB-ADMIN SYSTEM — نظام المديرين الفرعيين
// ══════════════════════════════════════════════════════

const ALL_PERMS=['view_overview','view_emp','manage_emp','att','salary','incentives','deductions','shifts','reports','leave','messages','sales','logs','settings'];
const PERM_LABELS={
  view_overview:'نظرة عامة',view_emp:'عرض الموظفين',manage_emp:'إدارة الموظفين',
  att:'سجل الحضور',salary:'الرواتب',incentives:'الحوافز',deductions:'الخصومات',
  shifts:'الشفتات',reports:'التقارير',leave:'طلبات الإجازة',
  messages:'الرسائل',sales:'المبيعات',logs:'سجل العمليات',settings:'الإعدادات'
};

// Tab → permission mapping
const TAB_PERM={
  ov:'view_overview',emp:'view_emp',att:'att',sal:'salary',
  inc:'incentives',sh:'shifts',rate:'view_emp',leave:'leave',
  arch:'reports',rep:'reports',msg:'messages',logs:'logs',
  sales:'sales',map:'view_emp',groupchat:'messages',advrep:'reports',cfg:'settings'
};

let SA_MODE=false; // currently logged in as sub-admin
let CU_PERMS=null; // active sub-admin permissions (null = all)

function getSubAdmins(){return DB.get('subAdmins')||[];}

function openAddSubAdmin(){
  document.getElementById('subAdminEditId').value='';
  document.getElementById('subAdminModalTitle').textContent='➕ إضافة مدير فرعي';
  ['saName','saUser','saPass'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('saRole').value='manager';
  ALL_PERMS.forEach(p=>{const el=document.getElementById('perm_'+p);if(el)el.checked=false;});
  openModal('subAdminModal');
}

function openEditSubAdmin(id){
  const admins=getSubAdmins();
  const sa=admins.find(a=>a.id===id);if(!sa)return;
  document.getElementById('subAdminEditId').value=id;
  document.getElementById('subAdminModalTitle').textContent='✏️ تعديل مدير فرعي';
  document.getElementById('saName').value=sa.name;
  document.getElementById('saUser').value=sa.u;
  document.getElementById('saPass').value=sa.pw;
  document.getElementById('saRole').value=sa.role||'manager';
  ALL_PERMS.forEach(p=>{const el=document.getElementById('perm_'+p);if(el)el.checked=(sa.perms||[]).includes(p);});
  openModal('subAdminModal');
}

function selectAllPerms(val){
  ALL_PERMS.forEach(p=>{const el=document.getElementById('perm_'+p);if(el)el.checked=val;});
}

function saveSubAdmin(){
  const name=document.getElementById('saName').value.trim();
  const u=document.getElementById('saUser').value.trim();
  const pw=document.getElementById('saPass').value.trim();
  const role=document.getElementById('saRole').value;
  if(!name||!u||!pw){showToast('يرجى ملء الحقول المطلوبة','e');return;}
  const perms=ALL_PERMS.filter(p=>{const el=document.getElementById('perm_'+p);return el&&el.checked;});
  const admins=getSubAdmins();
  const editId=document.getElementById('subAdminEditId').value;
  if(editId){
    const i=admins.findIndex(a=>a.id===editId);
    if(i!==-1){admins[i]={...admins[i],name,u,pw,role,perms};}
    showToast('✅ تم تعديل المدير الفرعي','s');
  } else {
    if(admins.find(a=>a.u===u)){showToast('اليوزر مستخدم مسبقاً','e');return;}
    admins.push({id:genId(),name,u,pw,role,perms,jd:todayStr()});
    showToast(`✅ تم إضافة ${name} كمدير فرعي`,'s');
  }
  DB.set('subAdmins',admins);
  closeModal('subAdminModal');
  renderSubAdminList();
}

function deleteSubAdmin(id){
  if(!confirm('حذف هذا المدير الفرعي؟'))return;
  const admins=getSubAdmins().filter(a=>a.id!==id);
  DB.set('subAdmins',admins);
  renderSubAdminList();
  showToast('تم الحذف','i');
}

function renderSubAdminList(){
  const c=document.getElementById('subAdminList');if(!c)return;
  const admins=getSubAdmins();
  if(!admins.length){
    c.innerHTML='<div class="empty"><div class="ei">👑</div><p>لا يوجد مديرون فرعيون<br><small>أضف مديراً فرعياً لتحديد صلاحياته</small></p></div>';
    return;
  }
  const roleNames={manager:'مدير فرعي',assistant:'مساعد مدير',supervisor:'مشرف'};
  const roleColors={manager:'var(--gold)',assistant:'var(--cyan)',supervisor:'var(--purple)'};
  c.innerHTML=admins.map(sa=>`
    <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(206,147,216,.15);border:1px solid rgba(206,147,216,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--purple)">${sa.name[0]}</div>
          <div>
            <div style="font-size:13px;font-weight:700">${sa.name}</div>
            <div style="font-size:11px;color:var(--t3)">@${sa.u} · <span style="color:${roleColors[sa.role]||'var(--t2)'}">${roleNames[sa.role]||sa.role}</span></div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sc btn-sm" onclick="openEditSubAdmin('${sa.id}')">✏️ تعديل</button>
          <button class="btn btn-dn btn-sm" onclick="deleteSubAdmin('${sa.id}')">🗑️</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${(sa.perms||[]).map(p=>`<span style="background:rgba(206,147,216,.1);color:var(--purple);border:1px solid rgba(206,147,216,.2);border-radius:6px;padding:2px 8px;font-size:10px">${PERM_LABELS[p]||p}</span>`).join('')}
        ${!(sa.perms||[]).length?'<span style="color:var(--t3);font-size:11px">لا توجد صلاحيات</span>':''}
      </div>
    </div>`).join('');
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
  document.querySelectorAll('#adminScreen .sitem').forEach(item=>{
    const onclick=item.getAttribute('onclick')||'';
    const match=onclick.match(/showATab\('(\w+)'/);
    if(match){
      const tab=match[1];
      const perm=TAB_PERM[tab];
      if(perm&&!hasPerm(perm)){item.style.display='none';}
    }
  });
  // Hide mobile nav items
  document.querySelectorAll('#adminScreen .mnav-item').forEach(item=>{
    const onclick=item.getAttribute('onclick')||'';
    const match=onclick.match(/showATab\('(\w+)'/);
    if(match){
      const tab=match[1];
      const perm=TAB_PERM[tab];
      if(perm&&!hasPerm(perm)){item.style.display='none';}
    }
  });
  // Hide add employee button if no manage_emp perm
  if(!hasPerm('manage_emp')){
    document.querySelectorAll('[onclick*="openAddEmp"]').forEach(el=>el.style.display='none');
    document.querySelectorAll('[onclick*="qDel"]').forEach(el=>el.style.display='none');
    document.querySelectorAll('[onclick*="openDetail"]').forEach(el=>{
      // hide delete inside detail too
    });
  }
  // Change topbar to show sub-admin info
  const uname=document.querySelector('#adminScreen .uname');
  const urole=document.querySelector('#adminScreen .urole');
  if(uname&&CU?.saName)uname.textContent=CU.saName;
  if(urole&&CU?.saRole){
    const roleNames={manager:'مدير فرعي',assistant:'مساعد مدير',supervisor:'مشرف'};
    urole.textContent=roleNames[CU.saRole]||CU.saRole;
    urole.style.color='var(--purple)';
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
  document.querySelectorAll('.loan-opt').forEach(e=>e.classList.remove('selected'));
  const inp=document.getElementById('loanAmt');
  if(inp)inp.value=amt;
  const lbl=document.getElementById('loanSelectedLabel');
  if(lbl)lbl.textContent=amt>=1000?'✅ مبلغ مخصص: '+fmtN(amt)+' د.ع':'';
}

function selectLoan(el,amt){
  document.querySelectorAll('.loan-opt').forEach(e=>e.classList.remove('selected'));
  el.classList.add('selected');
  const inp=document.getElementById('loanAmt');
  if(inp)inp.value=amt;
  const cinp=document.getElementById('loanCustomInput');
  if(cinp)cinp.value='';
  const lbl=document.getElementById('loanSelectedLabel');
  if(lbl)lbl.textContent='✅ اخترت: '+fmtN(amt)+' د.ع';
}

