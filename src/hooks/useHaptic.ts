import { useCallback } from 'react';
import { vibrate } from '../lib/haptics';

export const useHaptic = () => {
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    vibrate(pattern);
  }, []);

  const hapticLight = useCallback(() => triggerHaptic(50), [triggerHaptic]);
  const hapticMedium = useCallback(() => triggerHaptic(120), [triggerHaptic]);
  const hapticHeavy = useCallback(() => triggerHaptic(250), [triggerHaptic]);
  const hapticSuccess = useCallback(() => triggerHaptic([100, 100, 100]), [triggerHaptic]);
  const hapticLevelUp = useCallback(() => triggerHaptic([150, 100, 150, 100, 300]), [triggerHaptic]);

  return {
    triggerHaptic,
    hapticLight,
    hapticMedium,
    hapticHeavy,
    hapticSuccess,
    hapticLevelUp,
  };
};
