"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="text-4xl">😵</div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
