import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { setRoomData, setRoomPlaylist, setRoomUsers, setRoomPlayerState } from '@/lib/db/redis'
import { createRoomRecord } from '@/lib/db/postgres'
import { Room, User } from '@/lib/types'
import { generateUserColor } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomName, username } = body

    if (!roomName || !username) {
      return NextResponse.json(
        { error: 'Room name and username are required' },
        { status: 400 }
      )
    }

    const roomId = nanoid(8)
    const userId = nanoid()

    const user: User = {
      id: userId,
      username,
      color: generateUserColor(),
      role: 'owner',
      joinedAt: Date.now()
    }

    const room: Room = {
      id: roomId,
      name: roomName,
      createdAt: Date.now(),
      ownerId: userId,
      settings: {
        allowAddSongs: 'all',
        enableChat: true,
        enableVoteSkip: true,
        voteSkipThreshold: 0.5
      }
    }

    await Promise.all([
      setRoomData(roomId, room),
      setRoomPlaylist(roomId, []),
      setRoomUsers(roomId, [user]),
      setRoomPlayerState(roomId, {
        currentSongIndex: 0,
        position: 0,
        isPlaying: false,
        volume: 50,
        shuffle: false,
        repeat: 'none'
      }),
      createRoomRecord(room).catch(err => {
        console.error('Failed to save room to Postgres:', err)
      })
    ])

    return NextResponse.json({
      room,
      user,
      roomId
    })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}
