import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Receipt, Plus, Trash2, Download, Loader2, Fuel, Utensils, Bed, Wrench } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getExpenses, createExpense, deleteExpense, getExpenseAnalytics, getMotorcycles } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { key: 'FUEL', label: 'Fuel', icon: Fuel, color: 'text-red-400' },
  { key: 'FOOD', label: 'Food', icon: Utensils, color: 'text-orange-400' },
  { key: 'STAY', label: 'Stay', icon: Bed, color: 'text-blue-400' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, color: 'text-purple-400' },
  { key: 'OTHER', label: 'Other', icon: Receipt, color: 'text-gray-400' },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, by_category: {}, count: 0 });
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    category: 'FUEL', amount: '', description: '', location: '', date: new Date().toISOString().split('T')[0], motorcycle: '',
  });
  const { user } = useAuth();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [expRes, anaRes, bikeRes] = await Promise.all([
        getExpenses(), getExpenseAnalytics(), getMotorcycles(),
      ]);
      setExpenses(expRes.data.results || expRes.data);
      setAnalytics(anaRes.data);
      setMotorcycles(bikeRes.data.results || bikeRes.data);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount), motorcycle: form.motorcycle || null });
      toast.success('Expense recorded!');
      setShowAdd(false);
      setForm({ category: 'FUEL', amount: '', description: '', location: '', date: new Date().toISOString().split('T')[0], motorcycle: '' });
      loadAll();
    } catch { toast.error('Failed to save expense'); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('RideMap — Expense Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Rider: ${user?.username}`, 20, 32);
    doc.text(`Total: ₹${analytics.total?.toFixed(0)}`, 20, 40);
    doc.text(`Entries: ${analytics.count}`, 20, 48);

    let y = 62;
    Object.entries(analytics.by_category || {}).forEach(([cat, amt]) => {
      doc.text(`${cat}: ₹${amt.toFixed(0)}`, 20, y);
      y += 8;
    });

    y += 10;
    expenses.forEach((exp) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${exp.date} | ${exp.category} | ₹${exp.amount} | ${exp.description || exp.location}`, 20, y);
      y += 8;
    });

    doc.save(`RideMap_Expenses_${user?.username}.pdf`);
    toast.success('Expense report exported!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-7 h-7 text-emerald-primary" /> Expense Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Track fuel, food, stay, and maintenance costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4" /> Export PDF</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Expense</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-4 md:col-span-1">
          <p className="text-xs text-gray-500 uppercase">Total Spent</p>
          <p className="text-3xl font-bold text-emerald-primary mt-1">₹{analytics.total?.toFixed(0) || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{analytics.count} entries</p>
        </div>
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className="data-mono text-lg font-bold">₹{(analytics.by_category?.[key] || 0).toFixed(0)}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Record Expense</h3>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
            <input className="input-field" type="number" step="0.01" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <input className="input-field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input-field" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select className="input-field" value={form.motorcycle} onChange={(e) => setForm({ ...form, motorcycle: e.target.value })}>
              <option value="">No bike linked</option>
              {motorcycles.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model}</option>)}
            </select>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-primary" /></div>
      ) : expenses.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">No expenses recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const cat = CATEGORIES.find((c) => c.key === exp.category);
            const Icon = cat?.icon || Receipt;
            return (
              <div key={exp.id} className="glass-card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-dark/50 flex items-center justify-center ${cat?.color || ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{exp.description || exp.category}</p>
                  <p className="text-xs text-gray-500">{exp.location} • {exp.date} {exp.motorcycle_name && `• ${exp.motorcycle_name}`}</p>
                </div>
                <p className="data-mono font-bold text-lg">₹{exp.amount}</p>
                <button onClick={() => { deleteExpense(exp.id).then(loadAll); toast.success('Deleted'); }} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
