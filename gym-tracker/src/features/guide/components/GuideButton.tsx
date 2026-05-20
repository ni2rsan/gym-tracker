"use client";

interface GuideButtonProps {
  className?: string;
}

export function GuideButton({ className }: GuideButtonProps) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent("gymtracker:open-guide"));
  }

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors font-semibold text-sm"
      }
      aria-label="Open guide"
      title="Open page guide"
    >
      ?
    </button>
  );
}
