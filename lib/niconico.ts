export interface NiconicoVideoInfo {
  title: string
  artist: string
  thumbnailUrl: string
  duration: number
}

export async function getNiconicoVideoInfo(videoId: string): Promise<NiconicoVideoInfo> {
  try {
    const response = await fetch(`/api/niconico/info?videoId=${videoId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch Niconico video info')
    }

    return await response.json()
  } catch (error) {
    return {
      title: `Niconico Video ${videoId}`,
      artist: 'Unknown Artist',
      thumbnailUrl: '/placeholder-music.png',
      duration: 180
    }
  }
}
