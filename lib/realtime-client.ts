import { getRealtimeChannel } from './realtime'

export function emitRealtimeEvent(roomId: string, event: string, payload?: any) {
  const channel = getRealtimeChannel(roomId)
  channel.send({
    type: 'broadcast',
    event,
    payload: payload || {}
  })
}
