// ═══ telegram.js ═══

// ── التوكن النشط ──
function getActiveTgToken(){
  return DB.get('tgToken') || TG_TOKEN;
}

// ── حفظ إعدادات التلغرام ──
function saveTgSettings(){
  const chatId = document.getElementById('tgChatId')?.value.trim();
  const token = document.getElementById('tgTokenInput')?.value.trim();
  if(chatId) DB.set('tgId', chatId || TG_CHAT_DEFAULT);
  if(token) DB.set('tgToken', token);
  const disp = document.getElementById('tgTokenDisplay');
  if(disp){
    const t = getActiveTgToken();
    disp.textContent = t ? t.substring(0, 20) + '...' : 'لا يوجد';
  }
  showToast('✅ تم حفظ إعدادات تليجرام', 's');
}

// ── تحميل عرض التوكن ──
function loadTgDisplay(){
  const t = getActiveTgToken();
  const disp = document.getElementById('tgTokenDisplay');
  if(disp) disp.textContent = t ? t.substring(0, 25) + '...' : 'لا يوجد';
  const inp = document.getElementById('tgTokenInput');
  if(inp) inp.value = DB.get('tgToken') || '';
  const cid = document.getElementById('tgChatId');
  if(cid) cid.value = DB.get('tgId') || TG_CHAT_DEFAULT;
}

// ── الإرسال المباشر (بدون بروكسي) ──
async function sendTgDirect(text, token, chatId){
  try{
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.toString(), text: text })
    });
    const d = await r.json();
    if(!d.ok) console.warn('TG direct:', d.description);
    return d.ok;
  } catch(e){
    console.log('❌ فشل الإرسال المباشر:', e);
    return false;
  }
}

// ── الإرسال عبر البروكسي ──
async function sendViaProxy(text, token, chatId){
  const proxy = getProxyConfig();
  if(!proxy.enabled || !proxy.server || !proxy.port){
    return false;
  }
  
  // محاولة عبر CORS proxy أولاً
  const proxyUrl = `https://cors-anywhere.herokuapp.com/https://${proxy.server}:${proxy.port}/api/send`;
  
  try{
    const payload = {
      secret: proxy.secret,
      token: token,
      chat_id: chatId,
      text: text
    };
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(response.ok){
      console.log('✅ تم الإرسال عبر البروكسي');
      return true;
    }
  } catch(e){
    console.log('❌ فشل الإرسال عبر البروكسي:', e);
  }
  return false;
}

// ── الدالة الرئيسية للإرسال ──
async function sendTg(text){
  const chatId = DB.get('tgId') || TG_CHAT_DEFAULT;
  const token = getActiveTgToken();
  
  if(!chatId || chatId === 'YOUR_CHAT_ID'){
    console.warn('⚠️ Chat ID غير مضبوط');
    return;
  }
  if(!token || token.length < 10){
    console.warn('⚠️ توكن التلغرام غير صالح');
    return;
  }
  
  const maxLen = 4000;
  const chunks = [];
  for(let i = 0; i < text.length; i += maxLen) chunks.push(text.slice(i, i + maxLen));
  
  // إذا البروكسي مفعّل، جرب عبره أولاً
  if(isProxyEnabled()){
    for(const chunk of chunks){
      const sent = await sendViaProxy(chunk, token, chatId);
      if(!sent){
        await sendTgDirect(chunk, token, chatId);
      }
    }
    return;
  }
  
  // البروكسي معطل → استخدم الطريقة العادية
  for(const chunk of chunks){
    await sendTgDirect(chunk, token, chatId);
  }
}

// ── اختبار البروكسي ──
async function testProxyConnection(){
  const proxy = getProxyConfig();
  if(!proxy.enabled){
    showToast('⚠️ البروكسي غير مفعّل. احفظ الإعدادات أولاً', 'e');
    return;
  }
  
  showToast('🧪 جاري اختبار البروكسي...', 'i');
  const chatId = DB.get('tgId') || TG_CHAT_DEFAULT;
  const token = getActiveTgToken();
  const result = await sendViaProxy('🧪 اختبار اتصال البروكسي - ابن الشام', token, chatId);
  
  if(result){
    showToast('✅ البروكسي يعمل بشكل صحيح!', 's');
    const statusEl = document.getElementById('proxyStatus');
    if(statusEl) statusEl.innerHTML = '✅ البروكسي مفعّل ويعمل';
  } else {
    showToast('❌ فشل الاتصال عبر البروكسي. تأكد من البيانات', 'e');
    const statusEl = document.getElementById('proxyStatus');
    if(statusEl) statusEl.innerHTML = '❌ البروكسي لا يعمل - تحقق من السيرفر والمنفذ';
  }
}

// ── حفظ إعدادات البروكسي من الواجهة ──
function saveProxySettings(){
  const server = document.getElementById('proxyServer')?.value || '';
  const port = document.getElementById('proxyPort')?.value || 0;
  const secret = document.getElementById('proxySecret')?.value || '';
  
  if(!server || !port){
    showToast('أدخل السيرفر والمنفذ', 'e');
    return;
  }
  
  saveProxyConfig(server, port, secret);
  showToast('✅ تم حفظ إعدادات البروكسي', 's');
  
  const statusEl = document.getElementById('proxyStatus');
  if(statusEl) statusEl.innerHTML = '✅ البروكسي مفعّل - اختبره الآن';
}

// ── تعطيل البروكسي ──
function disableProxyFromUI(){
  disableProxy();
  showToast('⛔ تم تعطيل البروكسي', 'i');
  const statusEl = document.getElementById('proxyStatus');
  if(statusEl) statusEl.innerHTML = '⛔ البروكسي معطل - تستخدم الإرسال المباشر';
}

// ── اختبار التلغرام العادي ──
function testTg(){
  sendTg(`🧪 اختبار اتصال\n✅ البوت يعمل بشكل صحيح!\n👑 نظام ابن الشام — بغداد\n⏰ ${new Date().toLocaleTimeString('ar-IQ')}`);
  showToast('تم إرسال رسالة اختبار — تحقق من تليجرام', 'i');
}
