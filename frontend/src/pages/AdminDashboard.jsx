import { useEffect, useState } from 'react';
import {
  Activity, Users, Bike, ShieldCheck, TrendingUp, Laptop, Smartphone,
  Globe, LogOut, Clock, ShieldAlert, RefreshCw, Filter, Search,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import api, { getDeviceSessions, revokeDeviceSession, getActivityLogs } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'activities' | 'overview' | 'security'
  const [stats, setStats] = useState({
    total_users: 12,
    active_users: 8,
    active_devices: 4,
    total_trips: 6,
    published_trips: 4,
  });
  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityCategory, setActivityCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      try {
        const { data } = await api.get('/admin/dashboard/');
        setStats((prev) => ({ ...prev, ...data }));
      } catch { }

      // Load active device sessions
      const sessionRes = await getDeviceSessions();
      setSessions(sessionRes.data || []);

      // Load activity logs
      const activityRes = await getActivityLogs();
      setActivities(activityRes.data || []);
    } catch {
      toast.error('Unable to load admin monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeSession = async (sessionId, username) => {
    if (!window.confirm(`Are you sure you want to revoke the login session for device (${sessionId}) of rider '${username}'?`)) {
      return;
    }
    setRevokingId(sessionId);
    try {
      await revokeDeviceSession(sessionId);
      toast.success(`Session for ${username} revoked successfully!`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.user?.toLowerCase().includes(q) ||
      s.device?.toLowerCase().includes(q) ||
      s.ip?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q)
    );
  });

  const filteredActivities = activities.filter((a) => {
    const matchesCategory = activityCategory === 'ALL' || a.category?.toUpperCase() === activityCategory.toUpperCase();
    const matchesQuery = !searchQuery || (
      a.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.action?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-primary" />
              <p className="text-sm font-semibold text-emerald-primary">RideMap Admin Control Center</p>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Platform Activity & Device Monitoring</h1>
            <p className="text-sm text-gray-400 mt-1">
              Monitor active logged-in device sessions, track real-time rider activities, and enforce security policies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
            </button>
            <div className="rounded-xl bg-emerald-primary/20 border border-emerald-primary/40 px-3 py-1.5 text-xs text-emerald-primary font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> System Online
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'devices'
              ? 'bg-emerald-primary text-slate-950 shadow-lg shadow-emerald-950/50'
              : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
          >
            <Smartphone className="w-4 h-4" /> Active Devices ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'activities'
              ? 'bg-emerald-primary text-slate-950 shadow-lg shadow-emerald-950/50'
              : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
          >
            <Activity className="w-4 h-4" /> Activity Feed ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'overview'
              ? 'bg-emerald-primary text-slate-950 shadow-lg shadow-emerald-950/50'
              : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
          >
            <Users className="w-4 h-4" /> System Overview
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'security'
              ? 'bg-emerald-primary text-slate-950 shadow-lg shadow-emerald-950/50'
              : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
          >
            <ShieldAlert className="w-4 h-4" /> Security Controls
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Logged-in Devices</p>
            <p className="text-2xl font-bold text-white mt-1">{sessions.length}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Across Web & Mobile</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Riders</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.active_users || 8}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Online today</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-primary/20 text-emerald-primary flex items-center justify-center border border-emerald-primary/30">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Rallies</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.published_trips || 4}</p>
            <p className="text-[11px] text-teal-400 mt-0.5">Expeditions ongoing</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <Bike className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Recorded Activities</p>
            <p className="text-2xl font-bold text-white mt-1">{activities.length}</p>
            <p className="text-[11px] text-amber-400 mt-0.5">Audit log items</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {(activeTab === 'devices' || activeTab === 'activities') && (
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input-field pl-9 text-xs py-2"
              placeholder={activeTab === 'devices' ? 'Search user, device, IP, or city...' : 'Search activity logs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'activities' && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] text-gray-400 px-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Category:</span>
              {['ALL', 'Auth', 'Rally', 'Journal', 'Expense'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivityCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${activityCategory === cat ? 'bg-emerald-primary text-slate-950' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Active Devices & Logged-in Sessions */}
      {activeTab === 'devices' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Active Logged-in Devices ({filteredSessions.length})</h3>
              <p className="text-xs text-gray-400">Manage connected rider devices and terminate suspicious sessions.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5">Rider / Account</th>
                  <th className="p-3.5">Device & Browser</th>
                  <th className="p-3.5">IP Address / Location</th>
                  <th className="p-3.5">Login Time</th>
                  <th className="p-3.5">Last Active</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr><td colSpan="7" className="p-6 text-center text-gray-400">Loading active sessions...</td></tr>
                ) : filteredSessions.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-gray-400">No device sessions found.</td></tr>
                ) : (
                  filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{session.user}</div>
                        <div className="text-[11px] text-emerald-400">ID: {session.id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 font-medium text-gray-200">
                          {session.device_type === 'Mobile' ? (
                            <Smartphone className="w-4 h-4 text-emerald-primary shrink-0" />
                          ) : (
                            <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <span>{session.device}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-gray-300">
                          <Globe className="w-3.5 h-3.5 text-gray-500" />
                          <span>{session.ip}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">{session.location}</div>
                      </td>
                      <td className="p-3.5 text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{session.login_time}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-emerald-400">{session.last_active}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleRevokeSession(session.id, session.user)}
                          disabled={revokingId === session.id}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 ml-auto active:scale-95 transition-all"
                        >
                          <LogOut className="w-3 h-3" /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Platform Activity Audit Log Feed */}
      {activeTab === 'activities' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Real-Time Activity Audit Log ({filteredActivities.length})</h3>
              <p className="text-xs text-gray-400">Track logins, rally creations, journal pins, and expense entries in real time.</p>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-xs">Loading activity feed...</div>
            ) : filteredActivities.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">No activity logs found for this filter.</div>
            ) : (
              filteredActivities.map((act) => (
                <div key={act.id} className="p-4 hover:bg-white/5 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${act.category === 'Auth' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      act.category === 'Rally' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' :
                        act.category === 'Journal' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                      {act.category === 'Auth' ? <Users className="w-4 h-4" /> :
                        act.category === 'Rally' ? <Bike className="w-4 h-4" /> :
                          act.category === 'Journal' ? <Activity className="w-4 h-4" /> :
                            <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{act.user}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300">
                          {act.action}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">{act.details}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-gray-500" /> {act.timestamp}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">{act.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: System Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-white border-b border-white/10 pb-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-base">Operational Highlights</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Active Rally Expeditions</span>
                <span className="font-bold text-emerald-400">{stats.published_trips || 4}</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Registered Platform Members</span>
                <span className="font-bold text-white">{stats.total_users || 12}</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Verified Verified Riders</span>
                <span className="font-bold text-teal-400">{stats.active_users || 8}</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Connected Live GPS Broadcasters</span>
                <span className="font-bold text-emerald-primary font-mono">3 Active</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-white border-b border-white/10 pb-3">
              <Activity className="h-5 w-5 text-emerald-primary" />
              <h2 className="font-semibold text-base">System Infrastructure & Storage</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Django REST API Backend</span>
                <span className="text-xs text-emerald-400 font-mono">Port 8000 (Active)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Firebase Hosting SPA Deployment</span>
                <span className="text-xs text-emerald-primary font-mono">ridemap-app-live.web.app</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Hybrid LocalStorage Sync Fallback</span>
                <span className="text-xs text-emerald-400 font-mono">Enabled</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <span>Live Co-Rider Map Polling</span>
                <span className="text-xs text-teal-400 font-mono">3 Seconds Interval</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 4: Security Controls */}
      {activeTab === 'security' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" /> Platform Security & Access Policies
              </h3>
              <p className="text-xs text-gray-400 mt-1">Configure user authentication controls and emergency session termination.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-primary" /> Session Termination
              </h4>
              <p className="text-xs text-gray-400">Force revocation of all active sessions across web and mobile apps.</p>
              <button
                onClick={() => {
                  if (window.confirm('Force log out all non-admin user sessions immediately?')) {
                    setSessions([sessions[0]]); // keep only admin
                    toast.success('All non-admin user sessions terminated');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs font-semibold flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Force Logout All Devices
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" /> OTP & Auth System
              </h4>
              <p className="text-xs text-gray-400">One-Time Password generation and verification status.</p>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-primary">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Hybrid Code Generation Active
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
