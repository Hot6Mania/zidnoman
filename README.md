# Zidnoman

Real-time music sharing platform for synchronized listening.

## Features

- Multi-platform support (YouTube, Niconico)
- Real-time playback synchronization
- DJ mode with audio effects
- Live chat
- Playlist management
- Sync master permission system

## Tech Stack

### Frontend
- Next.js 16 with TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand

### Backend
- Next.js API Routes
- Supabase Realtime (WebSocket)
- Redis Labs (session storage)
- Supabase Postgres (persistent data)

### APIs
- YouTube iframe API
- YouTube Data API v3 (9-account round-robin)
- Niconico embed API

## Installation

### 1. Clone repository

```bash
git clone https://github.com/Hot6Mania/zidnoman.git
cd zidnoman
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Create `.env.local`:

```env
# Redis
REDIS_URL=your_redis_url

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Postgres
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url

# YouTube API (9 accounts)
YOUTUBE_CLIENT_ID1=your_client_id_1
YOUTUBE_CLIENT_SECRET1=your_client_secret_1
YOUTUBE_REFRESH_TOKEN1=your_refresh_token_1
# ... repeat for accounts 2-9

# Cron
CRON_SECRET=your_cron_secret
```

### 4. Initialize database

Run SQL in Supabase dashboard:

```bash
# Copy contents of supabase-schema.sql
# Execute in Supabase SQL Editor
```

### 5. Run development server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
zidnoman/
├── app/
│   ├── api/
│   │   ├── rooms/          # Room CRUD
│   │   ├── niconico/       # Niconico metadata
│   │   └── cron/           # Token refresh
│   ├── room/[id]/          # Room page
│   └── page.tsx            # Home page
├── components/
│   ├── room/               # Player, playlist, chat, DJ panel
│   ├── home/               # Create/join dialogs
│   └── ui/                 # shadcn components
├── lib/
│   ├── db/                 # Redis + Postgres clients
│   ├── hooks/              # useRealtime, useMobileControls
│   ├── stores/             # Zustand store
│   ├── audio/              # Audio engine
│   ├── realtime.ts         # Supabase Realtime
│   ├── permissions.ts      # Sync master logic
│   ├── youtube.ts          # YouTube iframe API
│   └── niconico.ts         # Niconico embed
└── supabase-schema.sql     # Database schema
```

## Usage

### Creating a Room
1. Click "방 생성" on home page
2. Enter room name and nickname
3. Automatically enter room

### Joining a Room
1. Paste room URL in input field
2. Click join

### Adding Songs
1. Search or paste URL (YouTube/Niconico)
2. Song added to playlist

### Player Controls
- Play/Pause/Next/Previous
- Shuffle/Repeat modes
- Volume/Seek controls
- DJ mode (effects, crossfader, hotcues)

## Development

### Completed
- YouTube/Niconico player separation
- Supabase Realtime migration
- DJ features (effects, crossfader, hotcues)
- Audio processing engine
- Sync master permission system
- Random name generation
- Homepage animations

### In Progress
- Mobile controls
- Vote skip
- Hotcue save/load

### Planned
- SoundCloud support
- Playlist sharing
- Theme customization
- PWA support

## License

MIT
