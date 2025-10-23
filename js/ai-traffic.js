// js/ai-traffic.js
// Sadə AI əsaslı trafik proqnoz və tövsiyə modulu

export async function predictTraffic(route, currentHour) {
  // Təxmini AI model (realda ML API inteqrasiyası ola bilər)
  // Giriş: məsafə, vaxt, və saat
  const { distance, time } = route;
  let trafficLevel = "normal";
  let delayMinutes = 0;

  // 🕓 Vaxt faktoru (pik saatlar)
  if (currentHour >= 8 && currentHour <= 10 || currentHour >= 17 && currentHour <= 19) {
    trafficLevel = "heavy";
    delayMinutes = (time * 0.3); // 30% daha uzun vaxt
  } else if (currentHour >= 12 && currentHour <= 14) {
    trafficLevel = "medium";
    delayMinutes = (time * 0.15);
  }

  // 📊 Proqnoz nəticəsi
  return {
    level: trafficLevel,
    delay: delayMinutes,
    recommended: getRecommendation(trafficLevel)
  };
}

function getRecommendation(level) {
  switch (level) {
    case "heavy": return "Tıxac çoxdur, alternativ vaxt və ya ictimai nəqliyyat seçmək məsləhətdir.";
    case "medium": return "Tıxac orta səviyyədədir, səfəri bir qədər gecikdirmək daha yaxşı ola bilər.";
    default: return "Yollar açıqdır, səfərə indi çıxmaq uyğundur.";
  }
}
