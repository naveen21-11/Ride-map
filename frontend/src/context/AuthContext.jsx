import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister, verifyOTP as apiVerifyOTP } from '../services/api';

const AuthContext = createContext(null);


const persistBackgroundPreference = (userData) => {
  if (!userData) return;
  const backgroundImage = userData.background_image || '';
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('ride-background-image', backgroundImage);
    if (userData.username) {
      window.localStorage.setItem(`ride-background-image:${userData.username}`, backgroundImage);
    }
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUser(data);
      persistBackgroundPreference(data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (username, password) => {
    const { data } = await apiLogin({ username, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    let userData = data.user || { username, role: 'RIDER' };
    try {
      const me = await getMe();
      userData = me.data || me || userData;
    } catch {
      // fallback
    }
    setUser(userData);
    persistBackgroundPreference(userData);
    return userData;
  };

  const register = async (formData) => {
    const { data } = await apiRegister(formData);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    let userData = data.user;
    try {
      const me = await getMe();
      userData = me.data || me;
    } catch {
      // fallback to initial user object
    }
    setUser(userData);
    persistBackgroundPreference(userData);
    return userData;
  };

  const loginWithOTP = async (email, otp) => {
    const { data } = await apiVerifyOTP(email, otp);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    let userData = data.user;
    try {
      const me = await getMe();
      userData = me.data || me;
    } catch {
      // fallback
    }
    setUser(userData);
    persistBackgroundPreference(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithOTP, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );

}

export const useAuth = () => useContext(AuthContext);
