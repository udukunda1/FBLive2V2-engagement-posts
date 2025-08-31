'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';

interface MatchSearchProps {
  onSearch: (matchId: string) => void;
}

export default function MatchSearch({ onSearch }: MatchSearchProps) {
  const [matchId, setMatchId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId.trim()) return;

    setLoading(true);
    try {
      await onSearch(matchId.trim());
      setMatchId('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Search & Add Match</h2>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="matchId" className="block text-sm font-medium text-gray-700 mb-2">
            Match Event ID
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              id="matchId"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              placeholder="Enter match event ID from Livescore..."
              className="input-field pl-10 text-sm sm:text-base"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Enter the event ID from Livescore to search and add a match
          </p>
        </div>
        <button
          type="submit"
          disabled={!matchId.trim() || loading}
          className="btn-primary flex items-center justify-center w-full text-sm sm:text-base"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Match
            </>
          )}
        </button>
      </form>
    </div>
  );
}
