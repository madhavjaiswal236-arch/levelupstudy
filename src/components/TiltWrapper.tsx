import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltWrapperProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
}

export const TiltWrapper: React.FC<TiltWrapperProps> = React.memo(({ children, className = '', tiltAmount = 6 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canTilt, setCanTilt] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values to track pointer coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Responsive, stabilized springs with high damping to prevent overshoot or wobble
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 38 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 38 });

  // Map coordinate bounds (-0.5 to 0.5) to rotation range
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`]);

  useEffect(() => {
    // Only enable 3D tilt effects on devices with a mouse/pointer and hover support
    if (typeof window !== 'undefined') {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      setCanTilt(finePointer);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!canTilt) return;
    if (typeof document !== 'undefined' && document.body.classList.contains('is-scrolling')) return;
    setIsHovered(true);
  }, [canTilt]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTilt) return;
    if (typeof document !== 'undefined' && document.body.classList.contains('is-scrolling')) return;
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    
    x.set(Math.max(-0.5, Math.min(0.5, xPct)));
    y.set(Math.max(-0.5, Math.min(0.5, yPct)));
  }, [canTilt, x, y]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  // If touch screen or mobile, render cleanly without 3D layer overhead
  if (!canTilt) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      style={{ perspective: 1000 }}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={ref}
        style={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
        className="w-full h-full relative"
      >
        {children}
      </motion.div>
    </div>
  );
});

TiltWrapper.displayName = 'TiltWrapper';
