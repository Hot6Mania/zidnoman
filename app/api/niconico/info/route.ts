import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
  }

  // Try getthumbinfo API first (more reliable)
  try {
    const thumbinfoUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`
    const response = await fetch(thumbinfoUrl)

    if (!response.ok) {
      throw new Error('getthumbinfo API failed')
    }

    const xmlText = await response.text()

    // Parse XML response
    let title = `Niconico Video ${videoId}`
    let artist = 'Unknown Artist'
    let thumbnailUrl = '/placeholder-music.svg'
    let duration = 180

    const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/)
    if (titleMatch) title = titleMatch[1]

    const thumbMatch = xmlText.match(/<thumbnail_url>([^<]+)<\/thumbnail_url>/)
    if (thumbMatch) thumbnailUrl = thumbMatch[1]

    const lengthMatch = xmlText.match(/<length>(\d+):(\d+)<\/length>/)
    if (lengthMatch) {
      const minutes = parseInt(lengthMatch[1])
      const seconds = parseInt(lengthMatch[2])
      duration = minutes * 60 + seconds
    }

    const userNicknameMatch = xmlText.match(/<user_nickname>([^<]+)<\/user_nickname>/)
    if (userNicknameMatch) artist = userNicknameMatch[1]

    return NextResponse.json({
      title,
      artist,
      thumbnailUrl,
      duration
    })
  } catch (error) {
    console.warn('getthumbinfo failed, falling back to HTML scraping:', error)
  }

  // Fallback to HTML scraping if API fails
  const url = `https://www.nicovideo.jp/watch/${videoId}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.nicovideo.jp/'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Niconico video info')
    }

    const html = await response.text()

    // Try to extract from JSON data embedded in the page
    let title = `Niconico Video ${videoId}`
    let artist = 'Unknown Artist'
    let thumbnailUrl = '/placeholder-music.svg'
    let duration = 180

    // Pattern 1: JSON-LD data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        if (jsonLd.name) title = jsonLd.name
        if (jsonLd.thumbnailUrl) thumbnailUrl = jsonLd.thumbnailUrl
        if (jsonLd.duration) {
          // Parse ISO 8601 duration (PT3M30S -> 210 seconds)
          const durationStr = jsonLd.duration
          const minutesMatch = durationStr.match(/(\d+)M/)
          const secondsMatch = durationStr.match(/(\d+)S/)
          const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
          const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 0
          duration = minutes * 60 + seconds
        }
        if (jsonLd.author?.name) artist = jsonLd.author.name
      } catch (e) {
        console.error('Failed to parse JSON-LD:', e)
      }
    }

    // Pattern 2: data-api-data attribute (fallback)
    const dataApiMatch = html.match(/data-api-data="([^"]+)"/)
    if (dataApiMatch && title === `Niconico Video ${videoId}`) {
      try {
        const decoded = dataApiMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        const data = JSON.parse(decoded)
        if (data.video?.title) title = data.video.title
        if (data.video?.thumbnail?.url) thumbnailUrl = data.video.thumbnail.url
        if (data.video?.duration) duration = data.video.duration
        if (data.owner?.nickname) artist = data.owner.nickname
      } catch (e) {
        console.error('Failed to parse data-api-data:', e)
      }
    }

    // Pattern 3: Open Graph meta tags (original fallback)
    if (title === `Niconico Video ${videoId}`) {
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
      if (titleMatch) title = titleMatch[1]
    }

    if (artist === 'Unknown Artist') {
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
      if (descMatch) {
        const desc = descMatch[1]
        // Try to extract artist from description
        const artistMatch = desc.match(/^([^：\-]+)/)
        if (artistMatch) artist = artistMatch[1].trim()
      }
    }

    if (thumbnailUrl === '/placeholder-music.svg') {
      const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
      if (thumbMatch) thumbnailUrl = thumbMatch[1]
    }

    // Pattern 4: duration from page data
    if (duration === 180) {
      const durationMatch = html.match(/"duration":(\d+)/)
      if (durationMatch) duration = parseInt(durationMatch[1])
    }

    return NextResponse.json({
      title,
      artist,
      thumbnailUrl,
      duration
    })
  } catch (error) {
    console.error('Niconico fetch error:', error)
    return NextResponse.json({
      title: `Niconico Video ${videoId}`,
      artist: 'Unknown Artist',
      thumbnailUrl: '/placeholder-music.svg',
      duration: 180
    })
  }
}
