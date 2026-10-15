// src/components/coach/AnalyticsCoachSection.tsx
/**
 * AI Coach Analysis & 10-Day Pattern Matrix for Analytics Page.
 * Styled with the exact History page visual aesthetic:
 * - Main Yesterday hero card: Hours studied, XP earned, Sleep (6h base), Screen, Tasks completed + Separately Yesterday AI Coach Analysis.
 * - Prior 2 days: Just 2 small compact cards with date & quick metrics (click to inspect full analysis).
 * - 10-Day Pattern Matrix: Full application analytics pipeline with 6h basic sleep benchmark, Theil-Sen momentum trends, and chronotype detection.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Cpu,
  Monitor,
  CheckCircle2,
  Clock,
  Moon,
  Smartphone,
  Zap,
  Calendar,
  X,
  Eye,
  ChevronRight,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Flame,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TiltWrapper } from '@/components/TiltWrapper';
import { useAppContext, PlayHistoryEntry } from '@/context/AppContext';
import { generateDeterministicCoachReport } from '@/lib/coach/engine';
import { computeTrends } from '@/lib/coach/trends';
import { getLocalDateString } from '@/lib/utils';

interface DayAssessmentData {
  entry: PlayHistoryEntry;
  dateStr: string;
  relativeLabel: string;
  hours: number;
  sleep: number;
  screenTime: number;
  xpEarned: number;
  questionsSolved: number;
  completedTasksCount: number;
  totalPlannedCount: number;
  feedbackText: string;
}

export function AnalyticsCoachSection() {
  const { history, practiceSessions, streakDays } = useAppContext();
  const [selectedCompanionDay, setSelectedCompanionDay] = useState<DayAssessmentData | null>(null);

  // Lock body scroll and prevent viewport shifts when inspecting a companion day
  useEffect(() => {
    if (selectedCompanionDay) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedCompanionDay]);

  // Helper to ensure feedback is never stuck on "generating neural feedback"
  const resolveDayFeedback = (entry: PlayHistoryEntry, dateKey: string): string => {
    let fb = entry.aiFeedback || '';
    const isInvalid =
      !fb ||
      fb.trim().length === 0 ||
      /generating/i.test(fb) ||
      fb.trim() === 'Generating neural feedback...';

    if (isInvalid) {
      try {
        const dayPractice = (practiceSessions || []).filter(
          ps => ps.date?.split('T')[0] === dateKey
        );
        const synth = generateDeterministicCoachReport({
          date: dateKey,
          hours: entry.hoursStudied || 0,
          sleep: entry.sleepTime || 6.0,
          screenTime: entry.screenTime || 2.0,
          history: history,
          plannedTasks: entry.plannedTasks || [],
          practiceSessions: dayPractice as any,
          streakDays: streakDays || 1,
        });
        fb = `Raw Report: ${synth.rawReport}\n\nDiagnosis: ${synth.diagnosis}\n\nVerdict: ${synth.verdict}\n\nToday's Mission: ${synth.todayMission}\n\n${synth.closing}`;
      } catch {
        fb = '';
      }
    }
    return fb;
  };

  // 1. Compute 3-Day Rolling Data: Yesterday (Main Hero) + Prior 2 Days (Small Cards)
  const { yesterdayData, companionDays } = useMemo(() => {
    if (!history || history.length === 0) {
      return { yesterdayData: null, companionDays: [] };
    }

    const validHistory = history.filter(h => !h.isMissed);
    const last3Entries = validHistory.slice(-3).reverse(); // [Yesterday, Day -2, Day -3]

    const parsedDays: DayAssessmentData[] = last3Entries.map((entry, idx) => {
      const labels = ['Yesterday', '2 Days Ago', '3 Days Ago'];
      const relativeLabel = labels[idx] || `${idx + 1} Days Ago`;

      const dateStr = entry.date
        ? new Date(entry.date).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : 'Past Day';

      const entryDateKey = entry.date?.split('T')[0] || getLocalDateString();
      const dayPractice = (practiceSessions || []).filter(
        ps => ps.date?.split('T')[0] === entryDateKey
      );
      const questionsSolved = dayPractice.reduce((sum, ps) => sum + (ps.attempted || 0), 0);

      const feedbackText = resolveDayFeedback(entry, entryDateKey);

      const completedCount = (entry.completedTasks || []).length;
      const plannedCount = Math.max(completedCount, (entry.plannedTasks || []).length || completedCount);

      return {
        entry,
        dateStr,
        relativeLabel,
        hours: entry.hoursStudied || 0,
        sleep: entry.sleepTime || 6.0,
        screenTime: entry.screenTime || 0,
        xpEarned: entry.xpEarned || 0,
        questionsSolved,
        completedTasksCount: completedCount,
        totalPlannedCount: plannedCount,
        feedbackText,
      };
    });

    return {
      yesterdayData: parsedDays[0] || null,
      companionDays: parsedDays.slice(1, 3), // Day -2 and Day -3 (just 2 small cards)
    };
  }, [history, practiceSessions, streakDays]);

  // 2. Compute 10-Day Pattern Matrix using full application logic with 6h basic sleep benchmark
  const matrixInsights = useMemo(() => {
    const last10Days = history.slice(-10);
    const insights: Array<{
      title: string;
      metric: string;
      description: string;
      type: 'positive' | 'warning' | 'danger' | 'neutral';
    }> = [];

    if (last10Days.length === 0) {
      return [{
        title: 'Calibration Phase',
        metric: '0/10 Days Logged',
        description: 'Complete your first study session and rollover to start synthesizing cognitive pattern analytics.',
        type: 'neutral' as const,
      }];
    }

    const avgSleep = last10Days.reduce((acc, d) => acc + (d.sleepTime || 6.0), 0) / last10Days.length;
    const avgHours = last10Days.reduce((acc, d) => acc + (d.hoursStudied || 0), 0) / last10Days.length;
    const daysUnder6hSleep = last10Days.filter(d => (d.sleepTime || 6.0) < 6.0);
    const totalSleepDebtHours = Math.max(0, last10Days.reduce((acc, d) => acc + Math.max(0, 6.0 - (d.sleepTime || 6.0)), 0));

    // A. Sleep Debt & Recovery Deficit (Strict 6h Baseline)
    if (avgSleep < 5.5) {
      const hoursWhenSleepDeprived = daysUnder6hSleep.length > 0
        ? daysUnder6hSleep.reduce((acc, d) => acc + (d.hoursStudied || 0), 0) / daysUnder6hSleep.length
        : avgHours;
      insights.push({
        title: 'Sleep Debt & Recovery Deficit',
        metric: `${avgSleep.toFixed(1)}h Avg (${Math.round(totalSleepDebtHours)}h Debt)`,
        description: `Severe accumulated sleep debt detected. On low-sleep days (<6h), your average output drops to ${hoursWhenSleepDeprived.toFixed(1)}h. Sleep debt directly degrades working memory retention.`,
        type: 'danger',
      });
    } else if (avgSleep < 6.0) {
      insights.push({
        title: 'Accumulated Sleep Debt',
        metric: `${avgSleep.toFixed(1)}h Avg (${Math.round(totalSleepDebtHours)}h Debt)`,
        description: `Multi-day sleep deficit trend below the 6.0h benchmark (~${Math.round(totalSleepDebtHours)}h total debt). Chronic fatigue silently degrades problem-solving speed and accuracy.`,
        type: 'warning',
      });
    } else {
      insights.push({
        title: 'Well-Recovered Baseline',
        metric: `${avgSleep.toFixed(1)}h Avg Sleep`,
        description: `Sleep baseline matches restorative cognitive benchmarks (6.0h). Memory consolidation is operating at full capacity with zero debt.`,
        type: 'positive',
      });
    }

    // B. Cognitive Momentum & Temporal Trajectory (Theil-Sen pipeline)
    const trends = computeTrends(
      last10Days.map(d => ({
        hoursStudied: d.hoursStudied || 0,
        sleepTime: d.sleepTime || 6.0,
        screenTime: d.screenTime || 2.0,
      })),
      last10Days[last10Days.length - 1]?.hoursStudied || 0,
      last10Days[last10Days.length - 1]?.sleepTime || 6.0,
      last10Days[last10Days.length - 1]?.screenTime || 2.0,
    );

    if (trends.hoursDirection === 'IMPROVING') {
      insights.push({
        title: 'Cognitive Momentum Trajectory',
        metric: `Climbing (+${trends.hoursSlope.toFixed(2)}h/d)`,
        description: `Study volume is trending upward with positive slope. Velocity momentum is sustained across ${trends.consecutiveTrendDays} consecutive days.`,
        type: 'positive',
      });
    } else if (trends.hoursDirection === 'DECLINING') {
      insights.push({
        title: 'Cognitive Momentum Trajectory',
        metric: `Drifting (${trends.hoursSlope.toFixed(2)}h/d)`,
        description: `Study volume is declining over the last cycle. Restructure high-priority focus blocks early in the day to reverse the drop.`,
        type: 'warning',
      });
    }

    // C. Day-of-the-Week Chronotype Analysis
    const daysMap: Record<string, number> = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
    const daysCount: Record<string, number> = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
    last10Days.forEach(d => {
      const dayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
      if (daysMap[dayName] !== undefined) {
        daysMap[dayName] += d.hoursStudied || 0;
        daysCount[dayName] += 1;
      }
    });

    let bestDay = 'Monday';
    let worstDay = 'Monday';
    let bestAvg = -1;
    let worstAvg = 999;
    Object.keys(daysMap).forEach(day => {
      if (daysCount[day] > 0) {
        const avg = daysMap[day] / daysCount[day];
        if (avg > bestAvg) { bestAvg = avg; bestDay = day; }
        if (avg < worstAvg) { worstAvg = avg; worstDay = day; }
      }
    });

    if (bestAvg > avgHours + 0.8 && bestAvg > 3.5) {
      insights.push({
        title: 'Peak Momentum',
        metric: `${bestDay}s (${bestAvg.toFixed(1)}h avg)`,
        description: `You are consistently pulling your highest output (${bestAvg.toFixed(1)}h) on ${bestDay}s. Capitalize on this by scheduling your hardest subjects here.`,
        type: 'positive',
      });
    }

    if (worstAvg < avgHours - 0.8 && worstAvg < 3 && daysCount[worstDay] > 1) {
      insights.push({
        title: 'Vulnerability Window',
        metric: `${worstDay}s (${worstAvg.toFixed(1)}h avg)`,
        description: `Your execution collapses on ${worstDay}s (Avg: ${worstAvg.toFixed(1)}h). Pre-plan a lighter, high-success-rate schedule to break the friction.`,
        type: 'warning',
      });
    }

    // D. Zero-Day Bleed vs Unbreakable Chain
    const zeroDays = last10Days.filter(d => (d.hoursStudied || 0) === 0).length;
    if (zeroDays > 0) {
      insights.push({
        title: 'Zero-Day Bleed',
        metric: `${zeroDays} Missed`,
        description: `You had ${zeroDays} zero-output days recently. A 0h day kills compounding gains. Lower the bar, do 1h, but never zero.`,
        type: 'danger',
      });
    } else if (last10Days.length >= 5) {
      insights.push({
        title: 'Unbreakable Chain',
        metric: 'No Zero Days',
        description: 'Zero missed days in the matrix. You have established a concrete baseline of consistency.',
        type: 'positive',
      });
    }

    // E. Dopamine Leak & Screen Time Friction
    const highScreenLowOutput = last10Days.filter(d => (d.screenTime || 0) > 4 && (d.hoursStudied || 0) < 3).length;
    if (highScreenLowOutput >= 2 || trends.screenEscalating) {
      insights.push({
        title: 'Dopamine Leak',
        metric: `${highScreenLowOutput} Drift Days`,
        description: 'High screen time is directly sabotaging your study hours. Leave the phone outside the room for the first 90-minute block.',
        type: 'warning',
      });
    }

    // F. Chronotype Peak Focus per Subject
    const subjectTimeAnalysis: Record<string, Record<string, { totalXp: number; taskCount: number }>> = {};
    last10Days.forEach(day => {
      if (day.isMissed || !day.completedTasks) return;
      day.completedTasks.forEach(task => {
        if (!task.subject || !task.completed) return;
        let hour = -1;
        if (task.startTime) {
          if (task.startTime.includes('T')) {
            hour = new Date(task.startTime).getHours();
          } else if (task.startTime.includes(':')) {
            hour = parseInt(task.startTime.split(':')[0], 10);
          }
        }
        if (hour === -1) return;

        let timeOfDay = 'Morning';
        if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
        else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
        else timeOfDay = 'Night';

        const sub = task.subject;
        if (!subjectTimeAnalysis[sub]) {
          subjectTimeAnalysis[sub] = {
            Morning: { totalXp: 0, taskCount: 0 },
            Afternoon: { totalXp: 0, taskCount: 0 },
            Evening: { totalXp: 0, taskCount: 0 },
            Night: { totalXp: 0, taskCount: 0 },
          };
        }
        subjectTimeAnalysis[sub][timeOfDay].totalXp += task.xpReward || 0;
        subjectTimeAnalysis[sub][timeOfDay].taskCount += 1;
      });
    });

    const subjectRecommendations: string[] = [];
    let bestTimeOfDayLabel = '';
    let maxXpPerTask = 0;

    Object.keys(subjectTimeAnalysis).forEach(sub => {
      let bestTime = '';
      let highestXpPerTask = 0;
      let highestTotalXp = 0;
      Object.keys(subjectTimeAnalysis[sub]).forEach(time => {
        const stats = subjectTimeAnalysis[sub][time];
        if (stats.taskCount > 0) {
          const xpPerTask = stats.totalXp / stats.taskCount;
          if (xpPerTask > highestXpPerTask || (xpPerTask === highestXpPerTask && stats.totalXp > highestTotalXp)) {
            highestXpPerTask = xpPerTask;
            highestTotalXp = stats.totalXp;
            bestTime = time;
          }
        }
      });

      if (bestTime && highestXpPerTask > 0) {
        subjectRecommendations.push(
          `${sub} is best studied in the ${bestTime} (avg. +${Math.round(highestXpPerTask)} XP/task)`
        );
        if (highestXpPerTask > maxXpPerTask) {
          maxXpPerTask = highestXpPerTask;
          bestTimeOfDayLabel = bestTime;
        }
      }
    });

    if (subjectRecommendations.length > 0) {
      insights.push({
        title: 'Chronotype Peak Focus',
        metric: `${bestTimeOfDayLabel} Peak`,
        description: `Your 10-day completion patterns show subject-specific peaks: ${subjectRecommendations.join(', ')}. Aligning your heavy cognitive tasks with these windows will maximize your study flow and compound your XP gains.`,
        type: 'positive',
      });
    }

    // G. Execution Stability (Volatility)
    if (trends.hoursVolatility > 2.5) {
      insights.push({
        title: 'Execution Volatility',
        metric: `±${trends.hoursVolatility}h Variance`,
        description: 'High day-to-day swing detected. Smooth out erratic spikes into sustainable daily rhythms.',
        type: 'warning',
      });
    }

    // Fallback baseline if few insights triggered
    if (insights.length < 2) {
      insights.push({
        title: 'Stable Orbit',
        metric: 'Baseline Output',
        description: 'Your study patterns are stable. Consider pushing a single "Apex Day" this week to elevate your operational baseline.',
        type: 'neutral',
      });
    }

    return insights;
  }, [history]);

  return (
    <div className="space-y-6 sm:space-y-8 mb-8">
      {/* =========================================================================
          SECTION 1: MAIN YESTERDAY HERO CARD + PRIOR 2 COMPANION CARDS
          Exact History Page Aesthetic: Indigo Gradient, Cpu Watermark, Sparkles
         ========================================================================= */}
      <div className="space-y-4">
        {yesterdayData ? (
          <div className="space-y-4">
            {/* MAIN YESTERDAY HERO CARD */}
            <TiltWrapper tiltAmount={3}>
              <Card className="bg-gradient-to-br from-indigo-950/80 to-black border-indigo-500/50 relative overflow-hidden shadow-lg">
                <div className="absolute -top-4 right-0 p-4 opacity-10 pointer-events-none">
                  <Cpu className="w-36 h-36 dark:text-indigo-400 text-indigo-600" />
                </div>

                <CardHeader className="pb-3 border-b border-indigo-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="dark:text-indigo-400 text-indigo-400 uppercase tracking-widest text-sm sm:text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      Yesterday's Performance & AI Coach Analysis
                      <span className="text-[10px] font-mono font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {yesterdayData.dateStr}
                      </span>
                    </CardTitle>
                    <span className="text-xs font-mono text-indigo-300/80">
                      Primary Daily Review
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 pt-4 space-y-4">
                  {/* Top Stats Strip: Hours, XP, Sleep (6h base), Screen, Tasks Done */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {/* Hours Studied */}
                    <div className="dark:bg-black/80 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-mono text-indigo-300 mb-1">
                        <Clock className="w-3 h-3" /> Hours Studied
                      </div>
                      <span className="text-lg sm:text-xl font-black text-white font-mono">
                        {yesterdayData.hours}h
                      </span>
                    </div>

                    {/* XP Earned */}
                    <div className="dark:bg-black/80 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-mono text-cyan-300 mb-1">
                        <Zap className="w-3 h-3 text-cyan-400" /> XP Earned
                      </div>
                      <span className="text-lg sm:text-xl font-black text-cyan-400 font-mono">
                        +{yesterdayData.xpEarned} XP
                      </span>
                    </div>

                    {/* Sleep (6h base) */}
                    <div className="dark:bg-black/80 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-mono text-blue-300 mb-1">
                        <Moon className="w-3 h-3 text-blue-400" /> Sleep (6h base)
                      </div>
                      <span className="text-lg sm:text-xl font-black text-blue-400 font-mono">
                        {yesterdayData.sleep}h
                      </span>
                      <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                        {yesterdayData.sleep >= 6.0
                          ? `+${(yesterdayData.sleep - 6.0).toFixed(1)}h surplus`
                          : `${(6.0 - yesterdayData.sleep).toFixed(1)}h deficit`}
                      </span>
                    </div>

                    {/* Screen Time */}
                    <div className="dark:bg-black/80 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-mono text-rose-300 mb-1">
                        <Smartphone className="w-3 h-3 text-rose-400" /> Screen Time
                      </div>
                      <span className="text-lg sm:text-xl font-black text-rose-400 font-mono">
                        {yesterdayData.screenTime}h
                      </span>
                    </div>

                    {/* Tasks Completed */}
                    <div className="col-span-2 sm:col-span-1 dark:bg-black/80 bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-mono text-emerald-300 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tasks Done
                      </div>
                      <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                        {yesterdayData.completedTasksCount} / {yesterdayData.totalPlannedCount}
                      </span>
                    </div>
                  </div>

                  {/* Separately Displayed Yesterday AI Coach Analysis */}
                  <div className="dark:bg-black/90 bg-slate-900 border border-indigo-500/40 p-4 sm:p-5 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 pb-2 border-b border-indigo-500/20">
                      <BrainCircuit className="w-4 h-4 text-cyan-400" />
                      AI Coach Assessment
                    </h4>

                    <div className="space-y-3 text-xs sm:text-sm text-indigo-100 leading-relaxed font-normal">
                      {(yesterdayData.feedbackText || '').split('\n\n').filter(Boolean).map((paragraph: string, idx: number, arr: string[]) => {
                        const match = paragraph.match(/^(Raw Report|Diagnosis|Verdict|Today's Mission|Closing):\s*([\s\S]*)$/i);
                        if (match) {
                          return (
                            <p key={`para-${idx}`} className="leading-relaxed">
                              <span className="font-bold text-white uppercase text-xs tracking-wider block sm:inline sm:mr-1">
                                {match[1]}:
                              </span>
                              <span className="text-slate-200">{match[2]}</span>
                            </p>
                          );
                        }
                        const isClosing = idx === arr.length - 1;
                        return (
                          <p
                            key={`para-${idx}`}
                            className={
                              isClosing
                                ? 'pt-2 font-bold dark:text-white text-slate-100 italic border-t border-indigo-500/40 mt-2'
                                : 'leading-relaxed text-slate-200'
                            }
                          >
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TiltWrapper>

            {/* PRIOR 2 COMPANION CARDS: Just 2 small compact cards with date & quick metrics, click to inspect */}
            {companionDays.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    Prior 2 Days History
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Click card to inspect full assessment
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {companionDays.map((cDay) => (
                    <div
                      key={cDay.dateStr}
                      onClick={() => setSelectedCompanionDay(cDay)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            {cDay.relativeLabel}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {cDay.dateStr}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono mb-2">
                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Study</span>
                            <span className="font-bold text-slate-900 dark:text-white">{cDay.hours}h</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block">XP</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">+{cDay.xpEarned}</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Sleep</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{cDay.sleep}h</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 block">Tasks</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {cDay.completedTasksCount}/{cDay.totalPlannedCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Eye className="w-3 h-3" /> View Full Analysis
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 px-4">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Historical Rollover Data Recorded Yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Complete your daily rollover protocol to log yesterday's sleep and screen stats for instant AI Coach evaluations.
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: 10-DAY PATTERN MATRIX
          Exact History Page UI Styling: Dark card, Monitor icon, Colored Status Badges
         ========================================================================= */}
      <div>
        <TiltWrapper tiltAmount={3}>
          <Card className="dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b dark:border-slate-800 border-slate-200">
              <CardTitle className="dark:text-cyan-400 text-cyan-700 uppercase tracking-widest text-sm flex items-center gap-2 group/matrix w-max">
                <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative">
                  <Monitor className="w-4 h-4 group-hover/matrix:drop-shadow-md transition-all text-cyan-400" />
                </motion.div>
                10-Day Pattern Matrix
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matrixInsights.map((insight, i) => (
                  <div
                    key={`mat-${i}`}
                    className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                      insight.type === 'positive'
                        ? 'dark:bg-emerald-950/20 bg-emerald-50 dark:border-emerald-500/30 border-emerald-300 hover:border-emerald-500/50'
                        : insight.type === 'warning'
                        ? 'dark:bg-amber-950/20 bg-amber-50 dark:border-amber-500/30 border-amber-300 hover:border-amber-500/50'
                        : insight.type === 'danger'
                        ? 'dark:bg-rose-950/20 bg-rose-50 dark:border-rose-500/30 border-rose-300 hover:border-rose-500/50'
                        : 'dark:bg-slate-900/40 bg-slate-100 dark:border-slate-800 border-slate-300 hover:border-slate-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h4
                        className={`text-sm font-bold uppercase tracking-wider ${
                          insight.type === 'positive'
                            ? 'dark:text-emerald-400 text-emerald-700'
                            : insight.type === 'warning'
                            ? 'dark:text-amber-400 text-amber-700'
                            : insight.type === 'danger'
                            ? 'dark:text-rose-400 text-rose-700'
                            : 'dark:text-slate-400 text-slate-600'
                        }`}
                      >
                        {insight.title}
                      </h4>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                          insight.type === 'positive'
                            ? 'dark:border-emerald-500/30 border-emerald-400/50 dark:text-emerald-300 text-emerald-800 dark:bg-emerald-500/10 bg-emerald-500/20'
                            : insight.type === 'warning'
                            ? 'dark:border-amber-500/30 border-amber-400/50 dark:text-amber-300 text-amber-800 dark:bg-amber-500/10 bg-amber-500/20'
                            : insight.type === 'danger'
                            ? 'dark:border-rose-500/30 border-rose-400/50 dark:text-rose-300 text-rose-800 dark:bg-rose-500/10 bg-rose-500/20'
                            : 'dark:border-slate-700 border-slate-400/50 dark:text-slate-400 text-slate-700 dark:bg-slate-800/50 bg-slate-300/20'
                        }`}
                      >
                        {insight.metric}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm dark:text-slate-300 text-slate-700 leading-relaxed font-normal">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TiltWrapper>
      </div>

      {/* MODAL: COMPANION DAY ASSESSMENT INSPECTOR (PORTALED DIRECTLY TO VIEWPORT) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedCompanionDay && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
                onClick={() => setSelectedCompanionDay(null)}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar my-auto"
                >
                  <button
                    onClick={() => setSelectedCompanionDay(null)}
                    className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                        {selectedCompanionDay.relativeLabel} Assessment
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mt-1">
                        AI Coach Analysis ({selectedCompanionDay.dateStr})
                      </h3>
                    </div>
                  </div>

                  {/* Stats Quick Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Study Hours</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">{selectedCompanionDay.hours}h</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">XP Earned</span>
                      <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">+{selectedCompanionDay.xpEarned}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Sleep (6h base)</span>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">{selectedCompanionDay.sleep}h</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Screen</span>
                      <span className="text-base font-bold text-rose-500">{selectedCompanionDay.screenTime}h</span>
                    </div>
                  </div>

                  {/* 5-Part Canonical Assessment */}
                  <div className="bg-slate-950/80 border border-indigo-500/30 p-4 sm:p-5 rounded-xl space-y-3 text-left">
                    {(selectedCompanionDay.feedbackText || '').split('\n\n').filter(Boolean).map((paragraph: string, idx: number, arr: string[]) => {
                      const match = paragraph.match(/^(Raw Report|Diagnosis|Verdict|Today's Mission|Closing):\s*([\s\S]*)$/i);
                      if (match) {
                        return (
                          <p key={`comp-idx-${idx}`} className="leading-relaxed text-xs sm:text-sm">
                            <span className="font-bold text-white uppercase text-xs tracking-wider block sm:inline sm:mr-1">
                              {match[1]}:
                            </span>
                            <span className="text-slate-200">{match[2]}</span>
                          </p>
                        );
                      }
                      const isClosing = idx === arr.length - 1;
                      return (
                        <p
                          key={`comp-idx-${idx}`}
                          className={
                            isClosing
                              ? 'pt-2 font-bold dark:text-white text-slate-100 italic border-t border-indigo-500/40 mt-2 text-xs sm:text-sm'
                              : 'leading-relaxed text-slate-200 text-xs sm:text-sm'
                          }
                        >
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  <div className="mt-5 text-right">
                    <button
                      onClick={() => setSelectedCompanionDay(null)}
                      className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider shadow-sm hover:opacity-90 transition"
                    >
                      Close Inspection
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
