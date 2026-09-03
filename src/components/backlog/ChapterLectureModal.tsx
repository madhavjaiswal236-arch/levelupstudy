import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  BookOpen,
  Clock,
  Check,
  Plus,
  Minus,
  Sparkles,
  Layers,
  ChevronLeft,
  CheckCircle2,
  Sliders,
  Flame
} from 'lucide-react';
import { useAppContext, SyllabusData } from '@/context/AppContext';
import { BacklogChapterInput } from '@/lib/backlog/types';

interface ChapterLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  subjectColor: string;
  onSaveChapter: (chapter: BacklogChapterInput) => void;
  existingChapter?: BacklogChapterInput | null;
  existingChapterIds?: string[];
}

export const ChapterLectureModal: React.FC<ChapterLectureModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  subjectColor,
  onSaveChapter,
  existingChapter,
  existingChapterIds = []
}) => {
  const { syllabus } = useAppContext();

  // Mode: 1 = choose chapter, 2 = configure lectures
  const [modalStep, setModalStep] = useState<1 | 2>(existingChapter ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  // Selected chapter info
  const [chapterName, setChapterName] = useState(existingChapter?.name || '');
  const [chapterId, setChapterId] = useState(
    existingChapter?.id || `chap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  );
  const [chapterTier, setChapterTier] = useState<string>('A');

  // Lecture selection state (Default 2 hours = 120 minutes)
  const [totalLecturesCount, setTotalLecturesCount] = useState<number>(() => {
    if (existingChapter?.totalLecturesInChapter) return existingChapter.totalLecturesInChapter;
    if (existingChapter?.selectedLectures && existingChapter.selectedLectures.length > 0) {
      return Math.max(15, Math.max(...existingChapter.selectedLectures));
    }
    return 15;
  });

  const [selectedLectures, setSelectedLectures] = useState<number[]>(() => {
    if (existingChapter?.selectedLectures && existingChapter.selectedLectures.length > 0) {
      return [...existingChapter.selectedLectures].sort((a, b) => a - b);
    }
    if (existingChapter?.lecturesRemaining) {
      return Array.from({ length: existingChapter.lecturesRemaining }, (_, i) => i + 1);
    }
    // Default initial selection: first 5 lectures
    return [1, 2, 3, 4, 5];
  });

  // Default lecture duration: 120 minutes (2 hours)
  const [lectureDurationMinutes, setLectureDurationMinutes] = useState<number>(
    existingChapter?.lectureDurationMinutes || 120
  );

  // Range auto-selection anchor and preview states
  const [lastSelectedLec, setLastSelectedLec] = useState<number | null>(null);
  const [hoveredLec, setHoveredLec] = useState<number | null>(null);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [customRangeFrom, setCustomRangeFrom] = useState<number>(1);
  const [customRangeTo, setCustomRangeTo] = useState<number>(10);

  // Practice configuration
  const [practiceEnabled, setPracticeEnabled] = useState<boolean>(
    existingChapter?.practice?.enabled ?? true
  );
  const [questionCount, setQuestionCount] = useState<number>(
    existingChapter?.practice?.questionCount || 45
  );

  // Custom chapter input
  const [customChapterName, setCustomChapterName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Chapters from syllabus
  const syllabusChapters = useMemo(() => {
    const list = syllabus[subjectName as keyof SyllabusData] || [];
    return list;
  }, [syllabus, subjectName]);

  const filteredChapters = useMemo(() => {
    return syllabusChapters.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = selectedTier === 'ALL' || ch.tier === selectedTier;
      return matchesSearch && matchesTier;
    });
  }, [syllabusChapters, searchQuery, selectedTier]);

  const handleSelectSyllabusChapter = (chap: { name: string; tier: string; totalLectures?: number }) => {
    setChapterName(chap.name);
    setChapterTier(chap.tier || 'A');
    const total = chap.totalLectures || 15;
    setTotalLecturesCount(total);
    // Pre-select first 4 lectures by default
    setSelectedLectures([1, 2, 3, 4]);
    setLastSelectedLec(4);
    setCustomRangeFrom(1);
    setCustomRangeTo(Math.min(10, total));
    setLectureDurationMinutes(120); // 2 hours default
    setModalStep(2);
  };

  const handleStartCustomChapter = () => {
    if (!customChapterName.trim()) return;
    setChapterName(customChapterName.trim());
    setChapterTier('A');
    setTotalLecturesCount(15);
    setSelectedLectures([1, 2, 3, 4, 5]);
    setLastSelectedLec(5);
    setCustomRangeFrom(1);
    setCustomRangeTo(10);
    setLectureDurationMinutes(120);
    setModalStep(2);
  };

  const toggleLecture = (lecNum: number) => {
    if (selectedLectures.includes(lecNum)) {
      // Unselect single lecture
      setSelectedLectures(prev => prev.filter(n => n !== lecNum));
      setLastSelectedLec(null);
      setAutoFillMessage(null);
    } else {
      // If a previous lecture was already clicked, auto-select all lectures in between (e.g. 6 then 20 -> 6..20)
      if (lastSelectedLec !== null && lastSelectedLec !== lecNum) {
        const start = Math.min(lastSelectedLec, lecNum);
        const end = Math.max(lastSelectedLec, lecNum);
        const newSet = new Set(selectedLectures);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
        const updated = Array.from(newSet).sort((a, b) => a - b);
        setSelectedLectures(updated);
        setAutoFillMessage(`Auto-selected Lectures ${start} to ${end} (${end - start + 1} lectures)`);
        setLastSelectedLec(lecNum);
      } else {
        // Single select
        setSelectedLectures(prev => [...prev, lecNum].sort((a, b) => a - b));
        setLastSelectedLec(lecNum);
        setAutoFillMessage(`Selected #${lecNum}. Click another lecture (e.g. #${Math.min(totalLecturesCount, lecNum + 5)}) to auto-fill the range!`);
      }
    }
  };

  const selectRange = (start: number, end: number) => {
    const min = Math.max(1, Math.min(start, end));
    const max = Math.min(totalLecturesCount, Math.max(start, end));
    const newSelection = new Set(selectedLectures);
    for (let i = min; i <= max; i++) {
      newSelection.add(i);
    }
    setSelectedLectures(Array.from(newSelection).sort((a, b) => a - b));
    setLastSelectedLec(max);
    setAutoFillMessage(`Selected range ${min} to ${max} (${max - min + 1} lectures)`);
  };

  const handleSelectAll = () => {
    setSelectedLectures(Array.from({ length: totalLecturesCount }, (_, i) => i + 1));
    setLastSelectedLec(totalLecturesCount);
    setAutoFillMessage(`Selected all ${totalLecturesCount} lectures`);
  };

  const handleClearAll = () => {
    setSelectedLectures([]);
    setLastSelectedLec(null);
    setAutoFillMessage(null);
  };

  const handleSave = () => {
    if (!chapterName.trim()) return;
    if (selectedLectures.length === 0) return;

    const finalChapter: BacklogChapterInput = {
      id: chapterId,
      name: chapterName.trim(),
      subject: subjectName,
      order: existingChapter?.order || 1,
      lecturesRemaining: selectedLectures.length,
      lectureDurationMinutes,
      selectedLectures,
      totalLecturesInChapter: totalLecturesCount,
      practice: {
        enabled: practiceEnabled && questionCount > 0,
        questionCount: practiceEnabled ? questionCount : 0,
        estimatedMinutesPerQuestion: 2.5
      }
    };

    onSaveChapter(finalChapter);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {modalStep === 2 && !existingChapter && (
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Back to Chapters"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: subjectColor }}
              />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {modalStep === 1
                    ? `Select Chapter — ${subjectName}`
                    : `Configure Lectures — ${chapterName}`}
                </h3>
                <p className="text-xs text-slate-400">
                  {modalStep === 1
                    ? `Choose a chapter from the ${subjectName} curriculum`
                    : 'Select individual lectures for task placement (Default: 2 Hours)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* STEP 1: CHAPTER SELECTOR */}
            {modalStep === 1 && (
              <div className="space-y-4">
                {/* Search & Tier Filters */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Search ${subjectName} chapters...`}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition"
                    />
                  </div>

                  {/* Tier Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {['ALL', 'S', 'A', 'B', 'C'].map(tier => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                          selectedTier === tier
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {tier === 'ALL' ? 'All Tiers' : `Tier ${tier}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chapter Cards List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredChapters.map(chap => {
                    const isAlreadyAdded = existingChapterIds.includes(chap.name);
                    const tierColor =
                      chap.tier === 'S'
                        ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                        : chap.tier === 'A'
                        ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
                        : chap.tier === 'B'
                        ? 'text-purple-400 bg-purple-400/10 border-purple-400/30'
                        : 'text-slate-400 bg-slate-800 border-slate-700';

                    return (
                      <button
                        key={chap.name}
                        type="button"
                        onClick={() => handleSelectSyllabusChapter(chap)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition group ${
                          isAlreadyAdded
                            ? 'border-slate-800 bg-slate-950/50 hover:border-amber-400/60'
                            : 'border-slate-800 bg-slate-950 hover:border-amber-400 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white group-hover:text-amber-300 transition line-clamp-2">
                            {chap.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 font-mono ${tierColor}`}
                          >
                            Tier {chap.tier}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{chap.lectures || 15} Lectures</span>
                          {isAlreadyAdded && (
                            <span className="text-[10px] text-amber-400/90 font-medium">
                              Enrolled
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Chapter Entry Option */}
                <div className="pt-2 border-t border-slate-800">
                  {!isCustomMode ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(true)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Or add a custom chapter not in syllabus
                    </button>
                  ) : (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                      <p className="text-xs text-slate-300 font-medium">Custom Chapter Name:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Center of Mass Advanced"
                          value={customChapterName}
                          onChange={e => setCustomChapterName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleStartCustomChapter}
                          disabled={!customChapterName.trim()}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: LECTURE PICKER (MATCHING USER REFERENCE IMAGE) */}
            {modalStep === 2 && (
              <div className="space-y-5">
                {/* Chapter Info Header Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Chapter Enrolling
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      {chapterName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold font-mono border"
                      style={{
                        borderColor: `${subjectColor}60`,
                        color: subjectColor,
                        backgroundColor: `${subjectColor}15`
                      }}
                    >
                      {subjectName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30">
                      Tier {chapterTier}
                    </span>
                  </div>
                </div>

                {/* Card of Lectures (Ref: Screenshot 2026-09-03 133419.png) */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <span>Lectures in this chapter</span>
                        {lastSelectedLec !== null && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono font-semibold">
                            Anchor: #{lastSelectedLec}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click lecture <strong>#6</strong> then <strong>#20</strong> to auto-select all intermediate lectures (7, 8, 9...)
                      </p>
                    </div>

                    {/* Prominent selected counter pill (Yellow/Amber accent) */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs font-mono shadow-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{selectedLectures.length} Selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-fill Helper Banner */}
                  {autoFillMessage && (
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{autoFillMessage}</span>
                      </div>
                      {lastSelectedLec !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setLastSelectedLec(null);
                            setAutoFillMessage(null);
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline ml-2"
                        >
                          Clear anchor
                        </button>
                      )}
                    </div>
                  )}

                  {/* Explicit Range Selector Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="font-semibold text-slate-400">Auto-Select Range:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">From</span>
                        <input
                          type="number"
                          min={1}
                          max={totalLecturesCount}
                          value={customRangeFrom}
                          onChange={e => setCustomRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-md text-center text-xs font-mono font-bold text-white focus:border-amber-400 outline-none"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          min={1}
                          max={totalLecturesCount}
                          value={customRangeTo}
                          onChange={e => setCustomRangeTo(Math.min(totalLecturesCount, parseInt(e.target.value) || totalLecturesCount))}
                          className="w-12 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-md text-center text-xs font-mono font-bold text-white focus:border-amber-400 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => selectRange(customRangeFrom, customRangeTo)}
                        className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-md transition shadow-xs"
                      >
                        Apply Range
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-[11px] font-semibold"
                      >
                        All ({totalLecturesCount})
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-rose-400 border border-slate-800 transition text-[11px] font-semibold"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => selectRange(1, 5)}
                        className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-[11px] font-mono"
                      >
                        1..5
                      </button>
                      {totalLecturesCount >= 10 && (
                        <button
                          type="button"
                          onClick={() => selectRange(6, Math.min(10, totalLecturesCount))}
                          className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-[11px] font-mono"
                        >
                          6..10
                        </button>
                      )}
                      {totalLecturesCount >= 20 && (
                        <button
                          type="button"
                          onClick={() => selectRange(6, 20)}
                          className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 transition text-[11px] font-mono font-bold"
                        >
                          6..20
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid of individual Lecture Buttons */}
                  <div
                    className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2"
                    onMouseLeave={() => setHoveredLec(null)}
                  >
                    {Array.from({ length: totalLecturesCount }, (_, i) => i + 1).map(lecNum => {
                      const isSelected = selectedLectures.includes(lecNum);
                      const isAnchor = lastSelectedLec === lecNum;
                      const isInHoverRange =
                        lastSelectedLec !== null &&
                        hoveredLec !== null &&
                        lastSelectedLec !== hoveredLec &&
                        lecNum >= Math.min(lastSelectedLec, hoveredLec) &&
                        lecNum <= Math.max(lastSelectedLec, hoveredLec);

                      return (
                        <button
                          key={lecNum}
                          type="button"
                          onClick={() => toggleLecture(lecNum)}
                          onMouseEnter={() => setHoveredLec(lecNum)}
                          title={
                            lastSelectedLec !== null && lastSelectedLec !== lecNum
                              ? `Click to auto-select from #${Math.min(lastSelectedLec, lecNum)} to #${Math.max(lastSelectedLec, lecNum)}`
                              : isSelected
                              ? `Lecture #${lecNum} is selected. Click to deselect.`
                              : `Click to select Lecture #${lecNum}`
                          }
                          className={`aspect-square rounded-xl font-mono text-sm font-bold flex flex-col items-center justify-center relative transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black border-2 border-amber-300 shadow-md scale-105 z-10'
                              : isInHoverRange
                              ? 'bg-amber-400/20 text-amber-200 border-2 border-dashed border-amber-400/70 scale-102 z-0'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <span>{lecNum}</span>
                          {isAnchor && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-slate-950" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Total Lectures in Chapter Stepper */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 text-xs">
                    <p className="text-[11px] text-slate-400">
                      Tip: Need more lecture slots for this chapter? Increase total lectures below.
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span>Total Chapter Lectures:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(5, totalLecturesCount - 1);
                          setTotalLecturesCount(next);
                          setCustomRangeTo(prev => Math.min(prev, next));
                        }}
                        className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-800 font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-white font-bold w-6 text-center">
                        {totalLecturesCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(60, totalLecturesCount + 1);
                          setTotalLecturesCount(next);
                          setCustomRangeTo(next);
                        }}
                        className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-800 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lecture Duration Setting (DEFAULT: 2 HOURS / 120 MIN) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs sm:text-sm font-bold text-white">
                        Duration per Lecture
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {lectureDurationMinutes} min ({(lectureDurationMinutes / 60).toFixed(1)} hrs)
                    </span>
                  </div>

                  {/* Preset duration buttons with 2 Hours clearly as DEFAULT */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { mins: 90, label: '1h 30m' },
                      { mins: 120, label: '2 Hours (Default)' },
                      { mins: 150, label: '2h 30m' },
                      { mins: 180, label: '3 Hours' }
                    ].map(preset => (
                      <button
                        key={preset.mins}
                        type="button"
                        onClick={() => setLectureDurationMinutes(preset.mins)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border text-center transition ${
                          lectureDurationMinutes === preset.mins
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Question Practice */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={practiceEnabled}
                        onChange={e => setPracticeEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Include Question Practice</span>
                    </label>

                    {practiceEnabled && (
                      <span className="text-xs font-mono text-slate-400">
                        {questionCount} Qs (≈ {Math.round((questionCount * 2.5) / 60)}h)
                      </span>
                    )}
                  </div>

                  {practiceEnabled && (
                    <div className="flex items-center gap-2 pt-1">
                      {[30, 45, 60, 80].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setQuestionCount(cnt)}
                          className={`px-3 py-1 rounded text-xs font-bold border transition ${
                            questionCount === cnt
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {cnt} Qs
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {modalStep === 2 && (
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                Workload: <span className="text-white font-bold">{selectedLectures.length}</span> lectures ×{' '}
                <span className="text-white font-bold">{lectureDurationMinutes}m</span> ={' '}
                <span className="text-amber-400 font-bold">
                  {+((selectedLectures.length * lectureDurationMinutes) / 60).toFixed(1)} hrs
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={selectedLectures.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {existingChapter ? 'Update Chapter' : `Add Chapter (${selectedLectures.length} Lecs)`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
