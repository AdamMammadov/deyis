(function () {
  async function waitForFirebase() {
    let retries = 0;
    while (!window.urbanflowFirebase && retries < 100) {
      await new Promise(r => setTimeout(r, 50));
      retries++;
}
    if (!window.urbanflowFirebase) throw new Error("Firebase init tapılmadı!");
}

  async function initAuth() {
    await waitForFirebase();
    const authApi = window.urbanflowFirebase.auth;

    console.log("✅ Auth init başladı...");

    const form = document.getElementById('authForm');
    const modal = document.getElementById('authModal');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const submitBtn = document.getElementById('authSubmit');
    const closeBtn = document.getElementById('authClose');

    const authUserSpan = document.createElement('span');
    authUserSpan.id = 'authUser';
    authUserSpan.className = 'muted';
    authUserSpan.style.marginLeft = '10px';

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'btn-logout';
    logoutBtn.textContent = 'Çıxış';
    logoutBtn.style.display = 'none';

    const controls = document.querySelector('.topbar.controls');
    if (controls) {
      controls.appendChild(authUserSpan);
      controls.appendChild(logoutBtn);
}

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email ||!password) return;

      try {
        await window.urbanflowFirebase.signIn(email, password);
        alert("✅ Giriş uğurludur!");
        modal.style.display = 'none';
} catch (err) {
        alert("❌ Xəta: " + err.message);
}
});

    logoutBtn.addEventListener('click', async () => {
      await window.urbanflowFirebase.signOut();
      alert("Çıxış etdiniz.");
});

    window.urbanflowFirebase.onAuthStateChanged(user => {
      if (user) {
        authUserSpan.textContent = user.email;
        logoutBtn.style.display = 'inline-block';
} else {
        authUserSpan.textContent = '';
        logoutBtn.style.display = 'none';
}
});

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
});

    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
}
});
}

  document.addEventListener('DOMContentLoaded', initAuth);
})();

