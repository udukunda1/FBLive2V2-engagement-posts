# FBLive 2 - Live Match Tracking

A Node.js application for tracking live football matches with real-time updates and incident notifications.

## Features

- Search and save matches from Livescore API
- Live match tracking with 20-second polling intervals
- Real-time incident notifications (goals, cards, penalties, VAR checks, etc.)
- Match status tracking (kickoff, half-time, full-time)
- Team name customization
- Watch/unwatch matches
- Enhanced incident handling with VAR support
- Player name fallback system (Ln/Pn)
- Performance optimizations with incident type filtering
- Added time (injury time) support

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
    - `IT: 36` - Goal (including goals with assists)
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

#### Supported Incident Types
- **Goals** (IT: 36) - Regular goals with scorer and assist
- **Penalty Goals** (IT: 37) - Goals from penalties
- **Missed Penalties** (IT: 38) - Penalties that were missed
- **Own Goals** (IT: 39) - Goals scored against own team
- **VAR Checks** (IT: 62) - Goals disallowed by VAR
- **Red Cards** (IT: 45) - Direct red cards
- **Second Yellow = Red** (IT: 44) - Red cards from second yellow

#### Enhanced Features
- **VAR Support**: Handles VAR decisions and goal disallowances
- **Player Name Fallback**: Uses `Ln` (last name) as primary, `Pn` (player name) as fallback
- **First Name Initials**: Displays first name initials when available (e.g., "J. Smith")
- **Added Time Support**: Shows injury time in format "45+3'" when available
- **Unique Incident IDs**: Prevents duplicate processing with enhanced ID generation
- **Performance Optimization**: Only processes supported incident types

### Console Output Examples

#### Regular Goals
```
⏱️Live: Manchester United 1–0 Liverpool
⚽ M. Rashford (23')
��️ B. Fernandes
```

#### Goals with Added Time
```
⏱️Live: Manchester United 1–0 Liverpool
⚽ M. Rashford (45+3')
```

#### VAR Decisions
```
🚨VAR CHECK🚨
⏱️ Live: Manchester United 1–0 Liverpool
❌ M. Rashford (VAR No Goal) (45+3')
```

#### Cards
```
⏱️ Live: Manchester United 1–0 Liverpool
🟥 Red Card: V. van Dijk (45')
```

#### Second Yellow = Red
```
⏱️ Live: Manchester United 1–0 Liverpool
🟨🟨 = 🟥
Red Card: V. van Dijk (45')
```

#### Match Status
```
Kick off: Manchester United 0–0 Liverpool
⏸️ HT: Manchester United 1–0 Liverpool
🏁 FT: Manchester United 2–1 Liverpool
```

## Technical Improvements

### Incident Processing
- **Unique ID Generation**: Uses format `${halfPrefix}${index}_${incidentType}` for regular incidents
- **VAR Incident Handling**: Uses base ID `${halfPrefix}${index}` for VAR incidents to replace original incidents
- **Player Name Detection**: Checks for both `Ln` and `Pn` fields with fallback logic
- **First Name Handling**: Safely handles cases where first name initials are not available

### Performance Optimizations
- **Incident Type Filtering**: Only processes supported incident types (36, 37, 38, 39, 44, 45, 62)
- **Reduced Console Noise**: Only logs incidents with missing player names, not unsupported types
- **Early Exit Logic**: Skips processing for unsupported or invalid incidents

### Data Structure Handling
- **Nested Incident Structure**: Handles goals with assists (`incident.Incs[0]`)
- **Added Time Support**: Processes `MinEx` property for injury time display
- **Flexible Player Names**: Works with various player name field combinations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `config.env.example` to `.env`
   - Update the values in `.env` with your actual credentials

```bash
# Copy the example file
cp config.env.example .env

# Edit .env file with your actual values
```

**Required Environment Variables:**
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/fblive2

# Server Configuration  
PORT=3001

# Facebook API Configuration
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
FACEBOOK_PAGE_ID=your_facebook_page_id_here

# Optional: Node Environment
NODE_ENV=development
```

**Facebook API Setup:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Get your Page Access Token
4. Get your Facebook Page ID
5. Add these to your `.env` file

**Environment Variables Explained:**
- `MONGODB_URI`: MongoDB connection string (default: localhost:27017/fblive2)
- `PORT`: Server port number (default: 3001)
- `FACEBOOK_ACCESS_TOKEN`: Your Facebook Page Access Token for posting updates
- `FACEBOOK_PAGE_ID`: Your Facebook Page ID where posts will be published
- `NODE_ENV`: Environment mode (development/production)

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
- `matchDateTime` - Match date and time (local time, +2 hours from UTC)
- `status` - Match status (pending/ended)
- `watch` - Whether to track this match
- `kickoffannounced` - Whether kickoff was announced
- `htannounced` - Whether half-time was announced
- `ftannounced` - Whether full-time was announced
- `competition` - Competition name
- `evaluatedIncidents` - Array of processed incident IDs (prevents duplicate processing)

## Recent Updates

- Enhanced VAR incident handling with player name support
- Added injury time display (e.g., "45+3'")
- Improved player name fallback system (Ln/Pn)
- Performance optimizations with incident type filtering
- Reduced console logging noise
- Better unique incident ID generation
- Support for first name initials when available
- Added match date/time parsing and storage from Livescore API
- Frontend display of match times with smart formatting (Today, Tomorrow, etc.)
- Visual indicators for match timing (overdue, starting soon, upcoming, future)
- Automatic sorting of matches by date/time

Solving problem of ending before extratime or penalty if it happens
--------------------------------------------------------------------

if the API shows "FT" before "AET" or before "AP" or Between "AET" and "AP".

i will remove match.status = "ended" after FT and AET announcement.
:so that it will continue to track the match after FT or AET announced, until i delete it from db or after PENs
(or when i manually turn to ended, if i add that endpoint)