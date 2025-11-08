'use client'

import { useState } from 'react'
import { useRoomStore } from '@/lib/stores/room-store'
import { Button } from '@/components/ui/button'
import { Music2, X, SlidersHorizontal, Disc3, ChevronDown, ChevronUp } from 'lucide-react'
import { EQControls } from './EQControls'
import { FilterControls } from './FilterControls'
import { EffectsControls } from './EffectsControls'
import { TempoControls } from './TempoControls'
import { HotCues } from './HotCues'
import { Waveform } from './Waveform'
import { toast } from 'sonner'
import { emitRealtimeEvent } from '@/lib/realtime-client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useMobileControls } from '@/lib/hooks/useMobileControls'

interface DJPanelProps {
  roomId: string
  channel: RealtimeChannel | null
}

export function DJPanel({ roomId, channel }: DJPanelProps) {
  const { room, currentUser, djState, setDJState } = useRoomStore()
  const { controlMode, isMobile, toggleMode } = useMobileControls()
  const [expandedSections, setExpandedSections] = useState({
    eq: true,
    filter: true,
    effects: true,
    tempo: true,
    hotcues: true
  })

  const isDJ = room?.djId === currentUser?.id
  const isOwner = room?.ownerId === currentUser?.id

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const expandAll = () => {
    setExpandedSections({ eq: true, filter: true, effects: true, tempo: true, hotcues: true })
  }

  const collapseAll = () => {
    setExpandedSections({ eq: false, filter: false, effects: false, tempo: false, hotcues: false })
  }

  const handleEnableDJMode = async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          userId: currentUser.id
        })
      })

      if (!response.ok) throw new Error('Failed to enable DJ mode')

      const { djState: newDJState } = await response.json()
      setDJState(newDJState)

      emitRealtimeEvent(channel, 'dj:assign', {
        userId: currentUser.id
      })

      toast.success('DJ 모드가 활성화되었습니다')
    } catch (error) {
      console.error('Failed to enable DJ mode:', error)
      toast.error('DJ 모드 활성화에 실패했습니다')
    }
  }

  const handleDisableDJMode = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/dj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unassign'
        })
      })

      if (!response.ok) throw new Error('Failed to disable DJ mode')

      setDJState(null)

      emitRealtimeEvent(channel, 'dj:unassign', {})

      toast.success('DJ 모드가 비활성화되었습니다')
    } catch (error) {
      console.error('Failed to disable DJ mode:', error)
      toast.error('DJ 모드 비활성화에 실패했습니다')
    }
  }

  if (!djState && !isOwner) {
    return null
  }

  if (!djState) {
    return (
      <div className="p-6 bg-card rounded-lg border border-dashed animate-in fade-in duration-300">
        <div className="text-center space-y-4">
          <Music2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">DJ Mode</h3>
            <p className="text-sm text-muted-foreground">
              Enable DJ mode to access professional mixing controls
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
              DJ 기능 추가 예정
            </p>
          </div>
          <Button onClick={handleEnableDJMode} disabled>
            Enable DJ Mode
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
          DJ 기능 추가 예정 - 현재 모든 컨트롤이 비활성화되어 있습니다
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">DJ Controls</h2>
          {isDJ && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md">
              YOU
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="hidden lg:flex"
            disabled
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="hidden lg:flex"
            disabled
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMode}
              title={`Switch to ${controlMode === 'knob' ? 'sliders' : 'knobs'}`}
              disabled
            >
              {controlMode === 'knob' ? (
                <><Disc3 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Knobs</span></>
              ) : (
                <><SlidersHorizontal className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sliders</span></>
              )}
            </Button>
          )}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisableDJMode}
              disabled
            >
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Disable</span>
            </Button>
          )}
        </div>
      </div>

      <div className="hidden lg:block">
        <Waveform channel={channel} roomId={roomId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('eq')}
            className="w-full justify-between"
          >
            <span>3-Band EQ</span>
            {expandedSections.eq ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {expandedSections.eq && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <EQControls roomId={roomId} channel={channel} disabled={!isDJ} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('filter')}
            className="w-full justify-between"
          >
            <span>Filter</span>
            {expandedSections.filter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {expandedSections.filter && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <FilterControls roomId={roomId} channel={channel} disabled={!isDJ} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('effects')}
            className="w-full justify-between"
          >
            <span>Effects</span>
            {expandedSections.effects ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {expandedSections.effects && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <EffectsControls roomId={roomId} channel={channel} disabled={!isDJ} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('tempo')}
            className="w-full justify-between"
          >
            <span>Tempo / Pitch</span>
            {expandedSections.tempo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {expandedSections.tempo && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <TempoControls roomId={roomId} channel={channel} disabled={!isDJ} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSection('hotcues')}
          className="w-full justify-between"
        >
          <span>Hot Cues</span>
          {expandedSections.hotcues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {expandedSections.hotcues && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <HotCues roomId={roomId} channel={channel} disabled={!isDJ} />
          </div>
        )}
      </div>

      {!isDJ && (
        <p className="text-sm text-muted-foreground text-center">
          Only the DJ can control these settings. Current DJ: {room?.djId}
        </p>
      )}
    </div>
  )
}
