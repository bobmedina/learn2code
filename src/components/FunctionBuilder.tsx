'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type Block = 'jump' | 'spin' | 'clap';

const BLOCK_META: Record<Block, { labelKey: 'block_jump' | 'block_spin' | 'block_clap' }> = {
  jump: { labelKey: 'block_jump' },
  spin: { labelKey: 'block_spin' },
  clap: { labelKey: 'block_clap' },
};

const BLOCK_COLORS: Record<Block, string> = {
  jump: 'bg-kids-orange text-white border-kids-orange',
  spin: 'bg-kids-blue text-white border-kids-blue',
  clap: 'bg-kids-yellow text-kids-purple border-kids-yellow',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FunctionBuilder() {
  const t = useTranslations('lesson6');

  const [defineBlocks, setDefineBlocks] = useState<Block[]>([]);
  const [callPhase, setCallPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [animStep, setAnimStep] = useState(-1);
  const [defineGlow, setDefineGlow] = useState(false);
  const [robotKey, setRobotKey] = useState(0);
  const [animMove, setAnimMove] = useState<Block | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Animation loop — step through defineBlocks one at a time
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (callPhase !== 'running') return;

    if (animStep >= defineBlocks.length) {
      setCallPhase('done');
      setAnimStep(-1);
      setDefineGlow(false);
      return;
    }

    const move = defineBlocks[animStep];
    setAnimMove(move);
    setDefineGlow(true);
    setRobotKey(k => k + 1);

    const t1 = setTimeout(() => {
      setDefineGlow(false);
    }, 500);

    const t2 = setTimeout(() => {
      setAnimStep(s => s + 1);
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [callPhase, animStep, defineBlocks]);

  // ---------------------------------------------------------------------------
  // Success check when done
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (callPhase !== 'done') return;
    setStatus('success');
    if (!savedRef.current) {
      savedRef.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 180, spread: 90, origin: { y: 0.6 },
          colors: ['#7209B7', '#F9C74F', '#4CC9F0', '#06D6A0'],
        });
      });
      completeLesson(6, 'sticker-function').catch(console.error);
    }
  }, [callPhase]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function handleAddBlock(block: Block) {
    if (callPhase === 'running' || status === 'success') return;
    setDefineBlocks(prev => [...prev, block]);
    setFeedback(null);
  }

  function handleRemoveBlock(idx: number) {
    if (callPhase === 'running' || status === 'success') return;
    setDefineBlocks(prev => prev.filter((_, i) => i !== idx));
    setFeedback(null);
  }

  function handleCall() {
    if (callPhase === 'running' || status === 'success') return;

    if (defineBlocks.length === 0) {
      setFeedback(t('feedback_empty'));
      return;
    }
    if (!defineBlocks.includes('jump')) {
      setFeedback(t('feedback_missing_jump'));
      return;
    }
    if (!defineBlocks.includes('spin')) {
      setFeedback(t('feedback_missing_spin'));
      return;
    }

    setFeedback(null);
    setAnimStep(0);
    setAnimMove(null);
    setCallPhase('running');
  }

  function handleClear() {
    if (callPhase === 'running') return;
    setDefineBlocks([]);
    setCallPhase('idle');
    setAnimStep(-1);
    setDefineGlow(false);
    setAnimMove(null);
    setFeedback(null);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8">

      {/* Story card */}
      <div className="card-kids border-kids-purple w-full text-center">
        <div className="text-7xl mb-3">⚡</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Robot */}
      <div className="relative flex flex-col items-center">
        <motion.div
          key={robotKey}
          initial={{ rotate: 0, scale: 1, y: 0 }}
          animate={
            callPhase === 'running' && animMove === 'jump'
              ? { y: [0, -40, 0] }
              : callPhase === 'running' && animMove === 'spin'
                ? { rotate: 360 }
                : callPhase === 'running' && animMove === 'clap'
                  ? { scale: [1, 0.75, 1.3, 1] }
                  : {}
          }
          transition={
            animMove === 'spin'
              ? { duration: 0.55, ease: 'easeInOut' }
              : { duration: 0.5 }
          }
          className="text-8xl select-none"
        >
          🤖
        </motion.div>

        {callPhase === 'running' && (
          <motion.div
            key={`badge-${animStep}`}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16 }}
            className="absolute -top-3 -right-8 bg-kids-purple text-white font-black text-sm
              rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          >
            {animStep + 1}/{defineBlocks.length}
          </motion.div>
        )}
      </div>

      {/* Function define area */}
      <div className="w-full space-y-1">
        <p className="font-mono font-black text-kids-purple text-sm">
          {t('define_label')}
        </p>
        <motion.div
          animate={{
            scale: defineGlow ? 1.02 : 1,
            boxShadow: defineGlow
              ? '0 0 0 4px #7209B7, 0 0 28px rgba(114,9,183,0.45)'
              : '0 0 0 0px transparent',
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          className="rounded-2xl border-4 border-kids-purple bg-kids-purple/5 p-4 min-h-[72px]
            flex flex-wrap gap-2 items-start"
        >
          <AnimatePresence>
            {defineBlocks.length === 0 && (
              <motion.p
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-kids-purple/40 font-bold text-sm self-center"
              >
                {/* empty placeholder */}
                Click blocks below to add them here ↓
              </motion.p>
            )}
            {defineBlocks.map((block, idx) => (
              <motion.button
                key={`${block}-${idx}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: callPhase === 'running' && animStep === idx ? 1.15 : 1,
                  opacity: 1,
                  boxShadow: callPhase === 'running' && animStep === idx
                    ? '0 0 0 3px #06D6A0'
                    : '0 0 0 0px transparent',
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                onClick={() => handleRemoveBlock(idx)}
                disabled={callPhase === 'running' || status === 'success'}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl font-black text-sm
                  border-4 shadow-chunky select-none cursor-pointer disabled:cursor-default
                  ${BLOCK_COLORS[block]}`}
              >
                {t(BLOCK_META[block].labelKey)}
                {callPhase === 'idle' && status !== 'success' && (
                  <span className="ml-1 text-xs opacity-60">×</span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
        <p className="font-mono font-black text-kids-purple text-sm">
          {t('define_close')}
        </p>
      </div>

      {/* Call button area */}
      <div className="w-full bg-kids-purple/10 rounded-2xl border-4 border-kids-purple/30 p-4
        flex flex-col items-start gap-3">
        <p className="font-mono font-black text-kids-purple text-sm">{t('call_label')}</p>
        <motion.button
          whileHover={callPhase !== 'running' && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={callPhase !== 'running' && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleCall}
          disabled={callPhase === 'running' || status === 'success'}
          className="btn-chunky bg-kids-purple text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {callPhase === 'running' ? '⏳ Running…' : `⚡ ${t('call_button')}`}
        </motion.button>
      </div>

      {/* Block palette */}
      <div className="w-full bg-kids-purple/10 rounded-xl p-4 border-2 border-kids-purple/30">
        <p className="font-black text-kids-purple text-xs mb-3 uppercase tracking-wide">
          Click to add blocks 👇
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(BLOCK_META) as Block[]).map(block => (
            <motion.button
              key={block}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleAddBlock(block)}
              disabled={callPhase === 'running' || status === 'success'}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-base
                border-4 shadow-chunky select-none cursor-pointer disabled:opacity-40
                disabled:cursor-not-allowed ${BLOCK_COLORS[block]}`}
            >
              {t(BLOCK_META[block].labelKey)}
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

      {/* Feedback banner */}
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
        {status === 'success' && !feedback && (
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

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={handleClear}
          disabled={callPhase === 'running'}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple disabled:opacity-40"
        >
          🗑️ Clear
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
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">⚡</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Function Wizard! 🧙</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
