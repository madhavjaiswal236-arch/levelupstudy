import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from '@/context/AppContext';

interface TourContextType {
 activeStep: string | null;
 setActiveStep: (step: string | null) => void;
 markCompleted: (step: string) => void;
 hasCompleted: (step: string) => boolean;
 stepData: any;
 setStepData: (data: any) => void;
 activeRef: React.RefObject<HTMLDivElement> | null;
 setActiveRef: (ref: React.RefObject<HTMLDivElement> | null) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
 const { xp, history, isLoaded } = useAppContext();
 
 const [activeStep, setActiveStep] = useState<string | null>(null);
 const [stepData, setStepData] = useState<any>(null);
 const [activeRef, setActiveRef] = useState<React.RefObject<HTMLDivElement> | null>(null);
 
 const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('app_tour_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

 useEffect(() => {
 if (isLoaded) {
 const isExistingUser = xp > 50 || history.length > 0;
 const isTourCompleted = localStorage.getItem('app_tour_completed');
 
 if (isExistingUser && !isTourCompleted) {
 const allStepsComplete = {
 'dashboard-log': true,
 'dashboard-player': true,
 'dashboard-tasks': true,
 'syllabus-tracker': true,
 'protocols-intro': true,
 'missions-intro': true,
 'store-intro': true,
 'history-intro': true,
 };
 setCompletedSteps(allStepsComplete);
 localStorage.setItem('app_tour_completed', JSON.stringify(allStepsComplete));
 }
 }
 }, [isLoaded, xp, history]);

 const markCompleted = React.useCallback((step: string) => {
 setCompletedSteps(prev => {
 const next = { ...prev, [step]: true };
 localStorage.setItem('app_tour_completed', JSON.stringify(next));
 return next;
 });
 setActiveStep(null);
 }, [setActiveStep]);

 const hasCompleted = React.useCallback((step: string) => !!completedSteps[step], [completedSteps]);
 
 const contextValue = React.useMemo(() => ({
 activeStep,
 setActiveStep,
 markCompleted,
 hasCompleted,
 stepData,
 setStepData,
 activeRef,
 setActiveRef
 }), [activeStep, markCompleted, hasCompleted, stepData, activeRef]);

 // Using motion values prevents CSS transform conflicts with framer scale animations
 const tooltipX = useMotionValue(0);
 const tooltipY = useMotionValue(0);
 const [tooltipReady, setTooltipReady] = useState(false);
 
 useEffect(() => {
 let rafId: number;
 let isReady = false;

 if (activeStep && activeRef?.current) {
 const updateTooltip = () => {
 if (!activeRef.current) return;
 const rect = activeRef.current.getBoundingClientRect();
 
 let top = rect.top;
 let left = rect.left;
 
 if (stepData?.position === 'top') {
 top = Math.max(16, rect.top - 16 - 220);
 left = Math.max(16, Math.min(window.innerWidth - 340, Math.max(16, rect.left)));
 } else if (stepData?.position === 'bottom') {
 top = Math.min(window.innerHeight - 240, rect.bottom + 16);
 left = Math.max(16, Math.min(window.innerWidth - 340, Math.max(16, rect.left)));
 } else if (stepData?.position === 'left') {
 top = rect.top;
 left = Math.max(16, Math.min(window.innerWidth - 340, rect.left - 320 - 16));
 } else if (stepData?.position === 'right') {
 top = rect.top;
 left = Math.max(16, Math.min(window.innerWidth - 340, rect.right + 16));
 }
 
 tooltipX.set(left);
 tooltipY.set(top);

 if (!isReady) {
 isReady = true;
 setTooltipReady(true);
 }
 
 rafId = requestAnimationFrame(updateTooltip);
 };

 updateTooltip();
 
 return () => {
 cancelAnimationFrame(rafId);
 setTooltipReady(false);
 };
 }
 }, [activeStep, activeRef, stepData, tooltipX, tooltipY]);

 return (
 <TourContext.Provider value={contextValue}>
 {children}
 
 {/* Dim Background */}
 <AnimatePresence>
 {activeStep && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.3 }}
 className="fixed inset-0 z-[99] pointer-events-none dark:bg-black bg-slate-50 backdrop-"
 />
 )}
 </AnimatePresence>

 {/* Render tooltip safely on top of everything */}
 <AnimatePresence>
 {activeStep && stepData && activeRef && (
 <motion.div
 key="tooltip"
 id="tour-tooltip-wrapper"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: tooltipReady ? 1 : 0, scale: tooltipReady ? 1 : 0.95 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ type: 'spring', stiffness: 300, damping: 25 }}
 className="fixed top-0 left-0 z-[110] pointer-events-auto origin-top-left"
 style={{ x: tooltipX, y: tooltipY, willChange: 'transform' }}
 >
 <div className="w-80 max-w-[calc(100vw-32px)] dark:bg-slate-900 bg-white border border-cyan-500 shadow-md rounded-xl p-5">
 <h4 className="dark:text-cyan-400 text-cyan-700 font-bold mb-2 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
 {stepData.title}
 </h4>
 <p className="dark:text-slate-300 text-slate-600 text-sm mb-4 leading-relaxed">
 {stepData.description}
 </p>
 
 <div className="flex flex-col gap-3">
 <label className="flex items-start gap-3 cursor-pointer group">
 <div className="relative flex items-center justify-center mt-0.5">
 <input
 type="checkbox"
 checked={stepData.checked}
 onChange={(e) => stepData.setChecked(e.target.checked)}
 className="w-5 h-5 appearance-none rounded border-2 border-slate-600 checked:bg-cyan-500 checked:border-cyan-500 transition-colors"
 />
 {stepData.checked && <Check className="absolute w-3 h-3 dark:text-white text-slate-900 pointer-events-none" />}
 </div>
 <span className="text-xs dark:text-slate-400 text-slate-600 group-hover:dark:text-slate-300 text-slate-600 transition-colors">
 I understand how this works
 </span>
 </label>

 <Button
 variant="outline"
 disabled={!stepData.checked}
 onClick={stepData.handleGotIt}
 className="w-full bg-cyan-950/50 border-cyan-500/50 dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 hover:bg-cyan-500 hover:dark:text-white text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
 <span className="relative font-bold flex items-center justify-center gap-2">
 Continue <ChevronRight className="w-4 h-4" />
 </span>
 </Button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </TourContext.Provider>
 );
}

export function useTour() {
 const context = useContext(TourContext);
 if (!context) throw new Error('useTour must be within TourProvider');
 return context;
}

interface TourStepProps {
 id: string;
 title: string;
 description: string;
 children: ReactNode;
 position?: 'top' | 'bottom' | 'left' | 'right';
 className?: string;
 nextStep?: string;
 onNext?: () => void;
}

export function TourStep({ id, title, description, children, position = 'bottom', className = '', nextStep, onNext }: TourStepProps) {
 const { activeStep, markCompleted, setActiveStep, setActiveRef, setStepData } = useTour();
 const [checked, setChecked] = useState(false);
 const containerRef = React.useRef<HTMLDivElement>(null);

 const isActive = activeStep === id;

 useEffect(() => {
 if (isActive && containerRef.current) {
 setActiveRef(containerRef);
 containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
 return () => setActiveRef(null);
 }
 }, [isActive, id, setActiveRef]);

 const handleGotIt = () => {
 if (!checked) return;
 markCompleted(id);
 if (onNext) onNext();
 if (nextStep) {
 setTimeout(() => setActiveStep(nextStep), 300); // Wait for exit animation
 }
 };

 useEffect(() => {
 if (isActive) {
 setStepData({
 title,
 description,
 position,
 checked,
 setChecked,
 handleGotIt
 });
 }
 }, [isActive, title, description, position, checked]);

 return (
 <div ref={containerRef} className={`relative ${className} ${isActive ? 'z-[100]' : ''}`}>
 {children}
 {isActive && (
 <motion.div
 layoutId="tour-spotlight"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
 className="absolute -inset-2 rounded-2xl ring-2 ring-cyan-500 shadow-md z-[-1] pointer-events-none dark:bg-slate-900/50 bg-white"
 />
 )}
 </div>
 );
}
