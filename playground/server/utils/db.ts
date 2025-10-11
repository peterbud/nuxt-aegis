import userDatabase from '../db/users.json'

interface User {
  id: string
  email: string
  name: string
  picture: string
  role: string
  permissions: string[]
  createdAt: string
  lastLogin: string
  organizationId: string
}

interface UserDatabase {
  users: User[]
}

// Load the user database
const userDb: UserDatabase = userDatabase as UserDatabase

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
