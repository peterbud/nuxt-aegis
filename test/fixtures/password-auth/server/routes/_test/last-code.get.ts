import { sentCodes } from '../../plugins/aegis'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const email = query.email as string
  return { code: sentCodes.get(email) }
})
