'use client'
import { RealtimeChannel } from '@supabase/supabase-js'

import { useRoomStore } from '@/lib/stores/room-store'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { emitRealtimeEvent } from '@/lib/realtime-client'

interface FilterControlsProps {
  channel: RealtimeChannel | null
  roomId: string
  disabled?: boolean
}

export function FilterControls({ roomId, channel, disabled = false }: FilterControlsProps) {
  const { djState, updateDJState } = useRoomStore()

  if (!djState) return null

  const handleFilterTypeChange = async (type: 'none' | 'hpf' | 'lpf') => {
    const newFilter = { ...djState.filter, type }

    updateDJState({ filter: newFilter })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { filter: newFilter }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { filter: newFilter }
      })
    } catch (error) {
      console.error('Failed to update filter:', error)
    }
  }

  const handleFrequencyChange = async (value: number[]) => {
    const newFilter = { ...djState.filter, frequency: value[0] }

    updateDJState({ filter: newFilter })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { filter: newFilter }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { filter: newFilter }
      })
    } catch (error) {
      console.error('Failed to update filter frequency:', error)
    }
  }

  const handleResonanceChange = async (value: number[]) => {
    const newFilter = { ...djState.filter, resonance: value[0] }

    updateDJState({ filter: newFilter })

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { filter: newFilter }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { filter: newFilter }
      })
    } catch (error) {
      console.error('Failed to update filter resonance:', error)
    }
  }

  const isHPFActive = djState.filter.type === 'hpf'
  const isLPFActive = djState.filter.type === 'lpf'
  const showHPF = isHPFActive
  const showLPF = isLPFActive

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-gray-700">
      <h3 className="text-sm font-semibold text-center">Filter</h3>

      <div className="flex gap-2">
        <Button
          variant={djState.filter.type === 'none' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterTypeChange('none')}
          disabled={disabled}
          className="flex-1"
        >
          Off
        </Button>
        <Button
          variant={isHPFActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterTypeChange('hpf')}
          disabled={disabled}
          className="flex-1"
        >
          HPF
        </Button>
        <Button
          variant={isLPFActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterTypeChange('lpf')}
          disabled={disabled}
          className="flex-1"
        >
          LPF
        </Button>
      </div>

      {showHPF && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-blue-400">HPF Frequency</Label>
              <span className="text-xs font-mono text-white">{djState.filter.frequency}Hz</span>
            </div>
            <Slider
              value={[djState.filter.frequency]}
              onValueChange={handleFrequencyChange}
              min={20}
              max={20000}
              step={10}
              disabled={disabled}
              className="[&_[role=slider]]:transition-all [&_[role=slider]]:duration-75"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-blue-400">HPF Resonance</Label>
              <span className="text-xs font-mono text-white">{djState.filter.resonance.toFixed(1)}</span>
            </div>
            <Slider
              value={[djState.filter.resonance]}
              onValueChange={handleResonanceChange}
              min={0.1}
              max={20}
              step={0.1}
              disabled={disabled}
              className="[&_[role=slider]]:transition-all [&_[role=slider]]:duration-75"
            />
          </div>
        </>
      )}

      {showLPF && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-orange-400">LPF Frequency</Label>
              <span className="text-xs font-mono text-white">{djState.filter.frequency}Hz</span>
            </div>
            <Slider
              value={[djState.filter.frequency]}
              onValueChange={handleFrequencyChange}
              min={20}
              max={20000}
              step={10}
              disabled={disabled}
              className="[&_[role=slider]]:transition-all [&_[role=slider]]:duration-75"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-orange-400">LPF Resonance</Label>
              <span className="text-xs font-mono text-white">{djState.filter.resonance.toFixed(1)}</span>
            </div>
            <Slider
              value={[djState.filter.resonance]}
              onValueChange={handleResonanceChange}
              min={0.1}
              max={20}
              step={0.1}
              disabled={disabled}
              className="[&_[role=slider]]:transition-all [&_[role=slider]]:duration-75"
            />
          </div>
        </>
      )}
    </div>
  )
}
