// ═══ employees.js ═══
// ══════════════════════════════════════════════════════
function openAddSaleNew(){
  // تعبئة الموظفين
  const sel=document.getElementById('saleEmpSel');
  const emps=DB.get('emps')||[];
  if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  // التاريخ اليوم
  const di=document.getElementById('saleDate');
  if(di)di.value=todayStr();
  // ربط الـ inputs بالمجموع
  ['saleFb','saleInsta','saleWa'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.oninput=updateSaleTotalPreview;
  });
  openModal('addSaleModal');
}

function updateSaleTotalPreview(){
  const fb=parseInt(document.getElementById('saleFb')?.value)||0;
  const insta=parseInt(document.getElementById('saleInsta')?.value)||0;
  const wa=parseInt(document.getElementById('saleWa')?.value)||0;
  const el=document.getElementById('saleTotalPreview');
  if(el)el.textContent=(fb+insta+wa)+' طلب';
}

function addSaleRecordNew(){
  const eid=document.getElementById('saleEmpSel')?.value;
  const date=document.getElementById('saleDate')?.value||todayStr();
  const fb=parseInt(document.getElementById('saleFb')?.value)||0;
  const insta=parseInt(document.getElementById('saleInsta')?.value)||0;
  const wa=parseInt(document.getElementById('saleWa')?.value)||0;
  const note=document.getElementById('saleNote')?.value.trim()||'';
  if(!eid){showToast('اختر الموظف','e');return;}
  if(fb+insta+wa===0){showToast('أدخل عدد الطلبات في منصة واحدة على الأقل','e');return;}
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===eid);if(!emp)return;
  const sales=DB.get('salesLog')||[];
  const now=new Date();
  if(fb>0)sales.push({id:genId(),eid,ename:emp.name,platform:'فيسبوك',count:fb,note,date,time:fmtT(now),ts:now.toISOString()});
  if(insta>0)sales.push({id:genId(),eid,ename:emp.name,platform:'انستقرام',count:insta,note,date,time:fmtT(now),ts:now.toISOString()});
  if(wa>0)sales.push({id:genId(),eid,ename:emp.name,platform:'واتساب',count:wa,note,date,time:fmtT(now),ts:now.toISOString()});
  DB.set('salesLog',sales);
  ['saleFb','saleInsta','saleWa'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const snEl=document.getElementById('saleNote');if(snEl)snEl.value='';
  const sp=document.getElementById('saleTotalPreview');if(sp)sp.textContent='0 طلب';
  closeModal('addSaleModal');
  renderSalesToday();renderSalesLog();renderSalesStatsNew();
  showToast(`✅ تم تسجيل ${fb+insta+wa} طلب — ${emp.name}`,'s');
}

function renderSalesToday(){
  const c=document.getElementById('salesTodaySummary');if(!c)return;
  const lbl=document.getElementById('salesTodayLabel');
  const today=todayStr();
  if(lbl)lbl.textContent=fmtD(today);
  const sales=(DB.get('salesLog')||[]).filter(s=>s.date===today);
  const emps=DB.get('emps')||[];
  if(!sales.length){c.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📦</div><p>لا توجد طلبات اليوم</p></div>';return;}
  // تجميع حسب موظف
  const byEmp={};
  sales.forEach(s=>{
    if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,fb:0,insta:0,wa:0,total:0};
    const cnt=s.count||1;
    if(s.platform==='فيسبوك')byEmp[s.eid].fb+=cnt;
    else if(s.platform==='انستقرام')byEmp[s.eid].insta+=cnt;
    else if(s.platform==='واتساب')byEmp[s.eid].wa+=cnt;
    byEmp[s.eid].total+=cnt;
  });
  c.innerHTML=`<div style="padding:12px 16px">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
    ${Object.values(byEmp).map(e=>`
      <div style="background:var(--bg3);border:1px solid var(--br);border-radius:12px;padding:14px">
        <div style="font-size:14px;font-weight:800;margin-bottom:10px">${e.name}</div>
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          ${e.fb?`<div style="display:flex;align-items:center;gap:5px;background:rgba(66,165,245,.1);border:1px solid rgba(66,165,245,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#42a5f5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><span style="font-size:13px;font-weight:800;color:var(--blue)">${e.fb}</span></div>`:''}
          ${e.insta?`<div style="display:flex;align-items:center;gap:5px;background:rgba(206,147,216,.1);border:1px solid rgba(206,147,216,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg><span style="font-size:13px;font-weight:800;color:var(--purple)">${e.insta}</span></div>`:''}
          ${e.wa?`<div style="display:flex;align-items:center;gap:5px;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:5px 10px"><svg width="14" height="14" viewBox="0 0 24 24" fill="#00e676"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg><span style="font-size:13px;font-weight:800;color:var(--green)">${e.wa}</span></div>`:''}
        </div>
        <div style="font-size:12px;color:var(--t2)">الإجمالي: <span style="color:var(--cyan);font-weight:800">${e.total}</span> طلب</div>
      </div>`).join('')}
    </div></div>`;
}

function renderSalesStatsNew(){
  const c=document.getElementById('salesRangeStats');if(!c)return;
  const eid=document.getElementById('salesFilterEmpNew')?.value||'';
  const from=document.getElementById('salesFromDate')?.value||'';
  const to=document.getElementById('salesToDate')?.value||'';
  let sales=DB.get('salesLog')||[];
  if(eid)sales=sales.filter(s=>s.eid===eid);
  if(from)sales=sales.filter(s=>s.date>=from);
  if(to)sales=sales.filter(s=>s.date<=to);
  if(!sales.length){c.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📊</div><p>لا توجد بيانات للفترة المحددة</p></div>';return;}
  const byEmp={};
  sales.forEach(s=>{
    if(!byEmp[s.eid])byEmp[s.eid]={name:s.ename,fb:0,insta:0,wa:0,total:0};
    const cnt=s.count||1;
    if(s.platform==='فيسبوك')byEmp[s.eid].fb+=cnt;
    else if(s.platform==='انستقرام')byEmp[s.eid].insta+=cnt;
    else if(s.platform==='واتساب')byEmp[s.eid].wa+=cnt;
    byEmp[s.eid].total+=cnt;
  });
  // إجمالي التطبيقات
  let totFb=0,totInsta=0,totWa=0;
  Object.values(byEmp).forEach(e=>{totFb+=e.fb;totInsta+=e.insta;totWa+=e.wa;});
  const grandTotal=totFb+totInsta+totWa;
  const rangeLabel=from&&to?`${fmtD(from)} — ${fmtD(to)}`:from?`من ${fmtD(from)}`:to?`حتى ${fmtD(to)}`:'كل الفترات';
  c.innerHTML=`
    <div style="font-size:11px;color:var(--t2);margin-bottom:12px">${rangeLabel}</div>
    <!-- إجمالي المنصات -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
      <div style="background:rgba(66,165,245,.08);border:1px solid rgba(66,165,245,.2);border-radius:10px;padding:12px;text-align:center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#42a5f5" style="margin-bottom:6px"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <div style="font-size:20px;font-weight:900;color:var(--blue)">${totFb}</div>
        <div style="font-size:10px;color:var(--t2)">فيسبوك</div>
      </div>
      <div style="background:rgba(206,147,216,.08);border:1px solid rgba(206,147,216,.2);border-radius:10px;padding:12px;text-align:center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:6px"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg>
        <div style="font-size:20px;font-weight:900;color:var(--purple)">${totInsta}</div>
        <div style="font-size:10px;color:var(--t2)">انستقرام</div>
      </div>
      <div style="background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.2);border-radius:10px;padding:12px;text-align:center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#00e676" style="margin-bottom:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        <div style="font-size:20px;font-weight:900;color:var(--green)">${totWa}</div>
        <div style="font-size:10px;color:var(--t2)">واتساب</div>
      </div>
    </div>
    <div style="background:rgba(240,192,64,.06);border:1px solid rgba(240,192,64,.15);border-radius:10px;padding:10px;text-align:center;margin-bottom:16px">
      <span style="font-size:12px;color:var(--t2)">إجمالي الطلبات: </span><span style="font-size:20px;font-weight:900;color:var(--gold)">${grandTotal}</span>
    </div>
    <!-- تفاصيل كل موظف -->
    <div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px">تفاصيل كل موظف</div>
    <div class="tw"><table><thead><tr><th>الموظف</th>
      <th><svg width="14" height="14" viewBox="0 0 24 24" fill="#42a5f5" style="vertical-align:middle"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></th>
      <th><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r=".5" fill="#ce93d8"/></svg></th>
      <th><svg width="14" height="14" viewBox="0 0 24 24" fill="#00e676" style="vertical-align:middle"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></th>
      <th>الإجمالي</th></tr></thead><tbody>
    ${Object.values(byEmp).sort((a,b)=>b.total-a.total).map(e=>`<tr>
      <td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
      <td><span class="bold" style="color:var(--blue)">${e.fb||'—'}</span></td>
      <td><span class="bold" style="color:var(--purple)">${e.insta||'—'}</span></td>
      <td><span class="bold" style="color:var(--green)">${e.wa||'—'}</span></td>
      <td><span class="bold tcyn">${e.total}</span></td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

// تفعيل تنبيه 9 صباحاً في الـ timer
setInterval(()=>{try{check9amAbsent();}catch(e){}},60000);

// hook showATab لـ leave_mgmt وsales
const __origShowATab2=window.showATab;
window.showATab=function(id,el){
  __origShowATab2&&__origShowATab2(id,el);
  if(id==='leave_mgmt'){_populateLeaveMgmt();renderLeaveMgmtList();}
  if(id==='sales'){
    const emps=DB.get('emps')||[];
    const fsel=document.getElementById('salesFilterEmpNew');
    if(fsel&&fsel.options.length<=1)emps.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;fsel.appendChild(o);});
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
function openAddShiftModal(){openModal('addShiftModal');}
function saveNewShift(){
  const name=document.getElementById('newShiftName').value.trim();
  const from=document.getElementById('newShiftFrom').value;
  const to=document.getElementById('newShiftTo').value;
  const bonType=document.getElementById('newShiftBonType').value;
  const bonAmt=parseInt(document.getElementById('newShiftBonAmt').value)||0;
  if(!name||!from||!to){showToast('أدخل اسم الشفت والأوقات','e');return;}
  const key=from+'-'+to+(name.replace(/\s/g,'')?'_'+Date.now():'');
  const customShifts=DB.get('customShifts')||{};
  const shObj={name,s:from,e:to,h:0,full:bonType==='full',display:name};
  if(bonType==='daily'){shObj.bonusType='daily';shObj.dailyBonus=bonAmt;shObj.full=false;}
  customShifts[key]=shObj;
  DB.set('customShifts',customShifts);
  _reloadShifts();
  closeModal('addShiftModal');
  renderShiftCards();
  _addShiftToAllDropdowns(key,name);
  showToast('✅ تم إضافة الشفت: '+name,'s');
}

function renderShiftCards(){
  _reloadShifts();
  const grid=document.getElementById('shiftCardsGrid');if(!grid)return;
  let html='';
  Object.entries(SHIFTS).forEach(([k,s])=>{
    if(k==='custom')return;
    const bonTxt=s.full?'كامل • +10,000':s.bonusType==='daily'?`يومي • +${(s.dailyBonus||0).toLocaleString('ar-IQ')}`:s.name==='وقت مخصص'?'موافقة المدير':'نصفي';
    const bc=s.full?'':'';
    html+=`<div class="shcard"><div class="shn">${s.name}</div><div class="shh">${s.h?s.h+' ساعات':''}</div><div class="shs">${bonTxt}</div></div>`;
  });
  html+=`<div class="shcard" style="border-color:rgba(0,229,255,.2)"><div class="shn" style="color:var(--cyan)">وقت مخصص</div><div class="shh">يحدده المدير</div><div class="shs">موافقة المدير</div></div>`;
  grid.innerHTML=html;
}

function _addShiftToAllDropdowns(key,name){
  ['qsShift','dseShift','eShiftInp','neShift'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    if(!sel.querySelector(`option[value="${key}"]`)){
      const opt=document.createElement('option');opt.value=key;opt.textContent=name;
      // Insert before 'custom' option
      const customOpt=sel.querySelector('option[value="custom"]');
      if(customOpt)sel.insertBefore(opt,customOpt);
      else sel.appendChild(opt);
    }
  });
}

// Restore custom shifts into dropdowns on load
function _restoreCustomShiftsDropdowns(){
  _reloadShifts();
  const custom=DB.get('customShifts')||{};
  Object.entries(custom).forEach(([k,s])=>_addShiftToAllDropdowns(k,s.name));
}

// ══════════════════════════════════════════════════════
//  DAILY SCHEDULE PUSH (4 AM notification to employees)
// ══════════════════════════════════════════════════════
function pushTomorrowScheduleToChat(){
  _reloadShifts();
  const emps=DB.get('emps')||[];
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const tStr=tomorrow.toISOString().split('T')[0];
  const tLabel=tomorrow.toLocaleDateString('ar-IQ',{weekday:'long',day:'numeric',month:'long'});
  let msg=`📅 جدول دوام ${tLabel}:\n━━━━━━━━━━━━━━\n`;
  emps.forEach(e=>{
    const dayShift=getEmpShiftForDay(e,tStr);
    const sh=SHIFTS[dayShift.sh]||{};
    let shName;
    if(dayShift.sh==='on_leave')shName='🌴 إجازة';
    else if(dayShift.sh==='custom')shName=`مخصص ${dayShift.customFrom}—${dayShift.customTo}`;
    else shName=sh.name||dayShift.sh;
    msg+=`👤 ${e.name}: ${shName}\n`;
  });
  msg+='━━━━━━━━━━━━━━';
  // Add to group chat
  const now=new Date();
  const chatMsg={id:genId(),uid:'admin',uname:'المدير 👑',role:'admin',text:msg.replace(/\\n/g,'\n'),ts:now.toISOString(),time:fmtT(now),date:todayStr(),isSchedule:true};
  const chat=DB.get('groupChat')||[];chat.push(chatMsg);DB.set('groupChat',chat);
  sendTg(msg.replace(/\\n/g,'\n'));
  renderEmpChat();renderAdminChat();
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE PHOTO DISPLAY IN CHAT
// ══════════════════════════════════════════════════════
function getEmpAvatar(uid,uname,size){
  const emps=DB.get('emps')||[];
  const emp=emps.find(e=>e.id===uid);
  const photo=emp?.photo;
  const nm=uname||'؟';
  if(photo){
    return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${nm}">`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.45)}px;font-weight:800;color:#1a1200;flex-shrink:0">${nm[0]||'؟'}</div>`;
}

// ── _reloadShifts ──
function _reloadShifts(){
  const custom=DB.get('customShifts')||{};
  SHIFTS=Object.assign({},SHIFTS_DEFAULT,custom);
}

// ── deleteChatMsg — حذف رسالة من الدردشة ──
function deleteChatMsg(id, role){
  const chat=DB.get('groupChat')||[];
  const msg=chat.find(m=>m.id===id);
  if(!msg){showToast('الرسالة غير موجودة','e');return;}
  // الموظف: يحذف رسالته فقط | المدير: يحذف أي رسالة
  const emp=getEmp();
  if(role==='emp' && msg.uid!==emp?.id){showToast('لا يمكنك حذف رسالة شخص آخر','e');return;}
  if(!confirm('حذف هذه الرسالة؟'))return;
  const filtered=chat.filter(m=>m.id!==id);
  DB.set('groupChat',filtered);
  renderEmpChat();renderAdminChat();
  showToast('🗑️ تم حذف الرسالة','i');
}

// ── renderShiftSchedule — show مجاز cell ──
// (patched below in saveDayShiftEdit)

// ── Tomorrow schedule push — called at 4 AM ──
function _checkAndPushSchedule(){
  const now=new Date();
  if(now.getHours()===4&&now.getMinutes()===0){
    const key='schpush_'+todayStr();
    if(!DB.get(key)){DB.set(key,1);pushTomorrowScheduleToChat();}
  }
}

// ── Fix renderShiftSchedule for on_leave ──
const _origRenderShiftSchedule=typeof renderShiftSchedule==='function'?renderShiftSchedule:null;
function renderShiftSchedule(){
  _reloadShifts();
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
          ${getEmpAvatar(e.id,e.name,26)}
          <span style="font-weight:600;font-size:11px;white-space:nowrap">${e.name}</span>
        </div>
      </td>
      ${days.map(d=>{
        const ds=d.toISOString().split('T')[0];
        const isToday=ds===todayStr2;
        const dayShift=getEmpShiftForDay(e,ds);
        const isOnLeave=dayShift.sh==='on_leave';
        const sh=SHIFTS[dayShift.sh]||{};
        const from=dayShift.sh==='custom'?(dayShift.customFrom||'--'):(sh.s||'--');
        const to=dayShift.sh==='custom'?(dayShift.customTo||'--'):(sh.e||'--');
        const shName=dayShift.sh==='custom'?'مخصص':sh.name||dayShift.sh;
        return `<td style="text-align:center;padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.04);${isToday?'background:rgba(0,229,255,.04)':''}">
          ${isOnLeave?
            `<div style="background:rgba(206,147,216,.15);border:1px solid rgba(206,147,216,.35);border-radius:8px;padding:5px 3px;cursor:pointer"
                 onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')" title="مجاز">
              <div style="font-size:13px">🌴</div>
              <div style="font-size:9px;color:var(--purple);font-weight:700">مجاز</div>
              <div style="font-size:8px;color:var(--t3)">✏️</div>
            </div>`:
            `<div style="background:rgba(240,192,64,.08);border:1px solid rgba(240,192,64,.18);border-radius:8px;padding:5px 3px;cursor:pointer"
                 onclick="openDayShiftEdit('${e.id}','${e.name}','${ds}')" title="تعديل">
              <div style="font-size:9px;font-weight:700;color:var(--gold)">${shName}</div>
              <div style="font-size:9px;color:var(--green)">${from}</div>
              <div style="font-size:9px;color:var(--cyan)">${to}</div>
              <div style="font-size:8px;color:var(--t3)">✏️</div>
            </div>`}
        </td>`;
      }).join('')}
    </tr>`).join('')}
    </tbody></table></div>`;
  c.innerHTML=html;
}

// ── saveDayShiftEdit with leave registration ──
function saveDayShiftEdit(){
  const sh=document.getElementById('dseShift').value;
  const from=document.getElementById('dseFrom').value;
  const to=document.getElementById('dseTo').value;
  saveDailyShift(_editDayEmpId,_editDayDate,sh,from,to);
  if(sh==='on_leave'){
    const leaveDays=DB.get('leaveDays')||[];
    if(!leaveDays.some(l=>l.eid===_editDayEmpId&&l.date===_editDayDate)){
      const emp2=(DB.get('emps')||[]).find(e=>e.id===_editDayEmpId);
      leaveDays.push({id:genId(),eid:_editDayEmpId,ename:emp2?.name||'',date:_editDayDate,paid:true,byAdmin:true,note:'مجاز جدول الشفتات'});
      DB.set('leaveDays',leaveDays);
    }
  } else {
    const leaveDays=DB.get('leaveDays')||[];
    DB.set('leaveDays',leaveDays.filter(l=>!(l.eid===_editDayEmpId&&l.date===_editDayDate&&l.note==='مجاز جدول الشفتات')));
  }
  closeModal('dayShiftEditModal');
  renderShiftSchedule();
  const emp=(DB.get('emps')||[]).find(e=>e.id===_editDayEmpId);
  if(emp){
    const shName=sh==='on_leave'?'🌴 إجازة':sh==='custom'?'مخصص '+from+'—'+to:(SHIFTS[sh]?.name||sh);
    const msg={id:genId(),eid:emp.id,ename:emp.name,text:'📅 تم تعديل شفتك ليوم '+fmtD(_editDayDate)+' إلى: '+shName,date:todayStr(),time:fmtT(new Date()),ts:new Date().toISOString()};
    const msgs=DB.get('msg')||[];msgs.push(msg);DB.set('msg',msgs);
    sendTg('📅 تعديل شفت\n👤 '+emp.name+'\nاليوم: '+fmtD(_editDayDate)+'\nالشفت: '+shName);
  }
  renderAdmin();
  showToast('✅ تم حفظ الشفت','s');
}

// ── renderMonthAttGrid fix (current month only) ──
function renderMonthAttGrid(emps,att,ps,pe,today){
  const grid=document.getElementById('monthAttGrid');
  const badge=document.getElementById('monthAttBadge');
  if(!grid)return;
  const leaveDays=DB.get('leaveDays')||[];
  const now2=new Date();
  const currentMonthStart=new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0];
  const currentMonthEnd=new Date(now2.getFullYear(),now2.getMonth()+1,0).toISOString().split('T')[0];
  const days=[];
  let cur=new Date(currentMonthStart+'T00:00:00');
  while(cur<=new Date(currentMonthEnd+'T00:00:00')){
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate()+1);
  }
  let totalPresent=0,totalLeave=0;
  const dayStats=days.map(d=>{
    const pres=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===d&&a.type==='ci')).length;
    const onLeave=emps.filter(e=>leaveDays.some(l=>l.eid===e.id&&l.date===d)).length;
    if(d<=today){totalPresent+=pres;totalLeave+=onLeave;}
    return{d,pres,onLeave};
  });
  const passedDays=days.filter(d=>d<=today).length;
  if(badge)badge.textContent=totalPresent+' تسجيل حضور في '+passedDays+' يوم';
  grid.innerHTML=dayStats.map(({d,pres,onLeave})=>{
    const isFuture=d>today;
    const dayNum=parseInt(d.split('-')[2]);
    let bg,color,title;
    if(isFuture){bg='var(--bg3)';color='var(--t3)';title=d;}
    else if(pres===emps.length&&emps.length>0){bg='rgba(0,230,118,.25)';color='var(--green)';title=d+' — الكل حضروا';}
    else if(pres>0){bg='rgba(240,192,64,.2)';color='var(--gold)';title=d+' — '+pres+'/'+emps.length;}
    else if(onLeave>0){bg='rgba(206,147,216,.25)';color='var(--purple)';title=d+' — '+onLeave+' مجاز';}
    else{bg='var(--bg3)';color='var(--t3)';title=d;}
    return'<div title="'+title+'" style="width:30px;height:30px;border-radius:6px;background:'+bg+';color:'+color+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:default">'+dayNum+'</div>';
  }).join('');
}

// ── renderDayGrid fix (current month only) ──
function renderDayGrid(eid){
  const c=document.getElementById('empDG');if(!c)return;
  const att=DB.get('att')||[];
  const leaveDays=DB.get('leaveDays')||[];
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0);
  const today=todayStr();
  const days=[];
  let cur=new Date(monthStart);
  while(cur<=monthEnd){
    const ds=cur.toISOString().split('T')[0];
    const future=ds>today;
    const hasCI=att.some(a=>a.eid===eid&&a.date===ds&&a.type==='ci');
    const isLeave=leaveDays.some(l=>l.eid===eid&&l.date===ds)||att.some(a=>a.eid===eid&&a.date===ds&&a.type==='leave');
    let cls=future?'f':hasCI?'p':isLeave?'lv':'f';
    days.push('<div class="dc '+cls+'" title="'+fmtD(ds)+'">'+cur.getDate()+'</div>');
    cur.setDate(cur.getDate()+1);
  }
  c.innerHTML=days.join('');
}

// ── renderEmpAttPattern fix (current month only) ──
function renderEmpAttPattern(eid){
  const c=document.getElementById('empAttPattern');if(!c)return;
  const att=DB.get('att')||[];
  const leaveDays=DB.get('leaveDays')||[];
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const monthStart=new Date(y,m,1);
  const monthEnd=new Date(y,m+1,0);
  const today=new Date();today.setHours(23,59,59);
  let cur=new Date(monthStart);
  const dots=[];
  while(cur<=monthEnd){
    const ds=cur.toISOString().split('T')[0];
    const future=cur>today;
    const has=att.some(a=>a.eid===eid&&a.date===ds&&a.type==='ci');
    const isLeave=leaveDays.some(l=>l.eid===eid&&l.date===ds)||att.some(a=>a.eid===eid&&a.date===ds&&a.type==='leave');
    const cls=future?'future':has?'present':isLeave?'on-leave':'future';
    dots.push('<div class="att-dot '+cls+'" title="'+cur.toLocaleDateString('ar-IQ')+'">'+cur.getDate()+'</div>');
    cur.setDate(cur.getDate()+1);
  }
  c.innerHTML=dots.join('');
}

// ── shiftLabel updated ──
function shiftLabel(emp){
  _reloadShifts();
  if(emp.sh==='custom'&&emp.customFrom&&emp.customTo)return'مخصص '+emp.customFrom+'—'+emp.customTo;
  return(SHIFTS[emp.sh]||{name:emp.sh||'غير محدد'}).name;
}

// ── Hook: add _checkAndPushSchedule to timer ──
const _origStartTimers=window.startTimers;
window.startTimers=function(){
  _origStartTimers&&_origStartTimers();
  setInterval(()=>{try{_checkAndPushSchedule();}catch(e){}},60000);
};

// ── Hook: restore custom shifts on load ──
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    try{_reloadShifts();_restoreCustomShiftsDropdowns();}catch(e){}
    try{renderShiftCards();}catch(e){}
  },500);
});


function openShiftCustomBon(){
  // Use cbModal but label it as shift bonus
  document.querySelector('#cbModal .mh h3').textContent='🎯 حافز شفتات مخصص';
  document.getElementById('cbReason').placeholder='مثال: شفت ليلي إضافي، تمديد دوام...';
  openModal('cbModal');
}
