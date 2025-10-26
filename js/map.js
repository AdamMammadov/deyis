// map.js — FINAL version, no static coords, pure dynamic "Məni göstər"
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
  // Xəritə ilkin boş vəziyyətdə açılır, koordinatsız
  mainMap = L.map('map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);

  // Default görünüş (yalnız xəritə üçün)
  mainMap.setView([0, 0], 2);

  const data = await loadCombinedTraffic();
  populateTrafficMarkers(data);
  setupMapInteractions();
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

  async function showMyLocation() {
    if (!('geolocation' in navigator)) {
      alert("Geolokasiya bu brauzerdə dəstəklənmir.");
      return;
    }

    const prevText = locateBtn ? locateBtn.textContent : "";
    if (locateBtn) locateBtn.disabled = true, locateBtn.textContent = "Axtarılır…";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 25;

        // Əvvəlki təbəqələri təmizlə
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

        // İstifadəçinin real mövqeyinə zoom et
        mainMap.setView([lat, lng], 17, { animate: true });
        userMarker.bindPopup("📍 Hazırkı mövqeyin təyin olundu ✅").openPopup();

        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || "Məni göstər";
      },
      (err) => {
        console.warn("Geolocation error:", err);
        alert("Mövqeyi tapmaq mümkün olmadı: " + err.message);
        if (locateBtn) locateBtn.disabled = false, locateBtn.textContent = prevText || "Məni göstər";
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  if (locateBtn) {
    locateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showMyLocation();
    });
  }
}

// Xəritə yalnız səhifədə varsa işə düşür
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("map")) initMainMap();
});
