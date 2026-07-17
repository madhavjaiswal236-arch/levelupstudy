import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

export default function AnimatedNumber({ value }: { value: number }) {
 const spring = useSpring(value, { stiffness: 100, damping: 20 });

 useEffect(() => {
 spring.set(value);
 }, [value, spring]);

 const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

 return <motion.span>{display}</motion.span>;
}
