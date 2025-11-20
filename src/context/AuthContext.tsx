import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase'; //not working at the moment 


//This defines what info we store for each user. 
export type UserProfile = {
  id: string; 
  email: string | null; //email can be null if not provided 
  role: 'admin' | 'user'; //role can be admin or user 
  approved: boolean; //approved is a boolean that is false by default 
};

// This defines the type of the context value that will be passed to the AuthContext 

type AuthContextValue = {
  sessionUserId: string | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>; //sign in with email and password and will return an error message if it fails 
  signUpWithEmail: (email: string, password: string) => Promise<string | null>; //sign up with email and password and will return an error message if it fails 
  signOut: () => Promise<void>; //sign out and will return an error message if it fails 
  refreshProfile: () => Promise<void>; //refresh the profile and will return an error message if it fails 
};


// Context object that will hold authentication data 
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// This block of code provides authentication functionality to children components 
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null); //user id of current session
  const [profile, setProfile] = useState<UserProfile | null>(null); //profile of current user 
  const [loading, setLoading] = useState(true); // checking if a user is logged in 


  // check if a user is already logged in from a previous session
  // set up a listener to detect when users log in or out 
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession(); //check for existing session in the supabase 
      setSessionUserId(session?.user?.id ?? null);

      //if logged in user found, load their profile info 
      if (session?.user?.id) {
        await fetchProfile(session.user.id, session.user.email ?? null);
      } else {
        setProfile(null); //if no user logged in, clear it 
      }
      setLoading(false);
    };
    init();

    // listen for changes in authentication state (user logs in or out)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null; 
      setSessionUserId(userId); 
      if (userId) { //if there is a user in the session, load their profile 
        await fetchProfile(userId, session?.user?.email ?? null); 
      } else {
        setProfile(null); //if no user logged in, clear it 
      }
    });

    //remove listener when component is destroyed. Prevents memory leak 
    return () => {
      authListener.subscription.unsubscribe(); 
    };
  }, []);

  // Loads a user's profile from the database 
  // Contains info beyond authetnication like role and approval status 
  const fetchProfile = async (userId: string, email: string | null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, approved, email')
      .eq('id', userId)
      .maybeSingle();


    //if error occured when querying the database   
    if (error) {
      // Use default profile values 
      setProfile({ id: userId, email, role: 'user', approved: false });
      return;
    }

    //if no profile was found in database 
    if (!data) {
      // Create an entry with default role=user and approved=false
      const { data: inserted } = await supabase
        .from('profiles')
        .insert([{ id: userId, email, role: 'user', approved: false }])
        .select('id, role, approved, email')
        .single();

      //if insert was successful, use new profile 
      if (inserted) {
        setProfile(inserted as UserProfile);
      } else {
        setProfile({ id: userId, email, role: 'user', approved: false });
      }
    } 
    
    //if profile exists, use it 
    else {
      setProfile({
        id: data.id,
        email: data.email ?? email,
        role: (data.role as 'admin' | 'user') ?? 'user',
        approved: !!data.approved,
      });
    }
  };


  // Signs in a user with email and password 
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  // Signs up a user with email and password 
  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    // Ensure profile row exists post-signup
    if (data.user?.id) await fetchProfile(data.user.id, data.user.email ?? null);
    return null;
  };

  //logs out currently signed user 
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };


  // Refreshes the user's profile from the database 
  const refreshProfile = async () => {
    if (sessionUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      await fetchProfile(sessionUserId, user?.email ?? null);
    }
  };

  // Creates a memoized value for the AuthContext 
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


