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

export const startLiveMatches = async (req, res) => {
  try {
    // Find matches with status="pending" and watch=true
    const pendingMatches = await Match.find({ status: 'pending', watch: true });
    
    if (pendingMatches.length === 0) {
      return res.json({ message: 'No pending matches to watch' });
    }

    console.log(`Starting live tracking for ${pendingMatches.length} matches`);

    // Start polling every 20 seconds
    const pollInterval = setInterval(async () => {
      try {
        // Get current valid matches (status="pending" and watch=true)
        const currentMatches = await Match.find({ status: 'pending', watch: true });
        
        if (currentMatches.length === 0) {
          console.log('No more matches to track, stopping polling');
          clearInterval(pollInterval);
          return;
        }

        console.log(`Polling ${currentMatches.length} matches...`);

        // Process each match
        for (const match of currentMatches) {
          await processMatch(match);
        }
      } catch (error) {
        console.error('Error in polling cycle:', error);
      }
    }, 20000); // 20 seconds

    // Store the interval ID globally or in a way that can be accessed later if needed
    global.liveMatchesInterval = pollInterval;

    res.json({ 
      message: `Started live tracking for ${pendingMatches.length} matches`,
      matches: pendingMatches.map(m => ({ eventID: m.eventID, homeTeam: m.homeTeam, awayTeam: m.awayTeam }))
    });

  } catch (error) {
    console.error('Error starting live matches:', error);
    res.status(500).json({ error: 'Error starting live matches', details: error.message });
  }
};

export const stopLiveMatches = async (req, res) => {
  try {
    if (global.liveMatchesInterval) {
      clearInterval(global.liveMatchesInterval);
      global.liveMatchesInterval = null;
      console.log('Live matches polling stopped');
      res.json({ message: 'Live matches polling stopped' });
    } else {
      res.json({ message: 'No active live matches polling to stop' });
    }
  } catch (error) {
    console.error('Error stopping live matches:', error);
    res.status(500).json({ error: 'Error stopping live matches', details: error.message });
  }
};

async function processMatch(match) {
  try {
    // Send two requests: one for match status and one for incidents
    console.log(`Processing match ${match.eventID}`);

    const [statusResponse, incidentsResponse] = await Promise.all([
      axios.get(`https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${match.eventID}?locale=en`),
      axios.get(`https://prod-cdn-public-api.livescore.com/v1/api/app/incidents/soccer/${match.eventID}?locale=en`)
    ]);

    const matchStatus = statusResponse.data;
    const matchIncidents = incidentsResponse.data;

    // Check if match has started (Eps is not "NS")
    if (matchStatus.Eps && matchStatus.Eps !== "NS") {
      await handleMatchStatus(match, matchStatus);
      await handleMatchIncidents(match, matchStatus, matchIncidents);
    }
  } catch (error) {
    console.error(`Error processing match ${match.eventID}:`, error.message);
  }
}

async function handleMatchStatus(match, matchStatus) {
  // Facebook posting helper function
  const postToFacebook = async (message) => {
    const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
    const page_id = process.env.FACEBOOK_PAGE_ID;
    
    if (access_token && page_id) {
      try {
        const data = {
          message: message,
          access_token: access_token
        };
        const fbResponse = await axios.post(`https://graph.facebook.com/v23.0/${page_id}/feed`, null, { params: data });
        console.log(message + " - Posted to FB");
      } catch (error) {
        console.error("Error posting to Facebook:", error.response?.data || error.message);
      }
    }
    else {
      console.log("No access token or page ID found");
    }
  };

  // Check kickoff announcement
  if (!match.kickoffannounced) {
    const message = `Kick off: ${match.homeTeam} 0–0 ${match.awayTeam}`;
    console.log(message);
    
    // Post to Facebook
    await postToFacebook(message);
    
    match.kickoffannounced = true;
    await match.save();
  }

  // Check half-time announcement
  if (!match.htannounced && matchStatus.Eps === "HT") {
    const message = `⏸️ HT: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    console.log(message);
    
    // Post to Facebook
    await postToFacebook(message);
    
    match.htannounced = true;
    await match.save();
  }

  // Check full-time announcement
  if (!match.ftannounced && matchStatus.Eps === "FT") {
    const message = `🏁 FT: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    console.log(message);
    
    // Post to Facebook
    await postToFacebook(message);
    
    match.ftannounced = true;
    match.status = "ended";
    await match.save();
  }
}

async function handleMatchIncidents(match, matchStatus, matchIncidents) {
  if (!matchIncidents.Incs) return;

  let incidentsArray = [];
  let halfPrefix = "";

  // Determine which half we're in and get the appropriate incidents array
  if (matchStatus.Eps && typeof matchStatus.Eps === 'string' && matchStatus.Eps.includes("'")) {
    const minute = parseInt(matchStatus.Eps.replace("'", ""));
    
    if (minute >= 1 && minute <= 45) {
      // First half
      incidentsArray = matchIncidents.Incs[1] || [];
      halfPrefix = "1";
    } else if (minute >= 46 && minute <= 90) {
      // Second half
      incidentsArray = matchIncidents.Incs[2] || [];
      halfPrefix = "2";
    }
  }

  if (incidentsArray.length === 0) return;

  // Process each incident
  for (let i = 0; i < incidentsArray.length; i++) {
    const incident = incidentsArray[i];
    
    // Determine incident type (IT) for uniqueness
    let incidentType;
    if (!incident.IT && incident.Incs && incident.Incs[0] && incident.Incs[0].IT === 36) {
      // Goal with assist
      incidentType = 36;
    } else {
      // Other incidents
      incidentType = incident.IT;
    }
    
    const incidentId = `${halfPrefix}${i}_${incidentType}`;

    // Skip if incident already evaluated
    if (match.evaluatedIncidents.includes(incidentId)) {
      continue;
    }

    await evaluateIncident(match, incident, matchStatus, incidentId);
  }
}

async function evaluateIncident(match, incident, matchStatus, incidentId) {
  // Check if incident has last name (Ln) or player name (Pn) field
  let hasLastName = false;
  
  // For incidents with nested structure (goals with assists)
  if (!incident.IT && incident.Incs && incident.Incs[0] && (incident.Incs[0].Ln || incident.Incs[0].Pn)) {
    hasLastName = true;
  }
  // For direct incidents
  else if (incident.Ln || incident.Pn) {
    hasLastName = true;
  }
  
  // Define supported incident types
  const supportedIncidentTypes = [36, 37, 38, 39, 44, 45, 62];
  
  // Get the actual incident type (handle goal with assist case)
  const actualIncidentType = !incident.IT && incident.Incs && incident.Incs[0] ? incident.Incs[0].IT : incident.IT;
  
  // Skip incident if it's not a supported type or if no last name found (except VAR checks)
  if (!supportedIncidentTypes.includes(actualIncidentType) || (!hasLastName && actualIncidentType !== 62)) {
    // Only log when no last name found, skip logging for unsupported types
    if (supportedIncidentTypes.includes(actualIncidentType) && !hasLastName && actualIncidentType !== 62) {
      console.log(`Skipping incident ${incidentId} - no last name or player name found`);
    }
    return;
  }

  // Add incident to evaluated list
  match.evaluatedIncidents.push(incidentId);
  await match.save();

  // Helper function to format minute with added time
  const formatMinute = (incident) => {
    return incident.MinEx ? `${incident.Min}+${incident.MinEx}'` : `${incident.Min}'`;
  };

  // Helper function to format player name with optional first initial
  const formatPlayerName = (player) => {
    const playerName = player.Ln || player.Pn; // Use Ln as primary, Pn as fallback
    return player.Fn && player.Fn[0] ? `${player.Fn[0]}. ${playerName}` : playerName;
  };

  // Facebook posting helper function
  const postToFacebook = async (message) => {
    const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
    const page_id = process.env.FACEBOOK_PAGE_ID;
    
    if (access_token && page_id) {
      try {
        const data = {
          message: message,
          access_token: access_token
        };
        const fbResponse = await axios.post(`https://graph.facebook.com/v23.0/${page_id}/feed`, null, { params: data });
        console.log(message + " - Posted to FB");
      } catch (error) {
        console.error("Error posting to Facebook:", error.response?.data || error.message);
      }
    }
    else {
      console.log("No access token or page ID found");
    }
  };

  // Handle different incident types
  if (!incident.IT && incident.Incs && incident.Incs[0] && incident.Incs[0].IT === 36) {
    // Goal with assist
    const scoreMessage = `⏱️Live: ${match.homeTeam} ${incident.Incs[0].Sc[0]}–${incident.Incs[0].Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident.Incs[0])} (${formatMinute(incident)})`;
    const assistMessage = `🅰️ ${formatPlayerName(incident.Incs[1])}`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    console.log(assistMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${goalMessage}\n${assistMessage}`);
  } else if (incident.IT === 36) {
    // Goal
    const scoreMessage = `⏱️Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${goalMessage}`);
  } else if (incident.IT === 37) {
    // Penalty goal
    const scoreMessage = `⏱️Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident)} (Penalty) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${goalMessage}`);
  } else if (incident.IT === 38) {
    // Missed penalty
    const scoreMessage = `⏱️Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const penaltyMessage = `❌ ${formatPlayerName(incident)} (Missed Penalty) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(penaltyMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${penaltyMessage}`);
  } else if (incident.IT === 39) {
    // Own goal
    const scoreMessage = `⏱️ Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident)} (OG) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${goalMessage}`);
  } else if (incident.IT === 62) {
    // VAR check - no goal
    const varMessage = `🚨VAR CHECK🚨`;
    const scoreMessage = `⏱️ Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const decisionMessage = `❌ ${incident.Fn && incident.Ln ? `${formatPlayerName(incident)} (${incident.IR})` : `${incident.IR}` } (${formatMinute(incident)})`;
    
    console.log(varMessage);
    console.log(scoreMessage);
    console.log(decisionMessage);
    
    // Post to Facebook
    await postToFacebook(`${varMessage}\n${scoreMessage}\n\n${decisionMessage}`);
  } else if (incident.IT === 45) {
    // Red card
    const scoreMessage = `⏱️ Live: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const cardMessage = `🟥 Red Card: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(cardMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${cardMessage}`);
  } else if (incident.IT === 44) {
    // Second yellow = red card
    const scoreMessage = `⏱️ Live: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const yellowMessage = `🟨🟨 = 🟥`;
    const cardMessage = `Red Card: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(yellowMessage);
    console.log(cardMessage);
    
    // Post to Facebook
    await postToFacebook(`${scoreMessage}\n\n${yellowMessage}\n${cardMessage}`);
  }
}
