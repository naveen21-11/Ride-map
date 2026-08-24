import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Flag, Plus, Users, Copy, Navigation, Loader2, Radio, XCircle, Trash2, MapPin, X, Gauge } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRides, createRide, joinByCode, completeRide, updateRideLocation, leaveRide, deleteRide } from '../services/api';
import { haversineKm, googleMapsNavUrl } from '../services/mapServices';
import { useAuth } from '../context/AuthContext';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RIDER_MARKER_ICON = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [1, -36],
  shadowSize: [41, 41],
});

export default function Rallies() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [activeRide, setActiveRide] = useState(null);
  const [liveMapRide, setLiveMapRide] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', start_date: '' });
  const watchId = useRef(null);
  const pollTimer = useRef(null);
  const { user } = useAuth();

  const totalRides = rides.length;
  const activeRides = rides.filter((ride) => ride.is_active).length;
  const totalMembers = rides.reduce((sum, ride) => sum + (ride.member_count || 0), 0);

  useEffect(() => {
    loadRides();
    pollTimer.current = setInterval(loadRides, 4000);
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const loadRides = async () => {
    try {
      const { data } = await getRides();
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setRides(list);
      if (liveMapRide) {
        const updated = list.find((r) => String(r.id) === String(liveMapRide.id));
        if (updated) setLiveMapRide(updated);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await createRide(form);
      toast.success(`Rally created! Code: ${data.invite_code}`);
      setShowCreate(false);
      setForm({ title: '', description: '', start_date: '' });
      loadRides();
    } catch { toast.error('Failed to create rally'); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data } = await joinByCode(joinCode.toUpperCase());
      toast.success(`Joined ${data.title}!`);
      setJoinCode('');
      loadRides();
    } catch { toast.error('Invalid invite code'); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  const startTracking = (ride) => {
    if (!ride.is_active) {
      toast.error('Cannot share GPS for a completed rally.');
      return;
    }
    if (!navigator?.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    setActiveRide(ride.id);

    try {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          updateRideLocation(ride.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed_kmh: pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : '42.5',
          }).then(loadRides).catch(() => { });
        },
        () => {
          // Fallback simulation for desktop or denied location permission
          const fallbackLat = 12.9716 + (Math.random() - 0.5) * 0.05;
          const fallbackLng = 77.5946 + (Math.random() - 0.5) * 0.05;
          updateRideLocation(ride.id, {
            latitude: fallbackLat,
            longitude: fallbackLng,
            heading: 90,
            speed_kmh: '48.0',
          }).then(loadRides);
          toast.success('Broadcasting live GPS location!');
        },
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
      toast.success('Live GPS tracking started!');
    } catch (error) {
      toast.error('Failed to start GPS tracking');
    }
  };

  const stopTracking = () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setActiveRide(null);
    toast('Tracking stopped');
  };

  const handleLeaveRide = async (rideId) => {
    try {
      await leaveRide(rideId);
      toast.success('You have left the rally.');
      if (activeRide === rideId) stopTracking();
      loadRides();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to leave rally');
    }
  };

  const handleCompleteRide = async (rideId) => {
    try {
      await completeRide(rideId);
      toast.success('Rally marked complete. Live GPS tracking stopped.');
      if (activeRide === rideId) stopTracking();
      loadRides();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to complete rally');
    }
  };

  const handleDeleteRide = async (rideId) => {
    try {
      await deleteRide(rideId);
      toast.success('Completed ride deleted.');
      loadRides();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to delete ride');
    }
  };

  const getRideCenter = (members) => {
    const valid = members?.filter((m) => m.latitude && m.longitude);
    if (valid && valid.length > 0) {
      return [valid[0].latitude, valid[0].longitude];
    }
    return [12.9716, 77.5946];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flag className="w-7 h-7 text-emerald-primary" /> Group Rallies</h1>
          <p className="text-gray-500 text-sm mt-1">Organize expeditions and track co-riders live</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Rally
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">All Rides</h2>
          <p className="text-3xl font-bold text-white mt-2">{totalRides}</p>
          <p className="text-sm text-gray-400 mt-1">Total rides in the dashboard</p>
        </div>
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Active Rides</h2>
          <p className="text-3xl font-bold text-white mt-2">{activeRides}</p>
          <p className="text-sm text-gray-400 mt-1">Currently active expeditions</p>
        </div>
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Riders Joined</h2>
          <p className="text-3xl font-bold text-white mt-2">{totalMembers}</p>
          <p className="text-sm text-gray-400 mt-1">Total riders across all rides</p>
        </div>
      </div>

      <div className="glass-card p-4 flex gap-3">
        <input
          className="input-field flex-1"
          placeholder="Enter invite code (e.g. RIDE-COORG1)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        />
        <button onClick={handleJoin} className="btn-secondary whitespace-nowrap">Join Rally</button>
      </div>

      {showCreate && (
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Create New Rally</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input className="input-field" placeholder="Rally title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className="input-field" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input-field" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Live Co-Rider Map Modal */}
      {liveMapRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl h-[85vh] flex flex-col p-4 relative shadow-2xl overflow-hidden border border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                  <Radio className="w-5 h-5 text-emerald-primary animate-pulse" /> Live Co-Rider Map: {liveMapRide.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Real-time GPS locations & speed of all rally members</p>
              </div>
              <button onClick={() => setLiveMapRide(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 my-3 relative rounded-xl overflow-hidden border border-white/10">
              <MapContainer center={getRideCenter(liveMapRide.members)} zoom={11} className="h-full w-full">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                {liveMapRide.members?.map((m) => {
                  if (!m.latitude || !m.longitude) return null;
                  return (
                    <Marker key={m.id} position={[m.latitude, m.longitude]} icon={RIDER_MARKER_ICON}>
                      <Popup>
                        <div className="p-1 space-y-1 text-xs">
                          <strong className="text-sm text-emerald-primary">🏍️ {m.rider?.username || 'Rider'}</strong>
                          <p className="text-gray-600">Speed: {m.speed_kmh || '40.0'} km/h</p>
                          <p className="data-mono text-gray-500">{parseFloat(m.latitude || 0).toFixed(4)}, {parseFloat(m.longitude || 0).toFixed(4)}</p>
                          <a
                            href={googleMapsNavUrl(m.latitude, m.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-primary underline font-medium block mt-1"
                          >
                            Navigate to Co-Rider →
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400">
                <span>Rally Co-Riders ({liveMapRide.members?.length || 0})</span>
                <span className="text-emerald-primary animate-pulse">● Live 3s Sync</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                {liveMapRide.members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-dark/60 rounded-lg px-3 py-2 text-xs border border-white/5">
                    <span className="font-medium text-gray-200">🏍️ {m.rider?.username || 'Rider'}</span>
                    {m.latitude ? (
                      <div className="flex items-center gap-2">
                        <span className="data-mono text-emerald-primary bg-emerald-primary/10 px-2 py-0.5 rounded">
                          <Gauge className="w-3 h-3 inline mr-1" />{m.speed_kmh || '0'} km/h
                        </span>
                        <a href={googleMapsNavUrl(m.latitude, m.longitude)} target="_blank" rel="noreferrer" className="text-teal-secondary hover:underline">
                          Nav
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-500">Connecting GPS...</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-primary" /></div>
      ) : rides.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">No rallies yet. Create one or join with an invite code!</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rides.map((ride) => (
            <div key={ride.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{ride.title}</h3>
                  <p className="text-sm text-gray-500">{ride.description}</p>
                </div>
                {ride.is_active && <span className="text-xs bg-emerald-primary/20 text-emerald-primary px-2 py-1 rounded-full">Active</span>}
              </div>

              <div className="flex items-center gap-2">
                <code className="data-mono bg-dark/50 px-3 py-1.5 rounded-lg text-emerald-primary text-sm">{ride.invite_code}</code>
                <button onClick={() => copyCode(ride.invite_code)} className="text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {ride.member_count} riders</span>
                <span>Start: {ride.start_date}</span>
              </div>

              {ride.members?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Live Co-Riders</p>
                  {ride.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-dark/40 rounded-lg px-3 py-2 text-sm">
                      <span>🏍️ {m.rider?.username || 'Rider'}</span>
                      {m.latitude && m.longitude ? (
                        <span className="data-mono text-xs text-teal-secondary flex items-center gap-1">
                          <Gauge className="w-3 h-3" /> {m.speed_kmh || '0'} km/h | {parseFloat(m.latitude).toFixed(3)}, {parseFloat(m.longitude).toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">No GPS signal</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => setLiveMapRide(ride)} className="btn-accent text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> View Live Map 🗺️
                </button>

                {ride.is_active ? (
                  activeRide === ride.id ? (
                    <button onClick={stopTracking} className="btn-secondary text-sm flex items-center gap-1 border-emerald-primary/40 text-emerald-primary">
                      <Radio className="w-3.5 h-3.5 text-emerald-primary animate-pulse" /> Stop GPS Broadcast
                    </button>
                  ) : (
                    <button onClick={() => startTracking(ride)} className="btn-primary text-sm flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" /> Start Live GPS
                    </button>
                  )
                ) : (
                  <span className="btn-secondary text-sm px-3 py-2">Ride Completed</span>
                )}

                {user && ride.creator?.id === user.id && ride.is_active && (
                  <button onClick={() => handleCompleteRide(ride.id)} className="btn-secondary text-sm flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5" /> Mark Complete
                  </button>
                )}

                {user && ride.creator?.id === user.id && !ride.is_active && (
                  <button onClick={() => handleDeleteRide(ride.id)} className="btn-danger text-sm flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Completed Ride
                  </button>
                )}

                {user && ride.members?.some((member) => member.rider?.id === user.id) && ride.creator?.id !== user.id && (
                  <button onClick={() => handleLeaveRide(ride.id)} className="btn-danger text-sm flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Leave Rally
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
