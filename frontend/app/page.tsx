'use client';

import { useState, useEffect } from 'react';
import { Match } from '../types/match';
import { matchApi } from '../lib/api';
import MatchSearch from '../components/MatchSearch';
import MatchList from '../components/MatchList';
import LiveTracking from '../components/LiveTracking';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  // Load matches on component mount
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await matchApi.getAllMatches();
      setMatches(data);
    } catch (err) {
      setError('Failed to load matches');
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMatch = async (matchId: string) => {
    try {
      setError(null);
      setSuccess(null);
      const newMatch = await matchApi.searchAndSaveMatch(matchId);
      
      // Check if match already exists in the list
      const exists = matches.find(m => m._id === newMatch._id);
      if (!exists) {
        setMatches(prev => [...prev, newMatch]);
        setSuccess(`Match "${newMatch.homeTeam} vs ${newMatch.awayTeam}" added successfully!`);
      } else {
        setSuccess('Match already exists in the list');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search match');
    }
  };

  const handleToggleWatch = async (id: string) => {
    try {
      setError(null);
      const updatedMatch = await matchApi.toggleWatch(id);
      setMatches(prev => prev.map(m => m._id === id ? updatedMatch : m));
      setSuccess(`Watch status updated for ${updatedMatch.homeTeam} vs ${updatedMatch.awayTeam}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle watch status');
    }
  };

  const handleRemoveMatch = async (id: string) => {
    try {
      setError(null);
      await matchApi.removeMatch(id);
      setMatches(prev => prev.filter(m => m._id !== id));
      setSuccess('Match removed successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove match');
    }
  };

  const handleUpdateTeams = async (id: string, data: { homeTeam?: string; awayTeam?: string; competition?: string }) => {
    try {
      setError(null);
      const updatedMatch = await matchApi.updateTeamNames(id, data);
      setMatches(prev => prev.map(m => m._id === id ? updatedMatch : m));
      setSuccess('Team names updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update team names');
    }
  };

  const handleStartLiveTracking = async () => {
    try {
      setError(null);
      const response = await matchApi.startLiveMatches();
      setIsLiveTracking(true);
      setSuccess(response.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start live tracking');
    }
  };

  const handleStopLiveTracking = async () => {
    try {
      setError(null);
      const response = await matchApi.stopLiveMatches();
      setIsLiveTracking(false);
      setSuccess(response.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to stop live tracking');
    }
  };

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Notifications */}
        {error && (
          <div className="flex items-center p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg mb-4 sm:mb-6">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="text-sm sm:text-base text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg mb-4 sm:mb-6">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="text-sm sm:text-base text-green-700">{success}</span>
          </div>
        )}

        {/* Responsive Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Controls and Search */}
          <div className="space-y-4 sm:space-y-6 order-2 xl:order-1">
            {/* Match Search */}
            <MatchSearch onSearch={handleSearchMatch} />
            
            {/* Live Tracking Controls */}
            <LiveTracking
              isLiveTracking={isLiveTracking}
              onStart={handleStartLiveTracking}
              onStop={handleStopLiveTracking}
              pendingMatchesCount={matches.filter(m => m.status === 'pending' && m.watch).length}
            />
          </div>

          {/* Right Column - Matches */}
          <div className="space-y-4 sm:space-y-6 order-1 xl:order-2">
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Matches</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {loading ? '...' : matches.length} {matches.length === 1 ? 'match' : 'matches'}
                  </p>
                </div>
                <button
                  onClick={loadMatches}
                  disabled={loading}
                  className="btn-secondary flex items-center justify-center sm:justify-start w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-sm sm:text-base text-gray-600">Loading matches...</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No matches found. Search for a match to get started.</p>
                </div>
              ) : (
                <MatchList
                  matches={matches}
                  onToggleWatch={handleToggleWatch}
                  onRemoveMatch={handleRemoveMatch}
                  onUpdateTeams={handleUpdateTeams}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
