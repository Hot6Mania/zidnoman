'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RoomHeader } from '@/components/room/RoomHeader'
import { VideoPlayer } from '@/components/room/VideoPlayer'
import { PlayerControls } from '@/components/room/PlayerControls'
import { PlaylistView } from '@/components/room/PlaylistView'
import { ChatView } from '@/components/room/ChatView'
import { AddSongDialog } from '@/components/room/AddSongDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { useRoomStore } from '@/lib/stores/room-store'
import { User } from '@/lib/types'
import { generateUserColor } from '@/lib/utils'
import { nanoid } from 'nanoid'
import { List, MessageSquare } from 'lucide-react'

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { setCurrentUser: setStoreUser } = useRoomStore()

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

        const username = prompt('닉네임을 입력하세요:')
        if (!username) {
          router.push('/')
          return
        }

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

  useRealtime(roomId, currentUser)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <RoomHeader roomId={roomId} />

        <div className="container mx-auto p-4 space-y-4">
          <div className="max-w-4xl mx-auto">
            <VideoPlayer roomId={roomId} />
          </div>

          <div className="max-w-4xl mx-auto">
            <PlayerControls roomId={roomId} />
          </div>

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="playlist" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="playlist" className="gap-2">
                    <List className="h-4 w-4" />
                    플레이리스트
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    채팅
                  </TabsTrigger>
                </TabsList>

                <AddSongDialog roomId={roomId} />
              </div>

              <TabsContent value="playlist" className="space-y-4 mt-0">
                <PlaylistView roomId={roomId} />
              </TabsContent>

              <TabsContent value="chat" className="mt-0">
                <div className="bg-card rounded-lg border h-[500px]">
                  <ChatView roomId={roomId} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
