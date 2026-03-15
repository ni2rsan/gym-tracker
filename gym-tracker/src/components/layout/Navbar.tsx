"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, BarChart3, Dumbbell as DumbbellIcon, Moon, Sun, LogOut, ScrollText, CalendarDays, Shield, Inbox, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { GuideButton } from "@/components/guide/GuideButton";

const NAV_ITEMS = [
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/workout", label: "Tracker", icon: Dumbbell },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/social", label: "Social", icon: Users },
];

interface NavbarProps {
  userName?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
}

export function Navbar({ userName, userImage, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/planner" className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
            <DumbbellIcon className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="hidden sm:block">Gym Tracker</span>
        </Link>

        {/* Tab navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
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
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
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
  );
}
