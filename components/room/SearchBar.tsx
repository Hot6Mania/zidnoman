'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Youtube, Music, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { useRoomStore } from '@/lib/stores/room-store'
import { parseYouTubeUrl } from '@/lib/utils'
import { getYouTubeVideoInfo, cleanYouTubeUrl } from '@/lib/youtube'
import { getSoundCloudTrackInfo } from '@/lib/soundcloud'
import { getNiconicoVideoInfo } from '@/lib/niconico'
import { nanoid } from 'nanoid'
import { Song } from '@/lib/types'
import Image from 'next/image'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SearchBarProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function SearchBar({ roomId, channel }: SearchBarProps) {
  const [url, setUrl] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{
    thumbnail: string
    title: string
    artist: string
    duration: number
    platform: string
  } | null>(null)
  const { currentUser } = useRoomStore()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const detectPlatform = (url: string): { platform: string; id: string | null } => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { platform: 'youtube', id: parseYouTubeUrl(url) }
    }
    if (url.includes('soundcloud.com')) {
      return { platform: 'soundcloud', id: url }
    }
    if (url.includes('nicovideo.jp')) {
      const match = url.match(/(?:watch\/|\/)((?:sm|so|nm)\d+)/)
      return { platform: 'niconico', id: match ? match[1] : null }
    }
    return { platform: 'unknown', id: null }
  }

  const fetchPreview = async (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setPreview(null)
      return
    }

    const { platform, id } = detectPlatform(inputUrl)
    if (!id) {
      setPreview(null)
      return
    }

    setLoading(true)
    try {
      let info
      if (platform === 'youtube') {
        info = await getYouTubeVideoInfo(id)
      } else if (platform === 'soundcloud') {
        info = await getSoundCloudTrackInfo(inputUrl)
      } else if (platform === 'niconico') {
        info = await getNiconicoVideoInfo(id)
      }

      if (info) {
        setPreview({
          thumbnail: info.thumbnailUrl,
          title: info.title,
          artist: info.artist,
          duration: info.duration,
          platform
        })
      }
    } catch (error: any) {
      console.error('Error fetching preview:', error)
      setPreview(null)

      const errorMsg = error?.message || String(error)
      if (errorMsg.includes('100') || errorMsg.includes('101') || errorMsg.includes('150') ||
          errorMsg.includes('not found') || errorMsg.includes('cannot be embedded')) {
        toast.error('영상을 찾을 수 없거나 재생이 불가능합니다')
      } else if (errorMsg.includes('Timeout')) {
        toast.error('영상 정보를 가져오는 데 시간이 너무 오래 걸립니다')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchPreview(url)
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [url])

  const handleAdd = async () => {
    if (!url.trim() || !currentUser) return

    const { platform, id } = detectPlatform(url)

    if (!id) {
      toast.error('지원하지 않는 URL 형식입니다')
      return
    }

    setIsFocused(false)
    setUrl('')
    setPreview(null)
    setLoading(true)

    const loadingToast = toast.loading('곡 추가 중...')

    try {
      const finalUrl = platform === 'youtube' ? cleanYouTubeUrl(url) : url

      let songData: Partial<Song> = {
        id: nanoid(),
        platform: platform as any,
        platformId: id,
        url: finalUrl,
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

      emitRealtimeEvent(channel, 'playlist:update', { playlist })

      toast.success('곡이 플레이리스트에 추가되었습니다', { id: loadingToast })
    } catch (error: any) {
      console.error('Error adding song:', error)

      const errorMsg = error?.message || String(error)
      if (errorMsg.includes('100') || errorMsg.includes('101') || errorMsg.includes('150') ||
          errorMsg.includes('not found') || errorMsg.includes('cannot be embedded')) {
        toast.error('영상을 찾을 수 없거나 재생이 불가능합니다', { id: loadingToast })
      } else if (errorMsg.includes('Timeout')) {
        toast.error('영상 정보를 가져오는 데 시간이 너무 오래 걸립니다', { id: loadingToast })
      } else {
        toast.error('곡을 추가하는 중 오류가 발생했습니다', { id: loadingToast })
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />
      case 'soundcloud':
        return <Music className="w-4 h-4 text-orange-500" />
      case 'niconico':
        return <Radio className="w-4 h-4 text-gray-400" />
      default:
        return null
    }
  }

  return (
    <div className="relative w-full">
      {/* 입력창 - 항상 표시 */}
      <div
        className={`bg-background/80 backdrop-blur-xl rounded-xl border-2 transition-all duration-200 ${
          isFocused ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className={`w-4 h-4 transition-colors flex-shrink-0 ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 300)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim()) {
                e.preventDefault()
                e.currentTarget.blur()
                handleAdd()
              }
            }}
            placeholder="링크를 입력하세요"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
        </div>
      </div>

      {/* Floating popup - 활성화 시에만 표시 */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-200 max-w-full sm:max-w-xl">
          {!preview && !loading && (
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
              <span className="ml-2 text-white/40">
                (SoundCloud, 니코동 추가 예정)
              </span>
            </div>
          )}

          {preview && (
            <div
              onClick={handleAdd}
              className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-black">
                <Image
                  src={preview.thumbnail}
                  alt={preview.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getPlatformIcon(preview.platform)}
                  <span className="text-xs text-white/60 capitalize">
                    {preview.platform}
                  </span>
                </div>
                <h3 className="font-medium text-sm line-clamp-1 mb-0.5 text-white">
                  {preview.title}
                </h3>
                <p className="text-xs text-white/60 line-clamp-1">
                  {preview.artist}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  {formatDuration(preview.duration)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
