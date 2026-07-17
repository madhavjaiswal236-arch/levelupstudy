import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface DeepFocusOverlayProps {
 sessionStartTime: number;
 onStop: () => void;
}

export function DeepFocusOverlay({
 sessionStartTime,
 onStop,
}: DeepFocusOverlayProps) {
 const [elapsedTime, setElapsedTime] = React.useState(0);

 React.useEffect(() => {
 const interval = setInterval(() => {
 setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
 }, 1000);
 return () => clearInterval(interval);
 }, [sessionStartTime]);
 const formatTimeBig = (seconds: number) => {
 const h = Math.floor(seconds / 3600);
 const m = Math.floor((seconds % 3600) / 60);
 const s = seconds % 60;
 if (h > 0) {
 return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
 }
 return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
 };

 return createPortal(
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.5 }}
 className="fixed inset-0 z-[9999] flex flex-col items-center justify-center dark:bg-black bg-slate-50 pointer-events-auto "
 >
 <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 via-black to-purple-900/40" />

 <motion.div
 initial={{ scale: 0.5, y: 50, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 exit={{ scale: 0.8, opacity: 0 }}
 transition={{
 type: "spring",
 stiffness: 200,
 damping: 15,
 bounce: 0.5,
 }}
 className="text-center relative z-10 space-y-8"
 >
 <div className="text-[120px] md:text-[200px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 tracking-tighter drop-shadow-md">
 {formatTimeBig(elapsedTime)}
 </div>

 <div className="space-y-4">
 <h2 className="text-3xl md:text-5xl font-bold dark:text-white text-slate-900 uppercase tracking-widest drop-shadow-lg font-mono">
 Deep Focus Engaged
 </h2>
 </div>

 <div className="pt-12">
 <button
 onClick={onStop}
 className="dark:text-slate-400 text-slate-600 hover:dark:text-white text-slate-900 uppercase tracking-[0.3em] font-bold text-sm transition-all hover:scale-105 hover:drop-shadow-md border-b border-transparent hover:border-white pb-1"
 >
 Disengage
 </button>
 </div>
 </motion.div>
 </motion.div>,
 document.body,
 );
}
