"use client";

import { useState, useTransition, useEffect } from "react";
import { User, Ruler, X } from "lucide-react";
import { updateProfile } from "@/actions/user";

const DISMISSED_KEY = "gymtracker_profile_setup_dismissed";

interface ProfileSetupModalProps {
  needsSetup: boolean;
}

export function ProfileSetupModal({ needsSetup }: ProfileSetupModalProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!needsSetup) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setOpen(true);
  }, [needsSetup]);

  if (!open) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setOpen(false);
  };

  const handleSave = () => {
    setError(null);
    const trimmed = username.trim();
    if (!trimmed) { setError("Username is required."); return; }
    if (trimmed.length < 2) { setError("At least 2 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setError("Only letters, numbers, underscores."); return; }

    const height = heightCm.trim() ? parseInt(heightCm, 10) : null;
    if (heightCm.trim() && (isNaN(height!) || height! < 50 || height! > 300)) {
      setError("Height must be 50–300 cm.");
      return;
    }

    startTransition(async () => {
      const result = await updateProfile({ username: trimmed, heightCm: height });
      if (result.success) {
        localStorage.setItem(DISMISSED_KEY, "1");
        setOpen(false);
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Set up your profile</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Takes 5 seconds</p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              <User className="h-3.5 w-3.5" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              <Ruler className="h-3.5 w-3.5" />
              Height (cm){" "}
              <span className="font-normal normal-case tracking-normal text-zinc-400">— optional</span>
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 178"
              min={50}
              max={300}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
