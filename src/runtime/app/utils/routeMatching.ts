/**
 * Convert glob pattern to regex for route matching
 * @param pattern - Glob pattern (supports *, **, ?)
 * @returns RegExp for testing paths
 */
export function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except *, ?, **
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*\*/g, '___DOUBLE_STAR___') // Temporarily replace **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/___DOUBLE_STAR___/g, '.*') // ** matches anything including /
    .replace(/\?/g, '[^/]') // ? matches single character except /

  return new RegExp(`^${regexPattern}$`)
}

/**
 * Check if a path matches any of the provided route patterns
 * @param path - The path to check
 * @param patterns - Array of glob patterns
 * @returns true if the path matches any pattern
 */
export function isRouteMatch(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = globToRegex(pattern)
    return regex.test(path)
  })
}
