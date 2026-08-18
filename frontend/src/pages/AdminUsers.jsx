import { useEffect, useState } from 'react';
import { Search, ShieldCheck, UserX, CheckCircle2, Trash2, Download, ShieldAlert } from 'lucide-react';
import api, {
  deleteUser as removeUser,
  toggleUserStatus,
  verifyUser as verifyUserApi,
  assignUserRole,
  resetUserPassword,
} from '../services/api';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const buildCsv = (users) => {
  const header = ['Username', 'Email', 'Role', 'Status', 'Verified', 'Home City', 'Country', 'Joined'];
  const rows = users.map((user) => [
    user.username,
    user.email || '',
    user.role || 'USER',
    user.is_active ? 'Active' : 'Blocked',
    user.is_verified ? 'Yes' : 'No',
    user.home_city || '',
    user.country || '',
    new Date(user.date_joined || user.created_at || '').toLocaleDateString(),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/');
      const list = Array.isArray(data) ? data : data.results || [];
      setUsers(list);
    } catch {
      toast.error('Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((user) => {
    const query = search.toLowerCase();
    return [user.username, user.email, user.home_city, user.country, user.role].join(' ').toLowerCase().includes(query);
  });

  const handleToggleStatus = async (userId) => {
    setSavingId(userId);
    try {
      await toggleUserStatus(userId);
      toast.success('User status updated');
      loadUsers();
    } catch {
      toast.error('Unable to update user status');
    } finally {
      setSavingId(null);
    }
  };

  const handleVerify = async (userId) => {
    setSavingId(userId);
    try {
      await verifyUserApi(userId);
      toast.success('User verified');
      loadUsers();
    } catch {
      toast.error('Unable to verify user');
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (userId, role) => {
    if (!role) return;
    setSavingId(userId);
    try {
      await assignUserRole(userId, role);
      toast.success('User role updated');
      loadUsers();
    } catch {
      toast.error('Unable to update role');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Reset this user password and display the temporary value in the admin console?')) {
      return;
    }
    setSavingId(userId);
    try {
      const { data } = await resetUserPassword(userId);
      toast.success(`Temporary password: ${data.password}`);
      loadUsers();
    } catch {
      toast.error('Unable to reset password');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user from the platform? This action cannot be undone.')) {
      return;
    }
    setSavingId(userId);
    try {
      await removeUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch {
      toast.error('Unable to delete user');
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    const selectedUsers = search.trim() ? filtered : users;
    const csv = buildCsv(selectedUsers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ride-map-users.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-emerald-primary">User Management</p>
            <h1 className="text-2xl font-semibold text-white">Moderate platform members</h1>
            <p className="mt-1 text-sm text-gray-400">Search, review, update roles, and manage accounts from one place.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
                placeholder="Search users"
              />
            </div>
            <button onClick={exportCsv} className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan="5">Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan="5">No users found.</td></tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.email || 'No email'} • {user.home_city || 'Unknown city'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input-field bg-slate-950/80 w-full"
                      value={user.role || 'USER'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={savingId === user.id}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${user.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.is_active ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${user.is_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                      {user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={savingId === user.id}
                        className="rounded-lg border border-white/10 px-3 py-1 text-xs text-gray-300 hover:bg-white/10"
                      >
                        <UserX className="mr-1 inline h-3.5 w-3.5" />{user.is_active ? 'Block' : 'Unblock'}
                      </button>
                      <button
                        onClick={() => handleVerify(user.id)}
                        disabled={savingId === user.id || user.is_verified}
                        className="rounded-lg border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Verify
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={savingId === user.id}
                        className="rounded-lg border border-amber-500/20 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
                      >
                        <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Reset
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={savingId === user.id}
                        className="rounded-lg border border-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
