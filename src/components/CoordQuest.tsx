'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const TARGET_X = 8;
const TARGET_Y = 3;
const MAX     = 10;

// ---------------------------------------------------------------------------
// Grid — 11 × 11 (0–10 on both axes), Y increases downward
// ---------------------------------------------------------------------------
function Grid({
  ghostX, ghostY,
  bleepX, bleepY,
  committed,
}: {
  ghostX: number; ghostY: number;
  bleepX: number | null; bleepY: number | null;
  committed: boolean;
}) {
  const cells = MAX + 1; // 0..10

  return (
    <div
      className="relative w-full max-w-[330px] mx-auto border-4 border-kids-green rounded-2xl
        overflow-hidden bg-white"
      style={{ aspectRatio: '1' }}
    >
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cells}, 1fr)`,
          gridTemplateRows:    `repeat(${cells}, 1fr)`,
        }}
      >
        {Array.from({ length: cells * cells }, (_, i) => (
          <div key={i} className="border border-gray-100" />
        ))}
      </div>

      {/* Castle — always visible */}
      <div
        className="absolute text-xl leading-none transition-transform"
        style={{
          left:   `${(TARGET_X / MAX) * 100}%`,
          top:    `${(TARGET_Y / MAX) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        🏰
      </div>

      {/* Ghost Bleep — current X/Y selection */}
      {!committed && (
        <motion.div
          className="absolute text-xl leading-none opacity-35"
          animate={{
            left: `${(ghostX / MAX) * 100}%`,
            top:  `${(ghostY / MAX) * 100}%`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          🤖
        </motion.div>
      )}

      {/* Committed Bleep — after GO */}
      {committed && bleepX !== null && bleepY !== null && (
        <motion.div
          className="absolute text-xl leading-none"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            left:      `${(bleepX / MAX) * 100}%`,
            top:       `${(bleepY / MAX) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        >
          🤖
        </motion.div>
      )}

      {/* Axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1
        text-gray-300 font-black text-xs pointer-events-none">
        <span>X:0</span><span>X:10</span>
      </div>
      <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between py-1
        text-gray-300 font-black text-xs pointer-events-none">
        <span>Y:0</span><span>Y:10</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
function Stepper({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`font-black text-sm ${color}`}>{label}</span>
      <div className={`flex items-center gap-1 bg-white rounded-xl border-4 px-2 py-1 ${color.replace('text-', 'border-')}`}>
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={`font-black text-xl w-9 h-9 flex items-center justify-center
            hover:bg-gray-100 rounded-lg transition-colors ${color}`}
        >−</button>
        <motion.span
          key={value}
          initial={{ scale: 1.4, color: '#06D6A0' }}
          animate={{ scale: 1, color: '#1a1a1a' }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="font-black text-3xl w-10 text-center tabular-nums"
        >
          {value}
        </motion.span>
        <button
          onClick={() => onChange(Math.min(MAX, value + 1))}
          className={`font-black text-xl w-9 h-9 flex items-center justify-center
            hover:bg-gray-100 rounded-lg transition-colors ${color}`}
        >+</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CoordQuest() {
  const t = useTranslations('lesson9');

  const [selX, setSelX]         = useState(0);
  const [selY, setSelY]         = useState(0);
  const [committed, setCommitted] = useState(false);
  const [bleepX, setBleepX]     = useState<number | null>(null);
  const [bleepY, setBleepY]     = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  function handleGo() {
    if (status === 'success') return;
    setBleepX(selX);
    setBleepY(selY);
    setCommitted(true);
    setFeedback(null);

    setTimeout(() => {
      if (selX === TARGET_X && selY === TARGET_Y) {
        setStatus('success');
        if (!savedRef.current) {
          savedRef.current = true;
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 },
              colors: ['#06D6A0', '#F9C74F', '#7209B7', '#4CC9F0'] });
          });
          completeLesson(9, 'sticker-map_explorer').catch(console.error);
        }
      } else {
        setFeedback(t('feedback_miss', { x: selX, y: selY }));
        // Reset so ghost reappears
        setTimeout(() => setCommitted(false), 1200);
      }
    }, 600);
  }

  function handleStepper(axis: 'x' | 'y', value: number) {
    if (axis === 'x') setSelX(value);
    else setSelY(value);
    setCommitted(false);
    setFeedback(null);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story */}
      <div className="card-kids border-kids-green w-full text-center">
        <div className="text-7xl mb-3">🗺️</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-green bg-kids-green/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Target reminder */}
      <div className="flex items-center gap-3 bg-kids-green/10 rounded-2xl border-2 border-kids-green px-5 py-3">
        <span className="text-2xl">🏰</span>
        <p className="font-black text-kids-green text-base">{t('target_label')}</p>
      </div>

      {/* Grid */}
      <Grid
        ghostX={selX} ghostY={selY}
        bleepX={bleepX} bleepY={bleepY}
        committed={committed}
      />

      {/* Steppers */}
      <div className="flex gap-8 justify-center">
        <Stepper label={t('x_label')} value={selX} onChange={v => handleStepper('x', v)} color="text-kids-green" />
        <Stepper label={t('y_label')} value={selY} onChange={v => handleStepper('y', v)} color="text-kids-blue" />
      </div>

      {/* GO button */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={handleGo}
        disabled={status === 'success'}
        className="btn-chunky bg-kids-green text-white text-xl disabled:opacity-40 w-full max-w-xs"
      >
        {t('go_button')}
      </motion.button>

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
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-base border-4
              bg-kids-orange/10 border-kids-orange text-orange-700"
          >
            🗺️ {feedback}
          </motion.div>
        )}
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-green/20 border-kids-green text-green-800"
          >
            ⭐ {t('success')} ⭐
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
            <div className="text-8xl">🗺️</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Coordinates Expert! 📍</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
