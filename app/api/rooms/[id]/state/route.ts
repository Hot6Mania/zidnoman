import { NextRequest, NextResponse } from 'next/server'
import {
  getRoomData,
  getRoomPlaylist,
  getRoomUsers,
  getRoomPlayerState
} from '@/lib/db/redis'
import { getChatHistory } from '@/lib/db/postgres'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params

  const [room, playlist, users, playerState, chatHistory] = await Promise.all([
    getRoomData(roomId),
    getRoomPlaylist(roomId),
    getRoomUsers(roomId),
    getRoomPlayerState(roomId),
    getChatHistory(roomId)
  ])

  return NextResponse.json({
    room,
    playlist,
    users,
    playerState: playerState || {
      currentSongIndex: 0,
      position: 0,
      isPlaying: false,
      volume: 50,
      shuffle: false,
      repeat: 'none'
    },
    chatHistory
  })
}
