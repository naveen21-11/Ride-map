import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { getMotorcycles, createMotorcycle, updateMotorcycle, deleteMotorcycle } from '../services/api';

const PRESETS = [
  { make: 'Royal Enfield', model: 'Himalayan 450', engine_cc: 452, fuel_efficiency_kmpl: 30 },
  { make: 'BMW', model: 'R1250GS', engine_cc: 1254, fuel_efficiency_kmpl: 18 },
  { make: 'KTM', model: '390 Adventure', engine_cc: 373, fuel_efficiency_kmpl: 28 },
];

export default function Garage() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    make: '', model: '', year: 2024, engine_cc: 400, fuel_efficiency_kmpl: 25, color: '', is_primary: false,
  });

  useEffect(() => { loadBikes(); }, []);

  const loadBikes = async () => {
    try {
      const { data } = await getMotorcycles();
      setBikes(data.results || data);
    } catch { toast.error('Failed to load garage'); }
    finally { setLoading(false); }
  };

  const applyPreset = (preset) => {
    setForm({ ...form, ...preset });
    setShowAdd(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createMotorcycle(form);
      toast.success('Bike added to garage!');
      setShowAdd(false);
      setForm({ make: '', model: '', year: 2024, engine_cc: 400, fuel_efficiency_kmpl: 25, color: '', is_primary: false });
      loadBikes();
    } catch { toast.error('Failed to add bike'); }
  };

  const setPrimary = async (id) => {
    await updateMotorcycle(id, { is_primary: true });
    toast.success('Primary bike updated');
    loadBikes();
  };

  const handleDelete = async (id) => {
    await deleteMotorcycle(id);
    toast.success('Removed from garage');
    loadBikes();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-7 h-7 text-emerald-primary" /> Motorcycle Garage</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your fleet and fuel efficiency profiles</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Bike
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PRESETS.map((p) => (
          <button key={p.model} onClick={() => applyPreset(p)} className="glass-card p-4 text-left hover:border-emerald-primary/30 transition-all">
            <p className="font-bold">{p.make}</p>
            <p className="text-sm text-gray-400">{p.model}</p>
            <p className="data-mono text-xs text-teal-secondary mt-2">{p.engine_cc}cc • {p.fuel_efficiency_kmpl} km/l</p>
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Add Motorcycle</h3>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <input className="input-field" placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
            <input className="input-field" placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
            <input className="input-field" type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} />
            <input className="input-field" type="number" placeholder="Engine CC" value={form.engine_cc} onChange={(e) => setForm({ ...form, engine_cc: +e.target.value })} />
            <input className="input-field" type="number" step="0.1" placeholder="Fuel efficiency (km/l)" value={form.fuel_efficiency_kmpl} onChange={(e) => setForm({ ...form, fuel_efficiency_kmpl: +e.target.value })} />
            <input className="input-field" placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-gray-400 md:col-span-2">
              <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />
              Set as primary bike
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-primary" /></div>
      ) : bikes.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">Your garage is empty. Add your first bike!</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bikes.map((bike) => (
            <div key={bike.id} className={`glass-card p-5 space-y-3 ${bike.is_primary ? 'ring-1 ring-emerald-primary/40' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{bike.make} {bike.model}</h3>
                  <p className="text-sm text-gray-500">{bike.year} • {bike.color || '—'}</p>
                </div>
                {bike.is_primary && <Star className="w-5 h-5 text-amber-accent fill-amber-accent" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark/40 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Engine</p>
                  <p className="data-mono text-sm">{bike.engine_cc} cc</p>
                </div>
                <div className="bg-dark/40 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Efficiency</p>
                  <p className="data-mono text-sm">{bike.fuel_efficiency_kmpl} km/l</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!bike.is_primary && (
                  <button onClick={() => setPrimary(bike.id)} className="btn-secondary text-sm">Set Primary</button>
                )}
                <button onClick={() => handleDelete(bike.id)} className="text-red-400 hover:text-red-300 ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
