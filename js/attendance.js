function startGPS(){
  checkGPS();
  startGPSWatch();
}

function startGPSWatch(){
  if(_gpsWatchId!==null)return; // لا تبدأ مرتين
  if(!navigator.geolocation)return;
  _gpsWatchId=navigator.geolocation.watchPosition(pos=>{
    uLat=pos.coords.latitude; uLng=pos.coords.longitude;
    const wl=getWorkLoc();
    const dist=calcDist(uLat,uLng,wl.lat,wl.lng);
    // تحديث GPS UI
    if(dist<=wl.rad){
      gpsOk=true;
      setGPSUI('ok',`✅ داخل نطاق العمل`,`المسافة: ${Math.round(dist)} م`);
      if(document.getElementById('ciSub'))document.getElementById('ciSub').textContent='موقعك مؤكد';
    }else{
      gpsOk=false;
      setGPSUI('fail',`📍 ${Math.round(dist)} م عن العمل`,`خارج نطاق تسجيل الحضور`);
      if(document.getElementById('ciSub'))document.getElementById('ciSub').textContent='خارج نطاق العمل';
    }
    updAttBtns();
    // ── الانصراف التلقائي عند المغادرة 750م ──
    if(_autoCoEnabled && CU?.role==='emp' && dist>=AUTO_CO_DIST){
      _tryAutoCheckout(dist);
    }
  },()=>{
    gpsOk=false;
    setGPSUI('fail','تعذّر تحديد الموقع','فعّل GPS');
    updAttBtns();
  },{enableHighAccuracy:true,timeout:15000,maximumAge:30000});
}

let _autoCoLock=false; // منع التكرار
function _tryAutoCheckout(distMeters){
  if(_autoCoLock)return;
  const emp=getEmp(); if(!emp)return;
  const att=DB.get('att')||[];
  // هل هناك حضور مفتوح بدون انصراف؟
  const allCI=att.filter(a=>a.eid===emp.id&&a.type==='ci').sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const openCI=allCI.find(ci=>!att.find(co=>co.eid===emp.id&&co.type==='co'&&co.date===ci.date));
  if(!openCI)return; // لا يوجد دوام مفتوح
  // تأكد لم ينصرف خلال آخر 5 دقائق تفادياً للتكرار
  const lastCO=att.filter(a=>a.eid===emp.id&&a.type==='co').sort((a,b)=>new Date(b.ts)-new Date(a.ts))[0];
  if(lastCO&&(Date.now()-new Date(lastCO.ts).getTime())<300000)return;
  _autoCoLock=true;
  setTimeout(()=>_autoCoLock=false,60000); // unlock بعد دقيقة
  // تسجيل الانصراف التلقائي
  const now=new Date();
  const mins=Math.round((now-new Date(openCI.ts))/60000);
  const h=Math.floor(mins/60),m=mins%60;
  const wl=getWorkLoc();
  att.push({
    id:genId(),eid:emp.id,ename:emp.name,
    type:'co',date:openCI.date,time:fmtT(now),
    ts:now.toISOString(),lat:uLat,lng:uLng,
    dist:Math.round(distMeters),durMins:mins,
    isAuto:true // علامة أنه تلقائي
  });
  DB.set('att',att);
  addAdminLog('check_out',`انصراف تلقائي: ${emp.name} (${Math.round(distMeters)}م)`,{eid:emp.id,auto:true,dist:Math.round(distMeters)});
  updTodayStatus(emp.id); renderEmpHist(emp.id); renderDayGrid(emp.id); updAttBtns(); refreshEmpUI(emp);
  sendTg(`🚗 انصراف تلقائي\n👤 ${emp.name}\n🕐 ${fmtT(now)}\n📍 ${Math.round(distMeters)} م عن العمل\n⏱️ ${h}س ${m}د`);
  playNotifSound('out');
  showToast(`🚗 انصراف تلقائي — ابتعدت ${Math.round(distMeters)} م عن العمل`,'i');
}

function checkGPS(){
  setGPSUI('checking','جاري تحديد الموقع...','يرجى السماح بالوصول');
  if(!navigator.geolocation){setGPSUI('fail','GPS غير مدعوم','');return}
  navigator.geolocation.getCurrentPosition(pos=>{
    uLat=pos.coords.latitude; uLng=pos.coords.longitude;
    const wl=getWorkLoc();
    const dist=calcDist(uLat,uLng,wl.lat,wl.lng);
    if(dist<=wl.rad){
      gpsOk=true;
      setGPSUI('ok',`✅ أنت داخل نطاق العمل`,`المسافة: ${Math.round(dist)} متر`);
      document.getElementById('ciSub').textContent='موقعك مؤكد';
    }else{
      gpsOk=false;
      setGPSUI('fail',`❌ خارج النطاق — ${Math.round(dist)} متر`,`الحد: ${wl.rad} متر`);
      document.getElementById('ciSub').textContent='يجب أن تكون في موقع العمل';
    }
    updAttBtns();
  },()=>{gpsOk=false;setGPSUI('fail','تعذّر تحديد الموقع','فعّل GPS وأعد المحاولة');updAttBtns()},
  {enableHighAccuracy:true,timeout:10000,maximumAge:0});
}
function setGPSUI(s,t,sb){
  const d=document.getElementById('gdot'),tx=document.getElementById('gtxt'),su=document.getElementById('gsub');
  if(d)d.className='gdot '+s; if(tx)tx.textContent=t; if(su)su.textContent=sb;
}

// ═══════════════════════════════════════════════════
//  EMPLOYEE SCREEN
// ═══════════════════════════════════════════════════
function getEmp(){return(DB.get('emps')||[]).find(e=>e.id===CU?.id)}

