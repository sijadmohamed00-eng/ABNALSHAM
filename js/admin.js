function renderAdmin(){
  const now=new Date(), today=todayStr();
  document.getElementById('adminDateBar').textContent=now.toLocaleDateString('ar-IQ',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('adminDateFull').textContent=now.toLocaleDateString('ar-IQ',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('qaDate').textContent=now.toLocaleDateString('ar-IQ',{weekday:'long',month:'long',day:'numeric'});
  const emps=DB.get('emps')||[], att=DB.get('att')||[];
  document.getElementById('adminEC').textContent=emps.length;
  document.getElementById('st-tot').textContent=emps.length;
  const pres=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===today&&a.type==='ci'));
  document.getElementById('st-pres').textContent=pres.length;
  // مجازون اليوم
  const leaveDays=DB.get('leaveDays')||[];
  const todayOnLeave=emps.filter(e=>leaveDays.some(l=>l.eid===e.id&&l.date===today));
  const stLeaveEl=document.getElementById('st-leave');
  if(stLeaveEl)stLeaveEl.textContent=todayOnLeave.length;
  // الغائبون = كل الموظفين ناقص حضور ناقص مجازون
  const absCount=Math.max(0,emps.length-pres.length-todayOnLeave.length);
  document.getElementById('st-abs').textContent=absCount;
  // قسم المجازين في جدول الحضور
  const todayLeaveSec=document.getElementById('todayLeaveSection');
  const todayLeaveList=document.getElementById('todayLeaveList');
  if(todayLeaveSec&&todayLeaveList){
    if(todayOnLeave.length>0){
      todayLeaveSec.style.display='block';
      todayLeaveList.innerHTML=todayOnLeave.map(e=>`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(206,147,216,.12);border:1px solid rgba(206,147,216,.25);color:var(--purple);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;margin:2px">🌴 ${e.name}</span>`).join('');
    }else{todayLeaveSec.style.display='none';}
  }
  document.getElementById('st-sal').textContent=fmtNS(emps.reduce((s,e)=>s+e.sal,0));
  const per=getPeriod();
  const ps=per.start.toISOString().split('T')[0], pe=per.end.toISOString().split('T')[0];
  const totalNet=emps.reduce((s,e)=>s+calcSalary(e).net,0);
  document.getElementById('st-net').textContent=fmtNS(totalNet);
  // حضور الشهر الكامل (grid)
  renderMonthAttGrid(emps,att,ps,pe,today);
  const d=now.getDate();
  const pal=document.getElementById('adminPayAlert');
  if(pal){
    if(d===5){
      pal.style.display='flex';
      document.getElementById('adminPayTitle').textContent='💸 اليوم 5 — موعد صرف الرواتب!';
      document.getElementById('adminPaySub').textContent=`الإجمالي الكلي: ${fmtN(totalNet)} دينار`;
    }else{pal.style.display='none';}
  }
  document.getElementById('aPeriodLabel').textContent=per.label;
  document.getElementById('aNextPay').textContent=per.pay.toLocaleDateString('ar-IQ',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('aPeriodDays').textContent=per.totalDays+' يوم';
  document.getElementById('aTotalNet').textContent=fmtN(totalNet)+' د.ع';
  const tgEl=document.getElementById('tgChatId'); if(tgEl)tgEl.value=DB.get('tgId')||TG_CHAT_DEFAULT;
  // Load admin creds
  const ac=DB.get('adminCreds')||{u:'sajjad_admin',pw:''};
  const anu=document.getElementById('newAdminUser'); if(anu)anu.value=ac.u;
  // Work loc
  const wl=getWorkLoc();
  const cfgLat=document.getElementById('cfgLat'),cfgLng=document.getElementById('cfgLng'),cfgRad=document.getElementById('cfgRad');
  if(cfgLat)cfgLat.textContent=wl.lat.toFixed(6);
  if(cfgLng)cfgLng.textContent=wl.lng.toFixed(6);
  if(cfgRad)cfgRad.textContent=wl.rad+' متر';
  const inpLat=document.getElementById('inpLat'),inpLng=document.getElementById('inpLng'),inpRad=document.getElementById('inpRad');
  if(inpLat)inpLat.value=wl.lat; if(inpLng)inpLng.value=wl.lng; if(inpRad)inpRad.value=wl.rad;
  const mapLinkEl=document.querySelector('a[href*="maps.google.com"]');
  if(mapLinkEl)mapLinkEl.href='https://maps.google.com/?q='+wl.lat+','+wl.lng;
  renderQuickAtt(emps,att,today);
  renderEmpTable();
  renderAdminAtt();
  renderSalTable();
  renderShTable();
  renderIncTab(emps);
  renderRatingTab(emps);
  renderMsgSelect(emps);
  renderSentMessages();
  renderReportsList();
  renderAdminArchive();
  updateCharts(emps,att,today);
  updateSyncBadge();
  loadFbInputs();
  // New v3/v4 renders
  try{renderTomorrowSchedule();}catch(e){}
  try{renderLeaveRequests();}catch(e){}
  try{renderAdminLogs();}catch(e){}
  try{renderSalesToday();}catch(e){}
  try{renderSalesLog();}catch(e){}
  try{initSaleFilter();}catch(e){}
  try{loadTgDisplay();}catch(e){}
  try{loadTgProxy();}catch(e){}
  try{loadTgProxy();}catch(e){}
  try{renderSubAdminList();}catch(e){}
  // v6 additions
  try{
    const _loans=DB.get('loanRequests')||[];
    const _lb=document.getElementById('loanPendingCount');
    if(_lb)_lb.textContent=_loans.filter(l=>l.status==='pending').length;
  }catch(e){}
  try{updatePendingBadges();}catch(e){}
}

function renderQuickAtt(emps,att,today){
  const tb=document.getElementById('qaTable'); if(!tb)return;
  tb.innerHTML=emps.map(e=>{
    // البحث عن آخر CI (بغض النظر عن اليوم) وحالته
    const allCI=att.filter(a=>a.eid===e.id&&a.type==='ci').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    const lastCI=allCI[0];
    const co=lastCI?att.find(a=>a.eid===e.id&&a.type==='co'&&a.date===lastCI.date):null;
    let dur='—';
    if(lastCI&&co){const m=co.durMins||Math.round((new Date(co.ts)-new Date(lastCI.ts))/60000);const mc=m<240?'var(--red)':'var(--green)';const mw=m<240?' ⚠️':'';dur='<span style="color:'+mc+'">'+Math.floor(m/60)+'س '+m%60+'د'+mw+'</span>';}
    else if(lastCI){const m=Math.round((Date.now()-new Date(lastCI.ts))/60000);dur=`${Math.floor(m/60)}س ${m%60}د ⏱️`;}
    // تحديد الحالة بذكاء
    let tag, ciTime='—', coTime='—';
    if(!lastCI){
      tag='<span class="tag ta">غائب</span>';
    } else if(co){
      const isToday=lastCI.date===today;
      tag=`<span class="tag tc">انصرف${isToday?'':' (أمس)'}</span>`;
      ciTime=lastCI.time; coTime=co.time;
    } else {
      tag='<span class="tag tp">حاضر ▶</span>';
      ciTime=lastCI.time;
    }
    return `<tr>
      <td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
      <td><span class="shbadge">${shiftLabel(e)}</span></td>
      <td>${ciTime}</td><td>${coTime}</td><td>${dur}</td><td>${tag}</td>
    </tr>`;
  }).join('');
}

function renderEmpTable(){
  const tb=document.getElementById('empListTable'); if(!tb)return;
  const q=(document.getElementById('empSearch')?.value||'').toLowerCase();
  let emps=DB.get('emps')||[];
  if(q)emps=emps.filter(e=>e.name.toLowerCase().includes(q)||e.u.toLowerCase().includes(q));
  document.getElementById('empListCount').textContent=emps.length+' موظف';
  const att=DB.get('att')||[], today=todayStr();
  tb.innerHTML=emps.map((e,i)=>{
    const ci=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='ci');
    const co=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='co');
    const tag=co?'<span class="tag tc">انصرف</span>':ci?'<span class="tag tp">حاضر</span>':'<span class="tag ta">غائب</span>';
    return `<tr><td>${i+1}</td>
      <td><div class="tname"><div class="eav">${e.name[0]}</div><div><div>${e.name}</div><div class="muted">${e.u}</div></div></div></td>
      <td><code style="background:var(--bg2);padding:2px 6px;border-radius:4px;font-size:11px">${e.u}</code></td>
      <td><span class="shbadge">${shiftLabel(e)}</span></td>
      <td><span class="gnum">${fmtN(e.sal)}</span></td>
      <td>${tag}</td>
      <td><div class="flex g8">
        <button class="btn btn-sc btn-sm" onclick="openDetail('${e.id}')">📋 تفاصيل</button>
        <button class="btn btn-ok btn-sm" onclick="openDetailBon('${e.id}')">🎁</button>
        <button class="btn btn-dn btn-sm btn-ic" onclick="qDel('${e.id}')">🗑️</button>
      </div></td></tr>`;
  }).join('');
}



function renderSalTable(){
  const tb=document.getElementById('salTable'); if(!tb)return;
  const emps=DB.get('emps')||[];
  tb.innerHTML=emps.map(e=>{
    const c=calcSalary(e);
    return `<tr>
      <td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
      <td><span class="gnum">${fmtN(e.sal)}</span></td>
      <td><span class="tgrn bold">${fmtN(c.earnedSalary)}</span></td>
      <td><span style="color:var(--purple)">+${fmtN(c.shiftBonTotal)}</span></td>
      <td><span class="tgrn">+${fmtN(c.salesBonTotal+c.otherBonTotal)}</span></td>
      <td><span class="tred">-${fmtN(c.totalDed)}</span></td>
      <td><span class="gnum" style="font-size:14px">${fmtN(c.net)}</span></td>
      <td><button class="btn btn-sc btn-sm" onclick="openDetail('${e.id}');setTimeout(()=>showDTab('sal'),100)">📊</button></td>
    </tr>`;
  }).join('');
}

function renderShTable(){
  const tb=document.getElementById('shTable'); if(!tb)return;
  const emps=DB.get('emps')||[];
  tb.innerHTML=emps.map(e=>{
    const sh=SHIFTS[e.sh]||{};
    return `<tr>
      <td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
      <td><span class="shbadge">${shiftLabel(e)}</span></td>
      <td>${sh.full?'<span class="tgld bold">كامل</span>':'<span class="tcyn">نصفي</span>'}</td>
      <td>${sh.full?'<span class="tgrn bold">10,000 د.ع</span>':'<span class="muted">—</span>'}</td>
      <td><button class="btn btn-sc btn-sm" onclick="openQS('${e.id}','${e.name}','${e.sh}')">✏️</button></td>
    </tr>`;
  }).join('');
}

function renderIncTab(emps){
  const sel=document.getElementById('incEmpSel');
  if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  const rb=document.getElementById('recentBon'); if(!rb)return;
  const all=[];
  emps.forEach(e=>(e.bon||[]).forEach((b,i)=>all.push({...b,ename:e.name,eid:e.id,idx:i})));
  all.sort((a,b)=>b.date.localeCompare(a.date));
  rb.innerHTML=all.slice(0,15).length?all.slice(0,15).map(b=>`
    <div class="bi"><div><div class="br2">${b.ename} — ${b.note||b.type}</div><div class="bd">${fmtD(b.date)}</div></div>
    <div class="flex g8" style="align-items:center"><div class="ba">+${fmtN(b.amount)} د.ع</div>
    <button class="btn btn-dn btn-sm btn-ic" onclick="removeBonFromList('${b.eid}',${b.idx})">🗑️</button>
    </div></div>`).join(''):`<div class="empty" style="padding:20px"><div class="ei" style="font-size:26px">🎁</div><p>لا توجد حوافز</p></div>`;
}

function removeBonFromList(empId,idx){
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===empId); if(i===-1)return;
  emps[i].bon.splice(idx,1); DB.set('emps',emps); renderAdmin();
  showToast('تم إلغاء الحافز','i');
}

function renderRatingTab(emps){
  const c=document.getElementById('ratingContainer'); if(!c)return;
  c.innerHTML=`<div class="rate-grid">${emps.map(e=>`
    <div class="rate-card">
      <div class="rname">${e.name}</div>
      <div class="rate-stars">${[1,2,3,4,5].map(i=>`<span class="star ${e.rating>=i?'active':''}" onclick="setRating('${e.id}',${i})">⭐</span>`).join('')}</div>
      <div style="font-size:11px;color:var(--t2)">${e.rating} من 5</div>
    </div>`).join('')}</div>`;
}

function setRating(empId,rating){
  const emps=DB.get('emps')||[], i=emps.findIndex(e=>e.id===empId);
  if(i!==-1){emps[i].rating=rating;DB.set('emps',emps);renderRatingTab(emps);showToast('✅ تم حفظ التقييم','s');}
}

function renderMsgSelect(emps){
  const sel=document.getElementById('msgEmpSel');
  if(sel)sel.innerHTML=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
}

function renderSentMessages(){
  var c=document.getElementById('sentMessages'); if(!c)return;
  var msgs=(DB.get('msg')||[]).sort(function(a,b){return new Date(b.ts)-new Date(a.ts);});
  if(!msgs.length){c.innerHTML='<div class="empty" style="padding:20px"><div class="ei" style="font-size:26px">📭</div><p>لا توجد رسائل</p></div>';return;}
  var html='';
  msgs.forEach(function(m){
    var isReply=m.type==='reply';
    html+='<div class="'+(isReply?'msg-reply':'msg-item')+'" style="position:relative">';
    html+='<div class="msg-head">';
    html+='<div class="msg-avatar">'+(isReply?'↩️':'👤')+'</div>';
    html+='<div style="flex:1">';
    html+='<div class="msg-name">'+(isReply?'↩️ رد من '+m.ename:'📤 لـ '+m.ename)+'</div>';
    html+='<div class="msg-time">'+fmtD(m.date)+' — '+m.time+'</div>';
    html+='</div>';
    html+='<button class="btn btn-dn btn-sm btn-ic" onclick="deleteMessage(\'' + m.id + '\')" style="padding:4px 8px;font-size:11px" title="حذف الرسالة">🗑️</button>';
    html+='</div>';
    html+='<div class="msg-text">'+m.text+'</div>';
    html+='</div>';
  });
  c.innerHTML=html;
}
function deleteMessage(id){
  if(!confirm('حذف هذه الرسالة؟'))return;
  let msgs=DB.get('msg')||[];
  msgs=msgs.filter(m=>m.id!==id);
  DB.set('msg',msgs);
  renderSentMessages();
  showToast('🗑️ تم حذف الرسالة','i');
}


function renderAdminArchive(){
  const c=document.getElementById('adminArchList'); if(!c)return;
  const archive=DB.get('archive')||{periods:[]};
  const sel=document.getElementById('archEmpFilter');
  const emps=DB.get('emps')||[];
  if(sel&&sel.options.length<=1){
    emps.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;sel.appendChild(o);});
  }
  const filterEmpId=sel?.value||'';
  const periods=archive.periods;
  if(!periods.length){c.innerHTML=`<div class="empty"><div class="ei">🗄️</div><p>لا توجد فترات مؤرشفة بعد<br><small>ستُحفظ تلقائياً عند نهاية كل فترة</small></p></div>`;return;}
  c.innerHTML=periods.map(per=>{
    const empsToShow=filterEmpId?per.employees.filter(e=>e.id===filterEmpId):per.employees;
    if(!empsToShow.length)return'';
    const totalNet=empsToShow.reduce((s,e)=>s+e.net,0);
    return `<div class="arch-period" onclick="showAdminArchDetail('${per.key}')">
      <div class="arch-ph">
        <div>
          <div style="font-size:14px;font-weight:700">🗄️ ${per.label}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:3px">يوم الصرف: ${fmtD(per.payDate)} | أُرشف: ${new Date(per.archivedAt).toLocaleDateString('ar-IQ')}</div>
        </div>
        <div style="text-align:left">
          <div class="gnum" style="font-size:15px">${fmtN(totalNet)} د.ع</div>
          <div style="font-size:11px;color:var(--t2)">${empsToShow.length} موظف</div>
        </div>
      </div>
    </div>`;
  }).filter(Boolean).join('');
  if(!c.innerHTML)c.innerHTML=`<div class="empty"><div class="ei">🗄️</div><p>لا توجد بيانات للفلتر المحدد</p></div>`;
}

function showAdminArchDetail(periodKey){
  const archive=DB.get('archive')||{periods:[]};
  const per=archive.periods.find(p=>p.key===periodKey); if(!per)return;
  document.getElementById('archDetailTitle').textContent=`أرشيف: ${per.label}`;
  const totalNet=per.employees.reduce((s,e)=>s+e.net,0);
  document.getElementById('archDetailContent').innerHTML=`
    <div style="background:rgba(240,192,64,.06);border:1px solid rgba(240,192,64,.2);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-size:15px;font-weight:800;color:var(--gold);margin-bottom:4px">${per.label}</div>
      <div style="font-size:12px;color:var(--t2)">يوم الصرف: ${fmtD(per.payDate)} | إجمالي: ${fmtN(totalNet)} د.ع</div>
    </div>
    <div class="tw"><table><thead><tr><th>الموظف</th><th>حضور</th><th>مكتسب</th><th>حوافز</th><th>خصم</th><th>إجمالي</th></tr></thead><tbody>
    ${per.employees.map(e=>`<tr>
      <td><div class="tname"><div class="eav">${e.name[0]}</div>${e.name}</div></td>
      <td>${e.daysPresent}</td>
      <td class="tgrn">${fmtN(e.earnedSalary)}</td>
      <td class="tgrn">+${fmtN(e.totalBon)}</td>
      <td class="tred">-${fmtN(e.totalDed)}</td>
      <td class="gnum bold">${fmtN(e.net)}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
  openModal('archDetailModal');
}

function updateCharts(emps,att,today){
  const salCanv=document.getElementById('salaryChart');
  if(salCanv){
    if(salChartI)salChartI.destroy();
    salChartI=new Chart(salCanv.getContext('2d'),{
      type:'bar',
      data:{labels:emps.map(e=>e.name.split(' ')[0]),datasets:[{label:'الراتب المستحق (د.ع)',data:emps.map(e=>calcSalary(e).net),backgroundColor:'rgba(240,192,64,0.5)',borderColor:'rgba(240,192,64,0.9)',borderWidth:2,borderRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#5a6080'},grid:{color:'rgba(255,255,255,.05)'}},x:{ticks:{color:'#9095b8'},grid:{display:false}}}}
    });
  }
  const presCount=new Set((att||[]).filter(a=>a.date===today&&a.type==='ci').map(a=>a.eid)).size;
  const attCanv=document.getElementById('attendanceChart');
  if(attCanv){
    if(attChartI)attChartI.destroy();
    attChartI=new Chart(attCanv.getContext('2d'),{
      type:'doughnut',
      data:{labels:['حاضرون','غائبون'],datasets:[{data:[presCount,emps.length-presCount],backgroundColor:['rgba(0,230,118,0.45)','rgba(233,69,96,0.45)'],borderColor:['rgba(0,230,118,0.8)','rgba(233,69,96,0.8)'],borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#9095b8',font:{family:'Cairo'}}}}}
    });
  }
}

function showATab(id,el){
  document.querySelectorAll('#adminScreen .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#adminScreen .sitem').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('#adminScreen .mnav-item').forEach(s=>s.classList.remove('active'));
  const tabEl=document.getElementById('at-'+id);
  if(tabEl)tabEl.classList.add('active');
  if(el)el.classList.add('active');
  renderAdmin();
  // Tab-specific renders
  if(id==='map')refreshMapData();
  if(id==='groupchat'){renderAdminChat();setTimeout(()=>{const c=document.getElementById('adminChatMessages');if(c)c.scrollTop=c.scrollHeight;},100);}
  if(id==='advrep')renderAdvReports();
  if(id==='logs')renderAdminLogs();
  if(id==='leave')renderLeaveRequests();
  if(id==='loans')try{renderAdminLoans();}catch(e){}
  if(id==='sh'){try{renderShiftSchedule();}catch(e){} try{renderShiftArchive();}catch(e){}}
  if(id==='sales'){renderSalesToday();renderSalesLog();initSaleFilter();}
  document.getElementById('adminMainScroll')?.scrollTo(0,0);
}

// ═══════════════════════════════════════════════════
//  3AM DAILY PROMPT
// ═══════════════════════════════════════════════════
function open3amPromptAuto(){open3amPrompt();}
function open3amPromptManual(){open3amPrompt();}

function open3amPrompt(){
  const emps=DB.get('emps')||[];
  // Full shift list
  document.getElementById('promptFullShiftList').innerHTML=emps.map(e=>`
    <div class="prompt-emp-row">
      <div><div class="prompt-emp-name">${e.name}</div><div class="prompt-emp-status">${shiftLabel(e)}</div></div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="pfs_${e.id}" style="width:16px;height:16px;accent-color:var(--gold)">
        <span style="font-size:12px;color:var(--t2)">شفت كامل</span>
      </label>
    </div>`).join('');
  // Leave list
  document.getElementById('promptLeaveList').innerHTML=emps.map(e=>`
    <div class="prompt-emp-row">
      <div class="prompt-emp-name">${e.name}</div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="plv_${e.id}" style="width:16px;height:16px;accent-color:var(--purple)">
        <span style="font-size:12px;color:var(--t2)">إجازة</span>
      </label>
    </div>`).join('');
  // Cheese bonus
  document.getElementById('promptCheeseList').innerHTML=emps.map(e=>`
    <div class="prompt-emp-row">
      <div class="prompt-emp-name">${e.name}</div>
      <div style="display:flex;align-items:center;gap:6px">
        <input type="number" class="prompt-cheese-input" id="pch_${e.id}" placeholder="0" min="0">
        <span style="font-size:11px;color:var(--t2)">قطعة</span>
      </div>
    </div>`).join('');
  openModal('promptModal');
}

function submitPrompt(){
  const emps=DB.get('emps')||[];
  const today=todayStr();
  let added=[];
  emps.forEach(emp=>{
    const fullShift=document.getElementById('pfs_'+emp.id)?.checked;
    const leave=document.getElementById('plv_'+emp.id)?.checked;
    const cheeseQty=parseInt(document.getElementById('pch_'+emp.id)?.value)||0;
    const empIdx=emps.findIndex(e=>e.id===emp.id);
    if(empIdx===-1)return;
    if(fullShift){
      if(!emps[empIdx].bon)emps[empIdx].bon=[];
      emps[empIdx].bon.push({type:'shift',amount:SHIFT_BON,note:'دوام كامل — من استفسار 3ص',date:today});
      added.push(`✅ ${emp.name}: شفت كامل +${fmtN(SHIFT_BON)}`);
    }
    if(leave){
      const per=getPeriod();
      const lvKey='lvM';
      emps[empIdx][lvKey]=(emps[empIdx][lvKey]||0)+1;
      added.push(`🌴 ${emp.name}: إجازة`);
    }
    if(cheeseQty>0){
      if(!emps[empIdx].bon)emps[empIdx].bon=[];
      const type=cheeseQty>=200?'sales200':'sales100';
      const amt=cheeseQty>=200?INC200:INC100;
      emps[empIdx].bon.push({type,amount:amt,note:`${cheeseQty} قطعة جبن`,date:today});
      added.push(`🧀 ${emp.name}: ${cheeseQty} قطعة = +${fmtN(amt)}`);
    }
  });
  DB.set('emps',emps);
  // Build TG message
  const summary=`📋 استفسار يومي — ${fmtD(today)}\n━━━━━━━━━━━━━━━\n${added.length?added.join('\n'):'لا توجد تحديثات اليوم'}`;
  sendTg(summary);
  closeModal('promptModal');
  renderAdmin();
  showToast(added.length?`✅ تم تسجيل ${added.length} إجراء`:'تم الإغلاق','s');
}

// ═══════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════
