export default defineEventHandler(() => {
  return {
    message: 'This is a public endpoint accessible without authentication',
    timestamp: new Date().toISOString(),
    data: {
      info: 'Anyone can access this endpoint',
      requiresAuth: false,
    },
  }
})
