import { requireAdmin } from "@/lib/auth-helpers";
import { listUsers, impersonateUser } from "@/actions/admin";
import { auth } from "@/auth";
import { Shield, Eye, Dumbbell, Inbox } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Admin — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const session = await auth();
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{users.length} registered users</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/admin/exercises"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Dumbbell className="h-4 w-4 text-blue-500" />
          Manage Exercises
        </Link>
        <Link
          href="/admin/requests"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Inbox className="h-4 w-4 text-emerald-500" />
          Manage Requests
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden md:table-cell">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((user) => {
              const isMe = user.id === session?.user?.id;
              return (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name ?? ""}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900/30 dark:text-emerald-400">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {user.name ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isMe ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">You</span>
                    ) : (
                      <form action={impersonateUser.bind(null, user.id)}>
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View as
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
