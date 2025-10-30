import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserProfile = {
  id: string;
  email: string | null;
  role: 'admin' | 'user';
  approved: boolean;
};

type AuthContextValue = {
  sessionUserId: string | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSessionUserId(session?.user?.id ?? null);
      if (session?.user?.id) {
        await fetchProfile(session.user.id, session.user.email ?? null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null;
      setSessionUserId(userId);
      if (userId) {
        await fetchProfile(userId, session?.user?.email ?? null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string | null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, approved, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // If table not found or other error, just clear profile
      setProfile({ id: userId, email, role: 'user', approved: false });
      return;
    }

    if (!data) {
      // Create an entry with default role=user and approved=false
      const { data: inserted } = await supabase
        .from('profiles')
        .insert([{ id: userId, email, role: 'user', approved: false }])
        .select('id, role, approved, email')
        .single();
      if (inserted) {
        setProfile(inserted as UserProfile);
      } else {
        setProfile({ id: userId, email, role: 'user', approved: false });
      }
    } else {
      setProfile({
        id: data.id,
        email: data.email ?? email,
        role: (data.role as 'admin' | 'user') ?? 'user',
        approved: !!data.approved,
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    // Ensure profile row exists post-signup
    if (data.user?.id) await fetchProfile(data.user.id, data.user.email ?? null);
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (sessionUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      await fetchProfile(sessionUserId, user?.email ?? null);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    sessionUserId,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
  }), [sessionUserId, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


