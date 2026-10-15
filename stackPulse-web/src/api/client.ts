const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1"

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export interface ApiResult<T, M = undefined> {
  data: T
  meta: M
}

type Query = Record<
  string,
  string | number | boolean | string[] | undefined | null
>

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: Query
  signal?: AbortSignal
  // Auth endpoints must not trigger the refresh-and-retry flow on 401.
  skipRefresh?: boolean
}

// The access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken: string | null = null
let authFailureHandler: (() => void) | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler
}

export function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) {
        accessToken = null
        return null
      }
      const body = (await res.json()) as { data: { accessToken: string } }
      accessToken = body.data.accessToken
      return accessToken
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    params.set(key, Array.isArray(value) ? value.join(",") : String(value))
  }
  const qs = params.toString()
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`
}

export async function request<T, M = undefined>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T, M>> {
  const { method = "GET", body, query, signal, skipRefresh } = options

  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  let res: Response
  try {
    res = await send()
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error
    throw new ApiError("Cannot reach the server. Check your connection.", 0)
  }

  if (res.status === 401 && !skipRefresh) {
    const token = await refreshAccessToken()
    if (token) {
      res = await send()
    } else {
      authFailureHandler?.()
    }
  }

  if (res.status === 204) return { data: undefined as T, meta: undefined as M }

  const json = (await res.json().catch(() => null)) as {
    data?: T
    meta?: M
    message?: string
    details?: unknown
  } | null

  if (!res.ok) {
    throw new ApiError(
      json?.message ?? `Request failed (${res.status})`,
      res.status,
      json?.details
    )
  }

  return { data: json?.data as T, meta: json?.meta as M }
}
