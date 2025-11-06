import { NextRequest, NextResponse } from 'next/server'
import { refreshAllTokens } from '@/lib/youtube-api'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    await refreshAllTokens()

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error refreshing tokens:', error)
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      { status: 500 }
    )
  }
}
