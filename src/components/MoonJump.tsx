'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const MIN_GRAVITY     = 1;
const MAX_GRAVITY     = 10;
const CLEAR_THRESHOLD = 4;   // gravity ≤ 4 clears the crater
const PARABOLA_N      = 24;  // keyframe count

// ---------------------------------------------------------------------------
// Physics — compute a true parabolic arc as N+1 Framer-Motion keyframes.
//
// Horizontal:  x(t) = xEnd · t           (constant velocity)
// Vertical:    y(t) = −4·H·t·(1−t)       (parabola, peak at t=0.5)
// Fail extra:  after t=0.5, extra fall adds below ground for crater effect
// ---------------------------------------------------------------------------
interface JumpData {
  xs: number[];
  ys: number[];
  times: number[];
  duration: number;
  willClear: boolean;
  trailPts: { x: number; y: number }[];
}

function computeJump(gravity: number): JumpData {
  const willClear  = gravity <= CLEAR_THRESHOLD;
  // Peak height: 148px at g=1 → 13px at g=10
  const peakH      = Math.max(8, 148 - (gravity - 1) * 15);
  // Duration: slow (2.15s) at g=1 → fast (0.75s) at g=10
  const duration   = Math.max(0.75, 2.15 - (gravity - 1) * 0.15);
  // Horizontal reach: clear → past crater; fail → into crater
  const xEnd       = willClear ? 235 : 115;

  const xs: number[]    = [];
  const ys: number[]    = [];
  const times: number[] = [];

  for (let i = 0; i <= PARABOLA_N; i++) {
    const t = i / PARABOLA_N;
    xs.push(xEnd * t);
    const baseY     = -4 * peakH * t * (1 - t);
    const extraDrop = (!willClear && t > 0.5) ? (t - 0.5) * 2 * 80 : 0;
    ys.push(baseY + extraDrop);
    times.push(t);
  }

  // Trail: every other interior point (skip start/end)
  const trailPts: { x: number; y: number }[] = [];
  for (let i = 2; i <= PARABOLA_N - 2; i += 2) {
    trailPts.push({ x: xs[i], y: ys[i] });
  }

  return { xs, ys, times, duration, willClear, trailPts };
}

// ---------------------------------------------------------------------------
// Variable box
// ---------------------------------------------------------------------------
function VariableBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono font-black text-kids-yellow text-base">{label} =</span>
      <motion.span
        key={value}
        initial={{ scale: 1.6, color: '#06D6A0' }}
        animate={{ scale: 1, color: '#F9C74F' }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="font-mono font-black text-4xl tabular-nums"
      >
        {value}
      </motion.span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function MoonJump() {
  const t      = useTranslations('lesson14');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [gravity, setGravity]   = useState(10);
  const [phase, setPhase]       = useState<'idle' | 'jumping' | 'result'>('idle');
  const [cleared, setCleared]   = useState<boolean | null>(null);
  const [jumpData, setJumpData] = useState<JumpData | null>(null);
  // Keep Bleep at landing position after jump (prevent snap-back)
  const [bleepPos, setBleepPos] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  function handleJump() {
    if (phase === 'jumping' || status === 'success') return;
    const data = computeJump(gravity);
    setJumpData(data);
    setBleepPos(null);
    setCleared(null);
    setPhase('jumping');
  }

  function onAnimationComplete() {
    if (phase !== 'jumping' || !jumpData) return;
    // Pin Bleep at landing spot
    setBleepPos({ x: jumpData.xs.at(-1)!, y: jumpData.ys.at(-1)! });
    const success = jumpData.willClear;
    setCleared(success);
    setPhase('result');
    if (success && !savedRef.current) {
      savedRef.current = true;
      setTimeout(() => {
        setStatus('success');
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 180, spread: 90, origin: { y: 0.5 },
            colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
        });
        completeLesson(14, 'sticker-moon_jumper').catch(console.error);
      }, 600);
    }
  }

  function reset() {
    setPhase('idle');
    setCleared(null);
    setJumpData(null);
    setBleepPos(null);
  }

  // Bleep animate target
  const bleepAnimate =
    phase === 'jumping' && jumpData
      ? { x: jumpData.xs, y: jumpData.ys }
      : bleepPos
        ? { x: bleepPos.x, y: bleepPos.y }
        : { x: 0, y: 0 };

  const bleepTransition =
    phase === 'jumping' && jumpData
      ? { duration: jumpData.duration, times: jumpData.times, ease: 'linear' as const }
      : { duration: 0.15 };

  // SVG coordinate of Bleep's centre inside the arena (px)
  // Arena: 340×200, Bleep: bottom=40 left=12, text-4xl ≈ 36px tall × 36px wide
  const BLEEP_CX = 30;   // 12 + 18
  const BLEEP_CY = 142;  // 200 − 40 − 36 + 18

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-blue w-full text-center">
        <div className="text-7xl mb-3">🌙</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-blue bg-kids-blue/10 rounded-xl px-4 py-2">
          🎯 {t('goal')}
        </p>
      </div>

      {/* Variable + slider panel */}
      <div className="w-full bg-gray-900 rounded-2xl p-5 space-y-4">
        <VariableBox label={t('gravity_label')} value={gravity} />
        <p className={`font-bold text-sm ${gravity <= CLEAR_THRESHOLD ? 'text-kids-green' : 'text-kids-orange'}`}>
          {gravity <= CLEAR_THRESHOLD ? `🌙 ${t('gravity_low')}` : `🌍 ${t('gravity_high')}`}
        </p>
        <input
          type="range"
          min={MIN_GRAVITY} max={MAX_GRAVITY} value={gravity}
          onChange={e => { if (phase !== 'jumping') { setGravity(Number(e.target.value)); reset(); } }}
          className="w-full accent-kids-yellow h-3 rounded-full cursor-pointer"
          disabled={phase === 'jumping' || status === 'success'}
        />
        <div className="flex justify-between">
          <span className="font-black text-kids-green text-xs">1 🌙</span>
          <span className="font-black text-kids-orange text-xs">🌍 10</span>
        </div>
      </div>

      {/* Physics arena — fixed 340px so SVG px coords are predictable */}
      <div
        className="w-full max-w-[340px] mx-auto rounded-2xl border-4 border-kids-blue bg-gray-900 overflow-hidden relative"
        style={{ height: 200 }}
      >
        {/* Starfield */}
        <div className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Ghost trail — SVG overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 4 }}>
          {jumpData && jumpData.trailPts.map((pt, i) => (
            <motion.circle
              key={`trail-${i}`}
              cx={BLEEP_CX + pt.x}
              cy={BLEEP_CY + pt.y}
              r={3.5}
              fill="rgba(249,199,79,0.75)"
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 0.75, r: 3.5 }}
              transition={{
                delay: jumpData.duration * (i / jumpData.trailPts.length),
                duration: 0.18,
              }}
            />
          ))}
        </svg>

        {/* Ground — left strip (z-index above trail) */}
        <div className="absolute bottom-0 left-0 bg-gray-500 rounded-tl-lg"
          style={{ width: 110, height: 40, zIndex: 6 }} />
        {/* Crater */}
        <div className="absolute bottom-0 bg-gray-800 border-t-2 border-red-900/50"
          style={{ left: 110, width: 90, height: 32, zIndex: 6 }}
        >
          <p className="font-black text-red-500 text-xs text-center mt-1 leading-none">
            {t('crater_label')}
          </p>
        </div>
        {/* Ground — right strip */}
        <div className="absolute bottom-0 right-0 bg-gray-500 rounded-tr-lg"
          style={{ left: 200, height: 40, zIndex: 6 }} />

        {/* Bleep */}
        <motion.div
          className="absolute text-4xl leading-none select-none"
          style={{ bottom: 40, left: 12, zIndex: 5 }}
          animate={bleepAnimate}
          transition={bleepTransition}
          onAnimationComplete={onAnimationComplete}
        >
          🤖
        </motion.div>

        {/* Flag */}
        <div className="absolute text-2xl" style={{ bottom: 43, right: 14, zIndex: 6 }}>
          🏁
        </div>
      </div>

      {/* Result feedback */}
      <AnimatePresence mode="wait">
        {phase === 'result' && cleared !== null && (
          <motion.div
            key={cleared ? 'clear' : 'fail'}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`w-full rounded-xl px-6 py-4 text-center font-black text-base border-4
              ${cleared
                ? 'bg-kids-green/20 border-kids-green text-green-800'
                : 'bg-kids-orange/10 border-kids-orange text-orange-700'
              }`}
          >
            {cleared ? `🌙 ${t('clear_feedback')}` : `💥 ${t('fail_feedback')}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jump + Reset buttons */}
      <div className="flex gap-4 w-full max-w-xs">
        <motion.button
          whileHover={phase !== 'jumping' && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={phase !== 'jumping' && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleJump}
          disabled={phase === 'jumping' || status === 'success'}
          className="flex-1 btn-chunky bg-kids-blue text-white text-xl disabled:opacity-40"
        >
          {t('jump_button')}
        </motion.button>
        <AnimatePresence>
          {phase === 'result' && !cleared && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }} whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="btn-chunky bg-gray-200 text-gray-600 text-base"
            >
              {t('reset_button')}
            </motion.button>
          )}
        </AnimatePresence>
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
              🌙 {t('success')}
            </div>
            <Link href={`/${locale}/lesson15`}>
              <motion.button
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 340, damping: 16 }}
                className="btn-chunky bg-kids-blue text-white text-xl border-4 border-kids-blue shadow-xl"
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
            <div className="text-8xl">🌙</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Moon Jumper! 🚀</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
