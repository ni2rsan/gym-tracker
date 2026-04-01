"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { StreakData } from "@/lib/services/plannerService";
import type { TreeState } from "@/lib/gardenUtils";
import {
  MILESTONES_LAYOUT,
  VOLUME_LAYOUT,
  SOCIAL_LAYOUT,
  SPECIALS_LAYOUT,
  MILESTONES_EDITOR_BADGES,
  VOLUME_EDITOR_BADGES,
  SOCIAL_EDITOR_BADGES,
  SPECIALS_EDITOR_BADGES,
} from "@/lib/badgeLayout";
import { StreakHero } from "./StreakHero";
import { VolumeCasketCard } from "./VolumeCasketCard";
import { SocialCard } from "./SocialCard";
import { SpecialsCard } from "./SpecialsCard";
import { ExerciseGarden } from "./ExerciseGarden";
import { MilestonesCard } from "@/components/planner/StreakCounter";
import { BadgeLayoutEditor } from "./BadgeLayoutEditor";

const NI2RSAN_ID = "cmmp9a6ad000001nmo6ypuixp";

type Section = "milestones" | "volume" | "social" | "specials";

interface ProgressPageProps {
  streakData: StreakData;
  cumulativeVolume: number;
  friendCount: number;
  fistbumpCount: number;
  userId: string;
  stardustTotal: number;
  gardenTrees: TreeState[];
}

function AdminEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

export function ProgressPage({
  streakData,
  cumulativeVolume,
  friendCount,
  fistbumpCount,
  userId,
  stardustTotal,
  gardenTrees,
}: ProgressPageProps) {
  const isAdmin = userId === NI2RSAN_ID;
  const [editorSection, setEditorSection] = useState<Section | null>(null);

  const EDITOR_DATA = {
    milestones: { badges: MILESTONES_EDITOR_BADGES, layout: MILESTONES_LAYOUT },
    volume: { badges: VOLUME_EDITOR_BADGES, layout: VOLUME_LAYOUT },
    social: { badges: SOCIAL_EDITOR_BADGES, layout: SOCIAL_LAYOUT },
    specials: { badges: SPECIALS_EDITOR_BADGES, layout: SPECIALS_LAYOUT },
  };

  return (
    <>
      {editorSection && (
        <BadgeLayoutEditor
          section={editorSection}
          badges={EDITOR_DATA[editorSection].badges}
          initialLayout={EDITOR_DATA[editorSection].layout}
          onClose={() => setEditorSection(null)}
        />
      )}

      <div className="space-y-3">
        <StreakHero
          totalTracked={streakData.totalTracked}
          totalPlanned={streakData.totalPlanned}
          totalMissed={streakData.totalMissed}
        />

        <div className="relative">
          {isAdmin && <AdminEditButton onClick={() => setEditorSection("milestones")} />}
          <MilestonesCard totalTracked={streakData.totalTracked} layout={MILESTONES_LAYOUT} />
        </div>

        <div className="relative">
          {isAdmin && <AdminEditButton onClick={() => setEditorSection("volume")} />}
          <VolumeCasketCard cumulativeVolume={cumulativeVolume} layout={VOLUME_LAYOUT} />
        </div>

        <div className="relative">
          {isAdmin && <AdminEditButton onClick={() => setEditorSection("social")} />}
          <SocialCard friendCount={friendCount} fistbumpCount={fistbumpCount} layout={SOCIAL_LAYOUT} />
        </div>

        <ExerciseGarden stardustTotal={stardustTotal} trees={gardenTrees} />

        <div className="relative">
          {isAdmin && <AdminEditButton onClick={() => setEditorSection("specials")} />}
          <SpecialsCard userId={userId} layout={SPECIALS_LAYOUT} />
        </div>
      </div>
    </>
  );
}
