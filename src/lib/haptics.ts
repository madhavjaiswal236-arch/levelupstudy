import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const HAPTIC_PATTERNS = {
  // Light tap for standard buttons, tabs, toggles
  TAP: 50,
  // Double tap for confirmations, small achievements
  DOUBLE_TAP: [60, 100, 60],
  // Success pattern for level ups, task completions, streak milestones
  SUCCESS: [100, 100, 100, 100, 200],
  // Warning/Error for mistakes, timer ending, failure
  WARNING: [200, 100, 200],
  // Heavy thud for deleting, resetting
  THUD: 200,
  // Addictive heartbeat pattern for entering "Deep Focus" or big boss battles
  HEARTBEAT: [100, 100, 100, 800, 100, 100, 100],
  // XP Gain tick
  TICK: 30
};

export const vibrate = async (pattern: number | number[], intensityMultiplier: number = 1.0) => {
  if (Capacitor.isNativePlatform()) {
    try {
      if (pattern === HAPTIC_PATTERNS.TAP || pattern === HAPTIC_PATTERNS.TICK) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (pattern === HAPTIC_PATTERNS.DOUBLE_TAP) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (pattern === HAPTIC_PATTERNS.SUCCESS) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (pattern === HAPTIC_PATTERNS.WARNING || pattern === HAPTIC_PATTERNS.THUD) {
        await Haptics.vibrate({ duration: 200 });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch(e) {}
    return;
  }

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern.map(p => p * intensityMultiplier));
      } else {
        navigator.vibrate(pattern * intensityMultiplier);
      }
    } catch (e) {}
  }
};
