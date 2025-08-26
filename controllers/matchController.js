import Match from '../models/Match.js';
import axios from 'axios';

export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching matches', details: error.message });
  }
};

export const removeMatch = async (req, res) => {
  try {
    const result = await Match.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting match', details: error.message });
  }
};

export const toggleWatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    match.watch = !match.watch;
    await match.save();
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling watch', details: error.message });
  }
};

export const updateTeamNames = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeTeam, awayTeam, competition } = req.body;
    
    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (typeof homeTeam === 'string' && homeTeam.trim()) {
      match.homeTeam = homeTeam.trim();
    }
    if (typeof awayTeam === 'string' && awayTeam.trim()) {
      match.awayTeam = awayTeam.trim();
    }
    if (typeof competition === 'string') {
      match.competition = competition.trim();
    }
    await match.save();
    
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'Error updating team names', details: error.message });
  }
};

export const searchAndSaveMatch = async (req, res) => {
  const { matchId } = req.body;
  
  if (!matchId) {
    return res.status(400).json({ error: 'matchId is required' });
  }

  try {
    // Check if match already exists
    let match = await Match.findOne({ eventID: matchId });
    if (match) {
      return res.json(match);
    }

    // Fetch match data from Livescore API
    const response = await axios.get(`https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${matchId}?locale=en`);
    
    const matchData = response.data;
    
    if (!matchData || !matchData.T1 || !matchData.T2) {
      return res.status(404).json({ error: 'Match not found or invalid data' });
    }

    // Create new match with data from Livescore API
    match = new Match({
      eventID: matchId,
      homeTeam: matchData.T1[0].Nm,
      awayTeam: matchData.T2[0].Nm,
      competition: matchData.Stg?.Snm || '',
      status: 'pending',
      watch: false,
      kickoffannounced: false,
      htannounced: false,
      ftannounced: false
    });

    await match.save();
    res.json(match);
  } catch (error) {
    console.error('Error searching or saving match:', error.message);
    res.status(500).json({ 
      error: 'Error searching or saving match', 
      details: error.message 
    });
  }
};
