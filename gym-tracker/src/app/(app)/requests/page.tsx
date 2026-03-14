import { getCurrentUserId, getSessionContext } from "@/lib/auth-helpers";
import { getRequestsForUser } from "@/lib/services/requestService";
import { RequestsPageClient } from "@/components/requests/RequestsPageClient";
import type { UserRequestItem } from "@/types";

export const metadata = { title: "Requests — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const [userId, ctx] = await Promise.all([getCurrentUserId(), getSessionContext()]);
  const rows = await getRequestsForUser(userId);

  const requests: UserRequestItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as UserRequestItem["type"],
    status: r.status as UserRequestItem["status"],
    text: r.text,
    screenshotBase64: r.screenshotBase64,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Report a bug or suggest a new feature. {ctx?.isAdmin && "Your submissions also appear in Admin › Requests."}
        </p>
      </div>
      <RequestsPageClient initialRequests={requests} />
    </div>
  );
}
