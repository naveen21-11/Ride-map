import { NavLink, useNavigate } from 'react-router-dom';
import {
  Map, Users, Wrench, Receipt, Flag,
  BookOpen, LogOut, Menu, X, Bike, Shield, Image as ImageIcon, MessageCircle, Edit3, User as UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setBackgroundImage as saveBackgroundImage, updateProfile } from '../services/api';
import toast from 'react-hot-toast';
import WingmanWidget from './WingmanWidget';

const NAV = [
  { to: '/', icon: Map, label: 'Travel Map' },
  { to: '/journal', icon: BookOpen, label: 'Ride Journal' },
  { to: '/rallies', icon: Flag, label: 'Group Rallies' },
  { to: '/chat', icon: MessageCircle, label: 'Messages & AI' },
  { to: '/community', icon: Users, label: 'Co-Riders' },
  { to: '/garage', icon: Wrench, label: 'Digital Garage' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
];

const ADMIN_NAV = [
  { to: '/admin', icon: Shield, label: 'Admin' },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function Layout({ children }) {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const storedBackground = user?.background_image || (user?.username ? window.localStorage.getItem(`ride-background-image:${user.username}`) : '') || window.localStorage.getItem('ride-background-image') || '';
    setBackgroundImage(storedBackground);
  }, [user?.background_image, user?.username]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: '', home_city: '', country: 'India', first_name: '', last_name: '', avatar: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        bio: user.bio || '',
        home_city: user.home_city || '',
        country: user.country || 'India',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      await refreshUser();
      toast.success('Profile updated successfully!');
      setShowProfileModal(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackgroundSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setBackgroundImage(dataUrl);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ride-background-image', dataUrl);
        if (user?.username) {
          window.localStorage.setItem(`ride-background-image:${user.username}`, dataUrl);
        }
      }
      try {
        await saveBackgroundImage(dataUrl);
        await refreshUser();
      } catch {
        // keep local update even if server sync fails
      }
    };
    reader.readAsDataURL(file);
  };

  const clearBackground = async () => {
    setBackgroundImage('');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ride-background-image', '');
      if (user?.username) {
        window.localStorage.setItem(`ride-background-image:${user.username}`, '');
      }
    }
    try {
      await saveBackgroundImage('');
      await refreshUser();
    } catch {
      // keep local reset even if server sync fails
    }
  };

  const isRoleAdmin = user && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role);

  return (
    <div className="relative flex h-screen min-h-dvh overflow-hidden bg-dark text-gray-100 selection:bg-emerald-primary selection:text-white">
      {/* Dynamic Background Image & Glass Backdrop */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
        style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/85 backdrop-blur-[2px] pointer-events-none" />

      {/* Desktop Permanent Sidebar (lg:flex hidden) */}
      <aside className="relative z-20 hidden lg:flex w-64 glass-card m-3 flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-primary/20 flex items-center justify-center border border-emerald-primary/40 text-emerald-primary">
              <Bike className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">RideMap</h1>
              <p className="text-xs text-gray-400 font-medium">Motorcycle Travel Journal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {[...NAV, ...(isRoleAdmin ? ADMIN_NAV : [])].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                  ? 'bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/40 shadow-lg shadow-emerald-950/50 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 space-y-1.5">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 transition-all"
            >
              <ImageIcon className="w-4 h-4 text-emerald-primary" />
              <span>Set photo wallpaper</span>
            </button>
            {backgroundImage && (
              <button
                onClick={clearBackground}
                className="flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-gray-400 hover:bg-white/10 transition-all"
              >
                Reset wallpaper
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-secondary/30 border border-teal-secondary/40 flex items-center justify-center text-sm font-bold text-teal-secondary shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'R'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Rider'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.home_city || 'India'}</p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-500/20 transition-all font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (< lg) */}
      <div className="relative z-20 flex-1 flex flex-col min-w-0 h-full">
        <header className="lg:hidden flex items-center justify-between p-3.5 glass-card m-2 mb-0 border-emerald-primary/30">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5 text-gray-200" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-7 h-7 rounded-lg bg-emerald-primary/20 flex items-center justify-center border border-emerald-primary/30">
                <Bike className="w-4 h-4 text-emerald-primary" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">RideMap</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              onClick={() => setOpen(true)}
              className="w-8 h-8 rounded-full bg-emerald-primary/20 border border-emerald-primary/40 flex items-center justify-center text-xs font-bold text-emerald-primary cursor-pointer active:scale-95"
            >
              {user?.username?.[0]?.toUpperCase() || 'R'}
            </div>
          </div>
        </header>

        {/* Mobile Slide-over Drawer (< lg) */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm transition-opacity"
              onClick={() => setOpen(false)}
            />

            {/* Slide Drawer Panel */}
            <div className="relative z-10 w-72 max-w-[80vw] bg-slate-900 border-r border-emerald-primary/30 h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-primary/20 flex items-center justify-center border border-emerald-primary/30">
                    <Bike className="w-5 h-5 text-emerald-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm tracking-wide">RideMap</h2>
                    <p className="text-[10px] text-gray-400">Motorcycle Travel Journal</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
                {[...NAV, ...(isRoleAdmin ? ADMIN_NAV : [])].map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                        ? 'bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/30 font-bold'
                        : 'text-gray-300 hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  onClick={() => { setOpen(false); fileInputRef.current?.click(); }}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-gray-200 hover:bg-white/10 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-primary" />
                  <span>Set wallpaper photo</span>
                </button>

                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-emerald-primary/20 border border-emerald-primary/40 flex items-center justify-center text-xs font-bold text-emerald-primary">
                    {user?.username?.[0]?.toUpperCase() || 'R'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user?.username || 'Rider'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user?.role || 'Rider'}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 active:scale-95 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area with Adaptive Mobile Padding */}
        <main className="flex-1 overflow-auto p-2 lg:p-4 pb-24 lg:pb-4">
          {children}
        </main>

        {/* Mobile Speed Dial Quick Action FAB (< lg) */}
        <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
          {fabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <button
                onClick={() => { setFabOpen(false); navigate('/expenses'); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-primary text-white text-xs font-medium shadow-xl border border-emerald-primary/40 active:scale-95"
              >
                <span>💳 Add Expense</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); navigate('/rallies'); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-teal-secondary text-white text-xs font-medium shadow-xl border border-teal-secondary/40 active:scale-95"
              >
                <span>🏁 Create Rally</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); navigate('/journal'); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium shadow-xl border border-indigo-400/30 active:scale-95"
              >
                <span>📖 New Entry</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 active:scale-90 border border-white/20 ${fabOpen
              ? 'bg-red-500 rotate-45 ring-4 ring-red-500/30'
              : 'bg-emerald-primary ring-4 ring-emerald-primary/40 hover:scale-105'
              }`}
          >
            <X className={`w-6 h-6 transition-transform duration-300 ${fabOpen ? '' : 'hidden'}`} />
            <Bike className={`w-5 h-5 transition-transform duration-300 ${fabOpen ? 'hidden' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-emerald-primary/20 px-2 py-1.5 flex justify-around items-center shadow-2xl">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[54px] min-h-[44px] transition-all duration-200 ${isActive
                ? 'text-emerald-primary font-bold bg-emerald-primary/10 border border-emerald-primary/30 scale-105'
                : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight truncate max-w-[60px]">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </div>

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 shadow-2xl border-emerald-500/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-primary" />
                <h3 className="font-bold text-lg text-white">Edit Rider Profile</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">First Name</label>
                  <input
                    className="input-field text-sm"
                    placeholder="First Name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Last Name</label>
                  <input
                    className="input-field text-sm"
                    placeholder="Last Name"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Home City</label>
                <input
                  className="input-field text-sm"
                  placeholder="e.g. Bengaluru, Mumbai, Delhi"
                  value={profileForm.home_city}
                  onChange={(e) => setProfileForm({ ...profileForm, home_city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Country</label>
                <input
                  className="input-field text-sm"
                  placeholder="Country"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Avatar Image URL</label>
                <input
                  className="input-field text-sm"
                  placeholder="https://..."
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Rider Bio & Riding Style</label>
                <textarea
                  className="input-field text-sm"
                  rows={3}
                  placeholder="Tell co-riders about your bike, favourite routes, riding style..."
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={savingProfile} className="btn-primary flex-1 text-sm py-2.5">
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="btn-secondary text-sm py-2.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Floating Wingman AI Assistant (Bottom-Right Docked) */}
      <WingmanWidget />
    </div>
  );
}
