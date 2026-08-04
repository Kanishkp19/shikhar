import { redirect } from "next/navigation";
import { AppNav } from "@/components/app/app-nav";
import { PushPermissionBanner } from "@/components/app/push-permission-banner";
import { AppProviders } from "@/components/app/app-providers";
import { ToastStateProvider, Toaster } from "@/components/ui/toaster";
import { SessionTimerBar } from "@/components/timer/session-timer-bar";

/**
 * Authenticated app shell — no login required for single-user personal deployment.
 * Owner email is read from ALLOWED_USER_EMAIL env var.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = process.env.ALLOWED_USER_EMAIL ?? "owner@shikhar.app";

  return (
    <AppProviders>
      <ToastStateProvider>
        <div className="min-h-screen bg-canvas-soft flex flex-col">
          <AppNav email={email} />
          <PushPermissionBanner />
          <main className="md:pl-60 flex-1 pb-28 md:pb-8">
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
