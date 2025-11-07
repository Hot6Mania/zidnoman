import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

let channel: RealtimeChannel | null = null

export function getRealtimeChannel(roomId: string): RealtimeChannel {
  if (channel?.topic !== `room:${roomId}`) {
    if (channel) {
      supabase.removeChannel(channel)
    }

    channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: '' }
      }
    })
  }

  return channel
}

export function disconnectChannel() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}

export { supabase }
