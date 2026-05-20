import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkoutSummaryForDate, saveWorkoutSession } from "@/server/services/workoutService";
import { createRateLimiter } from "@/server/rate-limit";

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const DateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const WorkoutPostSchema = z.object({
  date: DateParamSchema,
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      sets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          reps: z.union([z.number(), z.string()]),
          weightKg: z.union([z.number(), z.string()]),
        }),
      ),
    }),
  ),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!limiter.check(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!DateParamSchema.safeParse(date).success) {
    return NextResponse.json(
      { error: "date query parameter required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const workout = await getWorkoutSummaryForDate(session.user.id, date!);
  return NextResponse.json(workout);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!limiter.check(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = WorkoutPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout data." }, { status: 400 });
  }
  const result = await saveWorkoutSession(session.user.id, parsed.data.date, parsed.data.exercises);
  return NextResponse.json(result, { status: 201 });
}
