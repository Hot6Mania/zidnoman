import { useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getRealtimeChannel } from '../realtime'
import { useRoomStore } from '../stores/room-store'
import type { User, Song, ChatMessage, PlayerState, Room } from '../types'

interface RoomState {
  room: Room
  playlist: Song[]
  users: User[]
  playerState: PlayerState
}

export function useRealtime(roomId: string | null, user: User | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const {
    setRoom,
    setPlaylist,
    setUsers,
    updatePlayerState,
    addChatMessage,
    setChatMessages,
    addUser,
    removeUser
  } = useRoomStore()

  useEffect(() => {
    if (!roomId || !user) return

    const channel = getRealtimeChannel(roomId)
    channelRef.current = channel

    const initRoom = async () => {
      const response = await fetch(`/api/rooms/${roomId}/state`)
      const { room, playlist, users, playerState, chatHistory } = await response.json()

      if (room) setRoom(room)
      setPlaylist(playlist)
      setChatMessages(chatHistory)

      const isNewUser = !users.find((u: User) => u.id === user.id)
      if (isNewUser) {
        await fetch(`/api/rooms/${roomId}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user })
        })
        users.push(user)
      }
      setUsers(users)

      updatePlayerState(playerState || {
        currentSongIndex: 0,
        position: 0,
        isPlaying: false,
        volume: 50,
        shuffle: false,
        repeat: 'none'
      })

      channel.send({
        type: 'broadcast',
        event: 'user:join',
        payload: { user }
      })
    }

    initRoom()

    channel
      .on('broadcast', { event: 'player:play' }, () => {
        updatePlayerState({ isPlaying: true })
      })
      .on('broadcast', { event: 'player:pause' }, () => {
        updatePlayerState({ isPlaying: false })
      })
      .on('broadcast', { event: 'player:seek' }, ({ payload }) => {
        updatePlayerState({ position: payload.position })
      })
      .on('broadcast', { event: 'player:next' }, () => {
        const store = useRoomStore.getState()
        const nextIndex = Math.min(store.playerState.currentSongIndex + 1, store.playlist.length - 1)
        updatePlayerState({ currentSongIndex: nextIndex, position: 0 })
      })
      .on('broadcast', { event: 'player:previous' }, () => {
        const store = useRoomStore.getState()
        const prevIndex = Math.max(store.playerState.currentSongIndex - 1, 0)
        updatePlayerState({ currentSongIndex: prevIndex, position: 0 })
      })
      .on('broadcast', { event: 'player:state' }, async ({ payload }) => {
        updatePlayerState(payload.state)
        await fetch(`/api/rooms/${roomId}/player-state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: payload.state })
        })
      })
      .on('broadcast', { event: 'playlist:update' }, ({ payload }) => {
        setPlaylist(payload.playlist)
      })
      .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
        addChatMessage(payload.message)
      })
      .on('broadcast', { event: 'user:join' }, ({ payload }) => {
        addUser(payload.user)
      })
      .on('broadcast', { event: 'user:leave' }, ({ payload }) => {
        removeUser(payload.userId)
      })
      .on('broadcast', { event: 'users:update' }, ({ payload }) => {
        setUsers(payload.users)
      })
      .subscribe()

    return () => {
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'user:leave',
          payload: { userId: user.id }
        })

        fetch(`/api/rooms/${roomId}/users?userId=${user.id}`, {
          method: 'DELETE'
        })

        channel.unsubscribe()
      }
    }
  }, [roomId, user])

  return channelRef.current
}
