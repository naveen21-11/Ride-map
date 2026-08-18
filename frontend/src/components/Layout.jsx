import { NavLink, useNavigate } from 'react-router-dom';
import {
  Map, Users, Wrench, Receipt, Flag,
  BookOpen, LogOut, Menu, X, Bike, Shield, Image as ImageIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setBackgroundImage as saveBackgroundImage } from '../services/api';

const NAV = [
  { to: '/', icon: Map, label: 'Travel Map' },
  { to: '/journal', icon: BookOpen, label: 'Ride Journal' },
  { to: '/rallies', icon: Flag, label: 'Group Rallies' },
  { to: '/community', icon: Users, label: 'Co-Riders' },
  { to: '/garage', icon: Wrench, label: 'Garage' },
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
  const [backgroundImage, setBackgroundImage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const storedBackground = user?.background_image || (user?.username ? window.localStorage.getItem(`ride-background-image:${user.username}`) : '') || window.localStorage.getItem('ride-background-image') || '';
    setBackgroundImage(storedBackground);
  }, [user?.background_image, user?.username]);

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

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/70" />

      {/* Sidebar */}
      <aside className={`relative z-10 fixed lg:static inset-y-0 left-0 z-50 w-64 glass-card m-0 lg:m-3 flex flex-col transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-primary/20 flex items-center justify-center">
              <Bike className="w-6 h-6 text-emerald-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">RideMap</h1>
              <p className="text-xs text-gray-500">India Motorcycle Journal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[...NAV, ...(user && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role) ? ADMIN_NAV : [])].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-primary/20 text-emerald-primary border border-emerald-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundSelect} />
            <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-all">
              <ImageIcon className="w-4 h-4 text-emerald-primary" />
              <span>Set photo background</span>
            </button>
            {backgroundImage && (
              <button onClick={clearBackground} className="mt-2 flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 transition-all">
                Reset background
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-teal-secondary/30 flex items-center justify-center text-sm font-bold text-teal-secondary">
              {user?.username?.[0]?.toUpperCase() || 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.home_city || 'India'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 glass-card m-2 mb-0">
          <button onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
          <span className="font-bold text-emerald-primary">RideMap</span>
          <button onClick={() => setOpen(false)} className="opacity-0"><X className="w-6 h-6" /></button>
        </header>
        <main className="flex-1 overflow-auto p-2 lg:p-3">{children}</main>
      </div>
    </div>
  );
}
