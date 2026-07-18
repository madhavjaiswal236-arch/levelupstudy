import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, Search, CheckCircle2, Zap, AlertCircle, Atom, Beaker, Sigma, Check, ArrowRight
} from 'lucide-react';
import { getAccessToken, googleSignIn } from "../lib/firebase";
import { useAppContext, Todo } from '../context/AppContext';
import { rescheduleCalendarEvents, createCalendarEvent, updateCalendarEventTime, deleteCalendarEvent, fetchGoogleCalendarEvents } from '../lib/calendar';
import { format, addDays, startOfWeek, isSameDay, startOfDay, getDay, endOfMonth, startOfMonth, parseISO, addMonths } from 'date-fns';
import { predictNextLecture } from '../lib/utils';


const COLORS: Record<string, string> = {
  Physics: 'bg-indigo-100 border border-indigo-300 text-indigo-900 shadow-sm dark:border-indigo-500/50 dark:text-indigo-200 dark:bg-indigo-900/60 hover:border-indigo-500 hover:shadow-md',
  Chemistry: 'bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:text-emerald-200 dark:bg-emerald-900/60 hover:border-emerald-500 hover:shadow-md',
  Mathematics: 'bg-amber-100 border border-amber-300 text-amber-900 shadow-sm dark:border-amber-500/50 dark:text-amber-200 dark:bg-amber-900/60 hover:border-amber-500 hover:shadow-md',
  Personal: 'bg-rose-100 border border-rose-300 text-rose-900 shadow-sm dark:border-rose-500/50 dark:text-rose-200 dark:bg-rose-900/60 hover:border-rose-500 hover:shadow-md',
  Default: 'bg-slate-100 border border-slate-300 text-slate-900 shadow-sm dark:border-slate-500/50 dark:text-slate-200 dark:bg-slate-800/60 hover:border-slate-500 hover:shadow-md'
};

export function StudyCalendar({ onClose, dailyXpRequired = 100, onToggleTodo }: { onClose?: () => void, dailyXpRequired?: number, onToggleTodo?: (id: any) => void }) {
    const { todos, setTodos, syllabus, xpGainedToday, dailyTarget, hoursStudiedToday, totalXpGoal, class11EndDate, xp, history } = useAppContext();

  


  const [toastMessage, setToastMessage] = useState("");

  const [currentLocalTime, setCurrentLocalTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentLocalTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [toastType, setToastType] = useState<"success" | "info" | "error">("info");
  
  const showToast = (msg: string, type: "success" | "info" | "error" = "info") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 5000);
  };

  const [activeCalendars, setActiveCalendars] = useState<string[]>(['Physics', 'Chemistry', 'Mathematics', 'Personal', 'General']);
  const [view, setView] = useState<'Day' | '3 Days' | 'Week' | 'Month'>('Week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  
  const dragInitialScroll = useRef(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  
  // Computed Days
  useEffect(() => {
    let isMounted = true;
    const sync = async () => {
      try {
        const events = await fetchGoogleCalendarEvents(addDays(new Date(), -14), addDays(new Date(), 30));
        if (!isMounted || !events || events.length === 0) return;
        
        setTodos(prev => {
          let updated = false;
          const next = prev.map(t => {
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
      } catch(err) {
         console.error("Failed to background sync calendar", err);
      }
    };
    
    sync();
    const interval = setInterval(sync, 15000); // Poll every 15 seconds while calendar is open
    return () => { isMounted = false; clearInterval(interval); };
  }, [setTodos]);
  
  const visibleDays = useMemo(() => {
    if (view === 'Day') return [startOfDay(currentDate)];
    if (view === '3 Days') {
      const today = startOfDay(currentDate);
      return [today, addDays(today, 1), addDays(today, 2)];
    }
    if (view === 'Week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }
    // Month view handled separately
    return [];
  }, [view, currentDate]);

  const scheduledEvents = useMemo(() => {
    return todos
      .filter(t => activeCalendars.includes(t.subject || 'General'))
      .filter(t => t.startTime && t.endTime)
      .map(t => {
        const start = new Date(t.startTime as string);
        const end = new Date(t.endTime as string);
        return {
          id: t.id,
          title: t.text,
          subject: t.subject || 'Default',
          calendarEventId: t.calendarEventId,
          start,
          end,
          completed: t.completed,
          todo: t,
        };
      });
  }, [todos]);

  const unscheduledTasks = useMemo(() => {
    return todos
      .filter(t => activeCalendars.includes(t.subject || 'General')).filter(t => !t.startTime || !t.endTime).filter(t => !t.completed);
  }, [todos]);

  const handlePrev = () => {
    if (view === 'Day') setCurrentDate(prev => addDays(prev, -1));
    else if (view === '3 Days') setCurrentDate(prev => addDays(prev, -3));
    else if (view === 'Week') setCurrentDate(prev => addDays(prev, -7));
    else if (view === 'Month') setCurrentDate(prev => addMonths(prev, -1));
  };

  const handleNext = () => {
    if (view === 'Day') setCurrentDate(prev => addDays(prev, 1));
    else if (view === '3 Days') setCurrentDate(prev => addDays(prev, 3));
    else if (view === 'Week') setCurrentDate(prev => addDays(prev, 7));
    else if (view === 'Month') setCurrentDate(prev => addMonths(prev, 1));
  };


  // Drag to create
  const [dragSelection, setDragSelection] = useState<{ day: Date, startHour: number, endHour: number, isDragging: boolean } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskSubject, setTaskSubject] = useState("General");
  const [taskName, setTaskName] = useState("");

  const [modalStartTime, setModalStartTime] = useState("");
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [modalEndTime, setModalEndTime] = useState("");

  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  
  useEffect(() => {
    if (editingEvent) {
      const sh = editingEvent.start.getHours();
      const sm = editingEvent.start.getMinutes();
      setEditStartTime(`${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`);
      
      const eh = editingEvent.end.getHours();
      const em = editingEvent.end.getMinutes();
      setEditEndTime(`${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`);
    }
  }, [editingEvent]);

  
  useEffect(() => {
    if (showTaskModal && dragSelection && !dragSelection.isDragging) {
      const sh = Math.floor(dragSelection.startHour);
      const sm = Math.round((dragSelection.startHour % 1) * 60);
      setModalStartTime(`${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`);
      
      const eh = Math.floor(dragSelection.endHour);
      const em = Math.round((dragSelection.endHour % 1) * 60);
      setModalEndTime(`${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`);
    }
  }, [showTaskModal, dragSelection]);

  const [resizingEventId, setResizingEventId] = useState<number | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [, setResizingDeltaMins] = useState<number>(0);
  const [resizeStartHeight, setResizeStartHeight] = useState<number>(0);
  const [resizeStartY, setResizeStartY] = useState<number>(0);


  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [taskChapter, setTaskChapter] = useState("");
  const [taskType, setTaskType] = useState("Lecture");
  const [lectureNumberInput, setLectureNumberInput] = useState<string>("");
  const [hasEditedLecture, setHasEditedLecture] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    if (!autoSelected && showTaskModal && (todos.length > 0 || history.length > 0)) {
      let recentTasks = [...todos].reverse();
      if (recentTasks.length === 0) {
        recentTasks = [...history].flatMap(h => h.completedTasks || []).reverse();
      }
      
      const lastTask = recentTasks.find(t => t.subject && t.chapter);
      if (lastTask && lastTask.subject && lastTask.chapter) {
        setTaskSubject(lastTask.subject);
        setTaskChapter(lastTask.chapter);
        setAutoSelected(true);
      }
    }
    if (!showTaskModal) {
      setAutoSelected(false);
    }
  }, [showTaskModal, todos, history, autoSelected]);
  
  useEffect(() => {
    const scrollToTime = () => {
      const container = document.getElementById('calendar-scroll-container');
      if (container && view !== 'Month') {
        const nowLocal = new Date();
        const currentHour = nowLocal.getHours() + nowLocal.getMinutes() / 60;
        const targetScroll = Math.max(0, (currentHour) * 80 - 200);
        container.scrollTo({ top: targetScroll, behavior: 'auto' });
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

    if (taskSubject === 'General' || taskSubject === 'Personal' || taskSubject === 'Personal') return [];
    const subj = syllabus[taskSubject as keyof typeof syllabus];
    return subj ? subj : [];
  }, [taskSubject, syllabus]);


  // Drag and Drop State
  const [dragEventId, setDragEventId] = useState<number | null>(null);
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedChanges, setUnsyncedChanges] = useState(false);

  

  const ensureCalendarAuth = async () => {
    let token = await getAccessToken();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!token && !isMobile) {
      showToast("Google Calendar not loaded. Opening login page...", "success");
      const loginRes = await googleSignIn();
      if (!loginRes) {
        throw new Error("Google Calendar login cancelled or failed.");
      }
    }
  };

  const handleCalendarSync = async () => {
    setIsSyncing(true);
    setUnsyncedChanges(false);
    
    let allSuccess = true;
    let errorMessage = "";
    try {
        await ensureCalendarAuth();
        
        // Update existing events
        const eventsToUpdate = todos.filter(t => t.calendarEventId && t.startTime && t.endTime).map(t => ({
            eventId: t.calendarEventId!,
            startTime: new Date(t.startTime!),
            endTime: new Date(t.endTime!)
        }));
        if (eventsToUpdate.length > 0) {
            const updateSuccess = await rescheduleCalendarEvents(eventsToUpdate);
            if (!updateSuccess) allSuccess = false;
        }

        // Create new events
        const eventsToCreate = todos.filter(t => !t.calendarEventId && t.startTime && t.endTime);
        const newTodos = [...todos];
        for (const t of eventsToCreate) {
            try {
                const durationMinutes = (new Date(t.endTime!).getTime() - new Date(t.startTime!).getTime()) / 60000;
                const result = await createCalendarEvent(t.text, durationMinutes, t.type || 'Lecture', false, newTodos, new Date(t.startTime!), new Date(t.endTime!));
                const index = newTodos.findIndex(td => td.id === t.id);
                if (index !== -1 && result && result.id) {
                    newTodos[index] = { ...newTodos[index], calendarEventId: result.id };
                }
            } catch(e) {
                console.error(e);
                allSuccess = false;
            }
        }
        setTodos(newTodos);
        
    } catch(e: any) {
        console.error(e);
        allSuccess = false;
        errorMessage = e.message || "Failed to apply all changes to Google Calendar.";
    }
    if (allSuccess) {
       showToast("Timeline applied successfully!", "success");
       setUnsyncedChanges(false);
    } else {
       showToast(errorMessage || "Failed to apply all changes to Google Calendar.", "error");
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
      const futureEvents = scheduledEvents.filter(e => e.end > new Date());
      if (futureEvents.length > 0) {
        latestEnd = new Date(Math.max(...futureEvents.map(e => e.end.getTime())));
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
    
    const updatedTodos = todos.map(t => 
      t.id === task.id ? { ...t, startTime: currentStart.toISOString(), endTime: end.toISOString() } : t
    );
    
    setTodos(updatedTodos);
    showToast(`Scheduled ${task.text} for ${format(currentStart, 'h:mm a')}`, "success");
    
    try {
      await ensureCalendarAuth();
                        const res = await createCalendarEvent(task.text, durationMins, task.type || 'Lecture', false, updatedTodos, currentStart, end);
      if (res && res.id) {
         setTodos(updatedTodos.map(t => t.id === task.id ? { ...t, calendarEventId: res.id } : t));
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
      const futureEvents = scheduledEvents.filter(e => e.end > new Date());
      if (futureEvents.length > 0) {
        latestEnd = new Date(Math.max(...futureEvents.map(e => e.end.getTime())));
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
      
      const tIndex = updatedTodos.findIndex(t => t.id === task.id);
      if (tIndex >= 0) {
        updatedTodos[tIndex] = { 
          ...updatedTodos[tIndex], 
          startTime: currentStart.toISOString(), 
          endTime: end.toISOString() 
        };
      }
      
      // Try pushing to google calendar
      try {
        await ensureCalendarAuth();
                        const res = await createCalendarEvent(task.text, durationMins, task.type || 'Lecture', false, updatedTodos, currentStart, end);
        if (res && res.id) {
           updatedTodos[tIndex].calendarEventId = res.id;
        }
      } catch (err: any) {
        console.error("Calendar sync error:", err);
      }
      
      currentStart = new Date(end.getTime() + 10 * 60000); // 10 min break
    }
    
    setTodos(updatedTodos);
    showToast("Study plan generated!", "success");
  };

  const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

  const renderTimeline = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header Row (Sticky) */}
      <div className="flex flex-shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] z-[70]">
        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 flex justify-center items-end pb-2 h-12 bg-white dark:bg-[#121212]">
          <span className="text-[10px] text-slate-400 font-bold">TIME</span>
        </div>
        <div 
          id="calendar-header-scroll" 
          className="flex-1 overflow-hidden flex"
        >
          <div className="flex flex-1 min-w-[600px]">
            {visibleDays.map(d => (
              <div key={d.getTime()} className="flex-1 flex items-center justify-center border-r border-slate-200 dark:border-white/5 relative gap-1.5 h-12">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(d, currentDate) ? 'text-indigo-400' : isSameDay(d, new Date()) ? 'text-indigo-500' : 'text-slate-400'}`}>{format(d, 'EEE')}</span>
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${isSameDay(d, currentDate) ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.9)]' : isSameDay(d, new Date()) ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {format(d, 'd')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div 
        id="calendar-scroll-container" 
        className="flex-1 overflow-y-auto overflow-x-auto relative flex scrollbar-hide min-h-0"
        onScroll={(e) => {
          const header = document.getElementById('calendar-header-scroll');
          if (header) header.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
        }}
      >
        {/* Time Column */}
        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 sticky left-0 z-[55] bg-white dark:bg-[#121212]">
          {hours.map(hour => (
            <div key={hour} className="h-20 text-xs text-slate-500 flex justify-center pr-2 pt-2 relative border-b border-slate-100 dark:border-white/5 border-dashed">
              <span className="relative -top-2.5 bg-white dark:bg-[#121212] px-1">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : hour === 0 ? '12 AM' : `${hour} AM`}
              </span>
            </div>
          ))}
          {/* Supreme Time Capsule */}
          <div 
            className="absolute left-0 w-full flex justify-center items-center z-[50] pointer-events-none"
            style={{ top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px`, transform: 'translateY(-50%)' }}
          >
            <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_4px_12px_rgba(79,70,229,0.9)] border border-indigo-400/30">
              {format(currentLocalTime, 'h:mm a')}
            </div>
          </div>
        </div>
        
        {/* Days Grid */}
        <div className="flex-1 flex flex-col relative min-w-[600px]">
          {/* Grid Body */}
          <div className="relative flex-1" style={{ height: `${hours.length * 80}px`, minHeight: `${hours.length * 80}px` }}>
          {/* Supreme Line (Current Time) */}
          <div 
            className="absolute w-full h-[2px] bg-indigo-600 z-[45] pointer-events-none shadow-[0_4px_12px_rgba(79,70,229,0.9)]" 
            style={{ top: `${(currentLocalTime.getHours() + currentLocalTime.getMinutes() / 60) * 80}px` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 absolute -left-[5px] -top-[4px] shadow-[0_0_10px_rgba(79,70,229,1)]" />
          </div>
          {hours.map(hour => (
            <div key={`grid-${hour}`}>
              <div className="absolute w-full h-[1px] bg-slate-200 dark:bg-white/10" style={{ top: `${(hour) * 80}px` }} />
              {hour < hours[hours.length - 1] && (
                <div className="absolute w-full h-[1px] border-b border-dashed border-slate-100 dark:border-white/5" style={{ top: `${(hour) * 80 + 40}px` }} />
              )}
            </div>
          ))}
          
          {visibleDays.map((d, colIndex) => (
             <div 
               key={`col-${d.getTime()}`} 
               className="absolute h-full border-r border-slate-200 dark:border-white/5 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" 
               style={{ left: `${colIndex * (100 / visibleDays.length)}%`, width: `${100 / visibleDays.length}%` }}
               onPointerDown={(e) => {
                 if (e.button !== 0) return; // Only left click
                 if (e.pointerType === 'touch') return; // Let browser handle touch scrolling, click event will catch tap
                 
                 e.preventDefault();
                 const target = e.currentTarget;
                 target.setPointerCapture(e.pointerId);
                 document.body.classList.add('is-dragging');
                 
                 const rect = target.getBoundingClientRect();
                 const y = e.clientY - rect.top;
                 
                 // Snap start to nearest minute
                 const rawStartHour = (y / 80);
                 const startHour = Math.floor(rawStartHour * 12) / 12;
                 
                 setDragSelection({ day: d, startHour, endHour: startHour + 0.5, isDragging: true });
                 
                 const container = document.getElementById('calendar-scroll-container');
                 const startScrollY = container ? container.scrollTop : 0;
                 let scrollInterval: any = null;
                 
                 const updateGridDrag = (currentClientY: number) => {
                   const currentScrollY = container ? container.scrollTop : 0;
                   const scrollDiff = currentScrollY - startScrollY;
                   const moveY = (currentClientY - rect.top) + scrollDiff;
                   
                   let rawEndHour = (moveY / 80);
                   let currentEndHour = Math.round(rawEndHour * 12) / 12;
                   if (currentEndHour <= startHour + 0.25) currentEndHour = startHour + 0.25; // min 15 mins
                   if (currentEndHour > 24) currentEndHour = 24;
                   setDragSelection({ day: d, startHour, endHour: currentEndHour, isDragging: true });
                 };
                 
                 const handlePointerMove = (moveEvent: React.PointerEvent | PointerEvent) => {
                   updateGridDrag(moveEvent.clientY);
                   
                   if (container) {
                       const contRect = container.getBoundingClientRect();
                       const y = moveEvent.clientY;
                       if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
                       if (y < contRect.top + 50) {
                           scrollInterval = setInterval(() => { container.scrollTop -= 15; updateGridDrag(moveEvent.clientY); }, 16);
                       } else if (y > contRect.bottom - 50) {
                           scrollInterval = setInterval(() => { container.scrollTop += 15; updateGridDrag(moveEvent.clientY); }, 16);
                       }
                   }
                 };
                 
                 const handlePointerUp = () => {
                   if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
                   target.releasePointerCapture(e.pointerId);
                   target.removeEventListener('pointermove', handlePointerMove as EventListener);
                   target.removeEventListener('pointerup', handlePointerUp as EventListener);
                   setDragSelection(prev => prev ? { ...prev, isDragging: false } : null);
                   setShowTaskModal(true);
                   document.body.classList.remove('is-dragging');
                 };
                 
                 target.addEventListener('pointermove', handlePointerMove as EventListener);
                 target.addEventListener('pointerup', handlePointerUp as EventListener);
               }}
               onClick={() => {
                   if (!dragSelection || !dragSelection.isDragging) {
                       // simple click
                   }
               }}
             />
          ))}
          
          {/* Drag Selection Visual */}
          {dragSelection && (
            <div 
              className="absolute bg-indigo-500/20 border-2 border-indigo-500 rounded-xl pointer-events-none z-40 shadow-sm"
              style={{
                left: `calc(${visibleDays.findIndex(d => isSameDay(d, dragSelection.day)) * (100 / visibleDays.length)}% + 4px)`,
                width: `calc(${100 / visibleDays.length}% - 8px)`,
                top: `${(dragSelection.startHour) * 80}px`,
                height: `${(dragSelection.endHour - dragSelection.startHour) * 80}px`
              }}
            />
          )}

          {/* Events */}
          {scheduledEvents.filter(ev => visibleDays.some(vd => isSameDay(vd, ev.start))).map((ev) => {
            const dayIndex = visibleDays.findIndex(vd => isSameDay(vd, ev.start));
            if (dayIndex === -1) return null;
            
            const startHour = ev.start.getHours() + ev.start.getMinutes() / 60;
            const duration = (ev.end.getTime() - ev.start.getTime()) / 3600000;
            const colorClass = COLORS[ev.subject] || COLORS['Default'];
            
            return (
              <div
                key={ev.id}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).closest('[data-resize-handle="true"]') || (e.target as HTMLElement).closest('[data-delete-btn="true"]') || (e.target as HTMLElement).closest('[data-checkbox="true"]')) return;
                  
                  e.stopPropagation();
                  e.preventDefault();
                  
                  const target = e.currentTarget;
                  target.setPointerCapture(e.pointerId);
                  
                  setIsDraggingEvent(true);
                  setDragEventId(ev.id);
                  document.body.classList.add('is-dragging');
                  
                  const startY = e.clientY;
                  const originalStartTime = ev.start.getTime();
                  const originalEndTime = ev.end.getTime();
                  const durationMilli = originalEndTime - originalStartTime;
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    moveEvent.preventDefault();
                    const deltaY = moveEvent.clientY - startY;
                    const deltaMins = deltaY / (80 / 60);
                    
                    let newDeltaMins = Math.round(deltaMins);
                    
                    const minDeltaMins = - (startHour) * 60; 
                    const maxDeltaMins = (24 - (startHour + duration)) * 60; 
                    
                    if (newDeltaMins < minDeltaMins) newDeltaMins = minDeltaMins;
                    if (newDeltaMins > maxDeltaMins) newDeltaMins = maxDeltaMins;
                    
                    const newStart = new Date(originalStartTime + newDeltaMins * 60000);
                    const newEnd = new Date(originalStartTime + newDeltaMins * 60000 + durationMilli);
                    
                    setTodos(prev => prev.map(t => 
                      t.id === ev.id ? { ...t, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : t
                    ));
                  };
                  
                  const handlePointerUp = () => {
                    setIsDraggingEvent(false);
                    setDragEventId(null);
                    setUnsyncedChanges(true);
                    document.body.classList.remove('is-dragging');
                    target.releasePointerCapture(e.pointerId);
                    target.removeEventListener('pointermove', handlePointerMove as EventListener);
                    target.removeEventListener('pointerup', handlePointerUp as EventListener);
                  };
                  
                  target.addEventListener('pointermove', handlePointerMove as EventListener, { passive: false });
                  target.addEventListener('pointerup', handlePointerUp as EventListener);
                }}
                className={`absolute rounded-xl px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing border ${colorClass} ${dragEventId === ev.id ? 'opacity-50 scale-[0.98] z-50 shadow-lg' : 'z-40 shadow-sm'} transition-transform group`}
                style={{ 
                  left: `calc(${dayIndex * (100 / visibleDays.length)}% + 4px)`,
                  width: `calc(${100 / visibleDays.length}% - 8px)`,
                  top: `${(startHour) * 80}px`,
                  height: `${duration * 80 - 2}px`
                }}
              >
                
                {/* Delete button (visible on hover) */}
                <button
                  data-delete-btn="true"
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setTodos(prev => prev.filter(t => t.id !== ev.id));
                    setUnsyncedChanges(true);
                    if ((ev as any).calendarEventId) {
                      deleteCalendarEvent((ev as any).calendarEventId).catch(console.error);
                    }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/20 hover:bg-black/40 dark:bg-white/20 dark:hover:bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[60]"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                
                <div className="flex flex-col h-full overflow-hidden pointer-events-none">
                  {/* Subject and Type */}
                  <div className="flex items-center gap-1 mb-1 opacity-90 text-[8px] uppercase tracking-widest font-bold">
                    {ev.subject === 'Physics' && <Atom className="w-2.5 h-2.5" />}
                    {ev.subject === 'Chemistry' && <Beaker className="w-2.5 h-2.5" />}
                    {ev.subject === 'Mathematics' && <Sigma className="w-2.5 h-2.5" />}
                    {ev.todo?.type || 'TASK'}
                  </div>
                  
                  {/* Title and Checkbox */}
                  <div className="flex items-start gap-1.5 mb-1.5 pointer-events-auto">
                    <div 
                      data-checkbox="true"
                      className={`w-3 h-3 mt-[1px] rounded-sm border flex-shrink-0 flex items-center justify-center cursor-pointer ${ev.completed ? 'bg-current border-current text-white' : 'border-current opacity-50 hover:opacity-100'}`}
                      onPointerDown={(e) => { e.stopPropagation(); if (onToggleTodo) onToggleTodo(ev.id); else setTodos(prev => prev.map(t => t.id === ev.id ? { ...t, completed: !t.completed } : t)); }}
                    >
                      {ev.completed && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <p className={`text-[11px] font-bold leading-tight ${view === 'Week' ? '' : 'line-clamp-2'} pr-5 pointer-events-none`}>{ev.title}</p>
                  </div>
                  
                  {/* Time and Duration/XP */}
                  {view !== 'Week' && (
                    <div className="mt-auto flex flex-col gap-0.5 opacity-90">
                      <p className="text-[9px] font-medium flex items-center gap-1">
                        {format(ev.start, 'h:mm a')} <ArrowRight className="w-2 h-2" /> {format(ev.end, 'h:mm a')}
                      </p>
                      <p className="text-[9px] font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> 
                        {Math.floor(duration) > 0 ? `${Math.floor(duration)}h ` : ''}{Math.round((duration % 1) * 60)}m 
                        <span className="font-bold text-yellow-600 dark:text-yellow-400 ml-1">+{Math.round(duration * (ev.subject === 'Physics' ? 60 : ev.subject === 'Mathematics' ? 65 : ev.subject === 'Chemistry' ? 50 : ev.subject === 'Biology' ? 50 : 40))} XP</span>
                      </p>
                    </div>
                  )}
                </div>
                <div 
                  data-resize-handle="true"
                  className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end pb-1 justify-center opacity-0 hover:opacity-100 transition-opacity ${resizingEventId === ev.id ? 'opacity-100 bg-black/10 dark:bg-white/10' : 'hover:bg-black/10 dark:hover:bg-white/10'} touch-none z-[60]`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopPropagation();
                    e.preventDefault();
                    
                    const target = e.currentTarget;
                    target.setPointerCapture(e.pointerId);
                    document.body.classList.add('is-dragging');
                    
                    const startY = e.clientY;
                    const originalDurationMins = duration * 60;
                    setResizingEventId(ev.id);
                    
                    const handlePointerMove = (moveEvent: PointerEvent | React.PointerEvent) => {
                      moveEvent.preventDefault();
                      const deltaY = moveEvent.clientY - startY;
                      let rawDeltaMins = deltaY / (80 / 60);
                      let newDurationMins = originalDurationMins + rawDeltaMins;
                      
                      if (newDurationMins < 15) newDurationMins = 15; // Minimum 15 minutes
                      newDurationMins = Math.round(newDurationMins);
                      
                      const maxDurationMins = (24 - startHour) * 60;
                      if (newDurationMins > maxDurationMins) newDurationMins = maxDurationMins;
                      
                      const newEnd = new Date(ev.start.getTime() + newDurationMins * 60000);
                      
                      setTodos(prev => {
                        return prev.map(t => 
                          t.id === ev.id ? { ...t, endTime: newEnd.toISOString() } : t
                        );
                      });
                    };
                    
                    const handlePointerUp = (upEvent: PointerEvent | React.PointerEvent) => {
                      setResizingEventId(null);
                      setUnsyncedChanges(true);
                      document.body.classList.remove('is-dragging');
                      target.releasePointerCapture(e.pointerId);
                      target.removeEventListener('pointermove', handlePointerMove as EventListener);
                      target.removeEventListener('pointerup', handlePointerUp as EventListener);
                    };
                    
                    target.addEventListener('pointermove', handlePointerMove as EventListener, { passive: false });
                    target.addEventListener('pointerup', handlePointerUp as EventListener);
                  }}
                >
                   <div className={`w-6 h-1 rounded-full transition-all ${resizingEventId === ev.id ? 'bg-black/50 dark:bg-white/70 scale-110 shadow-sm' : 'bg-black/20 dark:bg-white/30'}`} />
                </div>
              </div>
            )
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
           {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
             <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
           ))}
        </div>
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
           {daysArr.map(d => {
             const isCurrentMonth = d.getMonth() === currentDate.getMonth();
             const dayEvents = scheduledEvents.filter(ev => isSameDay(ev.start, d));
             return (
               <div key={d.getTime()} className={`border-r border-b border-slate-200 dark:border-white/5 p-2 min-h-[100px] ${!isCurrentMonth ? 'bg-slate-100 dark:bg-white/5 opacity-50' : 'bg-white dark:bg-[#1a1a1a]'}`}>
                 <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isSameDay(d, new Date()) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
                   {d.getDate()}
                 </div>
                 <div className="space-y-1">
                   {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className={`text-[9px] px-1.5 py-0.5 rounded truncate ${COLORS[ev.subject] || COLORS['Default']}`}>
                        {ev.title}
                      </div>
                   ))}
                   {dayEvents.length > 3 && (
                     <div className="text-[10px] text-slate-500 font-medium px-1">+{dayEvents.length - 3} more</div>
                   )}
                 </div>
               </div>
             )
           })}
        </div>
      </div>
    );
  };

  return (
    <div className={onClose ? "fixed inset-0 z-[100] bg-white dark:bg-[#121212] flex items-center justify-center overflow-hidden" : "w-full h-full overflow-hidden"}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full h-full max-w-[1600px] mx-auto dark:bg-[#121212] bg-[#f8f9fa] border border-slate-800 flex flex-col md:flex-row overflow-hidden relative text-slate-800 dark:text-slate-200 font-sans ${onClose ? "rounded-2xl md:rounded-[32px] shadow-2xl" : "rounded-none border-0"}`}
      >
        {onClose && (
          <button onClick={onClose} className="absolute right-4 top-4 z-50 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
        

        {/* Edit Task Modal */}
        <AnimatePresence>
          {editingEvent && (
            <div className="absolute inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[90vh]"
              >
                <button onClick={() => setEditingEvent(null)} className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-10">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
                
                <div className="mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    Edit Session
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {format(editingEvent.start, 'MMMM d, yyyy')}
                  </p>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                      <input 
                        type="time" 
                        value={editStartTime || ""}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      />
                    </div>
                    <div className="text-slate-400 mt-5">to</div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                      <input 
                        type="time" 
                        value={editEndTime || ""}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-5 overflow-y-auto pr-2 scrollbar-hide flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                    <div className="flex gap-2">
                      {(["Low", "Medium", "High"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all border ${
                            taskPriority === p 
                              ? p === "High" ? "bg-rose-500/10 text-rose-600 border-rose-500/50" 
                                : p === "Medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/50" 
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                    <div className="flex flex-wrap gap-2">
                      {['Physics', 'Chemistry', 'Mathematics', 'General', 'Personal'].map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            setTaskSubject(s);
                            setTaskChapter("");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${taskSubject === s ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chapter (Optional)</label>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border dark:border-slate-700 border-slate-200 rounded-xl p-2 bg-slate-50 dark:bg-black/40 grid grid-cols-1 gap-1">
                          <button
                            onClick={() => { setTaskChapter(""); setHasEditedLecture(false); }}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${!taskChapter ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                          >
                            No Chapter
                          </button>
                          {currentSubjectChapters.map(ch => (
                            <button
                              key={ch.name}
                              onClick={() => { setTaskChapter(ch.name); setHasEditedLecture(false); }}
                              className={`text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${taskChapter === ch.name ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                            >
                              {ch.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Lecture', 'Notes', 'Practice', 'DPP', 'Revision', 'PYQs', 'Custom'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTaskType(t)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${taskType === t ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/50' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Name</label>
                    <input 
                      type="text"
                      autoFocus
                      value={taskName || ""}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="Enter task name..."
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </motion.div>
                  
                </div>

                <div className="pt-4 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-white/5 mt-2">
                  <button 
                    onClick={() => {
                       const updatedTodos = todos.filter(t => t.id !== editingEvent.id);
                       setTodos(updatedTodos);
                       if (editingEvent.calendarEventId) {
                         deleteCalendarEvent(editingEvent.calendarEventId).catch(console.error);
                       }
                       setEditingEvent(null);
                       showToast("Event deleted", "success");
                    }}
                    className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-sm font-bold transition-colors"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => setEditingEvent(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!(taskName || '').trim()) {
                        showToast("Please enter a task name", "error");
                        return;
                      }
                      
                      const updatedTodos = todos.map(t => {
                        if (t.id === editingEvent.id) {
                          const newStart = new Date(editingEvent.start);
                          if (editStartTime) {
                            const [sh, sm] = editStartTime.split(':').map(Number);
                            newStart.setHours(sh, sm, 0, 0);
                          }
                          const newEnd = new Date(editingEvent.start);
                          if (editEndTime) {
                            const [eh, em] = editEndTime.split(':').map(Number);
                            newEnd.setHours(eh, em, 0, 0);
                          }
                          
                          setUnsyncedChanges(true);
                          
                          return {
                            ...t,
                            text: (taskName || '').trim(),
                            type: taskType,
                            priority: taskPriority,
                            subject: taskSubject === 'General' ? undefined : taskSubject,
                            chapter: taskChapter || undefined,
                            startTime: newStart.toISOString(),
                            endTime: newEnd.toISOString()
                          };
                        }
                        return t;
                      });
                      setTodos(updatedTodos);
                      setEditingEvent(null);
                      showToast("Event updated", "success");
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Create Task Modal */}
        <AnimatePresence>
          {showTaskModal && dragSelection && !dragSelection.isDragging && (
            <div className="absolute inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <button onClick={() => setShowTaskModal(false)} className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors z-10">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
                
                <div className="mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    New Study Session
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {format(dragSelection.day, 'MMMM d, yyyy')}
                  </p>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                      <input 
                        type="time" 
                        value={modalStartTime || ""}
                        onChange={(e) => setModalStartTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      />
                    </div>
                    <div className="text-slate-400 mt-5">to</div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                      <input 
                        type="time" 
                        value={modalEndTime || ""}
                        onChange={(e) => setModalEndTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-5 overflow-y-auto pr-2 scrollbar-hide flex-1">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                    <div className="flex gap-2">
                      {(["Low", "Medium", "High"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all border ${
                            taskPriority === p 
                              ? p === "High" ? "bg-rose-500/10 text-rose-600 border-rose-500/50" 
                                : p === "Medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/50" 
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                    <div className="flex flex-wrap gap-2">
                      {['Physics', 'Chemistry', 'Mathematics', 'General', 'Personal'].map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            setTaskSubject(s);
                            setTaskChapter("");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${taskSubject === s ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chapter (Optional)</label>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border dark:border-slate-700 border-slate-200 rounded-xl p-2 bg-slate-50 dark:bg-black/40 grid grid-cols-1 gap-1">
                          <button
                            onClick={() => { setTaskChapter(""); setHasEditedLecture(false); }}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${!taskChapter ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                          >
                            No Chapter
                          </button>
                          {currentSubjectChapters.map(ch => (
                            <button
                              key={ch.name}
                              onClick={() => { setTaskChapter(ch.name); setHasEditedLecture(false); }}
                              className={`text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${taskChapter === ch.name ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                            >
                              {ch.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Lecture', 'Notes', 'Practice', 'DPP', 'Revision', 'PYQs', 'Custom'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTaskType(t)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${taskType === t ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/50' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {taskType === 'Lecture' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lecture Number (Optional)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 4"
                        value={(hasEditedLecture ? lectureNumberInput : predictNextLecture(taskSubject || '', taskChapter || '', todos, history, syllabus)) || ''}
                        onChange={(e) => { setLectureNumberInput(e.target.value); setHasEditedLecture(true); }}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      />
                    </motion.div>
                  )}
                  {taskType === 'Custom' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custom Task Name</label>
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

                <div className="pt-4 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-white/5 mt-2">
                  <button 
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      let finalName = "";
                      if (taskType === 'Custom') {
                        if (!(taskName || '').trim()) {
                          showToast("Please enter a custom task name", "error");
                          return;
                        }
                        finalName = (taskName || '').trim();
                      } else {
                        let baseName = taskType;
                        if (taskType === 'Lecture') {
                          const lecNum = (hasEditedLecture ? lectureNumberInput : predictNextLecture(taskSubject || '', taskChapter || '', todos, history, syllabus));
                          if (lecNum) baseName = `Lecture ${lecNum}`;
                        }
                        finalName = `${baseName}${taskChapter ? ` - ${taskChapter}` : ''}`;
                      }
                      
                      const start = new Date(dragSelection.day);
                      if (modalStartTime) {
                        const [sh, sm] = modalStartTime.split(':').map(Number);
                        start.setHours(sh, sm, 0, 0);
                      } else {
                        start.setHours(Math.floor(dragSelection.startHour), Math.round((dragSelection.startHour % 1) * 60), 0, 0);
                      }
                      
                      const end = new Date(dragSelection.day);
                      if (modalEndTime) {
                        const [eh, em] = modalEndTime.split(':').map(Number);
                        end.setHours(eh, em, 0, 0);
                      } else {
                        end.setHours(Math.floor(dragSelection.endHour), Math.round((dragSelection.endHour % 1) * 60), 0, 0);
                      }
                      
                      const durationMins = Math.round((dragSelection.endHour - dragSelection.startHour) * 60);
                      let reward = Math.max(10, Math.round(durationMins * 0.8));
                      
                      // Priority multiplier
                      if (taskPriority === 'High') reward = Math.round(reward * 1.5);
                      else if (taskPriority === 'Low') reward = Math.round(reward * 0.8);
                      
                      let lecNumParsed: number | undefined = undefined;
                      if (taskType === 'Lecture') {
                        const lecNumStr = hasEditedLecture ? lectureNumberInput : predictNextLecture(taskSubject || '', taskChapter || '', todos, history, syllabus);
                        if (lecNumStr) lecNumParsed = parseInt(lecNumStr);
                      }
                      
                      const newTask = {
                        id: Date.now(),
                        text: finalName,
                        completed: false,
                        xpReward: reward,
                        type: taskType,
                        subject: taskSubject === 'General' || taskSubject === 'Personal' ? undefined : taskSubject,
                        chapter: taskChapter || undefined,
                        lectureNumber: lecNumParsed,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        priority: taskPriority
                      };
                      
                      const updatedTodos = [...todos, newTask];
                      setTodos(updatedTodos);
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
            </div>
          )}
        </AnimatePresence>

        {/* Sidebar (Bottom on mobile, Left on Desktop) */}
        <div className="w-full md:w-64 h-[40vh] md:h-auto border-t md:border-t-0 md:border-r border-slate-200 dark:border-white/5 flex flex-col flex-shrink-0 bg-[#0A0A0A] dark:bg-[#111111] text-white order-2 md:order-1">
          <div className="p-6 pb-2">
            <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-indigo-400">
              <CalendarIcon className="w-6 h-6" />
              Schedule
            </h1>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            
            {/* Mini Calendar */}
            <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-sm text-white">{format(currentDate, 'MMMM yyyy')}</h3>
                 <div className="flex gap-1">
                   <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                   <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                 </div>
               </div>
               <div className="grid grid-cols-7 gap-1 text-center text-xs">
                 {['S','M','T','W','T','F','S'].map((d, idx) => <div key={`${d}-${idx}`} className="text-slate-500 font-medium py-1">{d}</div>)}
                 {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
                 {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                   const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                   const isToday = isSameDay(dayDate, new Date());
                   const isSel = isSameDay(dayDate, currentDate);
                   return (
                     <button 
                       key={i} 
                       onClick={() => setCurrentDate(dayDate)}
                       className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center transition-all ${isSel ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20' : isToday ? 'text-indigo-400 font-bold bg-indigo-500/10' : 'text-slate-300 hover:bg-white/10'}`}
                     >
                       {i + 1}
                     </button>
                   )
                 })}
               </div>
            </div>
            
            {/* Today's Progress */}
            <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
              <h3 className="font-bold text-sm mb-4 text-white">Today's Progress</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="4" fill="none" />
                    <circle cx="28" cy="28" r="24" className="stroke-indigo-500 transition-all duration-1000" strokeWidth="4" fill="none" strokeDasharray="150" strokeDashoffset={150 - (150 * Math.min(xpGainedToday / Math.max(dailyXpRequired, 1), 1))} />
                  </svg>
                  <span className="absolute text-xs font-bold text-white">{Math.min(Math.round((xpGainedToday / Math.max(dailyXpRequired, 1)) * 100), 100)}%</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{Math.round(hoursStudiedToday * 10) / 10}h studied</p>
                  <p className="text-xs text-slate-400 mt-0.5">{xpGainedToday} / {dailyXpRequired} XP</p>
                </div>
              </div>
            </div>
            
            {/* Calendars */}
            <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-sm text-white">Calendars</h3>
                 <button className="text-slate-400 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
               </div>
               <div className="space-y-3">
                 {[
                   { name: 'General', color: 'bg-indigo-500' },
                   { name: 'Physics', color: 'bg-blue-500' },
                   { name: 'Chemistry', color: 'bg-emerald-500' },
                   { name: 'Mathematics', color: 'bg-amber-500' },
                   { name: 'Personal', color: 'bg-rose-500' }
                 ].map(cal => (
                   <label key={cal.name} className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded shadow-sm border border-white/10 flex items-center justify-center transition-colors ${activeCalendars.includes(cal.name) ? cal.color : 'bg-transparent'}`}>
                        {activeCalendars.includes(cal.name) && <CheckCircle2 className="w-3 h-3 text-white" />}
                     </div>
                     <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{cal.name}</span>
                     <input 
                       type="checkbox" 
                       className="hidden" 
                       checked={activeCalendars.includes(cal.name)} 
                       onChange={(e) => {
                         if (e.target.checked) {
                           setActiveCalendars([...activeCalendars, cal.name]);
                         } else {
                           setActiveCalendars(activeCalendars.filter(c => c !== cal.name));
                         }
                       }} 
                     />
                   </label>
                 ))}
               </div>
            </div>
            
            {/* Upcoming */}
            <div className="bg-[#18181A] rounded-2xl p-4 border border-white/5 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-sm text-white">Upcoming</h3>
                 <span className="text-[10px] font-bold text-indigo-400 cursor-pointer">View all</span>
               </div>
               <div className="space-y-3">
                  {todos
                    .filter(t => t.startTime && t.endTime && !t.completed && new Date(t.endTime) > new Date())
                    .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
                    .slice(0, 3)
                    .map(t => {
                      const st = new Date(t.startTime!);
                      const colorMap: Record<string, string> = { Physics: 'bg-blue-500', Chemistry: 'bg-emerald-500', Mathematics: 'bg-amber-500', Personal: 'bg-rose-500' };
                      const color = colorMap[t.subject || ''] || 'bg-indigo-500';
                      let timeStr = format(st, 'h:mm a');
                      let dateStr = isSameDay(st, new Date()) ? 'Today' : isSameDay(st, addDays(new Date(), 1)) ? 'Tomorrow' : format(st, 'MMM d');
                      
                      return (
                        <div key={t.id} className="flex items-center gap-3">
                          <div className={`w-1 h-8 rounded-full ${color}`}></div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-slate-200 line-clamp-1">{t.text}</p>
                            <p className="text-[10px] text-slate-500">{dateStr}, {timeStr}</p>
                          </div>
                        </div>
                      )
                    })
                  }
                  {todos.filter(t => t.startTime && t.endTime && !t.completed && new Date(t.endTime) > new Date()).length === 0 && (
                    <p className="text-xs text-slate-500 italic">No upcoming tasks.</p>
                  )}
               </div>
            </div>
            
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#121212] order-1 md:order-2 h-[60vh] md:h-auto">
          
          {/* Header */}
          <div className="min-h-[80px] py-4 md:py-0 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between px-4 md:px-6 bg-white dark:bg-[#1A1A1A] gap-4 shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setCurrentDate(new Date())} className="hidden sm:block px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                Today
              </button>
              <div className="flex gap-1">
                <button onClick={handlePrev} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={handleNext} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight min-w-[150px]">
                {view === 'Month' 
                  ? format(currentDate, 'MMMM yyyy') 
                  : view === 'Day' 
                    ? format(currentDate, 'MMMM d, yyyy')
                    : `${format(visibleDays[0], 'MMM d')} – ${format(visibleDays[visibleDays.length-1], 'MMM d, yyyy')}`
                }
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleCalendarSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:animate-none ${
                  unsyncedChanges 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse' 
                    : 'bg-indigo-500/80 hover:bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)]'
                }`}
              >
                {isSyncing ? "Syncing..." : "Apply Timeline"}
              </button>
              <div className="flex bg-slate-100 dark:bg-black/50 p-1 rounded-xl">
                {(['Day', '3 Days', 'Week', 'Month'] as const).map(v => (
                  <button 
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${view === v ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Calendar Body */}
          {view === 'Month' ? renderMonthGrid() : renderTimeline()}
          
        </div>

        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[200]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
                toastType === 'success' ? 'bg-emerald-600 text-white' : 
                toastType === 'error' ? 'bg-rose-600 text-white' : 
                'bg-slate-800 text-white'
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
