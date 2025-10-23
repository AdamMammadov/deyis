// i18n.js — small but robust localization loader
// Usage: call initI18n() on page load. Put data-i18n="key" on elements to be translated.
// It stores selected locale in localStorage 'urbanflow_locale'
(function(global){
  const BASE = '/assets/i18n/';
  const available = ['az','en','ru'];
  let dict = {};
  let current = localStorage.getItem('urbanflow_locale') || 'az';

  async function loadLocale(locale){
    if (!available.includes(locale)) locale = 'az';
    try{
      const resp = await fetch(`${BASE}${locale}.json`);
      if (!resp.ok) throw new Error('locale load failed');
      dict = await resp.json();
      current = locale;
      localStorage.setItem('urbanflow_locale', locale);
      translatePage();
      populateLangSelector();
      return true;
    }catch(e){
      console.error('i18n load fail', e);
      return false;
    }
  }

  function t(key){
    // support nested keys like "admin.title"
    if (!key) return '';
    const parts = key.split('.');
    let cur = dict;
    for(const p of parts){
      if (cur && (p in cur)) cur = cur[p];
      else { cur = null; break; }
    }
    return cur || key;
  }

  function translatePage(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const txt = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = txt;
      } else {
        el.innerText = txt;
      }
    });
  }

  function populateLangSelector(){
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    sel.innerHTML = '';
    available.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = l.toUpperCase();
      if (l === current) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', (e) => loadLocale(e.target.value));
  }

  async function initI18n(){
    await loadLocale(current);
    // if page later loads elements dynamically, you can call translatePage() again
  }

  // expose API
  global.i18n = { initI18n, loadLocale, t, currentLocale: () => current };

})(window);

// auto init on pages that include this script
document.addEventListener('DOMContentLoaded', ()=> {
  if (window.i18n) window.i18n.initI18n();
});



// js/i18n.js
// Localization system: loads JSON files and replaces [data-i18n] texts

const I18N = {
  currentLang: localStorage.getItem("lang") || "az",
  translations: {},

  async load(lang) {
    try {
      const res = await fetch(`lang/${lang}.json`);
      if (!res.ok) throw new Error(`Could not load lang/${lang}.json`);
      this.translations = await res.json();
      this.currentLang = lang;
      localStorage.setItem("lang", lang);
      this.apply();
    } catch (err) {
      console.error("i18n error:", err);
    }
  },

  t(key) {
    return this.translations[key] || key;
  },

  apply() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const text = this.t(key);
      if (el.placeholder !== undefined && el.tagName === "INPUT") {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    document.title = this.t("app.title");
  }
};

// Auto init
document.addEventListener("DOMContentLoaded", () => {
  I18N.load(I18N.currentLang);

  // attach language selector if exists
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = I18N.currentLang;
    langSelect.addEventListener("change", e => {
      I18N.load(e.target.value);
    });
  }
});

window.I18N = I18N;
