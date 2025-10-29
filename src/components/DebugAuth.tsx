import { useAuth } from '../contexts/AuthContext';

export function DebugAuth() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  return (
    <div className="fixed top-4 left-4 bg-red-900 border border-red-500 text-white p-4 rounded-lg text-sm max-w-md z-50">
      <h3 className="font-bold text-red-200 mb-2">🚨 DEBUG AUTH PANEL</h3>
      
      <div className="space-y-2">
        <div>
          <strong>User:</strong> {user ? `✅ ${user.email}` : '❌ Not signed in'}
        </div>
        
        <div>
          <strong>Profile:</strong> {profile ? `✅ ${profile.username}` : '❌ Missing'}
        </div>
        
        <div>
          <strong>User ID:</strong> {user?.id || 'N/A'}
        </div>
        
        {user && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={refreshProfile}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
            >
              🔄 Refresh Profile
            </button>
            
            <button
              onClick={signOut}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              🚪 Force Logout
            </button>
          </div>
        )}
        
        <div className="text-xs text-red-300 mt-2">
          Remove this component after debugging!
        </div>
      </div>
    </div>
  );
}
