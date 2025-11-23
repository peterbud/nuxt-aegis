export type Provider = {
  name: string
  id: string
}

export type User = {
  id: string
  email: string
  name: string
  picture: string
  role: string
  permissions: string[]
  createdAt: string
  lastLogin: string
  organizationId: string
  providers?: Provider[]
}
