import { requireAdmin } from "@/lib/auth-helpers";
import { getAllRequests } from "@/lib/services/requestService";
import { AdminRequestList } from "@/components/requests/AdminRequestList";
import type { UserRequestItem } from "@/types";

export const metadata = { title: "Manage Requests — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  await requireAdmin();
  const rows = await getAllRequests();

  const requests: UserRequestItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as UserRequestItem["type"],
    status: r.status as UserRequestItem["status"],
    text: r.text,
    screenshotBase64: r.screenshotBase64,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    userName: r.user.name ?? undefined,
    userEmail: r.user.email ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Manage Requests</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Review bug reports and feature requests from all users.
        </p>
      </div>
      <AdminRequestList initialRequests={requests} />
    </div>
  );
}
