# FBLive 2 Frontend

A modern Next.js frontend application for managing and tracking live football matches.

## Features

- **Match Management**: Search, add, edit, and remove matches
- **Live Tracking Control**: Start/stop live match tracking
- **Real-time Updates**: Monitor match status and incidents
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with Tailwind CSS and Lucide React icons

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client for API calls

## Getting Started

### Prerequisites

- Node.js 18+ 
- The FBLive 2 backend server running on port 3001

### Installation

1. Navigate to the frontend directory:
```bash
cd fblive2/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## API Integration

The frontend communicates with the FBLive 2 backend API through the following endpoints:

### Match Management
- `GET /api/matches` - Get all matches
- `POST /api/match/search` - Search and add match by eventID
- `DELETE /api/match/:id` - Remove match
- `PATCH /api/match/:id/toggle-watch` - Toggle watch status
- `PATCH /api/match/:id/teams` - Update team names and competition

### Live Tracking
- `POST /api/matches/start-live` - Start live tracking
- `POST /api/matches/stop-live` - Stop live tracking

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── LiveTracking.tsx   # Live tracking controls
│   ├── MatchList.tsx      # Match list display
│   └── MatchSearch.tsx    # Match search form
├── lib/                   # Utility libraries
│   └── api.ts            # API client functions
├── types/                 # TypeScript type definitions
│   └── match.ts          # Match-related types
└── package.json          # Dependencies and scripts
```

## Usage

### Adding a Match
1. Enter the match event ID from Livescore in the search field
2. Click "Add Match" to search and save the match
3. The match will appear in the matches list

### Managing Matches
- **Toggle Watch**: Click the eye icon to start/stop watching a match
- **Edit Match**: Click the edit icon to modify team names and competition
- **Remove Match**: Click the trash icon to delete a match

### Live Tracking
1. Add matches and set their watch status to "Watching"
2. Click "Start Tracking" to begin live monitoring
3. Monitor the backend console for real-time updates
4. Click "Stop Tracking" to end live monitoring

## Development

### Adding New Features
1. Create new components in the `components/` directory
2. Add TypeScript types in the `types/` directory
3. Extend API functions in `lib/api.ts`
4. Update the main page to include new functionality

### Styling
- Use Tailwind CSS utility classes for styling
- Custom components are defined in `globals.css`
- Follow the existing design patterns and color scheme

### API Calls
- All API calls are centralized in `lib/api.ts`
- Use the `matchApi` object for backend communication
- Handle errors and loading states appropriately

## Configuration

The frontend is configured to proxy API calls to the backend server running on `localhost:3001`. This is configured in `next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/api/:path*',
    },
  ];
}
```

## Troubleshooting

### Common Issues

1. **API Connection Error**: Ensure the backend server is running on port 3001
2. **Build Errors**: Check that all dependencies are installed
3. **TypeScript Errors**: Verify type definitions match the backend API

### Development Tips

- Use the browser's developer tools to debug API calls
- Check the Network tab for request/response details
- Monitor the backend console for live tracking updates
