'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, RefreshCw } from 'lucide-react'
import { generateRoomName, generateUsername } from '@/lib/random-names'

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [username, setUsername] = useState('')
  const [roomPlaceholder, setRoomPlaceholder] = useState('')
  const [usernamePlaceholder, setUsernamePlaceholder] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setRoomPlaceholder(generateRoomName())
      setUsernamePlaceholder(generateUsername())
    }
  }, [open])

  const handleCreate = async () => {
    const finalRoomName = roomName.trim() || roomPlaceholder
    const finalUsername = username.trim() || usernamePlaceholder

    if (!finalRoomName || !finalUsername) return

    setLoading(true)

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: finalRoomName,
          username: finalUsername
        })
      })

      if (!response.ok) throw new Error('Failed to create room')

      const { roomId, user } = await response.json()

      localStorage.setItem(`user-${roomId}`, JSON.stringify(user))

      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateRoomName = () => {
    setRoomPlaceholder(generateRoomName())
  }

  const handleRegenerateUsername = () => {
    setUsernamePlaceholder(generateUsername())
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          새 방 만들기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 방 만들기</DialogTitle>
          <DialogDescription>
            미부이들과 함께 지듣노를 들을 망호를 출항시켜보세요
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="room-name">방 이름</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerateRoomName}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <Input
              id="room-name"
              placeholder={roomPlaceholder}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="username">닉네임</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerateUsername}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <Input
              id="username"
              placeholder={usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? '생성 중...' : '방 만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
