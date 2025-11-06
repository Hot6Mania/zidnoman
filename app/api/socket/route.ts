import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { Socket as NetSocket } from 'net'
import {
  getRoomData,
  getRoomPlaylist,
  getRoomUsers,
  getRoomPlayerState,
  setRoomPlaylist,
  setRoomUsers,
  setRoomPlayerState
} from '@/lib/db/redis'
import { saveChatMessage } from '@/lib/db/postgres'
import type { SocketEvent, User, Song, ChatMessage, PlayerState } from '@/lib/types'

interface SocketServer extends HTTPServer {
  io?: SocketIOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketWithIO
}

const roomUsers = new Map<string, Set<string>>()

export async function GET(req: NextRequest) {
  const res = new Response(null) as any as NextApiResponseWithSocket

  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...')

    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('room:join', async ({ roomId, user }: { roomId: string; user: User }) => {
        console.log(`User ${user.username} joining room ${roomId}`)

        socket.join(roomId)

        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set())
        }
        roomUsers.get(roomId)!.add(socket.id)

        const [room, playlist, users, playerState] = await Promise.all([
          getRoomData(roomId),
          getRoomPlaylist(roomId),
          getRoomUsers(roomId),
          getRoomPlayerState(roomId)
        ])

        if (!users.find(u => u.id === user.id)) {
          users.push(user)
          await setRoomUsers(roomId, users)
        }

        socket.emit('room:state', {
          room,
          playlist,
          users,
          playerState: playerState || {
            currentSongIndex: 0,
            position: 0,
            isPlaying: false,
            volume: 50,
            shuffle: false,
            repeat: 'none'
          }
        })

        io.to(roomId).emit('user:join', { user })
        io.to(roomId).emit('users:update', { users })
      })

      socket.on('room:leave', async ({ roomId, userId }: { roomId: string; userId: string }) => {
        socket.leave(roomId)

        const users = await getRoomUsers(roomId)
        const updatedUsers = users.filter(u => u.id !== userId)
        await setRoomUsers(roomId, updatedUsers)

        io.to(roomId).emit('user:leave', { userId })
        io.to(roomId).emit('users:update', { users: updatedUsers })

        roomUsers.get(roomId)?.delete(socket.id)
      })

      socket.on('player:play', ({ roomId }: { roomId: string }) => {
        io.to(roomId).emit('player:play')
      })

      socket.on('player:pause', ({ roomId }: { roomId: string }) => {
        io.to(roomId).emit('player:pause')
      })

      socket.on('player:seek', ({ roomId, position }: { roomId: string; position: number }) => {
        io.to(roomId).emit('player:seek', { position })
      })

      socket.on('player:next', ({ roomId }: { roomId: string }) => {
        io.to(roomId).emit('player:next')
      })

      socket.on('player:previous', ({ roomId }: { roomId: string }) => {
        io.to(roomId).emit('player:previous')
      })

      socket.on('player:state', async ({ roomId, state }: { roomId: string; state: Partial<PlayerState> }) => {
        const currentState = await getRoomPlayerState(roomId) || {
          currentSongIndex: 0,
          position: 0,
          isPlaying: false,
          volume: 50,
          shuffle: false,
          repeat: 'none'
        }

        const newState = { ...currentState, ...state }
        await setRoomPlayerState(roomId, newState)

        io.to(roomId).emit('player:state', { state: newState })
      })

      socket.on('song:add', async ({ roomId, song }: { roomId: string; song: Song }) => {
        const playlist = await getRoomPlaylist(roomId)
        playlist.push(song)
        await setRoomPlaylist(roomId, playlist)

        io.to(roomId).emit('song:add', { song })
        io.to(roomId).emit('playlist:update', { playlist })
      })

      socket.on('song:remove', async ({ roomId, songId }: { roomId: string; songId: string }) => {
        const playlist = await getRoomPlaylist(roomId)
        const updatedPlaylist = playlist.filter(s => s.id !== songId)
        await setRoomPlaylist(roomId, updatedPlaylist)

        io.to(roomId).emit('song:remove', { songId })
        io.to(roomId).emit('playlist:update', { playlist: updatedPlaylist })
      })

      socket.on('song:reorder', async ({ roomId, fromIndex, toIndex }: { roomId: string; fromIndex: number; toIndex: number }) => {
        const playlist = await getRoomPlaylist(roomId)
        const [removed] = playlist.splice(fromIndex, 1)
        playlist.splice(toIndex, 0, removed)
        await setRoomPlaylist(roomId, playlist)

        io.to(roomId).emit('song:reorder', { fromIndex, toIndex })
        io.to(roomId).emit('playlist:update', { playlist })
      })

      socket.on('chat:message', async ({ roomId, message }: { roomId: string; message: ChatMessage }) => {
        await saveChatMessage(roomId, message)
        io.to(roomId).emit('chat:message', { message })
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)

        for (const [roomId, sockets] of roomUsers.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id)
            if (sockets.size === 0) {
              roomUsers.delete(roomId)
            }
          }
        }
      })
    })

    console.log('Socket.io server initialized')
  }

  return new Response('Socket.io server is running', { status: 200 })
}
