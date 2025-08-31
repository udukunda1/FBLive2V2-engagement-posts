'use client';

import { useState } from 'react';
import { Match } from '../types/match';
import { Eye, EyeOff, Trash2, Edit, Save, X, Calendar, Users, Clock } from 'lucide-react';

interface MatchListProps {
  matches: Match[];
  onToggleWatch: (id: string) => void;
  onRemoveMatch: (id: string) => void;
  onUpdateTeams: (id: string, data: { homeTeam?: string; awayTeam?: string; competition?: string }) => void;
}

export default function MatchList({ matches, onToggleWatch, onRemoveMatch, onUpdateTeams }: MatchListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ homeTeam: string; awayTeam: string; competition: string }>({
    homeTeam: '',
    awayTeam: '',
    competition: ''
  });

  const handleEdit = (match: Match) => {
    setEditingId(match._id);
    setEditData({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      competition: match.competition
    });
  };

  const handleSave = (id: string) => {
    onUpdateTeams(id, editData);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = (id: string) => {
    onRemoveMatch(id);
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const getStatusBadge = (status: string) => {
    return status === 'pending' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Ended
      </span>
    );
  };

  const getWatchBadge = (watch: boolean) => {
    return watch ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Watching
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Not Watching
      </span>
    );
  };

  const formatMatchDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return null;
    
    try {
      const date = new Date(dateTimeString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
      
      const timeString = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      if (isToday) {
        return `Today at ${timeString}`;
      } else if (isTomorrow) {
        return `Tomorrow at ${timeString}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
    } catch (error) {
      return null;
    }
  };

  const getMatchTimeStatus = (dateTimeString?: string) => {
    if (!dateTimeString) return null;
    
    try {
      const matchTime = new Date(dateTimeString);
      const now = new Date();
      const timeDiff = matchTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (timeDiff < 0) {
        // Match has already started or ended
        return { status: 'overdue', color: 'text-red-600', bgColor: 'bg-red-50' };
      } else if (hoursDiff <= 1) {
        // Match starts within 1 hour
        return { status: 'starting-soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
      } else if (hoursDiff <= 24) {
        // Match starts within 24 hours
        return { status: 'upcoming', color: 'text-blue-600', bgColor: 'bg-blue-50' };
      } else {
        // Match is far in the future
        return { status: 'future', color: 'text-gray-600', bgColor: 'bg-gray-50' };
      }
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {matches.map((match) => (
        <div key={match._id} className={`border border-gray-200 rounded-lg p-3 sm:p-4 ${match.matchDateTime ? getMatchTimeStatus(match.matchDateTime)?.bgColor || 'bg-white' : 'bg-white'}`}>
          {editingId === match._id ? (
            // Edit mode
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Team</label>
                  <input
                    type="text"
                    value={editData.homeTeam}
                    onChange={(e) => setEditData(prev => ({ ...prev, homeTeam: e.target.value }))}
                    className="input-field text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Away Team</label>
                  <input
                    type="text"
                    value={editData.awayTeam}
                    onChange={(e) => setEditData(prev => ({ ...prev, awayTeam: e.target.value }))}
                    className="input-field text-sm sm:text-base"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competition</label>
                  <input
                    type="text"
                    value={editData.competition}
                    onChange={(e) => setEditData(prev => ({ ...prev, competition: e.target.value }))}
                    className="input-field text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <button
                  onClick={() => handleSave(match._id)}
                  className="btn-success flex items-center justify-center text-sm sm:text-base"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary flex items-center justify-center text-sm sm:text-base"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="space-y-3 sm:space-y-0">
              {/* Action buttons at the top */}
              <div className="flex items-center justify-end gap-1 sm:gap-2">
                <button
                  onClick={() => onToggleWatch(match._id)}
                  className={`p-2 rounded-lg transition-colors ${
                    match.watch 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={match.watch ? 'Stop watching' : 'Start watching'}
                >
                  {match.watch ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={() => handleEdit(match)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Edit match"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleDeleteClick(match._id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Remove match"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {match.homeTeam} vs {match.awayTeam}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(match.status)}
                      {getWatchBadge(match.watch)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">Event ID: {match.eventID}</span>
                    </div>
                    {match.matchDateTime && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className={`font-medium truncate ${getMatchTimeStatus(match.matchDateTime)?.color || 'text-blue-600'}`}>
                          {formatMatchDateTime(match.matchDateTime)}
                        </span>
                      </div>
                    )}
                    {match.competition && (
                      <div className="flex items-center">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{match.competition}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
                    <span>Kickoff: {match.kickoffannounced ? '✓' : '✗'}</span>
                    <span>HT: {match.htannounced ? '✓' : '✗'}</span>
                    <span>FT: {match.ftannounced ? '✓' : '✗'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Match</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this match? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deleteConfirmId)}
                className="flex-1 btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
