'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { loadYouTubeIframeAPI } from '@/lib/youtube'

interface YouTubePlayerProps {
  videoId: string
  playing: boolean
  volume: number
  playbackRate?: number
  isSyncMaster?: boolean
  initialPosition?: number
  onReady: () => void
  onStart: () => void
  onProgress: ({ playedSeconds }: { playedSeconds: number }) => void
  onEnded: () => void
  onError: (error: any) => void
  onStateChange?: (state: 'playing' | 'paused') => void
}

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  smoothSyncTo: (targetPosition: number, currentPosition: number, originalRate: number) => void
  playVideo: () => void
  pauseVideo: () => void
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  ({ videoId, playing, volume, playbackRate = 1.0, isSyncMaster = false, initialPosition = 0, onReady, onStart, onProgress, onEnded, onError, onStateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const currentVideoIdRef = useRef<string>(videoId)
    const isFirstPlayRef = useRef<boolean>(true)
    const playerIdRef = useRef<string>(`youtube-player-${Math.random().toString(36).substr(2, 9)}`)
    const initialSeekDoneRef = useRef<boolean>(false)
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(seconds, true)
        }
      },
      getCurrentTime: () => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          return playerRef.current.getCurrentTime()
        }
        return 0
      },
      smoothSyncTo: (targetPosition: number, currentPosition: number, originalRate: number) => {
        if (!playerRef.current) return

        const drift = Math.abs(currentPosition - targetPosition)

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
          syncTimeoutRef.current = null
        }

        if (drift < 3.0) {
          return
        } else if (drift < 5.0) {
          const adjustedRate = currentPosition < targetPosition ? 1.02 : 0.98
          playerRef.current.setPlaybackRate(adjustedRate)

          syncTimeoutRef.current = setTimeout(() => {
            if (playerRef.current && playerRef.current.setPlaybackRate) {
              playerRef.current.setPlaybackRate(originalRate)
            }
            syncTimeoutRef.current = null
          }, 5000)
        } else {
          playerRef.current.seekTo(targetPosition, true)
        }
      },
      playVideo: () => {
        if (playerRef.current && playerRef.current.playVideo) {
          playerRef.current.playVideo()
        }
      },
      pauseVideo: () => {
        if (playerRef.current && playerRef.current.pauseVideo) {
          playerRef.current.pauseVideo()
        }
      }
    }))

    useEffect(() => {
      let mounted = true
      let player: any = null

      const initializePlayer = async () => {
        try {
          await loadYouTubeIframeAPI()

          if (!mounted || !containerRef.current) return

          if (playerRef.current) {
            try {
              playerRef.current.destroy()
              playerRef.current = null
            } catch (e) {
              console.warn('⚠️ Failed to destroy previous player:', e)
            }
          }

          player = new window.YT.Player(playerIdRef.current, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              disablekb: 0,
              enablejsapi: 1,
              origin: typeof window !== 'undefined' ? window.location.origin : '',
              fs: 1,
              rel: 0,
              modestbranding: 1,
              iv_load_policy: 3
            },
            events: {
              onReady: (event: any) => {
                console.log('✅ YouTube player ready:', videoId, 'initialPosition:', initialPosition)
                if (!mounted) return

                playerRef.current = event.target

                event.target.setVolume(volume)
                event.target.setPlaybackRate(playbackRate)

                if (initialPosition > 0) {
                  console.log('⏩ Seeking to initial position:', initialPosition)
                  event.target.seekTo(initialPosition, true)
                  initialSeekDoneRef.current = true
                }

                onReady()

                if (playing) {
                  console.log('▶️  Starting playback immediately')
                  event.target.playVideo()
                } else {
                  console.log('⏸️  Pausing immediately (keeps iframe visible)')
                  event.target.pauseVideo()
                }
              },
              onStateChange: (event: any) => {
                console.log('🔄 YouTube state changed:', {
                  videoId,
                  state: event.data,
                  stateName: getStateName(event.data)
                })

                if (!mounted) return

                switch (event.data) {
                  case window.YT.PlayerState.PLAYING:
                    if (isFirstPlayRef.current) {
                      onStart()
                      isFirstPlayRef.current = false
                    }
                    startProgressTracking()
                    if (onStateChange) {
                      onStateChange('playing')
                    }
                    break
                  case window.YT.PlayerState.PAUSED:
                    stopProgressTracking()
                    if (onStateChange) {
                      onStateChange('paused')
                    }
                    break
                  case window.YT.PlayerState.ENDED:
                    stopProgressTracking()
                    onEnded()
                    break
                  case window.YT.PlayerState.BUFFERING:
                    break
                }
              },
              onError: (event: any) => {
                console.error('❌ YouTube player error:', {
                  videoId,
                  errorCode: event.data,
                  errorMessage: getErrorMessage(event.data)
                })
                stopProgressTracking()
                onError(event)
              }
            }
          })
        } catch (error) {
          console.error('❌ Failed to initialize YouTube player:', error)
          if (mounted) {
            onError(error)
          }
        }
      }

      const startProgressTracking = () => {
        if (progressIntervalRef.current) return

        progressIntervalRef.current = setInterval(() => {
          if (playerRef.current && playerRef.current.getCurrentTime) {
            const currentTime = playerRef.current.getCurrentTime()
            onProgress({ playedSeconds: currentTime })
          }
        }, 500)
      }

      const stopProgressTracking = () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }

      initializePlayer()

      return () => {
        mounted = false
        stopProgressTracking()

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
          syncTimeoutRef.current = null
        }

        if (player && player.destroy) {
          try {
            player.destroy()
          } catch (e) {
            console.warn('⚠️ Failed to destroy YouTube player:', e)
          }
        }
        playerRef.current = null
      }
    }, [videoId])

    useEffect(() => {
      if (videoId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = videoId
        isFirstPlayRef.current = true
        initialSeekDoneRef.current = false
      }
    }, [videoId])

    useEffect(() => {
      if (!playerRef.current) return

      if (playing) {
        playerRef.current.playVideo()
      } else {
        playerRef.current.pauseVideo()
      }
    }, [playing])

    useEffect(() => {
      if (playerRef.current && playerRef.current.setVolume) {
        playerRef.current.setVolume(volume)
      }
    }, [volume])

    useEffect(() => {
      if (playerRef.current && playerRef.current.setPlaybackRate) {
        playerRef.current.setPlaybackRate(playbackRate)
      }
    }, [playbackRate])

    return (
      <div ref={containerRef} className="w-full h-full">
        <div id={playerIdRef.current} className="w-full h-full" />
      </div>
    )
  }
)

YouTubePlayer.displayName = 'YouTubePlayer'

function getStateName(state: number): string {
  if (typeof window === 'undefined' || !window.YT) return 'UNKNOWN'

  switch (state) {
    case window.YT.PlayerState.UNSTARTED: return 'UNSTARTED'
    case window.YT.PlayerState.ENDED: return 'ENDED'
    case window.YT.PlayerState.PLAYING: return 'PLAYING'
    case window.YT.PlayerState.PAUSED: return 'PAUSED'
    case window.YT.PlayerState.BUFFERING: return 'BUFFERING'
    case window.YT.PlayerState.CUED: return 'CUED'
    default: return 'UNKNOWN'
  }
}

function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 2: return 'Invalid parameter value'
    case 5: return 'HTML5 player error'
    case 100: return 'Video not found or private'
    case 101: return 'Video cannot be embedded'
    case 150: return 'Video cannot be embedded (same as 101)'
    default: return 'Unknown error'
  }
}
