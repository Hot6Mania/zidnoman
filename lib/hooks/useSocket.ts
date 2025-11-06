import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '../socket'
import { useRoomStore } from '../stores/room-store'
import type { User, Song, ChatMessage, PlayerState, Room } from '../types'

interface RoomState {
  room: Room
  playlist: Song[]
  users: User[]
  playerState: PlayerState
}

export function useSocket(roomId: string | null, user: User | null) {
  const socketRef = useRef<Socket | null>(null)
  const {
    setRoom,
    setPlaylist,
    setUsers,
    updatePlayerState,
    addChatMessage,
    addUser,
    removeUser
  } = useRoomStore()

  useEffect(() => {
    if (!roomId || !user) return

    socketRef.current = getSocket()
    const socket = socketRef.current

    socket.emit('room:join', { roomId, user })

    socket.on('room:state', (data: RoomState) => {
      setRoom(data.room)
      setPlaylist(data.playlist)
      setUsers(data.users)
      updatePlayerState(data.playerState)
    })

    socket.on('player:play', () => {
      updatePlayerState({ isPlaying: true })
    })

    socket.on('player:pause', () => {
      updatePlayerState({ isPlaying: false })
    })

    socket.on('player:seek', (data: { position: number }) => {
      updatePlayerState({ position: data.position })
    })

    socket.on('player:next', () => {
      const store = useRoomStore.getState()
      const nextIndex = Math.min(store.playerState.currentSongIndex + 1, store.playlist.length - 1)
      updatePlayerState({ currentSongIndex: nextIndex, position: 0 })
    })

    socket.on('player:previous', () => {
      const store = useRoomStore.getState()
      const prevIndex = Math.max(store.playerState.currentSongIndex - 1, 0)
      updatePlayerState({ currentSongIndex: prevIndex, position: 0 })
    })

    socket.on('player:state', (data: { state: PlayerState }) => {
      updatePlayerState(data.state)
    })

    socket.on('playlist:update', (data: { playlist: Song[] }) => {
      setPlaylist(data.playlist)
    })

    socket.on('chat:message', (data: { message: ChatMessage }) => {
      addChatMessage(data.message)
    })

    socket.on('user:join', (data: { user: User }) => {
      addUser(data.user)
    })

    socket.on('user:leave', (data: { userId: string }) => {
      removeUser(data.userId)
    })

    socket.on('users:update', (data: { users: User[] }) => {
      setUsers(data.users)
    })

    return () => {
      if (socket) {
        socket.emit('room:leave', { roomId, userId: user.id })
        socket.off('room:state')
        socket.off('player:play')
        socket.off('player:pause')
        socket.off('player:seek')
        socket.off('player:next')
        socket.off('player:previous')
        socket.off('player:state')
        socket.off('playlist:update')
        socket.off('chat:message')
        socket.off('user:join')
        socket.off('user:leave')
        socket.off('users:update')
      }
    }
  }, [roomId, user])

  return socketRef.current
}
