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
import { toast } from 'sonner'
import { generateRoomName, generateUsername } from '@/lib/random-names'
import { InfinityLoader } from '@/components/ui/infinity-loader'

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

      toast.success('방이 생성되었습니다!', {
        duration: 3000
      })
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('방 생성에 실패했습니다. 다시 시도해주세요.')
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
        <div className="relative mx-auto w-fit group">
          {/* Glow layers - behind everything */}
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 -z-10 cursor-pointer"
            style={{
              width: '20px',
              height: '20px',
              left: '-10px',
              bottom: '-10px',
              transformOrigin: '50% 50%',
              background: '#3B5FF7',
              boxShadow: '0 0 12px rgba(59, 95, 247, 0.9), 0 0 24px rgba(59, 95, 247, 0.5)'
            }}
          />
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 -z-10 cursor-pointer"
            style={{
              width: '20px',
              height: '20px',
              right: '-10px',
              top: '-10px',
              transformOrigin: '50% 50%',
              background: '#FD8339',
              boxShadow: '0 0 12px rgba(253, 131, 57, 0.9), 0 0 24px rgba(253, 131, 57, 0.5)'
            }}
          />
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 -z-10 cursor-pointer"
            style={{
              width: '12px',
              height: '12px',
              left: '-12px',
              top: '-12px',
              transformOrigin: '100% 100%',
              background: '#FFFC00',
              boxShadow: '0 0 10px rgba(255, 252, 0, 0.9), 0 0 20px rgba(255, 252, 0, 0.5)'
            }}
          />

          {/* Solid color squares - in front of button */}
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 z-10 cursor-pointer"
            style={{
              width: '20px',
              height: '20px',
              left: '-10px',
              bottom: '-10px',
              transformOrigin: '50% 50%',
              background: '#3B5FF7'
            }}
          />
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 z-10 cursor-pointer"
            style={{
              width: '20px',
              height: '20px',
              right: '-10px',
              top: '-10px',
              transformOrigin: '50% 50%',
              background: '#FD8339'
            }}
          />
          <div
            className="absolute transition-all duration-500 ease-out group-hover:rotate-45 group-active:rotate-90 z-10 cursor-pointer"
            style={{
              width: '12px',
              height: '12px',
              left: '-12px',
              top: '-12px',
              transformOrigin: '100% 100%',
              background: '#FFFC00'
            }}
          />

          <Button
            size="lg"
            className="gap-3 py-6 px-20 text-2xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.15)] group-hover:shadow-[0_6px_30px_rgba(0,0,0,0.3)] group-active:shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-all duration-200 ease-out relative overflow-visible backdrop-blur-md bg-black/65 hover:bg-black/60 active:bg-black/55 border-2 border-white/40 text-white"
            style={{ borderRadius: '0' }}
          >
            {/* Tinted glass overlay - darker */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.25) 100%)'
            }} />
            {/* Gradient overlay darker toward corners */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)'
            }} />
            <Plus className="h-7 w-7 relative z-10" />
            <span className="relative z-10">방 생성</span>
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px]"
        showCloseButton={!loading}
        onInteractOutside={(e) => loading && e.preventDefault()}
      >
        {loading ? (
          <InfinityLoader />
        ) : (
          <>
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
                방 만들기
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
