import { createLogger } from './logger'

const logger = createLogger('RedirectValidation')

/**
 * Validate redirect path to prevent open redirect vulnerabilities
 *
 * Security Requirements:
 * - Only allow relative paths (must start with '/')
 * - Reject absolute URLs (http://, https://, //)
 * - Throw error for invalid paths
 *
 * @param path - The redirect path to validate
 * @returns The validated path if valid
 * @throws Error if path is not a valid relative path
 *
 * @example
 * validateRedirectPath('/dashboard') // Returns '/dashboard'
 * validateRedirectPath('https://evil.com') // Throws error
 * validateRedirectPath('//evil.com') // Throws error
 */
export function validateRedirectPath(path: string): string {
  // Check if path is empty or not a string
  if (!path || typeof path !== 'string') {
    const error = 'Redirect path must be a non-empty string'
    logger.error(error, { path })
    throw new Error(error)
  }

  // Trim whitespace
  const trimmedPath = path.trim()

  // Check for absolute URLs (protocol-relative or with protocol)
  if (
    trimmedPath.startsWith('http://')
    || trimmedPath.startsWith('https://')
    || trimmedPath.startsWith('//')
  ) {
    const error = 'Redirect path must be a relative path, not an absolute URL. Use paths like "/dashboard" instead of full URLs.'
    logger.error(error, { path: trimmedPath })
    throw new Error(error)
  }

  // Check if path starts with '/'
  if (!trimmedPath.startsWith('/')) {
    const error = 'Redirect path must start with "/" (e.g., "/dashboard")'
    logger.error(error, { path: trimmedPath })
    throw new Error(error)
  }

  // Path is valid
  return trimmedPath
}
