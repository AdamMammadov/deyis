// js/firestore-sync.js
// Requires window.urbanflowFirebase (from firebase-init.js)
(function(){
  const waitForFirebase = () => new Promise(res => {
    if (window.urbanflowFirebase && window.urbanflowFirebase.db) return res();
    const i = setInterval(()=>{ if (window.urbanflowFirebase && window.urbanflowFirebase.db){ clearInterval(i); res(); } }, 50);
    setTimeout(()=>res(), 3000);
  });

  async function saveBookingFirestore(payload){
    await waitForFirebase();
    if (!window.urbanflowFirebase || !window.urbanflowFirebase.db) {
      // fallback
      const bookings = JSON.parse(localStorage.getItem('urbanflow_bookings')||'[]');
      bookings.push(Object.assign({id:'local_' + Date.now(), created: new Date().toISOString()}, payload));
      localStorage.setItem('urbanflow_bookings', JSON.stringify(bookings));
      return {ok:false, message:'Firestore not initialized, saved locally.'};
    }
    try{
      const { db } = window.urbanflowFirebase;
      const col = collection(db, 'bookings');
      const docRef = await addDoc(col, Object.assign({}, payload, { created: serverTimestamp ? serverTimestamp() : new Date() }));
      return {ok:true, id: docRef.id};
    }catch(err){
      console.error(err);
      return {ok:false, message:err.message || 'save error'};
    }
  }

  // Expose to global so UI code can call
  window.urbanflowBooking = {
    saveBookingFirestore
  };

  // admin helper: get recent bookings (for dashboard to list)
  window.getRecentBookingsFromFirestore = async function(limit=50){
    await waitForFirebase();
    if (!window.urbanflowFirebase || !window.urbanflowFirebase.db) return [];
    const { db } = window.urbanflowFirebase;
    const q = query(collection(db, 'bookings'), orderBy('created','desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
  };

})();
