# Zidnoman
> Real-time Music Sharing Platform (지듣노망호)

## Features

- Multi-platform support: YouTube, SoundCloud, Niconico
- Real-time synchronization via Socket.io
- Live chat functionality
- Drag & drop playlist management
- Role-based user management (Owner, Moderator, Member)
- Responsive design for mobile, tablet, and desktop

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand for state management
- Framer Motion for animations

### Backend
- Next.js API Routes
- Socket.io for real-time communication
- Vercel KV (Redis) for session storage
- Vercel Postgres for persistent data

### External APIs
- YouTube iframe API for metadata
- YouTube Data API v3 for playlist management
- React Player for multi-platform playback

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/zidnoman.git
cd zidnoman
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file and add the following:

```env
# Vercel KV (Redis)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token

# Vercel Postgres
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NO_SSL=your_postgres_url_no_ssl
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=your_postgres_host
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=your_postgres_database

# YouTube API (9 accounts for round-robin quota management)
YOUTUBE_CLIENT_ID1=your_client_id_1
YOUTUBE_CLIENT_SECRET1=your_client_secret_1
YOUTUBE_REFRESH_TOKEN1=your_refresh_token_1

# ... repeat for YOUTUBE_CLIENT_ID2-9 ...

# Cron Secret
CRON_SECRET=your_random_secret_string
```

#### Setting up Vercel KV & Postgres

1. Create a project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage tab and connect KV and Postgres
3. Environment variables will be automatically generated

#### Getting YouTube API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Get refresh tokens for each account

### 4. Initialize database

```bash
npx tsx .dev/scripts/init-db.ts
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploying to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or use GitHub integration for automatic deployments:

1. Push repository to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy!

## Project Structure

```
zidnoman/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── rooms/           # Room management
│   │   ├── socket/          # Socket.io server
│   │   ├── youtube/         # YouTube playlist API
│   │   └── cron/            # Cron jobs
│   ├── room/[id]/           # Room page
│   └── page.tsx             # Home page
├── components/
│   ├── room/                # Room components
│   ├── home/                # Home components
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── db/                  # Database clients
│   ├── hooks/               # Custom hooks
│   ├── stores/              # Zustand stores
│   ├── socket.ts            # Socket.io client
│   ├── youtube.ts           # YouTube iframe API
│   ├── youtube-api.ts       # YouTube playlist API
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
└── .dev/
    └── scripts/             # Build/deployment scripts
```

## Usage

### Creating a Room
1. Click "새 방 만들기" on the home page
2. Enter room name and nickname
3. Room will be created and you'll be automatically entered

### Joining a Room
1. Enter room code on the home page
2. Enter your nickname
3. Join the room

### Adding Songs
1. Click "곡 추가" button in the room
2. Paste YouTube, SoundCloud, or Niconico URL
3. Song will be automatically added to the playlist

### Player Controls
- Play/Pause
- Next/Previous track
- Shuffle
- Repeat (none/one/all)
- Volume control
- Seek by dragging progress bar

### Playlist Management
- Reorder songs via drag & drop
- Click song to play immediately
- Delete songs from playlist

## Development Roadmap

### Phase 1 & 2 (Completed)
- [x] Project initialization
- [x] Home page UI
- [x] Room page layout
- [x] YouTube player integration
- [x] Real-time synchronization
- [x] Playlist CRUD operations
- [x] Chat system
- [x] YouTube iframe API for metadata
- [x] YouTube Playlist API integration
- [x] Automatic token refresh system

### Phase 3 (In Progress)
- [ ] Full SoundCloud support
- [ ] Niconico geo-restriction detection
- [ ] Bilibili support
- [ ] File upload capability
- [ ] YouTube playlist batch import

### Phase 4 (Planned)
- [ ] Enhanced permission system
- [ ] Vote skip functionality
- [ ] Settings panel
- [ ] User profile customization
- [ ] Mobile optimization
- [ ] PWA support

## License

MIT License
