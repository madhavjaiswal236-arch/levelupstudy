import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TiltWrapper } from '../components/TiltWrapper';
import { Trophy, Swords, TrendingUp, Flame, ChevronUp, ChevronDown } from 'lucide-react';

const initialLeaderboard = [
 { id: 1, name: 'Aarav Sharma', score: 285, rank: 1, trend: 'up', isPeer: false },
 { id: 2, name: 'Riya Patel', score: 278, rank: 2, trend: 'same', isPeer: false },
 { id: 3, name: 'Kabir Singh', score: 270, rank: 3, trend: 'up', isPeer: true },
 { id: 4, name: 'You (AIR 1 Aspirant)', score: 265, rank: 4, trend: 'down', isPeer: false },
 { id: 5, name: 'Ananya Gupta', score: 260, rank: 5, trend: 'up', isPeer: false },
 { id: 6, name: 'Dev Joshi', score: 255, rank: 6, trend: 'down', isPeer: false },
];

export default function Rivals() {
 const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
 const [peerMode, setPeerMode] = useState(true);

 // Simulate dynamic progress
 useEffect(() => {
 const interval = setInterval(() => {
 setLeaderboard(prev => {
 const newBoard = [...prev];
 // Peer randomly gains points
 const peerIndex = newBoard.findIndex(u => u.isPeer);
 if (peerIndex !== -1 && Math.random() > 0.5) {
 newBoard[peerIndex].score += Math.floor(Math.random() * 5);
 }
 // Sort by score
 newBoard.sort((a, b) => b.score - a.score);
 // Update ranks
 return newBoard.map((u, i) => ({ ...u, rank: i + 1 }));
 });
 }, 5000); // Every 5 seconds for dramatic effect

 return () => clearInterval(interval);
 }, []);

 const containerVariants = {
 hidden: { opacity: 0 },
 show: { opacity: 1, transition: { staggerChildren: 0.1 } }
 };

 const itemVariants = {
 hidden: { opacity: 0, y: 30, scale: 0.9 },
 show: { 
 opacity: 1, 
 y: 0, 
 scale: 1, 
 transition: { type: "spring" as const, stiffness: 120, damping: 10 } 
 }
 };

 return (
 <div className="space-y-8 pb-12">
 <motion.header variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
 PEER PROGRESS
 </h1>
 <p className="dark:text-purple-400 text-purple-700 font-mono text-sm mt-1 flex items-center gap-2">
 <Swords className="w-4 h-4" />
 COMMUNITY LEADERBOARD & STUDY BUDDIES
 </p>
 </div>
 </motion.header>

 {peerMode && (
 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-purple-500/10 border border-purple-500/50 p-6 rounded-xl relative overflow-hidden"
 >
 <div className="absolute -top-16 -right-16 w-80 h-80 bg-purple-500/15 rounded-full blur-[80px] pointer-events-none" />
 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
 <div>
 <h2 className="text-2xl font-black dark:text-purple-400 text-purple-700 flex items-center gap-3 uppercase tracking-wider">
 <Flame className="w-8 h-8 animate-pulse dark:text-purple-400 text-purple-700" />
 Study Buddy Progress
 </h2>
 <p className="text-purple-200 mt-2 font-mono">
 Kabir Singh just completed 50 Advanced Physics problems. He is currently <span className="font-bold dark:text-white text-slate-900">{leaderboard.find(u => u.isPeer)?.score - leaderboard.find(u => u.name.includes('You'))?.score} points</span> ahead. Great time to catch up!
 </p>
 </div>
 <button className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black tracking-widest rounded-lg transition-all shadow-md whitespace-nowrap">
 START STUDYING
 </button>
 </div>
 </motion.div>
 )}

 <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Leaderboard */}
 <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
 <Card className="dark:border-white/10 border-black/10 dark:bg-black bg-slate-50 ">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-slate-200 text-slate-900">
 <Trophy className="w-5 h-5 dark:text-amber-400 text-amber-700" />
 GLOBAL RANKINGS (Mock Test #14)
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-white/5">
 {leaderboard.map((user) => (
 <motion.div 
 key={user.id}
 className={`flex items-center justify-between p-4 transition-colors ${
 user.name.includes('You') ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : 
 user.isPeer ? 'bg-purple-500/5 border-l-4 border-purple-500' : 'hover:bg-white'
 }`}
 >
 <div className="flex items-center gap-4">
 <div className={`w-8 text-center font-mono font-bold ${
 user.rank === 1 ? 'dark:text-amber-400 text-amber-700' : 
 user.rank === 2 ? 'dark:text-slate-300 text-slate-600' : 
 user.rank === 3 ? 'text-amber-700' : 'text-slate-500'
 }`}>
 #{user.rank}
 </div>
 <div>
 <div className="font-bold dark:text-slate-200 text-slate-900 flex items-center gap-2">
 {user.name}
 {user.isPeer && <span className="text-[10px] bg-purple-500/20 dark:text-purple-400 text-purple-700 px-2 py-0.5 rounded uppercase tracking-wider">Peer</span>}
 {user.name.includes('You') && <span className="text-[10px] bg-cyan-500/20 dark:text-cyan-400 text-cyan-700 px-2 py-0.5 rounded uppercase tracking-wider">You</span>}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-6">
 <div className="font-mono text-xl font-black dark:text-white text-slate-900">
 {user.score}
 </div>
 <div className="w-6 flex justify-center">
 {user.trend === 'up' ? <ChevronUp className="w-5 h-5 dark:text-green-400 text-green-700" /> :
 user.trend === 'down' ? <ChevronDown className="w-5 h-5 dark:text-red-400 text-red-700" /> :
 <span className="text-slate-600">-</span>}
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 </CardContent>
 </Card>
 </motion.div>

 {/* Peer Stats */}
 <motion.div variants={itemVariants} className="space-y-6">
 <TiltWrapper tiltAmount={4}>
 <Card className="border-purple-500/30 bg-purple-500/5">
 <CardHeader>
 <CardTitle className="text-lg font-bold flex items-center gap-2 dark:text-purple-400 text-purple-700">
 <Swords className="w-5 h-5" />
 PEER ANALYSIS
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <div className="flex justify-between text-sm dark:text-slate-400 text-slate-600">
 <span>Kabir's Accuracy</span>
 <span className="dark:text-green-400 text-green-700 font-mono">88%</span>
 </div>
 <div className="flex justify-between text-sm dark:text-slate-400 text-slate-600">
 <span>Your Accuracy</span>
 <span className="dark:text-amber-400 text-amber-700 font-mono">76%</span>
 </div>
 </div>
 
 <div className="pt-4 border-t dark:border-white/10 border-black/10">
 <h4 className="text-sm font-bold dark:text-slate-300 text-slate-600 mb-2">Recent Activity</h4>
 <ul className="space-y-3 text-sm">
 <li className="flex items-start gap-2 dark:text-slate-400 text-slate-600">
 <span className="dark:text-purple-400 text-purple-700 mt-0.5">•</span>
 Scored 110/120 in Math Chapter Test
 </li>
 <li className="flex items-start gap-2 dark:text-slate-400 text-slate-600">
 <span className="dark:text-purple-400 text-purple-700 mt-0.5">•</span>
 Logged 6 hours of Deep Work today
 </li>
 </ul>
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>
 </motion.div>
 </div>
 );
}
