// src/components/coach/ScheduleProfileEditor.tsx
/**
 * Schedule Profile & Weekly Day-Type Editor.
 * Implements Gap 4 (§5.5) of the Cognitive Mentor Master Plan.
 * Configures day types (school, coaching, full study, rest, exam),
 * bedtime/wake targets, and target exam date.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, Moon, Sun, Save, X, Sparkles, CheckCircle2, Shield, AlertCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import type { DayType } from "@/lib/coach/types";
import { computeLightsOutTime } from "@/lib/coach/safety/sleepTier";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const DAY_TYPE_OPTIONS: Array<{ value: DayType; label: string; desc: string; color: string }> = [
  { value: "FULL_STUDY_DAY", label: "Full Study Day", desc: "Dedicated self-study (~8.5h capacity)", color: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  { value: "SCHOOL_DAY", label: "School Day", desc: "Regular school classes (~4.0h self-study)", color: "text-blue-500 border-blue-500/30 bg-blue-500/10" },
  { value: "COACHING_DAY", label: "Coaching Day", desc: "Intensive coaching classes (~5.0h capacity)", color: "text-purple-500 border-purple-500/30 bg-purple-500/10" },
  { value: "REST_DAY", label: "Rest / Buffer", desc: "Active recovery & consolidation (~1.5h)", color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
  { value: "EXAM_DAY", label: "Mock Exam Day", desc: "Testing simulation block (~6.0h)", color: "text-rose-500 border-rose-500/30 bg-rose-500/10" },
];

interface ScheduleProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleProfileEditor({ isOpen, onClose }: ScheduleProfileEditorProps) {
  const {
    scheduleProfile,
    setScheduleProfile,
    class11EndDate,
    setClass11EndDate,
  } = useAppContext();

  const [weeklyDayTypes, setWeeklyDayTypes] = useState<Record<string, DayType>>(
    scheduleProfile.weeklyDayTypes || {
      Sunday: "FULL_STUDY_DAY",
      Monday: "SCHOOL_DAY",
      Tuesday: "SCHOOL_DAY",
      Wednesday: "SCHOOL_DAY",
      Thursday: "SCHOOL_DAY",
      Friday: "COACHING_DAY",
      Saturday: "FULL_STUDY_DAY",
    }
  );

  const [targetSleepHours, setTargetSleepHours] = useState<number>(
    scheduleProfile.targetSleepHours || 7.5
  );
  const [usualWakeTime, setUsualWakeTime] = useState<string>(
    scheduleProfile.usualWakeTime || "06:00"
  );
  const [examDate, setExamDate] = useState<string>(class11EndDate || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const calculatedLightsOut = computeLightsOutTime(usualWakeTime, targetSleepHours);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleProfile((prev) => ({
      ...prev,
      weeklyDayTypes,
      targetSleepHours,
      usualWakeTime,
    }));

    if (examDate) {
      setClass11EndDate(examDate);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Student Schedule Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calibrates Day-Type robust baselines, sleep firewall thresholds, and horizon caps.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Weekly Day-Type Schedule */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" /> Weekly Day-Type Registry (Defect B1 Robustness)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
              {DAY_NAMES.map((day) => {
                const currentType = weeklyDayTypes[day] || "FULL_STUDY_DAY";
                return (
                  <div key={day} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                    <span className="text-[11px] font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      {day.slice(0, 3)}
                    </span>
                    <select
                      value={currentType}
                      onChange={(e) =>
                        setWeeklyDayTypes((prev) => ({
                          ...prev,
                          [day]: e.target.value as DayType,
                        }))
                      }
                      className="w-full p-1.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    >
                      {DAY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label.split(" ")[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sleep & Circadian Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" /> Target Sleep (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="6.0"
                max="10.0"
                value={targetSleepHours}
                onChange={(e) => setTargetSleepHours(parseFloat(e.target.value) || 7.5)}
                className="w-full p-2.5 text-base font-bold font-mono rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard target: 7.5h</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" /> Usual Wake Time
              </label>
              <input
                type="time"
                value={usualWakeTime}
                onChange={(e) => setUsualWakeTime(e.target.value)}
                className="w-full p-2.5 text-base font-bold font-mono rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                required
              />
              <span className="text-[10px] text-indigo-500 font-mono mt-1 block">
                Calculated Lights-Out: {calculatedLightsOut}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-400" /> Target Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full p-2.5 text-base font-bold font-mono rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Clamps review spacing horizon (Gap 2)</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:scale-[1.02] transition"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Profile Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Schedule Profile
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
