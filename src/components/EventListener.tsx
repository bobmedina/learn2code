'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

type Move = 'jump' | 'spin' | 'clap';

const MOVE_META: Record<Move, { emoji: string; labelKey: 'block_jump' | 'block_spin' | 'block_clap' }> = {
  jump: { emoji: '🦘', labelKey: 'block_jump' },
  spin: { emoji: '🔄', labelKey: 'block_spin' },
  clap: { emoji: '👏', labelKey: 'block_clap' },
};

const MOVE_COLORS: Record<Move, string> = {
  jump: 'bg-kids-orange text-white border-kids-orange',
  spin: 'bg-kids-blue  text-white border-kids-blue',
  clap: 'bg-kids-yellow text-kids-purple border-kids-yellow',
};

export function EventListener() {
  const t = useTranslations('lesson7');

  const [eventBlock, setEventBlock] = useState<Move | null>(null);
  const [robotKey, setRobotKey]     = useState(0);
  const [animMove, setAnimMove]     = useState<Move | null>(null);
  const [feedback, setFeedback]     = useState<string | null>(null);
  const [status, setStatus]         = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]     = useState(false);
  const savedRef = useRef(false);

  // Listen for real spacebar on desktop
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space') { e.preventDefault(); handleTrigger(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleTrigger() {
    if (status === 'success') return;
    if (!eventBlock) { setFeedback(t('feedback_empty')); return; }

    setAnimMove(eventBlock);
    setRobotKey(k => k + 1);
    setFeedback(null);

    if (eventBlock === 'jump') {
      setTimeout(() => {
        setStatus('success');
        if (!savedRef.current) {
          savedRef.current = true;
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 },
              colors: ['#EF233C', '#F9C74F', '#7209B7', '#06D6A0'] });
          });
          completeLesson(7, 'sticker-click_master').catch(console.error);
        }
      }, 700);
    } else {
      setFeedback(t('feedback_wrong'));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-red w-full text-center">
        <div className="text-7xl mb-3">👆</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-red bg-kids-red/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Robot */}
      <div className="flex flex-col items-center relative">

        {/* Zzz bubble — floats up while sleeping */}
        <AnimatePresence>
          {!eventBlock && !animMove && status !== 'success' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -top-8 right-1 pointer-events-none"
            >
              <motion.span
                animate={{ y: [-2, -16, -2], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="font-black text-kids-blue text-xl block"
              >
                Zzz
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          key={robotKey}
          animate={
            animMove === 'jump' ? { y: [0, -50, 0], opacity: 1 }
            : animMove === 'spin' ? { rotate: 360, opacity: 1 }
            : animMove === 'clap' ? { scale: [1, 0.8, 1.3, 1], opacity: 1 }
            : !eventBlock ? { scale: [1, 0.96, 1], opacity: 0.55 }
            : { scale: 1, opacity: 1 }
          }
          transition={
            animMove === 'spin' ? { duration: 0.55 }
            : !eventBlock && !animMove ? { repeat: Infinity, duration: 3, ease: 'easeInOut' }
            : { duration: 0.5 }
          }
          className="text-8xl select-none"
        >
          🤖
        </motion.div>

        {animMove && (
          <motion.p
            key={`label-${robotKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-black text-kids-red text-sm mt-1"
          >
            {MOVE_META[animMove].emoji} {animMove}!
          </motion.p>
        )}
      </div>

      {/* Event listener box */}
      <div className="w-full space-y-2">
        <div className="bg-kids-red rounded-xl px-4 py-2 inline-block">
          <span className="font-mono font-black text-white text-base">{t('event_label')}</span>
        </div>
        <div className={`rounded-2xl border-4 border-kids-red bg-kids-red/5 p-5 min-h-[80px]
          flex items-center justify-center transition-colors
          ${eventBlock ? '' : 'border-dashed'}`}
        >
          <AnimatePresence mode="wait">
            {eventBlock ? (
              <motion.button
                key={eventBlock}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                onClick={() => { if (status !== 'success') { setEventBlock(null); setFeedback(null); } }}
                disabled={status === 'success'}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-base
                  border-4 shadow-chunky cursor-pointer ${MOVE_COLORS[eventBlock]}`}
              >
                {MOVE_META[eventBlock].emoji} {t(MOVE_META[eventBlock].labelKey)}
                {status !== 'success' && <span className="ml-1 text-xs opacity-60">×</span>}
              </motion.button>
            ) : (
              <motion.p
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-kids-red/40 font-bold text-sm"
              >
                {t('event_placeholder')}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Space button — disabled until a block is placed */}
      <motion.button
        whileHover={eventBlock && status !== 'success' ? { scale: 1.05 } : {}}
        whileTap={eventBlock && status !== 'success' ? { scale: 0.95 } : {}}
        onClick={handleTrigger}
        disabled={!eventBlock || status === 'success'}
        className="btn-chunky bg-kids-red text-white text-xl disabled:opacity-40 w-full max-w-xs"
      >
        {t('test_button')}
      </motion.button>

      {/* Block tray */}
      <div className="w-full bg-kids-red/10 rounded-xl p-4 border-2 border-kids-red/30">
        <p className="font-black text-kids-red text-xs mb-3 uppercase tracking-wide">
          Click to add a move 👇
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(MOVE_META) as Move[]).map(move => (
            <motion.button
              key={move}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => { if (status !== 'success') { setEventBlock(move); setFeedback(null); } }}
              disabled={status === 'success'}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-base
                border-4 shadow-chunky select-none cursor-pointer disabled:opacity-40 ${MOVE_COLORS[move]}`}
            >
              {MOVE_META[move].emoji} {t(MOVE_META[move].labelKey)}
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
            <div className="bg-kids-blue/10 border-2 border-kids-blue rounded-xl px-4 py-3 font-bold text-kids-blue">
              💡 {t('hint')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-orange/10 border-kids-orange text-orange-700"
          >
            🤔 {feedback}
          </motion.div>
        )}
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
      <button onClick={() => setShowHint(h => !h)} className="btn-chunky bg-kids-blue text-white">
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
            <div className="text-8xl">👆</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Event Expert! 🎧</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
