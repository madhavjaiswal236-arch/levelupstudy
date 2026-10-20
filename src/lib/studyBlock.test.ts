import { describe, it, expect } from "vitest";
import { realignTasksToStudyBlock, calculateNextAvailableStudySlot, formatLocalISO, parseDateKeySafely, sanitizeAndHealTodos } from "./studyBlock";
import { generateTodosFromRoadmap, generateRoadmap, addDaysToDate, calculateDateDiffDays } from "./backlog/engine";

describe("Study Block Realignment & Cross-Midnight 30-Day Robustness Suite", () => {
  it("safely handles parseDateKeySafely with various inputs", () => {
    const d1 = parseDateKeySafely("2026-10-20");
    expect(d1.getFullYear()).toBe(2026);
    expect(d1.getMonth()).toBe(9);
    expect(d1.getDate()).toBe(20);

    const d2 = parseDateKeySafely("2026-10-20T23:00:00.000Z");
    expect(d2.getFullYear()).toBe(2026);

    const d3 = parseDateKeySafely("invalid-date-string");
    expect(isNaN(d3.getTime())).toBe(false);

    const d4 = parseDateKeySafely(undefined);
    expect(isNaN(d4.getTime())).toBe(false);
  });

  it("formatLocalISO never outputs NaN strings", () => {
    const iso1 = formatLocalISO(new Date(NaN));
    expect(iso1).not.toContain("NaN");

    const iso2 = formatLocalISO(new Date(2026, 9, 20, 23, 15, 0));
    expect(iso2).toBe("2026-10-20T23:15:00");
  });

  it("addDaysToDate and calculateDateDiffDays handle malformed dates cleanly", () => {
    expect(addDaysToDate("2026-10-20T00:00:00.000Z", 5)).toBe("2026-10-25");
    expect(addDaysToDate("invalid", 5)).not.toContain("NaN");
    expect(calculateDateDiffDays("2026-10-20", "2026-10-25")).toBe(6);
    expect(calculateDateDiffDays("invalid", "invalid")).toBeGreaterThanOrEqual(1);
  });

  it("realigns 30 days of roadmap tasks into a cross-midnight overnight schedule (11 PM - 8 AM) without any NaN values", () => {
    const samplePlan = {
      id: "plan_30_days",
      title: "30 Day Intensive Plan",
      settings: {
        startDate: "2026-10-20",
        deadlineDate: "2026-11-18",
        studyBlockStart: "09:00",
        studyBlockEnd: "18:00",
        weekdayDailyMinutes: 300,
        weekendDailyMinutes: 360,
        targetDailyMinutes: 300,
      },
      subjects: [
        {
          id: "sub_phy",
          name: "Physics",
          chapters: Array.from({ length: 15 }).map((_, i) => ({
            id: `c_${i}`,
            name: `Physics Chapter ${i + 1}`,
            lectures: [1, 2],
            lectureDurations: [90, 90],
            practiceProblems: 20,
            estimatedMinutes: 240,
            completed: false,
          })),
        },
      ],
    };

    const roadmap = generateRoadmap(samplePlan as any);
    expect(roadmap.length).toBeGreaterThan(0);

    const todos = generateTodosFromRoadmap(roadmap, samplePlan.id, "09:00", "18:00");
    expect(todos.length).toBeGreaterThan(0);

    // Re-align across midnight (11 PM to 8 AM)
    const realigned = realignTasksToStudyBlock(todos as any, "23:00", "08:00");
    expect(realigned.length).toBe(todos.length);

    realigned.forEach((t) => {
      expect(t.startTime).toBeDefined();
      expect(t.startTime).not.toContain("NaN");
      expect(t.endTime).toBeDefined();
      expect(t.endTime).not.toContain("NaN");
      expect(isNaN(new Date(t.startTime!).getTime())).toBe(false);
      expect(isNaN(new Date(t.endTime!).getTime())).toBe(false);
    });
  });

  it("sanitizeAndHealTodos heals corrupt NaN dates from localStorage state", () => {
    const corruptTodos = [
      {
        id: "t1",
        text: "Corrupt Task 1",
        startTime: "NaN-NaN-NaNTNaN:NaN:NaN",
        endTime: "NaN-NaN-NaNTNaN:NaN:NaN",
        dateScheduled: "NaN-NaN-NaN",
      },
      {
        id: "t2",
        text: "Corrupt Task 2",
        startTime: "16:00",
        endTime: "17:30",
        dateScheduled: undefined,
      },
    ];

    const healed = sanitizeAndHealTodos(corruptTodos);
    expect(healed.length).toBe(2);

    healed.forEach((t) => {
      if (t.startTime) {
        expect(t.startTime).not.toContain("NaN");
        expect(isNaN(new Date(t.startTime).getTime())).toBe(false);
      }
      expect(t.dateScheduled).toBeDefined();
      expect(t.dateScheduled).not.toContain("NaN");
    });
  });
});
