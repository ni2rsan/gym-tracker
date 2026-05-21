import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    friendship: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    workoutSession: { count: vi.fn() },
    workoutFistBump: { count: vi.fn() },
  },
}));

import { prisma } from "@/server/prisma";
import { sendFriendRequest, getSocialStats } from "@/server/services/socialService";

const mockPrisma = prisma as unknown as {
  user: { findFirst: ReturnType<typeof vi.fn> };
  friendship: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  workoutSession: { count: ReturnType<typeof vi.fn> };
  workoutFistBump: { count: ReturnType<typeof vi.fn> };
};

describe("sendFriendRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when target user not found", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const result = await sendFriendRequest("user-1", "nonexistent@test.com");
    expect(result).toEqual({ success: false, error: "User not found." });
  });

  it("returns error when adding yourself", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1" });
    const result = await sendFriendRequest("user-1", "myself@test.com");
    expect(result).toEqual({ success: false, error: "You can't add yourself." });
  });

  it("returns error when already friends", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    mockPrisma.friendship.findFirst.mockResolvedValue({
      id: "f-1",
      senderId: "user-1",
      receiverId: "user-2",
      status: "ACCEPTED",
    });
    const result = await sendFriendRequest("user-1", "friend@test.com");
    expect(result).toEqual({ success: false, error: "Already friends." });
  });

  it("returns error when request already pending", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    mockPrisma.friendship.findFirst.mockResolvedValue({
      id: "f-1",
      senderId: "user-1",
      receiverId: "user-2",
      status: "PENDING",
    });
    const result = await sendFriendRequest("user-1", "friend@test.com");
    expect(result).toEqual({ success: false, error: "Request already sent." });
  });

  it("creates new friendship when no existing relationship", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    mockPrisma.friendship.findFirst.mockResolvedValue(null);
    mockPrisma.friendship.create.mockResolvedValue({});

    const result = await sendFriendRequest("user-1", "newuser@test.com");

    expect(result).toEqual({ success: true });
    expect(mockPrisma.friendship.create).toHaveBeenCalledWith({
      data: { senderId: "user-1", receiverId: "user-2" },
    });
  });

  it("soft-deletes declined friendship and creates new one", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    mockPrisma.friendship.findFirst.mockResolvedValue({
      id: "f-old",
      senderId: "user-1",
      receiverId: "user-2",
      status: "DECLINED",
    });
    mockPrisma.friendship.update.mockResolvedValue({});
    mockPrisma.friendship.create.mockResolvedValue({});

    const result = await sendFriendRequest("user-1", "declined@test.com");

    expect(result).toEqual({ success: true });
    expect(mockPrisma.friendship.update).toHaveBeenCalledWith({
      where: { id: "f-old" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockPrisma.friendship.create).toHaveBeenCalled();
  });
});

describe("getSocialStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns counts from all three queries", async () => {
    mockPrisma.workoutFistBump.count.mockResolvedValue(5);
    mockPrisma.workoutSession.count.mockResolvedValue(42);
    mockPrisma.friendship.count.mockResolvedValue(3);

    const result = await getSocialStats("user-1");

    expect(result).toEqual({
      totalFistBumpsReceived: 5,
      totalWorkoutsTracked: 42,
      friendCount: 3,
    });
  });

  it("filters fist bumps by non-deleted sessions", async () => {
    mockPrisma.workoutFistBump.count.mockResolvedValue(0);
    mockPrisma.workoutSession.count.mockResolvedValue(0);
    mockPrisma.friendship.count.mockResolvedValue(0);

    await getSocialStats("user-1");

    // Verify the fist bump query includes deletedAt: null on the session
    const fistBumpCall = mockPrisma.workoutFistBump.count.mock.calls[0][0];
    expect(fistBumpCall.where.session).toEqual(
      expect.objectContaining({ deletedAt: null }),
    );
  });
});
