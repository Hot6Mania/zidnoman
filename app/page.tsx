import { CreateRoomDialog } from '@/components/home/CreateRoomDialog'
import { JoinRoomInput } from '@/components/home/JoinRoomInput'
import { Music2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center space-y-12">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Music2 className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
                Zidnoman
              </h1>
              <p className="text-2xl md:text-3xl text-white/95 font-medium">
                지듣노, 함께 듣다.
              </p>
              <p className="text-xl md:text-2xl text-white/85">
                지금 바로 망호.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-lg md:text-xl text-white/90">
                YouTube · 니코동 · SoundCloud 지원
              </p>
              <p className="text-sm md:text-base text-white/75">
                실시간 재생 상황 동기화, 플랫폼 통합 플레이리스트 · 플레이어
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl">
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
                <p className="text-white/80 text-sm">방 코드로 입장</p>
                <JoinRoomInput />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
