export interface Match {
  _id: string;
  eventID: string;
  homeTeam: string;
  awayTeam: string;
  status: 'pending' | 'ended';
  watch: boolean;
  kickoffannounced: boolean;
  htannounced: boolean;
  ftannounced: boolean;
  competition: string;
  evaluatedIncidents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchSearchRequest {
  matchId: string;
}

export interface TeamUpdateRequest {
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
}

export interface LiveTrackingResponse {
  message: string;
  matches: Array<{
    eventID: string;
    homeTeam: string;
    awayTeam: string;
  }>;
}
