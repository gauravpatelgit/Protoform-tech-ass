import { request, setAccessToken } from "@/api/client"
import type { AuthPayload, User } from "@/api/types"

export interface Credentials {
  email: string
  password: string
}

async function authenticate(path: string, credentials: Credentials) {
  const { data } = await request<AuthPayload>(path, {
    method: "POST",
    body: credentials,
    skipRefresh: true,
  })
  setAccessToken(data.accessToken)
  return data.user
}

export const login = (credentials: Credentials) =>
  authenticate("/auth/login", credentials)

export const signup = (credentials: Credentials) =>
  authenticate("/auth/signup", credentials)

export async function logout() {
  try {
    await request<void>("/auth/logout", { method: "POST", skipRefresh: true })
  } finally {
    setAccessToken(null)
  }
}

export async function fetchMe() {
  const { data } = await request<User>("/auth/me")
  return data
}
