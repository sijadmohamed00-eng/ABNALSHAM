function getPeriod(){
  const now=new Date(), m=now.getMonth(), y=now.getFullYear();
  const dim=new Date(y,m+1,0).getDate();
  const start=new Date(y,m,1); // دائماً من اليوم 1
  const end=new Date(y,m,dim);
  const pay=new Date(y,m+1,5);
  const monthName=now.toLocaleDateString('ar-IQ',{month:'long',year:'numeric'});
  return{
    half:1,
    start, end, pay,
    totalDays:dim,
    periodKey:`${y}-${String(m+1).padStart(2,'0')}`,
    label:monthName,
    lvKey:'lvM'
  };
}

// ── مفتاح الإجازات الشهرية — توافق مع الكود القديم ──
// lvH1/lvH2 أصبحت lvM للشهر

function calcSalary(emp,customPer){
  _reloadShifts();
  const per=customPer||getPeriod();
  const dailyRate=Math.round(emp.sal/30);
  const att=DB.get('att')||[];
  const leaveDays=DB.get('leaveDays')||[];
  const ps=per.start.toISOString().split('T')[0];
  const pe=per.end.toISOString().split('T')[0];
  // أيام الحضور الفعلي
  const presentSet=new Set(att.filter(a=>a.eid===emp.id&&a.type==='ci'&&a.date>=ps&&a.date<=pe).map(a=>a.date));
  const daysPresent=presentSet.size;
  // أيام الإجازات المسجلة من قبل المدير في هذه الفترة
  // كل إجازة مدفوعة = يوم واحد فقط (لا تُحتسب مرتين)
  const leaveSet=new Set(leaveDays.filter(l=>l.eid===emp.id&&l.date>=ps&&l.date<=pe&&!presentSet.has(l.date)).map(l=>l.date));
  const lvMcount=emp['lvM']||0;
  const leavesUsed=leaveSet.size+lvMcount;
  const FREE_LEAVES_MONTHLY=4;
  // الإجازات المدفوعة ضمن الرصيد
  const paidLeaves=Math.min(leavesUsed,FREE_LEAVES_MONTHLY);
  const deductLeaves=Math.max(0,leavesUsed-FREE_LEAVES_MONTHLY);
  // الأيام المدفوعة = حضور + إجازات مدفوعة
  const paidDays=daysPresent+paidLeaves;
  const earnedSalary=Math.max(0,paidDays*dailyRate - deductLeaves*dailyRate);
  // مكافأة الشفت اليومية للشفت 6م-4ص
  const shiftInfo=SHIFTS[emp.sh]||{};
  let dailyShiftBon=0;
  if(shiftInfo.bonusType==='daily'&&shiftInfo.dailyBonus){
    dailyShiftBon=daysPresent*(shiftInfo.dailyBonus);
  }
  const shiftBonTotal=(emp.bon||[]).filter(b=>b.type==='shift'&&b.date>=ps&&b.date<=pe).reduce((s,b)=>s+b.amount,0)+dailyShiftBon;
  const salesBonTotal=(emp.bon||[]).filter(b=>(b.type==='sales100'||b.type==='sales200')&&b.date>=ps&&b.date<=pe).reduce((s,b)=>s+b.amount,0);
  const otherBonTotal=(emp.bon||[]).filter(b=>b.type==='custom'&&b.date>=ps&&b.date<=pe).reduce((s,b)=>s+b.amount,0);
  const totalBon=shiftBonTotal+salesBonTotal+otherBonTotal;
  const totalDed=(emp.ded||[]).filter(d=>d.date>=ps&&d.date<=pe).reduce((s,d)=>s+d.amount,0);
  const net=earnedSalary+totalBon-totalDed;
  return{per,dailyRate,daysPresent,daysAbsent:0,elapsed:daysPresent+leavesUsed,leavesUsed,paidLeaves,deductLeaves,deductDays:deductLeaves,paidDays,earnedSalary,shiftBonTotal,salesBonTotal,otherBonTotal,totalBon,totalDed,net,dailyShiftBon};
}

// ═══════════════════════════════════════════════════
//  PERIOD RESET (15 & end of month)
// ═══════════════════════════════════════════════════
function checkPeriodReset(){
  const lastReset=DB.get('lastReset')||'';
  const now=new Date(), d=now.getDate(), m=now.getMonth(), y=now.getFullYear();
  // أرشفة تلقائية في أول كل شهر
  const resetKey=`${y}-${String(m+1).padStart(2,'0')}-M1`;
  if(d!==1||lastReset===resetKey)return;
  archiveCurrentPeriod();
  DB.set('lastReset',resetKey);
  showToast('🔄 بداية شهر جديد — البيانات محفوظة في الأرشيف','i');
}

function archiveCurrentPeriod(){
  const per=getPeriod();
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const archive=DB.get('archive')||{periods:[],snapshots:{}};
  const ps=per.start.toISOString().split('T')[0];
  const pe=per.end.toISOString().split('T')[0];
  const existing=archive.periods.find(p=>p.key===per.periodKey);
  if(existing)return; // already archived
  const snap={
    key:per.periodKey,
    label:per.label,
    archivedAt:new Date().toISOString(),
    payDate:per.pay.toISOString().split('T')[0],
    employees:emps.map(emp=>{
      const c=calcSalary(emp);
      const empAtt=att.filter(a=>a.eid===emp.id&&a.date>=ps&&a.date<=pe);
      return{
        id:emp.id,name:emp.name,sal:emp.sal,sh:emp.sh,
        daysPresent:c.daysPresent,daysAbsent:c.daysAbsent,
        earnedSalary:c.earnedSalary,shiftBonTotal:c.shiftBonTotal,
        salesBonTotal:c.salesBonTotal,otherBonTotal:c.otherBonTotal,
        totalBon:c.totalBon,totalDed:c.totalDed,net:c.net,
        bonuses:(emp.bon||[]).filter(b=>b.date>=ps&&b.date<=pe),
        deductions:(emp.ded||[]).filter(d=>d.date>=ps&&d.date<=pe),
        attendance:empAtt
      };
    })
  };
  archive.periods.unshift(snap);
  DB.set('archive',archive);
}

// ═══════════════════════════════════════════════════
//  TELEGRAM (FIXED) — see sendTg in new features block below
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  AUTH & LOGIN
// ═══════════════════════════════════════════════════
