// admin-dashboard.js — trafik, rezervasiyalar, export və auth inteqrasiyası
(async function () {
  // --- i18n gözlənir (əgər varsa) ---
  const waitI18n = () =>
    new Promise((res) => {
      if (window.i18n) return res();
      const i = setInterval(() => {
        if (window.i18n) {
          clearInterval(i);
          res();
        }
      }, 50);
      setTimeout(() => res(), 1500);
    });
  await waitI18n();

  const trafficKey = "urbanflow_traffic_override";
  const bookingsKey = "urbanflow_bookings";

  // --- Əsas trafik məlumatını yüklə ---
  async function loadBaseTraffic() {
    try {
      const r = await fetch("assets/data/traffic.json");
      if (!r.ok) throw new Error("no base");
      return await r.json();
    } catch (e) {
      return [];
    }
  }

  async function getTraffic() {
    const base = await loadBaseTraffic();
    const override = JSON.parse(localStorage.getItem(trafficKey) || "[]");
    return [...base, ...override];
  }

  // --- Trafik siyahısını göstər ---
  function renderTraffic(list) {
    const container = document.getElementById("trafficList");
    if (!container) return;

    container.innerHTML = "";
    const filterInput = document.getElementById("filterText");
    const filter = filterInput ? filterInput.value.trim().toLowerCase() : "";

    list
      .filter((item) => {
        if (!filter) return true;
        return (
          (item.title || "").toLowerCase().includes(filter) ||
          (item.level || "").toLowerCase().includes(filter)
        );
      })
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = "traffic-row";
        row.innerHTML = `
          <div>
            <strong>${item.title}</strong>
            <div class="muted">${item.level} · sev:${item.severity || 1}</div>
            <div class="muted" style="font-size:0.85rem">${item.description || ""}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <div class="muted" style="font-size:0.85rem">${item.lat || "-"}, ${item.lng || "-"}</div>
            <div>
              <button class="btn-ghost" data-id="${item.id}" data-action="focus">Xəritədə göstər</button>
              <button class="btn-ghost danger" data-id="${item.id}" data-action="remove">Sil</button>
            </div>
          </div>
        `;
        container.appendChild(row);
      });

    // Buton funksiyaları
    container.querySelectorAll("button[data-action]").forEach((b) => {
      b.addEventListener("click", (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        const action = ev.currentTarget.getAttribute("data-action");
        if (action === "remove") removeTraffic(id);
        if (action === "focus") focusOnMap(id);
      });
    });
  }

  // --- UI yeniləmə ---
  async function refreshUI() {
    const t = await getTraffic();
    renderTraffic(t);
    renderBookings();
  }

  // --- Yeni trafik əlavə et ---
  async function addTraffic(record) {
    const arr = JSON.parse(localStorage.getItem(trafficKey) || "[]");
    const id = "ov_" + Date.now();
    arr.push(
      Object.assign(
        { id, title: "Untitled", description: "", severity: 1, level: "low", lat: 0, lng: 0 },
        record
      )
    );
    localStorage.setItem(trafficKey, JSON.stringify(arr));
    localStorage.setItem("urbanflow_refresh", Date.now().toString());
    await refreshUI();
  }

  // --- Trafiki sil ---
  function removeTraffic(id) {
    const arr = JSON.parse(localStorage.getItem(trafficKey) || "[]");
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      localStorage.setItem(trafficKey, JSON.stringify(arr));
      localStorage.setItem("urbanflow_refresh", Date.now().toString());
      refreshUI();
      return;
    }
    alert(
      "Bu maddə əsas data faylındadır və brauzer üzərindən silmək mümkün deyil. Override əlavə edib sonra o maddəni silə bilərsiniz."
    );
  }

  // --- Fokus xəritəyə yönləndirmə ---
  function focusOnMap(id) {
    (async () => {
      const all = await getTraffic();
      const item = all.find((x) => x.id === id);
      if (!item) return alert("Tapılmadı");
      localStorage.setItem(
        "urbanflow_focus",
        JSON.stringify({ lat: item.lat, lng: item.lng, title: item.title, ts: Date.now() })
      );
      alert(`📍 "${item.title}" xəritədə göstəriləcək`);
    })();
  }

  // --- Export funksiyası ---
  function exportTraffic() {
    (async () => {
      const all = await getTraffic();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "urbanflow_traffic_export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })();
  }

  // --- Override təmizlə ---
  function clearOverride() {
    localStorage.removeItem(trafficKey);
    localStorage.setItem("urbanflow_refresh", Date.now().toString());
    refreshUI();
  }

  // --- Rezervasiyalar siyahısı ---
  function renderBookings() {
    const list = document.getElementById("bookingsList");
    if (!list) return;

    const arr = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
    list.innerHTML = "";
    if (!arr.length) {
      list.innerHTML = '<div class="muted">— boş —</div>';
      return;
    }
    arr
      .slice()
      .reverse()
      .forEach((b) => {
        const el = document.createElement("div");
        el.style.borderBottom = "1px solid #eee";
        el.style.padding = "8px 0";
        el.innerHTML = `<strong>${b.name}</strong> <span class="muted">(${b.date} ${b.time})</span>
                        <div class="muted">${b.serviceId} · ${b.id}</div>`;
        list.appendChild(el);
      });
  }

  // --- Əlavə düymə funksiyaları ---
  if (document.getElementById("btn-refresh"))
    document.getElementById("btn-refresh").addEventListener("click", refreshUI);
  if (document.getElementById("filterText"))
    document.getElementById("filterText").addEventListener("input", () => refreshUI());

  if (document.getElementById("btn-add"))
    document.getElementById("btn-add").addEventListener("click", () => {
      const title = document.getElementById("new-title").value || "Yeni tıxac";
      const level = document.getElementById("new-level").value || "low";
      const lat = parseFloat(document.getElementById("new-lat").value) || 40.395;
      const lng = parseFloat(document.getElementById("new-lng").value) || 49.85;
      const severity = parseInt(document.getElementById("new-sev").value) || 2;
      const desc = document.getElementById("new-desc").value || "";
      addTraffic({ title, level, lat, lng, severity, description: desc });
      document.getElementById("new-title").value = "";
      document.getElementById("new-desc").value = "";
      document.getElementById("new-sev").value = "";
    });

  if (document.getElementById("btn-export"))
    document.getElementById("btn-export").addEventListener("click", exportTraffic);

  if (document.getElementById("btn-clear-ov"))
    document.getElementById("btn-clear-ov").addEventListener("click", () => {
      if (confirm("Override silinsin?")) clearOverride();
    });

  if (document.getElementById("btn-view-bookings"))
    document.getElementById("btn-view-bookings").addEventListener("click", () => {
      const arr = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
      if (!arr.length) return alert("Rezervasiya tapılmadı");
      console.table(arr);
      alert(`${arr.length} rezervasiya tapıldı — konsolda (F12) görə bilərsiniz.`);
    });

  // --- Ana səhifəyə qayıt və çıxış düymələri ---
  document.getElementById("go-site")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.getElementById("logout")?.addEventListener("click", () => {
    if (typeof logout === "function") logout();
    else {
      localStorage.removeItem("urbanflow_user");
      window.location.href = "index.html";
    }
  });

  // --- Digər tablardan yenilənmə hadisəsi ---
  window.addEventListener("storage", (ev) => {
    if (ev.key === "urbanflow_refresh") {
      refreshUI();
    }
  });

  // --- İlk yüklənmə ---
  refreshUI();
})();
