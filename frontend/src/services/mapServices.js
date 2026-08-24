const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

export async function searchPlaces(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=8&countrycodes=in`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Geocoding response not ok');
    const data = await res.json();
    const addr = data.address || {};
    return {
      name: data.display_name?.split(',')[0] || `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      fullName: data.display_name || `Spot near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      state: addr.state || addr.region || addr.county || 'Karnataka',
      country: addr.country || 'India',
    };
  } catch {
    return {
      name: `Rider Spot (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      fullName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      state: 'Karnataka',
      country: 'India',
    };
  }
}

export async function getRoadDistance(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `${OSRM}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return (data.routes[0].distance / 1000).toFixed(1);
    }
  } catch { /* fallback */ }
  const R = 6371;
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

export async function getWeather(lat, lng) {
  try {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current;
    if (!c) return 'Weather unavailable';
    const codes = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Showers', 95: 'Thunderstorm' };
    const desc = codes[c.weather_code] || 'Unknown';
    return `${c.temperature_2m}°C | ${desc} | Humidity ${c.relative_humidity_2m}% | Wind ${c.wind_speed_10m} km/h`;
  } catch {
    return 'Weather unavailable';
  }
}

export function estimateFuelCost(distanceKm, efficiencyKmpl = 25, fuelPricePerL = 105) {
  const liters = distanceKm / efficiencyKmpl;
  return (liters * fuelPricePerL).toFixed(0);
}

export async function fetchPetrolPumps(lat, lng, radiusKm = 35) {
  const query = `[out:json][timeout:25];(node["amenity"="fuel"](around:${radiusKm * 1000},${lat},${lng}););out body 50;`;
  try {
    const res = await fetch(OVERPASS, { method: 'POST', body: query });
    const data = await res.json();
    return (data.elements || []).map((el) => ({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name || 'Petrol Pump',
      brand: el.tags?.brand || el.tags?.operator || 'Unknown',
      phone: el.tags?.phone || '',
    }));
  } catch {
    return [];
  }
}

export async function fetchHospitals(lat, lng, radiusKm = 35) {
  const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${radiusKm * 1000},${lat},${lng});node["amenity"="clinic"](around:${radiusKm * 1000},${lat},${lng}););out body 50;`;
  try {
    const res = await fetch(OVERPASS, { method: 'POST', body: query });
    const data = await res.json();
    return (data.elements || []).map((el) => ({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name || 'Hospital',
      phone: el.tags?.phone || el.tags?.['contact:phone'] || 'N/A',
      emergency: el.tags?.emergency || 'yes',
    }));
  } catch {
    return [];
  }
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TILE_LAYERS = {
  osm: { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap' },
  googleRoad: { name: 'Google Road', url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', attribution: '&copy; Google Maps' },
  googleSat: { name: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', attribution: '&copy; Google Maps' },
  googleTerrain: { name: 'Google Terrain', url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', attribution: '&copy; Google Maps' },
  darkVoyager: { name: 'Dark Voyager', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CartoDB' },
};

export function googleMapsNavUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
