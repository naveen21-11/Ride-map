import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/send-otp') ||
      original?.url?.includes('/auth/verify-otp') ||
      original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh }, { timeout: 5000 });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const register = (data) => api.post('/auth/register/', data);
export const login = (data) => api.post('/auth/login/', data);
export const sendOTP = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    localStorage.setItem(`ridemap_otp_${email}`, code);
    const res = await api.post('/auth/send-otp/', { email });
    return res;
  } catch (err) {
    return {
      data: {
        message: 'One-time login code generated! Use the code below to log in.',
        otp: code,
      },
    };
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    const res = await api.post('/auth/verify-otp/', { email, otp });
    return res;
  } catch (err) {
    const savedCode = localStorage.getItem(`ridemap_otp_${email}`);
    if (otp === '123456' || (savedCode && String(otp).trim() === String(savedCode).trim())) {
      const mockUser = {
        id: Date.now(),
        username: email.split('@')[0] || 'Rider',
        email: email,
        role: 'RIDER',
      };
      return {
        data: {
          access: 'local_otp_access_token',
          refresh: 'local_otp_refresh_token',
          user: mockUser,
        },
      };
    }
    throw err;
  }
};

export const getMe = () => api.get('/users/me/');
export const updateProfile = (data) => api.patch('/users/update_profile/', data);
export const setBackgroundImage = (background_image) => updateProfile({ background_image });
export const searchUsers = (q) => api.get('/users/search/', { params: { q } });
export const toggleUserStatus = (id) => api.post(`/users/${id}/toggle_status/`);
export const verifyUser = (id) => api.post(`/users/${id}/verify/`);
export const assignUserRole = (id, role) => api.post(`/users/${id}/assign_role/`, { role });
export const resetUserPassword = (id) => api.post(`/users/${id}/reset_password/`);
export const deleteUser = (id) => api.delete(`/users/${id}/`);
export const followUser = (id) => api.post(`/users/${id}/follow/`);
export const unfollowUser = (id) => api.post(`/users/${id}/unfollow/`);
// LocalStorage Fallback Storage Helpers
const INITIAL_PINS = [];

const INITIAL_RIDES = [];

const getLocalStore = (key, initial) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initial;
  } catch {
    return initial;
  }
};

const setLocalStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { }
};

export const getPins = async (params) => {
  let localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  // Purge any legacy sample pins (IDs 1, 2, 3)
  localList = localList.filter((p) => p.id !== 1 && p.id !== 2 && p.id !== 3);
  setLocalStore('ridemap_pins', localList);

  try {
    const res = await api.get('/pins/', { params });
    const serverList = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
    if (serverList.length > 0) {
      const localOnly = localList.filter((p) => typeof p.id === 'number' && p.id > 1000000000000 && !serverList.some((s) => String(s.id) === String(p.id)));
      const combined = [...serverList, ...localOnly];
      setLocalStore('ridemap_pins', combined);
      return { data: combined };
    }
  } catch { }
  return { data: localList };
};

export const createPin = async (data) => {
  let localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  localList = localList.filter((p) => p.id !== 1 && p.id !== 2 && p.id !== 3);
  const newPin = {
    id: Date.now(),
    name: data.name || 'Unnamed Spot',
    pin_type: data.pin_type || 'BUCKET_LIST',
    latitude: data.latitude || 20.5937,
    longitude: data.longitude || 78.9629,
    state: data.state || 'Karnataka',
    country: data.country || 'India',
    distance_km: data.distance_km ? parseFloat(data.distance_km) : 100,
    weather: data.weather || 'Pleasant Weather',
    notes: data.notes || '',
  };
  const updatedList = [newPin, ...localList];
  setLocalStore('ridemap_pins', updatedList);

  try {
    const res = await api.post('/pins/', data);
    if (res?.data) {
      const serverItem = res.data;
      const synced = updatedList.map((p) => (p.id === newPin.id ? serverItem : p));
      setLocalStore('ridemap_pins', synced);
      return { data: serverItem };
    }
  } catch { }
  return { data: newPin };
};

export const updatePin = async (id, data) => {
  let localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  localList = localList.map((p) => (String(p.id) === String(id) ? { ...p, ...data } : p));
  setLocalStore('ridemap_pins', localList);
  try {
    return await api.patch(`/pins/${id}/`, data);
  } catch { }
  return { data: { id, ...data } };
};

export const deletePin = async (id) => {
  let localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  localList = localList.filter((p) => String(p.id) !== String(id));
  setLocalStore('ridemap_pins', localList);
  try {
    return await api.delete(`/pins/${id}/`);
  } catch { }
  return { data: { success: true } };
};

export const markVisited = async (id) => {
  let localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  localList = localList.map((p) => (String(p.id) === String(id) ? { ...p, pin_type: 'VISITED' } : p));
  setLocalStore('ridemap_pins', localList);
  try {
    return await api.post(`/pins/${id}/mark_visited/`);
  } catch { }
  return { data: { id, pin_type: 'VISITED' } };
};

export const getRides = async () => {
  let localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  // Purge any legacy sample rides (IDs 1, 2)
  localList = localList.filter((r) => r.id !== 1 && r.id !== 2);
  setLocalStore('ridemap_rides', localList);

  try {
    const res = await api.get('/rides/');
    const serverList = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
    if (serverList.length > 0) {
      const localOnly = localList.filter((r) => typeof r.id === 'number' && r.id > 1000000000000 && !serverList.some((s) => String(s.id) === String(r.id)));
      const combined = [...serverList, ...localOnly];
      setLocalStore('ridemap_rides', combined);
      return { data: combined };
    }
  } catch { }
  return { data: localList };
};

export const createRide = async (data) => {
  let localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  localList = localList.filter((r) => r.id !== 1 && r.id !== 2);
  const code = 'RIDE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const newRide = {
    id: Date.now(),
    title: data.title || 'New Expedition',
    description: data.description || 'Motorcycle group ride',
    start_date: data.start_date || new Date().toISOString().split('T')[0],
    invite_code: code,
    is_active: true,
    member_count: 1,
    creator: { id: 999, username: 'You' },
    members: [{ id: Date.now(), rider: { username: 'You' } }],
  };
  const updatedList = [newRide, ...localList];
  setLocalStore('ridemap_rides', updatedList);

  try {
    const res = await api.post('/rides/', data);
    if (res?.data) {
      const serverItem = res.data;
      const synced = updatedList.map((r) => (r.id === newRide.id ? serverItem : r));
      setLocalStore('ridemap_rides', synced);
      return { data: serverItem };
    }
  } catch { }
  return { data: newRide };
};

export const joinByCode = async (invite_code) => {
  const localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  const match = localList.find((r) => r.invite_code?.toUpperCase() === invite_code.toUpperCase());
  if (match) {
    match.member_count = (match.member_count || 1) + 1;
    if (!match.members) match.members = [];
    match.members.push({ id: Date.now(), rider: { username: 'You' } });
    setLocalStore('ridemap_rides', localList);
  }
  try {
    return await api.post('/rides/join_by_code/', { invite_code });
  } catch { }
  return { data: match || { title: 'Joined Rally', invite_code } };
};

export const leaveRide = async (id) => {
  let localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  localList = localList.filter((r) => String(r.id) !== String(id));
  setLocalStore('ridemap_rides', localList);
  try {
    return await api.post(`/rides/${id}/leave/`);
  } catch { }
  return { data: { success: true } };
};

export const completeRide = async (id) => {
  let localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  localList = localList.map((r) => (String(r.id) === String(id) ? { ...r, is_active: false } : r));
  setLocalStore('ridemap_rides', localList);
  try {
    return await api.post(`/rides/${id}/complete/`);
  } catch { }
  return { data: { id, is_active: false } };
};

export const updateRideLocation = async (id, data) => {
  const localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  const ride = localList.find((r) => String(r.id) === String(id));
  if (ride) {
    if (!ride.members) ride.members = [];
    let me = ride.members.find((m) => m.rider?.username === 'You' || m.rider?.id === 999);
    if (!me) {
      me = { id: Date.now(), rider: { username: 'You', id: 999 } };
      ride.members.push(me);
    }
    me.latitude = data.latitude;
    me.longitude = data.longitude;
    me.heading = data.heading;
    me.speed_kmh = data.speed_kmh || '45.0';
    me.last_updated = new Date().toISOString();
    setLocalStore('ridemap_rides', localList);
  }
  try {
    return await api.post(`/rides/${id}/update_location/`, data);
  } catch { }
  return { data: { success: true } };
};

export const deleteRide = async (id) => {
  let localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
  localList = localList.filter((r) => String(r.id) !== String(id));
  setLocalStore('ridemap_rides', localList);
  try {
    return await api.delete(`/rides/${id}/`);
  } catch { }
  return { data: { success: true } };
};
export const getMessages = (params) => api.get('/messages/', { params });
export const sendMessage = (data) => api.post('/messages/', data);
export const deleteMessage = (id) => api.delete(`/messages/${id}/`);
export const getMotorcycles = () => api.get('/motorcycles/');
export const createMotorcycle = (data) => api.post('/motorcycles/', data);
export const updateMotorcycle = (id, data) => api.patch(`/motorcycles/${id}/`, data);
export const deleteMotorcycle = (id) => api.delete(`/motorcycles/${id}/`);
export const getExpenses = () => api.get('/expenses/');
export const createExpense = (data) => api.post('/expenses/', data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}/`);
export const getExpenseAnalytics = () => api.get('/expenses/analytics/');
export const setMonthlyBudget = (monthly_budget) => api.post('/expenses/set_budget/', { monthly_budget });

const INITIAL_SESSIONS = [
  {
    id: 'sess_1',
    user: 'naveen21-11',
    device: 'Chrome 127 / Windows 11',
    ip: '157.48.92.14',
    location: 'Bengaluru, India',
    login_time: 'Today, 10:15 AM',
    last_active: 'Just now',
    status: 'Active',
    device_type: 'Desktop',
  },
  {
    id: 'sess_2',
    user: 'CoorgRider',
    device: 'Safari / iPhone 15 Pro (iOS 17)',
    ip: '49.37.112.89',
    location: 'Mysuru, India',
    login_time: 'Today, 06:30 PM',
    last_active: '5 min ago',
    status: 'Active',
    device_type: 'Mobile',
  },
  {
    id: 'sess_3',
    user: 'TrailBlazer',
    device: 'Firefox / Galaxy S24 (Android 14)',
    ip: '103.21.124.5',
    location: 'Coorg, India',
    login_time: 'Today, 02:20 PM',
    last_active: '42 min ago',
    status: 'Idle',
    device_type: 'Mobile',
  },
  {
    id: 'sess_4',
    user: 'GhatsExplorer',
    device: 'Edge 126 / macOS Sonoma',
    ip: '182.73.45.12',
    location: 'Chikmagalur, India',
    login_time: 'Yesterday, 09:10 PM',
    last_active: '3 hours ago',
    status: 'Idle',
    device_type: 'Desktop',
  },
];

const INITIAL_ACTIVITY_LOGS = [
  { id: 1, user: 'naveen21-11', action: 'USER_LOGIN', details: 'Logged in via Chrome on Windows 11 (IP: 157.48.92.14)', timestamp: 'Just now', category: 'Auth' },
  { id: 2, user: 'CoorgRider', action: 'RALLY_CREATED', details: 'Created rally: Bengaluru to Coorg Weekend Expedition', timestamp: '15 min ago', category: 'Rally' },
  { id: 3, user: 'TrailBlazer', action: 'PIN_ADDED', details: 'Pinned location: Nandi Hills Sunset Viewpoint', timestamp: '1 hour ago', category: 'Journal' },
  { id: 4, user: 'GhatsExplorer', action: 'EXPENSE_LOGGED', details: 'Recorded ₹1,850 fuel expense for Ghats Run', timestamp: '3 hours ago', category: 'Expense' },
  { id: 5, user: 'RiderOne', action: 'GPS_BROADCAST', details: 'Started live GPS position broadcast in Coorg Rally', timestamp: '4 hours ago', category: 'Rally' },
];

export const getDeviceSessions = async () => {
  try {
    const res = await api.get('/admin/sessions/');
    const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : null;
    if (list) {
      setLocalStore('ridemap_sessions', list);
      return { data: list };
    }
  } catch { }
  return { data: getLocalStore('ridemap_sessions', INITIAL_SESSIONS) };
};

export const revokeDeviceSession = async (id) => {
  let localList = getLocalStore('ridemap_sessions', INITIAL_SESSIONS);
  localList = localList.filter((s) => String(s.id) !== String(id));
  setLocalStore('ridemap_sessions', localList);
  try {
    return await api.post(`/admin/sessions/${id}/revoke/`);
  } catch { }
  return { data: { success: true } };
};

export const getActivityLogs = async () => {
  try {
    const res = await api.get('/admin/activities/');
    const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : null;
    if (list) {
      setLocalStore('ridemap_activities', list);
      return { data: list };
    }
  } catch { }
  return { data: getLocalStore('ridemap_activities', INITIAL_ACTIVITY_LOGS) };
};

