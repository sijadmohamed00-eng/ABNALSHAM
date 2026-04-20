function initData(){
  if(!DB.get('adminCreds'))DB.set('adminCreds',{u:_d('41,59,48,48,59,62,5,59,62,55,51,52'),pw:_d('27,62,55,51,52,26,104,106,104,111')});
  if(!DB.get('tgId'))DB.set('tgId',TG_CHAT_DEFAULT);
  if(!DB.get('emps')){
    DB.set('emps',[
      {id:'e0',name:'سجاد محمد',u:'sajjad',pw:_d('105,98,110,109,104,99,107'),sh:'14:00-02:00',sal:750000,notes:'المدير التنفيذي ⭐',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e1',name:'سجاد عادل',u:'sajjad_adel',pw:_d('110,98,104,99,107,109,105'),sh:'14:00-02:00',sal:550000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e2',name:'محمود فارس',u:'mahmoud',pw:_d('109,105,99,107,106,104,98'),sh:'15:30-03:30',sal:550000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e3',name:'زمان حميد',u:'zaman',pw:_d('111,98,104,106,105,99,110'),sh:'18:00-02:00',sal:550000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e4',name:'غيث عصام',u:'ghaith',pw:_d('99,107,98,104,106,110,109'),sh:'19:00-03:00',sal:500000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e5',name:'محمد ثائر',u:'mohamad',pw:_d('108,106,110,109,105,98,104'),sh:'19:30-03:30',sal:500000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()},
      {id:'e6',name:'ليث هاني',u:'laith',pw:_d('105,106,111,98,110,107,99'),sh:'18:00-03:30',sal:500000,notes:'',rating:0,bon:[],ded:[],lvM:0,jd:todayStr()}
    ]);
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
