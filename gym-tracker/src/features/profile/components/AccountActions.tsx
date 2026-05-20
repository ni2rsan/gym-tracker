"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { exportMyData, deleteMyAccount } from "@/actions/user";
import { Toast } from "@/components/ui/Toast";

type ToastState = { message: string; type: "success" | "error" } | null;

export function AccountActions() {
  const [toast, setToast] = useState<ToastState>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [isExporting, startExport] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const handleExport = () => {
    startExport(async () => {
      const result = await exportMyData();
      if (!result.success || !result.data) {
        setToast({ message: result.error ?? "No data to export.", type: "error" });
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gym-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Data exported successfully.", type: "success" });
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      const result = await deleteMyAccount();
      if (!result.success) {
        setToast({ message: result.error ?? "Failed to delete account.", type: "error" });
        return;
      }
      window.location.href = "/login";
    });
  };

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      <div className="space-y-4">
        {/* Data Export */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Export your data</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Download all your data as a JSON file (GDPR Art. 20)
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>

        {/* Privacy Policy link */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Privacy Policy</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              How we handle your data
            </p>
          </div>
          <a
            href="/privacy"
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            View
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800" />

        {/* Account Deletion */}
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Permanently deactivate your account and anonymise all data
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 dark:text-red-300">
                <p className="font-medium mb-1">This action cannot be undone.</p>
                <p>
                  All your workouts, metrics, planned series, and friendships will be deactivated.
                  Your profile will be anonymised. Type <strong>DELETE</strong> to confirm.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteText !== "DELETE" || isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Confirm deletion"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                }}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
