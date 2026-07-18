import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltWrapperProps {
 children: React.ReactNode;
 className?: string;
 tiltAmount?: number;
}

export const TiltWrapper: React.FC<TiltWrapperProps> = ({ children, className = '', tiltAmount = 10 }) => {
 const ref = useRef<HTMLDivElement>(null);
 
 // Motion values to track the pointer's coordinates exactly
 const x = useMotionValue(0);
 const y = useMotionValue(0);

 // Springs to add bounce and physics
 const mouseXSpring = useSpring(x, { stiffness: 350, damping: 25 });
 const mouseYSpring = useSpring(y, { stiffness: 350, damping: 25 });

 // Map coordinate bounds (-0.5 to 0.5) to rotation range
 const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`]);
 const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`]);

 // Handle pointer enter and move
 const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!ref.current) return;
 const rect = ref.current.getBoundingClientRect();
 
 const width = rect.width;
 const height = rect.height;
 
 // Pointer coordinates relative to the element
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;
 
 // Normalize coordinates (-0.5 to 0.5 midpoint)
 const xPct = mouseX / width - 0.5;
 const yPct = mouseY / height - 0.5;
 
 x.set(xPct);
 y.set(yPct);
 };

 const handleMouseLeave = () => {
 // Snap back to 0 softly
 x.set(0);
 y.set(0);
 };

 return (
 <motion.div
 style={{ perspective: 1200 }}
 className={className}
 >
 <motion.div
 ref={ref}
 onMouseMove={handleMouseMove}
 onMouseLeave={handleMouseLeave}
 style={{
 rotateX,
 rotateY
 }}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="w-full h-full relative"
 >
 {children}
 </motion.div>
 </motion.div>
 );
};
