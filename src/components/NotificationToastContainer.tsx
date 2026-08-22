import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Flame, Zap, Clock, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { subscribeInAppNotifications, InAppToast } from '../lib/notifications';

export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<InAppToast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((toast) => {
      setToasts(prev => [toast, ...prev].slice(0, 3)); // Keep max 3 on screen

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastIcon = (type: InAppToast['type']) => {
    switch (type) {
      case 'streak':
        return <Flame className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'motivation':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'task':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'study_block':
        return <Clock className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  const getToastBorder = (type: InAppToast['type']) => {
    switch (type) {
      case 'streak':
        return 'border-amber-500/50 bg-amber-950/80 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
      case 'motivation':
        return 'border-yellow-500/40 bg-slate-900/90 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)]';
      case 'task':
        return 'border-emerald-500/40 bg-slate-900/90 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
      case 'study_block':
        return 'border-cyan-500/40 bg-slate-900/90 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.2)]';
      default:
        return 'border-purple-500/40 bg-slate-900/90 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.2)]';
    }
  };

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none space-y-3"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-xl flex items-start gap-3 shadow-2xl relative overflow-hidden ${getToastBorder(toast.type)}`}
          >
            <div className="p-2 rounded-xl bg-black/30 border border-white/10 shrink-0 mt-0.5">
              {getToastIcon(toast.type)}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h4 className="text-sm font-black tracking-wide leading-tight mb-0.5">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {toast.body}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 origin-left"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
