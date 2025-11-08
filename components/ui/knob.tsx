'use client'

import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react'

interface KnobProps {
  value: number
  onChange: (value: number) => void
  onChangeComplete?: (value: number) => void
  min?: number
  max?: number
  size?: number
  disabled?: boolean
  label?: string
  color?: string
  showValue?: boolean
  dragMode?: 'vertical' | 'circular'
}

export function Knob({
  value,
  onChange,
  onChangeComplete,
  min = 0,
  max = 100,
  size = 80,
  disabled = false,
  label,
  color = 'hsl(var(--primary))',
  showValue = true,
  dragMode = 'circular'
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startAngleRef = useRef(0)
  const startValueRef = useRef(0)

  const normalizedValue = ((value - min) / (max - min)) * 100
  const rotation = (normalizedValue / 100) * 270 - 135 // -135° to 135°

  const getAngleFromEvent = (clientX: number, clientY: number): number => {
    if (!knobRef.current) return 0

    const rect = knobRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = clientX - centerX
    const deltaY = clientY - centerY

    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    angle = (angle + 90) % 360
    if (angle < 0) angle += 360

    return angle
  }

  const normalizeAngleDelta = (delta: number): number => {
    if (delta > 180) return delta - 360
    if (delta < -180) return delta + 360
    return delta
  }

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return
    setIsDragging(true)

    if (dragMode === 'circular') {
      startAngleRef.current = getAngleFromEvent(clientX, clientY)
    } else {
      startYRef.current = clientY
    }

    startValueRef.current = value
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return

    if (dragMode === 'circular') {
      const currentAngle = getAngleFromEvent(clientX, clientY)
      let angleDelta = normalizeAngleDelta(currentAngle - startAngleRef.current)

      const valueDelta = (angleDelta / 270) * (max - min)
      let newValue = startValueRef.current + valueDelta

      newValue = Math.max(min, Math.min(max, newValue))
      newValue = Math.round(newValue * 10) / 10

      onChange(newValue)
    } else {
      const deltaY = startYRef.current - clientY
      const sensitivity = (max - min) / 200
      let newValue = startValueRef.current + deltaY * sensitivity

      newValue = Math.max(min, Math.min(max, newValue))
      newValue = Math.round(newValue * 10) / 10

      onChange(newValue)
    }
  }

  const handleEnd = () => {
    setIsDragging(false)
    if (onChangeComplete) {
      onChangeComplete(value)
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY)
  }

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleMouseUp = () => {
      handleEnd()
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, dragMode])

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}

      <div
        ref={knobRef}
        className={`relative rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border-2 border-gray-700 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Outer ring indicator */}
        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-135deg)' }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            strokeDasharray={`${(270 / 360) * (2 * Math.PI * 45)} ${(360 / 360) * (2 * Math.PI * 45)}`}
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${(270 / 360) * (2 * Math.PI * 45) * (normalizedValue / 100)} ${(360 / 360) * (2 * Math.PI * 45)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.05s ease-out' }}
          />
        </svg>

        {/* Inner knob */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 shadow-inner flex items-center justify-center">
          {showValue && (
            <span className="text-xs font-bold text-white relative z-10">
              {Math.round(value)}
            </span>
          )}
        </div>

        {/* Indicator line */}
        <div
          className="absolute top-1/2 left-1/2 origin-bottom z-[5]"
          style={{
            width: 3,
            height: size / 2 - 10,
            backgroundColor: color,
            transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
            borderRadius: 2,
            boxShadow: `0 0 8px ${color}`,
            transition: 'transform 0.05s ease-out'
          }}
        />
      </div>
    </div>
  )
}
