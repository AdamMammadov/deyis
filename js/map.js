// map.js — final stable version (accurate "Məni göstər" across devices)
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
  base.forEach((b, i) => { if (!b.id) b.id = 'base_' + i; });
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

  // react to updates from other tabs
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'urbanflow_refresh') loadCombinedTraffic().then(populateTrafficMarkers);
  });
}

function populateTrafficMarkers(data) {
  markers.forEach(m => mainMap.removeLayer(m));
  markers = [];

  data.forEach(item => {
    if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
    const color = trafficColor(item.level);
    const circle = L.circle([item.lat, item.lng], {
      radius: 60 + (item.severity || 1) * 40,
      color, fillColor: color, fillOpacity: 0.35
    });
    circle.on('click', () => {
      L.popup()
        .setLatLng([item.lat, item.lng])
        .setContent(`<strong>${item.title}</strong><br/>Səviyyə: ${item.level}<br/>${item.description || ''}`)
        .openOn(mainMap);
    });
    circle.addTo(mainMap);
    markers.push(circle);
  });
}

function setupMapInteractions() {
  const locateBtn = document.getElementById('locate-btn');

  async function requestLocation() {
    if (!('geolocation' in navigator)) {
      alert("Geolokasiya bu brauzerdə mövcud deyil.");
      return;
    }

    // Check permission (modern browsers)
    try {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      if (perm.state === "denied") {
        alert("Zəhmət olmasa, bu sayta geolokasiya icazəsi verin.");
        return;
      }
    } catch (_) { /* older browsers ignore */ }

    const prevText = locateBtn ? locateBtn.textContent : "";
    if (locateBtn) locateBtn.disabled = true, locateBtn.textContent = "Axtarılır…";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 25;

        if (userMarker) mainMap.removeLayer(userMarker);
        if (userCircle) mainMap.removeLayer(userCircle);

        const radius = Math.min(Math.max(acc, 10), 200);
        userMarker = L.marker([lat, lng], { title: "Sənin mövqeyin" }).addTo(mainMap);
        userCircle = L.circle([lat, lng], {
          radius: radius,
          color: "#0b3d91",
          fillColor: "#3b82f6",
          fillOpacity: 0.3
        }).addTo(mainMap);

        mainMap.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });
        userMarker.bindPopup("📍 Hazırkı mövqeyin təyin olundu ✅").openPopup();

        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || "Məni göstər";
      },
      (err) => {
        console.warn("Geo error:", err);
        alert("Mövqeyi tapmaq mümkün olmadı: " + err.message);
        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || "Məni göstər";
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  if (locateBtn) {
    locateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      requestLocation();
    });
  }

  // Fallback if leaflet locate used somewhere
  mainMap.on("locationerror", () =>
    alert("Mövqe təyin edilə bilmədi. Zəhmət olmasa icazəni aktiv edin.")
  );
}

function initSmallMap(containerId) {
  const m = L.map(containerId).setView([40.395, 49.85], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
  return m;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("map")) initMainMap();
});
