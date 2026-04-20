// ═══════════════════════════════════════════════════
//  PROXY SETTINGS UI - ربط الإعدادات بالواجهة
// ═══════════════════════════════════════════════════

function loadProxySettingsToUI(){
  const proxy = getProxyConfig();
  const serverEl = document.getElementById('proxyServer');
  const portEl = document.getElementById('proxyPort');
  const secretEl = document.getElementById('proxySecret');
  
  if(serverEl) serverEl.value = proxy.server || '';
  if(portEl) portEl.value = proxy.port || '';
  if(secretEl) secretEl.value = proxy.secret || '';
  
  const statusEl = document.getElementById('proxyStatus');
  if(statusEl){
    if(proxy.enabled && proxy.server){
      statusEl.innerHTML = '✅ البروكسي مفعّل - ' + proxy.server + ':' + proxy.port;
      statusEl.style.color = 'var(--green)';
    } else {
      statusEl.innerHTML = '⛔ البروكسي معطل';
      statusEl.style.color = 'var(--t3)';
    }
  }
}

// استدعاء تحميل إعدادات البروكسي عند فتح شاشة الإعدادات
const originalShowATab = window.showATab;
window.showATab = function(id, el){
  if(originalShowATab) originalShowATab(id, el);
  if(id === 'cfg'){
    setTimeout(loadProxySettingsToUI, 100);
  }
};

// أيضًا ناديها عند تحميل صفحة المدير
const originalRenderAdmin = window.renderAdmin;
window.renderAdmin = function(){
  if(originalRenderAdmin) originalRenderAdmin();
  if(document.getElementById('at-cfg')?.classList?.contains('active')){
    setTimeout(loadProxySettingsToUI, 100);
  }
};
