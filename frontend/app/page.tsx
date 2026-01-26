'use client';

import { useState, useEffect } from 'react';

interface Team {
  _id: string;
  name: string;
  nickname: string;
  livescoreId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface Match {
  _id: string;
  eventID: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  matchDateTime: string;
  competition: string;
  status: string;
  priority: number;
  skippedReason: string;
  watch: boolean;
  kickoffannounced: boolean;
  htannounced: boolean;
  ftannounced: boolean;
  evaluatedIncidents: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'matches'>('teams');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', nickname: '', livescoreId: '', priority: 5 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000); // Refresh matches every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });

      if (res.ok) {
        setNewTeam({ name: '', nickname: '', livescoreId: '', priority: 5 });
        setIsAddingTeam(false);
        fetchTeams();
      }
    } catch (error) {
      console.error('Error adding team:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const updateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${editingTeam._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTeam.name,
          nickname: editingTeam.nickname,
          livescoreId: editingTeam.livescoreId,
          priority: editingTeam.priority,
        }),
      });

      if (res.ok) {
        setEditingTeam(null);
        fetchTeams();
      }
    } catch (error) {
      console.error('Error updating team:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,  // 24-hour format
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            ⚽ FBLive2 <span className="text-purple-400">V2</span>
          </h1>
          <p className="text-slate-300">Automated Football Match Tracking System</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'teams'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            🎯 Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'matches'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            📅 Matches ({matches.length})
          </button>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {/* Add Team Button */}
            {!isAddingTeam && (
              <button
                onClick={() => setIsAddingTeam(true)}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-green-500/50"
              >
                ➕ Add New Team
              </button>
            )}

            {/* Add Team Form */}
            {isAddingTeam && (
              <form onSubmit={addTeam} className="bg-slate-800 rounded-lg p-6 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4">Add New Team</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Team Name (e.g., Manchester United)"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nickname (e.g., Man Utd)"
                    value={newTeam.nickname}
                    onChange={(e) => setNewTeam({ ...newTeam, nickname: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Livescore ID (optional)"
                    value={newTeam.livescoreId}
                    onChange={(e) => setNewTeam({ ...newTeam, livescoreId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      ⭐ Priority (1=highest, 10=lowest)
                    </label>
                    <select
                      value={newTeam.priority}
                      onChange={(e) => setNewTeam({ ...newTeam, priority: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? '(Highest)' : num === 10 ? '(Lowest)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Team'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTeam(false);
                        setNewTeam({ name: '', nickname: '', livescoreId: '', priority: 5 });
                      }}
                      className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Teams List */}
            <div className="grid gap-4">
              {teams.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-12 text-center">
                  <p className="text-slate-400 text-lg">No teams added yet. Add your first team to start tracking matches!</p>
                </div>
              ) : (
                teams.map((team) => (
                  <div key={team._id}>
                    {editingTeam?._id === team._id ? (
                      // Edit Form
                      <form onSubmit={updateTeam} className="bg-slate-800 rounded-lg p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4">Edit Team</h3>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Team Name"
                            value={editingTeam.name}
                            onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Nickname"
                            value={editingTeam.nickname}
                            onChange={(e) => setEditingTeam({ ...editingTeam, nickname: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Livescore ID"
                            value={editingTeam.livescoreId}
                            onChange={(e) => setEditingTeam({ ...editingTeam, livescoreId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                          <div>
                            <label className="block text-sm text-slate-300 mb-2">
                              ⭐ Priority (1=highest, 10=lowest)
                            </label>
                            <select
                              value={editingTeam.priority}
                              onChange={(e) => setEditingTeam({ ...editingTeam, priority: parseInt(e.target.value) })}
                              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? '(Highest)' : num === 10 ? '(Lowest)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50"
                            >
                              {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTeam(null)}
                              className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      // Team Card
                      <div className="bg-slate-800 rounded-lg p-6 shadow-lg hover:shadow-purple-500/20 transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1">
                              {team.nickname || team.name}
                            </h3>
                            {team.nickname && (
                              <p className="text-slate-400 text-sm">Full name: {team.name}</p>
                            )}
                            {team.livescoreId && (
                              <p className="text-slate-500 text-xs mt-1">ID: {team.livescoreId}</p>
                            )}
                            <div className="mt-2">
                              <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                ⭐ Priority: {team.priority}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTeam(team)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteTeam(team._id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <p className="text-slate-400 text-lg mb-2">No matches scheduled</p>
                <p className="text-slate-500 text-sm">Matches will appear here after the daily task runs at 00:00 UTC</p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match._id}
                  className="bg-slate-800 rounded-lg p-6 shadow-lg hover:shadow-purple-500/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                      {match.competition}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {formatDateTime(match.matchDateTime)}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <span className="text-2xl font-bold text-white">{match.homeTeam}</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-2xl font-bold text-white">{match.awayTeam}</span>
                    </div>
                    {/* Status badges */}
                    <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${match.status === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : match.status === 'ended'
                          ? 'bg-gray-600 text-white'
                          : match.status === 'skipped'
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                        {match.status.toUpperCase()}
                      </span>
                      {match.watch && (
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                          👁️ WATCHING
                        </span>
                      )}
                      {match.kickoffannounced && (
                        <span className="px-2 py-1 bg-green-500 text-white rounded text-xs">⚽ Kickoff</span>
                      )}
                      {match.htannounced && (
                        <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs">🚩 HT</span>
                      )}
                      {match.ftannounced && (
                        <span className="px-2 py-1 bg-red-500 text-white rounded text-xs">🏁 FT</span>
                      )}
                    </div>

                    {/* Skip reason */}
                    {match.status === 'skipped' && match.skippedReason && (
                      <div className="bg-red-900/30 border border-red-600 rounded-lg p-2 mb-3">
                        <p className="text-red-300 text-xs text-center">
                          ⚠️ {match.skippedReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Match details */}
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <div>
                        <span className="font-semibold">Event ID:</span> {match.eventID}
                      </div>
                      {match.homeTeamId && (
                        <div>
                          <span className="font-semibold">Tracked:</span> {match.homeTeam}
                          {match.awayTeamId && ` & ${match.awayTeam}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>🤖 Automated by FBLive2 V2 • Updates every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
