import { useState } from "react"
import { ArchiveIcon, GitForkIcon, StarIcon } from "lucide-react"

import { useDeveloperRepos } from "@/api/developers"
import type { LanguageShare, Repo, RepoSort } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PinButton } from "@/features/pins/PinButton"
import { languageColor } from "@/lib/colors"
import { formatCompact, formatRelativeTime } from "@/lib/format"

const PAGE_SIZE = 10
const ALL_LANGUAGES = "all"

function LanguageDot({ language }: { language: string | null }) {
  if (!language) return <span className="text-muted-foreground">-</span>
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: languageColor(language) }}
      />
      {language}
    </span>
  )
}

function RepoName({ repo }: { repo: Repo }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <a
        href={repo.htmlUrl}
        target="_blank"
        rel="noreferrer"
        className="truncate font-medium hover:underline"
      >
        {repo.name}
      </a>
      {repo.isFork && (
        <Badge variant="outline">
          <GitForkIcon data-icon="inline-start" />
          Fork
        </Badge>
      )}
      {repo.isArchived && (
        <Badge variant="secondary">
          <ArchiveIcon data-icon="inline-start" />
          Archived
        </Badge>
      )}
    </div>
  )
}

function RepoCards({ repos }: { repos: Repo[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {repos.map((repo) => (
        <li key={repo.id} className="flex flex-col gap-2 rounded-xl border p-3">
          <div className="flex items-start justify-between gap-2">
            <RepoName repo={repo} />
            <PinButton repo={repo} />
          </div>
          {repo.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {repo.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <LanguageDot language={repo.primaryLanguage} />
            <span className="flex items-center gap-1">
              <StarIcon className="size-3.5" />
              {formatCompact(repo.stars)}
            </span>
            <span>Updated {formatRelativeTime(repo.pushedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RepoTable({ repos }: { repos: Repo[] }) {
  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Language</TableHead>
            <TableHead className="text-right">Stars</TableHead>
            <TableHead className="text-right">Updated</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">Pin</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repos.map((repo) => (
            <TableRow key={repo.id}>
              <TableCell className="max-w-md">
                <RepoName repo={repo} />
                {repo.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {repo.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <LanguageDot language={repo.primaryLanguage} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCompact(repo.stars)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatRelativeTime(repo.pushedAt)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <PinButton repo={repo} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function RepoList({
  username,
  languages,
}: {
  username: string
  languages: LanguageShare[]
}) {
  const [sort, setSort] = useState<RepoSort>("stars")
  const [language, setLanguage] = useState(ALL_LANGUAGES)
  const [includeForks, setIncludeForks] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isPending, isError, isPlaceholderData } = useDeveloperRepos(
    username,
    {
      sort,
      language: language === ALL_LANGUAGES ? undefined : language,
      includeForks,
      page,
      limit: PAGE_SIZE,
    }
  )

  const resetPage = () => setPage(1)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.page.total / PAGE_SIZE))
    : 1

  return (
    <section className="flex flex-col gap-4" aria-labelledby="repos-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="repos-heading" className="text-lg font-semibold">
          Repositories
          {data && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {data.page.total}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={sort}
            onValueChange={(value) => {
              if (!value) return
              setSort(value as RepoSort)
              resetPage()
            }}
            aria-label="Sort repositories"
          >
            <ToggleGroupItem value="stars">Stars</ToggleGroupItem>
            <ToggleGroupItem value="pushed">Recent</ToggleGroupItem>
            <ToggleGroupItem value="name">Name</ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={language}
            onValueChange={(value) => {
              setLanguage(value)
              resetPage()
            }}
          >
            <SelectTrigger className="w-36" aria-label="Filter by language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_LANGUAGES}>All languages</SelectItem>
                {languages.map((item) => (
                  <SelectItem key={item.language} value={item.language}>
                    {item.language}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="include-forks"
              checked={includeForks}
              onCheckedChange={(checked) => {
                setIncludeForks(checked)
                resetPage()
              }}
            />
            <Label htmlFor="include-forks">Forks</Label>
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Could not load repositories</EmptyTitle>
            <EmptyDescription>Please try again in a moment.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.repos.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No repositories found</EmptyTitle>
            <EmptyDescription>Try changing the filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className={
            isPlaceholderData ? "opacity-60 transition-opacity" : undefined
          }
        >
          <RepoCards repos={data.repos} />
          <RepoTable repos={data.repos} />
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
