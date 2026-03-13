import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCode } from "@/lib/withings";
import { storeWithingsConnection } from "@/lib/services/withingsService";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(`${BASE_URL}/reports?withings=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/reports?withings=error`);
  }

  // Verify CSRF state
  const storedState = req.cookies.get("withings_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/reports?withings=error`);
  }

  try {
    const tokens = await exchangeCode(code);
    await storeWithingsConnection(session.user.id, tokens);
  } catch (err) {
    console.error("Withings OAuth callback error:", err);
    return NextResponse.redirect(`${BASE_URL}/reports?withings=error`);
  }

  const response = NextResponse.redirect(`${BASE_URL}/reports?withings=connected`);

  // Clear the state cookie
  response.cookies.set("withings_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
}
