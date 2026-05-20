"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-4xl">😵</div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
        An unexpected error occurred. You can try again or go back.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <a
          href="/workout"
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Go to Workout
        </a>
      </div>
    </div>
  );
}
