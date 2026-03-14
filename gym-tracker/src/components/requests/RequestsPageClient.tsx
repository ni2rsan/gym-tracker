"use client";

import { useState, useTransition, useRef } from "react";
import { Bug, Lightbulb, ImagePlus, X, Clock, CheckCircle2, XCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitRequest, getMyRequests } from "@/actions/requests";
import type { UserRequestItem } from "@/types";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

const STATUS_CONFIG = {
  IN_REVIEW: { label: "In Review", icon: Clock, className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle2, className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  DECLINED: { label: "Declined", icon: XCircle, className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
  DEPLOYED: { label: "Deployed", icon: Rocket, className: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
};

interface Props {
  initialRequests: UserRequestItem[];
}

export function RequestsPageClient({ initialRequests }: Props) {
  const [type, setType] = useState<"BUG" | "FEATURE">("BUG");
  const [text, setText] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [requests, setRequests] = useState<UserRequestItem[]>(initialRequests);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 2MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setScreenshot(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setFormError("Please describe the bug or feature."); return; }
    setFormError("");
    startTransition(async () => {
      const result = await submitRequest({ type, text: text.trim(), screenshotBase64: screenshot });
      if (result.success) {
        setText("");
        clearImage();
        // Reload requests
        const updated = await getMyRequests();
        if (updated.success && updated.data) setRequests(updated.data);
      } else {
        setFormError(result.error ?? "Failed to submit.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Submit form */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">Submit a Report</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("BUG")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-colors ${
                type === "BUG"
                  ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Bug className="h-4 w-4" />
              Bug Report
            </button>
            <button
              type="button"
              onClick={() => setType("FEATURE")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-colors ${
                type === "FEATURE"
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              Feature Request
            </button>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {type === "BUG" ? "Describe the bug" : "Describe the feature"}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={type === "BUG" ? "What happened? What did you expect?" : "What would you like to see added?"}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
          </div>

          {/* Screenshot */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Screenshot <span className="text-zinc-400 font-normal">(optional, max 2MB)</span>
            </label>
            {screenshot ? (
              <div className="relative inline-block">
                <img src={screenshot} alt="Preview" className="max-h-40 rounded-xl border border-zinc-200 dark:border-zinc-700 object-contain" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 w-fit cursor-pointer rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <ImagePlus className="h-4 w-4" />
                Attach screenshot
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
            )}
            {imageError && <p className="text-xs text-red-500">{imageError}</p>}
          </div>

          <Button type="submit" loading={isPending} className="w-fit">
            Send
          </Button>
        </form>
      </div>

      {/* Submissions list */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">My Submissions</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">No submissions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status];
              const StatusIcon = statusCfg.icon;
              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
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
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${statusCfg.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{req.text}</p>
                  {req.adminNote && (req.status === "DECLINED" || req.status === "DEPLOYED") && (
                    <div className="mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300">Note from admin: </span>
                      {req.adminNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
