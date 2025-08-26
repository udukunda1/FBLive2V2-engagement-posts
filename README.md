# FBLive 2 - Live Match Tracking

A Node.js application for tracking live football matches with real-time updates and incident notifications.

## Features

- Search and save matches from Livescore API
- Live match tracking with 20-second polling intervals
- Real-time incident notifications (goals, cards, penalties, etc.)
- Match status tracking (kickoff, half-time, full-time)
- Team name customization
- Watch/unwatch matches

## API Endpoints

### Match Management
- `POST /api/match/search` - Search and save a match by eventID
- `GET /api/matches` - Get all matches
- `DELETE /api/match/:id` - Remove a match
- `PATCH /api/match/:id/toggle-watch` - Toggle watch status for a match
- `PATCH /api/match/:id/teams` - Update team names and competition

### Live Tracking
- `POST /api/matches/start-live` - Start live tracking for all pending matches with watch=true
- `POST /api/matches/stop-live` - Stop live matches polling

## External APIs Used

### Livescore Scoreboard API
- **Endpoint**: `https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${eventID}?locale=en`
- **Purpose**: Get current match status, scores, and match information
- **Key Data**: 
  - `Eps` - Match status (NS=Not Started, HT=Half Time, FT=Full Time, or minute like "23'")
  - `Tr1` - Home team score
  - `Tr2` - Away team score
  - `T1[0].Nm` - Home team name
  - `T2[0].Nm` - Away team name
  - `Stg.Snm` - Competition name

### Livescore Incidents API
- **Endpoint**: `https://prod-cdn-public-api.livescore.com/v1/api/app/incidents/soccer/${eventID}?locale=en`
- **Purpose**: Get match incidents (goals, cards, penalties, etc.)
- **Key Data**:
  - `Incs[1]` - First half incidents array
  - `Incs[2]` - Second half incidents array
  - Incident types:
    - `IT: 36` - Goal
    - `IT: 37` - Penalty goal
    - `IT: 38` - Missed penalty
    - `IT: 39` - Own goal
    - `IT: 62` - VAR check (no goal)
    - `IT: 45` - Red card
    - `IT: 44` - Second yellow = red card

## Live Tracking Features

The live tracking system polls every 20 seconds and provides:

### Match Status Updates
- **Kickoff**: Announces when match starts
- **Half-time**: Shows score at half-time
- **Full-time**: Shows final score and marks match as ended

### Incident Notifications
- **Goals** (IT: 36) - Regular goals with scorer and assist
- **Penalty Goals** (IT: 37) - Goals from penalties
- **Missed Penalties** (IT: 38) - Penalties that were missed
- **Own Goals** (IT: 39) - Goals scored against own team
- **VAR Checks** (IT: 62) - Goals disallowed by VAR
- **Red Cards** (IT: 45) - Direct red cards
- **Second Yellow = Red** (IT: 44) - Red cards from second yellow

### Console Output Examples
```
🚨 GOAAAL! 🚨
⏱️ Live: Manchester United 1–0 Liverpool
⚽ Marcus Rashford (23')
🅰️ Bruno Fernandes

⏸️ HT: Manchester United 1–0 Liverpool

🟥 Red Card: Virgil van Dijk (45')
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017/fblive2
PORT=3001
```

3. Start the server:
```bash
npm start
```

## Usage

1. Search for a match using its eventID
2. Toggle watch status to true for matches you want to track
3. Start live tracking to begin monitoring matches
4. Monitor console output for live updates

## Database Schema

Matches are stored with the following fields:
- `eventID` - Unique match identifier
- `homeTeam` - Home team name
- `awayTeam` - Away team name
- `status` - Match status (pending/ended)
- `watch` - Whether to track this match
- `kickoffannounced` - Whether kickoff was announced
- `htannounced` - Whether half-time was announced
- `ftannounced` - Whether full-time was announced
- `competition` - Competition name
- `evaluatedIncidents` - Array of processed incident IDs
