'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const TOTAL = 5;

export function MagicBox() {
  const t = useTranslations('lesson4');

  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  function handleCollect(idx: number) {
    if (collected.has(idx) || status === 'success') return;
    setCollected(prev => new Set(prev).add(idx));
    setScore(s => s + 1);
  }

  // Trigger success when all collected
  useEffect(() => {
    if (score === TOTAL && status !== 'success') {
      setStatus('success');
      if (!savedRef.current) {
        savedRef.current = true;
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 180, spread: 90, origin: { y: 0.6 },
            colors: ['#F77F00', '#F9C74F', '#7209B7', '#06D6A0'],
          });
        });
        completeLesson(4, 'sticker-variable').catch(console.error);
      }
    }
  }, [score, status]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8">

      {/* Story card */}
      <div className="card-kids border-kids-orange w-full text-center">
        <div className="text-7xl mb-3">📦</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-orange bg-kids-orange/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Variable box */}
      <div className="w-full bg-white border-4 border-kids-orange rounded-2xl p-5 shadow-chunky">
        <p className="font-black text-kids-orange text-xs uppercase tracking-wide mb-3">
          📦 Variable
        </p>
        <div className="flex items-center gap-4 font-mono">
          <span className="text-2xl font-black text-gray-700">{t('box_label')}</span>
          <span className="text-2xl font-black text-gray-500">=</span>
          <div className="bg-kids-orange/10 border-4 border-kids-orange rounded-xl px-6 py-3 min-w-[80px] flex items-center justify-center">
            <motion.span
              key={score}
              initial={{ scale: 1.6, color: '#06D6A0' }}
              animate={{ scale: 1, color: '#1a1a1a' }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="text-4xl font-black"
            >
              {score}
            </motion.span>
          </div>
          <span className="text-2xl font-black text-gray-400">/ {TOTAL}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-4 border-2 border-gray-200 overflow-hidden">
        <motion.div
          className="h-full bg-kids-orange rounded-full"
          animate={{ width: `${(score / TOTAL) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>

      {/* Pastéis de Nata grid */}
      <div className="w-full">
        <p className="font-black text-gray-500 text-xs uppercase tracking-wide text-center mb-4">
          Click to collect! 👇
        </p>
        <div className="grid grid-cols-5 gap-4 justify-items-center">
          {Array.from({ length: TOTAL }, (_, i) => (
            <motion.button
              key={i}
              onClick={() => handleCollect(i)}
              disabled={collected.has(i) || status === 'success'}
              animate={{ opacity: collected.has(i) ? 0 : 1 }}
              transition={{ duration: 0.35 }}
              whileHover={!collected.has(i) ? { scale: 1.15 } : {}}
              whileTap={!collected.has(i) ? { scale: 0.9 } : {}}
              className="text-5xl select-none cursor-pointer disabled:cursor-default
                w-16 h-16 flex items-center justify-center"
              aria-label={`Pastel de Nata ${i + 1}`}
            >
              🍮
            </motion.button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="w-full"
          >
            <div className="bg-kids-blue/10 border-2 border-kids-blue rounded-xl px-4 py-3
              font-bold text-kids-blue text-base">
              💡 {t('hint')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback / success banner */}
      <AnimatePresence mode="wait">
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-green/20 border-kids-green text-green-800"
          >
            ⭐ {t('success')} ⭐
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint button */}
      <button
        onClick={() => setShowHint(h => !h)}
        className="btn-chunky bg-kids-blue text-white"
      >
        💡 {t('hint_button')}
      </button>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">📦</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Variable Master! ⭐</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
