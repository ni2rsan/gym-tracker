import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getLatestBodyMetric, addBodyMetric } from "@/lib/services/metricsService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metric = await getLatestBodyMetric(session.user.id);
  return NextResponse.json(metric ?? null);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await addBodyMetric(session.user.id, body);
  return NextResponse.json(result, { status: 201 });
}
