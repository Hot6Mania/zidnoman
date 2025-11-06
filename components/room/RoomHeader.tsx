'use client'

import { Music2, Share2, Users, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRoomStore } from '@/lib/stores/room-store'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RoomHeader({ roomId }: { roomId: string }) {
  const { room, users, currentUser } = useRoomStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const url = `${window.location.origin}/room/${roomId}`
    if (navigator.share) {
      navigator.share({
        title: room?.name || '음악방',
        text: '함께 음악을 들어요!',
        url
      })
    } else {
      navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다!')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{room?.name || '로딩 중...'}</h1>
              <p className="text-xs text-muted-foreground">
                {currentUser?.username}
                {currentUser?.role === 'owner' && (
                  <Badge variant="secondary" className="ml-2 text-xs">방장</Badge>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{users.length}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>참여자 ({users.length}명)</DialogTitle>
                <DialogDescription>
                  현재 이 방에 있는 사용자들
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.username[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.role === 'owner' ? '방장' : user.role === 'moderator' ? '모더레이터' : '멤버'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">공유</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>방 공유하기</DialogTitle>
                <DialogDescription>
                  친구들에게 방 코드나 링크를 공유하세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>방 코드</Label>
                  <div className="flex gap-2">
                    <Input value={roomId} readOnly className="text-center text-lg font-mono tracking-wider" />
                    <Button onClick={handleCopy} size="icon" variant="outline">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>링크</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomId}`}
                      readOnly
                      className="text-sm"
                    />
                    <Button onClick={handleShare} variant="default">
                      공유
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
