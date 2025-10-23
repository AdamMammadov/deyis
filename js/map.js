// map.js (updated) — leaflet map handling, markers from traffic.json + override + storage events
let mainMap;
let markers = [];

async function fetchJSON(path){ const r = await fetch(path); return r.json(); }

function trafficColor(level){
  if(level==='high') return '#e02424';
  if(level==='medium') return '#ffb020';
  return '#22c55e';
}

async function loadCombinedTraffic(){
  const base = await fetchJSON('assets/data/traffic.json').catch(()=>[]);
  const override = JSON.parse(localStorage.getItem('urbanflow_traffic_override') || '[]');
  // ensure ids for base items
  base.forEach((b, i) => { if (!b.id) b.id = 'base_' + i; });
  return [...base, ...override];
}

async function initMainMap(){
  mainMap = L.map('map', {zoomControl:true}).setView([40.395,49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);

  const data = await loadCombinedTraffic();
  populateTrafficMarkers(data);
  setupMapInteractions();

  // listen to storage events for refresh / focus
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'urbanflow_refresh') {
      loadCombinedTraffic().then(populateTrafficMarkers);
    }
    if (ev.key === 'urbanflow_focus') {
      try {
        const obj = JSON.parse(ev.newValue);
        if (obj && obj.lat && obj.lng) {
          if (mainMap) {
            mainMap.setView([obj.lat, obj.lng], 15, {animate:true});
            L.popup().setLatLng([obj.lat, obj.lng]).setContent(`<strong>${obj.title || 'Point'}</strong>`).openOn(mainMap);
          }
        }
      } catch(e){}
    }
  });
}

function populateTrafficMarkers(data){
  // remove old markers
  markers.forEach(m => mainMap.removeLayer(m));
  markers = [];
  data.forEach(item => {
    const color = trafficColor(item.level);
    const circle = L.circle([item.lat, item.lng], {radius: 60 + (item.severity||1)*40, color, fillColor: color, fillOpacity: 0.35});
    circle.on('click', () => {
      L.popup()
       .setLatLng([item.lat, item.lng])
       .setContent(`<strong>${item.title}</strong><br/>Səviyyə: ${item.level}<br/>Təsir: ${item.description || ''}`)
       .openOn(mainMap);
    });
    circle.addTo(mainMap);
    markers.push(circle);
  });

  // update widgets if present
  const active = data.filter(d=>d.level==='high').length;
  const nonLow = data.filter(d=>d.level!=='low').length;
  const avgSpeed = Math.max(20, 60 - data.reduce((s,i)=> s + ((i.severity||1)*5), 0));
  if (document.getElementById('active-jams')) document.getElementById('active-jams').innerText = active;
  if (document.getElementById('alerts-count')) document.getElementById('alerts-count').innerText = nonLow;
  if (document.getElementById('avg-speed')) document.getElementById('avg-speed').innerText = `${avgSpeed.toFixed(0)}`;
}

function setupMapInteractions(){
  const locateBtn = document.getElementById('locate-btn');
  if (locateBtn) locateBtn.addEventListener('click', () => {
    if (!mainMap) return;
    mainMap.locate({setView:true, maxZoom:14});
  });
  const filterEl = document.getElementById('traffic-filter');
  if (filterEl) filterEl.addEventListener('change', async (e) => {
    const v = e.target.value;
    const data = await loadCombinedTraffic();
    const filtered = v==='all' ? data : data.filter(d=>d.level===v);
    populateTrafficMarkers(filtered);
  });
}

/* helper used by routes page — small map init */
function initSmallMap(containerId){
  const m = L.map(containerId).setView([40.395,49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(m);
  return m;
}

// auto init if index page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) initMainMap();
});
