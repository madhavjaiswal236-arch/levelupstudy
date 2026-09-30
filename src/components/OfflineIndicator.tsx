import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Offline Mode — Study progress saving locally</span>
        </motion.div>
      )}

      {showReconnected && isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md"
        >
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Back Online — Changes synced</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
