"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, MessageSquare, FileText, Layers, GitFork, Newspaper, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

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
