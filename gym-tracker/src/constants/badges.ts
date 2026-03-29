// Badge definitions — client-safe (no Prisma imports)

export type BadgeRarity = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type BadgeCategory = "streak" | "consistency" | "strength" | "volume" | "special";

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string; // emoji
}

export interface UserBadge extends BadgeDef {
  unlocked: boolean;
  progress?: number; // 0-1 for progress toward unlock
  progressLabel?: string; // e.g. "7 / 10"
}

// ─── Badge catalog ──────────────────────────────────────────────────────────

export const BADGE_CATALOG: BadgeDef[] = [
  // Streak
  { key: "streak_10", name: "10-Tage-Streak", description: "10 Tage Streak erreicht", category: "streak", rarity: "bronze", icon: "🥉" },
  { key: "streak_30", name: "30-Tage-Streak", description: "30 Tage Streak erreicht", category: "streak", rarity: "silver", icon: "🥈" },
  { key: "streak_50", name: "50-Tage-Streak", description: "50 Tage Streak erreicht", category: "streak", rarity: "gold", icon: "🥇" },
  { key: "streak_75", name: "75-Tage-Streak", description: "75 Tage Streak erreicht", category: "streak", rarity: "platinum", icon: "💎" },
  { key: "streak_100", name: "100-Tage-Streak", description: "100 Tage Streak erreicht", category: "streak", rarity: "diamond", icon: "👑" },

  // Consistency
  { key: "first_steps", name: "Erste Schritte", description: "3 Workouts in einer Woche", category: "consistency", rarity: "bronze", icon: "👟" },
  { key: "week_warrior", name: "Wochenkrieger", description: "4+ Workouts/Woche, 2 Wochen in Folge", category: "consistency", rarity: "silver", icon: "⚔️" },
  { key: "month_machine", name: "Monatsmaschine", description: "90%+ Konsistenz über 30 Tage", category: "consistency", rarity: "gold", icon: "⚙️" },

  // Strength
  { key: "first_20kg", name: "Erste 20kg", description: "Eine Übung mit 20+ kg geschafft", category: "strength", rarity: "bronze", icon: "💪" },
  { key: "half_zentner", name: "Halbe Zentnerlast", description: "Eine Übung mit 50+ kg geschafft", category: "strength", rarity: "silver", icon: "🏋️" },
  { key: "zentner", name: "Zentnerlast", description: "Eine Übung mit 100+ kg geschafft", category: "strength", rarity: "gold", icon: "🔥" },

  // Volume
  { key: "vol_1t", name: "Erste Tonne", description: "1.000 kg Gesamtvolumen bewegt", category: "volume", rarity: "bronze", icon: "📦" },
  { key: "vol_10t", name: "10-Tonnen-Club", description: "10.000 kg Gesamtvolumen bewegt", category: "volume", rarity: "silver", icon: "🏗️" },
  { key: "vol_100t", name: "100-Tonnen-Titan", description: "100.000 kg Gesamtvolumen bewegt", category: "volume", rarity: "gold", icon: "🗿" },

  // Special
  { key: "club_100", name: "100er Club", description: "100 Workouts insgesamt", category: "special", rarity: "gold", icon: "💯" },
  { key: "comeback", name: "Zurück im Spiel", description: "Workout nach 14+ Tagen Pause", category: "special", rarity: "bronze", icon: "🔄" },
  { key: "allrounder", name: "Allrounder", description: "Alle 3 Muskelgruppen in einer Woche", category: "special", rarity: "bronze", icon: "🎯" },
];

export const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; text: string }> = {
  bronze:   { bg: "bg-orange-100 dark:bg-orange-900/20", border: "border-orange-300 dark:border-orange-700", text: "text-orange-600 dark:text-orange-400" },
  silver:   { bg: "bg-zinc-100 dark:bg-zinc-800",        border: "border-zinc-300 dark:border-zinc-600",     text: "text-zinc-500 dark:text-zinc-400" },
  gold:     { bg: "bg-amber-100 dark:bg-amber-900/20",   border: "border-amber-300 dark:border-amber-700",   text: "text-amber-600 dark:text-amber-400" },
  platinum: { bg: "bg-cyan-100 dark:bg-cyan-900/20",     border: "border-cyan-300 dark:border-cyan-700",     text: "text-cyan-600 dark:text-cyan-400" },
  diamond:  { bg: "bg-violet-100 dark:bg-violet-900/20", border: "border-violet-300 dark:border-violet-700", text: "text-violet-600 dark:text-violet-400" },
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  streak: "Streak",
  consistency: "Consistency",
  strength: "Strength",
  volume: "Volume",
  special: "Special",
};
