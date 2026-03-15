"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { sendFriendRequest } from "@/actions/social";
import { Toast } from "@/components/ui/Toast";

type ToastState = { message: string; type: "success" | "error" } | null;

export function AddFriendForm() {
  const [value, setValue] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(async () => {
      const result = await sendFriendRequest({ usernameOrEmail: value.trim() });
      if (result.success) {
        setToast({ message: "Friend request sent ✓", type: "success" });
        setValue("");
      } else {
        setToast({ message: result.error ?? "Failed to send request.", type: "error" });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Username or email address"
          className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Friend</span>
        </button>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}
