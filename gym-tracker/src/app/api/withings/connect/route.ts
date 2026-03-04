import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAuthUrl } from "@/lib/withings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  // Generate a random state value for CSRF protection
  const state = crypto.randomUUID();

  const authUrl = buildAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  // Store state in a short-lived HttpOnly cookie to verify in the callback
  response.cookies.set("withings_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
