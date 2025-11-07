import { NextRequest, NextResponse } from 'next/server'
import { getRoomUsers, setRoomUsers } from '@/lib/db/redis'
import { User } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { user }: { user: User } = await req.json()

  const users = await getRoomUsers(roomId)
  users.push(user)
  await setRoomUsers(roomId, users)

  return NextResponse.json({ users })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  const users = await getRoomUsers(roomId)
  const updatedUsers = users.filter(u => u.id !== userId)
  await setRoomUsers(roomId, updatedUsers)

  return NextResponse.json({ users: updatedUsers })
}
