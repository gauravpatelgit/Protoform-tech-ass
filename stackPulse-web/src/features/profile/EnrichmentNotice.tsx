import { CircleAlertIcon, InfoIcon } from "lucide-react"

import type { EnrichmentStatus } from "@/api/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"

export function EnrichmentNotice({
  status,
  sampledRepos,
}: {
  status: EnrichmentStatus
  sampledRepos: number
}) {
  if (status === "ready") return null

  if (status === "pending" || status === "running") {
    return (
      <Alert>
        <Spinner />
        <AlertTitle>Analysing repositories</AlertTitle>
        <AlertDescription>
          Languages and commit activity are being collected. This page updates
          automatically.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "partial") {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>Partial results</AlertTitle>
        <AlertDescription>
          Language and commit data cover {sampledRepos} repositories because the
          GitHub rate limit was reached. Refresh later for the full picture.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Analysis failed</AlertTitle>
      <AlertDescription>
        Languages and commit activity could not be collected. Try refreshing.
      </AlertDescription>
    </Alert>
  )
}
