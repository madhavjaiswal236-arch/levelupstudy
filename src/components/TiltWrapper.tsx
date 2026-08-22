import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltWrapperProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
}

export const TiltWrapper: React.FC<TiltWrapperProps> = React.memo(({ children, className = '', tiltAmount = 10 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<{ width: number; height: number; left: number; top: number } | null>(null);
  
  // Motion values to track the pointer's coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // High performance responsive springs
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 30 });

  // Map coordinate bounds (-0.5 to 0.5) to rotation range
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`]);

  const handleMouseEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      rectRef.current = {
        width: rect.width || 1,
        height: rect.height || 1,
        left: rect.left,
        top: rect.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rectRef.current && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      rectRef.current = {
        width: rect.width || 1,
        height: rect.height || 1,
        left: rect.left,
        top: rect.top,
      };
    }
    if (!rectRef.current) return;

    const mouseX = e.clientX - rectRef.current.left;
    const mouseY = e.clientY - rectRef.current.top;
    
    const xPct = mouseX / rectRef.current.width - 0.5;
    const yPct = mouseY / rectRef.current.height - 0.5;
    
    x.set(Math.max(-0.5, Math.min(0.5, xPct)));
    y.set(Math.max(-0.5, Math.min(0.5, yPct)));
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    rectRef.current = null;
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      style={{ perspective: 1000 }}
      className={className}
    >
      <motion.div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        className="w-full h-full relative"
      >
        {children}
      </motion.div>
    </motion.div>
  );
});
