'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { toast } from 'sonner'

export function JoinRoomInput() {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const extractRoomId = (input: string): string => {
    // URL 형식인 경우 roomId 추출
    try {
      const url = new URL(input)
      const pathParts = url.pathname.split('/')
      const roomIndex = pathParts.indexOf('room')
      if (roomIndex !== -1 && pathParts[roomIndex + 1]) {
        return pathParts[roomIndex + 1]
      }
    } catch {
      // URL이 아니면 그대로 roomId로 사용
    }
    return input.trim()
  }

  const handleCheckRoom = async () => {
    if (!roomCode.trim()) return

    setLoading(true)
    const loadingToast = toast.loading('방 확인 중...')

    try {
      const actualRoomId = extractRoomId(roomCode)
      const response = await fetch(`/api/rooms/${actualRoomId}`)

      if (!response.ok) {
        toast.error('존재하지 않는 방입니다.', { id: loadingToast })
        setLoading(false)
        return
      }

      toast.success('방 입장 중...', {
        id: loadingToast,
        duration: 3000
      })
      setRoomCode(actualRoomId)
      router.push(`/room/${actualRoomId}`)
    } catch (error) {
      console.error('Error checking room:', error)
      toast.error('방을 확인할 수 없습니다.', { id: loadingToast })
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 w-full max-w-md mx-auto">
        <Input
          placeholder="방 링크 또는 코드 입력"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.trim())}
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

    </>
  )
}
