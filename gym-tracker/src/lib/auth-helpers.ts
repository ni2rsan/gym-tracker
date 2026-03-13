import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await requireAuth();
  const realUserId = session.user.id as string;

  // Admin impersonation: if the real user is an ADMIN and has set the impersonate cookie,
  // return the target user's ID for all data operations.
  const cookieStore = await cookies();
  const impersonateCookie = cookieStore.get("gymtracker_impersonate");
  if (impersonateCookie?.value) {
    const user = await prisma.user.findUnique({
      where: { id: realUserId },
      select: { role: true },
    });
    if (user?.role === "ADMIN") {
      return impersonateCookie.value;
    }
  }

  return realUserId;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/workout");
  return session;
}

// Used by the layout to render the impersonation banner without redirecting.
export async function getSessionContext() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const cookieStore = await cookies();
  const impersonateCookie = cookieStore.get("gymtracker_impersonate");
  const isImpersonating = !!impersonateCookie?.value;

  let impersonatedUser: { name: string | null; email: string | null } | null = null;
  if (isImpersonating) {
    impersonatedUser = await prisma.user.findUnique({
      where: { id: impersonateCookie!.value },
      select: { name: true, email: true },
    });
  }

  const isAdmin = await prisma.user
    .findUnique({ where: { id: session.user.id as string }, select: { role: true } })
    .then((u) => u?.role === "ADMIN");

  return {
    realUserId: session.user.id as string,
    realUserName: session.user.name ?? null,
    realUserImage: session.user.image ?? null,
    isAdmin,
    isImpersonating,
    impersonatedUser,
  };
}
