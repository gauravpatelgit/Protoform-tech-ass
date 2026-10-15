import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { SaveIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useCreateComparison } from "@/api/comparisons"
import { ApiError } from "@/api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const schema = z.object({
  name: z.string().trim().min(1, "Give the comparison a name").max(100),
})

type FormValues = z.infer<typeof schema>

export function SaveComparisonDialog({
  usernames,
  disabled,
}: {
  usernames: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const create = useCreateComparison()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    create.mutate(
      { name: values.name, usernames },
      {
        onSuccess: () => {
          toast.success("Comparison saved")
          setOpen(false)
          reset()
        },
        onError: (error) =>
          setFormError(
            error instanceof ApiError ? error.message : "Could not save"
          ),
      }
    )
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setFormError(null)
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <SaveIcon data-icon="inline-start" />
          Save comparison
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Save comparison</DialogTitle>
            <DialogDescription>
              Comparing {usernames.join(", ")}. Metrics stay up to date when you
              reopen it.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="comparison-name">Name</FieldLabel>
              <Input
                id="comparison-name"
                placeholder="e.g. Core maintainers"
                autoComplete="off"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
