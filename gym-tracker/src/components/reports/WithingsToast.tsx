"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function WithingsToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"connected" | "denied" | "error" | null>(null);

  useEffect(() => {
    const withings = searchParams.get("withings");
    if (withings === "connected" || withings === "denied" || withings === "error") {
      setStatus(withings as "connected" | "denied" | "error");
      setVisible(true);
      // Remove the query param from URL without reloading
      const params = new URLSearchParams(searchParams.toString());
      params.delete("withings");
      const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
      // Auto-hide after 4s
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router, pathname]);

  if (!visible || !status) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg text-sm font-medium transition-all",
        status === "connected"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      )}
    >
      {status === "connected" ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span>
        {status === "connected"
          ? "Withings connected successfully"
          : status === "denied"
          ? "Withings access denied"
          : "Withings connection failed"}
      </span>
      <button onClick={() => setVisible(false)} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
