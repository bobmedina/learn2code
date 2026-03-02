'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const PHASE2_LESSONS = [
  { n: 11, emoji: '📻', color: 'border-kids-blue' },
  { n: 12, emoji: '📡', color: 'border-kids-purple' },
  { n: 13, emoji: '🏰', color: 'border-kids-orange' },
  { n: 14, emoji: '🌙', color: 'border-kids-blue' },
  { n: 15, emoji: '🛡️', color: 'border-kids-purple' },
  { n: 16, emoji: '🚀', color: 'border-kids-yellow' },
] as const;

export function Phase2Section({
  unlocked,
  lesson11Title,
  lesson12Title,
  lesson13Title,
  lesson14Title,
  lesson15Title,
  lesson16Title,
  phase2Label,
  phase2Sub,
  phase2UnlockedLabel,
  phase2LockHint,
  locale,
}: {
  unlocked: boolean;
  lesson11Title: string;
  lesson12Title: string;
  lesson13Title: string;
  lesson14Title: string;
  lesson15Title: string;
  lesson16Title: string;
  phase2Label: string;
  phase2Sub: string;
  phase2UnlockedLabel: string;
  phase2LockHint: string;
  locale: string;
}) {
  const titles: Record<number, string> = {
    11: lesson11Title,
    12: lesson12Title,
    13: lesson13Title,
    14: lesson14Title,
    15: lesson15Title,
    16: lesson16Title,
  };

  return (
    <div className="mt-10 w-full max-w-3xl space-y-4">

      {/* Phase 2 header */}
      <div className="flex items-center gap-4">
        <div className={`h-1 flex-1 rounded-full ${unlocked ? 'bg-kids-yellow/60' : 'bg-gray-200'}`} />
        <span className={`font-black text-sm uppercase tracking-widest whitespace-nowrap
          ${unlocked ? 'text-kids-yellow' : 'text-gray-400'}`}
        >
          🚀 {phase2Label}
        </span>
        <div className={`h-1 flex-1 rounded-full ${unlocked ? 'bg-kids-yellow/60' : 'bg-gray-200'}`} />
      </div>

      {/* Locked state */}
      {!unlocked && (
        <div className="relative rounded-2xl border-4 border-dashed border-gray-200 overflow-hidden">
          <div className="grayscale opacity-40 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PHASE2_LESSONS.map(({ n }) => (
                <div key={n} className="card-kids border-gray-200 bg-gray-50">
                  <div className="text-4xl mb-2">🔮</div>
                  <h2 className="text-lg font-black text-gray-400">Lesson {n}</h2>
                  <p className="text-gray-300 font-bold text-xs mt-1">{phase2Sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center
            bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="text-5xl mb-3">🔒</div>
            <p className="font-black text-gray-500 text-base">{phase2LockHint}</p>
            <p className="font-bold text-gray-400 text-sm mt-1">{phase2Sub}</p>
          </div>
        </div>
      )}

      {/* Unlocked state */}
      {unlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="space-y-4"
        >
          {/* Phase 2 Unlocked! banner */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 340, damping: 18 }}
            className="w-full rounded-2xl border-4 border-kids-yellow bg-kids-yellow/10 px-6 py-4 text-center"
          >
            <p className="font-black text-kids-yellow text-2xl">🚀 {phase2UnlockedLabel}</p>
            <p className="font-bold text-gray-500 text-sm mt-1">{phase2Sub}</p>
          </motion.div>

          {/* Lesson cards — all clickable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {PHASE2_LESSONS.map(({ n, emoji, color }, i) => (
              <motion.div
                key={n}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 340, damping: 18 }}
              >
                <Link
                  href={`/${locale}/lesson${n}`}
                  className={`card-kids ${color} hover:scale-105 transition-transform block`}
                >
                  <div className="text-5xl mb-3">{emoji}</div>
                  <h2 className="text-xl font-black text-kids-purple">Lesson {n}</h2>
                  <p className="text-gray-500 font-bold text-sm mt-1">{titles[n]}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
