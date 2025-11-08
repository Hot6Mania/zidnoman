'use client'

import { useRef } from 'react'
import { useRoomStore } from '@/lib/stores/room-store'
import { Knob } from '@/components/ui/knob'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useMobileControls } from '@/lib/hooks/useMobileControls'

interface EQControlsProps {
  roomId: string
  channel: RealtimeChannel | null
  disabled?: boolean
}

export function EQControls({ roomId, channel, disabled = false }: EQControlsProps) {
  const { djState, updateDJState } = useRoomStore()
  const { controlMode, isMobile } = useMobileControls()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  if (!djState) return null

  const handleEQChange = (band: 'low' | 'mid' | 'high', value: number) => {
    const newEQ = { ...djState.eq, [band]: value }
    updateDJState({ eq: newEQ })

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      handleEQChangeComplete(band, value)
    }, 300)
  }

  const handleEQChangeComplete = async (band: 'low' | 'mid' | 'high', value: number) => {
    const newEQ = { ...djState.eq, [band]: value }

    try {
      await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { eq: newEQ }
        })
      })

      emitRealtimeEvent(channel, 'dj:state', {
        state: { eq: newEQ }
      })
    } catch (error) {
      console.error('Failed to update EQ:', error)
    }
  }

  const useKnobs = !isMobile || controlMode === 'knob'

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-gray-700">
      <h3 className="text-sm font-semibold text-center">3-Band EQ</h3>

      {useKnobs ? (
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <div className="flex flex-col items-center">
            <Knob
              value={djState.eq.low}
              onChange={(value) => handleEQChange('low', value)}
              onChangeComplete={(value) => handleEQChangeComplete('low', value)}
              min={-12}
              max={12}
              size={isMobile ? 70 : 90}
              disabled={disabled}
              label="Low"
              color="#ef4444"
            />
            <div className="mt-2 text-center">
              <span className="text-xs font-mono text-white">
                {djState.eq.low > 0 ? '+' : ''}{djState.eq.low.toFixed(1)}dB
              </span>
              <p className="text-[10px] text-muted-foreground">20-250Hz</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <Knob
              value={djState.eq.mid}
              onChange={(value) => handleEQChange('mid', value)}
              onChangeComplete={(value) => handleEQChangeComplete('mid', value)}
              min={-12}
              max={12}
              size={isMobile ? 70 : 90}
              disabled={disabled}
              label="Mid"
              color="#eab308"
            />
            <div className="mt-2 text-center">
              <span className="text-xs font-mono text-white">
                {djState.eq.mid > 0 ? '+' : ''}{djState.eq.mid.toFixed(1)}dB
              </span>
              <p className="text-[10px] text-muted-foreground">250Hz-4kHz</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <Knob
              value={djState.eq.high}
              onChange={(value) => handleEQChange('high', value)}
              onChangeComplete={(value) => handleEQChangeComplete('high', value)}
              min={-12}
              max={12}
              size={isMobile ? 70 : 90}
              disabled={disabled}
              label="High"
              color="#3b82f6"
            />
            <div className="mt-2 text-center">
              <span className="text-xs font-mono text-white">
                {djState.eq.high > 0 ? '+' : ''}{djState.eq.high.toFixed(1)}dB
              </span>
              <p className="text-[10px] text-muted-foreground">4kHz-20kHz</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-red-400">Low (20-250Hz)</Label>
              <span className="text-xs font-mono text-white">
                {djState.eq.low > 0 ? '+' : ''}{djState.eq.low.toFixed(1)}dB
              </span>
            </div>
            <Slider
              value={[djState.eq.low]}
              onValueChange={(value) => handleEQChange('low', value[0])}
              min={-12}
              max={12}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-yellow-400">Mid (250Hz-4kHz)</Label>
              <span className="text-xs font-mono text-white">
                {djState.eq.mid > 0 ? '+' : ''}{djState.eq.mid.toFixed(1)}dB
              </span>
            </div>
            <Slider
              value={[djState.eq.mid]}
              onValueChange={(value) => handleEQChange('mid', value[0])}
              min={-12}
              max={12}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-blue-400">High (4kHz-20kHz)</Label>
              <span className="text-xs font-mono text-white">
                {djState.eq.high > 0 ? '+' : ''}{djState.eq.high.toFixed(1)}dB
              </span>
            </div>
            <Slider
              value={[djState.eq.high]}
              onValueChange={(value) => handleEQChange('high', value[0])}
              min={-12}
              max={12}
              step={0.1}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  )
}
