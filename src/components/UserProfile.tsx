import { useState } from 'react';
import { User, LogOut, Settings, Crown, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AdminPanel } from './AdminPanel';

export function UserProfile() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  if (!user || !profile) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-white"
      >
        <User className="w-5 h-5" />
        <span className="font-medium">{profile.username}</span>
        {isAdmin() && <Crown className="w-4 h-4 text-yellow-400" />}
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">{profile.username}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
                {isAdmin() && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">Admin</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="mb-2 px-3 py-2">
              <p className="text-xs text-slate-400 mb-1">Account Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  profile.email_verified ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-sm text-slate-300">
                  {profile.email_verified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              </div>
            </div>

            {isAdmin() && (
              <button
                onClick={() => {
                  setAdminPanelOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-900/20 rounded-lg transition text-left"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            )}

            <button
              onClick={() => {/* TODO: Implement settings */}}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition text-left"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </div>
  );
}
