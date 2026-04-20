// ═══ chat.js ═══
// Firebase sync init
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    try{ initFirebase(_REAL_FB_CFG); }catch(e){ console.error('FB boot:',e); }
  },600);
});
// Try auto-login (remember me)
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(tryAutoLogin,100);
});



// ══════════════════════════════════════════════════════
//  NEW FEATURES v3 — الميزات الجديدة
// ══════════════════════════════════════════════════════

// ── صوت الإشعارات ──
function playNotifSound(type){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if(type==='in'){osc.frequency.value=880;gain.gain.value=0.3;}
    else if(type==='out'){osc.frequency.value=440;gain.gain.value=0.3;}
    else if(type==='msg'){osc.frequency.value=660;gain.gain.value=0.25;}
    else if(type==='alert'){osc.frequency.value=1000;gain.gain.value=0.4;}
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
    osc.stop(ctx.currentTime+0.6);
  }catch(e){}
}

// ── توكن تليجرام قابل للتعديل ──
function getActiveTgToken(){
  return DB.get('tgToken')||TG_TOKEN;
}
async function sendTg(text){
  const chatId=DB.get('tgId')||TG_CHAT_DEFAULT;
  const token=getActiveTgToken();
  if(!chatId||chatId==='YOUR_CHAT_ID')return;
  const maxLen=4000;
  const chunks=[];
  for(let i=0;i<text.length;i+=maxLen)chunks.push(text.slice(i,i+maxLen));
  for(const chunk of chunks){
    try{
      const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:chatId.toString(),text:chunk})
      });
      const d=await r.json();
      if(!d.ok)console.warn('TG:',d.description);
    }catch(e){console.log('TG err:',e)}
  }
}
function saveTgSettings(){
  const chatId=document.getElementById('tgChatId').value.trim();
  const token=document.getElementById('tgTokenInput').value.trim();
  DB.set('tgId',chatId||TG_CHAT_DEFAULT);
  if(token)DB.set('tgToken',token);
  const disp=document.getElementById('tgTokenDisplay');
  if(disp){const t=getActiveTgToken();disp.textContent=t.substring(0,20)+'...';}
  showToast('✅ تم حفظ إعدادات تليجرام','s');
}
function getActiveTgToken(){return DB.get('tgToken')||TG_TOKEN;}
function loadTgDisplay(){
  const t=getActiveTgToken();
  const disp=document.getElementById('tgTokenDisplay');
  if(disp)disp.textContent=t.substring(0,25)+'...';
  const inp=document.getElementById('tgTokenInput');
  if(inp)inp.value=DB.get('tgToken')||'';
  const cid=document.getElementById('tgChatId');
  if(cid)cid.value=DB.get('tgId')||TG_CHAT_DEFAULT;
  // retry queue
  setTimeout(_retryTgQueue,3000);
}

// ── سجل عمليات المدير ──
function addAdminLog(action, desc, data){
  const logs=DB.get('adminLogs')||[];
  const now=new Date();
  logs.unshift({
    id:genId(),action,desc,data,
    date:todayStr(),time:fmtT(now),ts:now.toISOString(),
    by:CU?.role==='admin'?'المدير':(getEmp()?.name||'موظف')
  });
  if(logs.length>500)logs.length=500;
  DB.set('adminLogs',logs);
}
function renderAdminLogs(){
  const c=document.getElementById('adminLogsList');if(!c)return;
  let logs=DB.get('adminLogs')||[];
  const q=(document.getElementById('logsSearch')?.value||'').toLowerCase();
  if(q)logs=logs.filter(l=>(l.desc||'').toLowerCase().includes(q)||(l.action||'').toLowerCase().includes(q));
  if(!logs.length){c.innerHTML='<div class="empty"><div class="ei">📝</div><p>لا توجد عمليات مسجلة</p></div>';return;}
  const icons={check_in:'✅',check_out:'🚪',salary_edit:'💰',bonus_add:'🎁',bonus_del:'🗑️',ded_add:'📉',ded_del:'🗑️',shift_edit:'🕐',emp_add:'👤',emp_del:'🗑️',leave_approve:'✅',leave_reject:'❌',att_delete:'🗑️',tg_token:'🔑',default:'📝'};
  c.innerHTML=logs.map(l=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04)">
      <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icons[l.action]||icons.default}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600">${l.desc}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">${fmtD(l.date)} — ${l.time} | ${l.by}</div>
      </div>
    </div>`).join('');
}
function clearAdminLogs(){
  if(!confirm('مسح كل سجل العمليات؟'))return;
  DB.del('adminLogs');renderAdminLogs();showToast('تم المسح','i');
}

// ── حذف تسجيل حضور (للموظف) ──
function empDeleteLastAtt(){
  const emp=getEmp();if(!emp)return;
  const att=DB.get('att')||[];
  const empAtt=att.filter(a=>a.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!empAtt.length){showToast('لا يوجد تسجيل لحذفه','e');return;}
  const last=empAtt[0];
  if(!confirm(`حذف تسجيل ${last.type==='ci'?'الحضور':'الانصراف'} بتاريخ ${fmtD(last.date)} — ${last.time}؟`))return;
  const newAtt=att.filter(a=>a.id!==last.id);
  DB.set('att',newAtt);
  addAdminLog('att_delete',`حذف تسجيل ${last.type==='ci'?'حضور':'انصراف'}: ${emp.name}`,{eid:emp.id,date:last.date,time:last.time,type:last.type});
  sendTg(`⚠️ حذف تسجيل\n👤 ${emp.name}\nالنوع: ${last.type==='ci'?'حضور':'انصراف'}\nالتاريخ: ${fmtD(last.date)} — ${last.time}\n📌 تم الحذف بواسطة الموظف`);
  updTodayStatus(emp.id);renderEmpHist(emp.id);renderDayGrid(emp.id);updAttBtns();
  renderEmpLastAtt();
  showToast('✅ تم حذف التسجيل وإشعار المدير','s');
}
function renderEmpLastAtt(){
  const c=document.getElementById('empLastAttRecord');if(!c)return;
  const emp=getEmp();if(!emp){c.innerHTML='';return;}
  const att=DB.get('att')||[];
  const empAtt=att.filter(a=>a.eid===emp.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!empAtt.length){c.innerHTML='<div class="empty"><div class="ei">📭</div><p>لا توجد تسجيلات</p></div>';return;}
  const last=empAtt[0];
  c.innerHTML=`<div style="background:rgba(233,69,96,.06);border:1px solid rgba(233,69,96,.2);border-radius:12px;padding:14px">
    <div style="font-size:11px;color:var(--t3);margin-bottom:6px">آخر تسجيل:</div>
    <div style="font-size:14px;font-weight:700">${last.type==='ci'?'✅ حضور':'🚪 انصراف'}</div>
    <div style="font-size:12px;color:var(--t2);margin-top:4px">${fmtD(last.date)} — ${last.time}</div>
  </div>`;
}

// ── حذف تسجيل حضور (للمدير) ──
function adminDeleteAtt(attId){
  if(!confirm('حذف هذا التسجيل نهائياً؟'))return;
  const att=DB.get('att')||[];
  const rec=att.find(a=>a.id===attId);
  if(!rec)return;
  DB.set('att',att.filter(a=>a.id!==attId));
  addAdminLog('att_delete',`حذف تسجيل ${rec.type==='ci'?'حضور':'انصراف'}: ${rec.ename}`,{date:rec.date,time:rec.time});
  renderAdminAtt();renderAdmin();
  showToast('🗑️ تم الحذف','i');
}

// ── رد الموظف على رسالة المدير ──
function empReplyToManager(){
  const emp=getEmp();if(!emp)return;
  const text=document.getElementById('empReplyText').value.trim();
  if(!text){showToast('اكتب ردك أولاً','e');return;}
  const now=new Date();
  const reply={id:genId(),eid:emp.id,ename:emp.name,type:'reply',text,date:todayStr(),time:fmtT(now),ts:now.toISOString()};
  const msgs=DB.get('msg')||[];msgs.push(reply);DB.set('msg',msgs);
  sendTg(`↩️ رد من موظف\n👤 ${emp.name}\n💬 ${text}\n🕐 ${fmtT(now)}`);
  playNotifSound('msg');
  document.getElementById('empReplyText').value='';
  showToast('✅ تم إرسال ردك للمدير','s');
}

// ── طلبات الإجازة ──
