export interface SoundCloudTrackInfo {
  title: string
  artist: string
  thumbnailUrl: string
  duration: number
}

export async function getSoundCloudTrackInfo(url: string): Promise<SoundCloudTrackInfo> {
  const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`

  const response = await fetch(oembedUrl)
  if (!response.ok) {
    throw new Error('Failed to fetch SoundCloud track info')
  }

  const data = await response.json()

  const title = data.title || 'SoundCloud Track'
  const artist = data.author_name || 'Unknown Artist'
  const thumbnailUrl = data.thumbnail_url || '/placeholder-music.png'

  const durationMatch = data.html?.match(/data-duration="(\d+)"/)
  const duration = durationMatch ? Math.floor(parseInt(durationMatch[1]) / 1000) : 180

  return {
    title,
    artist,
    thumbnailUrl,
    duration
  }
}
