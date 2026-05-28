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

  const signUp = async (email, password, metadata) => {
    const { data } = await api.post('/auth/register', { email, password, data: metadata });
    localStorage.setItem('agroherd_access_token', data.session.access_token);
    setUser(data.user);
    setProfile(data.user);
    return data;
  };

  const signIn = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('agroherd_access_token', data.session.access_token);
    setUser(data.user);
    setProfile(data.user);
    return data;
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

  const canEdit = () => {
    if (!profile) return false;
    return ['admin', 'manager'].includes(profile.role);
  };

  const isAdmin = () => {
    if (!profile) return false;
    return profile.role === 'admin';
  };

  const value = {
    user,
    profile,
    loading,
    fetchProfile,
    signUp,
    signIn,
    signOut,
    hasRole,
    canEdit,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
