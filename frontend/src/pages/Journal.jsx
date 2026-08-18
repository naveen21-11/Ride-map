import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Trophy, MapPin, Star, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getPins, markVisited, deletePin } from '../services/api';
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
  const { user } = useAuth();

  useEffect(() => { loadPins(); }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const { data } = await getPins();
      setPins(data.results || data);
    } catch { toast.error('Failed to load journal'); }
    finally { setLoading(false); }
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
        <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              tab === key ? 'bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/30' : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
              {key === 'ALL' ? pins.length : pins.filter((p) => p.pin_type === key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No places yet. Click on the map to start your journal!</p>
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
                <span className={`text-xs px-2 py-1 rounded-full ${
                  pin.pin_type === 'VISITED' ? 'bg-emerald-primary/20 text-emerald-primary' :
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
