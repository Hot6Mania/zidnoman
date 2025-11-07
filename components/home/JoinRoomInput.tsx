'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LogIn } from 'lucide-react'

export function JoinRoomInput() {
  const [roomCode, setRoomCode] = useState('')
  const [username, setUsername] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCheckRoom = async () => {
    if (!roomCode.trim()) return

    setLoading(true)

    try {
      const response = await fetch(`/api/rooms/${roomCode}`)

      if (!response.ok) {
        alert('존재하지 않는 방입니다.')
        return
      }

      setShowDialog(true)
    } catch (error) {
      console.error('Error checking room:', error)
      alert('방을 확인할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = () => {
    if (!username.trim()) return

    const user = {
      id: Math.random().toString(36).substring(7),
      username,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      role: 'member' as const,
      joinedAt: Date.now()
    }

    localStorage.setItem(`user-${roomCode}`, JSON.stringify(user))
    router.push(`/room/${roomCode}`)
  }

  return (
    <>
      <div className="flex items-center gap-2 w-full max-w-md mx-auto">
        <Input
          placeholder="방 코드 입력 (예: aBcD1234)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="text-center text-sm sm:text-base md:text-lg tracking-wider placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCheckRoom()
          }}
        />
        <Button
          onClick={handleCheckRoom}
          disabled={!roomCode.trim() || loading}
          size="lg"
          className="shrink-0"
        >
          <LogIn className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>방 입장</DialogTitle>
            <DialogDescription>
              닉네임을 입력하고 방에 입장하세요
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="join-username">닉네임</Label>
              <Input
                id="join-username"
                placeholder="김뮤직"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleJoin}
              disabled={!username.trim()}
            >
              입장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
