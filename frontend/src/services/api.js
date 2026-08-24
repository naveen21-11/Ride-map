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
export const getPins = (params) => api.get('/pins/', { params });
export const createPin = (data) => api.post('/pins/', data);
export const updatePin = (id, data) => api.patch(`/pins/${id}/`, data);
export const deletePin = (id) => api.delete(`/pins/${id}/`);
export const markVisited = (id) => api.post(`/pins/${id}/mark_visited/`);
export const getRides = () => api.get('/rides/');
export const createRide = (data) => api.post('/rides/', data);
export const joinByCode = (invite_code) => api.post('/rides/join_by_code/', { invite_code });
export const leaveRide = (id) => api.post(`/rides/${id}/leave/`);
export const completeRide = (id) => api.post(`/rides/${id}/complete/`);
export const updateRideLocation = (id, data) => api.post(`/rides/${id}/update_location/`, data);
export const deleteRide = (id) => api.delete(`/rides/${id}/`);
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

