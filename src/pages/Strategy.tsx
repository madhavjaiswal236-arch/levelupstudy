import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Code, Rocket, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

export default function Strategy() {
 return (
 <div className="space-y-8 pb-12">
 <header>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-500 from-slate-900 to-slate-600">
 SYSTEM ARCHITECTURE & STRATEGY
 </h1>
 <p className="dark:text-purple-400 text-purple-700 font-mono text-sm mt-1 flex items-center gap-2">
 <BrainCircuit className="w-4 h-4" />
 CLASSIFIED: AIR 1 BLUEPRINT
 </p>
 </header>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Architecture & Tech Stack */}
 <Card className="border-cyan-500/20">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-cyan-400 text-cyan-700 group/arch w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative z-10">
 <Code className="w-5 h-5 group-hover/arch:drop-shadow-md transition-all" />
 </motion.div>
 1. Tech Stack & Architecture
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 dark:text-slate-300 text-slate-600 text-sm leading-relaxed">
 <div>
 <strong className="dark:text-white text-slate-900">Frontend:</strong> React 19 + Vite + Tailwind CSS + Framer Motion. This ensures the "Apple-level polish" with 60fps holographic animations.
 </div>
 <div>
 <strong className="dark:text-white text-slate-900">Backend:</strong> Node.js/Express or Next.js API routes for handling the complex XP economy and anti-cheat logic.
 </div>
 <div>
 <strong className="dark:text-white text-slate-900">Database:</strong> PostgreSQL (Supabase) for relational data (users, quests, transactions) + Redis for real-time streak tracking and leaderboard caching.
 </div>
 <div>
 <strong className="dark:text-white text-slate-900">AI Layer:</strong> Google Gemini API for behavioral analysis, dynamic pricing in the Leisure Store, and generating personalized "Redemption Quests".
 </div>
 </CardContent>
 </Card>

 {/* AI Logic */}
 <Card className="border-purple-500/20">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-purple-400 text-purple-700">
 <BrainCircuit className="w-5 h-5" />
 2. Core AI Logic
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 dark:text-slate-300 text-slate-600 text-sm leading-relaxed">
 <div>
 <strong className="dark:text-white text-slate-900">Dynamic XP Economy:</strong> The AI monitors the user's "focus fatigue". If the user studies for 4 hours straight, the cost of a "15 Min Walk" drops to near zero, while "15 Min Instagram" spikes to 1000 XP to prevent dopamine hijacking.
 </div>
 <div>
 <strong className="dark:text-white text-slate-900">Performance Analyst:</strong> Ingests mock test scores and study logs. Uses regression analysis to predict future scores and identifies specific weak topics (e.g., "Rotational Mechanics accuracy drops after 8 PM").
 </div>
 <div>
 <strong className="dark:text-white text-slate-900">Anti-Cheat:</strong> AI analyzes study patterns. If a user logs 14 hours of "Deep Work" with zero breaks, the system flags it and requires a "Proof of Work" mini-quiz to validate the XP.
 </div>
 </CardContent>
 </Card>

 {/* Feature Enhancements */}
 <Card className="border-amber-500/20">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-amber-400 text-amber-700 group/feat w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative z-10">
 <Rocket className="w-5 h-5 group-hover/feat:drop-shadow-md transition-all" />
 </motion.div>
 3. Feature Enhancements
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 dark:text-slate-300 text-slate-600 text-sm leading-relaxed">
 <ul className="list-disc pl-5 space-y-2">
 <li><strong className="dark:text-white text-slate-900">Boss Fights (Mock Tests):</strong> Treat full-length mock tests as "Boss Fights". Defeating them grants massive XP and unique profile badges.</li>
 <li><strong className="dark:text-white text-slate-900">Guilds (Study Groups):</strong> Form elite squads of 4-5 students. If one breaks their streak, the whole guild loses a multiplier. High social accountability.</li>
 <li><strong className="dark:text-white text-slate-900">Focus Mode Lock:</strong> Integrates with iOS Screen Time / Android Digital Wellbeing API to physically block apps until XP is spent in the Leisure Store.</li>
 </ul>
 </CardContent>
 </Card>

 {/* Monetization & Virality */}
 <Card className="border-emerald-500/20">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-emerald-400 text-emerald-700">
 <TrendingUp className="w-5 h-5" />
 4. Monetization & Virality
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 dark:text-slate-300 text-slate-600 text-sm leading-relaxed">
 <div>
 <strong className="dark:text-white text-slate-900">Monetization (Premium Feel):</strong> 
 <br/>- <em>Free Tier:</em> Basic XP tracking, standard quests.
 <br/>- <em>"S-Tier Pass" ($9/mo):</em> Unlocks the AI Performance Analyst, advanced predictive graphs, custom HUD colors, and detailed weakness heatmaps.
 </div>
 <div className="mt-4">
 <strong className="dark:text-white text-slate-900 flex items-center gap-2"><Users className="w-4 h-4"/> Viral Mechanics:</strong>
 <br/>- <strong>"Proof of Grind" Exports:</strong> Generate highly aesthetic, cyberpunk-style summary cards of the day's grind (e.g., "12h Deep Work Logged") optimized for Instagram Stories.
 <br/>- <strong>Invite Only "Elite Lobbies":</strong> Certain high-tier study groups can only be joined via invite codes from existing S-Tier users, creating artificial scarcity and prestige.
 </div>
 </CardContent>
 </Card>
 
 {/* AI Mentorship & Pedagogy */}
 <Card className="border-rose-500/20 md:col-span-2">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-rose-400 text-rose-700 group/mentor w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative z-10">
 <BrainCircuit className="w-5 h-5 group-hover/mentor:drop-shadow-md transition-all" />
 </motion.div>
 5. The "Ideal Day" & Mentorship Protocol
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 dark:text-slate-300 text-slate-600 text-sm leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <strong className="dark:text-rose-300 dark:text-rose-400 text-rose-700 block mb-2 uppercase tracking-widest text-xs">Progressive Overload & Consistency</strong>
 <p className="mb-2">For a student at 3-4 hours, jumping to 10 hours destroys consistency. We build discipline in phases:</p>
 <ul className="list-disc pl-5 space-y-1">
 <li><strong className="dark:text-white text-slate-900">Fixed Start Time:</strong> Eliminate decision fatigue by standardizing the initiation block.</li>
 <li><strong className="dark:text-white text-slate-900">Win the First 30 Mins:</strong> No phone. Start with clear, low-resistance tasks (e.g. revision) to build momentum.</li>
 <li><strong className="dark:text-white text-slate-900">Track Output:</strong> Measure questions solved or concepts gripped, not just sitting hours.</li>
 <li><strong className="dark:text-white text-slate-900">Progressive Climbing:</strong> Week 1 (4h) → Week 3 (6h) → Week 5 (7h+).</li>
 </ul>
 <p className="mt-2 italic text-slate-500">Discipline isn't doing everything perfectly. It's returning quickly after disruption.</p>
 </div>
 <div>
 <strong className="dark:text-rose-300 dark:text-rose-400 text-rose-700 block mb-2 uppercase tracking-widest text-xs">AI Mentor Stance on Underperformance</strong>
 <p className="mb-2">Underperformance is data, not disobedience. The AI does not scold; it diagnoses (Fatigue, Overload, Emotional collapse, Broken discipline).</p>
 <ul className="list-disc pl-5 space-y-1">
 <li><strong className="dark:text-white text-slate-900">Stop Guilt Spirals:</strong> Underperform → diagnose → adjust → restart. Do not guilt-trip.</li>
 <li><strong className="dark:text-white text-slate-900">Reduce Targets:</strong> When failing, drop the goal. Ask the student for 3 focused hours to rebuild self-trust. Motion beats stagnation.</li>
 <li><strong className="dark:text-white text-slate-900">Start Easy:</strong> Break resistance via easy, high-momentum tasks. Failure on Tuesday doesn't dictate Wednesday.</li>
 </ul>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
