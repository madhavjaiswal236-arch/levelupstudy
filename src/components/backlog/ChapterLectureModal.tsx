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
    setLectureDurationMinutes(120); // 2 hours default
    setModalStep(2);
  };

  const handleStartCustomChapter = () => {
    if (!customChapterName.trim()) return;
    setChapterName(customChapterName.trim());
    setChapterTier('A');
    setTotalLecturesCount(15);
    setSelectedLectures([1, 2, 3, 4, 5]);
    setLectureDurationMinutes(120);
    setModalStep(2);
  };

  const toggleLecture = (lecNum: number) => {
    setSelectedLectures(prev => {
      if (prev.includes(lecNum)) {
        return prev.filter(n => n !== lecNum);
      } else {
        return [...prev, lecNum].sort((a, b) => a - b);
      }
    });
  };

  const selectRange = (start: number, end: number) => {
    const newSelection = new Set(selectedLectures);
    for (let i = start; i <= Math.min(end, totalLecturesCount); i++) {
      newSelection.add(i);
    }
    setSelectedLectures(Array.from(newSelection).sort((a, b) => a - b));
  };

  const handleSelectAll = () => {
    setSelectedLectures(Array.from({ length: totalLecturesCount }, (_, i) => i + 1));
  };

  const handleClearAll = () => {
    setSelectedLectures([]);
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                        Lectures in this chapter
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click individual lecture cards to name & place them in your plan
                      </p>
                    </div>

                    {/* Prominent selected counter pill (Yellow/Amber accent) */}
                    <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs font-mono shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{selectedLectures.length} Selected</span>
                    </div>
                  </div>

                  {/* Grid of individual Lecture Buttons */}
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {Array.from({ length: totalLecturesCount }, (_, i) => i + 1).map(lecNum => {
                      const isSelected = selectedLectures.includes(lecNum);
                      return (
                        <button
                          key={lecNum}
                          type="button"
                          onClick={() => toggleLecture(lecNum)}
                          className={`aspect-square rounded-xl font-mono text-sm font-bold flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black border-2 border-amber-300 shadow-md scale-105'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <span>{lecNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Select Buttons & Total Stepper */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => selectRange(1, 5)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                      >
                        1 to 5
                      </button>
                      {totalLecturesCount >= 10 && (
                        <button
                          type="button"
                          onClick={() => selectRange(6, 10)}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                        >
                          6 to 10
                        </button>
                      )}
                    </div>

                    {/* Total Lectures in Chapter Stepper */}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span>Total Lecs:</span>
                      <button
                        type="button"
                        onClick={() => setTotalLecturesCount(c => Math.max(5, c - 1))}
                        className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-800"
                      >
                        -
                      </button>
                      <span className="font-mono text-white font-bold w-6 text-center">
                        {totalLecturesCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTotalLecturesCount(c => Math.min(35, c + 1))}
                        className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-800"
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
