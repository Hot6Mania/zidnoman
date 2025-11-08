export interface YouTubeVideoInfo {
  title: string
  artist: string
  thumbnailUrl: string
  duration: number
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

let apiReady = false
let apiReadyPromise: Promise<void> | null = null

export function loadYouTubeIframeAPI(): Promise<void> {
  if (apiReady) {
    console.log('✅ YouTube API already loaded')
    return Promise.resolve()
  }
  if (apiReadyPromise) {
    console.log('⏳ YouTube API loading in progress...')
    return apiReadyPromise
  }

  console.log('🔄 Loading YouTube iframe API...')
  apiReadyPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.log('⚠️  SSR: window undefined, skipping API load')
      resolve()
      return
    }

    if (window.YT && window.YT.Player) {
      console.log('✅ YouTube API found on window')
      apiReady = true
      resolve()
      return
    }

    window.onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube API ready callback fired')
      apiReady = true
      resolve()
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => console.error('❌ Failed to load YouTube iframe API script')

    const head = document.head || document.getElementsByTagName('head')[0]
    if (head) {
      head.appendChild(tag)
      console.log('📥 YouTube iframe API script injected')
    } else {
      console.error('❌ Cannot find document head')
    }
  })

  return apiReadyPromise
}

export async function getYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  console.log('🎬 Fetching YouTube info for:', videoId)

  try {
    await loadYouTubeIframeAPI()
    console.log('✅ API ready, creating player...')
  } catch (error) {
    console.error('❌ Failed to load YouTube API:', error)
    throw error
  }

  return new Promise((resolve, reject) => {
    const containerId = `yt-temp-${Date.now()}`
    const container = document.createElement('div')
    container.id = containerId
    container.style.display = 'none'
    document.body.appendChild(container)

    let player: any
    let timeout: NodeJS.Timeout

    const cleanup = () => {
      if (timeout) clearTimeout(timeout)
      if (player) {
        try {
          player.destroy()
        } catch (e) {
          console.warn('⚠️  Failed to destroy player:', e)
        }
      }
      container.remove()
    }

    timeout = setTimeout(() => {
      console.error('⏱️  Timeout loading video info for:', videoId)
      cleanup()
      reject(new Error('Timeout loading video info'))
    }, 10000)

    console.log('🔨 Creating YT.Player instance for:', videoId)
    try {
      player = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          enablejsapi: 1
        },
        events: {
          onReady: (event: any) => {
            console.log('✅ YT.Player ready for:', videoId)
            try {
              const duration = event.target.getDuration()
              const videoData = event.target.getVideoData()

              console.log('📊 Video data retrieved:', {
                videoId,
                title: videoData.title,
                author: videoData.author,
                duration
              })

              const info: YouTubeVideoInfo = {
                title: videoData.title,
                artist: videoData.author,
                thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: Math.floor(duration)
              }

              cleanup()
              resolve(info)
            } catch (error) {
              console.error('❌ Error extracting video data:', error)
              cleanup()
              reject(error)
            }
          },
          onError: (event: any) => {
            console.error('❌ YouTube player error:', {
              videoId,
              errorCode: event.data,
              errorMessage: getYouTubeErrorMessage(event.data)
            })
            cleanup()
            reject(new Error(`YouTube player error: ${event.data} - ${getYouTubeErrorMessage(event.data)}`))
          },
          onStateChange: (event: any) => {
            console.log('🔄 Player state changed:', {
              videoId,
              state: event.data,
              stateName: getYouTubeStateName(event.data)
            })
          }
        }
      })
    } catch (error) {
      console.error('❌ Failed to create YT.Player:', error)
      cleanup()
      reject(error)
    }
  })
}

function getYouTubeErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 2: return 'Invalid parameter value'
    case 5: return 'HTML5 player error'
    case 100: return 'Video not found or private'
    case 101: return 'Video cannot be embedded'
    case 150: return 'Video cannot be embedded (same as 101)'
    default: return 'Unknown error'
  }
}

function getYouTubeStateName(state: number): string {
  switch (state) {
    case -1: return 'UNSTARTED'
    case 0: return 'ENDED'
    case 1: return 'PLAYING'
    case 2: return 'PAUSED'
    case 3: return 'BUFFERING'
    case 5: return 'CUED'
    default: return 'UNKNOWN'
  }
}

export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/,
    /youtube\.com\/embed\/([^&\s?]+)/,
    /youtube\.com\/v\/([^&\s?]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function cleanYouTubeUrl(url: string): string {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) {
    return url
  }
  return `https://www.youtube.com/watch?v=${videoId}`
}
