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
export const sendOTP = (email) => api.post('/auth/send-otp/', { email });
export const verifyOTP = (email, otp) => api.post('/auth/verify-otp/', { email, otp });

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
const INITIAL_PINS = [
  {
    id: 1,
    name: 'Nandi Hills Sunset Viewpoint',
    pin_type: 'VISITED',
    latitude: 13.3702,
    longitude: 77.6835,
    state: 'Karnataka',
    country: 'India',
    distance_km: 62,
    weather: '24°C Pleasant Breeze',
    notes: 'Breathtaking twisties and early morning fog ride with co-riders.',
  },
  {
    id: 2,
    name: 'Leh Ladakh Highway Pass',
    pin_type: 'BUCKET_LIST',
    latitude: 34.1526,
    longitude: 77.5771,
    state: 'Ladakh',
    country: 'India',
    distance_km: 2400,
    weather: '12°C Clear Skies',
    notes: 'Ultimate dream motorcycle expedition crossing Khardung La.',
  },
  {
    id: 3,
    name: 'Gokarna Om Beach Trail',
    pin_type: 'FAVORITE',
    latitude: 14.5199,
    longitude: 74.3188,
    state: 'Karnataka',
    country: 'India',
    distance_km: 480,
    weather: '28°C Coastal Breeze',
    notes: 'Scenic coastal ride along NH66 with beachside camping.',
  },
];

const INITIAL_RIDES = [
  {
    id: 1,
    title: 'Bengaluru to Coorg Weekend Rally',
    description: 'Scenic coffee estate curves and waterfall trail ride',
    start_date: '2026-09-01',
    invite_code: 'RIDE-COORG1',
    is_active: true,
    member_count: 3,
    creator: { id: 101, username: 'CoorgRider' },
    members: [
      { id: 1, rider: { username: 'RiderOne' }, latitude: 12.9716, longitude: 77.5946, speed_kmh: '65.0' },
      { id: 2, rider: { username: 'TrailBlazer' }, latitude: 12.2958, longitude: 76.6394, speed_kmh: '52.4' },
    ],
  },
  {
    id: 2,
    title: 'Western Ghats Monsoon Run',
    description: 'Chikmagalur misty peaks and tea estate trail',
    start_date: '2026-09-10',
    invite_code: 'RIDE-GHATS2',
    is_active: true,
    member_count: 5,
    creator: { id: 102, username: 'GhatsExplorer' },
    members: [
      { id: 3, rider: { username: 'AdventureRider' }, latitude: 13.3161, longitude: 75.772, speed_kmh: '48.2' },
    ],
  },
];

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
  try {
    const res = await api.get('/pins/', { params });
    const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : null;
    if (list) {
      setLocalStore('ridemap_pins', list);
      return { data: list };
    }
  } catch { }
  return { data: getLocalStore('ridemap_pins', INITIAL_PINS) };
};

export const createPin = async (data) => {
  const localList = getLocalStore('ridemap_pins', INITIAL_PINS);
  const newPin = {
    id: Date.now(),
    name: data.name || 'Unnamed Spot',
    pin_type: data.pin_type || 'BUCKET_LIST',
    latitude: data.latitude || 20.5937,
    longitude: data.longitude || 78.9629,
    state: data.state || 'India',
    country: data.country || 'India',
    distance_km: data.distance_km || 0,
    weather: data.weather || 'Sunny',
    notes: data.notes || '',
  };
  localList.unshift(newPin);
  setLocalStore('ridemap_pins', localList);

  try {
    const res = await api.post('/pins/', data);
    return res;
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
  try {
    const res = await api.get('/rides/');
    const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : null;
    if (list) {
      setLocalStore('ridemap_rides', list);
      return { data: list };
    }
  } catch { }
  return { data: getLocalStore('ridemap_rides', INITIAL_RIDES) };
};

export const createRide = async (data) => {
  const localList = getLocalStore('ridemap_rides', INITIAL_RIDES);
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
  localList.unshift(newRide);
  setLocalStore('ridemap_rides', localList);

  try {
    const res = await api.post('/rides/', data);
    return res;
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

export const updateRideLocation = (id, data) => api.post(`/rides/${id}/update_location/`, data);

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

