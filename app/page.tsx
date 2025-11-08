'use client'

import { useState, useEffect } from 'react'
import { CreateRoomDialog } from '@/components/home/CreateRoomDialog'
import { JoinRoomInput } from '@/components/home/JoinRoomInput'
import { InfinityLoader } from '@/components/ui/infinity-loader'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [showText, setShowText] = useState(false)
  const [iconRotated, setIconRotated] = useState(false)
  const [iconDropped, setIconDropped] = useState(false)

  useEffect(() => {
    const loadTimer = setTimeout(() => setLoading(false), 1000)
    const dropTimer = setTimeout(() => setIconDropped(true), 1100)
    const rotateTimer = setTimeout(() => setIconRotated(true), 1800)
    const textTimer = setTimeout(() => setShowText(true), 2500)

    return () => {
      clearTimeout(loadTimer)
      clearTimeout(dropTimer)
      clearTimeout(rotateTimer)
      clearTimeout(textTimer)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#39c5bb] to-[#c779d0] flex items-center justify-center p-4">
        <InfinityLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#39c5bb] to-[#c779d0] flex items-center justify-center p-4 py-8 md:py-4">
      <div className="w-full max-w-2xl">
        <div className="text-center space-y-4 md:space-y-6">
          {/* Icon Animation */}
          <div className="flex justify-center mb-6 md:mb-12">
            <div
              className={`relative w-24 h-24 md:w-32 md:h-32 transition-all ${
                iconDropped
                  ? 'translate-y-0'
                  : '-translate-y-[500px]'
              }`}
              style={{
                transitionDuration: iconDropped ? '800ms' : '0ms',
                transitionTimingFunction: iconDropped
                  ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                  : 'ease-out',
              }}
            >
              <svg
                viewBox="0 0 512 512"
                className={`w-24 h-24 md:w-32 md:h-32 transition-transform duration-1000 ${
                  iconRotated ? 'rotate-0' : '-rotate-90'
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
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

                <rect width="512" height="512" fill="#3E3F43" rx="128"/>

                <g filter="url(#glow)">
                  <ellipse cx="165" cy="256" rx="85" ry="105" fill="none" stroke="#FFFFA5" strokeWidth="28"/>
                  <ellipse cx="347" cy="256" rx="85" ry="105" fill="none" stroke="#FFFFA5" strokeWidth="28"/>
                </g>
              </svg>
            </div>
          </div>

          {/* Title - Compact */}
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              Zidnoman
            </h1>

            {/* Typing Text */}
            <div className="space-y-1 md:space-y-2 min-h-[60px] md:min-h-[80px]">
              {showText && (
                <>
                  <div className="text-lg md:text-2xl text-white font-medium flex items-center justify-center">
                    <TypewriterText text="지듣노, 함께 듣다." delay={0} speed={50} />
                  </div>
                  <div className="text-lg md:text-2xl text-white font-medium flex items-center justify-center">
                    <TypewriterText text="지금 바로 망호." delay={0} speed={50} waitForPrevious={true} previousText="지듣노, 함께 듣다." pauseAfterPrevious={500} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 md:p-10 border border-white/20 shadow-2xl">
            <div className="space-y-6">
              <CreateRoomDialog />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/10 text-white/70 rounded-full">
                    또는
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-white/80 text-sm">방 링크로 입장</p>
                <JoinRoomInput />
              </div>
            </div>
          </div>

          {/* Platform Info Below Box */}
          <div className="space-y-1 md:space-y-2 pt-3 md:pt-6">
            <p className="text-base md:text-xl text-white/90 font-medium">
              YouTube 지원 / <span className="text-white/60">니코동, SoundCloud 추가 예정</span>
            </p>
            <p className="text-xs md:text-base text-white/75">
              실시간 재생 상황 동기화, 플랫폼 통합 플레이리스트 / 플레이어 제공
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TypewriterText({
  text,
  delay,
  speed = 100,
  waitForPrevious = false,
  previousText = '',
  pauseAfterPrevious = 0
}: {
  text: string;
  delay: number;
  speed?: number;
  waitForPrevious?: boolean;
  previousText?: string;
  pauseAfterPrevious?: number;
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (waitForPrevious && previousText) {
      // Calculate when previous text finishes
      const previousSequence = textToJamoSequence(previousText)
      const previousDuration = previousSequence.length * speed
      const startTimer = setTimeout(() => setStarted(true), delay + previousDuration + pauseAfterPrevious)
      return () => clearTimeout(startTimer)
    } else {
      const startTimer = setTimeout(() => setStarted(true), delay)
      return () => clearTimeout(startTimer)
    }
  }, [delay, waitForPrevious, previousText, speed, pauseAfterPrevious])

  useEffect(() => {
    if (!started) return

    // Reset cursor visibility when starting
    setShowCursor(true)

    // Convert text to jamo sequence (초성, 중성, 종성 steps)
    const jamoSequence = textToJamoSequence(text)
    let currentIndex = 0

    const typeNextJamo = () => {
      if (currentIndex < jamoSequence.length) {
        setDisplayedText(jamoSequence[currentIndex])
        currentIndex++
        setTimeout(typeNextJamo, speed)
      } else {
        setShowCursor(false)
      }
    }

    typeNextJamo()
  }, [started, text, speed])

  useEffect(() => {
    if (!started) return

    if (displayedText !== text) {
      const cursorTimer = setInterval(() => {
        setShowCursor(prev => !prev)
      }, 500)
      return () => clearInterval(cursorTimer)
    }
  }, [displayedText, text, started])

  if (!started) return null

  return (
    <span className="inline-flex items-center">
      <span>{displayedText}</span>
      {displayedText !== text && (
        <span className={`ml-1 w-0.5 h-6 bg-white ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </span>
  )
}

function textToJamoSequence(text: string): string[] {
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

  const sequence: string[] = []
  let builtText = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)

    // 한글인 경우
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00
      const choIndex = Math.floor(offset / 588)
      const jungIndex = Math.floor((offset % 588) / 28)
      const jongIndex = offset % 28

      // 초성
      sequence.push(builtText + CHO[choIndex])

      // 중성
      const cho = String.fromCharCode(0xAC00 + choIndex * 588 + jungIndex * 28)
      sequence.push(builtText + cho)

      // 종성 (있는 경우)
      if (jongIndex > 0) {
        sequence.push(builtText + char)
      }

      builtText += char
    } else {
      // 한글이 아닌 경우 (공백, 쉼표, 마침표 등)
      builtText += char
      sequence.push(builtText)
    }
  }

  return sequence
}
