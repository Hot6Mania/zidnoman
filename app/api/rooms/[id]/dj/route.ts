import { NextRequest, NextResponse } from 'next/server'
import { getRoomData, setRoomData, getDJState, setDJState } from '@/lib/db/redis'
import { DJState } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    const body = await request.json()
    const { action, userId } = body

    const room = await getRoomData(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (action === 'assign') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
      }

      room.djId = userId
      await setRoomData(roomId, room)

      const defaultDJState: DJState = {
        crossfaderPosition: 50,
        deck1Volume: 100,
        deck2Volume: 0,
        eq: {
          low: 0,
          mid: 0,
          high: 0
        },
        filter: {
          type: 'none',
          frequency: 1000,
          resonance: 1
        },
        effects: {
          delay: {
            enabled: false,
            time: 0.5,
            feedback: 0.3,
            wetDry: 0
          },
          reverb: {
            enabled: false,
            roomSize: 0.5,
            dampening: 0.5,
            wetDry: 0
          }
        },
        loop: {
          enabled: false,
          start: 0,
          end: 0
        },
        tempo: 100,
        keyLock: false
      }

      await setDJState(roomId, defaultDJState)

      return NextResponse.json({
        room,
        djState: defaultDJState,
        message: 'DJ assigned successfully'
      })
    } else if (action === 'unassign') {
      room.djId = undefined
      await setRoomData(roomId, room)

      return NextResponse.json({
        room,
        message: 'DJ unassigned successfully'
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing DJ:', error)
    return NextResponse.json({ error: 'Failed to manage DJ' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    const body = await request.json()
    const { state } = body

    if (!state) {
      return NextResponse.json({ error: 'State required' }, { status: 400 })
    }

    const currentState = await getDJState(roomId)
    if (!currentState) {
      return NextResponse.json({ error: 'DJ mode not active' }, { status: 400 })
    }

    const updatedState = { ...currentState, ...state }
    await setDJState(roomId, updatedState)

    return NextResponse.json({ djState: updatedState })
  } catch (error) {
    console.error('Error updating DJ state:', error)
    return NextResponse.json({ error: 'Failed to update DJ state' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    const djState = await getDJState(roomId)

    return NextResponse.json({ djState })
  } catch (error) {
    console.error('Error fetching DJ state:', error)
    return NextResponse.json({ error: 'Failed to fetch DJ state' }, { status: 500 })
  }
}
