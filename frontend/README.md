# FBLive2 V2 Frontend

Modern Next.js frontend for managing teams and viewing live football matches.

## Features

✨ **Teams Management**
- Add new teams with nicknames
- View all tracked teams
- Delete teams

📅 **Matches Dashboard**
- View all scheduled matches
- Real-time updates (30-second refresh)
- Match status indicators
- Competition badges

🎨 **Modern UI**
- Beautiful gradient design
- Responsive layout
- Dark theme
- Smooth animations

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running (default: port 3001)

### Installation

```bash
cd frontend
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` to customize backend API URL if needed:
```env
# Backend API URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Note:** Frontend runs on port 3000 by default. To change the port, edit `package.json` scripts.

### Development

```bash
npm run dev
```

The app will start on the port specified in `.env` (default: http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

**Note:** The frontend port (3000) is configured in `package.json`. To change it, edit the `-p` flag in the dev/start scripts.

## Usage

### Adding Teams

1. Click "Add New Team" button
2. Enter team name (e.g., "Manchester United")
3. Enter nickname (e.g., "Man Utd") - optional
4. Enter Livescore ID - optional
5. Click "Add Team"

### Viewing Matches

1. Switch to "Matches" tab
2. View all scheduled matches
3. Matches update automatically every 30 seconds
4. See match status, time, and competition

## API Integration

The frontend connects to the backend API via Next.js rewrites:

- `GET /api/teams` - Fetch all teams
- `POST /api/teams` - Add new team
- `DELETE /api/teams/:id` - Delete team
- `GET /api/matches` - Fetch all matches

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hooks** - State management

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main page (Teams & Matches)
│   └── globals.css     # Global styles
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Example environment variables
├── next.config.ts      # Next.js configuration
└── package.json        # Dependencies
```

## Customization

### Change Frontend Port

Edit `.env`:
```env
PORT=4000
```

### Change Backend URL

Edit `.env`:
```env
NEXT_PUBLIC_API_URL=http://your-backend-url:3001
```

## License

MIT
