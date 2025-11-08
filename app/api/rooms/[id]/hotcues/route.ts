import { NextRequest, NextResponse } from 'next/server'
import { getSongMetadata, setSongMetadata } from '@/lib/db/redis'
import { HotCue } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    const body = await request.json()
    const { songId, hotCue } = body as { songId: string; hotCue: HotCue }

    if (!songId || !hotCue) {
      return NextResponse.json({ error: 'Song ID and hot cue required' }, { status: 400 })
    }

    let metadata = await getSongMetadata(roomId, songId)
    if (!metadata) {
      metadata = { hotCues: [], bpm: undefined, key: undefined }
    }

    const existingIndex = metadata.hotCues.findIndex(cue => cue.id === hotCue.id)
    if (existingIndex >= 0) {
      metadata.hotCues[existingIndex] = hotCue
    } else {
      metadata.hotCues.push(hotCue)
    }

    metadata.hotCues.sort((a, b) => a.id - b.id)

    await setSongMetadata(roomId, songId, metadata)

    return NextResponse.json({ metadata })
  } catch (error) {
    console.error('Error setting hot cue:', error)
    return NextResponse.json({ error: 'Failed to set hot cue' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('songId')
    const hotCueId = searchParams.get('hotCueId')

    if (!songId || !hotCueId) {
      return NextResponse.json({ error: 'Song ID and hot cue ID required' }, { status: 400 })
    }

    const metadata = await getSongMetadata(roomId, songId)
    if (!metadata) {
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404 })
    }

    metadata.hotCues = metadata.hotCues.filter(cue => cue.id !== parseInt(hotCueId))

    await setSongMetadata(roomId, songId, metadata)

    return NextResponse.json({ metadata })
  } catch (error) {
    console.error('Error deleting hot cue:', error)
    return NextResponse.json({ error: 'Failed to delete hot cue' }, { status: 500 })
  }
}
