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

  let finalPlayerState = playerState || {
    currentSongIndex: 0,
    position: 0,
    isPlaying: false,
    volume: 50,
    shuffle: false,
    repeat: 'none',
    playbackRate: 1.0,
    mode: 'list'
  }

  // Calculate current position based on elapsed time if playing
  if (finalPlayerState.isPlaying && finalPlayerState.lastUpdateTime) {
    const elapsedSeconds = (Date.now() - finalPlayerState.lastUpdateTime) / 1000
    const playbackRate = finalPlayerState.playbackRate || 1.0
    const calculatedPosition = finalPlayerState.position + (elapsedSeconds * playbackRate)

    // Get current song duration to check if we need to advance
    const currentSong = playlist[finalPlayerState.currentSongIndex]
    if (currentSong && calculatedPosition < currentSong.duration) {
      finalPlayerState = {
        ...finalPlayerState,
        position: calculatedPosition
      }
    }
  }

  return NextResponse.json({
    room,
    playlist,
    users,
    playerState: finalPlayerState,
    chatHistory
  })
}
