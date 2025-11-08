'use client'
import { RealtimeChannel } from '@supabase/supabase-js'

import { useRoomStore } from '@/lib/stores/room-store'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { Switch } from '@/components/ui/switch'

interface EffectsControlsProps {
  channel: RealtimeChannel | null
  roomId: string
  disabled?: boolean
}

export function EffectsControls({ roomId, channel, disabled = false }: EffectsControlsProps) {
  const { djState, updateDJState } = useRoomStore()

  if (!djState) return null

  const updateEffect = async (effectType: 'delay' | 'reverb', updates: any) => {
    const newEffects = {
      ...djState.effects,
      [effectType]: { ...djState.effects[effectType], ...updates }
    }

    updateDJState({ effects: newEffects })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { effects: newEffects }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { effects: newEffects }
      })
    } catch (error) {
      console.error('Failed to update effect:', error)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <h3 className="text-sm font-semibold">Effects</h3>

      <div className="space-y-4">
        <div className="space-y-3 p-3 bg-muted/50 rounded-md">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Delay</Label>
            <Switch
              checked={djState.effects.delay.enabled}
              onCheckedChange={(checked) => updateEffect('delay', { enabled: checked })}
              disabled={disabled}
            />
          </div>

          {djState.effects.delay.enabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <span className="text-xs font-mono">{djState.effects.delay.time.toFixed(2)}s</span>
                </div>
                <Slider
                  value={[djState.effects.delay.time]}
                  onValueChange={(value) => updateEffect('delay', { time: value[0] })}
                  min={0.1}
                  max={2.0}
                  step={0.01}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Feedback</Label>
                  <span className="text-xs font-mono">{(djState.effects.delay.feedback * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[djState.effects.delay.feedback]}
                  onValueChange={(value) => updateEffect('delay', { feedback: value[0] })}
                  min={0}
                  max={0.9}
                  step={0.01}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Wet/Dry</Label>
                  <span className="text-xs font-mono">{(djState.effects.delay.wetDry * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[djState.effects.delay.wetDry]}
                  onValueChange={(value) => updateEffect('delay', { wetDry: value[0] })}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 p-3 bg-muted/50 rounded-md">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Reverb</Label>
            <Switch
              checked={djState.effects.reverb.enabled}
              onCheckedChange={(checked) => updateEffect('reverb', { enabled: checked })}
              disabled={disabled}
            />
          </div>

          {djState.effects.reverb.enabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Room Size</Label>
                  <span className="text-xs font-mono">{djState.effects.reverb.roomSize.toFixed(2)}</span>
                </div>
                <Slider
                  value={[djState.effects.reverb.roomSize]}
                  onValueChange={(value) => updateEffect('reverb', { roomSize: value[0] })}
                  min={0.1}
                  max={2.0}
                  step={0.01}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Dampening</Label>
                  <span className="text-xs font-mono">{djState.effects.reverb.dampening.toFixed(2)}</span>
                </div>
                <Slider
                  value={[djState.effects.reverb.dampening]}
                  onValueChange={(value) => updateEffect('reverb', { dampening: value[0] })}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Wet/Dry</Label>
                  <span className="text-xs font-mono">{(djState.effects.reverb.wetDry * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[djState.effects.reverb.wetDry]}
                  onValueChange={(value) => updateEffect('reverb', { wetDry: value[0] })}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
