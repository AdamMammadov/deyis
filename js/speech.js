// js/speech.js — Voice Command Search for UrbanFlow
// Requires: modern browser (Chrome/Edge with SpeechRecognition API)
console.log("✅ speech.js yükləndi");

(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "az-AZ"; // Azərbaycan dili (dəyişmək olar)
  recognition.interimResults = false;

  let isListening = false;

  function startListening() {
    if (isListening) return;
    recognition.start();
    isListening = true;
    if (window.showToast) showToast("🎙️ Səsli axtarış", "Dinlənilir...");
  }

  function stopListening() {
    if (!isListening) return;
    recognition.stop();
    isListening = false;
    if (window.showToast) showToast("✅ Dayandırıldı", "Səsli axtarış bitdi");
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    console.log("Voice input:", transcript);

    // Sadə nümunə yerlər
    const places = {
      "nərimanov": [40.397, 49.854],
      "28 may": [40.377, 49.846],
      "xalqlar": [40.392, 49.926],
      "gənclik": [40.397, 49.867],
    };

    let found = null;
    for (const key in places) {
      if (transcript.includes(key)) {
        found = places[key];
        break;
      }
    }

    if (found && window.L && window.mainMap) {
      L.marker(found).addTo(window.mainMap).bindPopup("🎯 " + transcript).openPopup();
      window.mainMap.setView(found, 15);
      if (window.showToast) showToast("Tapıldı", transcript);
    } else {
      if (window.showToast) showToast("Axtarış nəticə vermədi", transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    if (window.showToast) showToast("❌ Səs xətası", event.error);
    stopListening();
  };

  // Topbarda düymə əlavə et
  document.addEventListener("DOMContentLoaded", () => {
    const topbar = document.querySelector(".topbar .controls");
    if (!topbar) return;
    const btn = document.createElement("button");
    btn.id = "btn-voice";
    btn.className = "btn-ghost";
    btn.textContent = "🎤";
    btn.title = "Səsli axtarış";
    btn.addEventListener("click", () => {
      if (isListening) stopListening();
      else startListening();
    });
    topbar.appendChild(btn);
  });
})();
