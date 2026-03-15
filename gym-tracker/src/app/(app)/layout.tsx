import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth-helpers";
import { Navbar } from "@/components/layout/Navbar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { MasterGuide } from "@/components/guide/MasterGuide";
import { ProfileSetupModal } from "@/components/profile/ProfileSetupModal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 overflow-x-hidden">
      {ctx.isImpersonating && ctx.impersonatedUser && (
        <ImpersonationBanner impersonatedUser={ctx.impersonatedUser} />
      )}
      <Navbar
        userName={ctx.realUserName}
        userImage={ctx.realUserImage}
        isAdmin={ctx.isAdmin}
      />
      <MasterGuide />
      <ProfileSetupModal needsSetup={ctx.needsProfileSetup} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
