"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth-helpers";
import { prisma } from "@/server/prisma";

const UserIdSchema = z.string().min(1);

export async function listUsers() {
  try {
    await requireAdmin();
    return await prisma.user.findMany({
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
  } catch (error) {
    console.error("listUsers error:", error);
    throw error; // Re-throw — server component error boundary handles it
  }
}

export async function impersonateUser(targetUserId: unknown) {
  const parsed = UserIdSchema.safeParse(targetUserId);
  if (!parsed.success) throw new Error("Invalid user ID.");
  try {
    await requireAdmin();
    const cookieStore = await cookies();
    cookieStore.set("gymtracker_impersonate", parsed.data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
  } catch (error) {
    console.error("impersonateUser error:", error);
    throw error;
  }
  redirect("/workout");
}

export async function stopImpersonation() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("gymtracker_impersonate");
  } catch (error) {
    console.error("stopImpersonation error:", error);
    throw error;
  }
  redirect("/admin");
}
