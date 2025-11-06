'use client'

import { useRef, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { useRoomStore } from '@/lib/stores/room-store'
import { getSocket } from '@/lib/socket'

interface VideoPlayerProps {
  roomId: string
}

export function VideoPlayer({ roomId }: VideoPlayerProps) {
  const playerRef = useRef<any>(null)
  const { currentSong, playerState, updatePlayerState } = useRoomStore()
  const socket = getSocket()

  const song = currentSong()

  useEffect(() => {
    if (!socket) return

    const handleSeek = (data: { position: number }) => {
      playerRef.current?.seekTo(data.position, 'seconds')
    }

    socket.on('player:seek', handleSeek)

    return () => {
      socket.off('player:seek', handleSeek)
    }
  }, [socket])

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    updatePlayerState({ position: playedSeconds })
  }

  const handleEnded = () => {
    const store = useRoomStore.getState()
    const nextIndex = store.playerState.currentSongIndex + 1

    if (nextIndex < store.playlist.length) {
      socket?.emit('player:state', {
        roomId,
        state: { currentSongIndex: nextIndex, position: 0, isPlaying: true }
      })
    } else if (playerState.repeat === 'all') {
      socket?.emit('player:state', {
        roomId,
        state: { currentSongIndex: 0, position: 0, isPlaying: true }
      })
    } else {
      socket?.emit('player:pause', { roomId })
    }
  }

  const handleReady = () => {
    if (playerState.position > 0) {
      playerRef.current?.seekTo(playerState.position, 'seconds')
    }
  }

  if (!song) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-primary"
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
          <div>
            <h3 className="text-lg font-semibold">플레이리스트가 비어있습니다</h3>
            <p className="text-sm text-muted-foreground">첫 번째 곡을 추가해보세요</p>
          </div>
        </div>
      </div>
    )
  }

  const PlayerComponent = ReactPlayer as any

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <PlayerComponent
        ref={playerRef}
        url={song.url}
        playing={playerState.isPlaying}
        volume={playerState.volume / 100}
        width="100%"
        height="100%"
        onProgress={handleProgress}
        onEnded={handleEnded}
        onReady={handleReady}
        config={{
          youtube: {
            playerVars: {
              modestbranding: 1,
              rel: 0
            }
          }
        }}
        progressInterval={1000}
      />
    </div>
  )
}
