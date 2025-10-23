// js/transport.js
// Real-time transport demo: loads assets/data/transport.json and simulates moving vehicles.
// Depends on mainMap (global) created by map.js (initMainMap or initSmallMap).
// Usage: call Transport.init({interval:2000}) after mainMap is ready (we auto-init on DOMContentLoaded).

const Transport = (function(){
  const DATA_URL = 'assets/data/transport.json';
  const ICONS = {
    bus: { url: 'assets/img/bus.png', size: [36,36] },
    metro: { url: 'assets/img/metro.png', size: [36,36] }
  };
  let vehicles = [];           // array of vehicle objects (with runtime state)
  let markers = {};            // id -> L.marker
  let timer = null;
  let intervalMs = 2000;
  let running = false;

  // linear interpolation between two latlngs by fraction t (0..1)
  function lerpLatLng(a, b, t){
    return [ a[0] + (b[0]-a[0]) * t, a[1] + (b[1]-a[1]) * t ];
  }

  // compute distance (km) using haversine
  function haversine(a, b){
    const R = 6371; // km
    const toRad = Math.PI/180;
    const dLat = (b[0]-a[0])*toRad;
    const dLon = (b[1]-a[1])*toRad;
    const la = a[0]*toRad, lb = b[0]*toRad;
    const aa = Math.sin(dLat/2)**2 + Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  }

  // load icon
  function createIcon(type){
    const cfg = ICONS[type] || ICONS.bus;
    return L.icon({
      iconUrl: cfg.url,
      iconSize: cfg.size,
      iconAnchor: [cfg.size[0]/2, cfg.size[1]/2],
      popupAnchor: [0, -cfg.size[1]/2]
    });
  }

  async function loadData(){
    try{
      const r = await fetch(DATA_URL);
      if (!r.ok) throw new Error('transport.json load failed');
      const data = await r.json();
      // normalize vehicles: ensure currentIndex, progress
      vehicles = data.map(v => ({
        id: v.id,
        type: v.type || 'bus',
        routeName: v.routeName || '',
        speed_kmh: v.speed_kmh || 30,
        route: v.route || [],
        currentIndex: (typeof v.currentIndex === 'number') ? v.currentIndex % (v.route?.length||1) : 0,
        progress: 0 // progress between currentIndex -> nextIndex (0..1)
      }));
      return vehicles;
    }catch(err){
      console.error('Transport load error', err);
      vehicles = [];
      return vehicles;
    }
  }

  function addMarkers(map){
    if (!map) return;
    vehicles.forEach(v => {
      const idx = v.currentIndex;
      const pos = v.route[idx] || v.route[0] || [0,0];
      const marker = L.marker(pos, { icon: createIcon(v.type), rotationAngle:0 }).addTo(map);
      marker.bindPopup(`<strong>${v.id}</strong><br/>${v.routeName}<br/>Sürət: ${v.speed_kmh} km/h`);
      markers[v.id] = marker;
    });
  }

  function stepSimulation(map){
    if (!map) return;
    vehicles.forEach(v => {
      if (!v.route || v.route.length < 2) return;
      const cur = v.currentIndex;
      const next = (cur + 1) % v.route.length;
      // compute distance between nodes
      const a = v.route[cur];
      const b = v.route[next];
      const segmentKm = haversine(a,b);
      // How much fraction to move per tick? based on speed_kmh and intervalMs
      const hoursPerTick = intervalMs / 1000 / 3600; // interval in hours
      const kmPerTick = (v.speed_kmh || 30) * hoursPerTick;
      // if segment small, use progress step
      const fracStep = segmentKm > 0 ? (kmPerTick / segmentKm) : 1;
      v.progress += fracStep;

      if (v.progress >= 1) {
        // move to next node, subtract overflow
        const overflow = v.progress - 1;
        v.currentIndex = next;
        v.progress = Math.min(overflow, 1); // can carry to next segment
      }

      // compute current position by interpolating between currentIndex and next
      const curPos = v.route[v.currentIndex];
      const nextPos = v.route[(v.currentIndex + 1) % v.route.length];
      const pos = lerpLatLng(curPos, nextPos, v.progress || 0);
      // update marker
      const marker = markers[v.id];
      if (marker) {
        marker.setLatLng(pos);
        // update popup content with ETA-like info
        const remainingSegKm = haversine(pos, nextPos) + haversine(nextPos, v.route[(v.currentIndex+2)%v.route.length] || nextPos);
        const etaMin = ((remainingSegKm / (v.speed_kmh || 30)) * 60).toFixed(0);
        marker.getPopup()?.setContent(`<strong>${v.id}</strong><br/>${v.routeName}<br/>Sürət: ${v.speed_kmh} km/h<br/>ETA: ${etaMin} dəq`);
        // if not open, update silently; if open, reopen to refresh
        // rotate icon? Leaflet core doesn't support rotation for default markers without plugin; skip
      }
    });
  }

  function start(map, opts = {}) {
    if (!map) {
      console.warn('Transport.start: map required');
      return;
    }
    if (running) return;
    intervalMs = opts.interval || 2000;
    running = true;
    // initialize
    loadData().then(() => {
      addMarkers(map);
      timer = setInterval(() => stepSimulation(map), intervalMs);
    });
  }

  function stop(){
    if (!running) return;
    clearInterval(timer);
    timer = null;
    running = false;
    // remove markers
    Object.values(markers).forEach(m => {
      try { m.remove(); } catch(e){}
    });
    markers = {};
  }

  // toggle layer convenience
  function toggle(map){
    if (!running) start(map);
    else stop();
  }

  // expose API
  return {
    initAuto: function(opts = {}) {
      // try to auto-start when mainMap exists
      document.addEventListener('DOMContentLoaded', async () => {
        // wait a bit for map to init if necessary
        setTimeout(() => {
          if (window.mainMap) start(window.mainMap, opts);
        }, 600);
      });
    },
    start, stop, toggle, vehicles
  };
})();

// auto-init with default interval 2000ms
Transport.initAuto({ interval: 2000 });

// expose to global for console access
window.Transport = Transport;
