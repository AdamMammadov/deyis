// main.js — global UI behaviours: theme toggle, small utilities
(() => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  const isDark = localStorage.getItem('urbanflow_theme') === 'dark';
  if (isDark) document.body.classList.add('dark');
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('urbanflow_theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️' : '🌙';
  });
})();
