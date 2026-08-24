import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Receipt, Plus, Trash2, Download, Loader2, Fuel, Utensils, Bed, Wrench,
  Target, Calculator, PieChart, Users, Search, AlertTriangle, CheckCircle2,
  TrendingUp, Edit3, Save, X, Info, Zap, Share2, Copy, FileSpreadsheet, Sparkles, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  getExpenses, createExpense, deleteExpense, getExpenseAnalytics, getMotorcycles, setMonthlyBudget
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { key: 'FUEL', label: 'Fuel', icon: Fuel, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { key: 'FOOD', label: 'Food', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { key: 'STAY', label: 'Stay', icon: Bed, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { key: 'OTHER', label: 'Other', icon: Receipt, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
];

const QUICK_PRESETS = [
  { label: 'Full Tank Fuel', category: 'FUEL', amount: 500, icon: '⛽', color: 'border-red-500/30 hover:bg-red-500/10' },
  { label: 'Chai & Snacks', category: 'FOOD', amount: 100, icon: '☕', color: 'border-amber-500/30 hover:bg-amber-500/10' },
  { label: 'Rider Lunch', category: 'FOOD', amount: 300, icon: '🍔', color: 'border-orange-500/30 hover:bg-orange-500/10' },
  { label: 'Hotel Night Stay', category: 'STAY', amount: 1500, icon: '🏨', color: 'border-blue-500/30 hover:bg-blue-500/10' },
  { label: 'Chain Clean & Lube', category: 'MAINTENANCE', amount: 250, icon: '🛠️', color: 'border-purple-500/30 hover:bg-purple-500/10' },
];

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calculator' | 'splitter' | 'history'
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState({
    total: 0, by_category: {}, count: 0, monthly_budget: 0, remaining_budget: 0, percentage_used: 0
  });
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Budget Modal / Input
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Add Expense Form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    category: 'FUEL', amount: '', description: '', location: '', date: new Date().toISOString().split('T')[0], motorcycle: '',
  });

  // Smart Text Quick Parser state
  const [smartInput, setSmartInput] = useState('');
  const [smartSubmitting, setSmartSubmitting] = useState(false);

  // Trip Fuel Cost Calculator state
  const [calcBike, setCalcBike] = useState('');
  const [calcKmpl, setCalcKmpl] = useState(35);
  const [calcDistance, setCalcDistance] = useState(300);
  const [calcFuelPrice, setCalcFuelPrice] = useState(102);
  const [calcDays, setCalcDays] = useState(2);
  const [calcStayPerDay, setCalcStayPerDay] = useState(1200);
  const [calcFoodPerDay, setCalcFoodPerDay] = useState(600);

  // Group Splitter state
  const [splitTotal, setSplitTotal] = useState(12000);
  const [splitRidersCount, setSplitRidersCount] = useState(4);
  const [copiedSplit, setCopiedSplit] = useState(false);

  const { user } = useAuth();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [expRes, anaRes, bikeRes] = await Promise.all([
        getExpenses(), getExpenseAnalytics(), getMotorcycles(),
      ]);
      const expData = expRes.data.results || expRes.data;
      setExpenses(expData);
      setAnalytics(anaRes.data);
      setBudgetInput(anaRes.data.monthly_budget || '');

      const bikes = bikeRes.data.results || bikeRes.data;
      setMotorcycles(bikes);
      if (bikes.length > 0 && !calcBike) {
        setCalcBike(bikes[0].id);
        setCalcKmpl(bikes[0].fuel_efficiency_kmpl || 35);
      }
    } catch {
      toast.error('Failed to load budget and expenses');
    } finally {
      setLoading(false);
    }
  };

  // 1-Tap Quick Preset logger
  const handleQuickPreset = async (preset) => {
    try {
      await createExpense({
        category: preset.category,
        amount: preset.amount,
        description: preset.label,
        date: new Date().toISOString().split('T')[0],
      });
      toast.success(`⚡ Quick Logged: ${preset.icon} ${preset.label} (₹${preset.amount})`);
      loadAll();
    } catch {
      toast.error('Failed to log quick expense');
    }
  };

  // Smart Text Parser helper
  const parseSmartText = (text) => {
    if (!text.trim()) return null;
    const lower = text.toLowerCase();

    // Extract numerical amount
    const numMatch = lower.match(/(\d+(\.\d+)?)/);
    const amount = numMatch ? parseFloat(numMatch[0]) : null;

    // Detect category
    let category = 'OTHER';
    if (/fuel|petrol|gas|diesel|tank/.test(lower)) category = 'FUEL';
    else if (/tea|chai|snack|food|lunch|dinner|meal|breakfast|coffee|hotel food/.test(lower)) category = 'FOOD';
    else if (/stay|hotel|room|resort|lodge|camp/.test(lower)) category = 'STAY';
    else if (/lube|clean|wash|service|mechanic|oil|tyre|tire|part|repair/.test(lower)) category = 'MAINTENANCE';

    // Extract description & location by removing the amount
    let remaining = text.replace(/(\d+(\.\d+)?)/g, '').trim();

    return {
      amount,
      category,
      description: remaining || `${category} Expense`,
      location: lower.includes('at ') ? text.split('at ')[1]?.trim() : '',
    };
  };

  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseSmartText(smartInput);
    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      toast.error('Please include an amount in your quick note (e.g. "500 fuel NH44")');
      return;
    }
    setSmartSubmitting(true);
    try {
      await createExpense({
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description,
        location: parsed.location || '',
        date: new Date().toISOString().split('T')[0],
      });
      toast.success(`Smart Added ₹${parsed.amount} under ${parsed.category}!`);
      setSmartInput('');
      loadAll();
    } catch {
      toast.error('Failed to parse and save expense');
    } finally {
      setSmartSubmitting(false);
    }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    const bVal = parseFloat(budgetInput);
    if (isNaN(bVal) || bVal < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    try {
      await setMonthlyBudget(bVal);
      toast.success(`Monthly budget set to ₹${bVal.toLocaleString('en-IN')}`);
      setShowBudgetModal(false);
      loadAll();
    } catch {
      toast.error('Failed to update budget');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount), motorcycle: form.motorcycle || null });
      toast.success('Expense recorded successfully!');
      setShowAdd(false);
      setForm({ category: 'FUEL', amount: '', description: '', location: '', date: new Date().toISOString().split('T')[0], motorcycle: '' });
      loadAll();
    } catch {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
      toast.success('Expense deleted');
      loadAll();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const handleBikeChangeForCalc = (bikeId) => {
    setCalcBike(bikeId);
    const bike = motorcycles.find((b) => String(b.id) === String(bikeId));
    if (bike && bike.fuel_efficiency_kmpl) {
      setCalcKmpl(bike.fuel_efficiency_kmpl);
    }
  };

  // Export CSV helper
  const exportCSV = () => {
    if (!expenses || expenses.length === 0) {
      toast.error('No expenses to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Category', 'Amount (INR)', 'Description', 'Location', 'Motorcycle'];
    const rows = expenses.map(e => [
      e.id,
      e.date,
      e.category,
      e.amount,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.location || '').replace(/"/g, '""')}"`,
      `"${(e.motorcycle_name || 'N/A').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RideMap_Expenses_${user?.username || 'Rider'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported!');
  };

  // Export PDF helper
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('RideMap — Budget & Expense Report', 20, 20);

    doc.setFontSize(11);
    doc.text(`Rider: ${user?.username || 'User'}`, 20, 30);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 36);
    doc.text(`Monthly Budget Limit: ₹${(analytics.monthly_budget || 0).toLocaleString('en-IN')}`, 20, 42);
    doc.text(`Total Spent: ₹${(analytics.total || 0).toLocaleString('en-IN')}`, 20, 48);
    doc.text(`Remaining Balance: ₹${(analytics.remaining_budget || 0).toLocaleString('en-IN')}`, 20, 54);

    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    doc.setFontSize(14);
    doc.text('Category Summary', 20, 70);
    doc.setFontSize(11);
    let y = 78;
    CATEGORIES.forEach(({ key, label }) => {
      const amt = analytics.by_category?.[key] || 0;
      doc.text(`${label}: ₹${amt.toFixed(2)}`, 25, y);
      y += 6;
    });

    y += 6;
    doc.setFontSize(14);
    doc.text('Detailed Expense Entries', 20, y);
    doc.setFontSize(10);
    y += 8;

    expenses.forEach((exp) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${exp.date} | [${exp.category}] ₹${exp.amount} — ${exp.description || 'No description'} (${exp.location || 'N/A'})`, 20, y);
      y += 6;
    });

    doc.save(`RideMap_Budget_Report_${user?.username || 'Rider'}.pdf`);
    toast.success('PDF report exported!');
  };

  // Calculations for Trip Fuel & Cost Estimator
  const calculatedFuelLiters = calcKmpl > 0 ? (calcDistance / calcKmpl).toFixed(1) : 0;
  const calculatedFuelCost = Math.round(calculatedFuelLiters * calcFuelPrice);
  const calculatedStayCost = Math.round(calcDays * calcStayPerDay);
  const calculatedFoodCost = Math.round(calcDays * calcFoodPerDay);
  const totalEstimatedTripCost = calculatedFuelCost + calculatedStayCost + calculatedFoodCost;

  // Add estimated trip as an expense helper
  const handleAddEstimatedAsExpense = () => {
    setForm({
      category: 'FUEL',
      amount: calculatedFuelCost.toString(),
      description: `Estimated Fuel for ${calcDistance}km Trip`,
      location: 'Planned Route',
      date: new Date().toISOString().split('T')[0],
      motorcycle: calcBike || '',
    });
    setActiveTab('overview');
    setShowAdd(true);
    toast.success('Prefilled trip fuel estimate into new expense!');
  };

  // Splitter Calculations & WhatsApp Copy
  const splitPerPerson = splitRidersCount > 0 ? (splitTotal / splitRidersCount).toFixed(0) : 0;

  const handleCopyRallySplit = () => {
    const summaryText = `🏍️ *RideMap Rally Cost Split*
----------------------------------------
Total Expense: ₹${splitTotal.toLocaleString('en-IN')}
Participating Riders: ${splitRidersCount}
Equal Share Per Rider: ₹${parseInt(splitPerPerson).toLocaleString('en-IN')}
----------------------------------------
Calculated with RideMap Easy Expenses 🚀`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSplit(true);
    toast.success('Copied rally split summary for WhatsApp / messaging!');
    setTimeout(() => setCopiedSplit(false), 3000);
  };

  // Filtered Expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
    const matchesSearch =
      (exp.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getBudgetColor = (pct) => {
    if (pct >= 100) return { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (pct >= 80) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  const budgetStyle = getBudgetColor(analytics.percentage_used || 0);
  const parsedPreview = parseSmartText(smartInput);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Receipt className="w-7 h-7 text-emerald-primary animate-pulse" />
            Easy Expense Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            1-tap presets, smart text notes, monthly budget limits & group rally splitters
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowBudgetModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-emerald-primary" /> Budget Limit
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4 text-blue-400" /> Export PDF
          </button>
          <button onClick={() => { setShowAdd(true); setActiveTab('history'); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        </div>
      </div>

      {/* 1-Tap Quick Presets Bar */}
      <div className="glass-card p-4 space-y-2 border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" /> 1-Tap Quick Logger (Instant Add)
          </span>
          <span className="text-[10px] text-gray-500">Tap any button to log instantly</span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {QUICK_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPreset(preset)}
              className={`px-3 py-2 rounded-xl border bg-dark/50 text-xs font-medium text-white flex items-center gap-2 shrink-0 transition-all hover:scale-105 active:scale-95 ${preset.color}`}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
              <span className="font-mono text-emerald-primary font-bold">₹{preset.amount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Smart Text Quick Parser Input */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Smart Text Quick Parser</span>
          <span className="text-xs text-gray-500">(Type e.g. "500 fuel NH44" or "1200 stay Lonavala")</span>
        </div>
        <form onSubmit={handleSmartSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="input-field flex-1 text-sm"
            placeholder="Type quick expense note, e.g. '450 fuel petrol pump'..."
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
          />
          <button type="submit" disabled={smartSubmitting || !smartInput.trim()} className="btn-primary text-xs px-4 whitespace-nowrap">
            {smartSubmitting ? 'Adding...' : 'Smart Add'}
          </button>
        </form>

        {/* Live Smart Parser Preview Badge */}
        {parsedPreview && parsedPreview.amount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/60 rounded-lg text-xs text-gray-300 border border-slate-800">
            <span className="text-gray-400">Parsed Preview:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              ₹{parsedPreview.amount}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
              Category: {parsedPreview.category}
            </span>
            <span className="text-gray-400 italic">
              "{parsedPreview.description}"
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 space-x-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === 'overview'
            ? 'border-emerald-primary text-emerald-primary bg-emerald-500/5 rounded-t-lg'
            : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          <PieChart className="w-4 h-4" /> Overview & Budget Gauges
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === 'calculator'
            ? 'border-emerald-primary text-emerald-primary bg-emerald-500/5 rounded-t-lg'
            : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          <Calculator className="w-4 h-4" /> Fuel & Trip Estimator
        </button>
        <button
          onClick={() => setActiveTab('splitter')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === 'splitter'
            ? 'border-emerald-primary text-emerald-primary bg-emerald-500/5 rounded-t-lg'
            : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          <Users className="w-4 h-4" /> Group Rally Splitter
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === 'history'
            ? 'border-emerald-primary text-emerald-primary bg-emerald-500/5 rounded-t-lg'
            : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          <Receipt className="w-4 h-4" /> Expense Log ({expenses.length})
        </button>
      </div>

      {/* Main Budget Bar (Always Visible) */}
      <div className="glass-card p-5 space-y-3 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-primary" />
            <h2 className="font-semibold text-lg text-white">Monthly Ride Budget Tracker</h2>
          </div>
          {analytics.monthly_budget > 0 ? (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${budgetStyle.badge}`}>
              {analytics.percentage_used >= 100 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Over Budget!
                </>
              ) : analytics.percentage_used >= 80 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Warning (High Usage)
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Under Budget
                </>
              )}
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-dark/40 px-3 py-1 rounded-full border border-gray-700">
              No budget limit set
            </span>
          )}
        </div>

        {analytics.monthly_budget > 0 ? (
          <div>
            <div className="flex justify-between text-sm mb-1.5 font-medium">
              <span className="text-gray-400">
                Spent: <strong className="text-white">₹{analytics.total?.toLocaleString('en-IN')}</strong> of ₹
                {analytics.monthly_budget?.toLocaleString('en-IN')}
              </span>
              <span className={budgetStyle.text}>{analytics.percentage_used}% used</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${budgetStyle.bar}`}
                style={{ width: `${Math.min(100, analytics.percentage_used || 0)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg text-sm text-gray-300">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-primary shrink-0" /> Set a target limit for your monthly motorcycling expenses to track remaining funds.
            </span>
            <button onClick={() => setShowBudgetModal(true)} className="text-xs text-emerald-primary underline hover:text-emerald-400 shrink-0">
              Set Target
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: OVERVIEW & GAUGES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Spent</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-primary mt-2">
                ₹{(analytics.total || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">{analytics.count} recorded transactions</p>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining Budget</p>
              <p className={`text-xl sm:text-2xl font-bold mt-2 ${analytics.monthly_budget > 0 && analytics.remaining_budget <= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                {analytics.monthly_budget > 0 ? `₹${(analytics.remaining_budget || 0).toLocaleString('en-IN')}` : 'N/A'}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Available for this month</p>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Limit</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-2">
                {analytics.monthly_budget > 0 ? `₹${analytics.monthly_budget.toLocaleString('en-IN')}` : 'Not set'}
              </p>
              <button onClick={() => setShowBudgetModal(true)} className="text-xs text-emerald-primary text-left mt-1 hover:underline">
                Edit limit
              </button>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Category</p>
              <p className="text-lg sm:text-xl font-bold text-orange-400 mt-2 truncate">
                {Object.entries(analytics.by_category || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Highest expense area</p>
            </div>
          </div>

          {/* Category Breakdown Cards */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-primary" /> Category Spending Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {CATEGORIES.map(({ key, label, icon: Icon, color, bg }) => {
                const amount = analytics.by_category?.[key] || 0;
                const percentage = analytics.total > 0 ? ((amount / analytics.total) * 100).toFixed(1) : 0;
                return (
                  <div key={key} className={`glass-card p-4 border ${bg} transition-all hover:scale-[1.02]`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg bg-dark/60 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-400">{percentage}%</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="data-mono text-base sm:text-lg font-bold text-white mt-1">₹{amount.toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUEL & TRIP CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="glass-card p-6 md:col-span-2 space-y-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <Fuel className="w-5 h-5 text-emerald-primary" /> Trip Fuel & Cost Estimator
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Select Motorcycle</label>
                <select
                  className="input-field"
                  value={calcBike}
                  onChange={(e) => handleBikeChangeForCalc(e.target.value)}
                >
                  <option value="">Custom Motorcycle</option>
                  {motorcycles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.make} {b.model} ({b.fuel_efficiency_kmpl} kmpl)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Fuel Mileage (km/L)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcKmpl}
                  onChange={(e) => setCalcKmpl(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 35"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Planned Distance (km)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Fuel Rate (₹/Liter)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcFuelPrice}
                  onChange={(e) => setCalcFuelPrice(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 102"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Trip Duration (Days)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcDays}
                  onChange={(e) => setCalcDays(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Daily Stay Budget (₹/day)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcStayPerDay}
                  onChange={(e) => setCalcStayPerDay(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Daily Food Budget (₹/day)</label>
                <input
                  type="number"
                  className="input-field"
                  value={calcFoodPerDay}
                  onChange={(e) => setCalcFoodPerDay(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Calculator Output Summary Card */}
          <div className="glass-card p-6 flex flex-col justify-between space-y-4 border-emerald-500/30">
            <div>
              <h4 className="font-bold text-white text-md border-b border-gray-800 pb-2 mb-4">Trip Cost Summary</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Required Fuel:</span>
                  <span className="font-bold text-white">{calculatedFuelLiters} Liters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Fuel Cost:</span>
                  <span className="font-bold text-red-400">₹{calculatedFuelCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Stay Cost:</span>
                  <span className="font-bold text-blue-400">₹{calculatedStayCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Food Cost:</span>
                  <span className="font-bold text-orange-400">₹{calculatedFoodCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                  <span className="text-base font-bold text-white">Total Trip Budget:</span>
                  <span className="text-2xl font-bold text-emerald-primary">₹{totalEstimatedTripCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddEstimatedAsExpense}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Fuel Cost to Log
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: GROUP RALLY COST SPLITTER */}
      {activeTab === 'splitter' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center border-b border-gray-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-primary" /> Rally & Group Ride Cost Splitter
              </h3>
              <p className="text-xs text-gray-400">Divide group trip expenses (Stay, Food, Backup Vehicle) equally among riders</p>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <span className="text-xs text-gray-400 block">Equal Share Per Rider</span>
                <p className="text-2xl font-bold text-emerald-primary">₹{parseInt(splitPerPerson).toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={handleCopyRallySplit}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2"
              >
                {copiedSplit ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-blue-400" />}
                {copiedSplit ? 'Copied!' : 'Share WhatsApp'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Total Rally Expense (₹)</label>
              <input
                type="number"
                className="input-field"
                value={splitTotal}
                onChange={(e) => setSplitTotal(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Number of Participating Riders</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={splitRidersCount}
                onChange={(e) => {
                  const count = parseInt(e.target.value) || 1;
                  setSplitRidersCount(count);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-300">Rider Settlement Breakdown</h4>
            <div className="grid gap-2">
              {Array.from({ length: splitRidersCount }).map((_, idx) => {
                const name = idx === 0 ? 'Rider 1 (You)' : `Rider ${idx + 1}`;
                return (
                  <div key={idx} className="bg-dark/40 border border-gray-800 p-3 rounded-lg flex items-center justify-between text-sm">
                    <span className="font-medium text-white">{name}</span>
                    <span className="text-gray-400">
                      Owes Share: <strong className="text-emerald-primary">₹{parseInt(splitPerPerson).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSE LOG & SEARCH */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter and Search controls */}
          <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search description or location..."
                className="bg-transparent border-none text-sm text-white focus:outline-none w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                className="input-field py-1 text-xs"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-primary" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="glass-card p-12 text-center text-gray-400">
              No matching expense logs found. Click "Record Expense" or tap a 1-Tap Preset above to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => {
                const cat = CATEGORIES.find((c) => c.key === exp.category);
                const Icon = cat?.icon || Receipt;
                return (
                  <div key={exp.id} className="glass-card p-4 flex items-center justify-between gap-4 transition-all hover:bg-dark/70">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-lg bg-dark/60 flex items-center justify-center flex-shrink-0 ${cat?.color || ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white truncate">{exp.description || exp.category}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${cat?.bg || ''}`}>
                            {cat?.label || exp.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {exp.date} {exp.location && `• ${exp.location}`} {exp.motorcycle_name && `• ${exp.motorcycle_name}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="data-mono font-bold text-lg text-white">
                        ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-primary" /> Record New Expense
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="e.g. 450"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Description / Tag</label>
                <input
                  className="input-field"
                  placeholder="e.g. Fuel fill-up at HP Petrol Pump"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Location</label>
                <input
                  className="input-field"
                  placeholder="e.g. Highway NH44, Pune"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Linked Motorcycle</label>
                <select
                  className="input-field"
                  value={form.motorcycle}
                  onChange={(e) => setForm({ ...form, motorcycle: e.target.value })}
                >
                  <option value="">No motorcycle linked</option>
                  {motorcycles.map((b) => (
                    <option key={b.id} value={b.id}>{b.make} {b.model}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Save Expense</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SET BUDGET LIMIT MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4 relative">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-primary" /> Monthly Budget Target
              </h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target Limit (₹ / month)</label>
                <input
                  type="number"
                  className="input-field text-lg font-bold"
                  placeholder="e.g. 15000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Save Budget</button>
                <button type="button" onClick={() => setShowBudgetModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
