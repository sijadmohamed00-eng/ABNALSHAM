// ═══ sales.js ═══
function renderAdminChat(){
  const c=document.getElementById('adminChatMessages');if(!c)return;
  const chat=(DB.get('groupChat')||[]).slice(-100);
  if(!chat.length){c.innerHTML='<div style="text-align:center;color:var(--t3);padding:30px;font-size:12px">لا توجد رسائل بعد 💬</div>';return;}
  c.innerHTML=chat.map(m=>{
    const mine=m.role==='admin';
    const av=getEmpAvatar(m.uid,m.uname,32);
    const delBtn=`<button onclick="deleteChatMsg('${m.id}','admin')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--red);opacity:.6;padding:2px 4px;margin-top:2px" title="حذف">🗑️</button>`;
    if(mine){
      return `<div class="chat-bubble mine" style="display:flex;flex-direction:column;align-items:flex-end">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span class="chat-sender" style="color:var(--gold);font-size:10px">أنت (المدير)</span>
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#1a1200;flex-shrink:0">م</div>
        </div>
        <div>${m.text}</div>
        <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div>
      </div>`;
    }
    return `<div class="chat-bubble other" style="display:flex;flex-direction:column;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        ${av}
        <span class="chat-sender" style="color:var(--cyan);font-size:10px">${m.uname}</span>
      </div>
      <div>${m.text}</div>
      <div style="display:flex;align-items:center;gap:4px"><div class="chat-time">${m.time}</div>${delBtn}</div>
    </div>`;
  }).join('');
  c.scrollTop=c.scrollHeight;
}
// Listen for new chat messages in Firebase
function _startChatListener(){
  if(!fbDB||!fbSyncEnabled)return;
  if(window._chatListening)return;
  window._chatListening=true;
  fbDB.ref('ccs/groupChat').on('value',snap=>{
    const v=snap.val();if(v===null)return;
    localStorage.setItem('ccs2_groupChat',JSON.stringify(v));
    renderEmpChat();renderAdminChat();
    // Notify on new message
    const msgs=Array.isArray(v)?v:Object.values(v);
    const last=msgs[msgs.length-1];
    if(last&&last.ts&&(Date.now()-new Date(last.ts).getTime())<8000){
      if(CU?.role==='admin'&&last.role!=='admin')playNotifSound('msg');
      if(CU?.role==='emp'&&last.uid!==getEmp()?.id)playNotifSound('msg');
    }
  });
}

// ══════════════════════════════════════════════════════
//  AI BOT — بوت الذكاء الاصطناعي
// ══════════════════════════════════════════════════════
function askBotFromInput(){
  const inp=document.getElementById('botInput');
  const q=(inp?.value||'').trim();
  if(!q)return;
  if(inp)inp.value='';
  askBot(q);
}
function askBot(question){
  const c=document.getElementById('botMessages');if(!c)return;
  // Add user message
  c.innerHTML+=`<div class="bot-msg user">${question}</div>`;
  c.innerHTML+=`<div class="bot-msg thinking" id="botThinking">⏳ جاري التفكير...</div>`;
  c.scrollTop=c.scrollHeight;
  const answer=getBotAnswer(question);
  setTimeout(()=>{
    const th=document.getElementById('botThinking');
    if(th)th.remove();
    c.innerHTML+=`<div class="bot-msg bot">${answer}</div>`;
    c.scrollTop=c.scrollHeight;
  },600);
}
function getBotAnswer(q){
  const emp=getEmp();
  if(!emp)return'عذراً، تعذّر الوصول لبياناتك.';
  const c=calcSalary(emp);
  const att=DB.get('att')||[];
  const sd=shiftDateStr();
  // Normalize question - handle typos and variations
  const n=q.replace(/[؟?]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const has=(...words)=>words.some(w=>n.includes(w));

  // راتب
  if(has('راتب','مرتب','أجر','اجر','فلوس','مبلغ','مكتسب','صافي','صالح')){
    if(has('يوم','يومي','يوميه'))return `💰 معدل يومك: <strong>${fmtN(c.dailyRate)} د.ع</strong>`;
    if(has('شهر','شهري'))return `💰 راتبك الشهري: <strong>${fmtN(emp.sal)} د.ع</strong>\nالمكتسب الآن: <strong>${fmtN(c.earnedSalary)} د.ع</strong>`;
    return `💰 <strong>راتبك الآن:</strong>\n• الراتب الشهري: ${fmtN(emp.sal)} د.ع\n• المكتسب: ${fmtN(c.earnedSalary)} د.ع\n• الحوافز: +${fmtN(c.totalBon)} د.ع\n• الخصومات: -${fmtN(c.totalDed)} د.ع\n• <strong>الإجمالي: ${fmtN(c.net)} د.ع</strong>`;
  }
  // حضور
  if(has('حضور','حضرت','جيت','أيام','ايام','يوم حضر')){
    return `📅 حضرت <strong>${c.daysPresent} يوم</strong> في هذه الفترة (${c.per.label})`;
  }
  // غياب
  if(has('غياب','غبت','تغيبت','مو حاضر','ما جيت','غائب')){
    return `❌ أيام الغياب/الخصم: <strong>${c.deductDays} يوم</strong>`;
  }
  // إجازة
  if(has('إجازة','اجازة','إجازات','اجازات','عطلة','راحة','بقيلي')){
    const remaining=Math.max(0,2-c.leavesUsed);
    return `🌴 الإجازات المستخدمة: ${c.leavesUsed}\nالإجازات المجانية: 2 لكل فترة\nالمتبقية: <strong>${remaining} إجازة</strong>`;
  }
  // صرف / يوم صرف
  if(has('صرف','موعد','متى','متى يصرف','يوم دفع','اليوم')){
    return `💸 يوم صرف راتبك: <strong>${c.per.pay.toLocaleDateString('ar-IQ',{weekday:'long',day:'numeric',month:'long'})}</strong>`;
  }
  // حوافز
  if(has('حافز','حوافز','مكافأ','مكافآت','بونس','زيادة')){
    return `🎁 حوافزك هذه الفترة: <strong>+${fmtN(c.totalBon)} د.ع</strong>\n• حوافز الشفت: ${fmtN(c.shiftBonTotal)}\n• حوافز المبيعات: ${fmtN(c.salesBonTotal)}\n• حوافز أخرى: ${fmtN(c.otherBonTotal)}`;
  }
  // خصومات
  if(has('خصم','خصومات','مخصوم','طرح')){
    return `📉 الخصومات هذه الفترة: <strong>-${fmtN(c.totalDed)} د.ع</strong>`;
  }
  // شفت
  if(has('شفت','دوام','وقت','متى يبدأ','يبدأ','وقتي','ساعات')){
    return `⏰ شفتك: <strong>${shiftLabel(emp)}</strong>`;
  }
  // هل أنا مسجل اليوم
  if(has('سجلت','مسجل','حضوري اليوم','اليوم')){
    const ci=att.find(a=>a.eid===emp.id&&a.date===sd&&a.type==='ci');
    const co=att.find(a=>a.eid===emp.id&&a.date===sd&&a.type==='co');
    if(co)return `✅ سجّلت الحضور الساعة ${ci?.time} وانصرفت الساعة ${co.time}`;
    if(ci)return `✅ سجّلت الحضور اليوم الساعة ${ci.time} — لم تسجل الانصراف بعد`;
    return `⚪ لم تسجل حضورك بعد اليوم`;
  }
  // الفترة
  if(has('فترة','نصف شهر','من لـ','من لغاية')){
    return `📆 الفترة الحالية: <strong>${c.per.label}</strong>\n(${c.per.start.toLocaleDateString('ar-IQ')} — ${c.per.end.toLocaleDateString('ar-IQ')})`;
  }
  // تحية
  if(has('مرحبا','هلا','اهلا','هاي','hi','hello','السلام')){
    const h=new Date().getHours();
    return `${h<12?'صباح الخير':h<17?'مساء الخير':'ليلة سعيدة'} ${emp.name}! 😊 كيف أساعدك؟`;
  }
  // default
  return `🤖 عذراً، لم أفهم سؤالك تماماً.\nيمكنك سؤالي عن:\n• راتبك ومكتسباتك\n• أيام حضورك وغيابك\n• إجازاتك\n• موعد صرف الراتب\n• حوافزك\n• شفتك`;
}

// ══════════════════════════════════════════════════════
//  MAP — خريطة مواقع الموظفين
// ══════════════════════════════════════════════════════
