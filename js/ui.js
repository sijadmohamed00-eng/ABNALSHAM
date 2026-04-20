function startClock(){
  const t=setInterval(()=>{
    const now=new Date();
    const s=now.toLocaleTimeString('ar-IQ',{hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});
    ['empClock','adminClock'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=s});
    // reset يومي ساعة 5:00:00 صباحاً
    if(now.getHours()===5&&now.getMinutes()===0&&now.getSeconds()===0){
      _dailyAttReset();
    }
    // smart alerts كل دقيقة
    if(now.getSeconds()===0)checkSmartAlerts();
  },1000);
  autoTimers.push(t);
}

// ── reset يومي للحضور ساعة 5 صباحاً ──
function _dailyAttReset(){
  const today=todayStr();
  const lastReset5=DB.get('lastReset5')||'';
  if(lastReset5===today)return; // نفّذ مرة واحدة فقط لكل يوم
  DB.set('lastReset5',today);

  // أرشفة الفترة إذا وصلنا لأول الشهر
  checkPeriodReset();

  // إشعار المدير بملخص الأمس
  const att=DB.get('att')||[];
  const emps=DB.get('emps')||[];
  // حساب أمس
  const yest=new Date(); yest.setDate(yest.getDate()-1);
  const yestStr=yest.toISOString().split('T')[0];
  const presYest=emps.filter(e=>att.some(a=>a.eid===e.id&&a.date===yestStr&&a.type==='ci'));
  const absYest=emps.filter(e=>!att.some(a=>a.eid===e.id&&a.date===yestStr&&a.type==='ci'));

  // بناء تقرير الأمس + إرسال لتليجرام
  let msg=`🌅 تقرير نهاية اليوم — ${fmtD(yestStr)}\n`;
  msg+=`━━━━━━━━━━━━━━━\n`;
  msg+=`✅ حضروا (${presYest.length}): ${presYest.map(e=>e.name).join('، ')||'—'}\n`;
  msg+=`❌ غابوا (${absYest.length}): ${absYest.map(e=>e.name).join('، ')||'—'}\n`;
  absYest.forEach(e=>{
    // تسجيل غياب تلقائي (بدون تسجيل حضور)
    // لا نضيف سجل غياب في att — فقط يُحسب من غياب الحضور
    // يمكن إضافة علامة غياب للمدير
  });
  msg+=`━━━━━━━━━━━━━━━\n⏰ سيبدأ دوام ${fmtD(today)} بعد قليل`;
  sendTg(msg);
  saveReportToArchive(msg,'auto');

  // إشعار في الواجهة إذا كان المدير مسجلاً
  if(CU?.role==='admin'){
    showToast(`🌅 Reset يومي — ${absYest.length} غائب أمس، ${presYest.length} حضروا`,'i');
    renderAdmin();
  }
  console.log('✅ Daily reset done at 5AM —',today);
}



// ═══════════════════════════════════════════════════
//  GPS
// ═══════════════════════════════════════════════════
let _gpsWatchId=null;
let _autoCoEnabled=true; // الانصراف التلقائي مُفعَّل افتراضياً
const AUTO_CO_DIST=750; // متر

