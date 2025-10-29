// admin-dashboard.js — UrbanFlow Admin Panel
(async function () {
  console.log("Admin Panel loaded ✅");

  const trafficKey = "urbanflow_traffic_override";
  const bookingsKey = "urbanflow_bookings";
  const userKey = "urbanflow_user";
  const profileKey = "urbanflow_profile";

  // ===============================
  // 🔹 TRAFİK MƏLUMATLARI FUNKSİYALARI
  // ===============================

  async function loadBaseTraffic() {
    try {
      const r = await fetch("assets/data/traffic.json");
      if (!r.ok) throw new Error("base not found");
      return await r.json();
    } catch {
      return [];
    }
  }

  async function getTraffic() {
    const base = await loadBaseTraffic();
    const override = JSON.parse(localStorage.getItem(trafficKey) || "[]");
    return [...base, ...override];
  }

  function renderTraffic(list) {
    const container = document.getElementById("trafficList");
    if (!container) return;
    container.innerHTML = "";
    list.forEach((item) => {
      const card = document.createElement("div");
      card.className = "traffic-item";
      card.innerHTML = `
        <strong>${item.title}</strong>
        <small>${item.level} (sev: ${item.severity})</small>
        <small>${item.description || "—"}</small>
        <small>📍 ${item.lat}, ${item.lng}</small>
      `;
      container.appendChild(card);
    });
  }

  async function refreshTraffic() {
    const list = await getTraffic();
    renderTraffic(list);
  }

  // ===============================
  // 🔹 PROFİL VƏ HESAB FUNKSİYALARI
  // ===============================

  function loadProfile() {
    const stored = JSON.parse(localStorage.getItem(profileKey) || "{}");
    const user = JSON.parse(localStorage.getItem(userKey) || "{}");
    const pic = document.getElementById("profilePic");
    const last = document.getElementById("lastLogin");

    if (pic && stored.photo) pic.src = stored.photo;
    if (last && stored.lastLogin) last.textContent = stored.lastLogin;
    if (user?.email) document.getElementById("newEmail").placeholder = user.email;
  }

  function saveProfilePhoto(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imgData = e.target.result;
      const profile = JSON.parse(localStorage.getItem(profileKey) || "{}");
      profile.photo = imgData;
      localStorage.setItem(profileKey, JSON.stringify(profile));
      document.getElementById("profilePic").src = imgData;
      alert("✅ Profil şəkli dəyişdirildi");
    };
    reader.readAsDataURL(file);
  }

  function changeEmail() {
    const newEmail = document.getElementById("newEmail").value.trim();
    if (!newEmail) return alert("Yeni email daxil edin.");
    const user = JSON.parse(localStorage.getItem(userKey) || "{}");
    user.email = newEmail;
    localStorage.setItem(userKey, JSON.stringify(user));
    alert("📧 Email uğurla dəyişdirildi.");
    document.getElementById("newEmail").value = "";
  }

  function changePassword() {
    const np = document.getElementById("newPass").value.trim();
    if (np.length < 4) return alert("Şifrə ən azı 4 simvol olmalıdır.");
    const user = JSON.parse(localStorage.getItem(userKey) || "{}");
    user.password = np;
    localStorage.setItem(userKey, JSON.stringify(user));
    alert("🔐 Şifrə uğurla dəyişdirildi.");
    document.getElementById("newPass").value = "";
  }

  function deleteAccount() {
    if (!confirm("⚠ Hesabı silmək istədiyinizə əminsiniz?")) return;
    localStorage.removeItem(userKey);
    localStorage.removeItem(profileKey);
    alert("Hesab silindi. Yenidən daxil olmaq üçün saytı yeniləyin.");
    window.location.href = "index.html";
  }

  // ===============================
  // 🔹 TRAFİK FUNKSİYALARININ DƏSTƏK HİSSƏSİ
  // ===============================

  async function addTraffic(record) {
    const arr = JSON.parse(localStorage.getItem(trafficKey) || "[]");
    const id = "ov_" + Date.now();
    arr.push({
      id,
      title: record.title || "Yeni tıxac",
      description: record.description || "",
      severity: record.severity || 1,
      level: record.level || "low",
      lat: record.lat || 40.395,
      lng: record.lng || 49.85,
    });
    localStorage.setItem(trafficKey, JSON.stringify(arr));
    await refreshTraffic();
  }

  function exportTraffic() {
    getTraffic().then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "urbanflow_traffic_export.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ===============================
  // 🔹 HANDLERS & INIT
  // ===============================

  document.addEventListener("DOMContentLoaded", () => {
    // Profil hadisələri
    const fileInput = document.getElementById("profileFile");
    if (fileInput) {
      document.getElementById("btnUploadPhoto").addEventListener("click", () => {
        if (!fileInput.files.length) return alert("Fayl seçin!");
        saveProfilePhoto(fileInput.files[0]);
      });
    }

    document
      .getElementById("btnChangeEmail")
      .addEventListener("click", changeEmail);

    document
      .getElementById("btnChangePass")
      .addEventListener("click", changePassword);

    document
      .getElementById("btnDeleteAcc")
      .addEventListener("click", deleteAccount);

    document.getElementById("go-site").addEventListener("click", () => {
      window.open("index.html", "_blank");
    });

    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem(userKey);
      alert("Çıxış edildi.");
      window.location.href = "login.html";
    });

    // ilk giriş tarixi
    const profile = JSON.parse(localStorage.getItem(profileKey) || "{}");
    if (!profile.lastLogin) {
      profile.lastLogin = new Date().toLocaleString("az-AZ");
      localStorage.setItem(profileKey, JSON.stringify(profile));
    }

    // render
    loadProfile();
    refreshTraffic();
  });
})();
