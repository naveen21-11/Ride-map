import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Trophy, MapPin, Star, Download, Loader2, Plus, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getPins, createPin, markVisited, deletePin } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'ALL', label: 'All', icon: BookOpen },
  { key: 'VISITED', label: 'Visited', icon: Trophy },
  { key: 'BUCKET_LIST', label: 'Bucket List', icon: MapPin },
  { key: 'FAVORITE', label: 'Favorites', icon: Star },
];

export default function Journal() {
  const [pins, setPins] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pin_type: 'BUCKET_LIST',
    state: 'Karnataka',
    country: 'India',
    distance_km: '',
    notes: '',
  });
  const { user } = useAuth();

  useEffect(() => { loadPins(); }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const { data } = await getPins();
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setPins(list);
    } catch { toast.error('Failed to load journal'); }
    finally { setLoading(false); }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter a location name');
    try {
      await createPin({
        ...form,
        latitude: 12.9716 + (Math.random() - 0.5) * 2,
        longitude: 77.5946 + (Math.random() - 0.5) * 2,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : 100,
        weather: 'Pleasant Weather',
      });
      toast.success('Journal entry added!');
      setShowModal(false);
      setForm({ name: '', pin_type: 'BUCKET_LIST', state: 'Karnataka', country: 'India', distance_km: '', notes: '' });
      loadPins();
    } catch {
      toast.error('Failed to add entry');
    }
  };

  const filtered = tab === 'ALL' ? pins : pins.filter((p) => p.pin_type === tab);

  const handleMarkVisited = async (id) => {
    try {
      await markVisited(id);
      toast.success('🏆 Marked as Visited! What an adventure!', { icon: '🏆', duration: 4000 });
      loadPins();
    } catch { toast.error('Failed'); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('RideMap — Travel Journal', 20, 20);
    doc.setFontSize(12);
    doc.text(`Rider: ${user?.username || 'Unknown'}`, 20, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 40);
    doc.text(`Total Places: ${pins.length}`, 20, 48);

    let y = 60;
    pins.forEach((pin, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text(`${i + 1}. ${pin.name}`, 20, y);
      doc.setFontSize(10);
      doc.text(`   ${pin.pin_type.replace('_', ' ')} | ${pin.state}, ${pin.country}`, 20, y + 7);
      if (pin.distance_km) doc.text(`   Distance: ${pin.distance_km} KM`, 20, y + 14);
      if (pin.weather) doc.text(`   Weather: ${pin.weather}`, 20, y + 21);
      if (pin.notes) doc.text(`   Notes: ${pin.notes}`, 20, y + 28);
      y += 38;
    });

    doc.save(`RideMap_Journal_${user?.username || 'rider'}.pdf`);
    toast.success('Journal exported to PDF!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-7 h-7 text-emerald-primary" /> Ride Journal</h1>
          <p className="text-gray-500 text-sm mt-1">Your motorcycle travel memories across India</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
          <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${tab === key ? 'bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/30' : 'text-gray-400 hover:bg-white/5'
              }`}
          >
            <Icon className="w-4 h-4" /> {label}
            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
              {key === 'ALL' ? pins.length : pins.filter((p) => p.pin_type === key).length}
            </span>
          </button>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-primary" /> Add Journal Entry</h2>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Destination / Spot Name</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Coorg Abbey Falls"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                  <select
                    className="input-field"
                    value={form.pin_type}
                    onChange={(e) => setForm({ ...form, pin_type: e.target.value })}
                  >
                    <option value="BUCKET_LIST">Bucket List</option>
                    <option value="VISITED">Visited</option>
                    <option value="FAVORITE">Favorite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="250"
                    value={form.distance_km}
                    onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">State / Region</label>
                <input
                  className="input-field"
                  placeholder="Karnataka"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Ride Notes & Experience</label>
                <textarea
                  rows="3"
                  className="input-field"
                  placeholder="Notes on routes, road conditions, fuel stops..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No places found in this category. Add your first entry above or click on the map!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((pin) => (
            <div key={pin.id} className="glass-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{pin.name}</h3>
                  <p className="text-sm text-gray-500">{pin.state}, {pin.country}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${pin.pin_type === 'VISITED' ? 'bg-emerald-primary/20 text-emerald-primary' :
                  pin.pin_type === 'BUCKET_LIST' ? 'bg-amber-accent/20 text-amber-accent' :
                    'bg-teal-secondary/20 text-teal-secondary'
                  }`}>
                  {pin.pin_type.replace('_', ' ')}
                </span>
              </div>

              {pin.distance_km && <p className="data-mono text-sm text-gray-400">{pin.distance_km} KM from home</p>}
              {pin.weather && <p className="text-sm text-gray-400">{pin.weather}</p>}
              {pin.notes && <p className="text-sm text-gray-300 italic">{pin.notes}</p>}
              <p className="data-mono text-xs text-gray-600">{pin.latitude?.toFixed(4)}, {pin.longitude?.toFixed(4)}</p>

              <div className="flex gap-2 pt-2">
                {pin.pin_type === 'BUCKET_LIST' && (
                  <button onClick={() => handleMarkVisited(pin.id)} className="btn-primary text-sm flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Mark as Visited 🏆
                  </button>
                )}
                <button onClick={() => { deletePin(pin.id).then(loadPins); toast.success('Removed'); }} className="text-xs text-red-400 hover:text-red-300 ml-auto">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
