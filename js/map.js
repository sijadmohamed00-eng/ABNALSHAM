// ═══ map.js ═══
function refreshMapData(){
  const c=document.getElementById('empLocationList');if(!c)return;
  const emps=DB.get('emps')||[];
  const att=DB.get('att')||[];
  const wl=getWorkLoc();
  let html='';
  const colors=['#f0c040','#00e676','#00e5ff','#ce93d8','#ff9800','#e94560','#42a5f5'];
  emps.forEach((e,i)=>{
    // آخر سجل له
    const empAtt=att.filter(a=>a.eid===e.id&&a.lat!=null).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    const last=empAtt[0];
    const color=colors[i%colors.length];
    const today=shiftDateStr();
    const ci=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='ci');
    const co=att.find(a=>a.eid===e.id&&a.date===today&&a.type==='co');
    const status=co?'انصرف':ci?'حاضر':'غائب';
    const statusCol=co?'var(--cyan)':ci?'var(--green)':'var(--red)';
    html+=`<div class="map-emp-card" onclick="showEmpOnMap('${e.id}','${e.name}',${last?.lat||0},${last?.lng||0},'${color}')">
      <div class="map-emp-dot" style="background:${color};box-shadow:0 0 8px ${color}"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700">${e.name}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">
          ${last?`آخر موقع: ${fmtD(last.date)} — ${last.time} | ${last.dist||'?'} م من العمل`:'لا يوجد موقع مسجل'}
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${statusCol}">${status}</span>
    </div>`;
  });
  c.innerHTML=html||'<div class="empty"><div class="ei">📍</div><p>لا توجد بيانات موقع</p></div>';
}
function showEmpOnMap(eid,name,lat,lng,color){
  const con=document.getElementById('adminMapContainer');if(!con)return;
  if(!lat||!lng){showToast('لا يوجد موقع مسجل لهذا الموظف','e');return;}
  const wl=getWorkLoc();
  // Use OpenStreetMap via iframe
  const url=`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;
  con.innerHTML=`
    <div style="position:relative">
      <iframe src="${url}" style="width:100%;height:380px;border:none;border-radius:12px" loading="lazy"></iframe>
      <div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.8);border-radius:8px;padding:8px 12px;font-size:12px">
        <div style="font-weight:700;color:${color}">${name}</div>
        <div style="color:#9095b8;margin-top:2px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" style="color:var(--cyan);font-size:11px;display:block;margin-top:4px">📍 فتح في خرائط جوجل</a>
      </div>
    </div>
    <div style="padding:10px;font-size:12px;color:var(--t2);text-align:center">
      موقع العمل: <a href="https://maps.google.com/?q=${wl.lat},${wl.lng}" target="_blank" style="color:var(--gold)">📍 ${wl.lat.toFixed(4)}, ${wl.lng.toFixed(4)}</a>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  ADVANCED REPORTS — تقارير متقدمة
// ══════════════════════════════════════════════════════
let _advCharts={};
