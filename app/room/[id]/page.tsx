'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RoomHeader } from '@/components/room/RoomHeader'
import { VideoPlayer } from '@/components/room/VideoPlayer'
import { PlayerControls } from '@/components/room/PlayerControls'
import { PlaylistView } from '@/components/room/PlaylistView'
import { ChatView } from '@/components/room/ChatView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useRoomStore } from '@/lib/stores/room-store'
import { User } from '@/lib/types'
import { generateUserColor } from '@/lib/utils'
import { generateUsername } from '@/lib/random-names'
import { nanoid } from 'nanoid'
import { List, MessageSquare, Music2, Users } from 'lucide-react'
import { DJPanel } from '@/components/room/dj/DJPanel'
import { InfinityLoader } from '@/components/ui/infinity-loader'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('playlist')
  const router = useRouter()
  const { setCurrentUser: setStoreUser, playlist, chatMessages, room, users } = useRoomStore()

  const prevPlaylistCountRef = useRef(0)
  const prevChatCountRef = useRef(0)
  const [newPlaylistCount, setNewPlaylistCount] = useState(0)
  const [newChatCount, setNewChatCount] = useState(0)

  useEffect(() => {
    const initUser = async () => {
      const storedUser = localStorage.getItem(`user-${roomId}`)

      if (storedUser) {
        const user = JSON.parse(storedUser)
        setCurrentUser(user)
        setStoreUser(user)
      } else {
        const response = await fetch(`/api/rooms/${roomId}`)
        if (!response.ok) {
          alert('존재하지 않는 방입니다')
          router.push('/')
          return
        }

        // 랜덤 닉네임 자동 생성
        const username = generateUsername()

        const user: User = {
          id: nanoid(),
          username,
          color: generateUserColor(),
          role: 'member',
          joinedAt: Date.now()
        }

        setCurrentUser(user)
        setStoreUser(user)
        localStorage.setItem(`user-${roomId}`, JSON.stringify(user))
      }

      setLoading(false)
    }

    initUser()
  }, [roomId, router, setStoreUser])

  const channel = useRealtime(roomId, currentUser)

  useEffect(() => {
    if (!loading) {
      toast.dismiss()
    }
  }, [loading])

  // Track new items when not on active tab
  useEffect(() => {
    if (activeTab === 'playlist') {
      // When ON the tab, keep ref in sync (no badges shown)
      prevPlaylistCountRef.current = playlist.length
    } else if (playlist.length > prevPlaylistCountRef.current) {
      // When OFF the tab, accumulate new items
      setNewPlaylistCount(prev => prev + (playlist.length - prevPlaylistCountRef.current))
      prevPlaylistCountRef.current = playlist.length
    }
  }, [playlist.length, activeTab])

  useEffect(() => {
    if (activeTab === 'chat') {
      // When ON the tab, keep ref in sync (no badges shown)
      prevChatCountRef.current = chatMessages.length
    } else if (chatMessages.length > prevChatCountRef.current) {
      // When OFF the tab, accumulate new items
      setNewChatCount(prev => prev + (chatMessages.length - prevChatCountRef.current))
      prevChatCountRef.current = chatMessages.length
    }
  }, [chatMessages.length, activeTab])

  // Clear badges when switching to tab
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'playlist') {
      setNewPlaylistCount(0)
      prevPlaylistCountRef.current = playlist.length
    } else if (value === 'chat') {
      setNewChatCount(0)
      prevChatCountRef.current = chatMessages.length
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <InfinityLoader />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <RoomHeader roomId={roomId} channel={channel} />

        <div className="container mx-auto lg:p-4">
          {/* Mobile Layout (Vertical) */}
          <div className="lg:hidden">
            <div className="sticky top-16 z-40 bg-background">
              <VideoPlayer roomId={roomId} channel={channel} />
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{room?.name || '방 이름 로딩 중...'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{users.length}</span>
                </div>
              </div>
              <PlayerControls roomId={roomId} channel={channel} />
            </div>

            <Tabs defaultValue="playlist" value={activeTab} onValueChange={handleTabChange} className="w-full px-4 pt-4">
              <TabsList className="mb-4">
                <TabsTrigger value="playlist" className="gap-2 relative">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">플레이리스트</span>
                  {newPlaylistCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                      +{newPlaylistCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2 relative">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">채팅</span>
                  {newChatCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                      +{newChatCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="dj" className="gap-2">
                  <Music2 className="h-4 w-4" />
                  <span className="hidden sm:inline">DJ</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="playlist" className="space-y-4 mt-0">
                <PlaylistView roomId={roomId} channel={channel} />
              </TabsContent>

              <TabsContent value="chat" className="mt-0">
                <div className="bg-card rounded-lg border h-[500px]">
                  <ChatView roomId={roomId} channel={channel} />
                </div>
              </TabsContent>

              <TabsContent value="dj" className="mt-0">
                <DJPanel roomId={roomId} channel={channel} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Layout (Side by Side) */}
          <div className="hidden lg:flex gap-4">
            {/* Left Side - Video */}
            <div className="flex-1 space-y-4">
              <VideoPlayer roomId={roomId} channel={channel} />
              <div className="flex items-center gap-2 px-1">
                <Music2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{room?.name || '방 이름 로딩 중...'}</span>
              </div>
              <PlayerControls roomId={roomId} channel={channel} />
            </div>

            {/* Right Side - Tabs */}
            <div className="flex-1">
              <Tabs defaultValue="playlist" value={activeTab} onValueChange={handleTabChange} className="w-full h-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="playlist" className="gap-2 relative">
                    <List className="h-4 w-4" />
                    플레이리스트
                    {newPlaylistCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                        +{newPlaylistCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2 relative">
                    <MessageSquare className="h-4 w-4" />
                    채팅
                    {newChatCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                        +{newChatCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dj" className="gap-2">
                    <Music2 className="h-4 w-4" />
                    DJ
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="playlist" className="space-y-4 mt-0 h-[calc(100vh-12rem)] overflow-y-auto">
                  <PlaylistView roomId={roomId} channel={channel} />
                </TabsContent>

                <TabsContent value="chat" className="mt-0">
                  <div className="bg-card rounded-lg border h-[calc(100vh-12rem)]">
                    <ChatView roomId={roomId} channel={channel} />
                  </div>
                </TabsContent>

                <TabsContent value="dj" className="mt-0 h-[calc(100vh-12rem)] overflow-y-auto">
                  <DJPanel roomId={roomId} channel={channel} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
