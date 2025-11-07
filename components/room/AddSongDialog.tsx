'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { useRoomStore } from '@/lib/stores/room-store'
import { parseYouTubeUrl } from '@/lib/utils'
import { getYouTubeVideoInfo } from '@/lib/youtube'
import { getSoundCloudTrackInfo } from '@/lib/soundcloud'
import { getNiconicoVideoInfo } from '@/lib/niconico'
import { nanoid } from 'nanoid'
import { Song } from '@/lib/types'

interface AddSongDialogProps {
  roomId: string
}

export function AddSongDialog({ roomId }: AddSongDialogProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const { currentUser } = useRoomStore()

  const detectPlatform = (url: string): { platform: string; id: string | null } => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { platform: 'youtube', id: parseYouTubeUrl(url) }
    }
    if (url.includes('soundcloud.com')) {
      return { platform: 'soundcloud', id: url }
    }
    if (url.includes('nicovideo.jp')) {
      const match = url.match(/(?:watch|sm)(\d+)/)
      return { platform: 'niconico', id: match ? match[1] : null }
    }
    if (url.includes('bilibili.com')) {
      const match = url.match(/\/video\/(BV\w+)/)
      return { platform: 'bilibili', id: match ? match[1] : null }
    }
    return { platform: 'unknown', id: null }
  }

  const handleAdd = async () => {
    if (!url.trim() || !currentUser) return

    setLoading(true)

    try {
      const { platform, id } = detectPlatform(url)

      if (!id) {
        toast.error('지원하지 않는 URL 형식입니다')
        return
      }

      let songData: Partial<Song> = {
        id: nanoid(),
        platform: platform as any,
        platformId: id,
        url: url,
        addedBy: currentUser.id,
        addedAt: Date.now()
      }

      if (platform === 'youtube') {
        const info = await getYouTubeVideoInfo(id)
        songData = { ...songData, ...info }
      } else if (platform === 'soundcloud') {
        const info = await getSoundCloudTrackInfo(url)
        songData = { ...songData, ...info }
      } else if (platform === 'niconico') {
        const info = await getNiconicoVideoInfo(id)
        songData = { ...songData, ...info }
      }

      const response = await fetch(`/api/rooms/${roomId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song: songData as Song })
      })

      if (!response.ok) throw new Error('Failed to add song')

      const { playlist } = await response.json()

      emitRealtimeEvent(roomId, 'song:add', { song: songData as Song })
      emitRealtimeEvent(roomId, 'playlist:update', { playlist })

      toast.success('곡이 플레이리스트에 추가되었습니다')
      setUrl('')
      setOpen(false)
    } catch (error) {
      console.error('Error adding song:', error)
      toast.error('곡을 추가하는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          곡 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>곡 추가하기</DialogTitle>
          <DialogDescription>
            YouTube, SoundCloud, Niconico 링크를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="url">URL로 추가</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label>영상 URL</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
              />
              <p className="text-xs text-muted-foreground">
                YouTube, SoundCloud, Niconico 링크를 지원합니다
              </p>
            </div>

            <Button
              onClick={handleAdd}
              disabled={!url.trim() || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  추가 중...
                </>
              ) : (
                '추가하기'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
