import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/app-nav";
import { PushPermissionBanner } from "@/components/app/push-permission-banner";
import { AppProviders } from "@/components/app/app-providers";
import { ToastStateProvider, Toaster } from "@/components/ui/toaster";

/**
 * Authenticated app shell.
 * - Verifies the user is signed in AND on the allowlist (per TRD security checklist).
 * - Renders the persistent nav (left rail on desktop, bottom tab on mobile).
 * - Renders the push-permission banner (dismissible).
 */

import { SessionTimerBar } from "@/components/timer/session-timer-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = process.env.ALLOWED_USER_EMAIL;
  if (allowed && user.email?.toLowerCase() !== allowed.toLowerCase()) {
    redirect("/login?error=forbidden");
  }

  return (
    <AppProviders>
      <ToastStateProvider>
        <div className="min-h-screen bg-canvas-soft flex flex-col">
          <AppNav email={user.email!} />
          <PushPermissionBanner />
          <main className="md:pl-60 flex-1 pb-20 md:pb-8">
            <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
          </main>
          <div className="md:pl-60">
            <SessionTimerBar />
          </div>
        </div>
        <Toaster />
      </ToastStateProvider>
    </AppProviders>
  );
}
