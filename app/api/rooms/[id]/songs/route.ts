import { NextRequest, NextResponse } from 'next/server'
import { getRoomPlaylist, setRoomPlaylist } from '@/lib/db/redis'
import { Song } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { song }: { song: Song } = await req.json()

  const playlist = await getRoomPlaylist(roomId)
  playlist.push(song)
  await setRoomPlaylist(roomId, playlist)

  return NextResponse.json({ playlist })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { searchParams } = new URL(req.url)
  const songId = searchParams.get('songId')

  if (!songId) {
    return NextResponse.json({ error: 'Song ID required' }, { status: 400 })
  }

  const playlist = await getRoomPlaylist(roomId)
  const updatedPlaylist = playlist.filter(s => s.id !== songId)
  await setRoomPlaylist(roomId, updatedPlaylist)

  return NextResponse.json({ playlist: updatedPlaylist })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { fromIndex, toIndex }: { fromIndex: number; toIndex: number } = await req.json()

  const playlist = await getRoomPlaylist(roomId)
  const [removed] = playlist.splice(fromIndex, 1)
  playlist.splice(toIndex, 0, removed)
  await setRoomPlaylist(roomId, playlist)

  return NextResponse.json({ playlist })
}
