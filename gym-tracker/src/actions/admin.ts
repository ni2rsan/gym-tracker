"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function listUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      profileImageBase64: true,
      heightCm: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function impersonateUser(targetUserId: string) {
  await requireAdmin();
  const cookieStore = await cookies();
  cookieStore.set("gymtracker_impersonate", targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  redirect("/workout");
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete("gymtracker_impersonate");
  redirect("/admin");
}
