import { NextRequest, NextResponse } from 'next/server'
import { addVideoToPlaylist } from '@/lib/youtube-api'

export async function POST(request: NextRequest) {
  try {
    const { playlistId, videoId } = await request.json()

    if (!playlistId || !videoId) {
      return NextResponse.json(
        { error: 'Playlist ID and Video ID are required' },
        { status: 400 }
      )
    }

    await addVideoToPlaylist(playlistId, videoId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding video to playlist:', error)
    return NextResponse.json(
      { error: 'Failed to add video to playlist' },
      { status: 500 }
    )
  }
}
