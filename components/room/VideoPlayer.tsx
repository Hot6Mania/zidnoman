'use client'

import { useRef, useEffect, useState } from 'react'
import ReactPlayer from 'react-player'
import { useRoomStore } from '@/lib/stores/room-store'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { toast } from 'sonner'
import { audioEngine } from '@/lib/audio/audio-engine'
import { InfinityLoader } from '@/components/ui/infinity-loader'
import { NiconicoPlayer, NiconicoPlayerRef } from './NiconicoPlayer'
import { YouTubePlayer, YouTubePlayerRef } from './YouTubePlayer'
import { RealtimeChannel } from '@supabase/supabase-js'
import { isSyncMaster, getSyncMaster } from '@/lib/permissions'

interface VideoPlayerProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function VideoPlayer({ roomId, channel }: VideoPlayerProps) {
  const playerRef = useRef<any>(null)
  const niconicoPlayerRef = useRef<NiconicoPlayerRef>(null)
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null)
  const { currentSong, playerState, updatePlayerState, djState, currentUser, users, playlist } = useRoomStore()
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const audioInitializedRef = useRef(false)
  const MAX_RETRIES = 2
  const [localPosition, setLocalPosition] = useState(0)
  const localPositionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousPositionRef = useRef<number>(0)
  const stateRestoreTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRestoredStateRef = useRef<{ isPlaying: boolean; timestamp: number } | null>(null)

  const song = currentSong()
  const isNiconico = song?.platform === 'niconico'
  const isYouTube = song?.platform === 'youtube'
  const isUserSyncMaster = isSyncMaster(currentUser, users)

  useEffect(() => {
    if (!song && playlist.length > 0 && playerState.currentSongIndex >= playlist.length) {
      updatePlayerState({ currentSongIndex: Math.max(0, playlist.length - 1) })
    }
  }, [playlist.length, playerState.currentSongIndex, song])

  useEffect(() => {
    if (playerState.position > 0) {
      if (isNiconico && niconicoPlayerRef.current) {
        niconicoPlayerRef.current.seekTo(playerState.position)
      } else if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(playerState.position)
        if (!playerState.isPlaying) {
          setTimeout(() => {
            if (youtubePlayerRef.current) {
              youtubePlayerRef.current.pauseVideo()
            }
          }, 100)
        }
      } else if (playerRef.current) {
        playerRef.current.seekTo(playerState.position, 'seconds')
      }
    }
  }, [playerState.currentSongIndex, isNiconico, isYouTube])

  const handleProgress = async ({ playedSeconds }: { playedSeconds: number }) => {
    const previousPosition = previousPositionRef.current
    const positionDiff = Math.abs(playedSeconds - previousPosition)

    // Detect if sync master seeked via iframe controls
    // Large jump (>3s) indicates a seek action (not buffering or normal playback)
    if (isUserSyncMaster && positionDiff > 3 && previousPosition > 0) {
      console.log('🎯 Sync master iframe seek detected:', {
        from: previousPosition.toFixed(1),
        to: playedSeconds.toFixed(1),
        diff: positionDiff.toFixed(1)
      })

      // Update previous position immediately to prevent duplicate detection
      previousPositionRef.current = playedSeconds

      // Update server
      await fetch(`/api/rooms/${roomId}/player-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: { position: playedSeconds } })
      })

      // Broadcast to other users
      emitRealtimeEvent(channel, 'player:seek', { position: playedSeconds })
    } else {
      // Normal progress update
      previousPositionRef.current = playedSeconds
    }

    updatePlayerState({ position: playedSeconds })
  }

  const handleEnded = async () => {
    const store = useRoomStore.getState()
    const { currentSongIndex, mode, repeat } = store.playerState
    const currentSongId = store.playlist[currentSongIndex]?.id

    // Repeat One: Restart current song
    if (repeat === 'one') {
      updatePlayerState({ position: 0, isPlaying: true })

      // Actually seek the player to start
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(0)
        youtubePlayerRef.current.playVideo()
      } else if (isNiconico && niconicoPlayerRef.current) {
        niconicoPlayerRef.current.seekTo(0)
      } else if (playerRef.current) {
        playerRef.current.seekTo(0)
      }

      emitRealtimeEvent(channel, 'player:state', {
        state: { position: 0, isPlaying: true }
      })
      return
    }

    // Queue mode: Remove song after playing
    if (mode === 'queue' && currentSongId) {
      await fetch(`/api/rooms/${roomId}/songs?songId=${currentSongId}`, {
        method: 'DELETE'
      })
      // After removal, current song at same index is now the next song
      emitRealtimeEvent(channel, 'player:state', {
        state: { position: 0, isPlaying: true }
      })
      return
    }

    // List mode: Navigate through playlist
    const nextIndex = currentSongIndex + 1

    if (nextIndex < store.playlist.length) {
      emitRealtimeEvent(channel, 'player:state', {
        state: { currentSongIndex: nextIndex, position: 0, isPlaying: true }
      })
    } else if (repeat === 'all') {
      emitRealtimeEvent(channel, 'player:state', {
        state: { currentSongIndex: 0, position: 0, isPlaying: true }
      })
    } else {
      emitRealtimeEvent(channel, 'player:pause')
    }
  }

  const handleReady = () => {
    console.log('✅ Player ready:', {
      platform: song?.platform,
      title: song?.title,
      url: song?.url,
      platformId: song?.platformId
    })
    setIsReady(true)
    setError(null)

    if (!isYouTube && playerState.position > 0 && playerRef.current) {
      playerRef.current.seekTo(playerState.position, 'seconds')
    }
  }

  const handleStart = () => {
    console.log('▶️  Player started:', {
      platform: song?.platform,
      title: song?.title,
      isPlaying: playerState.isPlaying
    })
    setIsReady(true)
    setError(null)
  }

  const handleError = (e: any) => {
    console.error('❌ Player error:', {
      platform: song?.platform,
      title: song?.title,
      url: song?.url,
      platformId: song?.platformId,
      error: e,
      errorType: typeof e,
      errorData: e?.data,
      errorTarget: e?.target,
      retryCount
    })

    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
      setRetryCount(prev => prev + 1)
      setError(`재생 오류 - 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`)
      toast.warning(`재생 오류 - 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`)

      setTimeout(() => {
        setIsReady(false)
        setTimeout(() => setIsReady(true), 500)
      }, 1000)
      return
    }

    const errorMsg = `재생 오류 [${song?.platform}]: ${song?.title || '알 수 없는 곡'} - 다음 곡으로 이동합니다`
    setError(errorMsg)
    toast.error(errorMsg, { duration: 4000 })

    setTimeout(() => {
      handleEnded()
    }, 2000)
  }

  const handleYouTubeStateChange = async (state: 'playing' | 'paused') => {
    if (isUserSyncMaster) {
      console.log('✅ Master iframe interaction detected, updating playerState')
      const currentPosition = youtubePlayerRef.current?.getCurrentTime ?
        youtubePlayerRef.current.getCurrentTime() : playerState.position

      const newState = {
        isPlaying: state === 'playing',
        position: currentPosition
      }

      updatePlayerState(newState)

      await fetch(`/api/rooms/${roomId}/player-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState })
      })

      emitRealtimeEvent(channel, state === 'playing' ? 'player:play' : 'player:pause')
    } else {
      // Non-master: debounced state restoration to prevent infinite loops
      const serverIsPlaying = playerState.isPlaying
      const iframeSaysPlaying = state === 'playing'

      // Check if we recently restored to this state (prevent oscillation)
      const now = Date.now()
      if (lastRestoredStateRef.current &&
          lastRestoredStateRef.current.isPlaying === serverIsPlaying &&
          now - lastRestoredStateRef.current.timestamp < 1000) {
        console.log('⏭️ Skipping state restore (recently restored)')
        return
      }

      if (serverIsPlaying !== iframeSaysPlaying) {
        console.log('🔄 Non-master state mismatch, restoring server state:', {
          iframe: state,
          server: serverIsPlaying ? 'playing' : 'paused'
        })

        // Clear any pending restore
        if (stateRestoreTimeoutRef.current) {
          clearTimeout(stateRestoreTimeoutRef.current)
        }

        // Debounce state restoration
        stateRestoreTimeoutRef.current = setTimeout(() => {
          if (youtubePlayerRef.current) {
            if (serverIsPlaying) {
              youtubePlayerRef.current.playVideo()
            } else {
              youtubePlayerRef.current.pauseVideo()
            }

            lastRestoredStateRef.current = {
              isPlaying: serverIsPlaying,
              timestamp: Date.now()
            }
          }
        }, 200)
      }
    }
  }

  useEffect(() => {
    if (!song) return

    console.log('🔄 Song changed:', {
      platform: song?.platform,
      title: song?.title,
      url: song?.url,
      platformId: song?.platformId
    })
    setError(null)
    setIsReady(false)
    setRetryCount(0)
    audioInitializedRef.current = false
    previousPositionRef.current = 0
    lastRestoredStateRef.current = null

    const loadingTimeout = setTimeout(() => {
      setIsReady(prev => {
        if (!prev) {
          console.warn('⏱️  Player loading timeout, forcing ready state:', {
            platform: song?.platform,
            title: song?.title
          })
          return true
        }
        return prev
      })
    }, 5000)

    return () => {
      clearTimeout(loadingTimeout)
      if (stateRestoreTimeoutRef.current) {
        clearTimeout(stateRestoreTimeoutRef.current)
      }
    }
  }, [song?.id])

  useEffect(() => {
    if (!channel || isUserSyncMaster) return

    const handleSeek = ({ payload }: any) => {
      console.log('📍 Seek event received:', payload.position)

      // Clear previous position to prevent re-detection
      previousPositionRef.current = payload.position

      if (isNiconico && niconicoPlayerRef.current) {
        niconicoPlayerRef.current.seekTo(payload.position)
      } else if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(payload.position)
        if (!playerState.isPlaying) {
          setTimeout(() => {
            if (youtubePlayerRef.current) {
              youtubePlayerRef.current.pauseVideo()
            }
          }, 100)
        }
      } else if (playerRef.current) {
        playerRef.current.seekTo(payload.position, 'seconds')
      }
    }

    const handleHeartbeat = ({ payload }: any) => {
      // Skip heartbeat sync for non-master users (they follow real-time events instead)
      if (!isUserSyncMaster) {
        // Only sync play/pause state
        if (payload.playerState.isPlaying !== playerState.isPlaying) {
          console.log(`🔄 Non-master: syncing play/pause state: server=${payload.playerState.isPlaying}`)
          updatePlayerState({ isPlaying: payload.playerState.isPlaying })
        }
        return
      }

      // Master: validate heartbeat is from current sync master
      const store = useRoomStore.getState()
      const syncMaster = getSyncMaster(store.users)
      if (payload.userId !== syncMaster?.id) {
        console.log('⏭️ Ignoring heartbeat from non-master user')
        return
      }

      const serverPos = payload.playerState.position
      let currentPos = 0

      if (isYouTube && youtubePlayerRef.current?.getCurrentTime) {
        currentPos = youtubePlayerRef.current.getCurrentTime()
      } else if (isNiconico && niconicoPlayerRef.current?.getCurrentTime) {
        currentPos = niconicoPlayerRef.current.getCurrentTime()
      } else if (playerRef.current?.getCurrentTime) {
        currentPos = playerRef.current.getCurrentTime()
      } else {
        currentPos = playerState.position
      }

      const drift = Math.abs(currentPos - serverPos)

      // Only sync if drift is significant
      if (drift >= 5.0) {
        console.log(`🔄 Master heartbeat sync (JUMP): local=${currentPos.toFixed(1)}s, server=${serverPos.toFixed(1)}s, drift=${drift.toFixed(1)}s`)

        previousPositionRef.current = serverPos

        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(serverPos)
          if (!payload.playerState.isPlaying) {
            setTimeout(() => {
              if (youtubePlayerRef.current) {
                youtubePlayerRef.current.pauseVideo()
              }
            }, 100)
          }
        } else if (isNiconico && niconicoPlayerRef.current) {
          niconicoPlayerRef.current.seekTo(serverPos)
        } else if (playerRef.current) {
          playerRef.current.seekTo(serverPos, 'seconds')
        }
        updatePlayerState({ position: serverPos })
      } else if (drift >= 3.0 && drift < 5.0 && isYouTube && youtubePlayerRef.current?.smoothSyncTo) {
        console.log(`🔄 Master heartbeat sync (SMOOTH): local=${currentPos.toFixed(1)}s, server=${serverPos.toFixed(1)}s, drift=${drift.toFixed(1)}s`)
        const originalRate = payload.playerState.playbackRate || 1.0
        youtubePlayerRef.current.smoothSyncTo(serverPos, currentPos, originalRate)
      }
    }

    channel
      .on('broadcast', { event: 'player:seek' }, handleSeek)
      .on('broadcast', { event: 'sync:heartbeat' }, handleHeartbeat)
  }, [channel, isNiconico, isYouTube, isUserSyncMaster])

  // DJ features disabled to prevent duplicate playback
  // useEffect(() => {
  //   if (djState && audioInitializedRef.current) {
  //     audioEngine.applyDJState(djState)
  //   }
  // }, [djState])

  // useEffect(() => {
  //   if (playerState.isPlaying) {
  //     audioEngine.resume()
  //   } else {
  //     audioEngine.suspend()
  //   }
  // }, [playerState.isPlaying])

  // useEffect(() => {
  //   return () => {
  //     audioEngine.disconnect()
  //   }
  // }, [])

  if (!song) {
    return (
      <div className="w-full aspect-video bg-gradient-to-br from-muted/50 to-muted lg:rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
        <div className="text-center space-y-4 p-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">재생할 곡이 없습니다</h3>
            <p className="text-sm text-muted-foreground">위 링크 입력창에 URL을 추가해주세요</p>
            <p className="text-xs text-muted-foreground/80 mt-2">
              YouTube 지원 / <span className="text-muted-foreground/50">SoundCloud, 니코동 추가 예정</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const PlayerComponent = ReactPlayer as any

  return (
    <div className="w-full aspect-video bg-black lg:rounded-lg overflow-hidden relative">
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="scale-75">
            <InfinityLoader />
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
          <div className="text-center max-w-md px-4">
            <div className="mb-4">
              {retryCount < MAX_RETRIES ? (
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-red-500 text-2xl">✕</span>
                </div>
              )}
            </div>
            <p className={`${retryCount < MAX_RETRIES ? 'text-yellow-500' : 'text-red-500'} mb-2 font-medium`}>
              {error}
            </p>
            {retryCount >= MAX_RETRIES && (
              <p className="text-white text-sm opacity-80">2초 후 다음 곡으로 이동합니다...</p>
            )}
          </div>
        </div>
      )}

      {isNiconico ? (
        <NiconicoPlayer
          ref={niconicoPlayerRef}
          videoId={song.platformId}
          playing={playerState.isPlaying}
          volume={playerState.volume}
          onReady={handleReady}
          onStart={handleStart}
          onProgress={handleProgress}
          onEnded={handleEnded}
          onError={handleError}
        />
      ) : isYouTube ? (
        <YouTubePlayer
          ref={youtubePlayerRef}
          videoId={song.platformId}
          playing={playerState.isPlaying}
          volume={playerState.volume}
          playbackRate={playerState.playbackRate || 1.0}
          isSyncMaster={isUserSyncMaster}
          initialPosition={playerState.position}
          onReady={handleReady}
          onStart={handleStart}
          onProgress={handleProgress}
          onEnded={handleEnded}
          onError={handleError}
          onStateChange={handleYouTubeStateChange}
        />
      ) : (
        <PlayerComponent
          ref={playerRef}
          url={song.url}
          playing={playerState.isPlaying}
          volume={playerState.volume / 100}
          playbackRate={playerState.playbackRate || 1.0}
          width="100%"
          height="100%"
          onProgress={handleProgress}
          onEnded={handleEnded}
          onReady={handleReady}
          onStart={handleStart}
          onError={handleError}
          config={{
            soundcloud: {
              options: {
                auto_play: true,
                buying: false,
                sharing: false,
                download: false,
                show_playcount: false
              }
            },
            file: {
              attributes: {
                controlsList: 'nodownload'
              }
            }
          }}
          progressInterval={1000}
        />
      )}
    </div>
  )
}
