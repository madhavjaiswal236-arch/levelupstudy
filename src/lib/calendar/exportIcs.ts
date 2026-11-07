import { Todo } from "@/context/AppContext";

/**
 * Formats a Date object to iCalendar UTC string: YYYYMMDDTHHMMSSZ
 */
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generates an RFC 5545 compliant .ics string from scheduled study tasks.
 * Works 100% offline without any network requests, backend servers, or external APIs.
 */
export function generateIcsCalendar(todos: Todo[]): string {
  const now = new Date();
  const events = todos
    .filter((t) => !t.isDeleted && t.startTime && t.endTime)
    .map((t) => {
      const start = new Date(t.startTime!);
      const end = new Date(t.endTime!);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const uid = `levelup-${t.id}-${start.getTime()}@levelupstudy.app`;
      const summary = (t.text || "Study Session").replace(/[,;\\]/g, " ");
      const desc = `Subject: ${t.subject || "General"}\\nType: ${t.type || "Study"}${
        t.chapter ? "\\nChapter: " + t.chapter : ""
      }${t.lectureNumber ? "\\nLecture: #" + t.lectureNumber : ""}`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(now)}`,
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `CATEGORIES:${t.subject || "Study"}`,
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT10M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Upcoming: ${summary}`,
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    })
    .filter(Boolean)
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LevelUp Study//Academic Study Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:LevelUp Study Schedule",
    "X-WR-TIMEZONE:UTC",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Triggers a 100% offline download of the .ics file.
 * Native mobile devices (Android/iOS) and desktop systems will prompt to open
 * and import the schedule directly into the device's native Calendar app (Samsung Calendar,
 * Google Calendar, Apple Calendar, Outlook) with zero login or token expiry.
 */
export function downloadIcsFile(
  todos: Todo[],
  filename = "levelup-study-schedule.ics"
): boolean {
  if (typeof document === "undefined") return false;

  const scheduled = todos.filter((t) => !t.isDeleted && t.startTime && t.endTime);
  if (scheduled.length === 0) {
    return false;
  }

  const icsData = generateIcsCalendar(todos);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

