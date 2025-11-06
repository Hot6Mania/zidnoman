import { NextRequest, NextResponse } from 'next/server'
import { createPlaylist } from '@/lib/youtube-api'

export async function POST(request: NextRequest) {
  try {
    const { roomName } = await request.json()

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    const playlistId = await createPlaylist(roomName)

    return NextResponse.json({ playlistId })
  } catch (error) {
    console.error('Error creating YouTube playlist:', error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}
