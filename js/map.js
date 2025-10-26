let mainMap;
let markers = [];
let userMarker = null;
let userCircle = null;

async function fetchJSON(path) {
  const r = await fetch(path);
  return r.json();
}

function trafficColor(level) {
  if (level === 'high') return '#e02424';
  if (level === 'medium') return '#ffb020';
  return '#22c55e';
}

async function loadCombinedTraffic() {
  const base = await fetchJSON('assets/data/traffic.json').catch(() => []);
  const override = JSON.parse(localStorage.getItem('urbanflow_traffic_override') || '[]');
  base.forEach((b, i) => {
    if (!b.id) b.id = 'base_' + i;
  });
  return [...base, ...override];
}

async function initMainMap() {
  mainMap = L.map('map', { zoomControl: true }).setView([40.395, 49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);

  const data = await loadCombinedTraffic();
  populateTrafficMarkers(data);
  setupMapInteractions();

  window.addEventListener('storage', (ev) => {
    if (ev.key === 'urbanflow_refresh') {
      loadCombinedTraffic().then(populateTrafficMarkers);
    }
    if (ev.key === 'urbanflow_focus') {
      try {
        const obj = JSON.parse(ev.newValue);
        if (obj && obj.lat && obj.lng) {
          mainMap.setView([obj.lat, obj.lng], 16, { animate: true });
          L.popup().setLatLng([obj.lat, obj.lng]).setContent(`<strong>${obj.title || 'Point'}</strong>`).openOn(mainMap);
        }
      } catch (e) {}
    }
  });
}

function populateTrafficMarkers(data) {
  markers.forEach(m => mainMap.removeLayer(m));
  markers = [];

  data.forEach(item => {
    const color = trafficColor(item.level);
    const circle = L.circle([item.lat, item.lng], {
      radius: 60 + (item.severity || 1) * 40,
      color,
      fillColor: color,
      fillOpacity: 0.35
    });

    circle.on('click', () => {
      L.popup()
        .setLatLng([item.lat, item.lng])
        .setContent(`<strong>${item.title}</strong><br/>Səviyyə: ${item.level}<br/>Təsir: ${item.description || ''}`)
        .openOn(mainMap);
    });

    circle.addTo(mainMap);
    markers.push(circle);
  });

  const active = data.filter(d => d.level === 'high').length;
  const nonLow = data.filter(d => d.level !== 'low').length;
  const avgSpeed = Math.max(20, 60 - data.reduce((s, i) => s + ((i.severity || 1) * 5), 0));

  document.getElementById('active-jams').innerText = active;
  document.getElementById('alerts-count').innerText = nonLow;
  document.getElementById('avg-speed').innerText = `${avgSpeed.toFixed(0)}`;
}

function setupMapInteractions() {
  const locateBtn = document.getElementById('locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (!mainMap) return;
      mainMap.locate({ setView: false, watch: false, enableHighAccuracy: true });
    });
  }

  mainMap.on('locationfound', (e) => {
    const latlng = e.latlng;

    // köhnə marker və dairəni sil
    if (userMarker) mainMap.removeLayer(userMarker);
    if (userCircle) mainMap.removeLayer(userCircle);

    // yeni marker əlavə et
    userMarker = L.marker(latlng, { title: "Sənin mövqeyin" }).addTo(mainMap);

    // dəqiqlik radiusu (stabil, məsələn 80m)
    const fixedRadius = 80;
    userCircle = L.circle(latlng, {
      radius: fixedRadius,
      color: '#0b3d91',
      fillColor: '#3b82f6',
      fillOpacity: 0.3
    }).addTo(mainMap);

    // yaxınlaşdırma
    mainMap.setView(latlng, 17, { animate: true });

    L.popup()
      .setLatLng(latlng)
      .setContent("Hazırkı mövqeyin təyin olundu ✅")
      .openOn(mainMap);
  });

  mainMap.on('locationerror', () => {
    alert("Mövqe təyin edilə bilmədi. Zəhmət olmasa icazə verin və yenidən cəhd edin.");
  });

  const filterEl = document.getElementById('traffic-filter');
  if (filterEl) {
    filterEl.addEventListener('change', async (e) => {
      const v = e.target.value;
      const data = await loadCombinedTraffic();
      const filtered = v === 'all' ? data : data.filter(d => d.level === v);
      populateTrafficMarkers(filtered);
    });
  }
}

function initSmallMap(containerId) {
  const m = L.map(containerId).setView([40.395, 49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
  return m;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) initMainMap();
});
