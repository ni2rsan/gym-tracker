import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workoutSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    exerciseSet: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { saveWorkoutSession, getLatestSetsForDate, getRecentWorkoutDates } from "@/lib/services/workoutService";

const mockPrisma = prisma as unknown as {
  workoutSession: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  exerciseSet: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("saveWorkoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new session when none exists for the date", async () => {
    const session = { id: "session-1", userId: "user-1", date: new Date("2025-01-01") };
    mockPrisma.workoutSession.findFirst.mockResolvedValue(null);
    mockPrisma.workoutSession.create.mockResolvedValue(session);
    mockPrisma.exerciseSet.createMany.mockResolvedValue({ count: 3 });

    const result = await saveWorkoutSession("user-1", "2025-01-01", [
      {
        exerciseId: "exercise-1",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 50 },
          { setNumber: 2, reps: 8, weightKg: 55 },
          { setNumber: 3, reps: 6, weightKg: 60 },
        ],
      },
    ]);

    expect(mockPrisma.workoutSession.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.exerciseSet.createMany).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("session-1");
  });

  it("reuses existing session for the same date (append-only)", async () => {
    const session = { id: "session-existing", userId: "user-1", date: new Date("2025-01-01") };
    mockPrisma.workoutSession.findFirst.mockResolvedValue(session);
    mockPrisma.exerciseSet.createMany.mockResolvedValue({ count: 2 });

    await saveWorkoutSession("user-1", "2025-01-01", [
      {
        exerciseId: "exercise-1",
        sets: [
          { setNumber: 1, reps: 12, weightKg: 52 },
          { setNumber: 2, reps: 10, weightKg: 57 },
        ],
      },
    ]);

    // Should NOT create a new session
    expect(mockPrisma.workoutSession.create).not.toHaveBeenCalled();
    // Should INSERT new ExerciseSet rows (append-only)
    expect(mockPrisma.exerciseSet.createMany).toHaveBeenCalledTimes(1);
  });

  it("skips sets where both reps and weight are 0", async () => {
    const session = { id: "session-1", userId: "user-1", date: new Date("2025-01-01") };
    mockPrisma.workoutSession.findFirst.mockResolvedValue(null);
    mockPrisma.workoutSession.create.mockResolvedValue(session);
    mockPrisma.exerciseSet.createMany.mockResolvedValue({ count: 1 });

    await saveWorkoutSession("user-1", "2025-01-01", [
      {
        exerciseId: "exercise-1",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 50 },
          { setNumber: 2, reps: 0, weightKg: 0 }, // empty — should be skipped
          { setNumber: 3, reps: 0, weightKg: "" }, // empty — should be skipped
        ],
      },
    ]);

    const createManyCall = mockPrisma.exerciseSet.createMany.mock.calls[0][0];
    expect(createManyCall.data).toHaveLength(1); // Only the first set
  });
});

describe("getLatestSetsForDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty object when no session exists", async () => {
    mockPrisma.workoutSession.findFirst.mockResolvedValue(null);
    const result = await getLatestSetsForDate("user-1", "2025-01-01");
    expect(result).toEqual({});
  });

  it("returns latest sets per exercise deduped by setNumber", async () => {
    mockPrisma.workoutSession.findFirst.mockResolvedValue({ id: "session-1" });

    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);

    mockPrisma.exerciseSet.findMany.mockResolvedValue([
      // Latest recorded set 1 for exercise-1
      { id: "s1-new", exerciseId: "ex-1", setNumber: 1, reps: 12, weightKg: 55, recordedAt: now },
      // Earlier recorded set 1 (should be ignored)
      { id: "s1-old", exerciseId: "ex-1", setNumber: 1, reps: 10, weightKg: 50, recordedAt: earlier },
      // Set 2
      { id: "s2", exerciseId: "ex-1", setNumber: 2, reps: 8, weightKg: 55, recordedAt: now },
    ]);

    const result = await getLatestSetsForDate("user-1", "2025-01-01");

    expect(result["ex-1"]).toHaveLength(2);
    expect(result["ex-1"][0].reps).toBe(12); // Latest set 1
  });
});
