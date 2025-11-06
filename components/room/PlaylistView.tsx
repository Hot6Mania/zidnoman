'use client'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRoomStore } from '@/lib/stores/room-store'
import { getSocket } from '@/lib/socket'
import { Song } from '@/lib/types'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GripVertical, Play, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface SortableItemProps {
  song: Song
  index: number
  isCurrentlyPlaying: boolean
  onRemove: (songId: string) => void
  onPlay: (index: number) => void
}

function SortableItem({ song, index, isCurrentlyPlaying, onRemove, onPlay }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id })

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
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
        <Image
          src={song.thumbnailUrl}
          alt={song.title}
          fill
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
        {!isCurrentlyPlaying && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPlay(index)}
            className="opacity-0 group-hover:opacity-100"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(song.id)}
          className="opacity-0 group-hover:opacity-100 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface PlaylistViewProps {
  roomId: string
}

export function PlaylistView({ roomId }: PlaylistViewProps) {
  const { playlist, playerState } = useRoomStore()
  const socket = getSocket()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = playlist.findIndex(s => s.id === active.id)
    const newIndex = playlist.findIndex(s => s.id === over.id)

    socket?.emit('song:reorder', {
      roomId,
      fromIndex: oldIndex,
      toIndex: newIndex
    })
  }

  const handleRemove = (songId: string) => {
    socket?.emit('song:remove', { roomId, songId })
  }

  const handlePlay = (index: number) => {
    socket?.emit('player:state', {
      roomId,
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

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={playlist.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {playlist.map((song, index) => (
            <SortableItem
              key={song.id}
              song={song}
              index={index}
              isCurrentlyPlaying={index === playerState.currentSongIndex}
              onRemove={handleRemove}
              onPlay={handlePlay}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
