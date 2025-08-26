# FBLive 2 API

A simplified football match tracking API built with Node.js, Express, and MongoDB.

## Features

- **Simplified Match Model**: Focused on essential match data
- **CRUD Operations**: Get, update, and delete matches
- **Watch Toggle**: Toggle match watching status
- **Team Management**: Update team names and competition
- **Livescore Integration**: Search and save matches using Livescore API

## Database Model

The Match model includes the following fields:
- `eventID` (String, required, unique)
- `homeTeam` (String, required)
- `awayTeam` (String, required)
- `status` (String, default: 'pending')
- `watch` (Boolean, default: false)
- `kickoffannounced` (Boolean, default: false)
- `htannounced` (Boolean, default: false)
- `ftannounced` (Boolean, default: false)
- `competition` (String, default: '')

## API Endpoints

### POST /api/match/search
Search and save a match using Livescore API
- **Body**: `{ matchId: string }`
- **Response**: Match object (created or existing)

### GET /api/matches
Get all matches
- **Response**: Array of match objects

### DELETE /api/match/:id
Delete a match by ID
- **Response**: Success message

### PATCH /api/match/:id/toggle-watch
Toggle the watch status of a match
- **Response**: Updated match object

### PATCH /api/match/:id/teams
Update team names and competition
- **Body**: `{ homeTeam?, awayTeam?, competition? }`
- **Response**: Updated match object

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your MongoDB URI:
```
MONGODB_URI=mongodb://localhost:27017/fblive2
PORT=3001
```

3. Start the server:
```bash
npm run dev
```

## Development

- **Start development server**: `npm run dev`
- **Start production server**: `npm start`

The API will be available at `http://localhost:3001`

## Livescore API Integration

The API integrates with Livescore's public API to fetch match data:
- **Endpoint**: `https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${eventID}?locale=en`
- **Data Mapping**:
  - `homeTeam` ← `response.T1[0].Nm`
  - `awayTeam` ← `response.T2[0].Nm`
  - `competition` ← `response.Stg.Snm`
