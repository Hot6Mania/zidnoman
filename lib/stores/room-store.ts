import { create } from 'zustand'
import { Song, PlayerState, ChatMessage, User, Room, DJState, SongMetadata } from '../types'

interface VoteSkipState {
  voteCount: number
  requiredVotes: number
  hasVoted: boolean
}

interface SyncMasterState {
  userId: string | null
  type: 'owner' | 'moderator' | 'server'
  lastHeartbeat: number
}

interface RoomStore {
  room: Room | null
  playlist: Song[]
  originalPlaylist: Song[]
  users: User[]
  currentUser: User | null
  playerState: PlayerState
  chatMessages: ChatMessage[]
  voteSkipState: VoteSkipState
  djState: DJState | null
  songMetadata: Record<string, SongMetadata>
  syncMaster: SyncMasterState

  setRoom: (room: Room) => void
  setCurrentUser: (user: User) => void
  addSong: (song: Song) => void
  removeSong: (songId: string) => void
  reorderSongs: (fromIndex: number, toIndex: number) => void
  setPlaylist: (playlist: Song[]) => void
  shufflePlaylist: () => void
  unshufflePlaylist: () => void
  updatePlayerState: (state: Partial<PlayerState>) => void
  setVoteSkipState: (state: Partial<VoteSkipState>) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  addOptimisticMessage: (message: ChatMessage) => void
  confirmMessage: (tempId: string, confirmedId: string) => void
  failMessage: (tempId: string) => void
  removePendingMessage: (tempId: string) => void
  retryMessage: (tempId: string) => Promise<void>
  addUser: (user: User) => void
  removeUser: (userId: string) => void
  setUsers: (users: User[]) => void
  setDJState: (state: DJState | null) => void
  updateDJState: (state: Partial<DJState>) => void
  setSongMetadata: (songId: string, metadata: SongMetadata) => void
  setSyncMaster: (master: Partial<SyncMasterState>) => void
  currentSong: () => Song | null
  reset: () => void
}

const initialState = {
  room: null,
  playlist: [],
  originalPlaylist: [],
  users: [],
  currentUser: null,
  playerState: {
    currentSongIndex: 0,
    position: 0,
    isPlaying: false,
    volume: 50,
    shuffle: false,
    repeat: 'none' as const,
    playbackRate: 1.0,
    mode: 'list' as const
  },
  chatMessages: [],
  voteSkipState: {
    voteCount: 0,
    requiredVotes: 0,
    hasVoted: false
  },
  djState: null,
  songMetadata: {},
  syncMaster: {
    userId: null,
    type: 'owner' as const,
    lastHeartbeat: Date.now()
  }
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  ...initialState,

  setRoom: (room) => set({ room }),
  setCurrentUser: (user) => set({ currentUser: user }),

  addSong: (song) => set((state) => ({
    playlist: [...state.playlist, song]
  })),

  removeSong: (songId) => set((state) => ({
    playlist: state.playlist.filter(s => s.id !== songId)
  })),

  reorderSongs: (fromIndex, toIndex) => set((state) => {
    const newPlaylist = [...state.playlist]
    const [removed] = newPlaylist.splice(fromIndex, 1)
    newPlaylist.splice(toIndex, 0, removed)
    return { playlist: newPlaylist }
  }),

  setPlaylist: (playlist) => set((state) => ({
    playlist,
    // Update original playlist only if not currently shuffled
    originalPlaylist: state.playerState.shuffle ? state.originalPlaylist : playlist
  })),

  shufflePlaylist: () => set((state) => {
    const currentSong = state.playlist[state.playerState.currentSongIndex]
    const originalPlaylist = state.originalPlaylist.length > 0 ? state.originalPlaylist : [...state.playlist]

    // Fisher-Yates shuffle
    const shuffled = [...state.playlist]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Find new index of current song
    const newIndex = currentSong ? shuffled.findIndex(s => s.id === currentSong.id) : 0

    return {
      playlist: shuffled,
      originalPlaylist,
      playerState: { ...state.playerState, currentSongIndex: newIndex }
    }
  }),

  unshufflePlaylist: () => set((state) => {
    const currentSong = state.playlist[state.playerState.currentSongIndex]
    const originalPlaylist = state.originalPlaylist.length > 0 ? state.originalPlaylist : state.playlist

    // Find new index of current song in original order
    const newIndex = currentSong ? originalPlaylist.findIndex(s => s.id === currentSong.id) : 0

    return {
      playlist: originalPlaylist,
      playerState: { ...state.playerState, currentSongIndex: newIndex }
    }
  }),

  updatePlayerState: (newState) => set((state) => ({
    playerState: { ...state.playerState, ...newState }
  })),

  setVoteSkipState: (newState) => set((state) => ({
    voteSkipState: { ...state.voteSkipState, ...newState }
  })),

  addChatMessage: (message) => set((state) => {
    // Prevent duplicates: check if message with this ID already exists
    const exists = state.chatMessages.some(msg => msg.id === message.id)
    if (exists) {
      console.log('🔄 Skipping duplicate message:', message.id)
      return state
    }

    // Also check by tempId (in case broadcast arrives before confirmation)
    const existsByTempId = message.tempId && state.chatMessages.some(msg => msg.tempId === message.tempId)
    if (existsByTempId) {
      console.log('🔄 Skipping duplicate message (by tempId):', message.tempId)
      return state
    }

    return {
      chatMessages: [...state.chatMessages, message].slice(-100)
    }
  }),

  setChatMessages: (messages) => set({ chatMessages: messages }),

  addOptimisticMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, { ...message, status: 'pending' as const }].slice(-100)
  })),

  confirmMessage: (tempId, confirmedId) => set((state) => ({
    chatMessages: state.chatMessages.map(msg =>
      msg.tempId === tempId
        ? { ...msg, id: confirmedId, status: 'confirmed' as const, tempId: undefined }
        : msg
    )
  })),

  failMessage: (tempId) => set((state) => ({
    chatMessages: state.chatMessages.map(msg =>
      msg.tempId === tempId
        ? { ...msg, status: 'failed' as const }
        : msg
    )
  })),

  removePendingMessage: (tempId) => set((state) => ({
    chatMessages: state.chatMessages.filter(msg => msg.tempId !== tempId)
  })),

  retryMessage: async (tempId) => {
    // This will be called from ChatView with context
    // Just mark as pending again
    set((state) => ({
      chatMessages: state.chatMessages.map(msg =>
        msg.tempId === tempId
          ? { ...msg, status: 'pending' as const }
          : msg
      )
    }))
  },

  addUser: (user) => set((state) => {
    if (state.users.find(u => u.id === user.id)) return state
    return { users: [...state.users, user] }
  }),

  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId)
  })),

  setUsers: (users) => set({ users }),

  setDJState: (state) => set({ djState: state }),

  updateDJState: (newState) => set((state) => ({
    djState: state.djState ? { ...state.djState, ...newState } : null
  })),

  setSongMetadata: (songId, metadata) => set((state) => ({
    songMetadata: { ...state.songMetadata, [songId]: metadata }
  })),

  setSyncMaster: (master) => set((state) => ({
    syncMaster: { ...state.syncMaster, ...master }
  })),

  currentSong: () => {
    const state = get()
    return state.playlist[state.playerState.currentSongIndex] || null
  },

  reset: () => set(initialState)
}))
