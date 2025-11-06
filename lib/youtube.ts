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
  if (apiReady) return Promise.resolve()
  if (apiReadyPromise) return apiReadyPromise

  apiReadyPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    if (window.YT && window.YT.Player) {
      apiReady = true
      resolve()
      return
    }

    window.onYouTubeIframeAPIReady = () => {
      apiReady = true
      resolve()
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  })

  return apiReadyPromise
}

export async function getYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  await loadYouTubeIframeAPI()

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
        } catch (e) {}
      }
      container.remove()
    }

    timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timeout loading video info'))
    }, 10000)

    player = new window.YT.Player(containerId, {
      height: '1',
      width: '1',
      videoId: videoId,
      events: {
        onReady: (event: any) => {
          try {
            const duration = event.target.getDuration()
            const videoData = event.target.getVideoData()

            const info: YouTubeVideoInfo = {
              title: videoData.title,
              artist: videoData.author,
              thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: Math.floor(duration)
            }

            cleanup()
            resolve(info)
          } catch (error) {
            cleanup()
            reject(error)
          }
        },
        onError: (event: any) => {
          cleanup()
          reject(new Error(`YouTube player error: ${event.data}`))
        }
      }
    })
  })
}

export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}
