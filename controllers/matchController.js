import Match from '../models/Match.js';
import axios from 'axios';

// Reusable helpers for Facebook interactions and Gemini-generated comments
async function postToFacebook(message) {
  const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
  const page_id = process.env.FACEBOOK_PAGE_ID;
  if (!access_token || !page_id) {
    console.log('No access token or page ID found');
    return null;
  }
  try {
    const data = { message, access_token };
    const fbResponse = await axios.post(`https://graph.facebook.com/v23.0/${page_id}/feed`, null, { params: data });
    const postId = fbResponse?.data?.id || null;
    console.log(message + ' - Posted to FB' + (postId ? ` (id: ${postId})` : ''));
    return postId;
  } catch (error) {
    console.error('Error posting to Facebook:', error.response?.data || error.message);
    return null;
  }
}

async function generateGeminiComment(updateText, competition) {
  let comment = null;

  // Context-aware fallback generator based on the update text
  const craftFallbackComment = (text) => {
    const normalized = (text || '').trim();
    const lower = normalized.toLowerCase();
    const has = (s) => lower.includes(s);

    // Try to extract team names from patterns like "TeamA 1–0 TeamB"
    let home = '';
    let away = '';
    try {
      const m = normalized.match(/([A-Za-z .]+)\s+\d+\s*[–-]\s*\d+\s+([A-Za-z .]+)/);
      if (m) {
        home = m[1].trim();
        away = m[2].trim();
      }
    } catch (_) {}

    if (has('var')) return 'VAR drama—fair or harsh? What do you think today?';
    if (has('red card')) return 'Red card changes everything—was it deserved? Your thoughts?';
    if (has('yellow card')) return 'Discipline matters—smart fouls or needless cards? Share your take.';
    if (has('kick off') || has('kickoff')) {
      if (home && away) return `Game on—${home} vs ${away}! Who takes the win?`;
      return 'Game on! Who takes the win today—home or away?';
    }
    if (has('ht')) return 'Halftime—what adjustments would you make for the comeback?';
    if (has('aet') || has('ft') || has('pen:') || has('after extra time')) return 'Full-time—player of the match? Drop your pick below!';
    if (has('goal') || has('live')) {
      if (home && away) return `Momentum shift—${home} or ${away} now in control?`;
      return 'What a moment—who grabs momentum now? Thoughts below, fans?';
    }
    // Generic engaging fallback (~10 words)
    return 'Big moment—what do you think? Confidence levels right now?';
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const body = {
        contents: [
          {
            parts: [
              {
                text: `Competition: ${competition || 'Unknown'}\nWrite a short, engaging 10 words comment for Facebook fans based on this football update: "${updateText}". Make it either a question or a compliment (choose one). (reply with the comment only)`
              }
            ]
          }
        ]
      };
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
        body,
        {
          headers: { 'Content-Type': 'application/json' },
          params: { 'key': apiKey }
        }
      );
      const result = response?.data;
      const candidate = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (candidate) {
        comment = candidate;
        console.log('✅ Gemini comment added:', comment);
      } else {
        console.log('⚠️ Gemini API returned no candidates');
      }
    } else {
      console.log('Gemini api key undefined:', apiKey);
    }
  } catch (error) {
    console.log('⚠️ Gemini API error, try use fallback comment', error.message);
  }

  if (!comment) comment = craftFallbackComment(updateText);
  return comment;
}

async function likeAndCommentOnFacebook(postId, updateText, competition) {
  const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!postId || !access_token) return;
  try {
    // Like the post
    await axios.post(`https://graph.facebook.com/v23.0/${postId}/likes`, null, { params: { access_token } });
  } catch (err) {
    console.log('⚠️ Error liking post:', err.response?.data || err.message);
  }
  try {
    // Generate comment and post it
    const commentText = await generateGeminiComment(updateText, competition);
    if (commentText) {
      await axios.post(`https://graph.facebook.com/v23.0/${postId}/comments`, null, {
        params: { access_token, message: commentText }
      });
    }
  } catch (err) {
    console.log('⚠️ Error commenting on post:', err.response?.data || err.message);
  }
}

export const getAllMatches = async (req, res) => {
  try {
    // Get all matches and sort by matchDateTime (newest first)
    const matches = await Match.find().sort({ matchDateTime: 1 });
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

    // Parse match date and time from Esd (YYYYMMDDHHMMSS format)
    let matchDateTime = null;
    if (matchData.Esd) {
      try {
        // Convert to string first, then parse the date string (YYYYMMDDHHMMSS)
        const esdString = matchData.Esd.toString();
        const year = parseInt(esdString.substring(0, 4));
        const month = parseInt(esdString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(esdString.substring(6, 8));
        const hour = parseInt(esdString.substring(8, 10));
        const minute = parseInt(esdString.substring(10, 12));
        
        // Create Date object in local time (already adjusted by 2 hours)
        matchDateTime = new Date(year, month, day, hour + 2, minute);
      } catch (error) {
        console.error('Error parsing match date/time:', error);
        matchDateTime = null;
      }
    }

    // Create new match with data from Livescore API
    match = new Match({
      eventID: matchId,
      homeTeam: matchData.T1[0].Nm,
      awayTeam: matchData.T2[0].Nm,
      competition: matchData.Stg?.Snm || '',
      matchDateTime: matchDateTime, // Store the parsed date/time
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
    }, 30000); // 30 seconds

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

    // Check if match has started (Eps is not "NS", "Delay", or "Postponed")
    if (matchStatus.Eps && matchStatus.Eps !== "NS" && matchStatus.Eps !== "Delay" && matchStatus.Eps !== "Postponed") {
      await handleMatchIncidents(match, matchStatus, matchIncidents);
      await handleMatchStatus(match, matchStatus);
    }
  } catch (error) {
    console.error(`Error processing match ${match.eventID}:`, error.message);
  }
}

async function handleMatchStatus(match, matchStatus) {

  // Check kickoff announcement
  if (!match.kickoffannounced) {
    // Check if match has already started (minute > 1)
    let currentMinute = 0;
    let isMinuteValue = false;
    
    if (matchStatus.Eps && typeof matchStatus.Eps === 'string' && matchStatus.Eps.includes("'")) {
      currentMinute = parseInt(matchStatus.Eps.replace("'", ""));
      isMinuteValue = true;
    }
    
    // Only announce kickoff if Eps is a minute value and match hasn't started yet or is at minute 1
    if (isMinuteValue && currentMinute <= 1) {
      const message = `Kick off: ${match.homeTeam} 0–0 ${match.awayTeam}`;
      console.log(message);

      //post to facebook and like and comment on facebook
      const postId = await postToFacebook(message);
      await likeAndCommentOnFacebook(postId, message, match.competition);
    }
    
    // Mark kickoff as announced regardless to prevent future announcements
    match.kickoffannounced = true;
    await match.save();
  }

  // Check half-time announcement
  if (!match.htannounced && matchStatus.Eps === "HT") {
    const message = `🚩 HT: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    console.log(message);
    
    //post to facebook and like and comment on facebook
    const postIdHT = await postToFacebook(message);
    await likeAndCommentOnFacebook(postIdHT, message, match.competition);
    
    match.htannounced = true;
    await match.save();
  }

  // Check full-time announcement
  if (!match.ftannounced && (matchStatus.Eps === "FT" || matchStatus.Eps === "AET")) {
    const message = `🚩 FT: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    console.log(message);
    
    //post to facebook and like and comment on facebook
    const postIdFT = await postToFacebook(message);
    await likeAndCommentOnFacebook(postIdFT, message, match.competition);
    
    match.ftannounced = true;
    match.status = "ended";
    await match.save();
  }

  // Check after penalties announcement
  if (!match.ftannounced && matchStatus.Eps === "AP") {
    const ftMessage = `🚩 FT: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const penMessage = `🥅Pen: ${match.homeTeam} ${matchStatus.Trp1}–${matchStatus.Trp2} ${match.awayTeam}`;
    
    console.log(ftMessage);
    console.log(penMessage);
    
    const combinedMessage = `${ftMessage}\n\n${penMessage}`;

    //post to facebook and like and comment on facebook
    const postIdAP = await postToFacebook(combinedMessage);
    await likeAndCommentOnFacebook(postIdAP, combinedMessage, match.competition);
    
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
  if (matchStatus.Eps && typeof matchStatus.Eps === 'string') {
    if (matchStatus.Eps.includes("'")) {
      // It's a minute value (e.g., "45'", "90+2'")
      const minute = parseInt(matchStatus.Eps.replace("'", ""));
      
      if (minute >= 1 && minute <= 45) {
        // First half
        incidentsArray = matchIncidents.Incs[1] || [];
        halfPrefix = "1";
      } else if (minute >= 46 && minute <= 90) {
        // Second half
        incidentsArray = matchIncidents.Incs[2] || [];
        halfPrefix = "2";
      } else if (minute > 90) {
        // Extra time
        incidentsArray = matchIncidents.Incs[3] || [];
        halfPrefix = "3";
      }
    } else {
      // It's a status value (e.g., "HT", "FT", "AET")
      if (matchStatus.Eps === "HT") {
        // Half time
        incidentsArray = matchIncidents.Incs[1] || [];
        halfPrefix = "1";
      } else if (matchStatus.Eps === "FT") {
        // Full time
        incidentsArray = matchIncidents.Incs[2] || [];
        halfPrefix = "2";
      } else if (matchStatus.Eps === "AET") {
        // After extra time
        incidentsArray = matchIncidents.Incs[3] || [];
        halfPrefix = "3";
      }
    }
  }

  if (incidentsArray.length === 0) return;

  // Process each incident
  for (let i = 0; i < incidentsArray.length; i++) {
    const incident = incidentsArray[i];
    
    // Determine incident type (IT) for uniqueness
    let incidentType;
    if (!incident.IT && incident.Incs && incident.Incs[0] && incident.Incs[0].IT) {
      // Goal with assist
      incidentType = incident.Incs[0].IT;
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
  const supportedIncidentTypes = [36, 37, 38, 39, 44, 45, 47, 62];
  
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

  // Posting handled by shared helper at top of file

  // Handle different incident types
  if (!incident.IT && incident.Incs && incident.Incs[0] && (incident.Incs[0].IT === 36 || incident.Incs[0].IT === 47)) {
    // Goal with assist
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Incs[0].Sc[0]}–${incident.Incs[0].Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ Goal: ${formatPlayerName(incident.Incs[0])} (${formatMinute(incident)})`;
    const assistMessage = `🅰️ ${formatPlayerName(incident.Incs[1])}`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    console.log(assistMessage);
    
    const message = `${scoreMessage}\n\n.\n${goalMessage}\n${assistMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 36 || incident.IT === 47) {
    // Goal (regular or extra time)
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ Goal: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    const message = `${scoreMessage}\n\n.\n${goalMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 37) {
    // Penalty goal
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident)} (Penalty) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    const message = `${scoreMessage}\n\n.\n${goalMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 38) {
    // Missed penalty
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const penaltyMessage = `❌ ${formatPlayerName(incident)} (Missed Penalty) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(penaltyMessage);
    
    const message = `${scoreMessage}\n\n.\n${penaltyMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 39) {
    // Own goal
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const goalMessage = `⚽ ${formatPlayerName(incident)} (OG) (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(goalMessage);
    
    const message = `${scoreMessage}\n\n.\n${goalMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 62) {
    // VAR check - no goal
    const varMessage = `🚨VAR CHECK🚨`;
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${incident.Sc[0]}–${incident.Sc[1]} ${match.awayTeam}`;
    const decisionMessage = `❌ ${incident.Fn && incident.Ln ? `${formatPlayerName(incident)} (${incident.IR})` : `${incident.IR}` } (${formatMinute(incident)})`;
    
    console.log(varMessage);
    console.log(scoreMessage);
    console.log(decisionMessage);
    
    const message = `${varMessage}\n${scoreMessage}\n\n.\n${decisionMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message, match.competition);
  } else if (incident.IT === 45) {
    // Red card
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const cardMessage = `🟥 Red Card: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(cardMessage);
    
    const message = `${scoreMessage}\n\n.\n${cardMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message);
  } else if (incident.IT === 44) {
    // Second yellow = red card
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const yellowMessage = `🟨🟨 = 🟥`;
    const cardMessage = `Red Card: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(yellowMessage);
    console.log(cardMessage);
    
    const message = `${scoreMessage}\n\n.\n${yellowMessage}\n${cardMessage}`;

    //post to facebook and like and comment on facebook
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message);
  }
  else if (incident.IT === 43) {
    // Yellow card
    const scoreMessage = `🚩 Live: ${match.homeTeam} ${matchStatus.Tr1}–${matchStatus.Tr2} ${match.awayTeam}`;
    const yellowMessage = `🟨 Yellow Card: ${formatPlayerName(incident)} (${formatMinute(incident)})`;
    
    console.log(scoreMessage);
    console.log(yellowMessage);

    //post to facebook and like and comment on facebook
    const message = `${scoreMessage}\n\n.\n${yellowMessage}`;
    const postId = await postToFacebook(message);
    await likeAndCommentOnFacebook(postId, message);
  }
}
