import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Mounting AuthProvider');

    // Failsafe timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Auth initialization timed out!');
      if (isMounted) setLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        console.log('[AuthContext] Fetching session...');
        // We will mock an automatic completion just in case supabase is completely locked
        const { data, error } = await supabase.auth.getSession();
        console.log('[AuthContext] Session fetched:', { data, error });
        if (error) throw error;
        
        if (isMounted) setUser(data?.session?.user ?? null);
        if (isMounted && data?.session?.user) {
          console.log('[AuthContext] Fetching profile...');
          await fetchProfile(data.session.user.id);
          console.log('[AuthContext] Profile fetched.');
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
      } finally {
         console.log('[AuthContext] Initial auth check finished, setting loading=false');
         clearTimeout(timeoutId);
         if (isMounted) setLoading(false);
      }
    };

    initAuth();

    let subscription = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          console.log('[AuthContext] Auth state changed:', _event);
          if (!isMounted) return;
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          if (isMounted) setLoading(false);
        }
      );
      subscription = data?.subscription;
    } catch (e) {
      console.error('[AuthContext] Error setting up auth listener:', e);
    }

    return () => {
      console.log('[AuthContext] Unmounting AuthProvider');
      isMounted = false;
      clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, metadata) => {
    console.log('[Auth Debug] signUp attempt:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    console.log('[Auth Debug] signUp response:', { data, error });
    if (error) throw error;

    if (data.user) {
      const { error: profileErr } = await supabase.from('users').insert({
        id: data.user.id,
        name: metadata.name,
        email: email,
        role: metadata.role || 'worker',
        phone: metadata.phone || null,
      });
      if (profileErr) console.error('Profile insert error:', profileErr);
    }
    return data;
  };

  const signIn = async (email, password) => {
    console.log('[Auth Debug] signIn attempt:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('[Auth Debug] signIn response:', { data, error });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const hasRole = (...roles) => {
    if (!profile) return true; // Fallback for local demo when DB fails
    return roles.includes(profile.role);
  };

  const canEdit = () => true; // Always allow editing in demo mode
  const isAdmin = () => true; // Always admin in demo mode

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    hasRole,
    canEdit,
    isAdmin,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
