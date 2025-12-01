import userDatabase from '../db/users.json'
import type { User, Provider } from '~~/shared/types/user'

interface UserDatabase {
  users: User[]
}

// Load initial data from JSON file into memory
// All operations happen in-memory, no file writes
const userDb: UserDatabase = {
  users: JSON.parse(JSON.stringify((userDatabase as UserDatabase).users)),
}

/**
 * Mock database function to retrieve user profile by email
 * @param email - The email address of the user to find
 * @returns The user profile object or null if not found
 */
export function dbGetUserProfile(email: string): User | null {
  const user = userDb.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  return user || null
}

/**
 * Mock database function to retrieve user profile by ID
 * @param id - The ID of the user to find
 * @returns The user profile object or null if not found
 */
export function dbGetUserById(id: string): User | null {
  const user = userDb.users.find(u => u.id === id)
  return user || null
}

/**
 * Mock database function to get all users
 * @returns Array of all users
 */
export function dbGetAllUsers(): User[] {
  return userDb.users
}

/**
 * Mock database function to add a new user
 * @param user - The user to add
 * @returns The added user
 */
export function dbAddUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'> & { providers: Provider[] }): User {
  const newUser: User = {
    ...user,
    id: String(userDb.users.length + 1),
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  }
  userDb.users.push(newUser)
  return newUser
}

/**
 * Mock database function to update a user
 * @param id - The ID of the user to update
 * @param data - The data to update
 * @returns The updated user or null if not found
 */
export function dbUpdateUser(id: string, data: Partial<User>): User | null {
  const userIndex = userDb.users.findIndex(u => u.id === id)
  if (userIndex === -1) {
    return null
  }
  const updatedUser = { ...userDb.users[userIndex], ...data, lastLogin: new Date().toISOString() }
  userDb.users[userIndex] = updatedUser
  return updatedUser
}

/**
 * Mock database function to delete a user
 * @param id - The ID of the user to delete
 * @returns True if the user was deleted, false otherwise
 */
export function dbDeleteUser(id: string): boolean {
  const userIndex = userDb.users.findIndex(u => u.id === id)
  if (userIndex === -1) {
    return false
  }
  userDb.users.splice(userIndex, 1)
  return true
}

/**
 * Mock database function to find a user by provider
 * @param providerName - The name of the provider (e.g., 'google')
 * @param providerId - The user's ID from the provider
 * @returns The user profile object or null if not found
 */
export function dbFindUserByProvider(providerName: string, providerId: string): User | null {
  const user = userDb.users.find(u =>
    u.providers?.some(p => p.name === providerName && p.id === providerId),
  )
  return user || null
}

/**
 * Mock database function to link a provider to a user
 * @param userId - The ID of the user
 * @param provider - The provider to link
 * @returns The updated user or null if not found
 */
export function dbLinkProviderToUser(userId: string, provider: Provider): User | null {
  const userIndex = userDb.users.findIndex(u => u.id === userId)
  if (userIndex === -1) {
    return null
  }

  const user = userDb.users[userIndex]
  if (!user.providers) {
    user.providers = []
  }

  // Check if the provider is already linked
  if (user.providers.some(p => p.name === provider.name && p.id === provider.id)) {
    return user
  }

  user.providers.push(provider)
  return user
}

/**
 * Mock database function to get user by email (case-insensitive)
 * Used for password authentication
 * @param email - The email address to search for
 * @returns The user or null if not found
 */
export function dbGetUserByEmail(email: string): User | null {
  return dbGetUserProfile(email)
}

/**
 * Mock database function to create or update a password user
 * @param email - The user's email
 * @param hashedPassword - The hashed password
 * @returns The created or updated user
 */
export function dbCreateOrUpdatePasswordUser(email: string, hashedPassword: string): User {
  const normalizedEmail = email.toLowerCase().trim()
  const existingUser = dbGetUserByEmail(normalizedEmail)

  if (existingUser) {
    // Update existing user's password
    const updated = dbUpdateUser(existingUser.id, { hashedPassword })
    return updated!
  }
  else {
    // Create new user with password
    const newUser = dbAddUser({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0], // Use email prefix as name
      picture: '',
      role: 'user',
      permissions: ['read'],
      organizationId: 'default',
      providers: [{ name: 'password', id: normalizedEmail }],
    })

    // Update with hashed password
    const updated = dbUpdateUser(newUser.id, { hashedPassword })
    return updated!
  }
}
