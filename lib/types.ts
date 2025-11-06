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
  settings: RoomSettings
}

export interface RoomSettings {
  allowAddSongs: 'all' | 'moderators'
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
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  userColor: string
  content: string
  timestamp: number
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
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'user:join'; user: User }
  | { type: 'user:leave'; userId: string }
  | { type: 'users:update'; users: User[] }
  | { type: 'room:update'; room: Room }

export interface RoomState {
  room: Room | null
  playlist: Song[]
  users: User[]
  currentUser: User | null
  playerState: PlayerState
  chatMessages: ChatMessage[]
}
