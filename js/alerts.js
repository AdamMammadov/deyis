// alerts.js — simple toast notifications + load "system alerts" from traffic.json
async function loadAlerts() {
  const data = await fetch('assets/data/traffic.json').then(r => r.json());
  const news = document.getElementById('news-list');
  if (news) news.innerHTML = '';
  data.filter(d => d.level !== 'low').forEach(d => {
    const li = document.createElement('li');
    li.textContent = `${d.title} — ${d.description}`;
    if (news) news.appendChild(li);
    // show toast
    showToast(`${d.title}: ${d.description}`);
  });
  // push local notifications (if permission)
  if (Notification && Notification.permission === 'granted') {
    data.filter(d => d.level === 'high').forEach(d => {
      new Notification('UrbanFlow xəbərdarlıq', { body: `${d.title}: ${d.description}` });
    });
  } else if (Notification && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'uf-toast';
  t.innerText = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('visible'), 50);
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 6000);
}

document.addEventListener('DOMContentLoaded', () => loadAlerts());
