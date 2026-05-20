import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLatestBodyMetric, addBodyMetric } from "@/server/services/metricsService";
import { createRateLimiter } from "@/server/rate-limit";

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const MetricPostSchema = z.object({
  weightKg: z.number().min(20).max(500).nullable().optional(),
  bodyFatPct: z.number().min(1).max(80).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!limiter.check(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const metric = await getLatestBodyMetric(session.user.id);
  return NextResponse.json(metric ?? null);
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
  const parsed = MetricPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid metric data." }, { status: 400 });
  }
  const result = await addBodyMetric(session.user.id, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
