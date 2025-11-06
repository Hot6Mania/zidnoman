import { create } from 'zustand'
import { Song, PlayerState, ChatMessage, User, Room } from '../types'

interface RoomStore {
  room: Room | null
  playlist: Song[]
  users: User[]
  currentUser: User | null
  playerState: PlayerState
  chatMessages: ChatMessage[]

  setRoom: (room: Room) => void
  setCurrentUser: (user: User) => void
  addSong: (song: Song) => void
  removeSong: (songId: string) => void
  reorderSongs: (fromIndex: number, toIndex: number) => void
  setPlaylist: (playlist: Song[]) => void
  updatePlayerState: (state: Partial<PlayerState>) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void
  setUsers: (users: User[]) => void
  currentSong: () => Song | null
  reset: () => void
}

const initialState = {
  room: null,
  playlist: [],
  users: [],
  currentUser: null,
  playerState: {
    currentSongIndex: 0,
    position: 0,
    isPlaying: false,
    volume: 50,
    shuffle: false,
    repeat: 'none' as const
  },
  chatMessages: []
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

  setPlaylist: (playlist) => set({ playlist }),

  updatePlayerState: (newState) => set((state) => ({
    playerState: { ...state.playerState, ...newState }
  })),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message].slice(-100)
  })),

  setChatMessages: (messages) => set({ chatMessages: messages }),

  addUser: (user) => set((state) => {
    if (state.users.find(u => u.id === user.id)) return state
    return { users: [...state.users, user] }
  }),

  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId)
  })),

  setUsers: (users) => set({ users }),

  currentSong: () => {
    const state = get()
    return state.playlist[state.playerState.currentSongIndex] || null
  },

  reset: () => set(initialState)
}))
