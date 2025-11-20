/*
READ THIS FIRST: 
This component is for the authentication panel that allows users to sign in or sign up.
Following features this file does:
- Shows a sign in/sign up form
- Allows users to sign in or sign up
- Shows a message if the user is already logged in
- Shows a loading message if the user is loading
*/

import { useState } from 'react'; //imports the useState hook from the react library 
import { useSimpleAuth } from '../context/SimpleAuthContext'; //imports the useSimpleAuth hook from the SimpleAuthContext file


//The AuthPanel component handles user authentication
export function AuthPanel() {
  const { profile, loading, signIn, signUp, signOut } = useSimpleAuth(); //logged in user info, loading state, sign in function, sign up function, and sign out function
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(''); //email input
  const [password, setPassword] = useState(''); //passw ord input
  const [error, setError] = useState<string | null>(null); //error message
  const [submitting, setSubmitting] = useState(false); //state for submitting form

  //if the user is loading, show a loading message
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-slate-300">Checking session...</div>
    );
  }

  //if the user is already logged in (profile already exists)m show their account info along with a sign out button 
  if (profile) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-slate-300 flex items-center justify-between">
        <div>
          <div className="text-white font-medium">{profile.email ?? 'Logged in'}</div>
          <div className="text-sm text-slate-400">Role: {profile.role} • {profile.approved ? 'Approved' : 'Pending approval'}</div>
        </div>
        <button onClick={signOut} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">Sign out</button>
      </div>
    );
  }

  //function to handle submission for both sign in and sign up forms 
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = mode === 'signin'
      ? await signIn(email, password) //if in signin mode, call signIn
      : await signUp(email, password); //if in signup mode, call signUp 
    if (err) setError(err);
    setSubmitting(false); //mark submission as done 
  };


  //This renders the sign in/sign up form which will only be visible if the user has not logged in yet. 
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-xl font-semibold">{mode === 'signin' ? 'Sign in' : 'Sign up'}</h3>
        <button
          className="text-sm text-blue-400 hover:text-blue-300"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Create account' : 'Have an account? Sign in'}
        </button>
      </div>

     
      <form onSubmit={onSubmit} className="space-y-4">

         {/* This is the email input field*/}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        {/* This is the password input field */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        {/* This is for the error message */} 
        {error && <div className="text-red-400 text-sm">{error}</div>} 
        
        {/* This is for the submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg"
        >
          {submitting ? 'Submitting...' : (mode === 'signin' ? 'Sign in' : 'Sign up')}
        </button>
      </form>
    </div>
  );
}


