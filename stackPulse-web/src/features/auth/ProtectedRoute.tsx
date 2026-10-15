import { Navigate, Outlet, useLocation } from "react-router-dom"

import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/features/auth/auth-context"

export function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullPageSpinner />
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

// Keeps signed-in users away from the login/signup screens.
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullPageSpinner />
  if (status === "authenticated") {
    const from = (location.state as { from?: Location } | null)?.from
    return (
      <Navigate to={from ? `${from.pathname}${from.search}` : "/"} replace />
    )
  }
  return <Outlet />
}
