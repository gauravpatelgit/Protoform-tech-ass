import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"

import { ApiError } from "@/api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/features/auth/auth-context"
import { Logo } from "@/components/layout/Logo"

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Use at most 72 characters"),
})

type FormValues = z.infer<typeof schema>

const COPY = {
  login: {
    title: "Welcome back",
    description: "Sign in to look up and compare developers.",
    submit: "Sign in",
    switchText: "New to StackPulse?",
    switchLink: "Create an account",
    switchTo: "/signup",
    autoComplete: "current-password",
  },
  signup: {
    title: "Create your account",
    description: "Pin repositories and save comparisons.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchTo: "/login",
    autoComplete: "new-password",
  },
} as const

export function AuthForm({ mode }: { mode: keyof typeof COPY }) {
  const copy = COPY[mode]
  const { login, signup } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await (mode === "login" ? login(values) : signup(values))
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong"
      )
    }
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Logo className="text-lg" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FieldGroup>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete={copy.autoComplete}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-4 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {copy.submit}
            </Button>
            <p className="text-sm text-muted-foreground">
              {copy.switchText}{" "}
              <Link
                to={copy.switchTo}
                className="text-foreground underline underline-offset-4"
              >
                {copy.switchLink}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
