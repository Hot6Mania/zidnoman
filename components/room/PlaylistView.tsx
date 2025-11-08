'use client'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRoomStore } from '@/lib/stores/room-store'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { Song } from '@/lib/types'
import { formatDuration } from '@/lib/utils'
import { canRemoveSong, canControlPlayer, canManageSongs } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { GripVertical, Play, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SortableItemProps {
  song: Song
  index: number
  isCurrentlyPlaying: boolean
  onRemove: (songId: string) => void
  onPlay: (index: number) => void
  canRemove: boolean
  canPlay: boolean
  canDrag: boolean
}

function SortableItem({ song, index, isCurrentlyPlaying, onRemove, onPlay, canRemove, canPlay, canDrag }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
    disabled: !canDrag
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 rounded-lg hover:bg-muted ${
        isCurrentlyPlaying ? 'bg-primary/10 border border-primary/20' : ''
      }`}
    >
      {canDrag && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      {!canDrag && (
        <div className="w-5 h-5" />
      )}

      <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
        <Image
          src={song.thumbnailUrl}
          alt={song.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{song.title}</h4>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
        <p className="text-xs text-muted-foreground">
          {formatDuration(song.duration)} · {song.platform}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {!isCurrentlyPlaying && canPlay && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPlay(index)}
            className="opacity-0 group-hover:opacity-100"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(song.id)}
            className="opacity-0 group-hover:opacity-100 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface PlaylistViewProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function PlaylistView({ roomId, channel }: PlaylistViewProps) {
  const { playlist, playerState, currentUser } = useRoomStore()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const userCanManageSongs = canManageSongs(currentUser)
  const userCanControlPlayer = canControlPlayer(currentUser)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = playlist.findIndex(s => s.id === active.id)
    const newIndex = playlist.findIndex(s => s.id === over.id)

    const response = await fetch(`/api/rooms/${roomId}/songs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromIndex: oldIndex, toIndex: newIndex })
    })

    const { playlist: updatedPlaylist } = await response.json()

    emitRealtimeEvent(channel, 'song:reorder', {
      fromIndex: oldIndex,
      toIndex: newIndex
    })
    emitRealtimeEvent(channel, 'playlist:update', { playlist: updatedPlaylist })
  }

  const handleRemove = async (songId: string) => {
    const currentSongIndex = playerState.currentSongIndex
    const currentSong = playlist[currentSongIndex]
    const isDeletingCurrentSong = currentSong?.id === songId
    const deletingIndex = playlist.findIndex(s => s.id === songId)

    const response = await fetch(`/api/rooms/${roomId}/songs?songId=${songId}`, {
      method: 'DELETE'
    })

    const { playlist: updatedPlaylist } = await response.json()

    if (isDeletingCurrentSong) {
      if (updatedPlaylist.length === 0) {
        emitRealtimeEvent(channel, 'player:state', {
          state: { currentSongIndex: 0, position: 0, isPlaying: false }
        })
      } else {
        const newIndex = currentSongIndex >= updatedPlaylist.length
          ? Math.max(0, updatedPlaylist.length - 1)
          : currentSongIndex

        emitRealtimeEvent(channel, 'player:state', {
          state: {
            currentSongIndex: newIndex,
            position: 0,
            isPlaying: true
          }
        })
      }
    } else if (deletingIndex < currentSongIndex) {
      emitRealtimeEvent(channel, 'player:state', {
        state: { currentSongIndex: currentSongIndex - 1 }
      })
    }

    emitRealtimeEvent(channel, 'song:remove', { songId })
    emitRealtimeEvent(channel, 'playlist:update', { playlist: updatedPlaylist })
  }

  const handlePlay = (index: number) => {
    emitRealtimeEvent(channel, 'player:state', {
      state: { currentSongIndex: index, position: 0, isPlaying: true }
    })
  }

  if (playlist.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">플레이리스트가 비어있습니다</p>
          <p className="text-sm text-muted-foreground mt-1">곡을 추가해보세요</p>
        </div>
      </div>
    )
  }

  const currentSong = playlist[playerState.currentSongIndex]
  const upcomingSongs = playlist.filter((_, index) => index !== playerState.currentSongIndex)

  return (
    <div className="space-y-4">
      {currentSong && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">현재 재생 중</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
              <Image
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{currentSong.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(currentSong.duration)} · {currentSong.platform}
              </p>
            </div>
            {canRemoveSong(currentUser, currentSong) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(currentSong.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {upcomingSongs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">대기 중인 곡 ({upcomingSongs.length})</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={upcomingSongs.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {playlist.map((song, index) => {
                if (index === playerState.currentSongIndex) return null
                return (
                  <SortableItem
                    key={song.id}
                    song={song}
                    index={index}
                    isCurrentlyPlaying={false}
                    onRemove={handleRemove}
                    onPlay={handlePlay}
                    canRemove={canRemoveSong(currentUser, song)}
                    canPlay={userCanControlPlayer}
                    canDrag={userCanManageSongs}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}
