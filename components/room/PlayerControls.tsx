'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, List, ListChecks, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useRoomStore } from '@/lib/stores/room-store'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { formatDuration } from '@/lib/utils'
import { isSyncMaster } from '@/lib/permissions'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PlayerControlsProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function PlayerControls({ roomId, channel }: PlayerControlsProps) {
  const { currentSong, playerState, updatePlayerState, currentUser, users, shufflePlaylist, unshufflePlaylist, room, voteSkipState, setVoteSkipState } = useRoomStore()
  const [voteSkipLoading, setVoteSkipLoading] = useState(false)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(50)
  const [displayPosition, setDisplayPosition] = useState(0)

  useEffect(() => {
    const savedVolume = localStorage.getItem('player-volume')
    if (savedVolume) {
      const vol = parseInt(savedVolume)
      setVolume(vol)
      updatePlayerState({ volume: vol })
    }
  }, [])

  useEffect(() => {
    updatePlayerState({ volume: isMuted ? 0 : volume })
  }, [volume, isMuted])

  useEffect(() => {
    const drift = Math.abs(displayPosition - playerState.position)
    if (drift > 2 || !playerState.isPlaying) {
      setDisplayPosition(playerState.position)
    }
  }, [playerState.position, playerState.currentSongIndex])

  useEffect(() => {
    if (!playerState.isPlaying) return

    const interval = setInterval(() => {
      setDisplayPosition(prev => prev + 0.5)
    }, 500)

    return () => clearInterval(interval)
  }, [playerState.isPlaying])

  const userIsSyncMaster = isSyncMaster(currentUser, users)
  const song = currentSong()
  const voteSkipEnabled = room?.settings.enableVoteSkip || false

  // Fetch vote-skip status when song changes
  useEffect(() => {
    if (!song || !currentUser || !voteSkipEnabled) return

    const fetchVoteSkipStatus = async () => {
      try {
        const response = await fetch(
          `/api/rooms/${roomId}/vote-skip?songId=${song.id}&userId=${currentUser.id}`
        )
        if (response.ok) {
          const data = await response.json()
          setVoteSkipState({
            voteCount: data.voteCount,
            requiredVotes: data.requiredVotes,
            hasVoted: data.hasVoted
          })
        }
      } catch (error) {
        console.error('Failed to fetch vote-skip status:', error)
      }
    }

    fetchVoteSkipStatus()
  }, [song?.id, currentUser?.id, roomId, voteSkipEnabled, setVoteSkipState])

  const handlePlayPause = async () => {
    const newState = { isPlaying: !playerState.isPlaying }

    // Optimistic update: Apply immediately to local state
    updatePlayerState(newState)

    // Then update server and broadcast (async, don't wait)
    fetch(`/api/rooms/${roomId}/player-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    }).catch(error => {
      console.error('Failed to update play/pause state:', error)
      // Revert on error
      updatePlayerState({ isPlaying: !newState.isPlaying })
    })

    // Broadcast to other users
    if (playerState.isPlaying) {
      emitRealtimeEvent(channel, 'player:pause')
    } else {
      emitRealtimeEvent(channel, 'player:play')
    }
  }

  const handleNext = async () => {
    const store = useRoomStore.getState()
    const nextIndex = Math.min(store.playerState.currentSongIndex + 1, store.playlist.length - 1)
    const newState = { currentSongIndex: nextIndex, position: 0 }

    // Optimistic update: Apply immediately
    updatePlayerState(newState)

    // Update server (async)
    fetch(`/api/rooms/${roomId}/player-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    }).catch(error => {
      console.error('Failed to update next song:', error)
    })

    // Broadcast to other users
    emitRealtimeEvent(channel, 'player:state', { state: newState })
  }

  const handlePrevious = async () => {
    const store = useRoomStore.getState()
    const prevIndex = Math.max(store.playerState.currentSongIndex - 1, 0)
    const newState = { currentSongIndex: prevIndex, position: 0 }

    // Optimistic update: Apply immediately
    updatePlayerState(newState)

    // Update server (async)
    fetch(`/api/rooms/${roomId}/player-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    }).catch(error => {
      console.error('Failed to update previous song:', error)
    })

    // Broadcast to other users
    emitRealtimeEvent(channel, 'player:state', { state: newState })
  }


  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    localStorage.setItem('player-volume', newVolume.toString())
    if (isMuted && newVolume > 0) {
      setIsMuted(false)
    }
  }

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false)
      setVolume(volumeBeforeMute)
    } else {
      setVolumeBeforeMute(volume)
      setIsMuted(true)
    }
  }

  const handleShuffle = () => {
    const newShuffleState = !playerState.shuffle

    // Optimistic update: Apply immediately
    if (newShuffleState) {
      shufflePlaylist()
    } else {
      unshufflePlaylist()
    }

    // Broadcast to other users
    emitRealtimeEvent(channel, 'player:state', {
      state: { shuffle: newShuffleState }
    })
  }

  const handleRepeat = () => {
    const nextRepeat =
      playerState.repeat === 'none' ? 'all' :
      playerState.repeat === 'all' ? 'one' : 'none'

    // Optimistic update: Apply immediately
    updatePlayerState({ repeat: nextRepeat })

    // Broadcast to other users
    emitRealtimeEvent(channel, 'player:state', {
      state: { repeat: nextRepeat }
    })
  }

  const handleModeToggle = () => {
    const nextMode = playerState.mode === 'list' ? 'queue' : 'list'

    // Optimistic update: Apply immediately
    updatePlayerState({ mode: nextMode })

    // Broadcast to other users
    emitRealtimeEvent(channel, 'player:state', {
      state: { mode: nextMode }
    })
  }

  const handleVoteSkip = async () => {
    if (!song || !currentUser) return

    setVoteSkipLoading(true)
    try {
      const action = voteSkipState.hasVoted ? 'unvote' : 'vote'
      const response = await fetch(`/api/rooms/${roomId}/vote-skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: song.id,
          userId: currentUser.id,
          action
        })
      })

      if (!response.ok) throw new Error('Failed to vote skip')

      const data = await response.json()

      // Update local state
      setVoteSkipState({
        voteCount: data.voteCount,
        requiredVotes: data.requiredVotes,
        hasVoted: data.hasVoted
      })

      // Broadcast to all users
      emitRealtimeEvent(channel, 'song:vote-skip', {
        songId: song.id,
        voteCount: data.voteCount,
        requiredVotes: data.requiredVotes,
        shouldSkip: data.shouldSkip
      })

      if (data.shouldSkip) {
        toast.success('곡이 스킵되었습니다')
      } else if (action === 'vote') {
        toast.success(`스킵 투표 (${data.voteCount}/${data.requiredVotes})`)
      } else {
        toast.info('스킵 투표가 취소되었습니다')
      }
    } catch (error) {
      console.error('Failed to vote skip:', error)
      toast.error('스킵 투표 중 오류가 발생했습니다')
    } finally {
      setVoteSkipLoading(false)
    }
  }

  if (!song) {
    return null
  }

  return (
    <div className="w-full bg-card border-y p-4 lg:space-y-4 space-y-2">
      <div className="lg:space-y-2 space-y-1">
        <div className="flex items-center justify-between text-xs lg:text-sm">
          <span className="text-muted-foreground">{formatDuration(displayPosition)}</span>
          <span className="text-muted-foreground">{formatDuration(song.duration)}</span>
        </div>
        {/* Simple progress bar - display only */}
        <div className="w-full h-0.5 lg:h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-linear rounded-full"
            style={{ width: `${Math.min(100, (displayPosition / song.duration) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="lg:w-64 lg:flex-shrink-0 min-w-0">
          <h3 className="font-semibold truncate">{song.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2 lg:flex-1">
          <div className="flex items-center gap-2">
            <Button
              variant={playerState.mode === 'queue' ? "default" : "ghost"}
              size="icon"
              onClick={handleModeToggle}
              className="hidden lg:flex"
              disabled={!userIsSyncMaster}
              title={playerState.mode === 'queue' ? 'Queue Mode (removes after play)' : 'List Mode (keeps songs)'}
            >
              {playerState.mode === 'queue' ? (
                <ListChecks className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant={playerState.shuffle ? "default" : "ghost"}
              size="icon"
              onClick={handleShuffle}
              className="hidden sm:flex"
              disabled={!userIsSyncMaster}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={!userIsSyncMaster}
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={handlePlayPause}
              className="h-12 w-12"
              disabled={!userIsSyncMaster}
            >
              {playerState.isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!userIsSyncMaster}
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant={playerState.repeat !== 'none' ? "default" : "ghost"}
              size="icon"
              onClick={handleRepeat}
              className="hidden sm:flex"
              disabled={!userIsSyncMaster}
            >
              <Repeat className="h-4 w-4" />
            </Button>

            {voteSkipEnabled && (
              <Button
                variant={voteSkipState.hasVoted ? "default" : "ghost"}
                size="icon"
                onClick={handleVoteSkip}
                className="hidden md:flex"
                disabled={voteSkipLoading}
                title={`스킵 투표 (${voteSkipState.voteCount}/${voteSkipState.requiredVotes})`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMuteToggle}
              className="h-8 w-8 flex-shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20 sm:w-24 lg:w-28"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
