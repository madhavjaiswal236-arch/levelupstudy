import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Globe, Users, MapPin, Flame, Brain, Clock, Medal } from 'lucide-react';

export default function HallOfFame() {
 const [activeTab, setActiveTab] = useState('global');

 const tabs = [
 { id: 'global', label: 'Global', icon: Globe },
 { id: 'regional', label: 'Regional', icon: MapPin },
 { id: 'friends', label: 'Friends', icon: Users },
 ];

 const leaderboardData = [
 { rank: 1, name: "Aryan S.", level: 99, xp: 125400, streak: 365, deepWork: 1200, isCurrentUser: false, avatar: "Felix" },
 { rank: 2, name: "Meera K.", level: 95, xp: 118200, streak: 210, deepWork: 1050, isCurrentUser: false, avatar: "Aneka" },
 { rank: 3, name: "Rohan D.", level: 92, xp: 105000, streak: 180, deepWork: 980, isCurrentUser: false, avatar: "Jack" },
 { rank: 4, name: "Priya M.", level: 88, xp: 95000, streak: 150, deepWork: 850, isCurrentUser: false, avatar: "Jocelyn" },
 { rank: 42, name: "AIR 1 Aspirant", level: 42, xp: 45000, streak: 14, deepWork: 320, isCurrentUser: true, avatar: "Felix" }, // Current User
 ];

 return (
 <div className="space-y-8">
 <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-600">
 HALL OF FAME
 </h1>
 <p className="dark:text-amber-400 text-amber-700 font-mono text-sm mt-1 flex items-center gap-2">
 <Trophy className="w-4 h-4" />
 SEASON 4 • ENDS IN 14 DAYS
 </p>
 </div>
 </header>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Leaderboard Section */}
 <div className="lg:col-span-2 space-y-6">
 {/* Tabs */}
 <div className="flex gap-2 p-1 dark:bg-black bg-slate-50 rounded-lg border dark:border-white/5 border-black/5 w-fit">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 group ${
 activeTab === tab.id ? 'dark:text-amber-400 text-amber-700' : 'dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900'
 }`}
 >
 {activeTab === tab.id && (
 <motion.div
 layoutId="hof-tab"
 className="absolute inset-0 bg-amber-500/10 border border-amber-500/30 rounded-md shadow-md"
 initial={false}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 />
 )}
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative z-10 group-hover:drop-shadow-md transition-all">
 <tab.icon className="w-4 h-4" />
 </motion.div>
 <span className="relative z-10">{tab.label}</span>
 </button>
 ))}
 </div>

 {/* Leaderboard List */}
 <Card className="border-amber-500/20 dark:bg-black bg-slate-50 ">
 <CardContent className="p-0">
 <div className="divide-y divide-white/5">
 {leaderboardData.map((user, index) => (
 <motion.div
 key={user.rank}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.1 }}
 className={`flex items-center gap-4 p-4 transition-colors ${
 user.isCurrentUser 
 ? 'bg-amber-500/10 border-l-4 border-l-amber-400' 
 : 'hover:bg-white'
 }`}
 >
 <div className="w-12 text-center font-black text-2xl text-slate-500 group/rank">
 {user.rank === 1 ? <motion.div whileHover={{ scale: 1.2, rotate: 15 }}><Medal className="w-8 h-8 dark:text-yellow-400 text-yellow-700 mx-auto drop-shadow-md group-hover/rank:drop-shadow-md transition-all" /></motion.div> : 
 user.rank === 2 ? <motion.div whileHover={{ scale: 1.2, rotate: -15 }}><Medal className="w-8 h-8 dark:text-slate-300 text-slate-600 mx-auto group-hover/rank:drop-shadow-md transition-all" /></motion.div> : 
 user.rank === 3 ? <motion.div whileHover={{ scale: 1.2, rotate: 15 }}><Medal className="w-8 h-8 dark:text-amber-400 text-amber-700 mx-auto group-hover/rank:drop-shadow-md transition-all" /></motion.div> : 
 `#${user.rank}`}
 </div>
 
 <div className="w-12 h-12 rounded-full dark:bg-slate-800 bg-slate-100 border dark:border-slate-700 border-slate-300 overflow-hidden flex-shrink-0">
 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}&backgroundColor=1e293b`} alt={user.name} />
 </div>

 <div className="flex-1 min-w-0">
 <h3 className={`font-bold truncate ${user.isCurrentUser ? 'dark:text-amber-400 text-amber-700' : 'dark:text-slate-200 text-slate-900'}`}>
 {user.name}
 </h3>
 <div className="flex items-center gap-3 text-xs dark:text-slate-400 text-slate-600 font-mono mt-1">
 <span className="flex items-center gap-1"><Flame className="w-3 h-3 dark:text-orange-400 text-orange-600" /> {user.streak}d</span>
 <span className="flex items-center gap-1"><Brain className="w-3 h-3 dark:text-purple-400 text-purple-700" /> {user.deepWork}h</span>
 </div>
 </div>

 <div className="text-right">
 <div className="font-black text-lg dark:text-slate-200 text-slate-900">LVL {user.level}</div>
 <div className="text-xs font-mono dark:text-amber-400 text-amber-700/80">{user.xp.toLocaleString()} XP</div>
 </div>
 </motion.div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Achievements & Stats */}
 <div className="space-y-6">
 <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-cyan-400 text-cyan-700">
 <Trophy className="w-5 h-5" />
 Your Standing
 </CardTitle>
 <CardDescription>Top 15% Globally. Keep pushing to reach Top 10%.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <div className="flex justify-between text-sm mb-1 font-mono">
 <span className="dark:text-slate-300 text-slate-600">Next Rank: Top 10%</span>
 <span className="dark:text-cyan-400 text-cyan-700">12,500 XP needed</span>
 </div>
 <div className="h-2 dark:bg-slate-800 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-cyan-400 w-[65%] shadow-md" />
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 group/badges w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }}>
 <Medal className="w-5 h-5 dark:text-slate-400 text-slate-600 group-hover/badges:dark:text-slate-300 text-slate-600 group-hover/badges:drop-shadow-md transition-all" />
 </motion.div>
 Recent Badges
 </CardTitle>
 </CardHeader>
 <CardContent className="grid grid-cols-2 gap-4">
 {[
 { name: "Deep Focus", icon: Brain, color: "dark:text-purple-400 text-purple-700", bg: "bg-purple-500/10", border: "border-purple-500/20" },
 { name: "7-Day Streak", icon: Flame, color: "dark:text-orange-400 text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/20" },
 { name: "Night Owl", icon: Clock, color: "dark:text-blue-400 text-blue-700", bg: "bg-blue-500/10", border: "border-blue-500/20" },
 { name: "Top 20%", icon: Trophy, color: "dark:text-amber-400 text-amber-700", bg: "bg-amber-500/10", border: "border-amber-500/20" },
 ].map((badge, i) => (
 <div key={`i-${i}`} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${badge.border} ${badge.bg} text-center gap-2 group/badge cursor-pointer`}>
 <motion.div whileHover={{ scale: 1.2, rotate: 10 }} transition={{ duration: 0.5 }}>
 <badge.icon className={`w-8 h-8 ${badge.color} group-hover/badge:drop-shadow-md transition-all`} />
 </motion.div>
 <span className="text-xs font-bold dark:text-slate-300 text-slate-600 group-hover/badge:dark:text-slate-100 text-slate-900 transition-colors">{badge.name}</span>
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
