import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TiltWrapper } from '@/components/TiltWrapper';
import { ShoppingCart, BrainCircuit, Activity, Gamepad2, Coffee, Smartphone, AlertTriangle, Clock, Crown, Sparkles, Gem, Trophy, Shield, Tv, MonitorPlay, Utensils, Coins, Key, Copy, Check, Ticket, ExternalLink, Trash2 } from 'lucide-react';
import { HAPTIC_PATTERNS, vibrate } from "@/lib/haptics";
import { useAppContext } from '@/context/AppContext';
import { TourStep, useTour } from '@/components/TourGuide';

interface StoreItem {
 id: number;
 title: string;
 icon: any;
 baseCost: number;
 type: 'high-stimulation' | 'recovery';
 desc: string;
 uses: number;
 cooldownUntil: number | null;
}

const EPIC_ITEMS = [
 { id: 'title_grindset', title: '"The Grindset" Title', icon: Trophy, cost: 5000, type: 'title', value: 'The Grindset', desc: 'A permanent badge of honor showing your dedication.' },
 { id: 'title_iitian', title: '"IITian in Training" Title', icon: Crown, cost: 15000, type: 'title', value: 'IITian in Training', desc: 'The ultimate title for serious aspirants.' },
 { id: 'aura_cosmic', title: 'Cosmic Aura', icon: Sparkles, cost: 25000, type: 'aura', value: 'shadow-md border-purple-500', desc: 'A permanent purple glowing aura for your profile.' },
 { id: 'aura_inferno', title: 'Inferno Aura', icon: Gem, cost: 50000, type: 'aura', value: 'shadow-md border-red-500', desc: 'A blazing red aura to show you are on fire.' },
];

const LEGENDARY_ITEMS = [
 { id: 'aura_focus', title: 'Permanent Focus Aura', icon: Sparkles, cost: 100000, type: 'aura', value: 'shadow-md border-sky-400', desc: 'A legendary blue aura that shows your absolute mastery of deep focus.' },
 { id: 'statue_xp_boost', title: 'XP Multiplier Statue', icon: Trophy, cost: 150000, type: 'title', value: 'XP Multiplier Legend', desc: 'Provides a permanent legendary title and shows your incredible XP farming skills.' },
 { id: 'aura_golden', title: 'Golden God Aura', icon: Gem, cost: 250000, type: 'aura', value: 'shadow-md border-yellow-400', desc: 'The ultimate aura. Radiate pure golden energy.' },
];

const INITIAL_ITEMS: StoreItem[] = [
 { id: 1, title: "15 Min Instagram", icon: Smartphone, baseCost: 500, type: "high-stimulation", desc: "Cost increases slightly with each use to encourage moderation.", uses: 0, cooldownUntil: null },
 { id: 2, title: "30 Min Gaming", icon: Gamepad2, baseCost: 800, type: "high-stimulation", desc: "A great reward after a long study session.", uses: 0, cooldownUntil: null },
 { id: 3, title: "Watch an Episode", icon: Tv, baseCost: 1200, type: "high-stimulation", desc: "Watch one 20-30 min episode of a show.", uses: 0, cooldownUntil: null },
 { id: 4, title: "30 Min Youtube", icon: MonitorPlay, baseCost: 600, type: "high-stimulation", desc: "Watch some videos. Moderation is key.", uses: 0, cooldownUntil: null },
 { id: 5, title: "20 Min Power Nap", icon: Coffee, baseCost: 150, type: "recovery", desc: "Priced low to encourage rest after deep work.", uses: 0, cooldownUntil: null },
 { id: 6, title: "15 Min Walk", icon: Activity, baseCost: 50, type: "recovery", desc: "Highly recommended for a cognitive reset.", uses: 0, cooldownUntil: null },
 { id: 7, title: "Quick Snack", icon: Utensils, baseCost: 100, type: "recovery", desc: "Grab a quick snack without breaking focus later.", uses: 0, cooldownUntil: null },
 { id: 8, title: "Streak Freeze", icon: Shield, baseCost: 1000, type: "recovery", desc: "Protects your streak for a missed day.", uses: 0, cooldownUntil: null },
];

export interface ArcadeKey {
  code: string;
  duration: number;
  purchasedAt: number;
}

export const RUNNER_GEM_CODES: Record<string, string[]> = {
  "10": [
    "XM10-K8P9-W3F4-X2TL",
    "XM10-B5M7-N2Y6-P9QR",
    "XM10-T1V4-L9X8-K3HW",
    "XM10-F6D5-J2S1-C7ZP",
    "XM10-G9R4-M5W3-A8VK",
    "XM10-U7B6-H9D4-S1FX",
    "XM10-Q3K8-Y2X7-P5LN",
    "XM10-A9V2-F3W7-T8KM",
    "XM10-J6D5-S4H1-C9ZQ",
    "XM10-N3P8-M2L4-Y5X7",
    "XM10-Z1V9-K2R8-W7TH",
    "XM10-E5S4-B9D6-P3FJ",
    "XM10-H8W7-F9X2-C1LK",
    "XM10-D3R6-V9K2-S8QG",
    "XM10-G5P8-Y1M4-N9ZT",
    "XM10-A1B2-C3D4-E5F6",
    "XM10-F7G8-H9J1-K2L3",
    "XM10-M4N5-P6Q7-R8S9",
    "XM10-T1U2-V3W4-X5Y6",
    "XM10-Z7A8-B9C1-D2E3",
    "XM10-H4D9-S2J8-K1W5",
    "XM10-Y7N2-Q8K5-M3P9",
    "XM10-W1T4-V8X9-Z2L5",
    "XM10-A6B5-D3C7-F9E8",
    "XM10-G1R9-H2S8-K3T7",
    "XM10-J5M4-L6N3-P7Q2",
    "XM10-R1S9-T2U8-V3W7",
    "XM10-X5Y4-Z6A3-B7C2",
    "XM10-D9E8-F1D7-G2H6",
    "XM10-J4K3-L5M2-N6P1",
    "XM10-Q9R8-S1T7-U2V6",
    "XM10-W5X4-Y6Z3-A7B2",
    "XM10-C9D8-E1F7-G2H6",
    "XM10-J1K9-L2M8-N3P7",
    "XM10-Q5R4-S6T3-U7V2",
    "XM10-W1X9-Y2Z8-A3B7",
    "XM10-C5D4-E6F3-G7H2",
    "XM10-J9K8-L1M7-N2P6",
    "XM10-Q1R9-S2T8-U3V7",
    "XM10-W5X4-Y3Z7-A9B1",
    "XM10-C2D9-E3F8-G4H7",
    "XM10-J5K1-L6M2-N7P3",
    "XM10-Q4R9-S5T1-U6V2",
    "XM10-W7X3-Y8Z2-A9B4",
    "XM10-C1D5-E2F6-G3H7"
  ],
  "20": [
    "XM20-H7N3-X9L2-K5WP",
    "XM20-C4F8-P2T7-S9RQ",
    "XM20-V1B6-Y9M3-K4WZ",
    "XM20-D9S5-F2H8-C1LQ",
    "XM20-G3W7-K9Y2-T5LP",
    "XM20-A8V4-B6S1-P9ZN",
    "XM20-J3D7-H9K2-M5FX",
    "XM20-N1Q8-Y2T4-F7WR",
    "XM20-Z5P9-W3C4-X8LK",
    "XM20-E6T7-V9S2-K1HQ",
    "XM20-M8L4-N3P7-G2Y5",
    "XM20-R9X2-F8W6-T1KZ",
    "XM20-K5H3-B9D4-P2SJ",
    "XM20-W7V1-Y2M6-L8NQ",
    "XM20-S3C8-K9D2-F1XP",
    "XM20-A2B3-C4D5-E6F7",
    "XM20-F8G9-H1J2-K3L4",
    "XM20-M5N6-P7Q8-R9S1",
    "XM20-T2U3-V4W5-X6Y7",
    "XM20-Z8A9-B1C2-D3E4",
    "XM20-H5D1-S3J9-K2W6",
    "XM20-Y8N3-Q9K6-M4P1",
    "XM20-W2T5-V9X1-Z3L6",
    "XM20-A7B6-D4C8-F1E9",
    "XM20-G2R1-H3S9-K4T8",
    "XM20-J6M5-L7N4-P8Q3",
    "XM20-R2S1-T3U9-V4W8",
    "XM20-X6Y5-Z7A4-B8C3",
    "XM20-D1E9-F2D8-G3H7",
    "XM20-J5K4-L6M3-N7P2",
    "XM20-Q1R9-S2T8-U3V7",
    "XM20-W6X5-Y7Z4-A8B3",
    "XM20-C1D9-E2F8-G3H7",
    "XM20-J2K1-L3M9-N4P8",
    "XM20-Q6R5-S7T4-U8V3",
    "XM20-W2X1-Y3Z9-A4B8",
    "XM20-C6D5-E7F4-G8H3",
    "XM20-J1K9-L2M8-N3P7",
    "XM20-Q2R1-S3T9-U4V8",
    "XM20-W6X5-Y4Z8-A1B2",
    "XM20-C3D1-E4F9-G5H8",
    "XM20-J6K2-L7M3-N8P4",
    "XM20-Q5R1-S6T2-U7V3",
    "XM20-W8X4-Y9Z3-A1B5",
    "XM20-C2D6-E3F7-G4H8"
  ],
  "30": [
    "XM30-Z9Q4-M3L1-K7P8",
    "XM30-U2D5-W8B6-Y3V4",
    "XM30-A8F1-N6M9-D3R5",
    "XM30-V7G3-X9P2-S4LK",
    "XM30-C1W8-Y2N5-H9TQ",
    "XM30-K5S4-F9D6-P1RZ",
    "XM30-J3B8-M2L9-Y4X5",
    "XM30-T9V2-K8R1-W3FH",
    "XM30-E5H6-B9D4-P7SJ",
    "XM30-G8W7-F9X2-C1LQ",
    "XM30-D3S6-V9K2-S8XG",
    "XM30-N9P8-M2L4-Y5ZT",
    "XM30-R7K3-F9X2-V8WL",
    "XM30-S1B6-Y9M3-K4WZ",
    "XM30-H4F8-P2T7-S9RQ",
    "XM30-A3B4-C5D6-E7F8",
    "XM30-F9G1-H2J3-K4L5",
    "XM30-M6N7-P8Q9-R1S2",
    "XM30-T3U4-V5W6-X7Y8",
    "XM30-Z9A1-B2C3-D4E5",
    "XM30-H6D2-S4J1-K3W7",
    "XM30-Y9N4-Q1K7-M5P2",
    "XM30-W3T6-V1X2-Z4L7",
    "XM30-A8B7-D5C9-F2E1",
    "XM30-G3R2-H4S1-K5T9",
    "XM30-J7M6-L8N5-P9Q4",
    "XM30-R3S2-T4U1-V5W9",
    "XM30-X7Y6-Z8A5-B9C4",
    "XM30-D2E1-F3D9-G4H8",
    "XM30-J6K5-L7M4-N8P3",
    "XM30-Q2R1-S3T9-U4V8",
    "XM30-W7X6-Y8Z5-A9B4",
    "XM30-C2D1-E3F9-G4H8",
    "XM30-J3K2-L4M1-N5P9",
    "XM30-Q7R6-S8T5-U9V4",
    "XM30-W3X2-Y4Z1-A5B9",
    "XM30-C7D6-E8F5-G9H4",
    "XM30-J2K1-L3M9-N4P8",
    "XM30-Q3R2-S4T1-U5V9",
    "XM30-W7X6-Y5Z9-A2B3",
    "XM30-C4D2-E5F1-G6H9",
    "XM30-J7K3-L8M4-N9P5",
    "XM30-Q6R2-S7T3-U8V4",
    "XM30-W9X5-Y1Z4-A2B6",
    "XM30-C3D7-E4F8-G5H9"
  ]
};

export const ARCADE_PASSES = [
  { id: 'arcade_10', title: 'Bronze Arcade Pass', duration: 10, cost: 300, desc: 'Unlocks 10 minutes of study breaks. Earned after watching 1 full lecture (approx. 1 hour) of deep focus.', tag: '10 Min' },
  { id: 'arcade_20', title: 'Silver Arcade Pass', duration: 20, cost: 600, desc: 'Unlocks 20 minutes of high stimulation. Earned after watching 2 full lectures (approx. 2 hours) of deep focus.', tag: '20 Min' },
  { id: 'arcade_30', title: 'Gold Arcade Pass', duration: 30, cost: 900, desc: 'Unlocks 30 minutes of ultimate play. Earned after watching 3 full lectures (approx. 3 hours) of deep focus.', tag: '30 Min' },
];

const Store = React.memo(function Store() {
 const { isLoaded, xp, xpGainedToday, spentXpToday, setSpentXpToday, totalSpentXp, setTotalSpentXp, unlockedItems = [], setUnlockedItems, equippedTitle, setEquippedTitle, equippedAura, setEquippedAura } = useAppContext();
 const { activeStep, setActiveStep, hasCompleted } = useTour();
 
 const spendableXP = Math.max(0, xpGainedToday - spentXpToday);
 const spendableTotalXP = Math.max(0, xp - totalSpentXp);
 const [currentTime, setCurrentTime] = useState(Date.now());
 
 const [items, setItems] = useState<StoreItem[]>(() => {
    try {
      const saved = localStorage.getItem('store_items');
      if (saved) {
        const parsed = JSON.parse(saved) as StoreItem[];
        return INITIAL_ITEMS.map(defaultItem => {
          const savedItem = parsed.find(s => s.id === defaultItem.id);
          return savedItem ? { ...defaultItem, uses: savedItem.uses, cooldownUntil: savedItem.cooldownUntil } : defaultItem;
        });
      }
    } catch {}
    return INITIAL_ITEMS;
  });
  
  useEffect(() => {
    localStorage.setItem('store_items', JSON.stringify(items));
  }, [items]);

 useEffect(() => {
 if (isLoaded && !hasCompleted('store-intro') && activeStep === null) {
 const timer = setTimeout(() => setActiveStep('store-intro'), 500);
 return () => clearTimeout(timer);
 }
 }, [isLoaded, hasCompleted, activeStep, setActiveStep]);

 useEffect(() => {
 const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
 return () => clearInterval(timer);
 }, []);

 const [arcadeKeys, setArcadeKeys] = useState<ArcadeKey[]>(() => {
    try {
      const saved = localStorage.getItem('arcade_purchased_keys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [issuedCodes, setIssuedCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arcade_issued_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copiedCode, setCopiedCode] = useState<string>('');
  const [newPurchase, setNewPurchase] = useState<ArcadeKey | null>(null);
  const [latestCodeCard, setLatestCodeCard] = useState<ArcadeKey | null>(null);
  const [activeArcadeSection, setActiveArcadeSection] = useState<'passes' | 'my-keys'>('passes');

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<'success'|'info'>('success');

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    localStorage.setItem('arcade_purchased_keys', JSON.stringify(arcadeKeys));
  }, [arcadeKeys]);

  useEffect(() => {
    localStorage.setItem('arcade_issued_codes', JSON.stringify(issuedCodes));
  }, [issuedCodes]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    vibrate(HAPTIC_PATTERNS.TAP);
    showToast("Code copied to clipboard!", "success");
    setTimeout(() => {
      setCopiedCode('');
    }, 1500);
  };

  const handleDisposeKey = (code: string) => {
    setArcadeKeys(prev => prev.filter(k => k.code !== code));
    if (latestCodeCard?.code === code) {
      setLatestCodeCard(null);
    }
    if (newPurchase?.code === code) {
      setNewPurchase(null);
    }
    vibrate(HAPTIC_PATTERNS.SUCCESS);
    showToast("Pass key used and permanently disposed!", "success");
  };

  const handlePurchaseArcadePass = (pass: typeof ARCADE_PASSES[0]) => {
    vibrate(HAPTIC_PATTERNS.SUCCESS);
    if (spendableXP >= pass.cost) {
      setSpentXpToday(prev => prev + pass.cost);
      
      const tierCodes = RUNNER_GEM_CODES[String(pass.duration)] || [];
      const availableCodes = tierCodes.filter(c => !issuedCodes.includes(c));
      
      let selectedCode = '';
      if (availableCodes.length > 0) {
        selectedCode = availableCodes[0];
      } else {
        const generatePart = () => {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let part = "";
          for (let i = 0; i < 4; i++) {
            part += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return part;
        };
        // Ensure the randomly generated fallback code is also totally unique
        do {
          selectedCode = `XM${pass.duration}-${generatePart()}-${generatePart()}-${generatePart()}`;
        } while (issuedCodes.includes(selectedCode));
      }

      const newKey: ArcadeKey = {
        code: selectedCode,
        duration: pass.duration,
        purchasedAt: Date.now()
      };

      setIssuedCodes(prev => [...prev, selectedCode]);
      setArcadeKeys(prev => [newKey, ...prev]);
      setNewPurchase(newKey);
      setLatestCodeCard(newKey);
    }
  };

 const handlePurchase = (id: number) => {
    vibrate(HAPTIC_PATTERNS.DOUBLE_TAP);
 setItems(prevItems => prevItems.map(item => {
 if (item.id === id) {
 const currentCost = Math.floor(item.baseCost * Math.pow(1.5, item.uses));
 if (spendableXP >= currentCost && (!item.cooldownUntil || currentTime > item.cooldownUntil)) {
 setSpentXpToday(prev => prev + currentCost);
 const newUses = item.uses + 1;
 let newCooldown = null;
 
 if (item.type === 'high-stimulation' && newUses >= 3) {
 newCooldown = Date.now() + 4 * 60 * 60 * 1000;
 } else if (item.type === 'high-stimulation') {
 newCooldown = Date.now() + 1 * 60 * 60 * 1000;
 }

 return { ...item, uses: newUses, cooldownUntil: newCooldown };
 }
 }
 return item;
 }));
 };

 const handleEpicPurchase = (item: any) => {
 if (spendableTotalXP >= item.cost && !unlockedItems.includes(item.id)) {
 setTotalSpentXp(prev => prev + item.cost);
 setUnlockedItems(prev => [...prev, item.id]);
 }
 };

 const handleEquip = (item: any) => {
 if (item.type === 'title') {
 setEquippedTitle(equippedTitle === item.value ? '' : item.value);
 } else if (item.type === 'aura') {
 setEquippedAura(equippedAura === item.value ? '' : item.value);
 }
 };

 const formatTimeLeft = (targetTime: number) => {
 const diff = targetTime - currentTime;
 if (diff <= 0) return null;
 const hours = Math.floor(diff / (1000 * 60 * 60));
 const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
 const seconds = Math.floor((diff % (1000 * 60)) / 1000);
 return `${hours}h ${minutes}m ${seconds}s`;
 };

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
 transition: { type: "spring" as any, stiffness: 120, damping: 10 } 
 }
 };

 return (
 <div className="space-y-8 pb-12">
 <motion.header variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">
 REWARD CENTER
 </h1>
 <p className="dark:text-amber-400 text-amber-700 font-mono text-sm mt-1 flex items-center gap-2">
 <BrainCircuit className="w-4 h-4" />
 HEALTHY HABITS TRACKER
 </p>
 </div>
 <div className="flex gap-4">
 <Card className="bg-amber-500/10 border-amber-500/30 shadow-md">
 <CardContent className="p-4 flex items-center gap-4">
 <ShoppingCart className="w-6 h-6 dark:text-amber-400 text-amber-700" />
 <div>
 <p className="text-xs dark:text-amber-400 text-amber-700/80 font-mono uppercase tracking-wider">Daily XP</p>
 <p className="text-2xl font-bold font-mono dark:text-white text-slate-900">{spendableXP.toLocaleString()}</p>
 </div>
 </CardContent>
 </Card>
 <Card className="bg-purple-500/10 border-purple-500/30 shadow-md">
 <CardContent className="p-4 flex items-center gap-4">
 <Coins className="w-6 h-6 dark:text-purple-400 text-purple-700" />
 <div>
 <p className="text-xs dark:text-purple-400 text-purple-700/80 font-mono uppercase tracking-wider">Total XP</p>
 <p className="text-2xl font-bold font-mono dark:text-white text-slate-900">{spendableTotalXP.toLocaleString()}</p>
 </div>
 </CardContent>
 </Card>
 </div>
 </motion.header>

 <TourStep
 id="store-intro"
 title="Reward Center"
 description="Exchange your hard-earned XP for breaks and rewards. High-stimulation rewards cost more and have cooldowns to protect your dopamine levels for studying."
 position="bottom"
 >
 <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8 flex items-start gap-4 space-y-0">
 <AlertTriangle className="w-8 h-8 dark:text-amber-400 text-amber-700 shrink-0 mt-1" />
 <div>
 <h2 className="text-lg font-bold dark:text-amber-400 text-amber-700 mb-1 uppercase tracking-wider">Mindful Breaks Enabled</h2>
 <p className="text-sm dark:text-slate-300 text-slate-600">
 Taking breaks is important, but balancing them with deep work is key. High-stimulation activities cost more XP to encourage mindful consumption and maintain your focus for IIT JEE.
 </p>
 </div>
 </motion.div>
 </TourStep>

 <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {items.map((item) => {
 const Icon = item.icon;
 const currentCost = Math.floor(item.baseCost * Math.pow(1.5, item.uses));
 const isAffordable = spendableXP >= currentCost;
 const isHighStimulation = item.type === 'high-stimulation';
 const isOnCooldown = item.cooldownUntil && currentTime < item.cooldownUntil;
 const timeLeft = isOnCooldown ? formatTimeLeft(item.cooldownUntil!) : null;

 return (
 <motion.div
 key={item.id}
 >
 <TiltWrapper tiltAmount={8} className="h-full">
 <Card className={`h-full flex flex-col relative overflow-hidden ${
 isOnCooldown ? 'dark:border-slate-700 border-slate-300 dark:bg-slate-900/50 bg-white opacity-75' :
 isHighStimulation ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50' : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50'
 }`}>
 {isOnCooldown && (
 <div className="absolute inset-0 dark:bg-black bg-slate-50 backdrop- z-10 flex flex-col items-center justify-center text-center p-4">
 <Clock className="w-8 h-8 dark:text-amber-400 text-amber-700 mb-2" />
 <span className="font-bold dark:text-amber-400 text-amber-700 uppercase tracking-wider text-sm">Cooldown Active</span>
 <span className="font-mono dark:text-white text-slate-900 mt-1">{timeLeft}</span>
 </div>
 )}
 <CardHeader className="pb-2">
 <div className="flex justify-between items-start">
 <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
 isHighStimulation ? 'bg-amber-500/20 dark:text-amber-400 text-amber-700 shadow-md' : 'bg-emerald-500/20 dark:text-emerald-400 text-emerald-700'
 }`}>
 <Icon className="w-6 h-6" />
 </div>
 {isHighStimulation && item.uses > 0 && (
 <span className="text-xs font-mono font-bold bg-amber-500/20 dark:text-amber-400 text-amber-700 px-2 py-1 rounded">
 Used: {item.uses}/3
 </span>
 )}
 </div>
 <CardTitle className="text-lg dark:text-slate-100 text-slate-900">{item.title}</CardTitle>
 <CardDescription className="text-xs mt-2 dark:text-slate-400 text-slate-600">{item.desc}</CardDescription>
 </CardHeader>
 <CardContent className="mt-auto pt-4">
 <div className="flex items-center justify-between mb-4">
 <span className="text-sm dark:text-slate-400 text-slate-600">Current Cost</span>
 <span className={`font-mono font-bold text-lg ${isHighStimulation ? 'dark:text-amber-400 text-amber-700' : 'dark:text-emerald-400 text-emerald-700'}`}>
 {currentCost} XP
 </span>
 </div>
 <Button 
 className={`w-full font-bold tracking-wider ${isHighStimulation ? 'bg-amber-600 hover:bg-amber-500 dark:text-white text-slate-900' : 'bg-emerald-600 hover:bg-emerald-500 dark:text-white text-slate-900'}`}
 variant="default"
 disabled={!isAffordable || isOnCooldown}
 onClick={() => handlePurchase(item.id)}
 >
 {!isAffordable && !isOnCooldown ? 'INSUFFICIENT XP' : 'PURCHASE'}
 </Button>
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>
 );
 })}
 </motion.div>

 {/* Runner-Gem Arcade Section */}
 <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mt-16 pt-8 border-t dark:border-white/10 border-black/10">
   <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
     <div>
       <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 flex items-center gap-3">
         <Gamepad2 className="w-8 h-8 text-cyan-500 icon-glow-cyan" />
         RUNNER-GEM ARCADE
       </h2>
       <p className="dark:text-slate-400 text-slate-600 font-mono text-sm mt-1">
         Dopamine-balanced high stimulation game break passes. Buy passes and manage your active keys below.
       </p>
     </div>

     {/* Arcade Tabs */}
     <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-stretch sm:self-auto">
       <button
         onClick={() => setActiveArcadeSection('passes')}
         className={`flex-1 sm:flex-initial px-4 py-2 rounded-md text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
           activeArcadeSection === 'passes'
             ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
             : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
         }`}
       >
         <Ticket className="w-4 h-4" />
         Buy Passes
       </button>
       <button
         onClick={() => setActiveArcadeSection('my-keys')}
         className={`flex-1 sm:flex-initial px-4 py-2 rounded-md text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 relative ${
           activeArcadeSection === 'my-keys'
             ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
             : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
         }`}
       >
         <Key className="w-4 h-4" />
         My Keys
         {arcadeKeys.length > 0 && (
           <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-cyan-500 text-[10px] text-white font-black rounded-full leading-none animate-bounce">
             {arcadeKeys.length}
           </span>
         )}
       </button>
     </div>
   </div>

   {latestCodeCard && (
     <motion.div 
       initial={{ opacity: 0, y: -15 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -15 }}
       className="mb-8"
     >
       <Card className="border-2 border-cyan-500/40 dark:bg-slate-950/40 bg-white relative overflow-hidden shadow-lg shadow-cyan-500/5">
         <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
         <CardHeader className="pb-3 flex flex-row items-start justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-lg animate-pulse">
               <Gamepad2 className="w-5 h-5" />
             </div>
             <div>
               <CardTitle className="text-base font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
                 <span>Your Unlocked Game Pass Key</span>
                 <span className="text-[10px] bg-cyan-500 text-white font-mono px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                   Active
                 </span>
               </CardTitle>
               <CardDescription className="text-xs mt-0.5">
                 Unlock duration: <strong className="dark:text-white text-slate-900">{latestCodeCard.duration} Minutes</strong>
               </CardDescription>
             </div>
           </div>
           <button 
             onClick={() => {
               setLatestCodeCard(null);
               vibrate(HAPTIC_PATTERNS.TAP);
             }}
             className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 text-lg font-bold"
             title="Dismiss"
           >
             ✕
           </button>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800">
             <div className="space-y-1">
               <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Game Code:</span>
               <p className="font-mono text-xl font-black text-cyan-400 tracking-widest select-all">
                 {latestCodeCard.code}
               </p>
             </div>
             <Button
               onClick={() => handleCopyCode(latestCodeCard.code)}
               className={`sm:w-auto w-full font-bold text-xs tracking-wider uppercase ${
                 copiedCode === latestCodeCard.code 
                   ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                   : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'
               }`}
             >
               {copiedCode === latestCodeCard.code ? (
                 <span className="flex items-center gap-1.5">
                   <Check className="w-4 h-4 text-white" />
                   COPIED!
                 </span>
               ) : (
                 <span className="flex items-center gap-1.5">
                   <Copy className="w-4 h-4" />
                   COPY KEY
                 </span>
               )}
             </Button>
           </div>

           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
             <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 max-w-xl">
               <span className="text-cyan-500 font-bold text-sm">ℹ</span>
               <p className="leading-relaxed">
                 <strong>How to play:</strong> Click the launcher button to open the game in a new tab, then <strong>paste this code in the app</strong> when prompted to start your dopamine-balanced high stimulation study break!
               </p>
             </div>
             
             <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-auto">
               <Button
                 variant="outline"
                 className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider border-rose-500/30 text-rose-500 hover:bg-rose-500/10 bg-transparent transition-all"
                 onClick={() => handleDisposeKey(latestCodeCard.code)}
               >
                 <Trash2 className="w-4 h-4" />
                 <span>Used & Dispose</span>
               </Button>

               <a 
                 href="https://runner-gem.vercel.app" 
                 target="_blank" 
                 rel="noreferrer"
                 className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md hover:shadow-cyan-500/20 transition-all"
                 onClick={() => {
                   vibrate(HAPTIC_PATTERNS.TAP);
                   showToast("Launching Runner-Gem Game in a new tab...", "info");
                 }}
               >
                 <span>Launch Game</span>
                 <ExternalLink className="w-4 h-4" />
               </a>
             </div>
           </div>
         </CardContent>
       </Card>
     </motion.div>
   )}

   {/* Tab Content: Purchase Passes */}
   {activeArcadeSection === 'passes' && (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {ARCADE_PASSES.map((pass) => {
         const isAffordable = spendableXP >= pass.cost;
         const isBronze = pass.duration === 10;
         const isSilver = pass.duration === 20;
         const gradientClass = isBronze 
           ? 'from-amber-600 to-orange-700' 
           : isSilver 
             ? 'from-slate-400 to-slate-600' 
             : 'from-yellow-500 to-amber-600';
         
         const textGlowClass = isBronze
           ? 'icon-glow-amber'
           : isSilver
             ? 'icon-glow-blue'
             : 'icon-glow-yellow';

         return (
           <TiltWrapper key={pass.id} tiltAmount={6} className="h-full">
             <Card className="h-full flex flex-col relative overflow-hidden border border-cyan-500/10 dark:bg-slate-950/40 bg-white hover:border-cyan-500/30 transition-all duration-300">
               <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                 isBronze ? 'from-orange-500 to-amber-600' : isSilver ? 'from-cyan-400 to-blue-500' : 'from-yellow-400 via-amber-500 to-yellow-600'
               }`} />
               <CardHeader>
                 <div className="flex justify-between items-start">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white bg-gradient-to-br ${gradientClass} shadow-md`}>
                     <Gamepad2 className={`w-6 h-6 ${textGlowClass}`} />
                   </div>
                   <span className="text-xs font-mono font-bold bg-cyan-500/10 dark:text-cyan-400 text-cyan-700 px-2.5 py-1 rounded-full border border-cyan-500/20">
                     {pass.tag}
                   </span>
                 </div>
                 <CardTitle className="text-xl dark:text-slate-100 text-slate-900">{pass.title}</CardTitle>
                 <CardDescription className="text-xs mt-2 dark:text-slate-400 text-slate-600 min-h-[40px]">
                   {pass.desc}
                 </CardDescription>
               </CardHeader>
               <CardContent className="mt-auto pt-4 border-t dark:border-white/5 border-black/5 bg-slate-50/50 dark:bg-black/20">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs font-mono dark:text-slate-400 text-slate-600 uppercase">Cost</span>
                   <span className="font-mono font-black text-lg dark:text-cyan-400 text-cyan-700">
                     {pass.cost.toLocaleString()} XP
                   </span>
                 </div>
                 <Button
                   className={`w-full font-bold tracking-wider text-xs py-5 ${
                     isAffordable 
                       ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20' 
                       : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'
                   }`}
                   variant="default"
                   disabled={!isAffordable}
                   onClick={() => handlePurchaseArcadePass(pass)}
                 >
                   {isAffordable ? 'PURCHASE & GET CODE' : 'INSUFFICIENT DAILY XP'}
                 </Button>
               </CardContent>
             </Card>
           </TiltWrapper>
         );
       })}
     </div>
   )}

   {/* Tab Content: My Keys */}
   {activeArcadeSection === 'my-keys' && (
     <Card className="border border-slate-200 dark:border-slate-800 dark:bg-slate-950/40 bg-white">
       <CardHeader className="pb-4">
         <CardTitle className="text-lg flex items-center gap-2">
           <Key className="w-5 h-5 text-blue-500" />
           Your Purchased Access Keys
         </CardTitle>
         <CardDescription className="text-xs">
           Paste these codes in your Runner-Gem game client to activate your playtime. These do not expire until used.
         </CardDescription>
       </CardHeader>
       <CardContent>
         {arcadeKeys.length === 0 ? (
           <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
             <Ticket className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
             <p className="font-bold">No active passes yet</p>
             <p className="text-xs mt-1 text-slate-400 max-w-sm mx-auto">
               Purchase an Arcade Pass using your Daily XP break balance to generate unique access codes!
             </p>
             <Button
               variant="outline"
               className="mt-4 text-xs border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10"
               onClick={() => setActiveArcadeSection('passes')}
             >
               View Available Passes
             </Button>
           </div>
         ) : (
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
             {arcadeKeys.map((key) => {
               const isCopied = copiedCode === key.code;
               const dateStr = new Date(key.purchasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
               return (
                 <div
                   key={key.code}
                   className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 gap-3"
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                       key.duration === 10 ? 'bg-amber-500/20 text-amber-500' : key.duration === 20 ? 'bg-cyan-500/20 text-cyan-500' : 'bg-yellow-500/20 text-yellow-500'
                     }`}>
                       {key.duration}m
                     </div>
                     <div>
                       <p className="font-mono font-bold text-sm select-all dark:text-white text-slate-900 tracking-wider">
                         {key.code}
                       </p>
                       <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                         Purchased today at {dateStr} • Code Active
                       </p>
                     </div>
                   </div>

                   <Button
                     variant="outline"
                     size="sm"
                     className={`text-xs font-bold gap-1.5 self-start sm:self-auto ${
                       isCopied 
                         ? 'border-emerald-500/40 text-emerald-500 dark:bg-emerald-500/10 bg-emerald-50' 
                         : 'border-slate-200 dark:border-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500'
                     }`}
                     onClick={() => handleCopyCode(key.code)}
                   >
                     {isCopied ? (
                       <>
                         <Check className="w-3.5 h-3.5 text-emerald-500" />
                         COPIED
                       </>
                     ) : (
                       <>
                         <Copy className="w-3.5 h-3.5" />
                         COPY KEY
                       </>
                     )}
                   </Button>

                   <Button
                     variant="outline"
                     size="sm"
                     className="text-xs font-bold gap-1.5 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 self-start sm:self-auto"
                     onClick={() => handleDisposeKey(key.code)}
                     title="Mark as used and permanently dispose of code"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     DISPOSE
                   </Button>
                 </div>
               );
             })}
           </div>
         )}
       </CardContent>
     </Card>
   )}

   {/* Purchase Success Overlay Modal */}
   {newPurchase && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
       <motion.div
         initial={{ scale: 0.9, y: 20, opacity: 0 }}
         animate={{ scale: 1, y: 0, opacity: 1 }}
         className="relative max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-center"
       >
         <div className="absolute top-3 right-3">
           <button
             onClick={() => setNewPurchase(null)}
             className="text-slate-400 hover:text-white text-xl p-1"
           >
             ✕
           </button>
         </div>

         <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-4 text-white shadow-lg animate-pulse">
           <Key className="w-8 h-8 icon-glow-cyan" />
         </div>

         <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-tighter">
           Pass Unlocked!
         </h3>
         <p className="text-xs text-slate-400 font-mono mt-1">
           {newPurchase.duration} MINUTES RUNNER-GEM ACCESS CODE
         </p>

         <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative group">
           <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors uppercase">
             Click to select all
           </div>
           <p className="font-mono text-xl font-extrabold tracking-widest text-cyan-400 select-all py-1">
             {newPurchase.code}
           </p>
         </div>

         <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
           Copy this unique code and paste it inside your Runner-Gem client to automatically trigger your study break timer!
         </p>

         <div className="mt-6 flex gap-3">
           <Button
             className="flex-1 font-bold tracking-wider py-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
             onClick={() => handleCopyCode(newPurchase.code)}
           >
             {copiedCode === newPurchase.code ? (
               <span className="flex items-center justify-center gap-1.5">
                 <Check className="w-4 h-4 text-white" />
                 COPIED!
               </span>
             ) : (
               <span className="flex items-center justify-center gap-1.5">
                 <Copy className="w-4 h-4" />
                 COPY CODE KEY
               </span>
             )}
           </Button>
           <Button
             variant="outline"
             className="font-bold border-slate-700 text-slate-300 hover:text-white"
             onClick={() => setNewPurchase(null)}
           >
             DONE
           </Button>
         </div>
       </motion.div>
     </div>
   )}
 </motion.div>

 {/* Epic Permanent Rewards */}
 <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mt-16 pt-8 border-t dark:border-white/10 border-black/10">
 <div className="mb-8">
 <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
 EPIC REWARDS
 </h2>
 <p className="dark:text-slate-400 text-slate-600 font-mono text-sm mt-1">
 Permanent vanity upgrades. Save up your XP for these legendary items.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {EPIC_ITEMS.map((item) => {
 const Icon = item.icon;
 const isOwned = unlockedItems.includes(item.id);
 const isEquipped = item.type === 'title' ? equippedTitle === item.value : equippedAura === item.value;
 const isAffordable = spendableTotalXP >= item.cost;

 return (
 <TiltWrapper key={item.id} tiltAmount={5} className="h-full">
 <Card className={`h-full flex flex-col relative overflow-hidden border ${isOwned ? 'border-purple-500/50 bg-purple-900/10' : 'dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-white'} hover:border-purple-500/70 transition-colors`}>
 {isOwned && (
 <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500/20 dark:text-purple-400 text-purple-700 text-xs font-bold font-mono rounded-full border border-purple-500/30">
 OWNED
 </div>
 )}
 <CardHeader>
 <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-purple-500/20 dark:text-purple-400 text-purple-700 shadow-md">
 <Icon className="w-6 h-6" />
 </div>
 <CardTitle className="text-xl dark:text-slate-100 text-slate-900">{item.title}</CardTitle>
 <CardDescription className="text-sm mt-2 dark:text-slate-400 text-slate-600">{item.desc}</CardDescription>
 </CardHeader>
 <CardContent className="mt-auto pt-6">
 <div className="flex items-center justify-between mb-6">
 <span className="text-sm dark:text-slate-400 text-slate-600">Cost</span>
 <span className="font-mono font-bold text-xl dark:text-purple-400 text-purple-700">
 {item.cost.toLocaleString()} XP
 </span>
 </div>
 {isOwned ? (
 <Button 
 className={`w-full font-bold tracking-wider ${isEquipped ? 'bg-slate-700 hover:bg-slate-600 dark:text-white text-slate-900' : 'bg-purple-600 hover:bg-purple-500 dark:text-white text-slate-900'}`}
 variant="default"
 onClick={() => handleEquip(item)}
 >
 {isEquipped ? 'UNEQUIP' : 'EQUIP'}
 </Button>
 ) : (
 <Button 
 className="w-full font-bold tracking-wider dark:bg-slate-800 bg-slate-100 hover:bg-purple-900 text-white border border-purple-500/30 hover:border-purple-500"
 variant="outline"
 disabled={!isAffordable}
 onClick={() => handleEpicPurchase(item)}
 >
 {!isAffordable ? 'INSUFFICIENT XP' : 'UNLOCK PERMANENTLY'}
 </Button>
 )}
 </CardContent>
 </Card>
 </TiltWrapper>
 );
 })}
 </div>
 </motion.div>

 {/* Legendary Permanent Rewards */}
 <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mt-16 pt-8 border-t dark:border-white/10 border-black/10">
 <div className="mb-8">
 <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
 LEGENDARY REWARDS
 </h2>
 <p className="dark:text-slate-400 text-slate-600 font-mono text-sm mt-1">
 The ultimate vanity upgrades. Only for the most dedicated users.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {LEGENDARY_ITEMS.map((item) => {
 const Icon = item.icon;
 const isOwned = unlockedItems.includes(item.id);
 const isEquipped = item.type === 'title' ? equippedTitle === item.value : equippedAura === item.value;
 const isAffordable = spendableTotalXP >= item.cost;

 return (
 <TiltWrapper key={item.id} tiltAmount={5} className="h-full">
 <Card className={`h-full flex flex-col relative overflow-hidden border ${isOwned ? 'border-yellow-500/50 bg-yellow-900/10' : 'dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-white'} hover:border-yellow-500/70 transition-colors`}>
 {isOwned && (
 <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 dark:text-yellow-400 text-yellow-700 text-xs font-bold font-mono rounded-full border border-yellow-500/30">
 OWNED
 </div>
 )}
 <CardHeader>
 <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-yellow-500/20 dark:text-yellow-400 text-yellow-700 shadow-md">
 <Icon className="w-6 h-6" />
 </div>
 <CardTitle className="text-xl dark:text-slate-100 text-slate-900">{item.title}</CardTitle>
 <CardDescription className="text-sm mt-2 dark:text-slate-400 text-slate-600">{item.desc}</CardDescription>
 </CardHeader>
 <CardContent className="mt-auto pt-6">
 <div className="flex items-center justify-between mb-6">
 <span className="text-sm dark:text-slate-400 text-slate-600">Cost</span>
 <span className="font-mono font-bold text-xl dark:text-yellow-400 text-yellow-700">
 {item.cost.toLocaleString()} XP
 </span>
 </div>
 {isOwned ? (
 <Button 
 className={`w-full font-bold tracking-wider ${isEquipped ? 'bg-slate-700 hover:bg-slate-600 dark:text-white text-slate-900' : 'bg-yellow-600 hover:bg-yellow-500 text-black'}`}
 variant="default"
 onClick={() => handleEquip(item)}
 >
 {isEquipped ? 'UNEQUIP' : 'EQUIP'}
 </Button>
 ) : (
 <Button 
 className="w-full font-bold tracking-wider dark:bg-slate-800 bg-slate-100 hover:bg-yellow-900 text-white border border-yellow-500/30 hover:border-yellow-500"
 variant="outline"
 disabled={!isAffordable}
 onClick={() => handleEpicPurchase(item)}
 >
 {!isAffordable ? 'INSUFFICIENT XP' : 'UNLOCK PERMANENTLY'}
 </Button>
 )}
 </CardContent>
 </Card>
 </TiltWrapper>
 );
 })}
 </div>
 </motion.div>

 {toastMessage && (
   <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border dark:bg-slate-950/95 bg-white border-cyan-500/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
     <div className={`p-1.5 rounded-lg ${toastType === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
       <Check className="w-4 h-4" />
     </div>
     <p className="text-xs font-medium dark:text-slate-200 text-slate-800">{toastMessage}</p>
   </div>
 )}
 </div>
 );
});

export default Store;
