// src/components/coach/OnboardingIntake.tsx
/**
 * 4-Question SRL Onboarding Intake Rubric.
 * Implements Gap 4 (§5.5) of the Cognitive Mentor Master Plan.
 * Seeds initial student friction profiles without cold-start paralysis.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Sparkles, Brain, CheckCircle2, ArrowRight, ShieldCheck, Flame, Target, Compass } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface OnboardingIntakeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingIntake({ isOpen, onClose }: OnboardingIntakeProps) {
  const { scheduleProfile, setScheduleProfile } = useAppContext();

  const [revisionStyle, setRevisionStyle] = useState(
    scheduleProfile.intakeAnswers?.revisionStyle || "active_problem_solving"
  );
  const [predictionAccuracy, setPredictionAccuracy] = useState(
    scheduleProfile.intakeAnswers?.predictionAccuracy || "overconfident"
  );
  const [longestFocusBlock, setLongestFocusBlock] = useState(
    scheduleProfile.intakeAnswers?.longestFocusBlock || "45m"
  );
  const [initiationFriction, setInitiationFriction] = useState(
    scheduleProfile.intakeAnswers?.initiationFriction || "moderate"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleProfile((prev) => ({
      ...prev,
      intakeAnswers: {
        revisionStyle,
        predictionAccuracy,
        longestFocusBlock,
        initiationFriction,
      },
    }));
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto text-left"
      >
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Diagnostic SRL Intake
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              4-Question calibration rubric to personalize cognitive mentor heuristics.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question 1 */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              1. Primary Study & Revision Methodology
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "active_problem_solving", label: "Active Solving", desc: "Closed-book timed drills & PYQs" },
                { id: "video_lectures", label: "Lecture Driven", desc: "Watching coaching videos & pause-solve" },
                { id: "notes_reading", label: "Notes & Theory", desc: "Re-reading short notes and formulas" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRevisionStyle(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    revisionStyle === opt.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2 */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              2. Metacognitive Calibration (Self-Assessment Tendency)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "overconfident", label: "Often Optimistic", desc: "Feel prepared but score lower on test" },
                { id: "calibrated", label: "Realistic Calibration", desc: "Predicted marks closely match actual" },
                { id: "underconfident", label: "Cautious / Anxious", desc: "Underestimate operational grasp" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPredictionAccuracy(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    predictionAccuracy === opt.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3 */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              3. Longest Sustained High-Cognitive Block
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "25m", label: "25 min", desc: "Pomodoro cadence" },
                { id: "45m", label: "45 min", desc: "Balanced focus" },
                { id: "90m", label: "90 min", desc: "Deep analytical block" },
                { id: "120m+", label: "120+ min", desc: "Full mock simulation" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLongestFocusBlock(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    longestFocusBlock === opt.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question 4 */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              4. Session Initiation Friction
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "high", label: "High Friction", desc: "Hard to sit down; phone distraction" },
                { id: "moderate", label: "Moderate Pacing", desc: "Takes 10 mins to warm up, then steady" },
                { id: "low", label: "Instant Initiation", desc: "Sit down and start timer immediately" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInitiationFriction(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    initiationFriction === opt.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Skip / Later
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition"
            >
              Confirm SRL Calibration
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
