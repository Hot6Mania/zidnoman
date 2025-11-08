import { NextRequest, NextResponse } from 'next/server'
import { getRoomData, getRoomUsers, addVoteSkip, removeVoteSkip, getVoteSkipCount, hasVotedSkip, clearVoteSkip } from '@/lib/db/redis'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { songId, userId, action }: { songId: string; userId: string; action: 'vote' | 'unvote' } = await req.json()

  const room = await getRoomData(roomId)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.settings.enableVoteSkip) {
    return NextResponse.json({ error: 'Vote skip is disabled' }, { status: 403 })
  }

  const users = await getRoomUsers(roomId)
  const userCount = users.length

  let voteCount: number

  if (action === 'vote') {
    const alreadyVoted = await hasVotedSkip(roomId, songId, userId)
    if (alreadyVoted) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }
    voteCount = await addVoteSkip(roomId, songId, userId)
  } else {
    voteCount = await removeVoteSkip(roomId, songId, userId)
  }

  // Calculate if threshold is met
  const threshold = room.settings.voteSkipThreshold || 0.5
  const requiredVotes = Math.ceil(userCount * threshold)
  const shouldSkip = voteCount >= requiredVotes

  if (shouldSkip) {
    // Clear votes for this song
    await clearVoteSkip(roomId, songId)
  }

  return NextResponse.json({
    voteCount,
    requiredVotes,
    userCount,
    threshold,
    shouldSkip,
    hasVoted: action === 'vote'
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { searchParams } = new URL(req.url)
  const songId = searchParams.get('songId')
  const userId = searchParams.get('userId')

  if (!songId || !userId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const room = await getRoomData(roomId)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const voteCount = await getVoteSkipCount(roomId, songId)
  const hasVoted = await hasVotedSkip(roomId, songId, userId)
  const users = await getRoomUsers(roomId)
  const userCount = users.length
  const threshold = room.settings.voteSkipThreshold || 0.5
  const requiredVotes = Math.ceil(userCount * threshold)

  return NextResponse.json({
    voteCount,
    requiredVotes,
    userCount,
    threshold,
    hasVoted
  })
}
