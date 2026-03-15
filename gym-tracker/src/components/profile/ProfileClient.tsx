"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, User, Ruler, Save, X } from "lucide-react";
import { updateProfile } from "@/actions/user";
import { Toast } from "@/components/ui/Toast";

type ToastState = { message: string; type: "success" | "error" } | null;

interface ProfileClientProps {
  initialUsername: string | null;
  initialHeightCm: number | null;
  initialImageBase64: string | null;
  oauthImage: string | null;
  displayName: string | null;
  email: string | null;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export function ProfileClient({
  initialUsername,
  initialHeightCm,
  initialImageBase64,
  oauthImage,
  displayName,
  email,
}: ProfileClientProps) {
  const [username, setUsername] = useState(initialUsername ?? "");
  const [heightCm, setHeightCm] = useState(initialHeightCm?.toString() ?? "");
  const [imageBase64, setImageBase64] = useState<string | null>(initialImageBase64);
  const [imageError, setImageError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveImage = imageBase64 ?? oauthImage;
  const initials = (displayName ?? email ?? "U")[0].toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 2 MB.");
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    startTransition(async () => {
      const height = heightCm.trim() ? parseInt(heightCm, 10) : null;
      if (heightCm.trim() && (isNaN(height!) || height! < 50 || height! > 300)) {
        setToast({ message: "Height must be between 50 and 300 cm.", type: "error" });
        return;
      }
      const result = await updateProfile({
        username: username.trim() || null,
        heightCm: height,
        profileImageBase64: imageBase64,
      });
      if (result.success) {
        setToast({ message: "Profile saved ✓", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save.", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-md">
      {/* Avatar section */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          {effectiveImage ? (
            <img
              src={effectiveImage}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-2xl font-bold ring-2 ring-zinc-200 dark:ring-zinc-700">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors shadow"
            title="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-white">{displayName ?? email}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{email}</p>
          {imageBase64 && (
            <button
              onClick={handleRemoveImage}
              className="mt-1.5 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
              Remove photo
            </button>
          )}
          {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            <User className="h-3.5 w-3.5" />
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. john_doe"
            maxLength={30}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Letters, numbers, underscores. 2–30 characters.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            <Ruler className="h-3.5 w-3.5" />
            Height (cm) <span className="font-normal normal-case tracking-normal">— optional</span>
          </label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g. 178"
            min={50}
            max={300}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Saving…" : "Save changes"}
      </button>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
