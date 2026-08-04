"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Loader2, AlertCircle } from "lucide-react";

/**
 * Login page — magic-link auth via Supabase.
 * Per TRD: single allowlisted email; non-allowlisted emails still receive a
 * magic link (Supabase default) but get rejected on first authenticated request.
 */
export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas-soft">
        <Card className="w-full max-w-md" elevated>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We've sent a magic link to <strong className="text-ink">{email}</strong>.
              Click it to sign in to Shikhar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="utility" onClick={() => setSent(false)} disabled={loading}>
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas-soft">
      <Card className="w-full max-w-md" elevated>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold text-title">
              श
            </div>
            <span className="text-heading-3 text-ink font-bold">Shikhar</span>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in with your email — we'll send a magic link. No password required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {error ? (
              <div className="flex items-start gap-2 text-body-sm text-accent-orange-deep bg-canvas-soft rounded-md p-3 border border-hairline">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                </>
              ) : (
                "Send magic link"
              )}
            </Button>
          </form>
          <p className="text-caption text-ink-faint text-center mt-4">
            Only the allowlisted email can access this app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
