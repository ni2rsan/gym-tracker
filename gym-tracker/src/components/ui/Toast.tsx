"use client";

import { CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium min-w-64 max-w-sm",
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      )}
      role="status"
      aria-live="polite"
    >
      {type === "success" ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="flex h-5 w-5 items-center justify-center rounded opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
