import {
  BuildingIcon,
  ExternalLinkIcon,
  GitCompareArrowsIcon,
  LinkIcon,
  MapPinIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { useRefreshDeveloper, type DeveloperResult } from "@/api/developers"
import { ApiError } from "@/api/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber, formatRelativeTime } from "@/lib/format"

function Detail({
  icon: Icon,
  children,
}: {
  icon: typeof MapPinIcon
  children: React.ReactNode
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function ProfileHeader({ result }: { result: DeveloperResult }) {
  const { profile } = result.developer
  const { meta } = result
  const refresh = useRefreshDeveloper(profile.username)

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => toast.success("Profile refreshed"),
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Could not refresh"
        ),
    })

  const blogHref = profile.blog
    ? profile.blog.startsWith("http")
      ? profile.blog
      : `https://${profile.blog}`
    : null

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar className="size-20 sm:size-24">
        <AvatarImage src={profile.avatarUrl} alt="" />
        <AvatarFallback>
          {profile.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.name ?? profile.username}
          </h1>
          <a
            href={profile.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            @{profile.username}
            <ExternalLinkIcon className="size-3.5" />
          </a>
          {meta.stale && <Badge variant="outline">Cached data</Badge>}
        </div>

        {profile.bio && (
          <p className="max-w-2xl text-sm text-balance text-muted-foreground">
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.company && (
            <Detail icon={BuildingIcon}>{profile.company}</Detail>
          )}
          {profile.location && (
            <Detail icon={MapPinIcon}>{profile.location}</Detail>
          )}
          {blogHref && (
            <a
              href={blogHref}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              <Detail icon={LinkIcon}>{profile.blog}</Detail>
            </a>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatNumber(profile.followers)}
          </span>{" "}
          followers ·{" "}
          <span className="font-medium text-foreground">
            {formatNumber(profile.following)}
          </span>{" "}
          following
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex gap-2">
          <Button asChild>
            <Link to={`/compare?u=${profile.username}`}>
              <GitCompareArrowsIcon data-icon="inline-start" />
              Compare
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={refresh.isPending}
          >
            {refresh.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(meta.fetchedAt)}
        </p>
      </div>
    </header>
  )
}
