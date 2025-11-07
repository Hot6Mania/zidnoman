import { NextRequest, NextResponse } from 'next/server'
import { saveChatMessage } from '@/lib/db/postgres'
import { ChatMessage } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const { message }: { message: ChatMessage } = await req.json()

  await saveChatMessage(roomId, message)

  return NextResponse.json({ success: true })
}
