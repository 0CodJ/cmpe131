import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SimpleUser = {
  id: string;
  email: string;
  password: string; // plain for simplicity (not secure)
  role: 'admin' | 'user';
  approved: boolean;
};

type SimpleAuthContextValue = {
  sessionUserId: string | null;
  profile: Omit<SimpleUser, 'password'> | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  listPendingUsers: () => Omit<SimpleUser, 'password'>[];
  approveUser: (userId: string) => void;
};

const USERS_KEY = 'simple_auth_users';
const SESSION_KEY = 'simple_auth_session_user_id';

const AuthCtx = createContext<SimpleAuthContextValue | undefined>(undefined);

function loadUsers(): SimpleUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SimpleUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: SimpleUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function exportPublic(user: SimpleUser): Omit<SimpleUser, 'password'> {
  const { password, ...rest } = user;
  return rest;
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Omit<SimpleUser, 'password'> | null>(null);

  useEffect(() => {
    // Seed default admin on first run
    const users = loadUsers();
    if (users.length === 0) {
      const admin: SimpleUser = { 
        id: crypto.randomUUID(),
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        approved: true,
      };
      saveUsers([admin]);
    }
    const sessionId = localStorage.getItem(SESSION_KEY);
    setSessionUserId(sessionId);
    if (sessionId) {
      const current = loadUsers().find(u => u.id === sessionId) || null;
      setProfile(current ? exportPublic(current) : null);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return 'Invalid email or password';
    localStorage.setItem(SESSION_KEY, user.id);
    setSessionUserId(user.id);
    setProfile(exportPublic(user));
    return null;
  };

  const signUp = async (email: string, password: string) => {
    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return 'Email already registered';
    }
    const newUser: SimpleUser = {
      id: crypto.randomUUID(),
      email,
      password,
      role: 'user',
      approved: false,
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    localStorage.setItem(SESSION_KEY, newUser.id);
    setSessionUserId(newUser.id);
    setProfile(exportPublic(newUser));
    return null;
  };

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
    setProfile(null);
  };

  const listPendingUsers = (): Omit<SimpleUser, 'password'>[] => {
    return loadUsers().filter(u => !u.approved).map(exportPublic);
  };

  const approveUser = (userId: string) => {
    const users = loadUsers();
    const updated = users.map(u => (u.id === userId ? { ...u, approved: true } : u));
    saveUsers(updated);
    if (sessionUserId) {
      const me = updated.find(u => u.id === sessionUserId) || null;
      setProfile(me ? exportPublic(me) : null);
    }
  };

  const value = useMemo<SimpleAuthContextValue>(() => ({
    sessionUserId,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    listPendingUsers,
    approveUser,
  }), [sessionUserId, profile, loading]);

  return (
    <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
  );
}

export function useSimpleAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useSimpleAuth must be used within SimpleAuthProvider');
  return ctx;
}


