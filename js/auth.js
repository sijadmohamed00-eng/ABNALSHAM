function doLogin(){
  const u=document.getElementById('lUser').value.trim();
  const p=document.getElementById('lPass').value.trim();
  const rem=document.getElementById('rememberMe').checked;
  const err=document.getElementById('lerr');
  const creds=DB.get('adminCreds')||{u:'sajjad_admin',pw:'Admin@2025'};
  if(u===creds.u&&p===creds.pw){
    CU={role:'admin'};
    err.classList.remove('show');
    if(rem)DB.set('remembered',{role:'admin'});
    // Pull from cloud first
    if(fbDB){
      fbDB.ref('ccs').once('value').then(snap=>{
        const cloud=snap.val()||{};
        SYNC_KEYS.forEach(k=>{if(cloud[k]!==null&&cloud[k]!==undefined)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
        showScreen('adminScreen'); renderAdmin(); startTimers();
        showToast('مرحباً يا سجاد 👑','s');
      }).catch(()=>{showScreen('adminScreen'); renderAdmin(); startTimers(); showToast('مرحباً يا سجاد 👑','s');});
    } else {
      showScreen('adminScreen'); renderAdmin(); startTimers();
      showToast('مرحباً يا سجاد 👑','s');
    }
    return;
  }
  const emp=(DB.get('emps')||[]).find(e=>e.u===u&&e.pw===p);
  if(emp){
    CU={role:'emp',id:emp.id};
    err.classList.remove('show');
    if(rem)DB.set('remembered',{role:'emp',id:emp.id});
    // Always pull fresh data from cloud before loading employee screen
    if(fbDB){
      fbDB.ref('ccs').once('value').then(snap=>{
        const cloud=snap.val()||{};
        SYNC_KEYS.forEach(k=>{if(cloud[k]!==null&&cloud[k]!==undefined)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
        const freshEmp=(DB.get('emps')||[]).find(e=>e.id===emp.id)||emp;
        showScreen('empScreen'); loadEmpScreen(freshEmp); startGPS();
      }).catch(()=>{showScreen('empScreen'); loadEmpScreen(emp); startGPS();});
      return;
    }
    showScreen('empScreen'); loadEmpScreen(emp); startGPS();
    const h=new Date().getHours();
    showToast(`${h<12?'صباح الخير':h<17?'مساء الخير':'ليلة سعيدة'} ${emp.name} 😊`,'i');
    return;
  }
  // ── فحص المديرين الفرعيين ──
  const subAdmins=DB.get('subAdmins')||[];
  const sa=subAdmins.find(a=>a.u===u&&a.pw===p);
  if(sa){
    SA_MODE=true;
    CU_PERMS=sa.perms||[];
    CU={role:'admin',saId:sa.id,saName:sa.name,saRole:sa.role};
    err.classList.remove('show');
    if(rem)DB.set('remembered',{role:'admin',saId:sa.id,saName:sa.name,saRole:sa.role,saPerms:sa.perms});
    const loginAndApply=()=>{
      showScreen('adminScreen'); renderAdmin(); startTimers();
      renderSubAdminList();
      setTimeout(applySubAdminPermissions,100);
      showToast(`مرحباً ${sa.name} 👋`,'s');
    };
    if(fbDB){
      fbDB.ref('ccs').once('value').then(snap=>{
        const cloud=snap.val()||{};
        SYNC_KEYS.forEach(k=>{if(cloud[k]!=null)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
        loginAndApply();
      }).catch(loginAndApply);
    } else { loginAndApply(); }
    return;
  }
  err.classList.add('show');
}
document.getElementById('lPass').onkeydown=e=>{if(e.key==='Enter')doLogin()};
document.getElementById('lUser').onkeydown=e=>{if(e.key==='Enter')doLogin()};

function tryAutoLogin(){
  const rem=DB.get('remembered');
  if(!rem)return;
  // Wait for Firebase to connect before auto-login
  const doAutoLogin=()=>{
    if(rem.role==='admin'){
      // Check if this was a sub-admin session
      if(rem.saId){
        SA_MODE=true;
        CU_PERMS=rem.saPerms||[];
        CU={role:'admin',saId:rem.saId,saName:rem.saName,saRole:rem.saRole};
        const loginAndApply=()=>{
          showScreen('adminScreen'); renderAdmin(); startTimers();
          renderSubAdminList();
          setTimeout(applySubAdminPermissions,100);
          showToast(`مرحباً ${rem.saName} 👋`,'s');
        };
        if(fbDB){
          fbDB.ref('ccs').once('value').then(snap=>{
            const cloud=snap.val()||{};
            SYNC_KEYS.forEach(k=>{if(cloud[k]!=null)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
            loginAndApply();
          }).catch(loginAndApply);
        } else { loginAndApply(); }
        return;
      }
      CU={role:'admin'};
      if(fbDB){
        fbDB.ref('ccs').once('value').then(snap=>{
          const cloud=snap.val()||{};
          SYNC_KEYS.forEach(k=>{if(cloud[k]!=null)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
          showScreen('adminScreen'); renderAdmin(); startTimers();
          showToast('تم الدخول تلقائياً 👑','s');
        }).catch(()=>{showScreen('adminScreen'); renderAdmin(); startTimers(); showToast('تم الدخول تلقائياً 👑','s');});
      } else {
        showScreen('adminScreen'); renderAdmin(); startTimers();
        showToast('تم الدخول تلقائياً 👑','s');
      }
      return;
    }
    if(fbDB){
      fbDB.ref('ccs').once('value').then(snap=>{
        const cloud=snap.val()||{};
        SYNC_KEYS.forEach(k=>{if(cloud[k]!=null)localStorage.setItem('ccs2_'+k,JSON.stringify(cloud[k]));});
        const emp=(DB.get('emps')||[]).find(e=>e.id===rem.id);
        if(emp){CU={role:'emp',id:emp.id};showScreen('empScreen');loadEmpScreen(emp);startGPS();showToast('مرحباً '+emp.name+' 😊','i');}
      }).catch(()=>{
        const emp=(DB.get('emps')||[]).find(e=>e.id===rem.id);
        if(emp){CU={role:'emp',id:emp.id};showScreen('empScreen');loadEmpScreen(emp);startGPS();}
      });
    } else {
      const emp=(DB.get('emps')||[]).find(e=>e.id===rem.id);
      if(emp){CU={role:'emp',id:emp.id};showScreen('empScreen');loadEmpScreen(emp);startGPS();showToast('مرحباً '+emp.name+' 😊','i');}
    }
  };
  // Give Firebase 1s to connect
  setTimeout(doAutoLogin, 1200);
}

function logout(){
  CU=null; gpsOk=false; SA_MODE=false; CU_PERMS=null;
  // أوقف مراقبة GPS
  if(_gpsWatchId!==null&&navigator.geolocation){
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId=null;
  }
  autoTimers.forEach(t=>clearInterval(t)); autoTimers=[];
  DB.del('remembered');
  showScreen('loginScreen');
  document.getElementById('lUser').value='';
  document.getElementById('lPass').value='';
  // Restore hidden sidebar/nav items
  document.querySelectorAll('#adminScreen .sitem, #adminScreen .mnav-item').forEach(el=>el.style.display='');
  document.querySelectorAll('[onclick*="openAddEmp"]').forEach(el=>el.style.display='');
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════════
//  CLOCK & TIMERS
// ═══════════════════════════════════════════════════
