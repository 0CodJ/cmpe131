/*
READ THIS FIRST: 
This component is for the admin dashboard that allows admins to approve or deny users and events.
Following features this file does:
- Shows a list of pending users and events waiting for admin approval
- Allows admins to approve or deny users and events
- Refreshes the list of pending users and events when the page is loaded
- Shows a message if there are no pending users or events
*/


import { useEffect, useState } from 'react'; //imports the useEffect and useState hooks from the react library 
import { useSimpleAuth } from '../context/SimpleAuthContext'; //used to access current user info
import { approveEvent, denyEvent, listPending as listPendingEvents } from '../lib/localEvents'; //used to approve and deny events and list pending events


//type definition for pending users waiting for admin approval 
type PendingUser = { 
  id: string;
  email: string | null;
  role: string | null;
  approved: boolean | null;
};


//This whole block is for the admin dashboard. This allows admin to approve or deny users and events. 
export function AdminDashboard() {
  const { profile, listPendingUsers, approveUser } = useSimpleAuth(); //logged in user info, list of users waiting approval, and function to approve user
  const [pending, setPending] = useState<PendingUser[]>([]); //list of users waiting approval
  const [pendingEvents, setPendingEvents] = useState<ReturnType<typeof listPendingEvents>>([]); //list of events waiting approval
  const [loading, setLoading] = useState(false); //state for loading data 
  const [error, setError] = useState<string | null>(null); //error message if something goes wrong 


  //Fetch all pending users and events from local storage 
  const fetchPending = async () => {
    setLoading(true); //show loading indicator while getting data 
    setError(null); //clear any previous errors 
    try {
      const data = listPendingUsers(); //get list of users waiting approval 
      setPending(data as PendingUser[]); //update state with pending users (as PendingUser[] which tells TypeScript the type of the data)
      setPendingEvents(listPendingEvents()); //get list of events waiting approval 
    } catch (e: any) {
      setError(e?.message || 'Failed to load pending users');
    }
    setLoading(false); //turn off loading indicator when done 
  };

  
  useEffect(() => {
    fetchPending(); //fetch pending users and events when component mounts 
  }, []);

  const approve = async (userId: string) => {
    approveUser(userId); //approve the user (status gets updated in local storage)
    await fetchPending(); //refreeshes the list of pending users and events 
  };

  const approveEvt = async (eventId: string) => {
    approveEvent(eventId); //approve the event (status gets updated in local storage)
    await fetchPending(); //refreeshes the list of pending users and events 
  };

  const denyEvt = async (eventId: string) => {
    denyEvent(eventId); //deny the event (status gets updated in local storage)
    await fetchPending(); //refreeshes the list of pending users and events 
  };


  //if the user is not an admin, show an access denied message 
  if (!profile || profile.role !== 'admin') { 
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-200 p-4 rounded-xl">Access denied. Admins only.</div>
    );
  }


  //UI of admin dashboard to render on screen 
  return (
    <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 border border-slate-700">
      {/* Header section with title and refresh button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-2xl font-semibold">Admin Dashboard</h3>
        <button onClick={fetchPending} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">Refresh</button>
      </div>

      {/* Loading and error (if any) messages */}
      {loading && <div className="text-slate-300">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}


      {/* Grid layout for pending users and events. Pending users on the left, pending events on the right */}
      <div className="grid md:grid-cols-2 gap-6"> 

        {/* Users section */}
        <div>
          <h4 className="text-white font-semibold mb-2">Pending Users</h4>

          {/* If there are no pending users, show a message */}
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


        {/* Events section */}
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


