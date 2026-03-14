import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { RequestType, RequestStatus } from "@/generated/prisma/client";

export async function submitRequest(
  userId: string,
  data: { type: RequestType; text: string; screenshotBase64?: string | null }
) {
  return prisma.userRequest.create({
    data: {
      userId,
      type: data.type,
      text: data.text,
      screenshotBase64: data.screenshotBase64 ?? null,
    },
  });
}

export async function getRequestsForUser(userId: string) {
  return prisma.userRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      text: true,
      screenshotBase64: true,
      adminNote: true,
      createdAt: true,
    },
  });
}

export async function getAllRequests() {
  return prisma.userRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      text: true,
      screenshotBase64: true,
      adminNote: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  adminNote?: string | null
) {
  const updated = await prisma.userRequest.update({
    where: { id },
    data: { status, adminNote: adminNote ?? null },
    include: { user: { select: { name: true, email: true } } },
  });

  if (status === RequestStatus.ACCEPTED) {
    await appendToMdFile(updated);
  }

  return updated;
}

async function appendToMdFile(request: {
  type: RequestType;
  text: string;
  screenshotBase64?: string | null;
  createdAt: Date;
  user: { name: string | null; email: string | null };
}) {
  const filePath = path.join(process.cwd(), "BUGSANDREQUESTS.md");
  const shortTitle = request.text.slice(0, 60) + (request.text.length > 60 ? "…" : "");
  const userName = request.user.name ?? request.user.email ?? "Unknown";
  const entry = [
    `\n## [${request.type}] ${shortTitle}`,
    `- **Date**: ${new Date().toISOString()}`,
    `- **From**: ${userName}${request.user.email ? ` (${request.user.email})` : ""}`,
    `- **Full text**: ${request.text}`,
    request.screenshotBase64 ? `- **Screenshot**: attached (base64, ${request.screenshotBase64.length} chars)` : null,
    `\n---\n`,
  ]
    .filter(Boolean)
    .join("\n");

  await fs.appendFile(filePath, entry, "utf8");
}
