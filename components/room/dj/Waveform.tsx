'use client'

import { useEffect, useRef, MouseEvent } from 'react'
import { audioEngine } from '@/lib/audio/audio-engine'
import { useRoomStore } from '@/lib/stores/room-store'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { canControlPlayer } from '@/lib/permissions'
import { toast } from 'sonner'

interface WaveformProps {
  width?: number
  height?: number
  channel?: RealtimeChannel | null
  roomId?: string
}

export function Waveform({ width = 800, height = 120, channel, roomId }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const { playerState, currentSong, currentUser, updatePlayerState } = useRoomStore()
  const song = currentSong()
  const userCanControl = canControlPlayer(currentUser)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const frequencyData = audioEngine.getAnalyserData()

      if (!frequencyData) {
        ctx.clearRect(0, 0, width, height)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('No audio data', width / 2, height / 2)

        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const barWidth = (width / frequencyData.length) * 2.5
      let x = 0

      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height * 0.9

        const intensity = frequencyData[i] / 255
        const hue = 200 + (intensity * 60)
        const sat = 70 + (intensity * 30)
        const light = 50 + (intensity * 20)
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`

        ctx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      if (song?.duration) {
        const progress = playerState.position / song.duration
        const markerX = progress * width

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(markerX, 0)
        ctx.lineTo(markerX, height)
        ctx.stroke()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(markerX, height / 2, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    if (playerState.isPlaying) {
      draw()
    } else {
      ctx.clearRect(0, 0, width, height)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [width, height, playerState.isPlaying])

  const handleCanvasClick = async (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !song?.duration) return

    if (!userCanControl) {
      console.warn('🚫 User does not have permission to seek')
      toast.error('방장이나 모더레이터만 재생 위치를 변경할 수 있습니다')

      if (roomId) {
        const response = await fetch(`/api/rooms/${roomId}/state`)
        if (response.ok) {
          const { playerState: serverState } = await response.json()
          updatePlayerState({ position: serverState.position })
        }
      }
      return
    }

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const progress = clickX / rect.width
    const seekTime = progress * song.duration

    console.log('🎯 Seeking to:', seekTime, 'seconds')

    try {
      if (roomId) {
        await fetch(`/api/rooms/${roomId}/player-state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: { position: seekTime } })
        })
      }

      if (channel) {
        emitRealtimeEvent(channel, 'player:seek', { position: seekTime })
        updatePlayerState({ position: seekTime })
      }
    } catch (error) {
      console.error('Failed to seek:', error)
      toast.error('재생 위치 변경에 실패했습니다')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full space-y-2">
      <div className="w-full bg-black rounded-lg overflow-hidden border border-primary/20 relative group">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full ${userCanControl ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
          onClick={handleCanvasClick}
        />
        {song?.duration && (
          <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] text-white/60 font-mono pointer-events-none">
            <span>{formatTime(playerState.position)}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              {userCanControl ? 'Click to seek' : 'Seek disabled'}
            </span>
            <span>{formatTime(song.duration)}</span>
          </div>
        )}
      </div>
      {!playerState.isPlaying && (
        <p className="text-xs text-muted-foreground text-center">
          Press play to see waveform visualization
        </p>
      )}
    </div>
  )
}
