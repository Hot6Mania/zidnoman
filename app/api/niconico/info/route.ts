import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
  }

  const url = `https://www.nicovideo.jp/watch/${videoId}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Niconico video info')
    }

    const html = await response.text()

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
    const title = titleMatch ? titleMatch[1] : `Niconico Video ${videoId}`

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
    const artist = descMatch ? descMatch[1].split('：')[0] || 'Unknown Artist' : 'Unknown Artist'

    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    const thumbnailUrl = thumbMatch ? thumbMatch[1] : '/placeholder-music.png'

    const durationMatch = html.match(/"duration":(\d+)/)
    const duration = durationMatch ? parseInt(durationMatch[1]) : 180

    return NextResponse.json({
      title,
      artist,
      thumbnailUrl,
      duration
    })
  } catch (error) {
    return NextResponse.json({
      title: `Niconico Video ${videoId}`,
      artist: 'Unknown Artist',
      thumbnailUrl: '/placeholder-music.png',
      duration: 180
    })
  }
}
