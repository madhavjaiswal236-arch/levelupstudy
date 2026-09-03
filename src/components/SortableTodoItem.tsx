import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";
import { GripVertical, Target, Calendar, Trash2, Clock } from "lucide-react";
import { NeonCheckbox } from "./ui/neon-checkbox";
import { getLogicalDate } from "../context/AppContext";
import { isSameDay, format } from "date-fns";
import { getLocalDateString, getTaskScheduledDate } from "@/lib/utils";

interface SortableTodoItemProps {
  todo: any;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => any;
  key?: any;
}

export const SortableTodoItem = React.memo(function SortableTodoItem({ todo, toggleTodo, deleteTodo }: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    willChange: isDragging ? "transform" : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const checkboxColor = todo.completed
    ? "green"
    : todo.priority === "High"
    ? "rose"
    : todo.priority === "Medium"
    ? "amber"
    : "cyan";

  const scheduledDate = getTaskScheduledDate(todo);
  const todayStr = getLocalDateString();
  const isDifferentDate = Boolean(scheduledDate && scheduledDate !== todayStr);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 md:p-4 rounded-xl border relative overflow-hidden ${
        isDragging
          ? "opacity-60 border-cyan-500 bg-cyan-950/60 shadow-2xl scale-[1.01] cursor-grabbing"
          : "transition-colors duration-200 " +
            (todo.completed
              ? "dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200/50 opacity-60"
              : "dark:bg-black bg-slate-50 dark:border-cyan-500/30 border-cyan-300/40 shadow-md hover:border-cyan-400/60 hover:shadow-md hover:bg-cyan-950/20")
      }`}
    >
      {/* Ambient hover glow line */}
      {!todo.completed && !isDragging && (
        <>
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </>
      )}

      {/* Completion Flash Animation */}
      <AnimatePresence>
        {todo.completed && (
          <motion.div
            key="completion-flash"
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent z-0"
            initial={{ opacity: 1, scaleX: 0, originX: 0 }}
            animate={{ opacity: 0, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Different Date Indication */}
      {isDifferentDate && scheduledDate && (
        <div 
          className="absolute top-1 right-2 flex items-center gap-1 z-20"
          title={`Scheduled for ${scheduledDate}`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${scheduledDate < todayStr ? 'bg-amber-400' : 'bg-cyan-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${scheduledDate < todayStr ? 'bg-amber-500' : 'bg-cyan-500'}`}></span>
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
            scheduledDate < todayStr
              ? "dark:text-amber-400 text-amber-700 bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/20"
              : "dark:text-cyan-400 text-cyan-700 bg-cyan-500/10 dark:bg-cyan-950/40 border-cyan-500/20"
          }`}>
            {todo.backlogDayIndex ? `Day ${todo.backlogDayIndex}` : scheduledDate}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0 relative z-10">
        {/* Drag Handle */}
        {!todo.completed && (
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 transition-colors mr-1"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={() => toggleTodo(todo.id)}
          className="flex items-center gap-4 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-0.5"
        >
          <NeonCheckbox
            checked={todo.completed}
            onChange={() => {}} // Click handled by parent button's onClick
            color={checkboxColor}
            className="pointer-events-none shrink-0"
          />
          
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className={`text-[11px] md:text-base font-bold tracking-wide transition-all duration-300 ${
                todo.completed
                  ? "dark:text-slate-500 text-slate-600 line-through decoration-slate-500/50"
                  : "dark:text-slate-100 text-slate-900 group-hover:text-cyan-50"
              }`}
            >
              {todo.text}
            </span>
            <div className="flex flex-wrap gap-2 items-center mt-1.5">
              {todo.priority && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider transition-colors ${
                    todo.completed
                      ? "dark:text-slate-500 text-slate-600 dark:bg-slate-800 bg-slate-100/50 dark:border-slate-700 border-slate-300/50"
                      : todo.priority === "High"
                      ? "dark:text-rose-400 text-rose-700 bg-rose-950/50 border-rose-800/50 font-bold shadow-md"
                      : todo.priority === "Medium"
                      ? "dark:text-amber-400 text-amber-700 bg-amber-950/50 border-amber-800/50"
                      : "dark:text-emerald-400 text-emerald-700 bg-emerald-950/50 border-emerald-800/50"
                  }`}
                >
                  {todo.priority === "High" ? "CRITICAL MISSION" : todo.priority}
                </span>
              )}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider transition-colors ${
                  todo.completed
                    ? "dark:text-slate-500 text-slate-600 dark:bg-slate-800 bg-slate-100/50 dark:border-slate-700 border-slate-300/50"
                    : "dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 bg-cyan-950/50 border-cyan-800/50 shadow-md"
                }`}
              >
                {todo.type}
              </span>
              {(() => {
                let durationStr = "";
                if (todo.startTime && todo.endTime) {
                  const diffMs = new Date(todo.endTime).getTime() - new Date(todo.startTime).getTime();
                  const diffMins = Math.round(diffMs / 60000);
                  if (diffMins > 0) {
                    const hrs = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    if (hrs > 0 && mins > 0) {
                      durationStr = `${hrs}h ${mins}m`;
                    } else if (hrs > 0) {
                      durationStr = `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'}`;
                    } else {
                      durationStr = `${mins} mins`;
                    }
                  }
                } else if (todo.durationMinutes) {
                  const hrs = Math.floor(todo.durationMinutes / 60);
                  const mins = todo.durationMinutes % 60;
                  if (hrs > 0 && mins > 0) {
                    durationStr = `${hrs}h ${mins}m`;
                  } else if (hrs > 0) {
                    durationStr = `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'}`;
                  } else {
                    durationStr = `${todo.durationMinutes} mins`;
                  }
                }
                if (!durationStr) return null;
                return (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      todo.completed
                        ? "dark:text-slate-500 text-slate-600 dark:bg-slate-800 bg-slate-100/50 dark:border-slate-700 border-slate-300/50"
                        : "dark:text-emerald-400 text-emerald-700 bg-emerald-950/50 border-emerald-800/50 shadow-md font-bold"
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    {durationStr}
                  </span>
                );
              })()}
              {!todo.completed && todo.xpReward > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono dark:text-amber-400 text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shadow-md transition-opacity group/xp">
                  <motion.div
                    whileHover={{ scale: 1.5, rotate: 15 }}
                    className="relative z-10"
                  >
                    <Target className="w-3 h-3 group-hover/xp:drop-shadow-md transition-all" />
                  </motion.div>
                  +{todo.xpReward} XP
                </span>
              )}
              {todo.calendarSynced && (
                <span
                  title="Scheduled in Google Calendar"
                  className="flex items-center text-[10px] dark:text-blue-400 text-blue-700 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded shadow-md"
                >
                  <Calendar className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={() => deleteTodo(todo.id)}
        className="p-2 dark:text-slate-500 text-slate-600 hover:dark:text-rose-400 text-rose-700 transition-colors rounded-lg hover:bg-rose-500/10 relative z-10 group/trash focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: -10 }}
          transition={{ duration: 0.4 }}
        >
          <Trash2 className="w-5 h-5 group-hover/trash:drop-shadow-md" />
        </motion.div>
      </button>
    </div>
  );
});
