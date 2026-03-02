'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const LESSONS_PER_LEVEL = 10;
const TOTAL_LESSONS     = 20;

export function UserStats({
  points,
  currentLesson,
  locale,
}: {
  points: number;
  currentLesson: number;
  locale: string;
}) {
  const completed = Math.max(0, currentLesson - 1);
  const level     = Math.floor(completed / LESSONS_PER_LEVEL) + 1;
  const progress  = Math.min(1, (completed % LESSONS_PER_LEVEL) / LESSONS_PER_LEVEL);
  const nextLevel = level + 1;

  return (
    <Link
      href={`/${locale}/sticker-book`}
      className="group flex-shrink-0"
      title="View my badge collection"
    >
      <div className="flex flex-col items-end gap-1 bg-white/90 rounded-xl px-3 py-2
        border-2 border-kids-yellow shadow-sm
        group-hover:border-kids-orange group-hover:shadow-md transition-all">

        {/* Points row */}
        <div className="flex items-center gap-1">
          <span className="text-base leading-none">🪙</span>
          <motion.span
            key={points}
            initial={{ scale: 1.5, color: '#F9C74F' }}
            animate={{ scale: 1, color: '#1a1a1a' }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="font-black text-sm text-gray-800 tabular-nums"
          >
            {points}
          </motion.span>
          <span className="font-bold text-gray-400 text-xs">pts</span>
          <span className="font-black text-kids-purple text-xs ml-1 bg-kids-purple/10
            rounded px-1">
            Lv.{level}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-24 bg-gray-100 rounded-full h-2 border border-gray-200 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-kids-yellow to-kids-orange rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          />
        </div>

        {/* Caption */}
        <p className="text-gray-400 font-bold text-xs leading-none">
          {completed}/{TOTAL_LESSONS} lessons
        </p>
      </div>
    </Link>
  );
}
