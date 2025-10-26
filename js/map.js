// map.js — improved "Məni göstər" behaviour using navigator.geolocation for exact centering
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

  // react to storage events for refresh / focus
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'urbanflow_refresh') {
      loadCombinedTraffic().then(populateTrafficMarkers);
    }
    if (ev.key === 'urbanflow_focus') {
      try {
        const obj = JSON.parse(ev.newValue);
        if (obj && obj.lat && obj.lng) {
          mainMap.setView([obj.lat, obj.lng], 15, { animate: true });
          L.popup().setLatLng([obj.lat, obj.lng]).setContent(`<strong>${obj.title || 'Point'}</strong>`).openOn(mainMap);
        }
      } catch (e) { /* ignore malformed */ }
    }
  });
}

function populateTrafficMarkers(data) {
  // remove old markers
  markers.forEach(m => mainMap.removeLayer(m));
  markers = [];

  data.forEach(item => {
    if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
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

  // update widgets if present
  const active = data.filter(d => d.level === 'high').length;
  const nonLow = data.filter(d => d.level !== 'low').length;
  const avgSpeed = Math.max(20, 60 - data.reduce((s, i) => s + ((i.severity || 1) * 5), 0));

  if (document.getElementById('active-jams')) document.getElementById('active-jams').innerText = active;
  if (document.getElementById('alerts-count')) document.getElementById('alerts-count').innerText = nonLow;
  if (document.getElementById('avg-speed')) document.getElementById('avg-speed').innerText = `${avgSpeed.toFixed(0)}`;
}

function setupMapInteractions() {
  const locateBtn = document.getElementById('locate-btn');

  // Prefer using navigator.geolocation.getCurrentPosition for exact one-time centering.
  async function showCurrentPosition() {
    if (!mainMap) return alert('Xəritə yüklənməyib!');

    if (!('geolocation' in navigator)) {
      alert('Geolokasiya bu brauzerdə dəstəklənmir.');
      return;
    }

    // give visual feedback (optional)
    const prevText = locateBtn ? locateBtn.textContent : null;
    if (locateBtn) locateBtn.disabled = true, locateBtn.textContent = 'Axtarılır…';

    // try getCurrentPosition with high accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 30;

        // remove previous user layers
        if (userMarker) { try { mainMap.removeLayer(userMarker); } catch (e) {} userMarker = null; }
        if (userCircle) { try { mainMap.removeLayer(userCircle); } catch (e) {} userCircle = null; }

        // clamp accuracy radius to sensible range so circle isn't huge
        const radius = Math.min(Math.max(acc, 8), 200); // between 8m and 200m

        userMarker = L.marker([lat, lng], { title: "Sənin mövqeyin" }).addTo(mainMap);
        userCircle = L.circle([lat, lng], {
          radius: radius,
          color: '#0b3d91',
          fillColor: '#3b82f6',
          fillOpacity: 0.25
        }).addTo(mainMap);

        // Zoom to a close level for user (use 16-18 depending on accuracy)
        let targetZoom = 17;
        if (radius > 120) targetZoom = 15;
        else if (radius > 60) targetZoom = 16;
        // use flyTo for nicer UX if available
        if (typeof mainMap.flyTo === 'function') {
          mainMap.flyTo([lat, lng], targetZoom, { animate: true, duration: 0.6 });
        } else {
          mainMap.setView([lat, lng], targetZoom);
        }

        // show a popup on marker
        userMarker.bindPopup("Hazırkı mövqeyin təyin olundu ✅").openPopup();

        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || 'Məni göstər';
      },
      (err) => {
        console.warn('Geolocation error', err);
        alert("Mövqeyi təyin etmək mümkün olmadı. Zəhmət olmasa icazə verin və yenidən cəhd edin.");
        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || 'Məni göstər';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  if (locateBtn) {
    locateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showCurrentPosition();
    });
  }

  // Also support map.locate events as fallback (kept for compatibility)
  mainMap.on && mainMap.on('locationfound', (e) => {
    // If navigator.getCurrentPosition used, this handler may not be triggered, but keep it safe:
    const latlng = e.latlng || (e && e.coords && [e.coords.latitude, e.coords.longitude]);
    if (!latlng) return;
    if (userMarker) mainMap.removeLayer(userMarker);
    if (userCircle) mainMap.removeLayer(userCircle);

    userMarker = L.marker(latlng).addTo(mainMap);
    userCircle = L.circle(latlng, {
      radius: Math.min(e.accuracy || 30, 200),
      color: '#0b3d91',
      fillColor: '#3b82f6',
      fillOpacity: 0.25
    }).addTo(mainMap);

    mainMap.setView(latlng, 16);
    L.popup().setLatLng(latlng).setContent("Hazırkı mövqeyin təyin olundu ✅").openOn(mainMap);
  });

  mainMap.on && mainMap.on('locationerror', () => {
    // locationerror may fire if mainMap.locate was used — give user feedback
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

// helper used by routes page — small map init
function initSmallMap(containerId) {
  const m = L.map(containerId).setView([40.395, 49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
  return m;
}

// auto init if index page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) initMainMap();
});
