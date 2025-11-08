'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface NiconicoPlayerProps {
  videoId: string
  playing: boolean
  volume: number
  onReady?: () => void
  onStart?: () => void
  onProgress?: (state: { playedSeconds: number }) => void
  onEnded?: () => void
  onError?: (error: any) => void
}

export interface NiconicoPlayerRef {
  seekTo: (seconds: number, type?: string) => void
  getInternalPlayer: () => HTMLIFrameElement | null
  getDuration: () => number
  getCurrentTime: () => number
}

export const NiconicoPlayer = forwardRef<NiconicoPlayerRef, NiconicoPlayerProps>(
  ({ videoId, playing, volume, onReady, onStart, onProgress, onEnded, onError }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const hasStartedRef = useRef(false)
    const durationRef = useRef<number>(0)
    const lastPositionRef = useRef<number>(0)

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (iframeRef.current?.contentWindow) {
          console.log('🎬 Niconico seek to:', seconds)
          iframeRef.current.contentWindow.postMessage({
            eventName: 'seek',
            data: { time: seconds }
          }, '*')
        }
      },
      getInternalPlayer: () => iframeRef.current,
      getDuration: () => durationRef.current,
      getCurrentTime: () => lastPositionRef.current
    }))

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin.includes('nicovideo.jp')) return

        const { eventName, data } = event.data
        console.log('📥 Niconico event:', eventName, data)

        switch (eventName) {
          case 'playerMetadataChange':
            if (data?.duration) {
              console.log('⏱️  Niconico duration:', data.duration)
              durationRef.current = data.duration
            }
            if (data?.currentTime !== undefined) {
              lastPositionRef.current = data.currentTime
              onProgress?.({ playedSeconds: data.currentTime })
            }
            break

          case 'playerStatusChange':
            console.log('🔄 Niconico status:', data?.playerStatus)
            if (data?.playerStatus === 2) {
              if (!hasStartedRef.current) {
                hasStartedRef.current = true
                console.log('▶️  Niconico started')
                onStart?.()
              }
              onReady?.()
            } else if (data?.playerStatus === 0) {
              console.log('⏹️  Niconico ended')
              onEnded?.()
            }
            break

          case 'statusChange':
            if (data?.currentTime !== undefined) {
              lastPositionRef.current = data.currentTime
              onProgress?.({ playedSeconds: data.currentTime })
            }
            break

          case 'loadComplete':
            console.log('✅ Niconico load complete')
            onReady?.()
            break

          case 'playComplete':
            console.log('⏹️  Niconico play complete')
            onEnded?.()
            break

          case 'error':
            const errorInfo = data && Object.keys(data).length > 0
              ? data
              : { message: 'Niconico playback error', code: 'UNKNOWN' }
            console.error('❌ Niconico error:', errorInfo)
            onError?.(errorInfo)
            break

          default:
            console.log('📨 Niconico unknown event:', eventName, data)
        }
      }

      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }, [onReady, onStart, onEnded, onError, onProgress])

    useEffect(() => {
      if (!iframeRef.current?.contentWindow) return

      if (playing) {
        console.log('▶️  Sending Niconico play command')
        iframeRef.current.contentWindow.postMessage({
          eventName: 'play',
          data: {}
        }, '*')
      } else {
        console.log('⏸️  Sending Niconico pause command')
        iframeRef.current.contentWindow.postMessage({
          eventName: 'pause',
          data: {}
        }, '*')

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [playing])

    useEffect(() => {
      if (iframeRef.current?.contentWindow) {
        console.log('🔊 Sending Niconico volume:', volume)
        iframeRef.current.contentWindow.postMessage({
          eventName: 'volumeChange',
          data: { volume: volume / 100 }
        }, '*')
      }
    }, [volume])

    const embedUrl = `https://embed.nicovideo.jp/watch/${videoId}?jsapi=1&playerId=1&oldScript=1&autoplay=0&muted=0`

    return (
      <iframe
        ref={iframeRef}
        src={embedUrl}
        width="100%"
        height="100%"
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        style={{ border: 'none' }}
      />
    )
  }
)

NiconicoPlayer.displayName = 'NiconicoPlayer'
