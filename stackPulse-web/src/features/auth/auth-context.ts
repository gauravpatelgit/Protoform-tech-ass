import { createContext, useContext } from "react"

import type { Credentials } from "@/api/auth"
import type { User } from "@/api/types"

export type AuthStatus = "loading" | "authenticated" | "anonymous"

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (credentials: Credentials) => Promise<void>
  signup: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
