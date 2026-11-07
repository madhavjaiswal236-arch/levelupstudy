import { describe, it, expect } from "vitest";
import { generateIcsCalendar } from "./exportIcs";
import { Todo } from "@/context/AppContext";

describe("Offline Calendar .ics Generator", () => {
  it("generates an RFC 5545 compliant VCALENDAR string from scheduled todos", () => {
    const mockTodos: Todo[] = [
      {
        id: "task-1",
        text: "Physics: Rotational Dynamics Lec 1",
        subject: "Physics",
        type: "Lecture",
        chapter: "Rotational Dynamics",
        lectureNumber: 1,
        startTime: "2026-11-08T09:00:00.000Z",
        endTime: "2026-11-08T10:45:00.000Z",
        completed: false,
        xpReward: 30,
      },
      {
        id: "task-2",
        text: "Chemistry: Electrochemistry DPP",
        subject: "Chemistry",
        type: "DPP",
        startTime: "2026-11-08T11:00:00.000Z",
        endTime: "2026-11-08T12:00:00.000Z",
        completed: false,
        xpReward: 20,
      },
      {
        id: "task-deleted",
        text: "Deleted task",
        type: "Custom",
        startTime: "2026-11-08T14:00:00.000Z",
        endTime: "2026-11-08T15:00:00.000Z",
        isDeleted: true,
        completed: false,
        xpReward: 10,
      },
    ];

    const ics = generateIcsCalendar(mockTodos);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//LevelUp Study//Academic Study Schedule//EN");
    expect(ics).toContain("SUMMARY:Physics: Rotational Dynamics Lec 1");
    expect(ics).toContain("DTSTART:20261108T090000Z");
    expect(ics).toContain("DTEND:20261108T104500Z");
    expect(ics).toContain("CATEGORIES:Physics");
    expect(ics).toContain("BEGIN:VALARM"); // 10-minute alarm notification

    expect(ics).toContain("SUMMARY:Chemistry: Electrochemistry DPP");
    expect(ics).not.toContain("Deleted task");
  });

  it("handles empty or unscheduled tasks gracefully", () => {
    const emptyTodos: Todo[] = [
      {
        id: "task-unscheduled",
        text: "No start/end time",
        type: "Custom",
        completed: false,
        xpReward: 10,
      },
    ];

    const ics = generateIcsCalendar(emptyTodos);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
