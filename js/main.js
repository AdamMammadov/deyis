// main.js — global UI behaviours: theme toggle, scroll navbar, burger menu, brand click

(() => {
  // Tema dəyişimi
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const root = document.documentElement;
    const isDark = localStorage.getItem('urbanflow_theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
    btn.textContent = isDark? '☀': '🌙';

    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const dark = document.body.classList.contains('dark');
      localStorage.setItem('urbanflow_theme', dark? 'dark': 'light');
      btn.textContent = dark? '☀': '🌙';
});
}

  // Scroll zamanı navbar sabit qalır
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY> 50) {
        navbar.style.position = 'fixed';
        navbar.style.top = '0';
        navbar.style.width = '100%';
        navbar.style.zIndex = '1000';
} else {
        navbar.style.position = 'relative';
}
});
}

  // Burger menyu açılıb-bağlanır
  const menuToggle = document.querySelector('.menu-toggle');
  const controls = document.querySelector('.topbar.controls');
  if (menuToggle && controls) {
    menuToggle.addEventListener('click', () => {
      controls.classList.toggle('show');
});
}

  // Brand kliklə əsas səhifəyə yönləndirmə
  const brand = document.querySelector('.topbar.brand');
  if (brand) {
    brand.addEventListener('click', () => {
      window.location.href = 'index.html';
});
}

  // Giriş düyməsi modal açır
  const authTrigger = document.getElementById('authTrigger');
  const authModal = document.getElementById('authModal');
  const authClose = document.getElementById('authClose');

  if (authTrigger && authModal) {
    authTrigger.addEventListener('click', () => {
      authModal.style.display = 'block';
});
}

  if (authClose && authModal) {
    authClose.addEventListener('click', () => {
      authModal.style.display = 'none';
});
}

  window.addEventListener('click', (event) => {
    if (event.target === authModal) {
      authModal.style.display = 'none';
}
});
})();
