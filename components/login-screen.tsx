"use client"

import { useState } from "react"
import { Shield, LogIn, Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/store"

export function LoginScreen() {
  const { login, resetPassword, users, usersLoaded } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "reset">("login")
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)

  console.log("[v0] LoginScreen render:", { usersLoaded, usersCount: users.length })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || "Login failed.")
    }
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const match = users.find((u) => u.email.toLowerCase() === resetEmail.toLowerCase().trim())
    if (!match) {
      setError("No account found with that email address.")
      setLoading(false)
      return
    }

    const result = await resetPassword(match.id)
    if (result.success) {
      setResetSent(true)
    } else {
      setError(result.error || "Failed to reset password.")
    }
    setLoading(false)
  }

  function switchToReset() {
    setMode("reset")
    setError("")
    setResetEmail(email)
    setResetSent(false)
  }

  function switchToLogin() {
    setMode("login")
    setError("")
    setResetSent(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Shield className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">
              SSoc Governance
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Project Management Framework
            </p>
          </div>
        </div>

        <Card className="border-border/60 shadow-lg">
          {mode === "login" ? (
            <>
              <CardHeader className="pb-4 pt-6 text-center">
                <h2 className="text-base font-medium text-foreground">Sign in to your account</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@csir.co.za"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      disabled={loading}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={switchToReset}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>

                  {!usersLoaded && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Connecting...
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="mt-1 w-full gap-2" disabled={loading || !usersLoaded}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogIn className="size-4" />
                    )}
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 pt-6 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="size-5 text-primary" />
                </div>
                <h2 className="text-base font-medium text-foreground">Reset Password</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your email address and we will reset your password to the default. You will be prompted to set a new password on your next login.
                </p>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                      <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Password Reset</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Your password has been reset to the default. A confirmation has been sent to <span className="font-medium">{resetEmail}</span>. Please sign in with the default password.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={switchToLogin}>
                      <ArrowLeft className="size-4" />
                      Back to Sign in
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleReset} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium">
                        Email address
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@csir.co.za"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoFocus
                        disabled={loading}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full gap-2" disabled={loading || !usersLoaded}>
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>

                    <Button variant="ghost" type="button" className="w-full gap-2 text-muted-foreground" onClick={switchToLogin}>
                      <ArrowLeft className="size-4" />
                      Back to Sign in
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          CSIR Smart Society Division
        </p>
      </div>
    </div>
  )
}
