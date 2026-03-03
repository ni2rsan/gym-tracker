"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Cloud } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { addBodyMetric } from "@/actions/metrics";
import { formatWeight, formatPct } from "@/lib/utils";

interface MetricsCardsProps {
  currentWeight: number | null;
  currentBodyFat: number | null;
  weightSource?: string | null;
  bodyFatSource?: string | null;
}

type EditField = "weight" | "bodyFat" | null;
type ToastState = { message: string; type: "success" | "error" } | null;

export function MetricsCards({ currentWeight, currentBodyFat, weightSource, bodyFatSource }: MetricsCardsProps) {
  const [editing, setEditing] = useState<EditField>(null);
  const [weightValue, setWeightValue] = useState("");
  const [bodyFatValue, setBodyFatValue] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

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
        // Reload to show updated values
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* Weight card */}
        <Card className="relative">
          <CardBody className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Weight
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
                <button
                  onClick={() => handleSave("weight")}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                  aria-label="Save weight"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {currentWeight != null ? (
                    <>
                      {Number(currentWeight).toFixed(1)}
                      <span className="text-sm font-normal text-zinc-400 ml-1">kg</span>
                    </>
                  ) : (
                    <span className="text-zinc-400 text-lg">Not set</span>
                  )}
                </p>
                {weightSource === "withings" && (
                  <span
                    title="Synced from Withings"
                    className="mb-0.5 flex items-center gap-0.5 text-xs text-emerald-500"
                  >
                    <Cloud className="h-3 w-3" />
                    Withings
                  </span>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Body Fat card */}
        <Card className="relative">
          <CardBody className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Body Fat
              </span>
              {editing !== "bodyFat" && (
                <button
                  onClick={() => {
                    setEditing("bodyFat");
                    setBodyFatValue(currentBodyFat ? String(currentBodyFat) : "");
                  }}
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
                <button
                  onClick={() => handleSave("bodyFat")}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                  aria-label="Save body fat"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {currentBodyFat != null ? (
                    <>
                      {Number(currentBodyFat).toFixed(1)}
                      <span className="text-sm font-normal text-zinc-400 ml-1">%</span>
                    </>
                  ) : (
                    <span className="text-zinc-400 text-lg">Not set</span>
                  )}
                </p>
                {bodyFatSource === "withings" && (
                  <span
                    title="Synced from Withings"
                    className="mb-0.5 flex items-center gap-0.5 text-xs text-emerald-500"
                  >
                    <Cloud className="h-3 w-3" />
                    Withings
                  </span>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
