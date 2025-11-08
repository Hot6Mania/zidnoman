import Redis from 'ioredis'
import { Room, Song, User, PlayerState, DJState, SongMetadata } from '../types'

const redis = new Redis(process.env.REDIS_URL || '')

export async function getRoomData(roomId: string): Promise<Room | null> {
  const data = await redis.get(`room:${roomId}`)
  return data ? JSON.parse(data) : null
}

export async function setRoomData(roomId: string, room: Room): Promise<void> {
  await redis.set(`room:${roomId}`, JSON.stringify(room), 'EX', 86400)
}

export async function getRoomPlaylist(roomId: string): Promise<Song[]> {
  const data = await redis.get(`room:${roomId}:playlist`)
  return data ? JSON.parse(data) : []
}

export async function setRoomPlaylist(roomId: string, playlist: Song[]): Promise<void> {
  await redis.set(`room:${roomId}:playlist`, JSON.stringify(playlist), 'EX', 86400)
}

export async function getRoomUsers(roomId: string): Promise<User[]> {
  const data = await redis.get(`room:${roomId}:users`)
  return data ? JSON.parse(data) : []
}

export async function setRoomUsers(roomId: string, users: User[]): Promise<void> {
  await redis.set(`room:${roomId}:users`, JSON.stringify(users), 'EX', 86400)
}

export async function getRoomPlayerState(roomId: string): Promise<PlayerState | null> {
  const data = await redis.get(`room:${roomId}:state`)
  return data ? JSON.parse(data) : null
}

export async function setRoomPlayerState(roomId: string, state: PlayerState): Promise<void> {
  await redis.set(`room:${roomId}:state`, JSON.stringify(state), 'EX', 86400)
}

export async function deleteRoom(roomId: string): Promise<void> {
  await redis.del(
    `room:${roomId}`,
    `room:${roomId}:playlist`,
    `room:${roomId}:users`,
    `room:${roomId}:state`
  )
}

export async function roomExists(roomId: string): Promise<boolean> {
  const exists = await redis.exists(`room:${roomId}`)
  return exists === 1
}

// Vote-skip functions
export async function addVoteSkip(roomId: string, songId: string, userId: string): Promise<number> {
  const key = `room:${roomId}:voteskip:${songId}`
  await redis.sadd(key, userId)
  await redis.expire(key, 600) // Expire after 10 minutes
  return await redis.scard(key)
}

export async function removeVoteSkip(roomId: string, songId: string, userId: string): Promise<number> {
  const key = `room:${roomId}:voteskip:${songId}`
  await redis.srem(key, userId)
  return await redis.scard(key)
}

export async function getVoteSkipCount(roomId: string, songId: string): Promise<number> {
  const key = `room:${roomId}:voteskip:${songId}`
  return await redis.scard(key)
}

export async function hasVotedSkip(roomId: string, songId: string, userId: string): Promise<boolean> {
  const key = `room:${roomId}:voteskip:${songId}`
  return (await redis.sismember(key, userId)) === 1
}

export async function clearVoteSkip(roomId: string, songId: string): Promise<void> {
  const key = `room:${roomId}:voteskip:${songId}`
  await redis.del(key)
}

export async function getDJState(roomId: string): Promise<DJState | null> {
  const data = await redis.get(`room:${roomId}:dj_state`)
  return data ? JSON.parse(data) : null
}

export async function setDJState(roomId: string, state: DJState): Promise<void> {
  await redis.set(`room:${roomId}:dj_state`, JSON.stringify(state), 'EX', 86400)
}

export async function getSongMetadata(roomId: string, songId: string): Promise<SongMetadata | null> {
  const data = await redis.get(`room:${roomId}:song:${songId}:metadata`)
  return data ? JSON.parse(data) : null
}

export async function setSongMetadata(roomId: string, songId: string, metadata: SongMetadata): Promise<void> {
  await redis.set(`room:${roomId}:song:${songId}:metadata`, JSON.stringify(metadata), 'EX', 86400)
}

export async function getAllSongMetadata(roomId: string): Promise<Record<string, SongMetadata>> {
  const playlist = await getRoomPlaylist(roomId)
  const metadata: Record<string, SongMetadata> = {}

  for (const song of playlist) {
    const meta = await getSongMetadata(roomId, song.id)
    if (meta) {
      metadata[song.id] = meta
    }
  }

  return metadata
}
