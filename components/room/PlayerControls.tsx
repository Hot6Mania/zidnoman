'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useRoomStore } from '@/lib/stores/room-store'
import { getSocket } from '@/lib/socket'
import { formatDuration } from '@/lib/utils'

interface PlayerControlsProps {
  roomId: string
}

export function PlayerControls({ roomId }: PlayerControlsProps) {
  const { currentSong, playerState, updatePlayerState } = useRoomStore()
  const socket = getSocket()

  const song = currentSong()

  const handlePlayPause = () => {
    if (playerState.isPlaying) {
      socket?.emit('player:pause', { roomId })
    } else {
      socket?.emit('player:play', { roomId })
    }
  }

  const handleNext = () => {
    const store = useRoomStore.getState()
    const nextIndex = Math.min(store.playerState.currentSongIndex + 1, store.playlist.length - 1)

    socket?.emit('player:state', {
      roomId,
      state: { currentSongIndex: nextIndex, position: 0 }
    })
  }

  const handlePrevious = () => {
    const store = useRoomStore.getState()
    const prevIndex = Math.max(store.playerState.currentSongIndex - 1, 0)

    socket?.emit('player:state', {
      roomId,
      state: { currentSongIndex: prevIndex, position: 0 }
    })
  }

  const handleSeek = (value: number[]) => {
    const position = value[0]
    socket?.emit('player:seek', { roomId, position })
    updatePlayerState({ position })
  }

  const handleVolumeChange = (value: number[]) => {
    updatePlayerState({ volume: value[0] })
  }

  const handleShuffle = () => {
    socket?.emit('player:state', {
      roomId,
      state: { shuffle: !playerState.shuffle }
    })
  }

  const handleRepeat = () => {
    const nextRepeat =
      playerState.repeat === 'none' ? 'all' :
      playerState.repeat === 'all' ? 'one' : 'none'

    socket?.emit('player:state', {
      roomId,
      state: { repeat: nextRepeat }
    })
  }

  if (!song) {
    return null
  }

  return (
    <div className="w-full bg-card border-y p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{formatDuration(playerState.position)}</span>
          <span className="text-muted-foreground">{formatDuration(song.duration)}</span>
        </div>
        <Slider
          value={[playerState.position]}
          max={song.duration}
          step={1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{song.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={playerState.shuffle ? "default" : "ghost"}
            size="icon"
            onClick={handleShuffle}
            className="hidden sm:flex"
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handlePrevious}>
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={handlePlayPause}
            className="h-12 w-12"
          >
            {playerState.isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleNext}>
            <SkipForward className="h-5 w-5" />
          </Button>

          <Button
            variant={playerState.repeat !== 'none' ? "default" : "ghost"}
            size="icon"
            onClick={handleRepeat}
            className="hidden sm:flex"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground hidden md:block" />
          <Slider
            value={[playerState.volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-24 hidden md:block"
          />
        </div>
      </div>
    </div>
  )
}
