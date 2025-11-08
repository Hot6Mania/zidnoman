import { User, Song, ChatMessage } from './types'

export type Permission =
  | 'add_song'
  | 'remove_song'
  | 'move_song'
  | 'control_player'  // play/pause
  | 'seek'
  | 'skip'
  | 'send_chat'
  | 'delete_chat'
  | 'ban_user'
  | 'rename_room'

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false

  const role = user.role

  switch (permission) {
    case 'add_song':
    case 'send_chat':
      // All users can add songs and send chat
      return true

    case 'remove_song':
    case 'move_song':
    case 'control_player':
    case 'seek':
    case 'skip':
    case 'delete_chat':
      // Moderators and owners
      return role === 'moderator' || role === 'owner'

    case 'ban_user':
    case 'rename_room':
      // Only owners
      return role === 'owner'

    default:
      return false
  }
}

/**
 * Check if user can remove a specific song
 * Users can remove their own songs, moderators/owners can remove any song
 */
export function canRemoveSong(user: User | null, song: Song): boolean {
  if (!user) return false

  // Owners and moderators can remove any song
  if (user.role === 'owner' || user.role === 'moderator') {
    return true
  }

  // Regular users can only remove their own songs
  return song.addedBy === user.id
}

/**
 * Check if user can delete a specific chat message
 * Users can delete their own messages, moderators/owners can delete any message
 */
export function canDeleteChat(user: User | null, message: ChatMessage): boolean {
  if (!user) return false

  // Owners and moderators can delete any message
  if (user.role === 'owner' || user.role === 'moderator') {
    return true
  }

  // Regular users can only delete their own messages
  return message.userId === user.id
}

/**
 * Check if user can control playback (play/pause/seek/skip)
 */
export function canControlPlayer(user: User | null): boolean {
  if (!user) return false
  return user.role === 'moderator' || user.role === 'owner'
}

/**
 * Check if user can manage songs (remove/reorder)
 */
export function canManageSongs(user: User | null): boolean {
  if (!user) return false
  return user.role === 'moderator' || user.role === 'owner'
}

/**
 * Check if user can ban other users
 */
export function canBanUsers(user: User | null): boolean {
  if (!user) return false
  return user.role === 'owner'
}

/**
 * Check if user can rename the room
 */
export function canRenameRoom(user: User | null): boolean {
  if (!user) return false
  return user.role === 'owner' || user.role === 'moderator'
}

/**
 * Get the sync master from the list of users
 * Priority: owner > moderator > null (server mode)
 */
export function getSyncMaster(users: User[]): User | null {
  const owner = users.find(u => u.role === 'owner')
  if (owner) return owner

  const moderator = users.find(u => u.role === 'moderator')
  if (moderator) return moderator

  return null
}

/**
 * Check if the current user is the sync master
 */
export function isSyncMaster(currentUser: User | null, users: User[]): boolean {
  if (!currentUser) return false
  const syncMaster = getSyncMaster(users)
  return syncMaster?.id === currentUser.id
}
