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
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { SearchBar } from './SearchBar'
import { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export function RoomHeader({ roomId, channel }: { roomId: string; channel: RealtimeChannel | null }) {
  const { room, users, currentUser } = useRoomStore()
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    toast.success('방 코드가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    toast.success('방 링크가 복사되었습니다')
  }

  const handleQuickShareLink = () => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success('방 링크가 복사되었습니다')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* 왼쪽: 로고 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image src="/infinity-icon.svg" alt="Zidnoman" width={32} height={32} />
              <span className="font-bold text-lg hidden sm:inline">Zidnoman</span>
            </Link>
          </div>

          {/* 중간: SearchBar */}
          <div className="flex-1 max-w-xl">
            <SearchBar roomId={roomId} channel={channel} />
          </div>

          {/* 오른쪽: 버튼들 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />

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

            <Button
              variant={linkCopied ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={handleQuickShareLink}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{linkCopied ? '복사됨' : '공유 링크 복사'}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
