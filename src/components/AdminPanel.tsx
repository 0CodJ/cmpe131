import { useState, useEffect } from 'react';
import { Shield, Check, X, Eye, Users, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Suggestion {
  id: string;
  user_id: string;
  event_id: string;
  suggested_changes: any;
  original_data: any;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  created_at: string;
  profiles?: {
    username: string;
  };
  historical_events?: {
    title: string;
  };
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { isAdmin } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAdmin()) {
      fetchSuggestions();
    }
  }, [isOpen, activeTab]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('suggestions')
        .select(`
          *,
          profiles!suggestions_user_id_fkey(username),
          historical_events(title)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error('Error in fetchSuggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionAction = async (
    suggestionId: string, 
    action: 'approve' | 'reject',
    adminNotes?: string
  ) => {
    setProcessingId(suggestionId);
    
    try {
      if (action === 'approve') {
        // Find the suggestion to get the data
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;

        // Update the historical event with the suggested changes
        const { error: updateError } = await supabase
          .from('historical_events')
          .update(suggestion.suggested_changes)
          .eq('id', suggestion.event_id);

        if (updateError) {
          console.error('Error updating historical event:', updateError);
          alert('Failed to approve suggestion');
          return;
        }
      }

      // Update suggestion status
      const { error } = await supabase
        .from('suggestions')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error updating suggestion:', error);
        return;
      }

      // Refresh suggestions
      await fetchSuggestions();
    } catch (error) {
      console.error('Error in handleSuggestionAction:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen || !isAdmin()) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Pending ({suggestions.filter(s => s.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              All Suggestions ({suggestions.length})
            </button>
          </div>

          {/* Suggestions List */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-slate-400">Loading suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  {activeTab === 'pending' ? 'No pending suggestions' : 'No suggestions found'}
                </p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`bg-slate-900/50 rounded-xl p-6 border ${
                    suggestion.status === 'pending' 
                      ? 'border-yellow-500/30' 
                      : suggestion.status === 'approved'
                      ? 'border-green-500/30'
                      : 'border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Suggestion for: {suggestion.historical_events?.title || 'Unknown Event'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {suggestion.profiles?.username || 'Unknown User'}
                        </div>
                        <span>
                          {new Date(suggestion.created_at).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          suggestion.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : suggestion.status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {suggestion.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {suggestion.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'approve')}
                          disabled={processingId === suggestion.id}
                          className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition text-sm font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'reject')}
                          disabled={processingId === suggestion.id}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm font-medium flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Data */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Original</h4>
                      <div className="bg-slate-800 rounded-lg p-3 text-sm">
                        <p className="text-white font-medium mb-1">
                          {suggestion.original_data?.title}
                        </p>
                        <p className="text-slate-300 text-xs mb-2">
                          {suggestion.original_data?.description}
                        </p>
                        <div className="text-slate-400 text-xs">
                          {suggestion.original_data?.month}/{suggestion.original_data?.day}/{suggestion.original_data?.year} • 
                          {suggestion.original_data?.category}
                        </div>
                      </div>
                    </div>

                    {/* Suggested Changes */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Suggested</h4>
                      <div className="bg-slate-700 rounded-lg p-3 text-sm">
                        <p className="text-white font-medium mb-1">
                          {suggestion.suggested_changes?.title}
                        </p>
                        <p className="text-slate-300 text-xs mb-2">
                          {suggestion.suggested_changes?.description}
                        </p>
                        <div className="text-slate-400 text-xs">
                          {suggestion.suggested_changes?.month}/{suggestion.suggested_changes?.day}/{suggestion.suggested_changes?.year} • 
                          {suggestion.suggested_changes?.category}
                        </div>
                      </div>
                    </div>
                  </div>

                  {suggestion.admin_notes && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-1">Reason/Notes</h4>
                      <p className="text-slate-400 text-sm bg-slate-800 rounded-lg p-3">
                        {suggestion.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
