interface YouTubeAccount {
  clientId: string
  clientSecret: string
  refreshToken: string
}

const YOUTUBE_ACCOUNTS: YouTubeAccount[] = [
  {
    clientId: process.env.YOUTUBE_CLIENT_ID1 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET1 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN1 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID2 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET2 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN2 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID3 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET3 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN3 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID4 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET4 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN4 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID5 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET5 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN5 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID6 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET6 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN6 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID7 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET7 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN7 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID8 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET8 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN8 || ''
  },
  {
    clientId: process.env.YOUTUBE_CLIENT_ID9 || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET9 || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN9 || ''
  }
].filter(account => account.clientId && account.clientSecret && account.refreshToken)

let currentAccountIndex = 0

function getNextAccount(): YouTubeAccount {
  if (YOUTUBE_ACCOUNTS.length === 0) {
    throw new Error('No YouTube accounts configured')
  }

  const account = YOUTUBE_ACCOUNTS[currentAccountIndex]
  currentAccountIndex = (currentAccountIndex + 1) % YOUTUBE_ACCOUNTS.length
  return account
}

async function getAccessToken(account: YouTubeAccount): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: account.clientId,
      client_secret: account.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function createPlaylist(roomName: string): Promise<string> {
  const account = getNextAccount()
  const accessToken = await getAccessToken(account)

  const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        title: `Zidnoman - ${roomName}`,
        description: `Playlist created by Zidnoman for room: ${roomName}`,
        tags: ['zidnoman', 'music', 'shared']
      },
      status: {
        privacyStatus: 'unlisted'
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create playlist: ${error}`)
  }

  const data = await response.json()
  return data.id
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  const account = getNextAccount()
  const accessToken = await getAccessToken(account)

  const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: videoId
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to add video to playlist: ${error}`)
    throw new Error(`Failed to add video to playlist: ${error}`)
  }
}

export async function removeVideoFromPlaylist(playlistItemId: string): Promise<void> {
  const account = getNextAccount()
  const accessToken = await getAccessToken(account)

  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to remove video from playlist: ${error}`)
  }
}

export async function refreshAllTokens(): Promise<void> {
  const results = await Promise.allSettled(
    YOUTUBE_ACCOUNTS.map(async (account) => {
      try {
        await getAccessToken(account)
        return { account: account.clientId, success: true }
      } catch (error) {
        return { account: account.clientId, success: false, error }
      }
    })
  )

  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))

  if (failed.length > 0) {
    console.warn(`Failed to refresh ${failed.length} tokens`)
  }

  console.log(`Successfully refreshed ${results.length - failed.length}/${results.length} tokens`)
}
