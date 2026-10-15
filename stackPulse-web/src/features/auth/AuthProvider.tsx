import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import * as authApi from "@/api/auth"
import { refreshAccessToken, setAuthFailureHandler } from "@/api/client"
import type { User } from "@/api/types"
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "@/features/auth/auth-context"

interface AuthState {
  status: AuthStatus
  user: User | null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  })

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let active = true
    refreshAccessToken()
      .then((token) => (token ? authApi.fetchMe() : null))
      .catch(() => null)
      .then((user) => {
        if (!active) return
        setState(
          user
            ? { status: "authenticated", user }
            : { status: "anonymous", user: null }
        )
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.clear()
      setState({ status: "anonymous", user: null })
    })
    return () => setAuthFailureHandler(null)
  }, [queryClient])

  const login = useCallback<AuthContextValue["login"]>(
    async (credentials) => {
      const user = await authApi.login(credentials)
      queryClient.clear()
      setState({ status: "authenticated", user })
    },
    [queryClient]
  )

  const signup = useCallback<AuthContextValue["signup"]>(
    async (credentials) => {
      const user = await authApi.signup(credentials)
      queryClient.clear()
      setState({ status: "authenticated", user })
    },
    [queryClient]
  )

  const logout = useCallback<AuthContextValue["logout"]>(async () => {
    await authApi.logout().catch(() => undefined)
    queryClient.clear()
    setState({ status: "anonymous", user: null })
  }, [queryClient])

  const value = useMemo(
    () => ({ ...state, login, signup, logout }),
    [state, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
