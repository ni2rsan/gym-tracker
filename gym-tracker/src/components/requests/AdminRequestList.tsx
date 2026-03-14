"use client";

import { useState, useTransition } from "react";
import { Bug, Lightbulb, Clock, CheckCircle2, XCircle, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { updateRequestStatus } from "@/actions/requests";
import type { UserRequestItem } from "@/types";

type Tab = "ALL" | "BUG" | "FEATURE";

const STATUS_CONFIG = {
  IN_REVIEW: { label: "In Review", icon: Clock, className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle2, className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  DECLINED: { label: "Declined", icon: XCircle, className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
  DEPLOYED: { label: "Deployed", icon: Rocket, className: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
};

interface Props {
  initialRequests: UserRequestItem[];
}

export function AdminRequestList({ initialRequests }: Props) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [requests, setRequests] = useState<UserRequestItem[]>(initialRequests);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "DECLINED" | "DEPLOYED" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expandedScreenshots, setExpandedScreenshots] = useState<Set<string>>(new Set());

  const filtered = requests.filter((r) => tab === "ALL" || r.type === tab);

  function toggleScreenshot(id: string) {
    setExpandedScreenshots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function doAccept(id: string) {
    startTransition(async () => {
      const result = await updateRequestStatus({ id, status: "ACCEPTED" });
      if (result.success) {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "ACCEPTED" } : r));
      }
    });
  }

  function startNoteAction(id: string, action: "DECLINED" | "DEPLOYED") {
    setPendingAction({ id, action });
    setNoteText("");
  }

  function cancelNoteAction() {
    setPendingAction(null);
    setNoteText("");
  }

  function confirmNoteAction() {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    startTransition(async () => {
      const result = await updateRequestStatus({ id, status: action, adminNote: noteText.trim() || null });
      if (result.success) {
        setRequests((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: action, adminNote: noteText.trim() || null } : r)
        );
        setPendingAction(null);
        setNoteText("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-0">
        {(["ALL", "BUG", "FEATURE"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t === "ALL" ? `All (${requests.length})` : t === "BUG" ? `Bugs (${requests.filter(r => r.type === "BUG").length})` : `Features (${requests.filter(r => r.type === "FEATURE").length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 italic py-4">No submissions yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status];
            const StatusIcon = statusCfg.icon;
            const isNoteTarget = pendingAction?.id === req.id;
            const screenshotOpen = expandedScreenshots.has(req.id);

            return (
              <div key={req.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.type === "BUG" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        <Bug className="h-3 w-3" /> Bug
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        <Lightbulb className="h-3 w-3" /> Feature
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {req.userName ?? req.userEmail ?? "Unknown user"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${statusCfg.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Text */}
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{req.text}</p>

                {/* Screenshot toggle */}
                {req.screenshotBase64 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleScreenshot(req.id)}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {screenshotOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {screenshotOpen ? "Hide screenshot" : "Show screenshot"}
                    </button>
                    {screenshotOpen && (
                      <img
                        src={req.screenshotBase64}
                        alt="Screenshot"
                        className="mt-2 max-h-64 rounded-xl border border-zinc-200 dark:border-zinc-700 object-contain"
                      />
                    )}
                  </div>
                )}

                {/* Admin note display */}
                {req.adminNote && (
                  <div className="mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">Note: </span>
                    {req.adminNote}
                  </div>
                )}

                {/* Note action inline form */}
                {isNoteTarget && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {pendingAction.action === "DECLINED" ? "Reason for declining" : "Deployment note"}{" "}
                      <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      placeholder="Add a note for the user…"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={confirmNoteAction}
                        disabled={isPending}
                        className={`text-xs font-semibold rounded-lg px-3 py-1.5 text-white transition-colors disabled:opacity-50 ${
                          pendingAction.action === "DECLINED" ? "bg-red-500 hover:bg-red-600" : "bg-indigo-500 hover:bg-indigo-600"
                        }`}
                      >
                        {isPending ? "Saving…" : `Confirm ${pendingAction.action === "DECLINED" ? "Decline" : "Deploy"}`}
                      </button>
                      <button
                        onClick={cancelNoteAction}
                        className="text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Status action buttons */}
                {!isNoteTarget && req.status !== "DEPLOYED" && req.status !== "DECLINED" && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {req.status !== "ACCEPTED" && (
                      <button
                        onClick={() => doAccept(req.id)}
                        disabled={isPending}
                        className="text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        Accept
                      </button>
                    )}
                    <button
                      onClick={() => startNoteAction(req.id, "DEPLOYED")}
                      disabled={isPending}
                      className="text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      Deploy
                    </button>
                    <button
                      onClick={() => startNoteAction(req.id, "DECLINED")}
                      disabled={isPending}
                      className="text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
