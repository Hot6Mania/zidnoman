import { RealtimeChannel } from '@supabase/supabase-js'

export function emitRealtimeEvent(
  channel: RealtimeChannel | null,
  event: string,
  payload?: any
) {
  if (!channel) {
    console.warn('⚠️ No channel provided to emitRealtimeEvent')
    return
  }

  if (channel.state !== 'joined') {
    console.warn('⚠️ Channel not subscribed yet, state:', channel.state)
    return
  }

  console.log('📤 Sending:', event, payload)
  channel.send({
    type: 'broadcast',
    event,
    payload: payload || {}
  })
}
