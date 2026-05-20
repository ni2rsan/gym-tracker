export default function AppLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3"
        >
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded" />
          <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
        </div>
      ))}
    </div>
  );
}
