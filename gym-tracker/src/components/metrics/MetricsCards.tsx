"use client";

import { useState, useTransition, useEffect } from "react";
import { Pencil, Check, X, Cloud, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { addBodyMetric, revertToWithings } from "@/actions/metrics";

const FFMI_TIERS = [
  { max: 18,       label: "Below average",    textColor: "text-zinc-500 dark:text-zinc-400", dotColor: "bg-zinc-400" },
  { max: 20,       label: "Average",          textColor: "text-blue-500",                    dotColor: "bg-blue-400" },
  { max: 22,       label: "Above average",    textColor: "text-sky-500",                     dotColor: "bg-sky-400" },
  { max: 24,       label: "Trained",          textColor: "text-emerald-500",                 dotColor: "bg-emerald-500" },
  { max: 26,       label: "Very trained",     textColor: "text-indigo-500",                  dotColor: "bg-indigo-500" },
  { max: Infinity, label: "Elite / Enhanced", textColor: "text-purple-500",                  dotColor: "bg-purple-500" },
] as const;

function getFFMITier(ffmi: number) {
  return FFMI_TIERS.find((t) => ffmi < t.max) ?? FFMI_TIERS[FFMI_TIERS.length - 1];
}

function calcFFMI(weightKg: number, bodyFatPct: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return (weightKg * (1 - bodyFatPct / 100)) / (heightM * heightM);
}

interface MetricsCardsProps {
  currentWeight: number | null;
  currentBodyFat: number | null;
  currentFatMassKg: number | null;
  currentMuscleMassKg: number | null;
  weightSource?: string | null;
  bodyFatSource?: string | null;
  withingsWeight?: number | null;
  withingsBodyFat?: number | null;
  rangeAgoWeight: number | null;
  rangeAgoBodyFat: number | null;
  rangeAgoFatMassKg: number | null;
  rangeAgoMuscleMassKg: number | null;
  rangeLabel: string;
  isWithingsConnected: boolean;
  heightCm: number | null;
}

type EditField = "weight" | "bodyFat" | null;
type ToastState = { message: string; type: "success" | "error" } | null;

function Trend({ current, previous, unit, rangeLabel }: { current: number | null; previous: number | null; unit: string; rangeLabel: string }) {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return null;
  const isUp = delta > 0;
  const sign = isUp ? "+" : "";
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-blue-500" : "text-orange-500"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {sign}{delta.toFixed(1)} {unit}
      <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-0.5">{rangeLabel}</span>
    </span>
  );
}

export function MetricsCards({
  currentWeight,
  currentBodyFat,
  currentFatMassKg,
  currentMuscleMassKg,
  weightSource,
  bodyFatSource,
  withingsWeight,
  withingsBodyFat,
  rangeAgoWeight,
  rangeAgoBodyFat,
  rangeAgoFatMassKg,
  rangeAgoMuscleMassKg,
  rangeLabel,
  isWithingsConnected,
  heightCm,
}: MetricsCardsProps) {
  const [editing, setEditing] = useState<EditField>(null);
  const [weightValue, setWeightValue] = useState("");
  const [bodyFatValue, setBodyFatValue] = useState("");
  const [showBodyFat, setShowBodyFat] = useState(false);
  const [showFFMI, setShowFFMI] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setShowFFMI(localStorage.getItem("gymtracker_show_ffmi") === "1");
  }, []);

  const toggleFFMI = (v: boolean) => {
    setShowFFMI(v);
    localStorage.setItem("gymtracker_show_ffmi", v ? "1" : "0");
  };

  const ffmi =
    currentWeight != null && currentBodyFat != null && heightCm != null
      ? calcFFMI(currentWeight, currentBodyFat, heightCm)
      : null;

  const ffmiTier = ffmi != null ? getFFMITier(ffmi) : null;

  const handleSave = (field: EditField) => {
    const data =
      field === "weight"
        ? { weightKg: weightValue }
        : { bodyFatPct: bodyFatValue };

    startTransition(async () => {
      const result = await addBodyMetric(data);
      if (result.success) {
        setToast({ message: `${field === "weight" ? "Weight" : "Body fat"} updated ✓`, type: "success" });
        setEditing(null);
        setWeightValue("");
        setBodyFatValue("");
        window.location.reload();
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setWeightValue("");
    setBodyFatValue("");
  };

  const handleRevertToWithings = () => {
    startTransition(async () => {
      const result = await revertToWithings();
      if (result.success) {
        setToast({ message: "Reverted to last Withings sync ✓", type: "success" });
        window.location.reload();
      } else {
        setToast({ message: result.error ?? "Failed to revert", type: "error" });
      }
    });
  };

  const openWeightEdit = () => {
    setEditing("weight");
    setWeightValue(currentWeight ? String(currentWeight) : "");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 items-stretch">
        {/* Left: Body Weight */}
        <Card className="relative h-full">
          <CardBody className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Body Weight
              </span>
              {editing !== "weight" && (
                <button
                  onClick={() => {
                    setEditing("weight");
                    setWeightValue(currentWeight ? String(currentWeight) : "");
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Edit weight"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {editing === "weight" ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="kg"
                  className="flex-1 h-8 rounded-lg border border-emerald-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-emerald-600 dark:bg-zinc-800 dark:text-white"
                  autoFocus
                  step="0.1"
                />
                <button onClick={() => handleSave("weight")} disabled={isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50" aria-label="Save weight">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleCancel} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300" aria-label="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-end gap-2 flex-wrap">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {currentWeight != null ? (
                      <>{Number(currentWeight).toFixed(1)}<span className="text-sm font-normal text-zinc-400 ml-1">kg</span></>
                    ) : (
                      <span className="text-zinc-400 text-lg">Not set</span>
                    )}
                  </p>
                  {weightSource === "withings" && (
                    <span title="Synced from Withings" className="mb-0.5 flex items-center gap-0.5 text-xs text-emerald-500">
                      <Cloud className="h-3 w-3" />Withings
                    </span>
                  )}
                </div>
                <Trend current={currentWeight} previous={rangeAgoWeight} unit="kg" rangeLabel={rangeLabel} />
                {weightSource !== "withings" && withingsWeight != null && (
                  <button onClick={handleRevertToWithings} disabled={isPending} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-500 transition-colors disabled:opacity-50 w-fit mt-1">
                    <RotateCcw className="h-3 w-3" />
                    Revert to Withings ({withingsWeight.toFixed(1)} kg)
                  </button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right: Body fat panel */}
        {isWithingsConnected ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            {/* Top: Body Fat (%) */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Body Fat (%)
                </span>
                {bodyFatSource === "withings" && (
                  <span title="Synced from Withings" className="flex items-center gap-0.5 text-xs text-emerald-500">
                    <Cloud className="h-3 w-3" />Withings
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {currentBodyFat != null ? (
                    <>{Number(currentBodyFat).toFixed(1)}<span className="text-sm font-normal text-zinc-400 ml-0.5">%</span></>
                  ) : (
                    <span className="text-zinc-400 text-lg">—</span>
                  )}
                </p>
                <Trend current={currentBodyFat} previous={rangeAgoBodyFat} unit="%" rangeLabel={rangeLabel} />
              </div>
            </div>

            {/* Bottom: Fat kg | Muscle kg */}
            <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
              <div className="px-4 py-3 flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Body Fat (kg)
                </span>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {currentFatMassKg != null ? (
                    <>{Number(currentFatMassKg).toFixed(1)}<span className="text-xs font-normal text-zinc-400 ml-0.5">kg</span></>
                  ) : (
                    <span className="text-zinc-400 text-base">—</span>
                  )}
                </p>
                <Trend current={currentFatMassKg} previous={rangeAgoFatMassKg} unit="kg" rangeLabel={rangeLabel} />
              </div>
              <div className="px-4 py-3 flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Muscle (kg)
                </span>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {currentMuscleMassKg != null ? (
                    <>{Number(currentMuscleMassKg).toFixed(1)}<span className="text-xs font-normal text-zinc-400 ml-0.5">kg</span></>
                  ) : (
                    <span className="text-zinc-400 text-base">—</span>
                  )}
                </p>
                <Trend current={currentMuscleMassKg} previous={rangeAgoMuscleMassKg} unit="kg" rangeLabel={rangeLabel} />
              </div>
            </div>
          </div>
        ) : (
          /* Not connected: toggle for body fat tracking */
          <div className="flex flex-col gap-3 h-full">
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBodyFat}
                  onChange={(e) => { setShowBodyFat(e.target.checked); setEditing(null); }}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Track body fat %</span>
              </label>
            </div>

            {showBodyFat && (
              <Card className="relative flex-1">
                <CardBody className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Body Fat (%)
                    </span>
                    {editing !== "bodyFat" && (
                      <button
                        onClick={() => { setEditing("bodyFat"); setBodyFatValue(currentBodyFat ? String(currentBodyFat) : ""); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        aria-label="Edit body fat"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {editing === "bodyFat" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={bodyFatValue}
                        onChange={(e) => setBodyFatValue(e.target.value)}
                        placeholder="%"
                        className="flex-1 h-8 rounded-lg border border-emerald-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-emerald-600 dark:bg-zinc-800 dark:text-white"
                        autoFocus
                        step="0.1"
                        min="1"
                        max="70"
                      />
                      <button onClick={() => handleSave("bodyFat")} disabled={isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50" aria-label="Save body fat">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={handleCancel} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300" aria-label="Cancel">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {currentBodyFat != null ? (
                          <>{Number(currentBodyFat).toFixed(1)}<span className="text-sm font-normal text-zinc-400 ml-0.5">%</span></>
                        ) : (
                          <span className="text-zinc-400 text-lg">Not set</span>
                        )}
                      </p>
                      <Trend current={currentBodyFat} previous={rangeAgoBodyFat} unit="%" rangeLabel={rangeLabel} />
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* FFMI toggle */}
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showFFMI}
            onChange={(e) => toggleFFMI(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Show FFMI</span>
        </label>
      </div>

      {/* FFMI card */}
      {showFFMI && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                FFMI
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Fat-Free Mass Index</span>
            </div>

            {/* Value or missing-data prompts */}
            {ffmi != null && ffmiTier != null ? (
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {ffmi.toFixed(1)}
                </p>
                <span className={`mb-1 text-base font-semibold ${ffmiTier.textColor}`}>
                  {ffmiTier.label}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentWeight == null && (
                  <button
                    onClick={openWeightEdit}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Input weight
                  </button>
                )}
                {heightCm == null && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Input height
                  </Link>
                )}
                {currentWeight != null && heightCm != null && currentBodyFat == null && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Body fat % required — connect Withings or enable tracking above
                  </span>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              {FFMI_TIERS.map((tier, i) => {
                const prevMax = i === 0 ? null : FFMI_TIERS[i - 1].max;
                const rangeLabel =
                  tier.max === Infinity
                    ? `> ${prevMax}`
                    : prevMax == null
                    ? `< ${tier.max}`
                    : `${prevMax}–${tier.max}`;
                const isActive = ffmiTier?.label === tier.label;
                return (
                  <span
                    key={tier.label}
                    className={`flex items-center gap-1.5 text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-50"}`}
                  >
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${tier.dotColor}`} />
                    <span className="text-zinc-400 dark:text-zinc-500 tabular-nums">{rangeLabel}</span>
                    <span className={`font-medium ${tier.textColor}`}>{tier.label}</span>
                  </span>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
