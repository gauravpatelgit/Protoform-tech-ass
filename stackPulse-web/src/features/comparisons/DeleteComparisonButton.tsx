import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ApiError } from "@/api/client"
import { useDeleteComparison } from "@/api/comparisons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function DeleteComparisonButton({
  id,
  name,
  onDeleted,
}: {
  id: number
  name: string
  onDeleted?: () => void
}) {
  const remove = useDeleteComparison()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comparison?</AlertDialogTitle>
          <AlertDialogDescription>
            "{name}" will be removed permanently. This does not affect the
            developers themselves.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              remove.mutate(id, {
                onSuccess: () => {
                  toast.success("Comparison deleted")
                  onDeleted?.()
                },
                onError: (error) =>
                  toast.error(
                    error instanceof ApiError ? error.message : "Delete failed"
                  ),
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
