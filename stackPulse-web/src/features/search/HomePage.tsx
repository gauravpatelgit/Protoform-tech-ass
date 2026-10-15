import { Link } from "react-router-dom"

import { useRecentDevelopers } from "@/api/developers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchBar } from "@/features/search/SearchBar"

function RecentDevelopers() {
  const { data, isPending } = useRecentDevelopers()

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-36" />
        ))}
      </div>
    )
  }

  if (!data?.length) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recently looked up
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((developer) => (
          <li key={developer.username}>
            <Link
              to={`/d/${developer.username}`}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
            >
              <Avatar>
                <AvatarImage src={developer.avatarUrl} alt="" />
                <AvatarFallback>
                  {developer.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {developer.name ?? developer.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{developer.username}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-6 text-center md:pt-12">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Know any developer at a glance
        </h1>
        <p className="text-balance text-muted-foreground">
          Look up a GitHub username to see their stars, languages and commit
          activity, then compare developers side by side.
        </p>
        <SearchBar className="mt-2" />
      </section>
      <RecentDevelopers />
    </div>
  )
}
