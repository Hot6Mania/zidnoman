'use client'

import { useEffect, useState } from 'react'

export function InfinityLoader() {
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [rotation, setRotation] = useState(-90) // Start at -90 to immediately rotate to 0
  const fullText = 'Loading...'

  useEffect(() => {
    const typingSpeed = isDeleting ? 50 : 150
    const pauseDuration = isDeleting ? 0 : 1000

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < fullText.length) {
          setText(fullText.slice(0, text.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1))
        } else {
          setIsDeleting(false)
        }
      }
    }, typingSpeed)

    return () => clearTimeout(timeout)
  }, [text, isDeleting])

  useEffect(() => {
    // Immediately trigger first rotation on mount
    const immediateRotate = setTimeout(() => {
      setRotation(0)
    }, 50)

    const interval = setInterval(() => {
      setRotation(prev => prev + 90)
    }, 800)

    return () => {
      clearTimeout(immediateRotate)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative w-32 h-32">
        <svg
          className="w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 700ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }}
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="16" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#glow)">
            <ellipse cx="165" cy="256" rx="85" ry="105" fill="none" stroke="#FFFFA5" strokeWidth="28"/>
            <ellipse cx="347" cy="256" rx="85" ry="105" fill="none" stroke="#FFFFA5" strokeWidth="28"/>
          </g>
        </svg>
      </div>

      <div className="font-mono text-lg tracking-wider">
        {text}
        <span className="animate-pulse">|</span>
      </div>
    </div>
  )
}
