// map.js — Final version with accurate GPS + IP fallback
let mainMap;
let markers = [];
let userMarker = null;
let userCircle = null;

async function fetchJSON(path) {
  const r = await fetch(path);
  return r.json();
}

function trafficColor(level) {
  if (level === "high") return "#e02424";
  if (level === "medium") return "#ffb020";
  return "#22c55e";
}

async function loadCombinedTraffic() {
  const base = await fetchJSON("assets/data/traffic.json").catch(() => []);
  const override = JSON.parse(localStorage.getItem("urbanflow_traffic_override") || "[]");
  base.forEach((b, i) => {
    if (!b.id) b.id = "base_" + i;
  });
  return [...base, ...override];
}

async function initMainMap() {
  mainMap = L.map("map", { zoomControl: true }).setView([40.395, 49.85], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mainMap);

  const data = await loadCombinedTraffic();
  populateTrafficMarkers(data);
  setupMapInteractions();

  window.addEventListener("storage", (ev) => {
    if (ev.key === "urbanflow_refresh") {
      loadCombinedTraffic().then(populateTrafficMarkers);
    }
  });
}

function populateTrafficMarkers(data) {
  markers.forEach((m) => mainMap.removeLayer(m));
  markers = [];

  data.forEach((item) => {
    const color = trafficColor(item.level);
    const circle = L.circle([item.lat, item.lng], {
      radius: 60 + (item.severity || 1) * 40,
      color,
      fillColor: color,
      fillOpacity: 0.35,
    });

    circle.on("click", () => {
      L.popup()
        .setLatLng([item.lat, item.lng])
        .setContent(
          `<strong>${item.title}</strong><br/>Səviyyə: ${item.level}<br/>Təsir: ${
            item.description || ""
          }`
        )
        .openOn(mainMap);
    });

    circle.addTo(mainMap);
    markers.push(circle);
  });

  const active = data.filter((d) => d.level === "high").length;
  const nonLow = data.filter((d) => d.level !== "low").length;
  const avgSpeed = Math.max(
    20,
    60 - data.reduce((s, i) => s + (i.severity || 1) * 5, 0)
  );

  if (document.getElementById("active-jams"))
    document.getElementById("active-jams").innerText = active;
  if (document.getElementById("alerts-count"))
    document.getElementById("alerts-count").innerText = nonLow;
  if (document.getElementById("avg-speed"))
    document.getElementById("avg-speed").innerText = `${avgSpeed.toFixed(0)}`;
}

function setupMapInteractions() {
  const locateBtn = document.getElementById("locate-btn");
  if (locateBtn) {
    locateBtn.addEventListener("click", async () => {
      await locateUser();
    });
  }

  const filterEl = document.getElementById("traffic-filter");
  if (filterEl) {
    filterEl.addEventListener("change", async (e) => {
      const v = e.target.value;
      const data = await loadCombinedTraffic();
      const filtered = v === "all" ? data : data.filter((d) => d.level === v);
      populateTrafficMarkers(filtered);
    });
  }
}

// GPS və IP ilə yer təyin edən funksiya
async function locateUser() {
  if (!navigator.geolocation) {
    alert("Brauzeriniz mövqeyi müəyyən etməyi dəstəkləmir.");
    return;
  }

  let found = false;

  // 1️⃣ Əvvəlcə GPS ilə yoxla
  await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        found = true;
        showUserOnMap(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        resolve();
      },
      async () => {
        console.warn("GPS mövqeyi alınmadı, IP-lə yoxlanılır...");
        // 2️⃣ IP fallback
        const ipLoc = await getApproxLocation();
        if (ipLoc) {
          found = true;
          showUserOnMap(ipLoc.lat, ipLoc.lon, 1000, true);
        }
        resolve();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });

  if (!found) {
    alert("Mövqeyi təyin etmək mümkün olmadı. Zəhmət olmasa icazə verin və yenidən cəhd edin.");
  }
}

// IP əsasında ehtiyat mövqe (free API)
async function getApproxLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      return { lat: data.latitude, lon: data.longitude };
    }
  } catch (e) {
    console.warn("IP geolocation uğursuz oldu:", e);
  }
  return null;
}

function showUserOnMap(lat, lng, acc = 100, fromIP = false) {
  const userLatLng = [lat, lng];

  if (userMarker) mainMap.removeLayer(userMarker);
  if (userCircle) mainMap.removeLayer(userCircle);

  userMarker = L.marker(userLatLng, {
    title: "Sənin mövqeyin",
  }).addTo(mainMap);

  userCircle = L.circle(userLatLng, {
    radius: Math.min(acc, 150),
    color: "#0b3d91",
    fillColor: "#3b82f6",
    fillOpacity: 0.3,
  }).addTo(mainMap);

  mainMap.setView(userLatLng, 17, { animate: true });

  L.popup()
    .setLatLng(userLatLng)
    .setContent(
      fromIP
        ? "Təxmini mövqeyin təyin olundu 🌍 (IP əsasında)"
        : "Hazırkı mövqeyin təyin olundu ✅"
    )
    .openOn(mainMap);
}

function initSmallMap(containerId) {
  const m = L.map(containerId).setView([40.395, 49.85], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(m);
  return m;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("map")) initMainMap();
});
