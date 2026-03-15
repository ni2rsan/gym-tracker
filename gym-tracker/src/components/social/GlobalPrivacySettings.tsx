"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { updatePrivacySettings } from "@/actions/social";
import { Toast } from "@/components/ui/Toast";

interface Props {
  initial: {
    shareWeight: boolean;
    shareBodyFat: boolean;
    sharePRs: boolean;
  };
}

type ToastState = { message: string; type: "success" | "error" } | null;

export function GlobalPrivacySettings({ initial }: Props) {
  const [settings, setSettings] = useState(initial);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (field: keyof typeof settings) => {
    const next = { ...settings, [field]: !settings[field] };
    setSettings(next);
    startTransition(async () => {
      const result = await updatePrivacySettings(next);
      if (!result.success) {
        setSettings(settings); // revert
        setToast({ message: result.error ?? "Failed to save.", type: "error" });
      }
    });
  };

  const rows: { key: keyof typeof settings; label: string; description: string }[] = [
    { key: "shareWeight", label: "Body Weight", description: "Share your current weight with friends" },
    { key: "shareBodyFat", label: "Body Fat %", description: "Share your body fat percentage with friends" },
    { key: "sharePRs", label: "Personal Records", description: "Share your exercise PRs with friends" },
  ];

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Privacy Settings</h3>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Mandatory row */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Streaks & Achievements</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Always visible to friends</p>
            </div>
            <div className="flex h-6 w-11 items-center justify-end rounded-full bg-emerald-500 px-0.5 cursor-not-allowed opacity-60">
              <div className="h-5 w-5 rounded-full bg-white shadow" />
            </div>
          </div>

          {rows.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{description}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                disabled={isPending}
                className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${
                  settings[key]
                    ? "bg-emerald-500 justify-end"
                    : "bg-zinc-200 dark:bg-zinc-700 justify-start"
                }`}
                aria-label={`Toggle ${label}`}
              >
                <div className="h-5 w-5 rounded-full bg-white shadow transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}
