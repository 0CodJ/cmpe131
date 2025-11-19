import { useEffect, useState } from 'react';
import { useSimpleAuth } from '../context/SimpleAuthContext';
import { approveEvent, denyEvent, listPending as listPendingEvents } from '../lib/localEvents';

type PendingUser = {
  id: string;
  email: string | null;
  role: string | null;
  approved: boolean | null;
};

export function AdminDashboard() {
  const { profile, listPendingUsers, approveUser } = useSimpleAuth();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [pendingEvents, setPendingEvents] = useState<ReturnType<typeof listPendingEvents>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = listPendingUsers();
      setPending(data as PendingUser[]);
      setPendingEvents(listPendingEvents());
    } catch (e: any) {
      setError(e?.message || 'Failed to load pending users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const approve = async (userId: string) => {
    approveUser(userId);
    await fetchPending();
  };

  const approveEvt = async (eventId: string) => {
    approveEvent(eventId);
    await fetchPending();
  };

  const denyEvt = async (eventId: string) => {
    denyEvent(eventId);
    await fetchPending();
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-200 p-4 rounded-xl">Access denied. Admins only.</div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-2xl font-semibold">Admin Dashboard</h3>
        <button onClick={fetchPending} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">Refresh</button>
      </div>
      {loading && <div className="text-slate-300">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-white font-semibold mb-2">Pending Users</h4>
          {pending.length === 0 ? (
            <div className="text-slate-400">No pending users.</div>
          ) : (
            <div className="space-y-3">
              {pending.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-xl p-3">
                  <div>
                    <div className="text-white">{u.email ?? u.id}</div>
                    <div className="text-xs text-slate-400">role: {u.role ?? 'user'} • approved: {String(u.approved)}</div>
                  </div>
                  <button onClick={() => approve(u.id)} className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white">Approve</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-white font-semibold mb-2">Pending Events</h4>
          {pendingEvents.length === 0 ? (
            <div className="text-slate-400">No pending events.</div>
          ) : (
            <div className="space-y-3">
              {pendingEvents.map(evt => (
                <div key={evt.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-3">
                  <div className="text-white font-medium">{evt.title}</div>
                  <div className="text-slate-300 text-sm mb-2">{evt.description}</div>
                  <div className="text-xs text-slate-400 mb-3">{evt.month}/{evt.day}/{evt.year} • {evt.category}</div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => approveEvt(evt.id)} className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white">Approve</button>
                    <button onClick={() => denyEvt(evt.id)} className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white">Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


