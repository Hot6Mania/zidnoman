'use client'

import { useState, useRef, useEffect } from 'react'
import { useRoomStore } from '@/lib/stores/room-store'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, AlertCircle, RotateCw, X } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { nanoid } from 'nanoid'
import { RealtimeChannel } from '@supabase/supabase-js'

interface ChatViewProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function ChatView({ roomId, channel }: ChatViewProps) {
  const [message, setMessage] = useState('')
  const { chatMessages, currentUser, addOptimisticMessage, confirmMessage, failMessage, removePendingMessage, retryMessage } = useRoomStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendMessage = async (content: string, tempId: string) => {
    if (!currentUser) return

    const chatMessage = {
      id: nanoid(),
      userId: currentUser.id,
      username: currentUser.username,
      userColor: currentUser.color,
      content,
      timestamp: Date.now()
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatMessage })
      })

      if (!response.ok) throw new Error('Failed to send message')

      // Confirm message (replace temp with real ID)
      confirmMessage(tempId, chatMessage.id)

      // Broadcast to other users
      emitRealtimeEvent(channel, 'chat:message', { message: chatMessage })
    } catch (error) {
      console.error('Failed to send message:', error)
      // Mark as failed
      failMessage(tempId)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !currentUser) return

    const content = message.trim()
    const tempId = `temp-${Date.now()}-${nanoid(6)}`

    // Optimistic update: Add message locally first
    const optimisticMessage = {
      id: tempId,
      userId: currentUser.id,
      username: currentUser.username,
      userColor: currentUser.color,
      content,
      timestamp: Date.now(),
      tempId
    }

    addOptimisticMessage(optimisticMessage)
    setMessage('')

    // Send to server (async)
    sendMessage(content, tempId)
  }

  const handleRetry = (tempId: string, content: string) => {
    retryMessage(tempId)
    sendMessage(content, tempId)
  }

  const handleCancel = (tempId: string) => {
    removePendingMessage(tempId)
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
          chatMessages.map((msg) => {
            const isPending = msg.status === 'pending'
            const isFailed = msg.status === 'failed'

            return (
              <div
                key={msg.tempId || msg.id}
                className={`space-y-1 ${isPending ? 'opacity-60' : ''} ${isFailed ? 'bg-destructive/10 rounded-lg p-2 border border-destructive/30' : ''}`}
              >
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
                  {isPending && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      전송 중...
                    </span>
                  )}
                  {isFailed && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      전송 실패
                    </span>
                  )}
                </div>
                <p className="text-sm">{msg.content}</p>
                {isFailed && msg.tempId && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(msg.tempId!, msg.content)}
                      className="h-7 text-xs"
                    >
                      <RotateCw className="w-3 h-3 mr-1" />
                      재전송
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(msg.tempId!)}
                      className="h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      취소
                    </Button>
                  </div>
                )}
              </div>
            )
          })
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
