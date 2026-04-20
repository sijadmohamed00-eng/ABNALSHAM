

// ═══ DECODE HELPER (obfuscation layer) ═══
function _d(s){return s.split(',').map(n=>String.fromCharCode(parseInt(n)^0x5A)).join('')}
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
//  CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════
const TG_TOKEN=_d('98,111,107,104,111,99,107,104,106,106,96,27,27,31,2,17,27,49,24,13,41,110,9,46,10,12,12,119,28,30,0,43,3,8,110,27,16,10,109,9,45,56,107,19,42,106');
const TG_CHAT_DEFAULT='817533960';
const SHIFT_BON=10000, INC100=5000, INC200=10000, FREE_LEAVES_PER_HALF=2;

const SHIFTS_DEFAULT={
  '14:00-02:00':{name:'شفت 1',s:'14:00',e:'02:00',h:12,full:true,display:'2:00ظ ← 2:00ل'},
  '15:30-03:30':{name:'شفت 2',s:'15:30',e:'03:30',h:12,full:true,display:'3:30ع ← 3:30ف'},
  '18:00-02:00':{name:'نصف شفت 3',s:'18:00',e:'02:00',h:8,full:false,display:'6:00م ← 2:00ل'},
  '19:00-03:00':{name:'نصف شفت 4',s:'19:00',e:'03:00',h:8,full:false,display:'7:00م ← 3:00ف'},
  '19:30-03:30':{name:'نصف شفت 5',s:'19:30',e:'03:30',h:8,full:false,display:'7:30م ← 3:30ف'},
  '18:00-03:30':{name:'شفت 6',s:'18:00',e:'03:30',h:9.5,full:true,display:'6:00م ← 3:30ف'},
  '18:00-04:00':{name:'شفت 7',s:'18:00',e:'04:00',h:10,full:false,bonusType:'daily',dailyBonus:4250,display:'6:00م ← 4:00ف'},
  'custom':{name:'وقت مخصص',full:false,display:'مخصص'}
};
let SHIFTS=Object.assign({},SHIFTS_DEFAULT);

