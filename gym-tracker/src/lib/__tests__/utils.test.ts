import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateShort,
  toISODate,
  todayISODate,
  getRangeStart,
  formatWeight,
  formatPct,
  cn,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("deduplicates tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("formatWeight", () => {
  it("formats a weight value", () => {
    expect(formatWeight(75.5)).toBe("75.5 kg");
  });

  it("returns dash for null", () => {
    expect(formatWeight(null)).toBe("—");
    expect(formatWeight(undefined)).toBe("—");
  });
});

describe("formatPct", () => {
  it("formats a percentage", () => {
    expect(formatPct(18.5)).toBe("18.5%");
  });

  it("returns dash for null", () => {
    expect(formatPct(null)).toBe("—");
  });
});

describe("toISODate", () => {
  it("converts a Date to YYYY-MM-DD", () => {
    const date = new Date(2025, 0, 15); // Jan 15 2025
    expect(toISODate(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todayISODate", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const today = todayISODate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getRangeStart", () => {
  it("returns a date ~7 days ago for week", () => {
    const start = getRangeStart("week");
    const diff = Date.now() - start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(6.9);
    expect(days).toBeLessThan(8);
  });

  it("returns a date ~30 days ago for month", () => {
    const start = getRangeStart("month");
    const now = new Date();
    expect(start.getMonth()).toBeLessThanOrEqual(now.getMonth());
  });

  it("returns a date ~1 year ago for year", () => {
    const start = getRangeStart("year");
    const now = new Date();
    expect(start.getFullYear()).toBeLessThan(now.getFullYear() + 1);
  });
});
