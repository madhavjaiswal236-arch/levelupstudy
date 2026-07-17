import sys
content = """
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Plus, Search, GripVertical, CheckCircle2, Zap
} from 'lucide-react';
import { useAppContext, Todo } from '@/context/AppContext';
import { rescheduleCalendarEvents, createCalendarEvent } from '@/lib/calendar';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfDay } from 'date-fns';

export function StudyCalendar({ onClose }: { onClose?: () => void }) {
  const { todos, setTodos } = useAppContext();
  const [view, setView] = useState<'Day' | '3 Days' | 'Week' | 'Month'>('Week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // ... implementation ...
}
"""
print("Script written")
