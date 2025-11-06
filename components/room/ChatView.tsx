'use client'

import { useState, useRef, useEffect } from 'react'
import { useRoomStore } from '@/lib/stores/room-store'
import { getSocket } from '@/lib/socket'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { nanoid } from 'nanoid'

interface ChatViewProps {
  roomId: string
}

export function ChatView({ roomId }: ChatViewProps) {
  const [message, setMessage] = useState('')
  const { chatMessages, currentUser } = useRoomStore()
  const socket = getSocket()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = () => {
    if (!message.trim() || !currentUser) return

    const chatMessage = {
      id: nanoid(),
      userId: currentUser.id,
      username: currentUser.username,
      userColor: currentUser.color,
      content: message.trim(),
      timestamp: Date.now()
    }

    socket?.emit('chat:message', { roomId, message: chatMessage })
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              아직 메시지가 없습니다<br />
              첫 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-semibold text-sm"
                  style={{ color: msg.userColor }}
                >
                  {msg.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-sm">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
