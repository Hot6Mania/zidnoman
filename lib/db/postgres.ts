import { createClient } from '@supabase/supabase-js'
import { Room, Song, ChatMessage } from '../types'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function createRoomRecord(room: Room): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .insert({
      id: room.id,
      name: room.name,
      created_at: room.createdAt,
      owner_id: room.ownerId,
      settings: room.settings
    })

  if (error) throw error
}

export async function getRoomRecord(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    ownerId: data.owner_id,
    settings: data.settings
  }
}

export async function saveSongHistory(roomId: string, song: Song): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .insert({
      id: song.id,
      room_id: roomId,
      platform: song.platform,
      platform_id: song.platformId,
      title: song.title,
      artist: song.artist,
      thumbnail_url: song.thumbnailUrl,
      duration: song.duration,
      added_by: song.addedBy,
      added_at: song.addedAt
    })

  if (error) throw error
}

export async function saveChatMessage(roomId: string, message: ChatMessage): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      id: message.id,
      room_id: roomId,
      user_id: message.userId,
      username: message.username,
      user_color: message.userColor,
      content: message.content,
      timestamp: message.timestamp
    })

  if (error) throw error
}

export async function getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userColor: row.user_color,
    content: row.content,
    timestamp: row.timestamp
  })).reverse()
}

export async function initializeDatabase(): Promise<void> {
  console.log('Database initialization should be done through Supabase Dashboard SQL Editor')
  console.log('Run the following SQL:')
  console.log(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      owner_id TEXT NOT NULL,
      settings JSONB NOT NULL
    );

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
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      user_color TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_songs_room_id ON songs(room_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
  `)
}
