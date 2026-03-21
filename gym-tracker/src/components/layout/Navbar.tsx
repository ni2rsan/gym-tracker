"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, BarChart3, Dumbbell as DumbbellIcon, Moon, Sun, LogOut, ScrollText, CalendarDays, Shield, Inbox, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { GuideButton } from "@/components/guide/GuideButton";

// Primary nav — shown in mobile bottom tab bar and desktop top nav
const NAV_ITEMS = [
  { href: "/planner",  label: "Planner",  icon: CalendarDays },
  { href: "/workout",  label: "Tracker",  icon: Dumbbell },
  { href: "/reports",  label: "Reports",  icon: BarChart3 },
  { href: "/logs",     label: "Logs",     icon: ScrollText },
  { href: "/social",   label: "Social",   icon: Users },
];

// Secondary — desktop top nav only
const DESKTOP_EXTRA = [
  { href: "/requests", label: "Requests", icon: Inbox },
];

interface NavbarProps {
  userName?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  socialBadges?: { requests: number; feed: number; fistBumps: number };
}

function NavBadges({ href, socialBadges }: { href: string; socialBadges?: NavbarProps["socialBadges"] }) {
  if (href !== "/social") return null;
  const requestBadge = socialBadges?.requests ?? 0;
  const fistBumpBadge = socialBadges?.fistBumps ?? 0;
  const feedBadge = fistBumpBadge === 0 ? (socialBadges?.feed ?? 0) : 0;
  return (
    <>
      {requestBadge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none">
          {requestBadge > 9 ? "9+" : requestBadge}
        </span>
      )}
      {fistBumpBadge > 0 && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-zinc-900 text-[8px] font-bold leading-none">
          {fistBumpBadge > 9 ? "9+" : fistBumpBadge}
        </span>
      )}
      {feedBadge > 0 && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] font-bold leading-none">
          {feedBadge > 9 ? "9+" : feedBadge}
        </span>
      )}
    </>
  );
}

export function Navbar({ userName, userImage, isAdmin, socialBadges }: NavbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* ── Top header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/planner" className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 dark:from-slate-800 dark:via-slate-900 dark:to-zinc-950">
              <DumbbellIcon className="h-4 w-4 text-amber-400" strokeWidth={2.5} />
            </div>
            <span className="hidden sm:block">Gym Tracker</span>
          </Link>

          {/* Desktop tab navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            {[...NAV_ITEMS, ...DESKTOP_EXTRA].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                )}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  <NavBadges href={href} socialBadges={socialBadges} />
                </span>
                <span>{label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                )}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Link
              href="/requests"
              className={cn(
                "sm:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                pathname.startsWith("/requests")
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              )}
              aria-label="Requests"
            >
              <Inbox className="h-4 w-4" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "sm:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                )}
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <GuideButton />
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <Link href="/profile" title="My profile" className="shrink-0">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName ?? "User"}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700 hover:ring-emerald-400 dark:hover:ring-emerald-500 transition-all"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/30 dark:text-emerald-400 ring-2 ring-zinc-200 dark:ring-zinc-700 hover:ring-emerald-400 dark:hover:ring-emerald-500 transition-all">
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                  <NavBadges href={href} socialBadges={socialBadges} />
                </span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
