import { useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../realtime'
import { useRoomStore } from '../stores/room-store'
import { getSyncMaster } from '../permissions'
import { toast } from 'sonner'
import type { User, Song, ChatMessage, PlayerState, Room } from '../types'

interface RoomState {
  room: Room
  playlist: Song[]
  users: User[]
  playerState: PlayerState
}

export function useRealtime(roomId: string | null, user: User | null): RealtimeChannel | null {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionToastRef = useRef<string | number | null>(null)
  const isUnmountingRef = useRef<boolean>(false)
  const {
    setRoom,
    setPlaylist,
    setUsers,
    updatePlayerState,
    setVoteSkipState,
    addChatMessage,
    setChatMessages,
    addUser,
    removeUser,
    setDJState,
    updateDJState,
    setSongMetadata,
    setSyncMaster
  } = useRoomStore()

  useEffect(() => {
    if (!roomId || !user) return

    console.log('🔌 Initializing Realtime connection for room:', roomId)

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: {
          self: true,
          ack: false // Don't wait for acknowledgment to improve performance
        },
        presence: { key: '' }
      }
    })

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
        repeat: 'none',
        playbackRate: 1.0,
        mode: 'list'
      })

      const syncMaster = getSyncMaster(users)
      setSyncMaster({
        userId: syncMaster?.id || null,
        type: syncMaster?.role === 'owner' ? 'owner' : syncMaster?.role === 'moderator' ? 'moderator' : 'server',
        lastHeartbeat: Date.now()
      })

      // Don't send user:join here, will be sent after subscribe
    }

    const setupChannel = async () => {
      await initRoom()

      channel.subscribe((status, err) => {
        console.log('📡 Channel status:', status, err ? `Error: ${JSON.stringify(err)}` : '')

        if (status === 'SUBSCRIBED') {
          console.log('✅ WebSocket connected to room:', roomId)
          reconnectAttemptRef.current = 0

          // Dismiss connection warning if exists
          if (connectionToastRef.current) {
            toast.dismiss(connectionToastRef.current)
            connectionToastRef.current = null
          }

          channel.send({
            type: 'broadcast',
            event: 'user:join',
            payload: { user }
          })

          const startHeartbeat = () => {
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current)
            }

            heartbeatIntervalRef.current = setInterval(() => {
              const store = useRoomStore.getState()
              const syncMaster = getSyncMaster(store.users)

              if (syncMaster?.id === user?.id) {
                channel.send({
                  type: 'broadcast',
                  event: 'sync:heartbeat',
                  payload: {
                    userId: user.id,
                    timestamp: Date.now(),
                    playerState: store.playerState
                  }
                })
              }
            }, 5000)
          }

          startHeartbeat()
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ Realtime connection issue:', {
            status,
            error: err,
            roomId,
            reconnectAttempt: reconnectAttemptRef.current
          })

          // Clear heartbeat on disconnect
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current)
            heartbeatIntervalRef.current = null
          }

          // Don't reconnect if component is unmounting (user leaving room)
          if (isUnmountingRef.current) {
            console.log('🚪 Component unmounting, skipping reconnection')
            return
          }

          if (reconnectAttemptRef.current < 10) {
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current), 5000)
            console.log(`🔄 Attempting to reconnect in ${delay}ms... (${reconnectAttemptRef.current + 1}/10)`)

            // Show connection warning only on first attempt
            if (reconnectAttemptRef.current === 0 && !connectionToastRef.current) {
              connectionToastRef.current = toast.loading('연결이 끊어졌습니다. 재연결 중...', {
                duration: Infinity
              })
            }

            reconnectTimeoutRef.current = setTimeout(async () => {
              // Double-check if still mounted
              if (isUnmountingRef.current) {
                console.log('🚪 Component unmounted during timeout, aborting reconnection')
                return
              }

              reconnectAttemptRef.current += 1
              console.log(`🔄 Reconnection attempt ${reconnectAttemptRef.current}/10`)

              try {
                // Unsubscribe first
                await channel.unsubscribe()

                // Wait a bit before resubscribing
                setTimeout(() => {
                  if (!isUnmountingRef.current) {
                    channel.subscribe()
                  }
                }, 500)
              } catch (error) {
                console.error('Error during reconnection:', error)
              }
            }, delay)
          } else {
            console.error('❌ Max reconnection attempts reached. Please refresh the page.')

            // Show error toast
            if (connectionToastRef.current) {
              toast.error('연결에 실패했습니다. 페이지를 새로고침해주세요.', {
                id: connectionToastRef.current,
                duration: Infinity
              })
            }
          }
        }
      })
    }

    setupChannel()

    channel
      .on('broadcast', { event: 'player:play' }, async ({ payload }) => {
        console.log('🎵 Received player:play event', payload)
        const newState = { isPlaying: true }
        if (payload?.position !== undefined) {
          Object.assign(newState, { position: payload.position })
        }
        updatePlayerState(newState)
      })
      .on('broadcast', { event: 'player:pause' }, async ({ payload }) => {
        console.log('⏸️  Received player:pause event', payload)
        const newState = { isPlaying: false }
        if (payload?.position !== undefined) {
          Object.assign(newState, { position: payload.position })
        }
        updatePlayerState(newState)
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
        console.log('🔄 Received player:state event:', payload.state)
        updatePlayerState(payload.state)

        // Only update server if not already updated by sender
        if (!payload.skipServerUpdate) {
          await fetch(`/api/rooms/${roomId}/player-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: payload.state })
          })
        }
      })
      .on('broadcast', { event: 'song:add' }, ({ payload }) => {
        // Auto-start playback if playlist was empty
        const store = useRoomStore.getState()
        const wasEmpty = store.playlist.length === 0
        if (wasEmpty && payload?.song) {
          updatePlayerState({ currentSongIndex: 0, isPlaying: true, position: 0 })
        }
      })
      .on('broadcast', { event: 'playlist:update' }, ({ payload }) => {
        const store = useRoomStore.getState()
        const wasEmpty = store.playlist.length === 0

        setPlaylist(payload.playlist)

        // Auto-start if this is the first song added
        if (wasEmpty && payload.playlist.length > 0) {
          updatePlayerState({ currentSongIndex: 0, isPlaying: true, position: 0 })
        }

        // If playlist is now empty, stop playback
        if (payload.playlist.length === 0) {
          updatePlayerState({ currentSongIndex: 0, position: 0, isPlaying: false })
        }

        // Clamp currentSongIndex to valid range
        if (store.playerState.currentSongIndex >= payload.playlist.length && payload.playlist.length > 0) {
          updatePlayerState({ currentSongIndex: payload.playlist.length - 1 })
        }
      })
      .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
        addChatMessage(payload.message)
      })
      .on('broadcast', { event: 'user:join' }, ({ payload }) => {
        addUser(payload.user)

        const store = useRoomStore.getState()
        const newUsers = [...store.users, payload.user]
        const syncMaster = getSyncMaster(newUsers)
        const previousMaster = store.syncMaster.userId

        if (syncMaster?.id !== previousMaster) {
          setSyncMaster({
            userId: syncMaster?.id || null,
            type: syncMaster?.role === 'owner' ? 'owner' : syncMaster?.role === 'moderator' ? 'moderator' : 'server'
          })
          channel.send({
            type: 'broadcast',
            event: 'sync:master-changed',
            payload: {
              masterId: syncMaster?.id || null,
              masterType: syncMaster?.role === 'owner' ? 'owner' : syncMaster?.role === 'moderator' ? 'moderator' : 'server'
            }
          })
        }
      })
      .on('broadcast', { event: 'user:leave' }, ({ payload }) => {
        removeUser(payload.userId)

        const store = useRoomStore.getState()
        const newUsers = store.users.filter(u => u.id !== payload.userId)
        const syncMaster = getSyncMaster(newUsers)
        const previousMaster = store.syncMaster.userId

        if (syncMaster?.id !== previousMaster) {
          setSyncMaster({
            userId: syncMaster?.id || null,
            type: syncMaster?.role === 'owner' ? 'owner' : syncMaster?.role === 'moderator' ? 'moderator' : 'server'
          })
          channel.send({
            type: 'broadcast',
            event: 'sync:master-changed',
            payload: {
              masterId: syncMaster?.id || null,
              masterType: syncMaster?.role === 'owner' ? 'owner' : syncMaster?.role === 'moderator' ? 'moderator' : 'server'
            }
          })
        }
      })
      .on('broadcast', { event: 'users:update' }, ({ payload }) => {
        setUsers(payload.users)
      })
      .on('broadcast', { event: 'song:vote-skip' }, ({ payload }) => {
        setVoteSkipState({
          voteCount: payload.voteCount,
          requiredVotes: payload.requiredVotes
        })

        if (payload.shouldSkip) {
          const store = useRoomStore.getState()
          const nextIndex = Math.min(store.playerState.currentSongIndex + 1, store.playlist.length - 1)
          updatePlayerState({ currentSongIndex: nextIndex, position: 0, isPlaying: true })
        }
      })
      .on('broadcast', { event: 'dj:assign' }, ({ payload }) => {
        const store = useRoomStore.getState()
        if (store.room) {
          setRoom({ ...store.room, djId: payload.userId })
        }
      })
      .on('broadcast', { event: 'dj:unassign' }, () => {
        const store = useRoomStore.getState()
        if (store.room) {
          setRoom({ ...store.room, djId: undefined })
        }
        setDJState(null)
      })
      .on('broadcast', { event: 'dj:state' }, ({ payload }) => {
        updateDJState(payload.state)
      })
      .on('broadcast', { event: 'dj:hotcue-set' }, ({ payload }) => {
        const store = useRoomStore.getState()
        const metadata = store.songMetadata[payload.songId] || { hotCues: [], bpm: undefined, key: undefined }
        const existingIndex = metadata.hotCues.findIndex(cue => cue.id === payload.hotCue.id)
        if (existingIndex >= 0) {
          metadata.hotCues[existingIndex] = payload.hotCue
        } else {
          metadata.hotCues.push(payload.hotCue)
        }
        metadata.hotCues.sort((a, b) => a.id - b.id)
        setSongMetadata(payload.songId, metadata)
      })
      .on('broadcast', { event: 'dj:hotcue-jump' }, ({ payload }) => {
        const store = useRoomStore.getState()
        const metadata = store.songMetadata[payload.songId]
        if (metadata) {
          const hotCue = metadata.hotCues.find(cue => cue.id === payload.hotCueId)
          if (hotCue) {
            updatePlayerState({ position: hotCue.position })
          }
        }
      })
      .on('broadcast', { event: 'sync:heartbeat' }, ({ payload }) => {
        if (payload.userId === user.id) return

        const store = useRoomStore.getState()
        const syncMaster = getSyncMaster(store.users)

        if (syncMaster?.id !== user.id && syncMaster?.id === payload.userId) {
          setSyncMaster({ lastHeartbeat: payload.timestamp })
        }
      })
      .on('broadcast', { event: 'sync:master-changed' }, ({ payload }) => {
        setSyncMaster({
          userId: payload.masterId,
          type: payload.masterType
        })
      })
      .on('broadcast', { event: 'room:update' }, ({ payload }) => {
        setRoom(payload.room)
      })

    return () => {
      // Mark as unmounting to prevent reconnection attempts
      isUnmountingRef.current = true

      // Clear all timers
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Dismiss connection toast if exists
      if (connectionToastRef.current) {
        toast.dismiss(connectionToastRef.current)
        connectionToastRef.current = null
      }

      // Reset reconnect attempt counter
      reconnectAttemptRef.current = 0

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
