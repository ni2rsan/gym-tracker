import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getExercisesForUser } from "@/lib/services/exerciseService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const exercises = await getExercisesForUser(session.user.id);
  return NextResponse.json(exercises);
}
