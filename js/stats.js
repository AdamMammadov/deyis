// js/stats.js
// saveRouteSearch + getUserStats
(function(global){
  const DB = () => global.urbanflowFirebase && global.urbanflowFirebase.db;
  const AUTH = () => global.urbanflowFirebase && global.urbanflowFirebase.auth;

  function isCompatDb(db){
    return db && typeof db.collection === 'function';
  }

  async function saveRouteSearch(routeObj){
    // routeObj: { start:[lat,lng], end:[lat,lng], distance: km, time: min, priority }
    const db = DB();
    const user = AUTH()?.currentUser;
    const payload = {
      ...routeObj,
      created: new Date().toISOString()
    };

    if (!db) {
      const arr = JSON.parse(localStorage.getItem('uf_route_history') || '[]');
      arr.unshift(payload);
      localStorage.setItem('uf_route_history', JSON.stringify(arr));
      return;
    }

    if (isCompatDb(db)) {
      const col = db.collection('searchHistory');
      if (user) {
        await col.add({...payload, uid:user.uid, email: user.email});
      } else {
        await col.add({...payload, anon: true});
      }
    } else {
      const mod = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
      const { collection, addDoc } = mod;
      if (user) await addDoc(collection(db,'searchHistory'), {...payload, uid:user.uid, email:user.email});
      else await addDoc(collection(db,'searchHistory'), {...payload, anon:true});
    }
  }

  async function getUserStats(limit=100){
    const db = DB();
    const user = AUTH()?.currentUser;
    let items = [];
    if (!db) {
      items = JSON.parse(localStorage.getItem('uf_route_history') || '[]').slice(0,limit);
    } else if (isCompatDb(db)) {
      const q = user ? db.collection('searchHistory').where('uid','==',user.uid).orderBy('created','desc').limit(limit) : db.collection('searchHistory').orderBy('created','desc').limit(limit);
      const snap = await q.get();
      snap.forEach(d=> items.push(d.data()));
    } else {
      const mod = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
      const { collection, query, where, orderBy, limit: lim, getDocs } = mod;
      const coll = collection(db, 'searchHistory');
      const q = user ? query(coll, where('uid','==', user.uid), orderBy('created','desc')) : query(coll, orderBy('created','desc'));
      const snap = await getDocs(q);
      snap.forEach(d=> items.push(d.data()));
    }

    // compute simple stats
    let totalDistance = 0, totalTime = 0;
    items.forEach(it => {
      totalDistance += Number(it.distance || 0);
      totalTime += Number(it.time || 0);
    });
    const avgDistance = items.length ? (totalDistance / items.length) : 0;
    const avgTime = items.length ? (totalTime / items.length) : 0;

    return { count: items.length, totalDistance, totalTime, avgDistance, avgTime, items };
  }

  // small UI helper: render stats to #uf-stats-output
  async function renderStatsToDom(){
    const el = document.getElementById('uf-stats-output');
    if (!el) return;
    el.innerHTML = 'Yüklənir...';
    const s = await getUserStats(200);
    el.innerHTML = `
      <div>Toplam axtarış: <b>${s.count}</b></div>
      <div>Ümumi məsafə: <b>${s.totalDistance.toFixed(1)} km</b></div>
      <div>Ümumi zaman: <b>${s.totalTime.toFixed(0)} dəq</b></div>
      <div>Orta məsafə: <b>${s.avgDistance.toFixed(1)} km</b></div>
      <div>Orta vaxt: <b>${s.avgTime.toFixed(0)} dəq</b></div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('uf-refresh-stats');
    if (btn) btn.addEventListener('click', renderStatsToDom);
  });

  global.UFStats = { saveRouteSearch, getUserStats, renderStatsToDom };
})(window);
