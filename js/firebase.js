let fbDB=null,fbSyncEnabled=false;
const DB={
  get(k){try{return JSON.parse(localStorage.getItem('ccs2_'+k))}catch{return null}},
  set(k,v){localStorage.setItem('ccs2_'+k,JSON.stringify(v));if(typeof SYNC_KEYS!=='undefined'&&SYNC_KEYS.includes(k)&&typeof _syncToCloud==='function')_syncToCloud(k,v);},
  del(k){localStorage.removeItem('ccs2_'+k)}
};
// ═══ FIREBASE REALTIME SYNC ═══
// ═══ FIREBASE CONFIG (REAL - abn-alsham) ═══
const _REAL_FB_CFG={
  apiKey:"AIzaSyD4K4EmitS27MR37Pl8Ch8jnhlhYoOJMJE",
  authDomain:"abn-alsham.firebaseapp.com",
  databaseURL:"https://abn-alsham-default-rtdb.firebaseio.com",
  projectId:"abn-alsham",
  storageBucket:"abn-alsham.firebasestorage.app",
  messagingSenderId:"258845579071",
  appId:"1:258845579071:web:325db30f3d9b8a666c0312",
  measurementId:""
};

function getFbCfg(){
  // Always use the real project config
  return _REAL_FB_CFG;
}

let fbApp=null;
// ════════════════════════════════════════════
//  FIREBASE SYNC — COMPLETE REWRITE
// ════════════════════════════════════════════
const SYNC_KEYS=['emps','att','msg','reports','archive','groupChat','leaveRequests','salesLog','adminLogs','loanRequests','shiftArchives','dailyShifts'];
let _fbListening=false;

function initFirebase(cfg){
  if(typeof firebase==='undefined'){
    _setSyncUI('fail','❌ SDK لم يُحمّل');
    return;
  }
  try{
    // Init app once — safe check
    try{
      if(!firebase.apps||firebase.apps.length===0){
        firebase.initializeApp(cfg||getFbCfg());
      }
    }catch(initErr){
      // already initialized — ignore
    }
    fbApp=firebase.apps[0];
    fbDB=firebase.database();
    fbSyncEnabled=true;

    // Test connection
    fbDB.ref('.info/connected').on('value', snap=>{
      const online=snap.val()===true;
      _setSyncUI(online?'ok':'fail', online?'🟢 متزامن':'🔴 انقطع الاتصال');
    });

    // Start listening for remote changes
    if(!_fbListening){
      _fbListening=true;
      _startListeners();
    }

    // On first connect: pull cloud data then push local if cloud empty
    _mergeOnConnect();

  }catch(e){
    _setSyncUI('fail','❌ '+e.message);
    console.error('FB init error:',e);
  }
}

function _setSyncUI(state, label){
  const ss=document.getElementById('syncStatus');
  const sb=document.getElementById('syncBadge');
  const dot=document.getElementById('empSyncDot');
  const colors={ok:'var(--green)',fail:'var(--red)',warn:'#ff9800'};
  const col=colors[state]||colors.warn;
  if(ss){ss.textContent=label;ss.style.color=col;}
  if(sb){sb.textContent=label;sb.style.color=col;sb.style.background=state==='ok'?'rgba(0,230,118,.12)':'rgba(233,69,96,.1)';}
  if(dot){dot.style.background=col;dot.style.boxShadow=state==='ok'?'0 0 6px var(--green)':'none';}
}

function _mergeOnConnect(){
  if(!fbDB)return;
  // Pull ALL cloud data first, then decide
  fbDB.ref('ccs').once('value').then(snap=>{
    const cloud=snap.val()||{};
    const cloudEmpty=!cloud.emps||!Array.isArray(cloud.emps)||cloud.emps.length===0;
    if(cloudEmpty){
      // Cloud is empty → push local data up
      _pushAllToCloud();
    } else {
      // Cloud has data → pull it locally (cloud wins)
      SYNC_KEYS.forEach(k=>{
        if(cloud[k]!==undefined&&cloud[k]!==null){
          localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));
        }
      });
      // Refresh UI after pull
      setTimeout(()=>{
        try{
          if(CU?.role==='admin')renderAdmin();
          else if(CU?.role==='emp'){const e=getEmp();if(e){refreshEmpUI(e);renderEmpMessages(e.id);}}
        }catch(e){}
      },300);
    }
  }).catch(e=>console.error('merge err:',e));
}

function _pushAllToCloud(){
  if(!fbDB)return;
  const updates={};
  SYNC_KEYS.forEach(k=>{
    const v=DB.get(k);
    if(v!==null&&v!==undefined)updates['ccs/'+k]=v;
  });
  if(Object.keys(updates).length>0){
    fbDB.ref().update(updates)
      .then(()=>console.log('Local data pushed to cloud OK'))
      .catch(e=>console.error('push err:',e));
  }
}

function _startListeners(){
  if(!fbDB)return;
  SYNC_KEYS.forEach(key=>{
    fbDB.ref('ccs/'+key).on('value', snap=>{
      const v=snap.val();
      if(v===null||v===undefined)return;
      // Write to local storage
      localStorage.setItem('ccs2_'+key,JSON.stringify(v));
      // Update UI live
      clearTimeout(window['_rt_'+key]);
      window['_rt_'+key]=setTimeout(()=>{
        try{
          if(key==='emps'||key==='att'){
            if(CU?.role==='admin'){
              if(document.getElementById('adminScreen')?.classList.contains('active'))renderAdmin();
            } else if(CU?.role==='emp'){
              const emp=getEmp();
              if(emp){refreshEmpUI(emp);renderDayGrid(emp.id);renderEmpAttPattern(emp.id);updAttBtns();updTodayStatus(emp.id);}
            }
          }
          if(key==='msg'&&CU?.role==='emp'){
            const emp=getEmp();if(emp)renderEmpMessages(emp.id);
            playNotifSound('msg');
          }
          if(key==='msg'&&CU?.role==='admin'){
            renderSentMessages();
            // Check if there's a new reply from employee
            const msgs=DB.get('msg')||[];
            const recent=msgs.filter(m=>m.type==='reply'&&m.ts&&(Date.now()-new Date(m.ts).getTime())<10000);
            if(recent.length>0)playNotifSound('msg');
          }
          if(key==='att'){
            // إشعار المدير عند تسجيل حضور/انصراف موظف
            if(CU?.role==='admin'){
              const att=DB.get('att')||[];
              const recent=att.filter(a=>a.ts&&(Date.now()-new Date(a.ts).getTime())<10000);
              if(recent.length>0){
                recent.forEach(a=>{
                  if(a.type==='ci')showToast(`✅ ${a.ename} سجّل الحضور — ${a.time}`,'s');
                  else showToast(`🚪 ${a.ename} سجّل الانصراف — ${a.time}`,'i');
                });
                playNotifSound('in');
              }
            }
          }
        }catch(e){}
      },300);
    });
  });
}

// Called by DB.set — writes to cloud immediately
function _syncToCloud(key, value){
  if(!fbDB||!fbSyncEnabled)return;
  fbDB.ref('ccs/'+key).set(value)
    .catch(e=>{
      console.error('sync write err:',key,e.code,e.message);
      _setSyncUI('fail','❌ خطأ كتابة: '+e.code);
    });
}
// ═══ END FIREBASE ═══


let CU=null, DID=null, QSID=null, gpsOk=false, uLat=null, uLng=null;
let salChartI=null, attChartI=null;
let autoTimers=[];
let viewingReportId=null;

// Work location (editable)
function getWorkLoc(){return DB.get('workLoc')||{lat:33.3089,lng:44.4425,rad:100}}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════
function todayStr(){return new Date().toISOString().split('T')[0]}
function fmtN(n){return(n||0).toLocaleString('ar-IQ')}
function fmtNS(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return Math.round(n/1000)+'K';return fmtN(n)}
function fmtT(d){return d.toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit',hour12:true})}
function fmtD(s){try{return new Date(s+'T00:00:00').toLocaleDateString('ar-IQ',{weekday:'short',day:'numeric',month:'short'})}catch{return s}}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function calcDist(la1,lo1,la2,lo2){
  const R=6371000,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
// shiftLabel overridden below



// ═══ FIREBASE UI FUNCTIONS ═══
function saveAndInitFirebase(){
  const url=document.getElementById('fbDatabaseURL')?.value.trim();
  const key=document.getElementById('fbApiKey')?.value.trim();
  const pid=document.getElementById('fbProjectId')?.value.trim();
  const aid=document.getElementById('fbAppId')?.value.trim();
  if(!url||!key||!pid){showToast('أدخل Database URL و API Key و Project ID','e');return;}
  const cfg={
    apiKey:key,
    authDomain:pid+'.firebaseapp.com',
    databaseURL:url,
    projectId:pid,
    storageBucket:pid+'.appspot.com',
    appId:aid||'',
    messagingSenderId:''
  };
  localStorage.setItem('ccs2_fbcfg',JSON.stringify(cfg));
  const msg=document.getElementById('fbStatusMsg');
  if(msg)msg.textContent='⏳ جاري الاتصال...';
  // Re-init
  fbApp=null; fbDB=null; fbSyncEnabled=false;
  try{
    if(firebase.apps&&firebase.apps.length)firebase.apps[0].delete();
  }catch(e){}
  setTimeout(()=>{
    initFirebase(cfg);
    const msg2=document.getElementById('fbStatusMsg');
    if(msg2)msg2.textContent=fbSyncEnabled?'✅ تم الاتصال بنجاح! البيانات تتزامن الآن بين جميع الأجهزة.':'❌ فشل الاتصال — تحقق من الإعدادات';
    updateSyncBadge();
  },2000);
  showToast('⏳ جاري تفعيل المزامنة...','i');
}

function testFirebase(){
  if(!fbSyncEnabled||!fbDB){showToast('فعّل المزامنة أولاً','e');return;}
  fbDB.ref('ccs/test').set({t:Date.now(),msg:'اختبار سندريلا'})
    .then(()=>{showToast('✅ اتصال Firebase يعمل بشكل مثالي!','s');})
    .catch(e=>{showToast('❌ خطأ: '+e.message,'e');});
}

function clearFirebaseConfig(){
  if(!confirm('إلغاء المزامنة؟ ستعمل البيانات محلياً فقط.'))return;
  localStorage.removeItem('ccs2_fbcfg');
  fbApp=null; fbDB=null; fbSyncEnabled=false;
  updateSyncBadge();
  showToast('تم إلغاء المزامنة','i');
}

function forcePushToCloud(){
  if(!fbDB){
    showToast('⏳ جاري الاتصال...','i');
    initFirebase(_REAL_FB_CFG);
    setTimeout(()=>{
      if(fbSyncEnabled)forcePushToCloud();
      else showToast('❌ تعذّر الاتصال — تحقق من Firebase Rules','e');
    },2000);
    return;
  }
  const updates={};
  SYNC_KEYS.forEach(k=>{const v=DB.get(k);if(v!==null&&v!==undefined)updates['ccs/'+k]=v;});
  showToast('⏳ جاري رفع البيانات...','i');
  fbDB.ref().update(updates)
    .then(()=>showToast('✅ تم رفع كل البيانات للسحابة بنجاح!','s'))
    .catch(e=>{
      showToast('❌ خطأ: '+e.message,'e');
      console.error('force push err:',e);
    });
}

function updateSyncBadge(){
  const badge=document.getElementById('syncBadge');
  const status=document.getElementById('syncStatus');
  if(fbSyncEnabled){
    if(badge){badge.textContent='🟢 مفعّل';badge.style.background='rgba(0,230,118,.12)';badge.style.color='var(--green)';}
    if(status){status.textContent='🟢 متزامن';status.style.color='var(--green)';}
  } else {
    if(badge){badge.textContent='⚠️ غير مفعّل';badge.style.background='rgba(255,152,0,.12)';badge.style.color='#ff9800';}
    if(status){status.textContent='🔄 محلي';status.style.color='var(--t3)';}
  }
}

function loadFbInputs(){
  const cfg=getFbCfg();
  if(!cfg)return;
  const u=document.getElementById('fbDatabaseURL');
  const k=document.getElementById('fbApiKey');
  const p=document.getElementById('fbProjectId');
  const a=document.getElementById('fbAppId');
  if(u)u.value=cfg.databaseURL||'';
  if(k)k.value=cfg.apiKey||'';
  if(p)p.value=cfg.projectId||'';
  if(a)a.value=cfg.appId||'';
}
// ═══ END FIREBASE UI ═══
// ═══ LEAVE MARKERS ═══
function markLeaveDays(empId, count, half){
  // Used for visual indication only - leaves tracked via lvH1/lvH2
  const att=DB.get('att')||[];
  const per=getPeriod();
  const ps=per.start.toISOString().split('T')[0];
  const pe=per.end.toISOString().split('T')[0];
  // Remove existing leave markers for this emp+period
  const filtered=att.filter(a=>!(a.eid===empId&&a.type==='leave'&&a.date>=ps&&a.date<=pe));
  // We don't auto-add dates since admin specifies count not specific days
  DB.set('att',filtered);
}
// ═══════════════════════════════════════════════════
//  INIT DATA
// ═══════════════════════════════════════════════════
