'use client'

import { useState, useEffect } from 'react'

type ControlMode = 'knob' | 'slider'

export function useMobileControls() {
  const [controlMode, setControlMode] = useState<ControlMode>('knob')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    const saved = localStorage.getItem('dj-control-mode')
    if (saved === 'knob' || saved === 'slider') {
      setControlMode(saved)
    }

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleMode = () => {
    const newMode = controlMode === 'knob' ? 'slider' : 'knob'
    setControlMode(newMode)
    localStorage.setItem('dj-control-mode', newMode)
  }

  return { controlMode, isMobile, toggleMode }
}
