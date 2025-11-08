'use client'
import { RealtimeChannel } from '@supabase/supabase-js'

import { useRoomStore } from '@/lib/stores/room-store'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { emitRealtimeEvent } from '@/lib/realtime-client'

interface TempoControlsProps {
  channel: RealtimeChannel | null
  roomId: string
  disabled?: boolean
}

export function TempoControls({ roomId, channel, disabled = false }: TempoControlsProps) {
  const { djState, updateDJState } = useRoomStore()

  if (!djState) return null

  const handleTempoChange = async (value: number[]) => {
    updateDJState({ tempo: value[0] })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { tempo: value[0] }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { tempo: value[0] }
      })
    } catch (error) {
      console.error('Failed to update tempo:', error)
    }
  }

  const handleKeyLockChange = async (checked: boolean) => {
    updateDJState({ keyLock: checked })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { keyLock: checked }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { keyLock: checked }
      })
    } catch (error) {
      console.error('Failed to update key lock:', error)
    }
  }

  const resetTempo = () => {
    handleTempoChange([100])
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tempo / Pitch</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetTempo}
          disabled={disabled || djState.tempo === 100}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground">Tempo</Label>
            <span className="text-sm font-mono font-medium">
              {djState.tempo > 100 ? '+' : ''}{(djState.tempo - 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[djState.tempo]}
            onValueChange={handleTempoChange}
            min={50}
            max={150}
            step={1}
            disabled={disabled}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-50%</span>
            <span>0%</span>
            <span>+50%</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Key Lock</Label>
            <p className="text-xs text-muted-foreground">
              Maintain pitch when changing tempo
            </p>
          </div>
          <Switch
            checked={djState.keyLock}
            onCheckedChange={handleKeyLockChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
