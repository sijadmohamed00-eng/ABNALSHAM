function initData(){
  if(!DB.get('adminCreds'))DB.set('adminCreds',{u:_d('41,59,48,48,59,62,5,59,62,55,51,52'),pw:_d('27,62,55,51,52,26,104,106,104,111')});
  if(!DB.get('tgId'))DB.set('tgId',TG_CHAT_DEFAULT);
  if(!DB.get('emps')){
    DB.set('emps',[]); // قائمة فارغة — أضف موظفيك من لوحة التحكم
  }
  if(!DB.get('att'))DB.set('att',[]);
  if(!DB.get('msg'))DB.set('msg',[]);
  if(!DB.get('reports'))DB.set('reports',[]);
  if(!DB.get('archive'))DB.set('archive',{periods:[],snapshots:{}});
  if(!DB.get('groupChat'))DB.set('groupChat',[]);
  if(!DB.get('leaveRequests'))DB.set('leaveRequests',[]);
  if(!DB.get('salesLog'))DB.set('salesLog',[]);
  if(!DB.get('adminLogs'))DB.set('adminLogs',[]);
}

// ═══════════════════════════════════════════════════
//  PERIOD & SALARY
// ═══════════════════════════════════════════════════
