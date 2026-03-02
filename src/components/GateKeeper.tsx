'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const ROBOTS = [
  { id: 'r1', robotId: '12' },
  { id: 'r2', robotId: '1234' },
  { id: 'r3', robotId: 'ABCDE' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function GateKeeper() {
  const t = useTranslations('lesson13');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [results, setResults] = useState<Record<string, 'pass' | 'fail' | null>>({
    r1: null, r2: null, r3: null,
  });
  const [status, setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  function testRobot(id: string, robotId: string) {
    if (status === 'success' || results[id] !== null) return;
    const passes = robotId.length === 4;
    setResults(prev => ({ ...prev, [id]: passes ? 'pass' : 'fail' }));
    if (passes && !savedRef.current) {
      savedRef.current = true;
      setTimeout(() => {
        setStatus('success');
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 },
            colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
        });
        completeLesson(13, 'sticker-castle_guard').catch(console.error);
      }, 700);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-orange w-full text-center">
        <div className="text-7xl mb-3">🏰</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-orange bg-kids-orange/10 rounded-xl px-4 py-2">
          🎯 {t('goal')}
        </p>
      </div>

      {/* Validation rule */}
      <div className="w-full bg-gray-900 rounded-2xl p-4">
        <p className="font-mono font-black text-kids-yellow text-sm text-center">
          {t('rule_label')}
        </p>
      </div>

      {/* Robot cards */}
      <div className="w-full grid grid-cols-3 gap-3">
        {ROBOTS.map(({ id, robotId }) => {
          const result = results[id];
          return (
            <motion.div
              key={id}
              animate={result === 'pass' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`rounded-2xl border-4 p-4 flex flex-col items-center gap-3 transition-colors
                ${result === 'pass'  ? 'border-kids-green bg-kids-green/10' :
                  result === 'fail'  ? 'border-red-400 bg-red-50' :
                                       'border-kids-blue/40 bg-white'}`}
            >
              {/* Robot emoji */}
              <div className="text-4xl">🤖</div>

              {/* ID badge */}
              <div className="bg-gray-900 rounded-lg px-2 py-1">
                <span className="font-mono font-black text-kids-green text-sm">
                  {robotId}
                </span>
              </div>

              {/* Length indicator */}
              <p className="font-bold text-gray-400 text-xs">
                length: {robotId.length}
              </p>

              {/* Test button / result */}
              <AnimatePresence mode="wait">
                {result === null ? (
                  <motion.button
                    key="btn"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => testRobot(id, robotId)}
                    disabled={status === 'success'}
                    className="btn-chunky bg-kids-blue text-white text-xs py-1 px-2 disabled:opacity-40 w-full"
                  >
                    {t('test_button')}
                  </motion.button>
                ) : result === 'pass' ? (
                  <motion.p
                    key="pass"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    className="font-black text-kids-green text-xs text-center"
                  >
                    {t('gate_open')}
                  </motion.p>
                ) : (
                  <motion.p
                    key="fail"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                    className="font-black text-red-500 text-xs text-center"
                  >
                    {t('gate_rejected')}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
            <div className="bg-kids-blue/10 border-2 border-kids-blue rounded-xl px-4 py-3 font-bold text-kids-blue">
              💡 {t('hint')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success banner */}
      <AnimatePresence mode="wait">
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <div className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-green/20 border-kids-green text-green-800">
              🏰 {t('success')}
            </div>
            <Link href={`/${locale}/lesson14`}>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 340, damping: 16 }}
                className="btn-chunky bg-kids-orange text-white text-xl border-4 border-kids-orange shadow-xl"
              >
                {t('next_lesson')}
              </motion.button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => setShowHint(h => !h)} className="btn-chunky bg-kids-blue text-white">
        💡 {t('hint_button')}
      </button>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">🏰</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Castle Guard! 🛡️</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
