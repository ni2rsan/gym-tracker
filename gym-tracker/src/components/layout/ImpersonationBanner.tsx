import { Eye, X } from "lucide-react";
import { stopImpersonation } from "@/actions/admin";

interface ImpersonationBannerProps {
  impersonatedUser: { name: string | null; email: string | null };
}

export function ImpersonationBanner({ impersonatedUser }: ImpersonationBannerProps) {
  return (
    <div className="w-full bg-amber-400 dark:bg-amber-600 text-amber-950 dark:text-amber-50">
      <div className="mx-auto flex h-9 max-w-5xl items-center justify-between px-4 text-sm font-medium">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Viewing as <strong>{impersonatedUser.name ?? impersonatedUser.email}</strong>
            {impersonatedUser.name && impersonatedUser.email && (
              <span className="ml-1 font-normal opacity-70">({impersonatedUser.email})</span>
            )}
          </span>
        </div>
        <form action={stopImpersonation}>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-amber-950/10 hover:bg-amber-950/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
        </form>
      </div>
    </div>
  );
}
