'use client'
import { RealtimeChannel } from '@supabase/supabase-js'

import { useRoomStore } from '@/lib/stores/room-store'
import { Button } from '@/components/ui/button'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { HotCue } from '@/lib/types'

interface HotCuesProps {
  channel: RealtimeChannel | null
  roomId: string
  disabled?: boolean
}

const HOT_CUE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
]

export function HotCues({ roomId, channel, disabled = false }: HotCuesProps) {
  const { currentSong: getCurrentSong, playerState, songMetadata, setSongMetadata } = useRoomStore()

  const currentSong = getCurrentSong()

  if (!currentSong) return null

  const metadata = songMetadata[currentSong.id] || { hotCues: [], bpm: undefined, key: undefined }

  const handleSetHotCue = async (id: number) => {
    const hotCue: HotCue = {
      id,
      position: playerState.position,
      color: HOT_CUE_COLORS[id],
      label: `Cue ${id + 1}`
    }

    const updatedMetadata = { ...metadata }
    const existingIndex = updatedMetadata.hotCues.findIndex(cue => cue.id === id)

    if (existingIndex >= 0) {
      updatedMetadata.hotCues[existingIndex] = hotCue
    } else {
      updatedMetadata.hotCues.push(hotCue)
      updatedMetadata.hotCues.sort((a, b) => a.id - b.id)
    }

    setSongMetadata(currentSong.id, updatedMetadata)

    try {
      await fetch(`/api/rooms/${roomId}/hotcues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: currentSong.id,
          hotCue
        })
      })

      emitRealtimeEvent(channel, 'dj:hotcue-set', {
        songId: currentSong.id,
        hotCue
      })
    } catch (error) {
      console.error('Failed to set hot cue:', error)
    }
  }

  const handleJumpToHotCue = async (id: number) => {
    const hotCue = metadata.hotCues.find(cue => cue.id === id)
    if (!hotCue) return

    try {
      emitRealtimeEvent(channel, 'dj:hotcue-jump', {
        songId: currentSong.id,
        hotCueId: id
      })
    } catch (error) {
      console.error('Failed to jump to hot cue:', error)
    }
  }

  const handleDeleteHotCue = async (id: number) => {
    const updatedMetadata = {
      ...metadata,
      hotCues: metadata.hotCues.filter(cue => cue.id !== id)
    }

    setSongMetadata(currentSong.id, updatedMetadata)

    try {
      await fetch(`/api/rooms/${roomId}/hotcues?songId=${currentSong.id}&hotCueId=${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to delete hot cue:', error)
    }
  }

  const handleAutoGenerate = async () => {
    if (!currentSong) return

    const duration = currentSong.duration
    const generatedCues: HotCue[] = []

    for (let i = 0; i < 8; i++) {
      const position = Math.floor((duration / 9) * (i + 1))
      generatedCues.push({
        id: i,
        position,
        color: HOT_CUE_COLORS[i],
        label: `Cue ${i + 1}`
      })
    }

    const updatedMetadata = {
      ...metadata,
      hotCues: generatedCues
    }

    setSongMetadata(currentSong.id, updatedMetadata)

    try {
      const promises = generatedCues.map(cue =>
        fetch(`/api/rooms/${roomId}/hotcues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: currentSong.id,
            hotCue: cue
          })
        })
      )

      await Promise.all(promises)

      emitRealtimeEvent(channel, 'dj:hotcues-generated', {
        songId: currentSong.id,
        hotCues: generatedCues
      })
    } catch (error) {
      console.error('Failed to auto-generate hot cues:', error)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Hot Cues</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoGenerate}
          disabled={disabled || !currentSong}
        >
          Auto Generate
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const hotCue = metadata.hotCues.find(cue => cue.id === index)

          return (
            <div key={index} className="space-y-1">
              <Button
                variant={hotCue ? 'default' : 'outline'}
                size="sm"
                className="w-full h-10 sm:h-12 relative text-xs sm:text-sm"
                style={hotCue ? { backgroundColor: hotCue.color } : undefined}
                onClick={() => hotCue ? handleJumpToHotCue(index) : handleSetHotCue(index)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (hotCue) handleDeleteHotCue(index)
                }}
                disabled={disabled}
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs font-mono">{index + 1}</span>
                  {hotCue && (
                    <span className="text-[10px] opacity-80">
                      {Math.floor(hotCue.position / 60)}:{Math.floor(hotCue.position % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              </Button>
              {hotCue && (
                <p className="text-[10px] text-muted-foreground text-center truncate">
                  {hotCue.label}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Click to jump, right-click to delete
      </p>
    </div>
  )
}
