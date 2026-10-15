import { lazy } from "react"
import { Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { NotFoundPage } from "@/components/NotFoundPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute, PublicOnlyRoute } from "@/features/auth/ProtectedRoute"
import { SignupPage } from "@/features/auth/SignupPage"
import { HomePage } from "@/features/search/HomePage"

const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  }))
)
const ComparePage = lazy(() =>
  import("@/features/compare/ComparePage").then((m) => ({
    default: m.ComparePage,
  }))
)
const PinsPage = lazy(() =>
  import("@/features/pins/PinsPage").then((m) => ({ default: m.PinsPage }))
)
const SavedComparisonsPage = lazy(() =>
  import("@/features/comparisons/SavedComparisonsPage").then((m) => ({
    default: m.SavedComparisonsPage,
  }))
)
const ComparisonDetailPage = lazy(() =>
  import("@/features/comparisons/ComparisonDetailPage").then((m) => ({
    default: m.ComparisonDetailPage,
  }))
)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="d/:username" element={<ProfilePage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="pins" element={<PinsPage />} />
          <Route path="comparisons" element={<SavedComparisonsPage />} />
          <Route path="comparisons/:id" element={<ComparisonDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
