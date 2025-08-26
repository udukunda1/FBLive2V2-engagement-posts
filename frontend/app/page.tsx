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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">FBLive 2 Dashboard</h1>
        <p className="text-lg text-gray-600">Manage and track live football matches</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Live Tracking Controls */}
      <LiveTracking
        isLiveTracking={isLiveTracking}
        onStart={handleStartLiveTracking}
        onStop={handleStopLiveTracking}
        pendingMatchesCount={matches.filter(m => m.status === 'pending' && m.watch).length}
      />

      {/* Match Search */}
      <MatchSearch onSearch={handleSearchMatch} />

      {/* Match List */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Matches</h2>
          <button
            onClick={loadMatches}
            disabled={loading}
            className="btn-secondary flex items-center"
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
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No matches found. Search for a match to get started.</p>
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
  );
}
