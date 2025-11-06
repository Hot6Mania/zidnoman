import { sql } from '@vercel/postgres'
import { Room, Song, ChatMessage } from '../types'

export async function createRoomRecord(room: Room): Promise<void> {
  await sql`
    INSERT INTO rooms (id, name, created_at, owner_id, settings)
    VALUES (${room.id}, ${room.name}, ${room.createdAt}, ${room.ownerId}, ${JSON.stringify(room.settings)})
  `
}

export async function getRoomRecord(roomId: string): Promise<Room | null> {
  const result = await sql`
    SELECT * FROM rooms WHERE id = ${roomId}
  `

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    settings: JSON.parse(row.settings)
  }
}

export async function saveSongHistory(roomId: string, song: Song): Promise<void> {
  await sql`
    INSERT INTO songs (id, room_id, platform, platform_id, title, artist, thumbnail_url, duration, added_by, added_at)
    VALUES (${song.id}, ${roomId}, ${song.platform}, ${song.platformId}, ${song.title}, ${song.artist}, ${song.thumbnailUrl}, ${song.duration}, ${song.addedBy}, ${song.addedAt})
  `
}

export async function saveChatMessage(roomId: string, message: ChatMessage): Promise<void> {
  await sql`
    INSERT INTO chat_messages (id, room_id, user_id, username, user_color, content, timestamp)
    VALUES (${message.id}, ${roomId}, ${message.userId}, ${message.username}, ${message.userColor}, ${message.content}, ${message.timestamp})
  `
}

export async function getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
  const result = await sql`
    SELECT * FROM chat_messages
    WHERE room_id = ${roomId}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userColor: row.user_color,
    content: row.content,
    timestamp: row.timestamp
  })).reverse()
}

export async function initializeDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      owner_id TEXT NOT NULL,
      settings JSONB NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      duration INTEGER NOT NULL,
      added_by TEXT NOT NULL,
      added_at BIGINT NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      user_color TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_songs_room_id ON songs(room_id)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id)
  `
}
