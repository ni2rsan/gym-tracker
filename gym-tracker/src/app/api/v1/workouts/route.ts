import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getWorkoutSummaryForDate, saveWorkoutSession } from "@/lib/services/workoutService";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  const workout = await getWorkoutSummaryForDate(session.user.id, date);
  return NextResponse.json(workout);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, exercises } = body;
  const result = await saveWorkoutSession(session.user.id, date, exercises);
  return NextResponse.json(result, { status: 201 });
}
