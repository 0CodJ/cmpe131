import { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface HistoricalEvent {
  id: string;
  title: string;
  description: string;
  month: number;
  day: number;
  year: number;
  category: string;
}

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: HistoricalEvent | null;
  onSuggestionSubmitted: () => void;
}

export function SuggestionModal({ isOpen, onClose, event, onSuggestionSubmitted }: SuggestionModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [suggestedChanges, setSuggestedChanges] = useState({
    title: event?.title || '',
    description: event?.description || '',
    month: event?.month || 1,
    day: event?.day || 1,
    year: event?.year || new Date().getFullYear(),
    category: event?.category || 'General',
  });

  const [changeReason, setChangeReason] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const categories = ['General', 'Science', 'Politics', 'History', 'Technology', 'Arts', 'Economics'];

  // Reset form when modal opens/closes
  useState(() => {
    if (isOpen && event) {
      setSuggestedChanges({
        title: event.title,
        description: event.description,
        month: event.month,
        day: event.day,
        year: event.year,
        category: event.category,
      });
      setChangeReason('');
      setError('');
      setSuccess(false);
    }
  });

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      setError('You must be logged in to submit suggestions');
      return;
    }

    if (!changeReason.trim()) {
      setError('Please provide a reason for the suggested changes');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const suggestionData = {
        user_id: profile.id,
        event_id: event.id,
        suggested_changes: suggestedChanges,
        original_data: {
          title: event.title,
          description: event.description,
          month: event.month,
          day: event.day,
          year: event.year,
          category: event.category,
        },
        admin_notes: changeReason, // We'll use admin_notes to store the user's reason initially
        status: 'pending'
      };

      const { error: submitError } = await supabase
        .from('suggestions')
        .insert([suggestionData]);

      if (submitError) {
        console.error('Error submitting suggestion:', submitError);
        setError('Failed to submit suggestion. Please try again.');
        return;
      }

      setSuccess(true);
      onSuggestionSubmitted();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-700">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Suggestion Submitted!</h2>
          <p className="text-slate-300">
            Your suggestion has been sent to the administrators for review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Suggest Changes</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!user && (
          <div className="p-6 bg-yellow-900/20 border-b border-yellow-600/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <p className="text-yellow-300">You must be logged in to submit suggestions.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Event */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Original Event</h3>
              <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                <div>
                  <label className="text-sm text-slate-400">Title</label>
                  <p className="text-white">{event.title}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Description</label>
                  <p className="text-white">{event.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm text-slate-400">Month</label>
                    <p className="text-white">{months[event.month - 1]}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Day</label>
                    <p className="text-white">{event.day}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Year</label>
                    <p className="text-white">{event.year}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Category</label>
                  <p className="text-white">{event.category}</p>
                </div>
              </div>
            </div>

            {/* Suggested Changes */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Suggested Changes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={suggestedChanges.title}
                    onChange={(e) => setSuggestedChanges({ ...suggestedChanges, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={suggestedChanges.description}
                    onChange={(e) => setSuggestedChanges({ ...suggestedChanges, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Month
                    </label>
                    <select
                      value={suggestedChanges.month}
                      onChange={(e) => setSuggestedChanges({ ...suggestedChanges, month: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      {months.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Day
                    </label>
                    <select
                      value={suggestedChanges.day}
                      onChange={(e) => setSuggestedChanges({ ...suggestedChanges, day: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={suggestedChanges.year}
                      onChange={(e) => setSuggestedChanges({ ...suggestedChanges, year: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={suggestedChanges.category}
                    onChange={(e) => setSuggestedChanges({ ...suggestedChanges, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Reason for changes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason for Suggested Changes *
            </label>
            <textarea
              required
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              placeholder="Please explain why you think these changes should be made..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !user}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Suggestion
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
