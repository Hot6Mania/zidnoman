import { NextRequest, NextResponse } from 'next/server'
import { getRoomPlayerState, setRoomPlayerState } from '@/lib/db/redis'
import { PlayerState } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { state }: { state: Partial<PlayerState> } = await req.json()

  const currentState = await getRoomPlayerState(roomId) || {
    currentSongIndex: 0,
    position: 0,
    isPlaying: false,
    volume: 50,
    shuffle: false,
    repeat: 'none'
  }

  const newState = { ...currentState, ...state }
  await setRoomPlayerState(roomId, newState)

  return NextResponse.json({ state: newState })
}
