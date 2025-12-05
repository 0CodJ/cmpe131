// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase, supabaseConfigValid } from '../lib/supabaseClient';

// User profile type (matches database schema)
export type UserProfile = {
  id: string;
  email: string | null;
  role: 'admin' | 'user';
  approved: boolean;
};

// Auth context type
type AuthContextType = {
  user: any | null; // Supabase auth user
  profile: UserProfile | null; // Extended profile with role/approval
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  listPendingUsers: () => Promise<UserProfile[]>;
  approveUser: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string, email: string | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, approved')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      if (!data) {
        // Profile doesn't exist, create one
        const defaultProfile: UserProfile = {
          id: userId,
          email,
          role: 'user',
          approved: false,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select('id, email, role, approved')
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setProfile(defaultProfile);
        } else {
          setProfile(inserted as UserProfile);
        }
      } else {
        setProfile({
          id: data.id,
          email: data.email ?? email,
          role: (data.role as 'admin' | 'user') ?? 'user',
          approved: !!data.approved,
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      setProfile({
        id: userId,
        email,
        role: 'user',
        approved: false,
      });
    }
  };

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    let ignore = false;

    // If env vars are missing, fail fast so UI doesn't hang
    if (!supabaseConfigValid) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (ignore) return;

        if (error) {
          console.error('Error getting session:', error);
        }

        if (data?.session?.user) {
          setUser(data.session.user);
          await fetchProfile(data.session.user.id, data.session.user.email ?? null);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Unexpected getSession error:', err);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (ignore) return;
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id, session.user.email ?? null);
          } else {
            setProfile(null);
          }
        } catch (err) {
          console.error('Unexpected auth state change error:', err);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      ignore = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return error.message;
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email ?? null);
      }
      return null;
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return error?.message || 'An unexpected error occurred';
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Register error:', error);
        return error.message;
      }

      // Create profile entry for new user
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email ?? null);
      }
      return null;
    } catch (error: any) {
      console.error('Unexpected register error:', error);
      return error?.message || 'An unexpected error occurred';
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const listPendingUsers = async (): Promise<UserProfile[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, approved')
        .eq('approved', false);

      if (error) {
        console.error('Error fetching pending users:', error);
        return [];
      }

      return (data || []).map((p) => ({
        id: p.id,
        email: p.email,
        role: (p.role as 'admin' | 'user') ?? 'user',
        approved: !!p.approved,
      }));
    } catch (error) {
      console.error('Unexpected error fetching pending users:', error);
      return [];
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approved: true })
        .eq('id', userId);

      if (error) {
        console.error('Error approving user:', error);
        throw error;
      }

      // Update local profile if it's the current user
      if (profile && profile.id === userId) {
        setProfile({ ...profile, approved: true });
      }
    } catch (error) {
      console.error('Unexpected error approving user:', error);
      throw error;
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      listPendingUsers,
      approveUser,
    }),
    [user, profile, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use in components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
};
