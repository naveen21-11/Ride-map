import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import {
  Search, Layers, Fuel, Hospital, MapPin, Navigation,
  Trophy, Star, Cloud, Route, IndianRupee, Loader2,
} from 'lucide-react';
import {
  searchPlaces, reverseGeocode, getRoadDistance, getWeather,
  estimateFuelCost, fetchPetrolPumps, fetchHospitals, haversineKm,
  TILE_LAYERS, googleMapsNavUrl,
} from '../services/mapServices';
import { createPin, markVisited, getPins, createRide } from '../services/api';
import { useAuth } from '../context/AuthContext';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_MARKER_ICON = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const PUMP_ICON = DEFAULT_MARKER_ICON;
const HOSPITAL_ICON = DEFAULT_MARKER_ICON;
const VISITED_ICON = DEFAULT_MARKER_ICON;

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 12, { duration: 1.5 });
  }, [position, map]);
  return null;
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function TravelMap() {
  const [tileKey, setTileKey] = useState('darkVoyager');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [userPos, setUserPos] = useState([20.5937, 78.9629]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPumps, setShowPumps] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  const [pumps, setPumps] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [pins, setPins] = useState([]);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [creatingRide, setCreatingRide] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchRef = useRef(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => { }
    );
    loadPins();
  }, []);

  const loadPins = async () => {
    try {
      const { data } = await getPins();
      setPins(data.results || data);
    } catch { /* not logged in */ }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSuggestions([]); return; }
    const results = await searchPlaces(q);
    setSuggestions(results);
  };

  const selectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setFlyTarget([lat, lng]);
    setSearchQuery(place.display_name.split(',')[0]);
    setSuggestions([]);
    handleMapClick(lat, lng);
  };

  const handleMapClick = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const [geo, dist, weather] = await Promise.all([
        reverseGeocode(lat, lng),
        getRoadDistance(userPos[0], userPos[1], lat, lng),
        getWeather(lat, lng),
      ]);
      const fuelCost = estimateFuelCost(parseFloat(dist));
      setSelected({ lat, lng, ...geo, distance_km: dist, weather, fuel_cost: fuelCost });
    } catch {
      toast.error('Failed to fetch location data');
    } finally {
      setLoading(false);
    }
  }, [userPos]);

  const togglePumps = async () => {
    if (showPumps) { setShowPumps(false); return; }
    setOverlayLoading(true);
    const center = selected || { lat: userPos[0], lng: userPos[1] };
    const data = await fetchPetrolPumps(center.lat, center.lng);
    setPumps(data);
    setShowPumps(true);
    setOverlayLoading(false);
    toast.success(`Found ${data.length} petrol pumps nearby`);
  };

  const toggleHospitals = async () => {
    if (showHospitals) { setShowHospitals(false); return; }
    setOverlayLoading(true);
    const center = selected || { lat: userPos[0], lng: userPos[1] };
    const data = await fetchHospitals(center.lat, center.lng);
    setHospitals(data);
    setShowHospitals(true);
    setOverlayLoading(false);
    toast.success(`Found ${data.length} hospitals nearby`);
  };

  const savePin = async (pinType) => {
    if (!selected) return;
    try {
      await createPin({
        name: selected.name,
        pin_type: pinType,
        latitude: selected.lat,
        longitude: selected.lng,
        state: selected.state,
        country: selected.country,
        distance_km: parseFloat(selected.distance_km),
        weather: selected.weather,
        notes: '',
      });
      toast.success(
        pinType === 'BUCKET_LIST'
          ? 'Added to Bucket List!'
          : pinType === 'FAVORITE'
            ? 'Added to Favorites!'
            : 'Pin saved!'
      );
      loadPins();
    } catch {
      toast.error('Login required to save pins');
    }
  };

  const handleCreateRide = async () => {
    if (!user) {
      toast.error('Login required to create a ride');
      return;
    }
    if (!selected) {
      toast.error('Select a location first');
      return;
    }

    setCreatingRide(true);
    try {
      const rideData = {
        title: selected.name,
        description: selected.display_name || selected.name,
        start_date: new Date().toISOString().split('T')[0],
      };
      const { data } = await createRide(rideData);
      toast.success(`Ride created: ${data.title}`);
      navigate('/rallies');
    } catch (err) {
      toast.error('Failed to create ride');
    } finally {
      setCreatingRide(false);
    }
  };

  const handleMarkVisited = async (pinId) => {
    try {
      await markVisited(pinId);
      toast.success('🏆 Marked as Visited! Congratulations, rider!', { icon: '🏆', duration: 4000 });
      loadPins();
    } catch {
      toast.error('Failed to mark visited');
    }
  };

  const tile = TILE_LAYERS[tileKey];

  return (
    <div className="relative h-[calc(100vh-5rem)] lg:h-[calc(100vh-1.5rem)] rounded-xl overflow-hidden border border-white/10">
      {/* Top Controls */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap sm:flex-nowrap gap-2">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchRef}
            className="input-field pl-10 bg-slate-panel/90 backdrop-blur-glass min-h-[40px] text-xs sm:text-sm"
            placeholder="Search places in India..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 w-full glass-card max-h-60 overflow-y-auto shadow-2xl">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  className="w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-white/5 border-b border-white/5 last:border-0"
                  onClick={() => selectPlace(s)}
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <select
            className="input-field w-auto flex-1 sm:flex-none bg-slate-panel/90 backdrop-blur-glass text-xs sm:text-sm min-h-[40px]"
            value={tileKey}
            onChange={(e) => setTileKey(e.target.value)}
          >
            {Object.entries(TILE_LAYERS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>

          <button onClick={togglePumps} className={`btn-secondary flex items-center justify-center gap-1.5 text-xs sm:text-sm min-h-[40px] px-3 ${showPumps ? 'ring-2 ring-red-400' : ''}`}>
            <Fuel className="w-3.5 h-3.5" /> ⛽
          </button>
          <button onClick={toggleHospitals} className={`btn-secondary flex items-center justify-center gap-1.5 text-xs sm:text-sm min-h-[40px] px-3 ${showHospitals ? 'ring-2 ring-blue-400' : ''}`}>
            <Hospital className="w-3.5 h-3.5" /> 🏥
          </button>
        </div>
      </div>

      {overlayLoading && (
        <div className="absolute top-24 sm:top-16 left-1/2 -translate-x-1/2 z-[1000] glass-card px-4 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-primary" />
          <span className="text-xs sm:text-sm">Loading overlays...</span>
        </div>
      )}

      {/* Side / Bottom Place Details Panel */}
      {selected && (
        <div className="absolute bottom-16 lg:bottom-3 left-3 right-3 lg:right-auto lg:w-96 z-[1000] glass-card p-4 space-y-3 max-h-[45vh] lg:max-h-[50vh] overflow-y-auto shadow-2xl">
          {loading ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching location data...
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">{selected.name}</h3>
                  <p className="text-sm text-gray-400">{selected.state}, {selected.country}</p>
                </div>
                <MapPin className="w-5 h-5 text-emerald-primary shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Route className="w-3 h-3" /> Distance</div>
                  <p className="data-mono text-emerald-primary">{selected.distance_km} KM</p>
                </div>
                <div className="bg-dark/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><IndianRupee className="w-3 h-3" /> Fuel Est.</div>
                  <p className="data-mono text-amber-accent">₹{selected.fuel_cost}</p>
                </div>
              </div>

              <div className="bg-dark/50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Cloud className="w-3 h-3" /> Weather</div>
                <p className="text-sm text-gray-300">{selected.weather}</p>
              </div>

              <p className="data-mono text-xs text-gray-600">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => savePin('BUCKET_LIST')} className="btn-accent text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Bucket List
                </button>
                <button onClick={() => savePin('FAVORITE')} className="btn-primary text-sm flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> Favorite
                </button>
                <button onClick={() => savePin('VISITED')} className="btn-secondary text-sm flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Mark Visited 🏆
                </button>
                <button
                  onClick={handleCreateRide}
                  disabled={creatingRide}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Route className="w-3.5 h-3.5" /> {creatingRide ? 'Creating...' : 'Create Ride'}
                </button>
                <a href={googleMapsNavUrl(selected.lat, selected.lng)} target="_blank" rel="noreferrer" className="btn-secondary text-sm flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </a>
              </div>
            </>
          )}
        </div>
      )}

      <MapContainer center={userPos} zoom={6} className="h-full w-full" zoomControl={false}>
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <FlyTo position={flyTarget} />
        <MapClickHandler onClick={handleMapClick} />

        <Marker position={userPos} icon={DEFAULT_MARKER_ICON}>
          <Popup>You are here</Popup>
        </Marker>

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={pin.pin_type === 'VISITED' ? VISITED_ICON : DEFAULT_MARKER_ICON}
          >
            <Popup>
              <div className="space-y-2 min-w-[180px]">
                <strong>{pin.name}</strong>
                <p className="text-xs text-gray-400">{pin.pin_type.replace('_', ' ')}</p>
                {pin.pin_type === 'BUCKET_LIST' && (
                  <button
                    onClick={() => handleMarkVisited(pin.id)}
                    className="btn-primary text-xs w-full flex items-center justify-center gap-1"
                  >
                    <Trophy className="w-3 h-3" /> Mark as Visited 🏆
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {showPumps && pumps.map((p) => (
          <Marker key={`p-${p.id}`} position={[p.lat, p.lng]} icon={DEFAULT_MARKER_ICON}>
            <Popup>
              <div className="space-y-1">
                <strong>⛽ {p.name}</strong>
                <p className="text-xs">Brand: {p.brand}</p>
                <p className="data-mono text-xs">{haversineKm(userPos[0], userPos[1], p.lat, p.lng).toFixed(1)} KM away</p>
                <a href={googleMapsNavUrl(p.lat, p.lng)} target="_blank" rel="noreferrer" className="text-emerald-primary text-xs underline">Navigate →</a>
              </div>
            </Popup>
          </Marker>
        ))}

        {showHospitals && hospitals.map((h) => (
          <Marker key={`h-${h.id}`} position={[h.lat, h.lng]} icon={DEFAULT_MARKER_ICON}>
            <Popup>
              <div className="space-y-1">
                <strong>🏥 {h.name}</strong>
                <p className="text-xs">Emergency: {h.phone}</p>
                <p className="data-mono text-xs">{haversineKm(userPos[0], userPos[1], h.lat, h.lng).toFixed(1)} KM away</p>
                <a href={googleMapsNavUrl(h.lat, h.lng)} target="_blank" rel="noreferrer" className="text-blue-400 text-xs underline">Navigate →</a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
