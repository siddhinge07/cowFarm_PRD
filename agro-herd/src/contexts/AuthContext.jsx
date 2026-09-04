import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('agroherd_access_token');
    
    const initAuth = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (isMounted) {
          setUser(data);
          setProfile(data);
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
        localStorage.removeItem('agroherd_access_token');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initAuth();
    return () => { isMounted = false; };
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const signUp = async (farmName, name, email, password, phone) => {
    return await api.post('/auth/register', {
      farm_name: farmName,
      name,
      email,
      password,
      phone
    });
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res?.data?.session?.access_token) {
      localStorage.setItem('agroherd_access_token', res.data.session.access_token);
      setUser(res.data.user);
      setProfile(res.data.user);
    }
    return res;
  };

  const resendOtp = async (email) => {
    return await api.post('/auth/resend-otp', { email });
  };

  const signIn = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res?.data?.session?.access_token) {
      localStorage.setItem('agroherd_access_token', res.data.session.access_token);
      setUser(res.data.user);
      setProfile(res.data.user);
    }
    return res;
  };

  const signOut = async () => {
    localStorage.removeItem('agroherd_access_token');
    setUser(null);
    setProfile(null);
  };

  const hasRole = (...roles) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isAdmin = () => profile?.role === 'admin';
  const isWorker = () => profile?.role === 'worker';
  const canAddCow = () => profile?.role === 'admin';
  const canDeleteCow = () => profile?.role === 'admin';
  const canViewExpenses = () => profile?.role === 'admin';
  const canManageTeam = () => profile?.role === 'admin';
  const canRecordCycle = () => true;
  const canRecordMilk = () => true;
  const canRecordHealth = () => true;
  const canEdit = () => true;

  const value = {
    user,
    profile,
    loading,
    fetchProfile,
    signUp,
    verifyOtp,
    resendOtp,
    signIn,
    signOut,
    hasRole,
    isAdmin,
    isWorker,
    canAddCow,
    canDeleteCow,
    canViewExpenses,
    canManageTeam,
    canRecordCycle,
    canRecordMilk,
    canRecordHealth,
    canEdit
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
