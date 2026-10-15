// src/components/coach/SpacedMemoryWidget.tsx
/**
 * Spaced Memory Consolidation Widget.
 * Exposes the pure Cognitive Mentor retention reviewQueue() (Audit §5.4 & Gap 3).
 * Identifies chapters where P(L) >= 0.35 and retrievability R < 0.65.
 */

import React, { useMemo, useState } from "react";
import { BrainCircuit, Clock, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Play, RefreshCw, Zap } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { updateChapter } from "@/lib/coach/student-model/knowledgeTracing";
import { onRetrieval, retrievability, reviewQueue, RETRIEVAL_THRESHOLD } from "@/lib/coach/student-model/retentionModel";
import type { ChapterMastery, ISODate } from "@/lib/coach/types";
import { getLocalDateString } from "@/lib/utils";

interface SpacedMemoryWidgetProps {
  onStartPracticeSession?: (subject: string, chapter: string) => void;
  className?: string;
}

export function SpacedMemoryWidget({ onStartPracticeSession, className = "" }: SpacedMemoryWidgetProps) {
  const {
    practiceSessions,
    syllabus,
    class11EndDate,
    setTodos,
    addXp,
  } = useAppContext();

  const [queuedTasks, setQueuedTasks] = useState<Record<string, boolean>>({});

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Compute live active masteries from practice sessions
  const activeMasteries = useMemo(() => {
    const masteries: Record<string, ChapterMastery> = {};

    // 1. Replay logged practice sessions
    (practiceSessions || []).forEach((session) => {
      if (!session.subject || !session.chapter) return;
      const key = `${session.subject}:${session.chapter}`;
      const sessionDate = session.date?.split("T")[0] || todayStr;
      
      masteries[key] = updateChapter(masteries[key] || null, key, {
        date: sessionDate,
        attempted: session.attempted || 0,
        correct: session.correct || 0,
        questionType: (session as any).questionType || "MCQ",
        tier: (session as any).difficultyTier || 2,
        errorCounts: (session as any).errorCounts,
      });

      const slipTagged = (session as any).errorCounts?.ATTENTIONAL_SLIP || 0;
      const effectiveAcc = session.attempted > 0 ? (session.correct + 0.75 * slipTagged) / session.attempted : 0;

      masteries[key] = onRetrieval(
        masteries[key],
        sessionDate,
        effectiveAcc,
        session.attempted || 0,
        class11EndDate || undefined,
      );
    });

    // 2. Also register any syllabus chapters marked with high mastery if not yet practiced in logs
    Object.entries(syllabus || {}).forEach(([subj, chapters]) => {
      (chapters as any[]).forEach((ch) => {
        const key = `${subj}:${ch.name}`;
        if (!masteries[key] && ch.mastery && ch.mastery >= 40) {
          // Synthetic initial mastery representation for syllabus tracker integration
          masteries[key] = {
            key,
            subject: subj as any,
            chapter: ch.name,
            pL: Math.min(0.95, ch.mastery / 100),
            evidenceCount: 15,
            distinctDays: 3,
            halfLifeDays: 5.0,
            lastRetrievalDate: "2026-09-15", // defaulted to trigger review queue if stale
            errorTotals: { KNOWLEDGE_DEFICIT: 0, PROCEDURAL_FLAW: 0, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 },
          };
        }
      });
    });

    return masteries;
  }, [practiceSessions, syllabus, class11EndDate, todayStr]);

  // Derive decaying chapters from pure reviewQueue()
  const decayingChapters = useMemo(() => {
    const list = Object.values(activeMasteries);
    return reviewQueue(list, todayStr);
  }, [activeMasteries, todayStr]);

  const handleAddRetrievalTask = (mastery: ChapterMastery) => {
    const taskKey = mastery.key;
    const newTask = {
      id: Date.now(),
      text: `[Spaced Retrieval] 15-min closed-book set: ${mastery.chapter} (${mastery.subject})`,
      completed: false,
      xpReward: 100,
      type: "Practice" as const,
      priority: "High" as const,
      subject: mastery.subject,
      chapter: mastery.chapter,
      dateScheduled: todayStr,
    };

    setTodos((prev) => [newTask, ...prev]);
    setQueuedTasks((prev) => ({ ...prev, [taskKey]: true }));
  };

  return (
    <div className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Spaced Memory Consolidation
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                Half-Life Model
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chapters with P(L) ≥ 0.35 where retrievability has decayed below R &lt; 0.65
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono self-start sm:self-auto">
          <span className="text-slate-500">Threshold:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">R &lt; 65%</span>
        </div>
      </div>

      {decayingChapters.length === 0 ? (
        <div className="py-5 sm:py-6 text-center rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 px-3">
          <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 mx-auto mb-1.5 sm:mb-2 opacity-80" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            All Knowledge Traces Consolidated
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            No mastered chapters have decayed below the 65% retrievability threshold today. Keep logging practice sessions to expand retention curves.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {decayingChapters.map((m) => {
              const r = retrievability(m, todayStr);
              const rPct = r !== null ? Math.round(r * 100) : 0;
              const pLPct = Math.round(m.pL * 100);
              const isTaskAdded = queuedTasks[m.key];

              const subjectColor =
                m.subject === "Physics"
                  ? "border-cyan-500/40 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5"
                  : m.subject === "Chemistry"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5";

              return (
                <div
                  key={m.key}
                  className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:border-purple-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded border ${subjectColor}`}>
                        {m.subject}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-rose-500 font-bold bg-rose-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> R: {rPct}%
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-2">
                      {m.chapter}
                    </h4>

                    {/* Retrievability progress bar */}
                    <div className="space-y-1 mb-2.5">
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
                        <span>Retrievability: {rPct}%</span>
                        <span>Mastery: {pLPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rPct < 40 ? "bg-rose-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, rPct))}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 mb-2.5">
                      <div>Half-Life: {m.halfLifeDays.toFixed(1)} days</div>
                      <div>Last active: {m.lastRetrievalDate || "Stale"}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      disabled={isTaskAdded}
                      onClick={() => handleAddRetrievalTask(m)}
                      className={`w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isTaskAdded
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
                          : "bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer"
                      }`}
                    >
                      {isTaskAdded ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Queued
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Review (+100 XP)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
