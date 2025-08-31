'use client';

import { Play, Square, Activity } from 'lucide-react';

interface LiveTrackingProps {
  isLiveTracking: boolean;
  onStart: () => void;
  onStop: () => void;
  pendingMatchesCount: number;
}

export default function LiveTracking({ 
  isLiveTracking, 
  onStart, 
  onStop, 
  pendingMatchesCount 
}: LiveTrackingProps) {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Activity className={`h-5 w-5 ${isLiveTracking ? 'text-green-500' : 'text-gray-400'}`} />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Live Tracking</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLiveTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className={`text-sm font-medium ${isLiveTracking ? 'text-green-600' : 'text-gray-500'}`}>
              {isLiveTracking ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-600">Pending Matches</p>
            <p className="text-lg font-semibold text-gray-900">{pendingMatchesCount}</p>
          </div>
          
          {isLiveTracking ? (
            <button
              onClick={onStop}
              className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1.5 px-3 rounded-md transition-colors duration-200 text-sm flex items-center"
            >
              <Square className="h-4 w-4 mr-1.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={pendingMatchesCount === 0}
              className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1.5 px-3 rounded-md transition-colors duration-200 text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4 mr-1.5" />
              Start
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How it works:</h3>
        <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
          <li>• Polls every 20 seconds for matches with status="pending" and watch=true</li>
          <li>• Monitors match status (kickoff, half-time, full-time)</li>
          <li>• Tracks live incidents (goals, cards, penalties)</li>
          <li>• Displays real-time updates in the backend console</li>
        </ul>
      </div>
    </div>
  );
}
