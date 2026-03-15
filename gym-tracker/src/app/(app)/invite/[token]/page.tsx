import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { acceptInvite } from "@/lib/services/socialService";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = await getCurrentUserId();

  const result = await acceptInvite(userId, token);

  if (!result.ok && result.error === "self") {
    redirect("/social?invite=self");
  }

  // Whether already friends or just connected — go to social
  redirect("/social?invite=accepted");
}
