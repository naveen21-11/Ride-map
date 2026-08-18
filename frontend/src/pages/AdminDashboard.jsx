import { useEffect, useState } from 'react';
import { Activity, Users, Bike, MessageSquare, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const cards = [
  { key: 'total_users', label: 'Total Users', icon: Users },
  { key: 'active_users', label: 'Active Users', icon: ShieldCheck },
  { key: 'new_registrations', label: 'New Registrations', icon: TrendingUp },
  { key: 'total_trips', label: 'Total Trips', icon: Bike },
  { key: 'published_trips', label: 'Published Trips', icon: Activity },
  { key: 'total_reviews', label: 'Reviews', icon: MessageSquare },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard/')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-300">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-primary">Admin Control Center</p>
            <h1 className="text-2xl font-semibold text-white">Bike Traveler Dashboard</h1>
          </div>
          <div className="rounded-full bg-emerald-primary/20 px-3 py-1 text-sm text-emerald-primary">Secure panel</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-2xl font-semibold text-white">{stats[key] ?? 0}</p>
              </div>
              <div className="rounded-xl bg-emerald-primary/20 p-3 text-emerald-primary">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="font-semibold">Operational Highlights</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-gray-400">
            <li>• Pending ride approvals: {stats.pending_trips ?? 0}</li>
            <li>• Rejected rides: {stats.rejected_trips ?? 0}</li>
            <li>• Reported posts: {stats.reported_posts ?? 0}</li>
            <li>• Emergency requests: {stats.emergency_requests ?? 0}</li>
          </ul>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5 text-emerald-primary" />
            <h2 className="font-semibold">Content Overview</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-gray-400">
            <li>• Events created: {stats.events_created ?? 0}</li>
            <li>• Blog posts: {stats.total_blog_posts ?? 0}</li>
            <li>• Website visitors: {stats.website_visitors ?? 0}</li>
            <li>• Revenue tracking: Enabled for premium modules</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
