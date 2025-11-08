import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      },
      timeout: 30000,
      heartbeatIntervalMs: 15000
    }
  }
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

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Connected to room:${roomId}`)
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
