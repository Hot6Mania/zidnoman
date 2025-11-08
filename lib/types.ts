export type Platform = 'youtube' | 'soundcloud' | 'niconico' | 'bilibili' | 'file' | 'custom'

export interface Song {
  id: string
  platform: Platform
  platformId: string
  url: string
  title: string
  artist: string
  thumbnailUrl: string
  duration: number
  addedBy: string
  addedAt: number
}

export interface User {
  id: string
  username: string
  color: string
  role: 'owner' | 'moderator' | 'member'
  joinedAt: number
}

export interface Room {
  id: string
  name: string
  createdAt: number
  ownerId: string
  djId?: string
  settings: RoomSettings
}

export interface RoomSettings {
  allowAddSongs: 'free' | 'relaxed' | 'normal' | 'strict' | 'moderators'
  enableChat: boolean
  enableVoteSkip: boolean
  voteSkipThreshold: number
}

export interface PlayerState {
  currentSongIndex: number
  position: number
  isPlaying: boolean
  volume: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'
  playbackRate?: number
  mode?: 'queue' | 'list'
  lastUpdateTime?: number
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  userColor: string
  content: string
  timestamp: number
  status?: 'pending' | 'confirmed' | 'failed'
  tempId?: string
}

export interface HotCue {
  id: number
  position: number
  color: string
  label?: string
}

export interface DJState {
  crossfaderPosition: number
  deck1Volume: number
  deck2Volume: number
  eq: {
    low: number
    mid: number
    high: number
  }
  filter: {
    type: 'none' | 'hpf' | 'lpf'
    frequency: number
    resonance: number
  }
  effects: {
    delay: {
      enabled: boolean
      time: number
      feedback: number
      wetDry: number
    }
    reverb: {
      enabled: boolean
      roomSize: number
      dampening: number
      wetDry: number
    }
  }
  loop: {
    enabled: boolean
    start: number
    end: number
  }
  tempo: number
  keyLock: boolean
}

export interface SongMetadata {
  hotCues: HotCue[]
  bpm?: number
  key?: string
}

export type SocketEvent =
  | { type: 'player:play' }
  | { type: 'player:pause' }
  | { type: 'player:seek'; position: number }
  | { type: 'player:next' }
  | { type: 'player:previous' }
  | { type: 'player:state'; state: Partial<PlayerState> }
  | { type: 'song:add'; song: Song }
  | { type: 'song:remove'; songId: string }
  | { type: 'song:reorder'; fromIndex: number; toIndex: number }
  | { type: 'playlist:update'; playlist: Song[] }
  | { type: 'song:vote-skip'; songId: string; voteCount: number; requiredVotes: number; shouldSkip: boolean }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'user:join'; user: User }
  | { type: 'user:leave'; userId: string }
  | { type: 'users:update'; users: User[] }
  | { type: 'room:update'; room: Room }
  | { type: 'dj:assign'; userId: string }
  | { type: 'dj:unassign' }
  | { type: 'dj:state'; state: Partial<DJState> }
  | { type: 'dj:hotcue-set'; songId: string; hotCue: HotCue }
  | { type: 'dj:hotcue-jump'; songId: string; hotCueId: number }
  | { type: 'sync:heartbeat'; userId: string; timestamp: number }
  | { type: 'sync:master-changed'; masterId: string | null; masterType: 'owner' | 'moderator' | 'server' }

export interface RoomState {
  room: Room | null
  playlist: Song[]
  users: User[]
  currentUser: User | null
  playerState: PlayerState
  chatMessages: ChatMessage[]
  djState: DJState | null
  songMetadata: Record<string, SongMetadata>
  syncMaster: {
    userId: string | null
    type: 'owner' | 'moderator' | 'server'
    lastHeartbeat: number
  }
}
