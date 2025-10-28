// js/service.js — Servis siyahısı və rezervasiya sistemi (sabit və genişləndirilmiş versiya)
console.log("🧭 service.js yükləndi");

// 🔹 Servis siyahısını yüklə və UI-ya əlavə et
async function loadServicesUI() {
  try {
    const data = await fetch("assets/data/services.json").then(r => r.json());
    const list = document.getElementById("services-list");
    const sel = document.getElementById("service-select");

    if (!list || !sel) {
      console.error("❌ UI elementləri tapılmadı (services-list və ya service-select).");
      return;
    }

    list.innerHTML = "";
    sel.innerHTML = "";

    data.forEach(s => {
      const div = document.createElement("div");
      div.className = "service";
      div.innerHTML = `
        <div>
          <strong>${s.name}</strong>
          <div class="muted">${s.price} · ⭐ ${s.rating}</div>
          <p style="margin-top:6px;font-size:0.9rem;color:#444;">
            ${s.desc || "Xidmət haqqında əlavə məlumat mövcud deyil."}
          </p>
        </div>
        <div>
          <button onclick="fillReserve('${s.id}')">Rezerv et</button>
        </div>
      `;
      list.appendChild(div);

      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.price})`;
      sel.appendChild(opt);
    });

    console.log("✅ Servis siyahısı yükləndi:", data.length);
  } catch (err) {
    console.error("❌ Servis siyahısı yüklənmədi:", err);
    alert("Servis siyahısı yüklənmədi. Zəhmət olmasa sonra yenidən yoxlayın.");
  }
}

// 🔹 Seçilmiş servisi formda göstər
function fillReserve(id) {
  const sel = document.getElementById("service-select");
  if (sel) sel.value = id;
  const form = document.getElementById("reserve-form");
  if (form) window.scrollTo({ top: form.offsetTop, behavior: "smooth" });
}

// 🔹 Əsas rezervasiya funksiyası
async function makeReservation({ serviceId, name, surname, date, time }) {
  console.log("🚀 makeReservation başladı:", { serviceId, name, surname, date, time });
  try {
    const db = window.urbanflowFirebase?.db;
    const payload = { serviceId, name, surname, date, time, createdAt: new Date().toISOString() };
    let id = "";

    if (db) {
      console.log("☁️ Firestore aktiv, Cloud-a yazılır...");
      const resRef = await db.collection("reservations").add({
        ...payload,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      id = resRef.id;
      console.log("✅ Firestore yazıldı:", id);
      return { ok: true, id, message: `✅ Rezervasiya uğurla yaradıldı!<br>ID: <b>${id}</b>` };
    } else {
      console.warn("⚠️ Firestore tapılmadı — localStorage istifadə olunur.");
      const idLocal = "b" + Date.now();
      const bookings = JSON.parse(localStorage.getItem("urbanflow_bookings") || "[]");
      const rec = { id: idLocal, ...payload };
      bookings.push(rec);
      localStorage.setItem("urbanflow_bookings", JSON.stringify(bookings));
      console.log("💾 Lokal rezervasiya yaradıldı:", rec);
      return { ok: true, id: idLocal, message: `✅ Rezervasiya yerli yaddaşda saxlanıldı.<br>ID: <b>${idLocal}</b>` };
    }
  } catch (err) {
    console.error("❌ makeReservation xətası:", err);
    return { ok: false, id: null, message: "❌ Xəta: " + (err.message || "Naməlum xəta") };
  }
}

// 🔹 Rezervasiya formu hadisələri
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reserve-form");
  const resultBox = document.getElementById("reserve-result");

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const serviceId = document.getElementById("service-select").value;
      const name = document.getElementById("reserve-name").value.trim();
      const surname = document.getElementById("reserve-surname").value.trim();
      const date = document.getElementById("reserve-date").value;
      const time = document.getElementById("reserve-time").value;

      if (!serviceId || !name || !surname || !date || !time) {
        resultBox.textContent = "⚠️ Zəhmət olmasa bütün sahələri doldurun.";
        resultBox.className = "error";
        return;
      }

      const res = await makeReservation({ serviceId, name, surname, date, time });
      resultBox.innerHTML = res.message;
      resultBox.className = res.ok ? "success" : "error";

      if (res.ok) form.reset();
    });
  }

  loadServicesUI();
});

// 🔹 Lokal rezervasiyaları oxu
function getBookings() {
  return JSON.parse(localStorage.getItem("urbanflow_bookings") || "[]");
}

// 🔹 Debug üçün global export
window.UFService = { loadServicesUI, fillReserve, makeReservation, getBookings };
window.makeReservation = makeReservation;

console.log("✅ UFService və makeReservation qlobal mühitə əlavə olundu.");
