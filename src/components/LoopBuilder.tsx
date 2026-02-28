'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type Move = 'spin' | 'clap';
type Feedback = 'none' | 'success' | 'too-verbose' | 'need-spin' | 'wrong-count';

const MOVE_META: Record<Move, { emoji: string; labelKey: 'move_spin' | 'move_clap' }> = {
  spin: { emoji: '🌀', labelKey: 'move_spin' },
  clap: { emoji: '👏', labelKey: 'move_clap' },
};

const TARGET_COUNT = 4;
const SEQ_SIZE = 4;

// ---------------------------------------------------------------------------
// MoveChip — selectable block in the tray
// ---------------------------------------------------------------------------
function MoveChip({
  move, label, isSelected, onClick,
}: {
  move: Move; label: string; isSelected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-base border-4
        shadow-chunky select-none cursor-pointer transition-colors
        ${isSelected
          ? 'bg-kids-purple text-white border-kids-purple'
          : 'bg-white text-gray-700 border-gray-200 hover:border-kids-purple'
        }`}
    >
      <span className="text-2xl">{MOVE_META[move].emoji}</span>
      {label}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// LoopSlot — the drop slot inside the loop container
// ---------------------------------------------------------------------------
function LoopSlot({ move, label, onClick }: {
  move: Move | null; label: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`min-w-[180px] min-h-[64px] px-4 py-3 rounded-xl border-4 border-dashed
        flex items-center justify-center cursor-pointer font-bold text-base transition-colors
        ${move !== null
          ? 'border-kids-purple bg-kids-purple/10'
          : 'border-kids-purple/40 bg-white/60 hover:border-kids-purple'
        }`}
    >
      {move !== null ? (
        <span className="flex items-center gap-2 font-black text-kids-purple">
          <span className="text-3xl">{MOVE_META[move].emoji}</span>
          {label}
        </span>
      ) : (
        <span className="text-kids-purple/40 font-bold text-sm">{label}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeqSlot — numbered slot in the sequence area
// ---------------------------------------------------------------------------
function SeqSlot({ move, idx, isHighlighted, onClick }: {
  move: Move | null; idx: number; isHighlighted: boolean; onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-black text-gray-400">{idx + 1}</span>
      <motion.div
        animate={{ scale: isHighlighted ? 1.2 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        onClick={onClick}
        className={`w-16 h-16 rounded-xl border-4 border-dashed flex items-center justify-center
          cursor-pointer text-3xl transition-colors
          ${isHighlighted
            ? 'bg-kids-orange/30 border-kids-orange'
            : move !== null
              ? 'border-kids-orange bg-kids-orange/10'
              : 'border-gray-300 bg-gray-50 hover:border-kids-orange'
          }`}
      >
        {move ? MOVE_META[move].emoji : (
          <span className="text-gray-300 text-2xl font-bold">+</span>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LoopBuilder() {
  const t = useTranslations('lesson3');

  // --- Build state ---
  const [loopMove, setLoopMove] = useState<Move | null>(null);
  const [loopCount, setLoopCount] = useState(TARGET_COUNT);
  const [seqMoves, setSeqMoves] = useState<(Move | null)[]>(Array(SEQ_SIZE).fill(null));
  const [selMove, setSelMove] = useState<Move | null>(null);

  // --- Run / animation state ---
  const [runPhase, setRunPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [runZone, setRunZone] = useState<'loop' | 'seq'>('loop');
  const [animIter, setAnimIter] = useState(0);
  const [totalIters, setTotalIters] = useState(0);
  const [robotKey, setRobotKey] = useState(0);
  const [animMove, setAnimMove] = useState<Move | null>(null);
  const [loopGlow, setLoopGlow] = useState(false);
  const [seqHighlight, setSeqHighlight] = useState(-1);

  // --- Feedback state ---
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Animation loop — fires once per iteration step
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (runPhase !== 'running') return;

    if (animIter >= totalIters) {
      setRunPhase('done');
      return;
    }

    // Determine the move for this iteration
    let move: Move | null = null;
    if (runZone === 'loop') {
      move = loopMove;
      setLoopGlow(true);
    } else {
      // Find the (animIter)th non-null slot in order
      let count = 0;
      for (let i = 0; i < SEQ_SIZE; i++) {
        if (seqMoves[i] !== null) {
          if (count === animIter) {
            move = seqMoves[i];
            setSeqHighlight(i);
            break;
          }
          count++;
        }
      }
    }

    setAnimMove(move);
    setRobotKey(k => k + 1);

    const t1 = setTimeout(() => {
      setLoopGlow(false);
      setSeqHighlight(-1);
    }, 600);

    const t2 = setTimeout(() => {
      setAnimIter(i => i + 1);
    }, 1050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [runPhase, animIter, totalIters, runZone, loopMove, seqMoves]);

  // ---------------------------------------------------------------------------
  // Determine feedback when animation completes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (runPhase !== 'done') return;

    let fb: Feedback;
    if (runZone === 'loop') {
      if (loopMove !== 'spin') fb = 'need-spin';
      else if (loopCount !== TARGET_COUNT) fb = 'wrong-count';
      else fb = 'success';
    } else {
      // Any sequence run → nudge toward the loop
      fb = 'too-verbose';
    }
    setFeedback(fb);

    if (fb === 'success' && !savedRef.current) {
      savedRef.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 180, spread: 90, origin: { y: 0.6 },
          colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'],
        });
      });
      completeLesson(3, 'sticker-loop').catch(console.error);
    }
  }, [runPhase, runZone, loopMove, loopCount]);

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------
  function clearFeedback() {
    setFeedback('none');
    if (runPhase === 'done') setRunPhase('idle');
  }

  function selectMove(move: Move) {
    if (runPhase === 'running') return;
    setSelMove(m => (m === move ? null : move));
    clearFeedback();
  }

  function handleLoopSlot() {
    if (runPhase === 'running') return;
    if (selMove !== null) {
      setLoopMove(selMove);
      setSelMove(null);
    } else if (loopMove !== null) {
      setLoopMove(null);
    }
    clearFeedback();
  }

  function handleSeqSlot(idx: number) {
    if (runPhase === 'running') return;
    if (selMove !== null) {
      setSeqMoves(prev => {
        const next = [...prev];
        next[idx] = selMove;
        return next;
      });
      setSelMove(null);
    } else if (seqMoves[idx] !== null) {
      setSeqMoves(prev => {
        const next = [...prev];
        next[idx] = null;
        return next;
      });
    }
    clearFeedback();
  }

  function handleRun() {
    if (runPhase === 'running') return;

    if (loopMove !== null) {
      setRunZone('loop');
      setTotalIters(loopCount);
    } else {
      const filled = seqMoves.filter(m => m !== null).length;
      if (filled === 0) return;
      setRunZone('seq');
      setTotalIters(filled);
    }

    setAnimIter(0);
    setAnimMove(null);
    setFeedback('none');
    setRunPhase('running');
  }

  function handleClear() {
    if (runPhase === 'running') return;
    setLoopMove(null);
    setLoopCount(TARGET_COUNT);
    setSeqMoves(Array(SEQ_SIZE).fill(null));
    setSelMove(null);
    setRunPhase('idle');
    setFeedback('none');
  }

  const canRun = runPhase !== 'running' && (loopMove !== null || seqMoves.some(m => m !== null));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8">

      {/* Story card */}
      <div className="card-kids border-kids-green w-full text-center">
        <div className="text-7xl mb-3">🕺</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-green bg-kids-green/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Robot with animation */}
      <div className="relative flex flex-col items-center">
        <motion.div
          key={robotKey}
          initial={{ rotate: 0, scale: 1 }}
          animate={
            runPhase === 'running' && animMove === 'spin'
              ? { rotate: 360 }
              : runPhase === 'running' && animMove === 'clap'
                ? { scale: [1, 0.75, 1.3, 1] }
                : {}
          }
          transition={
            animMove === 'spin'
              ? { duration: 0.65, ease: 'easeInOut' }
              : { duration: 0.55 }
          }
          className="text-8xl select-none"
        >
          🤖
        </motion.div>

        {/* Iteration counter badge */}
        {runPhase === 'running' && (
          <motion.div
            key={`badge-${animIter}`}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16 }}
            className="absolute -top-3 -right-8 bg-kids-purple text-white font-black text-sm
              rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          >
            {animIter + 1}/{totalIters}
          </motion.div>
        )}
      </div>

      {/* ── Code workspace ── */}
      <div className="w-full space-y-4">

        {/* Loop container */}
        <motion.div
          animate={{
            scale: loopGlow ? 1.025 : 1,
            boxShadow: loopGlow
              ? '0 0 0 4px #06D6A0, 0 0 28px rgba(6,214,160,0.55)'
              : '0 0 0 0px transparent',
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          className="rounded-2xl border-4 border-kids-green bg-kids-green/5 p-4"
        >
          {/* Header row: label + stepper */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="font-black text-lg text-white bg-kids-green px-3 py-1 rounded-lg">
              🔁 {t('loop_label')}
            </span>

            {/* Count stepper */}
            <div className="flex items-center gap-1 bg-white rounded-xl border-4 border-kids-green px-2 py-1">
              <button
                onClick={() => { if (runPhase !== 'running') setLoopCount(c => Math.max(1, c - 1)); }}
                disabled={runPhase === 'running'}
                aria-label="Decrease count"
                className="font-black text-kids-green text-xl w-8 h-8 flex items-center justify-center
                  hover:bg-kids-green/10 rounded-lg transition-colors disabled:opacity-40"
              >
                −
              </button>
              <span className="font-black text-2xl text-kids-purple w-9 text-center">{loopCount}</span>
              <button
                onClick={() => { if (runPhase !== 'running') setLoopCount(c => Math.min(8, c + 1)); }}
                disabled={runPhase === 'running'}
                aria-label="Increase count"
                className="font-black text-kids-green text-xl w-8 h-8 flex items-center justify-center
                  hover:bg-kids-green/10 rounded-lg transition-colors disabled:opacity-40"
              >
                +
              </button>
            </div>

            <span className="font-bold text-kids-green text-base">{t('times_label')}</span>
          </div>

          {/* Drop slot */}
          <LoopSlot
            move={loopMove}
            label={loopMove !== null ? t(MOVE_META[loopMove].labelKey) : t('slot_placeholder')}
            onClick={handleLoopSlot}
          />
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 font-bold text-sm">{t('or_separator')}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Sequence area */}
        <div className="card-kids border-kids-orange bg-kids-orange/5">
          <p className="font-black text-kids-orange text-xs uppercase tracking-wide mb-4">
            {t('seq_label')}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            {seqMoves.map((move, idx) => (
              <SeqSlot
                key={idx}
                move={move}
                idx={idx}
                isHighlighted={seqHighlight === idx}
                onClick={() => handleSeqSlot(idx)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Move chip tray */}
      <div className="w-full bg-kids-purple/10 rounded-xl p-4 border-2 border-kids-purple/30">
        <p className="font-black text-kids-purple text-xs mb-3 uppercase tracking-wide">
          {t('move_tray_label')}
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(MOVE_META) as Move[]).map(move => (
            <MoveChip
              key={move}
              move={move}
              label={t(MOVE_META[move].labelKey)}
              isSelected={selMove === move}
              onClick={() => selectMove(move)}
            />
          ))}
        </div>
      </div>

      {/* Hint panel */}
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

      {/* Feedback banner */}
      <AnimatePresence mode="wait">
        {feedback !== 'none' && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4 ${
              feedback === 'success'
                ? 'bg-kids-green/20 border-kids-green text-green-800'
                : 'bg-kids-orange/10 border-kids-orange text-orange-700'
            }`}
          >
            {feedback === 'success'      && `⭐ ${t('success')} ⭐`}
            {feedback === 'too-verbose'  && `😅 ${t('feedback_too_verbose')}`}
            {feedback === 'need-spin'    && `🤔 ${t('feedback_need_spin')}`}
            {feedback === 'wrong-count'  && `🔢 ${t('feedback_wrong_count', { count: TARGET_COUNT })}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          whileHover={canRun ? { scale: 1.04 } : {}}
          whileTap={canRun ? { scale: 0.96 } : {}}
          onClick={handleRun}
          disabled={!canRun}
          className="btn-chunky bg-kids-green text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {runPhase === 'running' ? `⏳ ${t('running_label')}` : `▶️ ${t('run_button')}`}
        </motion.button>
        <button
          onClick={handleClear}
          disabled={runPhase === 'running'}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple disabled:opacity-40"
        >
          🗑️ {t('clear_button')}
        </button>
        <button
          onClick={() => setShowHint(h => !h)}
          className="btn-chunky bg-kids-blue text-white"
        >
          💡 {t('hint_button')}
        </button>
      </div>

      {/* Success sticker */}
      <AnimatePresence>
        {feedback === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">🏆</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Loop Legend! 🔁</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
