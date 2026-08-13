"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, MessageSquare, FileText, Layers, GitFork, Newspaper, TrendingUp, Settings, PenLine, Swords, Clock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveStudyStore } from "@/lib/store/active-study-store";
import { StudyLogModal } from "@/components/app/study-log-modal";

/**
 * AppNav — persistent navigation for the authenticated shell.
 * Desktop: left rail (240px), sticky.
 * Mobile: bottom tab bar (icons only).
 *
 * Active tab uses Notion blue as the indicator per 04-DESIGN.md.
 */
const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: Calendar },
  { href: "/tutor", label: "Tutor", icon: MessageSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/mindmaps", label: "Mind Maps", icon: GitFork },
  { href: "/rival", label: "Ghost Rival", icon: Swords },
  { href: "/handwritten-notes", label: "HW Notes", icon: PenLine },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop left rail */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col md:border-r md:border-hairline md:bg-surface z-30">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-hairline">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold text-title">
            श
          </div>
          <span className="text-heading-3 text-ink font-bold tracking-tight">Shikhar</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-body-sm transition-colors",
                  active
                    ? "bg-canvas-soft text-primary font-medium"
                    : "text-ink-secondary hover:bg-canvas-soft/60 hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Active Study Time Widget */}
        <div className="border-t border-hairline p-3">
          <ActiveStudyNavWidget />
        </div>

        <div className="border-t border-hairline p-3 px-5 py-3">
          <p className="text-caption text-ink-faint truncate">{email}</p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-hairline">
        <div className="flex items-stretch w-full">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0",
                  active ? "text-primary font-medium" : "text-ink-faint",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[9px] leading-tight truncate w-full text-center px-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function ActiveStudyNavWidget() {
  const [mounted, setMounted] = useState(false);
  const { todayActiveSeconds, status, getFormattedDuration, pauseTracker, resumeTracker } =
    useActiveStudyStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = status === "active";
  const isAutoPaused = status === "paused-inactivity";

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pauseTracker();
    } else {
      resumeTracker();
    }
  };

  if (!mounted) {
    return (
      <div className="w-full p-2.5 rounded-xl border bg-canvas-soft border-hairline text-ink-muted text-left flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ink-faint shrink-0" />
          <div className="truncate">
            <p className="text-[10px] uppercase font-bold text-ink-muted leading-tight">Active Today</p>
            <p className="text-xs font-mono font-extrabold text-ink truncate">0 mins</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={cn(
          "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer group shadow-xs",
          isActive
            ? "bg-primary/5 border-primary/20 text-ink hover:bg-primary/10"
            : isAutoPaused
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900"
            : "bg-canvas-soft border-hairline text-ink-muted"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            {isActive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : isAutoPaused ? (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ink-faint"></span>
            )}
          </div>
          <div className="truncate">
            <p className="text-[10px] uppercase font-bold text-ink-muted leading-tight">
              {isActive ? "Active Today" : isAutoPaused ? "Auto-Paused" : "Paused"}
            </p>
            <p className="text-xs font-mono font-extrabold text-ink truncate">
              {getFormattedDuration(todayActiveSeconds)}
            </p>
          </div>
        </div>

        {/* Manual Pause / Play Button */}
        <button
          onClick={handleTogglePause}
          className={cn(
            "p-1.5 rounded-lg border transition-all shrink-0 flex items-center justify-center",
            isActive
              ? "bg-surface border-hairline text-ink-muted hover:text-ink hover:bg-canvas-soft"
              : "bg-primary text-on-primary border-primary hover:bg-primary-active"
          )}
          title={isActive ? "Pause Study Timer" : "Resume Study Timer"}
        >
          {isActive ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
        </button>
      </div>

      {modalOpen && <StudyLogModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
