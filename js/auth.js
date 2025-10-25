// js/auth.js
(function () {
  function getUser() {
    return JSON.parse(localStorage.getItem("urbanflow_user") || "null");
  }

  function setUser(user) {
    localStorage.setItem("urbanflow_user", JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem("urbanflow_user");
  }

  // login vəziyyətini yoxla (dashboard və ya index üçün)
  window.checkAuth = async function (redirectToDashboard = false) {
    const user = getUser();
    if (redirectToDashboard && !user) {
      alert("Əvvəlcə daxil olmalısınız!");
      window.location.href = "index.html";
    }
    return user;
  };

  // logout funksiyası
  window.logout = function () {
    clearUser();
    alert("Çıxış etdiniz!");
    window.location.href = "index.html";
  };

  // login modal davranışı
  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("authModal");
    const form = document.getElementById("authForm");
    const email = document.getElementById("authEmail");
    const password = document.getElementById("authPassword");
    const trigger = document.getElementById("authTrigger");
    const close = document.getElementById("authClose");

    if (!modal || !form) return;

    trigger.addEventListener("click", () => {
      modal.style.display = "block";
    });

    close.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.onclick = function (event) {
      if (event.target === modal) modal.style.display = "none";
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const mail = email.value.trim();
      const pass = password.value.trim();

      if (!mail || !pass) {
        alert("Zəhmət olmasa e-mail və şifrə daxil edin.");
        return;
      }

      // sadə demo auth
      const user = { email: mail, password: pass, createdAt: Date.now() };
      setUser(user);

      alert("✅ Giriş uğurludur!");
      modal.style.display = "none";

      // səhifəni yenilə ki, vəziyyət dəyişsin
      window.location.reload();
    });

    // əgər artıq login olubsa, header-ə göstər
    const user = getUser();
    if (user) {
      const controls = document.querySelector(".controls");
      if (controls) {
        const span = document.createElement("span");
        span.textContent = user.email;
        span.style.marginLeft = "10px";
        span.style.fontSize = "0.9rem";
        span.style.color = "#eee";

        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = "Çıxış";
        logoutBtn.style.marginLeft = "10px";
        logoutBtn.onclick = logout;

        controls.appendChild(span);
        controls.appendChild(logoutBtn);
      }
    }
  });
})();
