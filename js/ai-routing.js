 // ai-routing.js — OpenRouteService ilə real marşrutlama
// Nümunə: findOptimalRoute([lat1,lng1], [lat2,lng2], {priority:'fastest'}, map);

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJjNWE3YmE3MTM0YzQ1NjdiNTFjYjRiYWQxZjUzMjMwIiwiaCI6Im11cm11cjY0In0=";

async function findOptimalRoute(startLatLng, endLatLng, options={}, map=null){
  const profile = options.profile || "driving-car"; // driving-car, cycling-regular, foot-walking
  const preference = options.priority || "fastest"; // fastest, shortest, recommended

  const body = {
    coordinates: [
      [startLatLng[1], startLatLng[0]], // ORS expects [lon, lat]
      [endLatLng[1], endLatLng[0]]
    ],
    preference,
    instructions: true
  };

  try {
    const resp = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error("ORS API error: " + resp.status);
    const data = await resp.json();

    const geometry = data.routes[0].geometry;
    const decoded = decodePolyline(geometry);
    const distance = data.routes[0].summary.distance / 1000; // km
    const duration = data.routes[0].summary.duration / 60; // min

    // xəritəyə çək
    if (map) {
      if (map._routeLayer) map.removeLayer(map._routeLayer);
      map._routeLayer = L.polyline(decoded, { color: "#ff6b6b", weight: 6, opacity: 0.9 }).addTo(map);
      map.fitBounds(map._routeLayer.getBounds(), { padding: [30, 30] });
    }

    return { path: decoded, distance, time: duration, raw: data };

  } catch (err) {
    console.error("Route error:", err);
    return null;
  }
}

// ORS polyline decoder (5-digit encoded polyline)
function decodePolyline(str, precision=5) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0; result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}
