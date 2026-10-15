// Response contract for the StackPulse REST API (/api/v1). Keep in sync with the backend plan.

export interface User {
  id: string
  email: string
}

export interface AuthPayload {
  user: User
  accessToken: string
}

export type EnrichmentStatus =
  "pending" | "running" | "ready" | "partial" | "failed"

export interface DeveloperProfile {
  username: string
  name: string | null
  avatarUrl: string
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  htmlUrl: string
  followers: number
  following: number
  publicRepos: number
  githubCreatedAt: string | null
}

export interface Repo {
  id: number
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  isFork: boolean
  isArchived: boolean
  stars: number
  forks: number
  primaryLanguage: string | null
  pushedAt: string | null
  pinned?: boolean
  pinId?: number | null
}

export interface LanguageShare {
  language: string
  percent: number
}

export interface WeeklyCommits {
  weekStart: string
  commits: number
}

export interface DeveloperMetrics {
  totalStars: number
  repoCount: number
  followers: number
  avgStarsPerRepo: number
  commits52w: number
  activeRepos90d: number
  languageCount: number
  languages: LanguageShare[]
  weeklyCommits: WeeklyCommits[]
  topRepos: Repo[]
}

export interface DeveloperMeta {
  stale: boolean
  fetchedAt: string
  sampledRepos: number
}

export interface Developer {
  profile: DeveloperProfile
  metrics: DeveloperMetrics
  enrichmentStatus: EnrichmentStatus
}

export interface RecentDeveloper {
  username: string
  avatarUrl: string
  name: string | null
}

export type RepoSort = "stars" | "pushed" | "name"

export interface Page {
  page: number
  limit: number
  total: number
}

export interface RepoListQuery {
  sort?: RepoSort
  language?: string
  includeForks?: boolean
  page?: number
  limit?: number
}

export type NumericMetric =
  | "totalStars"
  | "followers"
  | "repoCount"
  | "avgStarsPerRepo"
  | "commits52w"
  | "activeRepos90d"
  | "languageCount"

export interface CompareEntry {
  username: string
  status: "ok" | "error"
  error?: string
  profile?: DeveloperProfile
  metrics?: DeveloperMetrics
  enrichmentStatus?: EnrichmentStatus
}

export interface CompareResult {
  developers: CompareEntry[]
  leaders: Record<NumericMetric, string[]>
}

export interface PinRepo extends Repo {
  developerUsername: string
  developerAvatarUrl: string
}

export interface Pin {
  id: number
  note: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  repo: PinRepo
}

export interface PinInput {
  note?: string | null
  tags?: string[]
}

export interface PinListQuery {
  tag?: string
  developer?: string
  page?: number
  limit?: number
}

export interface SavedComparison {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  developers: RecentDeveloper[]
}

export interface SavedComparisonDetail extends SavedComparison {
  compare: CompareResult
}
