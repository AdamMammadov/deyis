// js/assistant.js
// UrbanFlow Assistant: local rule-based + Firestore-backed history
// Depends on window.urbanflowFirebase being set (auth + db). Works with compat firebase (db.collection) or modular (we detect).

(function(global){
  const DB = () => global.urbanflowFirebase && global.urbanflowFirebase.db;
  const AUTH = () => global.urbanflowFirebase && global.urbanflowFirebase.auth;

  // helper: check compat vs modular (very light)
  function isCompatDb(db){
    return db && typeof db.collection === 'function';
  }

  // Firestore helpers (supports compat DB)
  async function saveToUserCollection(coll, data){
    const db = DB();
    if (!db) {
      // fallback: localStorage
      const key = `uf_local_${coll}`;
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(data);
      localStorage.setItem(key, JSON.stringify(arr));
      return;
    }
    if (isCompatDb(db)) {
      await db.collection(coll).add(data);
    } else {
      // modular case: try dynamic import of addDoc/collection
      const mod = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
      const { collection, addDoc } = mod;
      await addDoc(collection(db, coll), data);
    }
  }

  async function loadUserCollection(coll, limit=50){
    const db = DB();
    if (!db) {
      const key = `uf_local_${coll}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    if (isCompatDb(db)) {
      const snap = await db.collection(coll).orderBy('created','desc').limit(limit).get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } else {
      const mod = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
      const { collection, query, orderBy, limit: lim, getDocs } = mod;
      const q = query(collection(db, coll), orderBy('created','desc'));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    }
  }

  // UI elements
  const root = document.getElementById('uf-assistant');
  const toggle = document.getElementById('uf-assistant-toggle');
  const panel = document.getElementById('uf-assistant-panel');
  const closeBtn = document.getElementById('uf-assistant-close');
  const messagesEl = document.getElementById('uf-assistant-messages');
  const form = document.getElementById('uf-assistant-form');
  const input = document.getElementById('uf-assistant-input');

  function pushMessage(text, who='bot'){
    const div = document.createElement('div');
    div.className = 'msg ' + (who === 'user' ? 'user' : 'bot');
    div.innerText = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Simple rule-based responder (can be replaced by remote AI)
  function localResponder(text){
    const t = text.toLowerCase();
    // quick rules
    if (t.includes('hava') || t.includes('weather')) {
      return "Hava proqnozunu göstərmək üçün OpenWeather inteqrasiyasını əlavə etdim: indilik demo rejimində yağış ehtimalı 20% olaraq göstərilir.";
    }
    if (t.includes('tıxac') || t.includes('trafik') || t.includes('traffic')) {
      return "Marşrutun üzrə hazırkı proqnoz: orta səviyyədə tıxac. Alternativ yol üçün 'Alternativ marşrut' düyməsinə basın.";
    }
    if (t.includes('servis') || t.includes('rezerv')) {
      return "Servis rezervasiyaları üçün Services səhifəsinə keçin; rezervasiya etmək üçün sizdən giriş tələb olunur.";
    }
    if (t.includes('kömək') || t.includes('help')) {
      return "Mən UrbanFlow Assistant-əm. Marşrut, servis, statistikalar və bildirişlərlə kömək edə bilərəm. Məs: 'Mənim ən çox getdiyim yerlər hansılardır?'";
    }
    // detect coordinates request
    const coordMatch = t.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      return `Gördüm: koordinatlar ${coordMatch[1]}, ${coordMatch[2]}. Xəritədə göstərmək üçün 'Marşruta bax' düyməsini basın.`;
    }
    // fallback
    return "Bu sualın cavabını tapmadım — amma historialarına baxa bilərəm (yaxud adminə soruş).";
  }

  // handle message: show, save, respond
  async function handleMessage(text){
    pushMessage(text, 'user');
    const user = AUTH()?.currentUser;
    const now = new Date();
    const record = { text, who: 'user', created: now.toISOString() };

    // save user message
    if (user) {
      await saveToUserCollection(`users/${user.uid}/assistantHistory`, { ...record, uid: user.uid, ts: now });
    } else {
      await saveToUserCollection('assistantHistory', { ...record, anon: true, ts: now });
    }

    // generate reply (local)
    const reply = localResponder(text);
    pushMessage(reply, 'bot');

    // save bot reply
    const botRecord = { text: reply, who: 'bot', created: now.toISOString() };
    if (user) {
      await saveToUserCollection(`users/${user.uid}/assistantHistory`, { ...botRecord, uid: user.uid, ts: now });
    } else {
      await saveToUserCollection('assistantHistory', { ...botRecord, anon: true, ts: now });
    }
  }

  // load history into widget
  async function loadHistory(){
    messagesEl.innerHTML = '';
    const user = AUTH()?.currentUser;
    const coll = user ? `users/${user.uid}/assistantHistory` : 'assistantHistory';
    const items = await loadUserCollection(coll, 100);
    // items expected with fields {text, who, ts}
    items.reverse(); // oldest first
    for(const it of items){
      pushMessage(it.text, it.who || 'bot');
    }
  }

  // events
  toggle?.addEventListener('click', async (e) => {
    root.classList.toggle('open');
    root.classList.toggle('closed');
    panel.style.display = (panel.style.display === 'flex' || panel.style.display === 'block') ? 'none' : 'flex';
    if (panel.style.display !== 'none') {
      await loadHistory();
    }
  });
  closeBtn?.addEventListener('click', () => {
    root.classList.remove('open');
    panel.style.display = 'none';
  });
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    await handleMessage(v);
  });

  // auto greet
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      pushMessage("Salam! Mən UrbanFlow Assistant. Nə ilə kömək edə bilərəm?");
    }, 800);
  });

  // expose
  global.UFAssistant = {
    handleMessage,
    loadHistory
  };

})(window);
