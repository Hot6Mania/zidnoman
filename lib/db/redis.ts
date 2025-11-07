import Redis from 'ioredis'
import { Room, Song, User, PlayerState } from '../types'

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
