import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Zap,
  AlertCircle,
  Atom,
  Beaker,
  Sigma,
  Check,
  ArrowRight,
  Menu,
} from "lucide-react";
import {
  getAccessToken,
  getAccessTokenSync,
  googleSignIn,
  refreshGoogleToken,
  auth,
} from "../lib/firebase";
import { useAppContext, Todo } from "../context/AppContext";
import {
  rescheduleCalendarEvents,
  createCalendarEvent,
  updateCalendarEventTime,
  deleteCalendarEvent,
  markCalendarEventCompleted,
  fetchGoogleCalendarEvents,
} from "../lib/calendar";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  startOfDay,
  getDay,
  endOfMonth,
  startOfMonth,
  parseISO,
  addMonths,
} from "date-fns";
import { predictNextLecture } from "../lib/utils";

const COLORS: Record<string, string> = {
  Physics:
    "bg-indigo-100 border border-indigo-300 text-indigo-900 shadow-sm dark:border-indigo-500/50 dark:text-indigo-200 dark:bg-indigo-900/60 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all duration-300",
  Chemistry:
    "bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:text-emerald-200 dark:bg-emerald-900/60 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 dark:hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all duration-300",
  Mathematics:
    "bg-amber-100 border border-amber-300 text-amber-900 shadow-sm dark:border-amber-500/50 dark:text-amber-200 dark:bg-amber-900/60 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/30 dark:hover:shadow-amber-500/50 hover:scale-[1.02] transition-all duration-300",
  Personal:
    "bg-rose-100 border border-rose-300 text-rose-900 shadow-sm dark:border-rose-500/50 dark:text-rose-200 dark:bg-rose-900/60 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/30 dark:hover:shadow-rose-500/50 hover:scale-[1.02] transition-all duration-300",
  "Google Calendar":
    "bg-sky-100 border border-sky-400 text-sky-900 shadow-sm dark:border-sky-500/50 dark:text-sky-200 dark:bg-sky-900/60 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] transition-all duration-300",
  Default:
    "bg-slate-100 border border-slate-300 text-slate-900 shadow-sm dark:border-slate-500/50 dark:text-slate-200 dark:bg-slate-800/60 hover:border-slate-500 hover:shadow-lg hover:shadow-slate-500/30 dark:hover:shadow-slate-500/50 hover:scale-[1.02] transition-all duration-300",
};

export function StudyCalendar({
  onClose,
  dailyXpRequired = 100,
  onToggleTodo,
}: {
  onClose?: () => void;
  dailyXpRequired?: number;
  onToggleTodo?: (id: any) => void;
}) {
  const {
    todos,
    setTodos,
    notifyCalendarMutation,
    syllabus,
    xpGainedToday,
    dailyTarget,
    hoursStudiedToday,
    totalXpGoal,
    class11EndDate,
    xp,
    history,
    getCurrentChapterForSubject,
    notifyCalendarPreviewOpened,
    notifyCalendarPreviewClosed,
  } = useAppContext();

  useEffect(() => {
    notifyCalendarPreviewOpened?.();
    return () => {
      notifyCalendarPreviewClosed?.();
    };
  }, [notifyCalendarPreviewOpened, notifyCalendarPreviewClosed]);

  const setCalendarTodos = useCallback<typeof setTodos>(
    (action) => {
      notifyCalendarMutation?.();
      return setTodos(action);
    },
    [notifyCalendarMutation, setTodos],
  );

  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  const [toastMessage, setToastMessage] = useState("");

  const [currentLocalTime, setCurrentLocalTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentLocalTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [toastType, setToastType] = useState<"success" | "info" | "error">(
    "info",
  );

  const showToast = (
    msg: string,
    type: "success" | "info" | "error" = "info",
  ) => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 5000);
  };

  const [activeCalendars, setActiveCalendars] = useState<string[]>([
    "Physics",
    "Chemistry",
    "Mathematics",
    "Personal",
    "General",
    "Google Calendar",
  ]);
  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  const [view, setView] = useState<"Day" | "3 Days" | "Week" | "Month">("Day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const dragInitialScroll = useRef(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const hasMovedRef = useRef(false);
  const justDraggedRef = useRef(false);
  const visualSelectionRef = useRef<HTMLDivElement | null>(null);

  // Computed Days
  useEffect(() => {
    let isMounted = true;
    const sync = async () => {
      try {
        const events = await fetchGoogleCalendarEvents(
          addDays(new Date(), -14),
          addDays(new Date(), 30),
        );
        if (!isMounted) return;
        if (events && events.length > 0) {
          setGoogleEvents(events);
        }

        setTodos((prev) => {
          let updated = false;
          const next = prev.map((t) => {
            if (t.calendarEventId) {
              const match = events.find((e: any) => e.id === t.calendarEventId);
              if (match && match.start?.dateTime && match.end?.dateTime) {
                const mStart = new Date(match.start.dateTime).toISOString();
                const mEnd = new Date(match.end.dateTime).toISOString();
                if (t.startTime !== mStart || t.endTime !== mEnd) {
                  updated = true;
                  return { ...t, startTime: mStart, endTime: mEnd };
                }
              }
            }
            return t;
          });
          return updated ? next : prev;
        });
      } catch (err) {
        console.error("Failed to background sync calendar", err);
      }
    };

    sync();
    const interval = setInterval(sync, 15000); // Poll every 15 seconds while calendar is open
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setTodos]);

  const visibleDays = useMemo(() => {
    if (view === "Day") return [startOfDay(currentDate)];
    if (view === "3 Days") {
      const today = startOfDay(currentDate);
      return [today, addDays(today, 1), addDays(today, 2)];
    }
    if (view === "Week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }
    // Month view handled separately
    return [];
  }, [view, currentDate]);

  const scheduledEvents = useMemo(() => {
    const localEvents = todos
      .filter((t) => activeCalendars.includes(t.subject || "General"))
      .filter((t) => t.startTime && t.endTime)
      .map((t) => {
        const start = new Date(t.startTime as string);
        const end = new Date(t.endTime as string);
        return {
          id: t.id,
          title: t.text,
          subject: t.subject || "Default",
          calendarEventId: t.calendarEventId,
          start,
          end,
          completed: t.completed,
          todo: t,
        };
      });

    const externalGoogleEvents = googleEvents
      .filter((g) => !todos.some((t) => t.calendarEventId === g.id))
      .filter((g) => g.start?.dateTime && g.end?.dateTime)
      .map((g) => {
        return {
          id: `gcal-${g.id}`,
          title: g.summary || "(Google Event)",
          subject: "Google Calendar",
          calendarEventId: g.id,
          start: new Date(g.start.dateTime),
          end: new Date(g.end.dateTime),
          completed: g.summary?.startsWith("[Done]"),
          isExternalGoogleEvent: true,
          htmlLink: g.htmlLink,
        };
      });

    return [...localEvents, ...externalGoogleEvents];
  }, [todos, activeCalendars, googleEvents]);

  const unscheduledTasks = useMemo(() => {
    return todos
      .filter((t) => t.subject !== "Personal")
      .filter((t) => activeCalendars.includes(t.subject || "General"))
      .filter((t) => !t.startTime || !t.endTime)
      .filter((t) => !t.completed);
  }, [todos, activeCalendars]);

  const handlePrev = () => {
    if (view === "Day") setCurrentDate((prev) => addDays(prev, -1));
    else if (view === "3 Days") setCurrentDate((prev) => addDays(prev, -3));
    else if (view === "Week") setCurrentDate((prev) => addDays(prev, -7));
    else if (view === "Month") setCurrentDate((prev) => addMonths(prev, -1));
  };

  const handleNext = () => {
    if (view === "Day") setCurrentDate((prev) => addDays(prev, 1));
    else if (view === "3 Days") setCurrentDate((prev) => addDays(prev, 3));
    else if (view === "Week") setCurrentDate((prev) => addDays(prev, 7));
    else if (view === "Month") setCurrentDate((prev) => addMonths(prev, 1));
  };

  // Timeline scroll preview state for visible feedback when dragging or scrolling the right scrollbar
  const [isScrollingTimeline, setIsScrollingTimeline] = useState(false);
  const [timelinePreviewText, setTimelinePreviewText] = useState("");
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const header = document.getElementById("calendar-header-scroll");
    if (header && Math.abs(header.scrollLeft - container.scrollLeft) > 1) {
      header.scrollLeft = container.scrollLeft;
    }

    // Calculate viewing hour preview
    const approxHour = Math.min(23.9, Math.max(0, container.scrollTop / 80));
    const hInt = Math.floor(approxHour);
    const mins = Math.floor(((container.scrollTop % 80) / 80) * 60);
    const period = hInt >= 12 ? "PM" : "AM";
    const displayHour = hInt === 0 ? 12 : hInt > 12 ? hInt - 12 : hInt;
    const roundedMins = Math.round(mins / 5) * 5;
    const formattedMinutes = roundedMins >= 60 ? "00" : roundedMins.toString().padStart(2, "0");
    const formattedTime = `${displayHour}:${formattedMinutes} ${period}`;

    let timeOfDay = "Night";
    if (hInt >= 5 && hInt < 12) timeOfDay = "Morning";
    else if (hInt >= 12 && hInt < 17) timeOfDay = "Afternoon";
    else if (hInt >= 17 && hInt < 21) timeOfDay = "Evening";

    setTimelinePreviewText(`${formattedTime} • ${timeOfDay}`);
    setIsScrollingTimeline(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrollingTimeline(false);
    }, 1200);
  }, []);

  // Auto-scroll timeline container to current hour or earliest scheduled item on mount/view change
  useEffect(() => {
    if (view === "Month") return;
    const timer = setTimeout(() => {
      const container = document.getElementById("calendar-scroll-container") as HTMLDivElement | null;
      if (container) {
        const now = new Date();
        const hour = now.getHours();
        const targetScrollTop = Math.max(0, (hour - 1) * 80);
        container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [view]);

  // Drag to create
  const [dragSelection, setDragSelection] = useState<{
    day: Date;
    startHour: number;
    endHour: number;
    isDragging: boolean;
  } | null>(null);
  const [liveDragOffsetMins, setLiveDragOffsetMins] = useState<number>(0);
  const [liveResizeDeltaMins, setLiveResizeDeltaMins] = useState<number>(0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskSubject, setTaskSubject] = useState("General");
  const [taskName, setTaskName] = useState("");

  const [modalStartTime, setModalStartTime] = useState("");
  const [modalEndTime, setModalEndTime] = useState("");

  useEffect(() => {
    if (showTaskModal && dragSelection && !dragSelection.isDragging) {
      const startMinsTotal = Math.round(dragSelection.startHour * 60);
      let sh = Math.floor(startMinsTotal / 60);
      let sm = startMinsTotal % 60;
      if (sh >= 24) {
        sh = 23;
        sm = 59;
      }
      setModalStartTime(
        `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`,
      );

      const endMinsTotal = Math.round(dragSelection.endHour * 60);
      let eh = Math.floor(endMinsTotal / 60);
      let em = endMinsTotal % 60;
      if (eh >= 24) {
        eh = 23;
        em = 59;
      }
      setModalEndTime(
        `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`,
      );
    }
  }, [showTaskModal, dragSelection]);

  const [resizingEventId, setResizingEventId] = useState<
    number | string | null
  >(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [, setResizingDeltaMins] = useState<number>(0);
  const [resizeStartHeight, setResizeStartHeight] = useState<number>(0);
  const [resizeStartY, setResizeStartY] = useState<number>(0);

  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High">(
    "Medium",
  );
  const [taskChapter, setTaskChapter] = useState("");
  const [taskType, setTaskType] = useState("Lecture");
  const [lectureNumberInput, setLectureNumberInput] = useState<string>("");
  const [hasEditedLecture, setHasEditedLecture] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    if (!autoSelected && showTaskModal) {
      let lastSubj = "Mathematics";
      let recentTasks = [...todos].reverse();
      if (recentTasks.length === 0) {
        recentTasks = [...history]
          .flatMap((h) => h.completedTasks || [])
          .reverse();
      }
      const lastTask = recentTasks.find((t) => t.subject);
      if (lastTask && lastTask.subject) {
        lastSubj = lastTask.subject;
      }
      setTaskSubject(lastSubj);
      setAutoSelected(true);
    }
    if (!showTaskModal) {
      setAutoSelected(false);
    }
  }, [showTaskModal, todos, history, autoSelected]);

  useEffect(() => {
    if (
      taskSubject &&
      taskSubject !== "General" &&
      taskSubject !== "Personal"
    ) {
      const ongoing = getCurrentChapterForSubject(taskSubject);
      if (ongoing) {
        setTaskChapter(ongoing);
      } else {
        setTaskChapter("");
      }
    } else {
      setTaskChapter("");
    }
  }, [taskSubject, getCurrentChapterForSubject]);

  useEffect(() => {
    const scrollToTime = () => {
      const container = document.getElementById("calendar-scroll-container");
      if (container && view !== "Month") {
        const nowLocal = new Date();
        const currentHour = nowLocal.getHours() + nowLocal.getMinutes() / 60;
        const targetScroll = Math.max(0, currentHour * 80 - 200);
        container.scrollTo({ top: targetScroll, behavior: "auto" });
      }
    };

    scrollToTime();
    const t1 = setTimeout(scrollToTime, 50);
    const t2 = setTimeout(scrollToTime, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [view, currentDate]);

  const currentSubjectChapters = useMemo(() => {
    if (
      taskSubject === "General" ||
      taskSubject === "Personal" ||
      taskSubject === "Personal"
    )
      return [];
    const subj = syllabus[taskSubject as keyof typeof syllabus];
    return subj ? subj : [];
  }, [taskSubject, syllabus]);

  // Drag and Drop State
  const [dragEventId, setDragEventId] = useState<number | string | null>(null);
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedChanges, setUnsyncedChanges] = useState(false);

  const ensureCalendarAuth = async (isManual: boolean = false) => {
    let token = getAccessTokenSync();
    if (!token && auth.currentUser) {
      try {
        token = await refreshGoogleToken();
      } catch (e) {
        console.warn("Silent token refresh failed:", e);
      }
    }
    if (!token) {
      if (isManual) {
        showToast("Connecting to Google Calendar...", "info");
        const loginRes = await googleSignIn();
        if (!loginRes) {
          throw new Error(
            "Google Calendar login in progress or redirecting...",
          );
        }
        return true;
      }
      return false;
    }
    return true;
  };

  const handleCalendarSync = async (isManual: boolean = false) => {
    setIsSyncing(true);

    let allSuccess = true;
    let errorMessage = "";
    try {
      const hasAuth = await ensureCalendarAuth(isManual);
      if (!hasAuth) {
        setIsSyncing(false);
        return;
      }

      // Update existing Google Calendar events (excluding local- placeholder IDs)
      const eventsToUpdate = todos
        .filter(
          (t) =>
            t.calendarEventId &&
            !t.calendarEventId.startsWith("local-") &&
            t.startTime &&
            t.endTime,
        )
        .map((t) => ({
          eventId: t.calendarEventId!,
          startTime: new Date(t.startTime!),
          endTime: new Date(t.endTime!),
        }));
      if (eventsToUpdate.length > 0) {
        const updateSuccess = await rescheduleCalendarEvents(eventsToUpdate);
        if (!updateSuccess) allSuccess = false;
      }

      // Create new events on Google Calendar for unsynced or local-only tasks
      const eventsToCreate = todos.filter(
        (t) =>
          (!t.calendarEventId || t.calendarEventId.startsWith("local-")) &&
          t.startTime &&
          t.endTime,
      );
      if (eventsToCreate.length > 0) {
        const createdEventIds: { id: string | number; calendarEventId: string }[] = [];
        for (const t of eventsToCreate) {
          try {
            const durationMinutes = Math.round(
              (new Date(t.endTime!).getTime() -
                new Date(t.startTime!).getTime()) /
                60000,
            );
            const result = await createCalendarEvent(
              t.text,
              durationMinutes,
              t.type || "Lecture",
              false,
              todos,
              new Date(t.startTime!),
              new Date(t.endTime!),
            );
            if (result && result.id && !result.id.startsWith("local-")) {
              createdEventIds.push({ id: t.id, calendarEventId: result.id });
            }
          } catch (e) {
            console.error("Error creating Google Calendar event:", e);
            allSuccess = false;
          }
        }
        if (createdEventIds.length > 0) {
          setTodos((prev) =>
            prev.map((t) => {
              const match = createdEventIds.find((c) => c.id === t.id);
              return match
                ? { ...t, calendarEventId: match.calendarEventId }
                : t;
            }),
          );
        }
      }
    } catch (e: any) {
      console.error(e);
      allSuccess = false;
      errorMessage =
        e.message || "Failed to apply all changes to Google Calendar.";
    }
    if (allSuccess) {
      showToast("Timeline applied successfully!", "success");
      setUnsyncedChanges(false);
    } else if (isManual) {
      showToast(
        errorMessage || "Failed to apply all changes to Google Calendar.",
        "error",
      );
    }
    setIsSyncing(false);
  };

  // Auto-sync changes to Google Calendar
  useEffect(() => {
    if (unsyncedChanges && !isSyncing) {
      const timer = setTimeout(() => {
        handleCalendarSync();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [unsyncedChanges, todos, isSyncing]);

  const handleScheduleSingle = async (task: Todo) => {
    let latestEnd = new Date();
    if (scheduledEvents.length > 0) {
      const futureEvents = scheduledEvents.filter((e) => e.end > new Date());
      if (futureEvents.length > 0) {
        latestEnd = new Date(
          Math.max(...futureEvents.map((e) => e.end.getTime())),
        );
      }
    }

    let currentStart = new Date(latestEnd);
    if (currentStart < new Date()) {
      currentStart = new Date();
      currentStart.setMinutes(currentStart.getMinutes() + 10);
    }

    // Removed 9 AM to 10 PM restrictions per user request

    const durationMins = task.lectureHours ? task.lectureHours * 60 : 105;
    const end = new Date(currentStart.getTime() + durationMins * 60000);

    const updatedTodos = todos.map((t) =>
      t.id === task.id
        ? {
            ...t,
            startTime: currentStart.toISOString(),
            endTime: end.toISOString(),
          }
        : t,
    );

    setCalendarTodos(updatedTodos);
    showToast(
      `Scheduled ${task.text} for ${format(currentStart, "h:mm a")}`,
      "success",
    );

    try {
      await ensureCalendarAuth();
      const res = await createCalendarEvent(
        task.text,
        durationMins,
        task.type || "Lecture",
        false,
        updatedTodos,
        currentStart,
        end,
      );
      if (res && res.id) {
        setCalendarTodos(
          updatedTodos.map((t) =>
            t.id === task.id ? { ...t, calendarEventId: res.id } : t,
          ),
        );
      }
    } catch (err: any) {
      console.error("Calendar sync error:", err);
    }
  };

  const handleAutoSchedule = async () => {
    if (unscheduledTasks.length === 0) {
      showToast("No unscheduled tasks to plan!", "info");
      return;
    }

    // Auto schedule unscheduled tasks starting from tomorrow morning 9 AM or today if early
    let latestEnd = new Date();
    if (scheduledEvents.length > 0) {
      const futureEvents = scheduledEvents.filter((e) => e.end > new Date());
      if (futureEvents.length > 0) {
        latestEnd = new Date(
          Math.max(...futureEvents.map((e) => e.end.getTime())),
        );
      }
    }

    const updatedTodos = [...todos];
    let currentStart = new Date(latestEnd);
    if (currentStart < new Date()) {
      currentStart = new Date();
      currentStart.setMinutes(currentStart.getMinutes() + 10);
    }

    showToast("Generating study plan...", "info");

    for (const task of unscheduledTasks) {
      // Advance to next valid hour (9 AM to 10 PM)
      if (currentStart.getHours() >= 22) {
        currentStart.setDate(currentStart.getDate() + 1);
        currentStart.setHours(9, 0, 0, 0);
      } else if (currentStart.getHours() < 9) {
        currentStart.setHours(9, 0, 0, 0);
      }

      const durationMins = task.lectureHours ? task.lectureHours * 60 : 105;
      const end = new Date(currentStart.getTime() + durationMins * 60000);

      const tIndex = updatedTodos.findIndex((t) => t.id === task.id);
      if (tIndex >= 0) {
        updatedTodos[tIndex] = {
          ...updatedTodos[tIndex],
          startTime: currentStart.toISOString(),
          endTime: end.toISOString(),
        };
      }

      // Try pushing to google calendar
      try {
        await ensureCalendarAuth();
        const res = await createCalendarEvent(
          task.text,
          durationMins,
          task.type || "Lecture",
          false,
          updatedTodos,
          currentStart,
          end,
        );
        if (res && res.id) {
          updatedTodos[tIndex].calendarEventId = res.id;
        }
      } catch (err: any) {
        console.error("Calendar sync error:", err);
      }

      currentStart = new Date(end.getTime() + 10 * 60000); // 10 min break
    }

    setCalendarTodos(updatedTodos);
    showToast("Study plan generated!", "success");
  };

  const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

  const renderTimeline = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Header Row (Sticky) */}
      <div
        className="flex flex-shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] z-[70]"
        onWheel={(e) => {
          const container = document.getElementById("calendar-scroll-container");
          if (container) {
            container.scrollTop += e.deltaY;
            if (e.deltaX) container.scrollLeft += e.deltaX;
          }
        }}
      >
        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 flex justify-center items-end pb-2 h-12 bg-white dark:bg-[#121212]">
          <span className="text-[10px] text-slate-400 font-bold">TIME</span>
        </div>
        <div
          id="calendar-header-scroll"
          className="flex-1 overflow-x-hidden flex"
          onScroll={(e) => {
            const container = document.getElementById("calendar-scroll-container");
            if (container && Math.abs(container.scrollLeft - (e.target as HTMLDivElement).scrollLeft) > 1) {
              container.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            }
          }}
        >
          <div
            className={`flex flex-1 ${visibleDays.length > 1 ? "min-w-[600px]" : "w-full"}`}
          >
            {visibleDays.map((d) => (
              <div
                key={d.getTime()}
                className="flex-1 flex items-center justify-center border-r border-slate-200 dark:border-white/5 relative gap-1.5 h-12"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(d, currentDate) ? "text-indigo-400" : isSameDay(d, new Date()) ? "text-indigo-500" : "text-slate-400"}`}
                >
                  {format(d, "EEE")}
                </span>
                <span
                  className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${isSameDay(d, currentDate) ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.9)]" : isSameDay(d, new Date()) ? "text-indigo-500" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {format(d, "d")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Time Scrubbing Preview Pill */}
      {isScrollingTimeline && (
        <div className="absolute top-14 right-6 z-[80] pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-black/90 text-white text-xs font-semibold backdrop-blur-md shadow-xl border border-white/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>{timelinePreviewText}</span>
          </div>
        </div>
      )}

      {/* Scrollable Body */}
      <div
        id="calendar-scroll-container"
        className="flex-1 overflow-y-auto overflow-x-auto relative flex custom-calendar-scrollbar min-h-0 select-none"
        onScroll={handleTimelineScroll}
      >
        {/* Time Column */}
        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 sticky left-0 z-[55] bg-white dark:bg-[#121212]">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-20 text-xs text-slate-500 flex justify-center pr-2 pt-2 relative border-b border-slate-100 dark:border-white/5 border-dashed"
            >
              <span className="relative -top-2.5 bg-white dark:bg-[#121212] px-1">
                {hour === 12
                  ? "12 PM"
                  : hour > 12
                    ? `${hour - 12} PM`
                    : hour === 0
                      ? "12 AM"
                      : `${hour} AM`}
              </span>
            </div>
          ))}
          {/* Supreme Time Capsule */}
          <div
            className="absolute left-0 w-full flex justify-center items-center z-[50] pointer-events-none"
            style={{
              top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px`,
              transform: "translateY(-50%)",
            }}
          >
            <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_4px_12px_rgba(79,70,229,0.9)] border border-indigo-400/30">
              {format(currentLocalTime, "h:mm a")}
            </div>
          </div>
        </div>

        {/* Days Grid */}
        <div
          className={`flex-1 flex flex-col relative ${visibleDays.length > 1 ? "min-w-[600px]" : "w-full"}`}
        >
          {/* Grid Body */}
          <div
            className="relative flex-1"
            style={{
              height: `${hours.length * 80}px`,
              minHeight: `${hours.length * 80}px`,
            }}
          >
            {/* Supreme Line (Current Time) */}
            <div
              className="absolute w-full h-[2px] bg-indigo-600 z-[45] pointer-events-none shadow-[0_4px_12px_rgba(79,70,229,0.9)]"
              style={{
                top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 absolute -left-[5px] -top-[4px] shadow-[0_0_10px_rgba(79,70,229,1)]" />
            </div>
            {hours.map((hour) => (
              <div key={`grid-${hour}`}>
                <div
                  className="absolute w-full h-[1px] bg-slate-200 dark:bg-white/10"
                  style={{ top: `${hour * 80}px` }}
                />
                {hour < hours[hours.length - 1] && (
                  <div
                    className="absolute w-full h-[1px] border-b border-dashed border-slate-100 dark:border-white/5"
                    style={{ top: `${hour * 80 + 40}px` }}
                  />
                )}
              </div>
            ))}

            {visibleDays.map((d, colIndex) => (
              <div
                key={`col-${d.getTime()}`}
                className="absolute h-full border-r border-slate-200 dark:border-white/5 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                style={{
                  left: `${colIndex * (100 / visibleDays.length)}%`,
                  width: `${100 / visibleDays.length}%`,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return; // Only left click
                  const startClientX = e.clientX;
                  const startClientY = e.clientY;
                  let isDragActive = false;
                  hasMovedRef.current = false;

                  const target = e.currentTarget;
                  const rect = target.getBoundingClientRect();
                  const y = e.clientY - rect.top;

                  // Snap start to nearest minute
                  const rawStartHour = y / 80;
                  const startHour = Math.round(rawStartHour * 60) / 60;

                  const container = document.getElementById(
                    "calendar-scroll-container",
                  );
                  const startScrollY = container ? container.scrollTop : 0;
                  let scrollInterval: any = null;

                  let finalStartHour = startHour;
                  let finalEndHour = startHour + 30 / 60;

                  const updateGridDrag = (currentClientY: number) => {
                    const currentScrollY = container ? container.scrollTop : 0;
                    const scrollDiff = currentScrollY - startScrollY;
                    const moveY = currentClientY - rect.top + scrollDiff;

                    let rawEndHour = moveY / 80;
                    let currentEndHour = Math.round(rawEndHour * 60) / 60;

                    let actualStart = Math.min(startHour, currentEndHour);
                    let actualEnd = Math.max(startHour, currentEndHour);

                    if (actualEnd - actualStart < 1 / 60) {
                      actualEnd = actualStart + 1 / 60; // min 1 min
                    }
                    if (actualEnd > 24) actualEnd = 24;
                    if (actualStart < 0) actualStart = 0;

                    finalStartHour = actualStart;
                    finalEndHour = actualEnd;

                    if (visualSelectionRef.current) {
                      visualSelectionRef.current.style.top = `${actualStart * 80}px`;
                      visualSelectionRef.current.style.height = `${(actualEnd - actualStart) * 80}px`;
                    }
                  };

                  const handlePointerMove = (
                    moveEvent: React.PointerEvent | PointerEvent,
                  ) => {
                    const deltaX = Math.abs(moveEvent.clientX - startClientX);
                    const deltaY = Math.abs(moveEvent.clientY - startClientY);

                    if (!isDragActive) {
                      if (deltaY > 6 || deltaX > 6) {
                        isDragActive = true;
                        hasMovedRef.current = true;
                        try {
                          if (target.setPointerCapture) {
                            target.setPointerCapture(e.pointerId);
                          }
                        } catch (err) {}
                        document.body.classList.add("is-dragging");

                        if (visualSelectionRef.current) {
                          visualSelectionRef.current.style.display = "block";
                          visualSelectionRef.current.style.left = `calc(${colIndex * (100 / visibleDays.length)}% + 4px)`;
                          visualSelectionRef.current.style.width = `calc(${100 / visibleDays.length}% - 8px)`;
                          visualSelectionRef.current.style.top = `${startHour * 80}px`;
                          visualSelectionRef.current.style.height = `${40}px`;
                        }
                      } else {
                        return;
                      }
                    }

                    updateGridDrag(moveEvent.clientY);

                    if (container) {
                      const contRect = container.getBoundingClientRect();
                      const clientY = moveEvent.clientY;
                      if (scrollInterval) {
                        clearInterval(scrollInterval);
                        scrollInterval = null;
                      }
                      if (clientY < contRect.top + 50) {
                        scrollInterval = setInterval(() => {
                          container.scrollTop -= 15;
                          updateGridDrag(moveEvent.clientY);
                        }, 16);
                      } else if (clientY > contRect.bottom - 50) {
                        scrollInterval = setInterval(() => {
                          container.scrollTop += 15;
                          updateGridDrag(moveEvent.clientY);
                        }, 16);
                      }
                    }
                  };

                  const handlePointerUp = () => {
                    if (scrollInterval) {
                      clearInterval(scrollInterval);
                      scrollInterval = null;
                    }
                    try {
                      if (target && target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
                        target.releasePointerCapture(e.pointerId);
                      }
                    } catch (err) {}
                    window.removeEventListener(
                      "pointermove",
                      handlePointerMove as EventListener,
                    );
                    window.removeEventListener(
                      "pointerup",
                      handlePointerUp as EventListener,
                    );
                    window.removeEventListener(
                      "pointercancel",
                      handlePointerUp as EventListener,
                    );
                    document.body.classList.remove("is-dragging");

                    if (visualSelectionRef.current) {
                      visualSelectionRef.current.style.display = "none";
                    }

                    if (hasMovedRef.current) {
                      setDragSelection({
                        day: d,
                        startHour: finalStartHour,
                        endHour: finalEndHour,
                        isDragging: false,
                      });
                      const formatTimeInput = (hour: number) => {
                        const totalMins = Math.round(hour * 60);
                        const h = Math.floor(totalMins / 60);
                        const m = totalMins % 60;
                        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                      };
                      setModalStartTime(formatTimeInput(finalStartHour));
                      setModalEndTime(formatTimeInput(finalEndHour));
                      setShowTaskModal(true);
                      justDraggedRef.current = true;
                    }
                  };

                  window.addEventListener(
                    "pointermove",
                    handlePointerMove as EventListener,
                    { passive: true },
                  );
                  window.addEventListener(
                    "pointerup",
                    handlePointerUp as EventListener,
                  );
                  window.addEventListener(
                    "pointercancel",
                    handlePointerUp as EventListener,
                  );
                }}
                onClick={(e) => {
                  if (justDraggedRef.current) {
                    justDraggedRef.current = false;
                    return;
                  }
                  if (!dragSelection || !dragSelection.isDragging) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const rawStartHour = y / 80;
                    const startHour = Math.round(rawStartHour * 60) / 60; // snap to nearest minute
                    setDragSelection({
                      day: d,
                      startHour,
                      endHour: startHour + 1, // default 1 hour
                      isDragging: false,
                    });
                    const formatTimeInput = (hour: number) => {
                      const totalMins = Math.round(hour * 60);
                      const h = Math.floor(totalMins / 60);
                      const m = totalMins % 60;
                      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                    };
                    setModalStartTime(formatTimeInput(startHour));
                    setModalEndTime(formatTimeInput(startHour + 1));
                    setShowTaskModal(true);
                  }
                }}
              />
            ))}

            {/* Drag Selection Visual */}
            <div
              ref={visualSelectionRef}
              className="absolute bg-indigo-500/20 border-2 border-indigo-500 rounded-xl pointer-events-none z-40 shadow-sm"
              style={{ display: "none" }}
            />

            {/* Modal Drag Selection Visual */}
            {dragSelection && !dragSelection.isDragging && (
              <div
                className="absolute bg-indigo-500/20 border-2 border-indigo-500 rounded-xl pointer-events-none z-40 shadow-sm"
                style={{
                  left: `calc(${visibleDays.findIndex((d) => isSameDay(d, dragSelection.day)) * (100 / visibleDays.length)}% + 4px)`,
                  width: `calc(${100 / visibleDays.length}% - 8px)`,
                  top: `${dragSelection.startHour * 80}px`,
                  height: `${(dragSelection.endHour - dragSelection.startHour) * 80}px`,
                }}
              />
            )}

            {/* Events */}
            {scheduledEvents
              .filter((ev) => visibleDays.some((vd) => isSameDay(vd, ev.start)))
              .map((ev) => {
                const dayIndex = visibleDays.findIndex((vd) =>
                  isSameDay(vd, ev.start),
                );
                if (dayIndex === -1) return null;

                const startHour =
                  ev.start.getHours() + ev.start.getMinutes() / 60;
                const duration =
                  (ev.end.getTime() - ev.start.getTime()) / 3600000;
                const colorClass = COLORS[ev.subject] || COLORS["Default"];

                // High-performance display calculations using local drag/resize offsets
                let displayStart = ev.start;
                let displayEnd = ev.end;
                let displayStartHour = startHour;
                let displayDuration = duration;

                if (dragEventId === ev.id) {
                  displayStart = new Date(
                    ev.start.getTime() + liveDragOffsetMins * 60000,
                  );
                  displayEnd = new Date(
                    ev.end.getTime() + liveDragOffsetMins * 60000,
                  );
                  displayStartHour =
                    displayStart.getHours() + displayStart.getMinutes() / 60;
                } else if (resizingEventId === ev.id) {
                  const displayDurationMins = Math.max(
                    15,
                    duration * 60 + liveResizeDeltaMins,
                  );
                  displayEnd = new Date(
                    ev.start.getTime() + displayDurationMins * 60000,
                  );
                  displayDuration = displayDurationMins / 60;
                }

                return (
                  <div
                    key={ev.id}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if (
                        (e.target as HTMLElement).closest(
                          '[data-resize-handle="true"]',
                        ) ||
                        (e.target as HTMLElement).closest(
                          '[data-delete-btn="true"]',
                        ) ||
                        (e.target as HTMLElement).closest(
                          '[data-checkbox="true"]',
                        )
                      )
                        return;

                      const startX = e.clientX;
                      const startY = e.clientY;
                      let isDragging = false;
                      let hasMoved = false;
                      const target = e.currentTarget as HTMLDivElement;

                      const originalStartTime = ev.start.getTime();
                      const originalEndTime = ev.end.getTime();
                      const durationMilli = originalEndTime - originalStartTime;

                      const container = document.getElementById(
                        "calendar-scroll-container",
                      );
                      const startScrollY = container ? container.scrollTop : 0;
                      let scrollInterval: any = null;

                      let lastDeltaMins = 0;
                      let currentDayIndex = dayIndex;

                      const updateEventDrag = (
                        currentClientX: number,
                        currentClientY: number,
                      ) => {
                        const currentScrollY = container
                          ? container.scrollTop
                          : 0;
                        const scrollDiff = currentScrollY - startScrollY;
                        const deltaY = currentClientY - startY + scrollDiff;
                        if (Math.abs(deltaY) > 3) {
                          hasMoved = true;
                        }
                        const rawDeltaMins = deltaY / (80 / 60);
                        const currentStartMins = startHour * 60 + rawDeltaMins;
                        const snappedStartMins = Math.round(currentStartMins); // Exact minute precision
                        let newDeltaMins =
                          snappedStartMins - Math.round(startHour * 60);

                        const origStartMins = startHour * 60;
                        const eventDurMins = duration * 60;
                        const minDeltaMins = -origStartMins;
                        const maxDeltaMins =
                          24 * 60 - (origStartMins + eventDurMins);

                        if (newDeltaMins < minDeltaMins)
                          newDeltaMins = minDeltaMins;
                        if (newDeltaMins > maxDeltaMins)
                          newDeltaMins = maxDeltaMins;

                        if (newDeltaMins !== 0) {
                          hasMoved = true;
                        }

                        // Track horizontal position to change days
                        const gridContainer = target.parentElement;
                        if (gridContainer) {
                          const rect = gridContainer.getBoundingClientRect();
                          const relativeX = currentClientX - rect.left;
                          const colWidth = rect.width / visibleDays.length;
                          let potentialDayIndex = Math.floor(
                            relativeX / colWidth,
                          );
                          potentialDayIndex = Math.max(
                            0,
                            Math.min(visibleDays.length - 1, potentialDayIndex),
                          );

                          if (potentialDayIndex !== currentDayIndex) {
                            currentDayIndex = potentialDayIndex;
                            hasMoved = true;
                          }
                          target.style.left = `calc(${currentDayIndex * (100 / visibleDays.length)}% + 3px)`;
                          target.style.width = `calc(${100 / visibleDays.length}% - 6px)`;
                        }

                        if (newDeltaMins !== lastDeltaMins || hasMoved) {
                          lastDeltaMins = newDeltaMins;

                          // Direct DOM Manipulation for ultra-smooth rendering
                          target.style.transform = `translate3d(0, ${newDeltaMins * (80 / 60)}px, 0)`;

                          // Update time text inside the event card on the fly
                          const timeEl = target.querySelector(
                            '[data-time-display="true"]',
                          );
                          if (timeEl) {
                            const targetMins = Math.round(
                              startHour * 60 + newDeltaMins,
                            );
                            const h = Math.floor(targetMins / 60);
                            const m = targetMins % 60;
                            const tempStart = new Date(
                              visibleDays[currentDayIndex],
                            );
                            tempStart.setHours(h, m, 0, 0);
                            const tempEnd = new Date(
                              tempStart.getTime() + durationMilli,
                            );
                            timeEl.innerHTML = `${format(tempStart, "h:mm a")} <span class="mx-0.5 opacity-60">→</span> ${format(tempEnd, "h:mm a")}`;
                          }
                        }
                      };

                      const handlePointerMove = (moveEvent: PointerEvent) => {
                        const deltaX = Math.abs(moveEvent.clientX - startX);
                        const deltaY = Math.abs(moveEvent.clientY - startY);

                        if (!isDragging) {
                          if (deltaX > 5 || deltaY > 5) {
                            isDragging = true;
                            setIsDraggingEvent(true);
                            setDragEventId(ev.id);
                            document.body.classList.add("is-dragging");
                            try {
                              if (target.setPointerCapture) {
                                target.setPointerCapture(e.pointerId);
                              }
                            } catch (err) {}
                            target.style.left = `calc(${currentDayIndex * (100 / visibleDays.length)}% + 3px)`;
                            target.style.width = `calc(${100 / visibleDays.length}% - 6px)`;
                          } else {
                            return;
                          }
                        }

                        updateEventDrag(moveEvent.clientX, moveEvent.clientY);

                        if (container) {
                          const containerRect =
                            container.getBoundingClientRect();
                          const topEdge = containerRect.top + 60;
                          const bottomEdge = containerRect.bottom - 60;

                          if (moveEvent.clientY < topEdge) {
                            if (!scrollInterval) {
                              scrollInterval = setInterval(() => {
                                if (container.scrollTop > 0) {
                                  container.scrollTop -= 14;
                                  updateEventDrag(
                                    moveEvent.clientX,
                                    moveEvent.clientY,
                                  );
                                }
                              }, 20);
                            }
                          } else if (moveEvent.clientY > bottomEdge) {
                            if (!scrollInterval) {
                              scrollInterval = setInterval(() => {
                                if (
                                  container.scrollTop <
                                  container.scrollHeight -
                                    container.clientHeight
                                ) {
                                  container.scrollTop += 14;
                                  updateEventDrag(
                                    moveEvent.clientX,
                                    moveEvent.clientY,
                                  );
                                }
                              }, 20);
                            }
                          } else {
                            if (scrollInterval) {
                              clearInterval(scrollInterval);
                              scrollInterval = null;
                            }
                          }
                        }
                      };

                      const handlePointerUp = () => {
                        if (scrollInterval) {
                          clearInterval(scrollInterval);
                          scrollInterval = null;
                        }
                        if (isDragging) {
                          setIsDraggingEvent(false);
                          setDragEventId(null);
                          setUnsyncedChanges(true);
                          document.body.classList.remove("is-dragging");
                        }
                        try {
                          if (target && target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
                            target.releasePointerCapture(e.pointerId);
                          }
                        } catch (err) {}
                        window.removeEventListener(
                          "pointermove",
                          handlePointerMove as EventListener,
                        );
                        window.removeEventListener(
                          "pointerup",
                          handlePointerUp as EventListener,
                        );
                        window.removeEventListener(
                          "pointercancel",
                          handlePointerUp as EventListener,
                        );

                        // Reset transform while keeping target column width/left intact for React
                        target.style.transform = "";
                        target.style.left = `calc(${currentDayIndex * (100 / visibleDays.length)}% + 3px)`;
                        target.style.width = `calc(${100 / visibleDays.length}% - 6px)`;

                        if (hasMoved) {
                          const totalStartMins = Math.round(
                            startHour * 60 + lastDeltaMins,
                          );
                          const finalStartMins = totalStartMins;
                          const hours = Math.floor(finalStartMins / 60);
                          const mins = finalStartMins % 60;

                          const targetDay = visibleDays[currentDayIndex];
                          const finalStart = new Date(targetDay);
                          finalStart.setHours(hours, mins, 0, 0);

                          const finalEnd = new Date(
                            finalStart.getTime() + durationMilli,
                          );

                          setCalendarTodos((prev) =>
                            prev.map((t) =>
                              t.id === ev.id
                                ? {
                                    ...t,
                                    startTime: finalStart.toISOString(),
                                    endTime: finalEnd.toISOString(),
                                  }
                                : t,
                            ),
                          );

                          if (
                            ev.calendarEventId &&
                            !ev.calendarEventId.startsWith("local-")
                          ) {
                            updateCalendarEventTime(
                              ev.calendarEventId,
                              finalStart,
                              finalEnd,
                            ).catch(console.error);
                          } else {
                            const durationMins = Math.round(
                              (finalEnd.getTime() - finalStart.getTime()) /
                                60000,
                            );
                            createCalendarEvent(
                              ev.title,
                              durationMins,
                              (ev as any).type || "Lecture",
                              false,
                              todos,
                              finalStart,
                              finalEnd,
                            )
                              .then((res) => {
                                if (
                                  res &&
                                  res.id &&
                                  !res.id.startsWith("local-")
                                ) {
                                  setCalendarTodos((prev) =>
                                    prev.map((t) =>
                                      t.id === ev.id
                                        ? { ...t, calendarEventId: res.id }
                                        : t,
                                    ),
                                  );
                                }
                              })
                              .catch(console.error);
                          }
                        }
                      };

                      window.addEventListener(
                        "pointermove",
                        handlePointerMove as EventListener,
                        { passive: true },
                      );
                      window.addEventListener(
                        "pointerup",
                        handlePointerUp as EventListener,
                      );
                      window.addEventListener(
                        "pointercancel",
                        handlePointerUp as EventListener,
                      );
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    data-no-swipe="true"
                    data-calendar-event="true"
                    className={`absolute rounded-xl px-2.5 py-1.5 overflow-hidden cursor-grab active:cursor-grabbing border ${colorClass} ${dragEventId === ev.id ? "opacity-80 shadow-2xl z-50 ring-2 ring-indigo-500" : "z-40 shadow-sm"} ${dragEventId === ev.id || resizingEventId === ev.id ? "" : "transition-all duration-300"} group touch-none select-none no-swipe`}
                    style={{
                      left: `calc(${dayIndex * (100 / visibleDays.length)}% + 3px)`,
                      width: `calc(${100 / visibleDays.length}% - 6px)`,
                      top: `${displayStartHour * 80}px`,
                      height: `${Math.max(28, displayDuration * 80 - 2)}px`,
                    }}
                  >
                    {/* Delete button (prominent hover/touch area) */}
                    <button
                      data-delete-btn="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setCalendarTodos((prev) => prev.filter((t) => t.id !== ev.id));
                        setUnsyncedChanges(true);
                        showToast("Task deleted", "success");
                        if ((ev as any).calendarEventId) {
                          deleteCalendarEvent(
                            (ev as any).calendarEventId,
                          ).catch(console.error);
                        }
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/40 hover:bg-red-500 dark:bg-white/30 dark:hover:bg-red-500 text-white flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-[70] shadow-sm"
                      title="Delete task"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>

                    <div className="flex flex-col h-full overflow-hidden pointer-events-none">
                      {displayDuration < 0.65 ? (
                        /* Compact Layout for Short Duration Tasks (< 40 mins) */
                        <div className="flex items-center gap-1.5 h-full w-full overflow-hidden pr-5">
                          <button
                            data-checkbox="true"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const nextState = !ev.completed;
                              notifyCalendarMutation?.();
                              if (onToggleTodo) onToggleTodo(ev.id);
                              else
                                setCalendarTodos((prev) =>
                                  prev.map((t) =>
                                    t.id === ev.id
                                      ? { ...t, completed: nextState }
                                      : t,
                                  ),
                                );
                              showToast(
                                nextState
                                  ? "Task completed! 🎉"
                                  : "Task marked incomplete",
                                "success",
                              );
                              if (
                                ev.calendarEventId &&
                                !ev.calendarEventId.startsWith("local-")
                              ) {
                                markCalendarEventCompleted(
                                  ev.calendarEventId,
                                  nextState,
                                  ev.title,
                                ).catch(console.error);
                              }
                            }}
                            className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center cursor-pointer pointer-events-auto transition-all ${ev.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-current opacity-60 hover:opacity-100"}`}
                            title={
                              ev.completed ? "Mark incomplete" : "Mark complete"
                            }
                          >
                            {ev.completed && (
                              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                            )}
                          </button>

                          <p
                            className={`text-[11px] font-bold leading-none truncate pointer-events-none ${ev.completed ? "line-through opacity-60" : ""}`}
                          >
                            {ev.title}
                          </p>

                          <span
                            data-time-display="true"
                            className="text-[9px] opacity-75 font-mono ml-auto truncate flex-shrink-0"
                          >
                            {format(displayStart, "h:mm a")}
                          </span>
                        </div>
                      ) : (
                        /* Full Layout for Standard Tasks (>= 40 mins) */
                        <div className="flex flex-col h-full justify-between overflow-hidden">
                          <div>
                            {/* Subject and Type Badge */}
                            <div className="flex items-center gap-1 mb-1 opacity-90 text-[8px] uppercase tracking-widest font-bold flex-shrink-0">
                              {ev.subject === "Physics" && (
                                <Atom className="w-2.5 h-2.5" />
                              )}
                              {ev.subject === "Chemistry" && (
                                <Beaker className="w-2.5 h-2.5" />
                              )}
                              {ev.subject === "Mathematics" && (
                                <Sigma className="w-2.5 h-2.5" />
                              )}
                              {("todo" in ev
                                ? (ev as any).todo?.type
                                : undefined) || "TASK"}
                            </div>

                            {/* Title and Checkbox */}
                            <div className="flex items-start gap-1.5 pointer-events-auto pr-5">
                              <button
                                data-checkbox="true"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const nextState = !ev.completed;
                                  notifyCalendarMutation?.();
                                  if (onToggleTodo) onToggleTodo(ev.id);
                                  else
                                    setCalendarTodos((prev) =>
                                      prev.map((t) =>
                                        t.id === ev.id
                                          ? { ...t, completed: nextState }
                                          : t,
                                      ),
                                    );
                                  showToast(
                                    nextState
                                      ? "Task completed! 🎉"
                                      : "Task marked incomplete",
                                    "success",
                                  );
                                  if (
                                    ev.calendarEventId &&
                                    !ev.calendarEventId.startsWith("local-")
                                  ) {
                                    markCalendarEventCompleted(
                                      ev.calendarEventId,
                                      nextState,
                                      ev.title,
                                    ).catch(console.error);
                                  }
                                }}
                                className={`w-3.5 h-3.5 mt-[1px] rounded-sm border flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${ev.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-current opacity-60 hover:opacity-100"}`}
                                title={
                                  ev.completed
                                    ? "Mark incomplete"
                                    : "Mark complete"
                                }
                              >
                                {ev.completed && (
                                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                )}
                              </button>
                              <p
                                className={`text-[11px] font-bold leading-tight line-clamp-2 pointer-events-none ${ev.completed ? "line-through opacity-60" : ""}`}
                              >
                                {ev.title}
                              </p>
                            </div>
                          </div>

                          {/* Time and Duration/XP */}
                          <div className="flex flex-col gap-0.5 opacity-90 pt-1 border-t border-black/10 dark:border-white/10 flex-shrink-0">
                            <p
                              data-time-display="true"
                              className="text-[9px] font-medium flex items-center gap-1 truncate font-mono"
                            >
                              {format(displayStart, "h:mm a")}{" "}
                              <ArrowRight className="w-2 h-2 opacity-60" />{" "}
                              {format(displayEnd, "h:mm a")}
                            </p>
                            <p
                              data-duration-display="true"
                              className="text-[9px] font-medium flex items-center gap-1 truncate font-mono"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {(() => {
                                const totalMins = Math.round(
                                  displayDuration * 60,
                                );
                                const h = Math.floor(totalMins / 60);
                                const m = totalMins % 60;
                                return `${h > 0 ? `${h}h ` : ""}${m}m`;
                              })()}
                              <span className="font-bold text-yellow-600 dark:text-yellow-400 ml-1">
                                +
                                {Math.round(
                                  displayDuration *
                                    (ev.subject === "Physics"
                                      ? 60
                                      : ev.subject === "Mathematics"
                                        ? 65
                                        : ev.subject === "Chemistry"
                                          ? 50
                                          : ev.subject === "Biology"
                                            ? 50
                                            : 40),
                                )}{" "}
                                XP
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      data-resize-handle="true"
                      className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end pb-1 justify-center opacity-0 hover:opacity-100 transition-opacity ${resizingEventId === ev.id ? "opacity-100 bg-black/10 dark:bg-white/10" : "hover:bg-black/10 dark:hover:bg-white/10"} touch-none z-[60]`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        e.preventDefault();

                        const target = e.currentTarget;
                        const eventCard =
                          target.parentElement as HTMLDivElement;
                        target.setPointerCapture(e.pointerId);
                        document.body.classList.add("is-dragging");

                        const startY = e.clientY;
                        const originalDurationMins = duration * 60;
                        setResizingEventId(ev.id);

                        const container = document.getElementById(
                          "calendar-scroll-container",
                        );
                        const startScrollY = container
                          ? container.scrollTop
                          : 0;
                        let resizeScrollInterval: any = null;

                        let lastDurationMins = Math.round(originalDurationMins);

                        const updateResize = (clientY: number) => {
                          const currentScrollY = container
                            ? container.scrollTop
                            : 0;
                          const scrollDiff = currentScrollY - startScrollY;
                          const deltaY = clientY - startY + scrollDiff;
                          let rawDeltaMins = deltaY / (80 / 60);
                          let newDurationMins =
                            originalDurationMins + rawDeltaMins;

                          if (newDurationMins < 5) newDurationMins = 5; // Minimum 5 minutes
                          newDurationMins = Math.round(newDurationMins); // Exact minute precision

                          const maxDurationMins = (24 - startHour) * 60;
                          if (newDurationMins > maxDurationMins)
                            newDurationMins = maxDurationMins;

                          if (newDurationMins !== lastDurationMins) {
                            lastDurationMins = newDurationMins;

                            // Direct DOM manipulation of the parent element's height for 120 FPS buttery smooth resizing
                            if (eventCard) {
                              eventCard.style.height = `${(newDurationMins / 60) * 80}px`;
                            }

                            // Update time text and duration text inside the card on the fly if present
                            const timeEl = eventCard?.querySelector(
                              '[data-time-display="true"]',
                            );
                            if (timeEl) {
                              const tempEnd = new Date(
                                ev.start.getTime() + newDurationMins * 60000,
                              );
                              timeEl.innerHTML = `${format(ev.start, "h:mm a")} <span class="mx-0.5 text-slate-400">→</span> ${format(tempEnd, "h:mm a")}`;
                            }
                            const durationEl = eventCard?.querySelector(
                              '[data-duration-display="true"]',
                            );
                            if (durationEl) {
                              const h = Math.floor(newDurationMins / 60);
                              const m = Math.round(newDurationMins % 60);
                              const xp = Math.round(
                                (newDurationMins / 60) *
                                  (ev.subject === "Physics"
                                    ? 60
                                    : ev.subject === "Mathematics"
                                      ? 65
                                      : ev.subject === "Chemistry"
                                        ? 50
                                        : ev.subject === "Biology"
                                          ? 50
                                          : 40),
                              );
                              durationEl.innerHTML = `
                            <svg class="w-2.5 h-2.5 inline-block mr-1 align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: -2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${h > 0 ? `${h}h ` : ""}${m}m
                            <span class="font-bold text-yellow-600 dark:text-yellow-400 ml-1">+${xp} XP</span>
                          `;
                            }
                          }
                        };

                        const handlePointerMove = (
                          moveEvent: PointerEvent | React.PointerEvent,
                        ) => {
                          moveEvent.preventDefault();
                          updateResize(moveEvent.clientY);

                          if (container) {
                            const containerRect =
                              container.getBoundingClientRect();
                            const bottomEdge = containerRect.bottom - 60;
                            if (moveEvent.clientY > bottomEdge) {
                              if (!resizeScrollInterval) {
                                resizeScrollInterval = setInterval(() => {
                                  if (
                                    container.scrollTop <
                                    container.scrollHeight -
                                      container.clientHeight
                                  ) {
                                    container.scrollTop += 14;
                                    updateResize(moveEvent.clientY);
                                  }
                                }, 20);
                              }
                            } else {
                              if (resizeScrollInterval) {
                                clearInterval(resizeScrollInterval);
                                resizeScrollInterval = null;
                              }
                            }
                          }
                        };

                        const handlePointerUp = (
                          upEvent: PointerEvent | React.PointerEvent,
                        ) => {
                          if (resizeScrollInterval) {
                            clearInterval(resizeScrollInterval);
                            resizeScrollInterval = null;
                          }
                          setResizingEventId(null);
                          setUnsyncedChanges(true);
                          document.body.classList.remove("is-dragging");
                          try {
                            if (target && target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
                              target.releasePointerCapture(e.pointerId);
                            }
                          } catch (err) {
                            // ignore pointer capture release error
                          }
                          window.removeEventListener(
                            "pointermove",
                            handlePointerMove as EventListener,
                          );
                          window.removeEventListener(
                            "pointerup",
                            handlePointerUp as EventListener,
                          );
                          window.removeEventListener(
                            "pointercancel",
                            handlePointerUp as EventListener,
                          );

                          // Keep final height intact for seamless React update
                          if (eventCard) {
                            eventCard.style.height = `${Math.max(28, (lastDurationMins / 60) * 80 - 2)}px`;
                          }

                          const finalEnd = new Date(
                            ev.start.getTime() + lastDurationMins * 60000,
                          );

                          setCalendarTodos((prev) =>
                            prev.map((t) =>
                              t.id === ev.id
                                ? { ...t, endTime: finalEnd.toISOString() }
                                : t,
                            ),
                          );

                          if (
                            ev.calendarEventId &&
                            !ev.calendarEventId.startsWith("local-")
                          ) {
                            updateCalendarEventTime(
                              ev.calendarEventId,
                              ev.start,
                              finalEnd,
                            ).catch(console.error);
                          } else {
                            const durationMins = Math.round(
                              (finalEnd.getTime() - ev.start.getTime()) / 60000,
                            );
                            createCalendarEvent(
                              ev.title,
                              durationMins,
                              (ev as any).type || "Lecture",
                              false,
                              todos,
                              ev.start,
                              finalEnd,
                            )
                              .then((res) => {
                                if (
                                  res &&
                                  res.id &&
                                  !res.id.startsWith("local-")
                                ) {
                                  setCalendarTodos((prev) =>
                                    prev.map((t) =>
                                      t.id === ev.id
                                        ? { ...t, calendarEventId: res.id }
                                        : t,
                                    ),
                                  );
                                }
                              })
                              .catch(console.error);
                          }
                        };

                        window.addEventListener(
                          "pointermove",
                          handlePointerMove as EventListener,
                          { passive: false },
                        );
                        window.addEventListener(
                          "pointerup",
                          handlePointerUp as EventListener,
                        );
                        window.addEventListener(
                          "pointercancel",
                          handlePointerUp as EventListener,
                        );
                      }}
                    >
                      <div
                        className={`w-6 h-1 rounded-full transition-all ${resizingEventId === ev.id ? "bg-black/50 dark:bg-white/70 scale-110 shadow-sm" : "bg-black/20 dark:bg-white/30"}`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonthGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfMonth(monthEnd);

    const daysArr = [];
    let d = startDate;
    while (d <= endDate || daysArr.length % 7 !== 0) {
      daysArr.push(d);
      d = addDays(d, 1);
    }

    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#121212] overflow-y-auto">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1a1a]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {daysArr.map((d) => {
            const isCurrentMonth = d.getMonth() === currentDate.getMonth();
            const dayEvents = scheduledEvents.filter((ev) =>
              isSameDay(ev.start, d),
            );
            return (
              <div
                key={d.getTime()}
                className={`border-r border-b border-slate-200 dark:border-white/5 p-2 min-h-[100px] ${!isCurrentMonth ? "bg-slate-100 dark:bg-white/5 opacity-50" : "bg-white dark:bg-[#1a1a1a]"}`}
              >
                <div
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isSameDay(d, new Date()) ? "bg-indigo-600 text-white shadow-md" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[9px] px-1.5 py-0.5 rounded truncate ${COLORS[ev.subject] || COLORS["Default"]}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-slate-500 font-medium px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSidebarContents = (prefix: string) => (
    <>
      {/* Mini Calendar */}
      <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-white">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
            <div
              key={`${prefix}-${d}-${idx}`}
              className="text-slate-500 font-medium py-1"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: getDay(startOfMonth(currentDate)) }).map(
            (_, i) => (
              <div key={`${prefix}-empty-${i}`} />
            ),
          )}
          {Array.from({
            length: new Date(
              currentDate.getFullYear(),
              currentDate.getMonth() + 1,
              0,
            ).getDate(),
          }).map((_, i) => {
            const dayDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              i + 1,
            );
            const isToday = isSameDay(dayDate, new Date());
            const isSel = isSameDay(dayDate, currentDate);
            return (
              <button
                key={`${prefix}-day-${i}`}
                onClick={() => setCurrentDate(dayDate)}
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center transition-all ${isSel ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20" : isToday ? "text-indigo-400 font-bold bg-indigo-500/10" : "text-slate-300 hover:bg-white/10"}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Progress */}
      <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
        <h3 className="font-bold text-sm mb-4 text-white">Today's Progress</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                className="stroke-slate-800"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                className="stroke-indigo-500 transition-all duration-1000"
                strokeWidth="4"
                fill="none"
                strokeDasharray="150"
                strokeDashoffset={
                  150 -
                  150 *
                    Math.min(xpGainedToday / Math.max(dailyXpRequired, 1), 1)
                }
              />
            </svg>
            <span className="absolute text-xs font-bold text-white">
              {Math.min(
                Math.round(
                  (xpGainedToday / Math.max(dailyXpRequired, 1)) * 100,
                ),
                100,
              )}
              %
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">
              {Math.round(hoursStudiedToday * 10) / 10}h studied
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {xpGainedToday} / {dailyXpRequired} XP
            </p>
          </div>
        </div>
      </div>

      {/* Calendars */}
      <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-white">Calendars</h3>
        </div>
        <div className="space-y-2">
          {[
            { name: "General", color: "bg-indigo-500" },
            { name: "Physics", color: "bg-blue-500" },
            { name: "Chemistry", color: "bg-emerald-500" },
            { name: "Mathematics", color: "bg-amber-500" },
            { name: "Personal", color: "bg-rose-500" },
          ].map((cal) => (
            <div
              key={`${prefix}-${cal.name}`}
              onClick={() => {
                if (
                  ["Physics", "Chemistry", "Mathematics"].includes(cal.name)
                ) {
                  setSelectedSubject(cal.name);
                }
              }}
              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                selectedSubject === cal.name &&
                ["Physics", "Chemistry", "Mathematics"].includes(cal.name)
                  ? "bg-indigo-600/10 border border-indigo-500/30"
                  : "border border-transparent hover:bg-white/[0.04]"
              }`}
            >
              <label
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`w-4 h-4 rounded shadow-sm border border-white/10 flex items-center justify-center transition-colors ${activeCalendars.includes(cal.name) ? cal.color : "bg-transparent"}`}
                >
                  {activeCalendars.includes(cal.name) && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  {cal.name}
                </span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={activeCalendars.includes(cal.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setActiveCalendars([...activeCalendars, cal.name]);
                    } else {
                      setActiveCalendars(
                        activeCalendars.filter((c) => c !== cal.name),
                      );
                    }
                  }}
                />
              </label>
              {["Physics", "Chemistry", "Mathematics"].includes(cal.name) && (
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSubject === cal.name
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-500 hover:text-slate-400 bg-white/[0.02]"
                  }`}
                >
                  {selectedSubject === cal.name ? "Active" : "Select"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-white">Upcoming</h3>
        </div>
        <div className="space-y-3">
          {todos
            .filter(
              (t) =>
                t.startTime &&
                t.endTime &&
                !t.completed &&
                new Date(t.endTime) > new Date(),
            )
            .sort(
              (a, b) =>
                new Date(a.startTime!).getTime() -
                new Date(b.startTime!).getTime(),
            )
            .slice(0, 3)
            .map((t) => {
              const st = new Date(t.startTime!);
              const colorMap: Record<string, string> = {
                Physics: "bg-blue-500",
                Chemistry: "bg-emerald-500",
                Mathematics: "bg-amber-500",
                Personal: "bg-rose-500",
              };
              const color = colorMap[t.subject || ""] || "bg-indigo-500";
              let timeStr = format(st, "h:mm a");
              let dateStr = isSameDay(st, new Date())
                ? "Today"
                : isSameDay(st, addDays(new Date(), 1))
                  ? "Tomorrow"
                  : format(st, "MMM d");

              return (
                <div
                  key={`${prefix}-upcoming-${t.id}`}
                  className="flex items-center gap-3"
                >
                  <div className={`w-1 h-8 rounded-full ${color}`}></div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-200 line-clamp-1">
                      {t.text}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {dateStr}, {timeStr}
                    </p>
                  </div>
                </div>
              );
            })}
          {todos.filter(
            (t) =>
              t.startTime &&
              t.endTime &&
              !t.completed &&
              new Date(t.endTime) > new Date(),
          ).length === 0 && (
            <p className="text-xs text-slate-500 italic">No upcoming tasks.</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      data-no-swipe="true"
      className={
        onClose
          ? "fixed inset-0 z-[9999] w-screen h-screen min-h-[100dvh] bg-white dark:bg-[#121212] flex overflow-hidden study-calendar-container no-swipe"
          : "w-full h-full overflow-hidden study-calendar-container no-swipe"
      }
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full h-full dark:bg-[#121212] bg-[#f8f9fa] flex flex-col md:flex-row overflow-hidden relative text-slate-800 dark:text-slate-200 font-sans rounded-none border-0"
      >

        {/* Create Task Modal */}
        <AnimatePresence>
          {showTaskModal && dragSelection && !dragSelection.isDragging && (
            <div className="absolute inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 max-w-5xl w-full my-auto overflow-y-auto lg:overflow-visible max-h-[95vh] custom-scrollbar">
                {/* Floating Card 1: Task Creation Card (identical to previous versions) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[90vh] md:max-h-[85vh] justify-between"
                >
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>

                  <div className="mb-6 flex-shrink-0">
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-indigo-500" />
                      New Study Session
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {format(dragSelection.day, "MMMM d, yyyy")}
                    </p>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={modalStartTime || ""}
                          onChange={(e) => setModalStartTime(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        />
                      </div>
                      <div className="text-slate-400 mt-5">to</div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={modalEndTime || ""}
                          onChange={(e) => setModalEndTime(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 overflow-y-auto pr-2 scrollbar-hide flex-1 min-h-0">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Priority
                      </label>
                      <div className="flex gap-2">
                        {(["Low", "Medium", "High"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setTaskPriority(p)}
                            className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all border ${
                              taskPriority === p
                                ? p === "High"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/50"
                                  : p === "Medium"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/50"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/50"
                                : "bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Subject
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Physics",
                          "Chemistry",
                          "Mathematics",
                          "General",
                          "Personal",
                        ].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setTaskSubject(s);
                              setTaskChapter("");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${taskSubject === s ? "bg-indigo-600 text-white border-indigo-500" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {currentSubjectChapters.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="lg:hidden"
                        >
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Chapter (Optional)
                          </label>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar border dark:border-slate-700 border-slate-200 rounded-xl p-2 bg-slate-50 dark:bg-black/40 grid grid-cols-1 gap-1">
                            <button
                              onClick={() => {
                                setTaskChapter("");
                                setHasEditedLecture(false);
                              }}
                              className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${!taskChapter ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"}`}
                            >
                              No Chapter
                            </button>
                            {currentSubjectChapters.map((ch) => (
                              <button
                                key={ch.name}
                                onClick={() => {
                                  setTaskChapter(ch.name);
                                  setHasEditedLecture(false);
                                }}
                                className={`text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${taskChapter === ch.name ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5"}`}
                              >
                                {ch.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Task Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Lecture",
                          "Notes",
                          "Practice",
                          "DPP",
                          "Revision",
                          "PYQs",
                          "Custom",
                        ].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTaskType(t)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${taskType === t ? "bg-cyan-600/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/50" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {taskType === "Lecture" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Lecture Number (Optional)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 4"
                          value={
                            (hasEditedLecture
                              ? lectureNumberInput
                              : predictNextLecture(
                                  taskSubject || "",
                                  taskChapter || "",
                                  todos,
                                  history,
                                  syllabus,
                                )) || ""
                          }
                          onChange={(e) => {
                            setLectureNumberInput(e.target.value);
                            setHasEditedLecture(true);
                          }}
                          className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        />
                      </motion.div>
                    )}
                    {taskType === "Custom" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Custom Task Name
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={taskName || ""}
                          onChange={(e) => setTaskName(e.target.value)}
                          placeholder="Enter task name..."
                          className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-white/5 mt-4">
                    <button
                      onClick={() => setShowTaskModal(false)}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-colors text-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        let finalName = "";
                        if (taskType === "Custom") {
                          if (!(taskName || "").trim()) {
                            showToast(
                              "Please enter a custom task name",
                              "error",
                            );
                            return;
                          }
                          finalName = (taskName || "").trim();
                        } else {
                          let baseName = taskType;
                          if (taskType === "Lecture") {
                            const lecNum = hasEditedLecture
                              ? lectureNumberInput
                              : predictNextLecture(
                                  taskSubject || "",
                                  taskChapter || "",
                                  todos,
                                  history,
                                  syllabus,
                                );
                            if (lecNum) baseName = `Lecture ${lecNum}`;
                          }
                          finalName = `${baseName}${taskChapter ? ` - ${taskChapter}` : ""}`;
                        }

                        const start = new Date(dragSelection.day);
                        if (modalStartTime) {
                          const [sh, sm] = modalStartTime
                            .split(":")
                            .map(Number);
                          start.setHours(sh, sm, 0, 0);
                        } else {
                          const startMinsTotal = Math.round(
                            dragSelection.startHour * 60,
                          );
                          let sh = Math.floor(startMinsTotal / 60);
                          let sm = startMinsTotal % 60;
                          if (sh >= 24) {
                            sh = 23;
                            sm = 59;
                          }
                          start.setHours(sh, sm, 0, 0);
                        }

                        const end = new Date(dragSelection.day);
                        if (modalEndTime) {
                          const [eh, em] = modalEndTime.split(":").map(Number);
                          end.setHours(eh, em, 0, 0);
                        } else {
                          const endMinsTotal = Math.round(
                            dragSelection.endHour * 60,
                          );
                          let eh = Math.floor(endMinsTotal / 60);
                          let em = endMinsTotal % 60;
                          if (eh >= 24) {
                            eh = 23;
                            em = 59;
                          }
                          end.setHours(eh, em, 0, 0);
                        }
                        if (end < start) {
                          end.setDate(end.getDate() + 1);
                        }

                        const durationMins = Math.round(
                          (dragSelection.endHour - dragSelection.startHour) *
                            60,
                        );
                        let baseXpPerHour = 120; // 120 XP per hour by default
                        if (
                          taskSubject === "Mathematics" ||
                          (taskSubject &&
                            taskSubject.toLowerCase().includes("math"))
                        ) {
                          baseXpPerHour = 150; // 150 XP per hour for Mathematics
                        }
                        let reward = Math.max(
                          10,
                          Math.round((durationMins / 60) * baseXpPerHour),
                        );

                        // Priority multiplier
                        if (taskPriority === "High")
                          reward = Math.round(reward * 1.5);
                        else if (taskPriority === "Low")
                          reward = Math.round(reward * 0.8);

                        let lecNumParsed: number | undefined = undefined;
                        if (taskType === "Lecture") {
                          const lecNumStr = hasEditedLecture
                            ? lectureNumberInput
                            : predictNextLecture(
                                taskSubject || "",
                                taskChapter || "",
                                todos,
                                history,
                                syllabus,
                              );
                          if (lecNumStr) lecNumParsed = parseInt(lecNumStr);
                        }

                        const newTask = {
                          id: Date.now(),
                          text: finalName,
                          completed: false,
                          xpReward: reward,
                          type: taskType,
                          subject:
                            taskSubject === "General" ? undefined : taskSubject,
                          chapter: taskChapter || undefined,
                          lectureNumber: lecNumParsed,
                          startTime: start.toISOString(),
                          endTime: end.toISOString(),
                          priority: taskPriority,
                          durationMinutes: durationMins,
                        };

                        const isDuplicate = todos.some(
                          (t) =>
                            t.id === newTask.id ||
                            (t.text === newTask.text &&
                              t.type === newTask.type &&
                              t.subject === newTask.subject &&
                              t.chapter === newTask.chapter &&
                              !t.completed),
                        );
                        if (!isDuplicate) {
                          setCalendarTodos([...todos, newTask]);
                        }
                        setShowTaskModal(false);
                        setDragSelection(null);
                        setTaskName("");
                        showToast("Session created!", "success");

                        setUnsyncedChanges(true);
                      }}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all"
                    >
                      Create Session
                    </button>
                  </div>
                </motion.div>

                {/* Floating Card 2: Dedicated Chapters Card (showing next to it when Physics/Chemistry/Maths is selected) */}
                {["Physics", "Chemistry", "Mathematics"].includes(
                  taskSubject || "",
                ) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20 }}
                    className="hidden lg:flex bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex-col max-h-[90vh] md:max-h-[85vh] justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-md text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                          Chapters: {taskSubject}
                        </h4>
                        <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                          Track & Select
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Chapters shifted with active study chapter at the top.
                        Selecting a chapter updates the session on the left.
                      </p>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide min-h-0">
                      {/* No Chapter option */}
                      <button
                        onClick={() => {
                          setTaskChapter("");
                          setHasEditedLecture(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                          !taskChapter
                            ? "bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                            : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        No Chapter (General Session)
                      </button>

                      {(() => {
                        const currentChName = getCurrentChapterForSubject(
                          taskSubject || "",
                        );
                        const chapters =
                          syllabus[
                            (taskSubject || "") as keyof typeof syllabus
                          ] || [];
                        const shiftedChapters = [...chapters];
                        if (currentChName) {
                          const idx = shiftedChapters.findIndex(
                            (c) => c.name === currentChName,
                          );
                          if (idx !== -1) {
                            const [found] = shiftedChapters.splice(idx, 1);
                            shiftedChapters.unshift(found);
                          }
                        }

                        return shiftedChapters.map((ch) => {
                          const isCurrent = ch.name === currentChName;
                          const isSelected = taskChapter === ch.name;
                          const statusColor =
                            ch.status === "green"
                              ? "bg-emerald-500"
                              : ch.status === "yellow"
                                ? "bg-amber-500"
                                : ch.status === "red"
                                  ? "bg-rose-500"
                                  : "bg-slate-400";

                          return (
                            <button
                              key={ch.name}
                              onClick={() => {
                                setTaskChapter(ch.name);
                                setHasEditedLecture(false);
                              }}
                              className={`w-full text-left relative p-3 rounded-xl border transition-all duration-300 flex flex-col ${
                                isSelected
                                  ? "bg-indigo-600/15 dark:bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/5"
                                  : "bg-white/[0.02] dark:bg-black/10 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:bg-white/5 hover:bg-white/[0.04]"
                              }`}
                            >
                              {isCurrent && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-indigo-600 text-[8px] font-bold uppercase tracking-wider rounded text-white shadow-sm">
                                  📍 CURRENTLY ON
                                </div>
                              )}

                              <div className="flex items-start justify-between gap-2 w-full">
                                <div className="flex-1 min-w-0 text-left">
                                  <p
                                    className={`text-xs font-bold truncate pr-16 ${isSelected ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-200"}`}
                                  >
                                    {ch.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${statusColor}`}
                                    />
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                      {ch.status === "green"
                                        ? "Completed"
                                        : ch.status === "yellow"
                                          ? "Moderate"
                                          : ch.status === "red"
                                            ? "Weak"
                                            : "Not Started"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      • Tier {ch.tier}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 block">
                                    {ch.accuracy}% Acc
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Sidebar (Slide-over drawer) */}
        <AnimatePresence>
          {showMobileSidebar && (
            <div className="fixed inset-0 z-[120] flex md:hidden">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileSidebar(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
              />
              {/* Drawer Content */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="relative flex flex-col w-80 max-w-xs h-full dark:bg-[#080d16] bg-white border-r border-slate-200 dark:border-slate-800/60 p-6 overflow-y-auto shadow-2xl z-10 scrollbar-hide space-y-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-indigo-600 dark:text-indigo-400">
                    <CalendarIcon className="w-5 h-5" />
                    Schedule
                  </h1>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="p-1.5 dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400 hover:dark:text-white" />
                  </button>
                </div>

                {renderSidebarContents("mobile")}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-slate-200 dark:border-white/5 flex-col flex-shrink-0 dark:bg-[#070b12] bg-slate-50 order-2 md:order-1 h-full min-h-0">
          <div className="p-6 pb-2 flex-shrink-0">
            <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
              Schedule
            </h1>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-calendar-scrollbar min-h-0">
            {renderSidebarContents("desktop")}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#121212] order-1 md:order-2 h-full min-h-0">
          {/* Header */}
          <div className="min-h-[80px] py-4 md:py-0 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between px-4 md:px-6 bg-white dark:bg-[#1A1A1A] gap-4 shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden p-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors mr-1"
                title="Open Schedule Sidebar"
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="hidden sm:block px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Today
              </button>
              <div className="flex gap-1">
                <button
                  onClick={handlePrev}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight min-w-[150px]">
                {view === "Month"
                  ? format(currentDate, "MMMM yyyy")
                  : view === "Day"
                    ? format(currentDate, "MMMM d, yyyy")
                    : `${format(visibleDays[0], "MMM d")} – ${format(visibleDays[visibleDays.length - 1], "MMM d, yyyy")}`}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleCalendarSync(true)}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:animate-none ${
                  unsyncedChanges
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse"
                    : "bg-indigo-500/80 hover:bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)]"
                }`}
              >
                {isSyncing ? "Syncing..." : "Apply Timeline"}
              </button>
              <div className="flex bg-slate-100 dark:bg-black/50 p-1 rounded-xl">
                {(["Day", "3 Days", "Week", "Month"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${view === v ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 md:px-3 md:py-2 bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 rounded-xl transition-all flex items-center justify-center shrink-0 ml-1 font-semibold gap-1.5 text-xs md:text-sm"
                  title="Close Fullscreen Calendar"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              )}
            </div>
          </div>

          {/* Calendar Body */}
          <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={view + "-" + currentDate.toISOString()}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {view === "Month" ? renderMonthGrid() : renderTimeline()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[200]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
                toastType === "success"
                  ? "bg-emerald-600 text-white"
                  : toastType === "error"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800 text-white"
              }`}
            >
              {toastMessage}
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
