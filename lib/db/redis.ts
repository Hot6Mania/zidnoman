import { kv } from '@vercel/kv'
import { Room, Song, User, PlayerState } from '../types'

export const redis = kv

export async function getRoomData(roomId: string): Promise<Room | null> {
  const room = await redis.get<Room>(`room:${roomId}`)
  return room
}

export async function setRoomData(roomId: string, room: Room): Promise<void> {
  await redis.set(`room:${roomId}`, room)
  await redis.expire(`room:${roomId}`, 86400)
}

export async function getRoomPlaylist(roomId: string): Promise<Song[]> {
  const playlist = await redis.get<Song[]>(`room:${roomId}:playlist`)
  return playlist || []
}

export async function setRoomPlaylist(roomId: string, playlist: Song[]): Promise<void> {
  await redis.set(`room:${roomId}:playlist`, playlist)
  await redis.expire(`room:${roomId}:playlist`, 86400)
}

export async function getRoomUsers(roomId: string): Promise<User[]> {
  const users = await redis.get<User[]>(`room:${roomId}:users`)
  return users || []
}

export async function setRoomUsers(roomId: string, users: User[]): Promise<void> {
  await redis.set(`room:${roomId}:users`, users)
  await redis.expire(`room:${roomId}:users`, 86400)
}

export async function getRoomPlayerState(roomId: string): Promise<PlayerState | null> {
  const state = await redis.get<PlayerState>(`room:${roomId}:state`)
  return state
}

export async function setRoomPlayerState(roomId: string, state: PlayerState): Promise<void> {
  await redis.set(`room:${roomId}:state`, state)
  await redis.expire(`room:${roomId}:state`, 86400)
}

export async function deleteRoom(roomId: string): Promise<void> {
  await Promise.all([
    redis.del(`room:${roomId}`),
    redis.del(`room:${roomId}:playlist`),
    redis.del(`room:${roomId}:users`),
    redis.del(`room:${roomId}:state`)
  ])
}

export async function roomExists(roomId: string): Promise<boolean> {
  const room = await redis.get(`room:${roomId}`)
  return room !== null
}
