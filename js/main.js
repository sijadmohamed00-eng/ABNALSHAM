initData();
startClock();
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
