import axios from 'axios';
import { Match, MatchSearchRequest, TeamUpdateRequest, LiveTrackingResponse } from '../types/match';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Match API functions
export const matchApi = {
  // Get all matches
  getAllMatches: async (): Promise<Match[]> => {
    const response = await api.get('/matches');
    return response.data;
  },

  // Search and save match
  searchAndSaveMatch: async (matchId: string): Promise<Match> => {
    const response = await api.post('/match/search', { matchId });
    return response.data;
  },

  // Remove match
  removeMatch: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/match/${id}`);
    return response.data;
  },

  // Toggle watch status
  toggleWatch: async (id: string): Promise<Match> => {
    const response = await api.patch(`/match/${id}/toggle-watch`);
    return response.data;
  },

  // Update team names
  updateTeamNames: async (id: string, data: TeamUpdateRequest): Promise<Match> => {
    const response = await api.patch(`/match/${id}/teams`, data);
    return response.data;
  },

  // Start live tracking
  startLiveMatches: async (): Promise<LiveTrackingResponse> => {
    const response = await api.post('/matches/start-live');
    return response.data;
  },

  // Stop live tracking
  stopLiveMatches: async (): Promise<{ message: string }> => {
    const response = await api.post('/matches/stop-live');
    return response.data;
  },
};

export default api;
