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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
    return profile && roles.includes(profile.role);
  };

  const canEdit = () => hasRole('admin', 'manager');
  const isAdmin = () => hasRole('admin');

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
