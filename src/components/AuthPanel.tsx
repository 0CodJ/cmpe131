import { useState } from 'react';
import { useSimpleAuth } from '../context/SimpleAuthContext';

export function AuthPanel() {
  const { profile, loading, signIn, signUp, signOut } = useSimpleAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-slate-300">Checking session...</div>
    );
  }

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    if (err) setError(err);
    setSubmitting(false);
  };

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
        {error && <div className="text-red-400 text-sm">{error}</div>}
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


