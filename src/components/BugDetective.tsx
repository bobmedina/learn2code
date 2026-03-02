'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

type BlockType = 'right' | 'left' | 'jump';

const BLOCK_DELTA: Record<BlockType, number> = { right: 1, left: -1, jump: 0 };

const INITIAL_SEQUENCE: BlockType[] = ['right', 'right', 'left', 'right'];
const WINNING_SEQUENCE: BlockType[] = ['right', 'right', 'right', 'right'];
const GOAL = 4; // must reach position 4 on a 0–4 track

// ---------------------------------------------------------------------------
// Track display
// ---------------------------------------------------------------------------
function Track({ position, goal }: { position: number; goal: number }) {
  const cells = Array.from({ length: goal + 1 }, (_, i) => i);
  return (
    <div className="flex items-center gap-1 w-full justify-center">
      {cells.map(i => (
        <div key={i} className="relative flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-xl border-4 flex items-center justify-center text-lg
            ${i === goal
              ? 'border-kids-yellow bg-kids-yellow/20'
              : 'border-gray-200 bg-gray-50'}`}
          >
            {i === goal ? '🏆' : ''}
          </div>
          <span className="text-xs font-black text-gray-300">{i}</span>
          {/* Bleep marker */}
          {Math.round(position) === i && (
            <motion.div
              className="absolute -top-8 text-2xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              🤖
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function BugDetective() {
  const t = useTranslations('lesson8');

  const [sequence, setSequence]       = useState<(BlockType | null)[]>([...INITIAL_SEQUENCE]);
  const [runPhase, setRunPhase]        = useState<'idle' | 'running' | 'done'>('idle');
  const [position, setPosition]        = useState(0);
  const [stepIdx, setStepIdx]          = useState(-1);
  const [highlightBug, setHighlightBug] = useState(false);
  const [feedback, setFeedback]        = useState<string | null>(null);
  const [status, setStatus]            = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]        = useState(false);
  const savedRef = useRef(false);

  // Animation: step through sequence
  useEffect(() => {
    if (runPhase !== 'running') return;
    if (stepIdx >= sequence.length) {
      setRunPhase('done');
      return;
    }
    const block = sequence[stepIdx];
    if (block) setPosition(p => Math.max(0, Math.min(GOAL, p + BLOCK_DELTA[block])));

    const timer = setTimeout(() => setStepIdx(i => i + 1), 600);
    return () => clearTimeout(timer);
  }, [runPhase, stepIdx, sequence]);

  // Check result when done
  useEffect(() => {
    if (runPhase !== 'done') return;
    const isCorrect = JSON.stringify(sequence) === JSON.stringify(WINNING_SEQUENCE);
    if (isCorrect && position === GOAL) {
      setStatus('success');
      if (!savedRef.current) {
        savedRef.current = true;
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 },
            colors: ['#F9C74F', '#EF233C', '#7209B7', '#06D6A0'] });
        });
        completeLesson(8, 'sticker-bug_detective').catch(console.error);
      }
    } else {
      setFeedback(t('feedback_wrong'));
      // Highlight bug after wrong run
      setTimeout(() => setHighlightBug(true), 300);
    }
  }, [runPhase, position, sequence, t]);

  function handleRun() {
    if (runPhase === 'running' || status === 'success') return;
    if (sequence.some(b => b === null)) return;
    setPosition(0);
    setStepIdx(0);
    setRunPhase('running');
    setFeedback(null);
    setHighlightBug(false);
  }

  function handleReset() {
    setSequence([...INITIAL_SEQUENCE]);
    setRunPhase('idle');
    setPosition(0);
    setStepIdx(-1);
    setFeedback(null);
    setHighlightBug(false);
  }

  function handleRemoveBlock(idx: number) {
    if (runPhase === 'running' || status === 'success') return;
    setSequence(prev => { const n = [...prev]; n[idx] = null; return n; });
    setFeedback(null);
    setHighlightBug(false);
  }

  function handleAddBlock(block: BlockType, idx: number) {
    if (runPhase === 'running' || status === 'success') return;
    setSequence(prev => { const n = [...prev]; n[idx] = block; return n; });
    setFeedback(null);
  }

  const BLOCK_COLORS: Record<BlockType, string> = {
    right: 'bg-kids-green  text-white border-kids-green',
    left:  'bg-kids-red    text-white border-kids-red',
    jump:  'bg-kids-orange text-white border-kids-orange',
  };
  const BLOCK_LABELS: Record<BlockType, string> = {
    right: t('block_right'),
    left:  t('block_left'),
    jump:  t('block_jump'),
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story */}
      <div className="card-kids border-kids-yellow w-full text-center">
        <div className="text-7xl mb-3">🔍</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-yellow bg-kids-yellow/20 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Track */}
      <div className="w-full bg-white rounded-2xl border-4 border-kids-yellow p-5">
        <p className="font-black text-kids-yellow text-xs uppercase tracking-wide mb-6 text-center">
          {t('track_label')}
        </p>
        <div className="mt-8">
          <Track position={position} goal={GOAL} />
        </div>
      </div>

      {/* Code sequence */}
      <div className="w-full space-y-2">
        <p className="font-mono font-black text-kids-yellow text-sm">run() {'{'}</p>
        <div className="rounded-2xl border-4 border-kids-yellow bg-kids-yellow/5 p-4 space-y-2">
          {sequence.map((block, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="font-black text-gray-300 text-xs w-4">{idx + 1}</span>

              {block !== null ? (
                <motion.div
                  animate={{
                    boxShadow: highlightBug && idx === 2
                      ? ['0 0 0 3px #EF233C', '0 0 0 6px #EF233C', '0 0 0 3px #EF233C']
                      : '0 0 0 0px transparent',
                  }}
                  transition={{ repeat: highlightBug && idx === 2 ? Infinity : 0, duration: 0.7 }}
                  className="flex-1"
                >
                  <button
                    onClick={() => handleRemoveBlock(idx)}
                    disabled={runPhase === 'running' || status === 'success'}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-xl
                      font-black text-sm border-4 shadow-chunky cursor-pointer disabled:cursor-default
                      transition-all ${BLOCK_COLORS[block]}
                      ${runPhase === 'running' && stepIdx === idx ? 'scale-105' : ''}
                      ${highlightBug && idx === 2 ? 'ring-4 ring-kids-red ring-offset-2' : ''}`}
                  >
                    <span>{BLOCK_LABELS[block]}</span>
                    {highlightBug && idx === 2 && (
                      <span className="text-xs bg-white/20 rounded px-1">🐛 BUG!</span>
                    )}
                    {runPhase === 'idle' && status !== 'success' && (
                      <span className="text-xs opacity-60">×</span>
                    )}
                  </button>
                </motion.div>
              ) : (
                <div className="flex-1 flex gap-2">
                  {(['right', 'left', 'jump'] as BlockType[]).map(b => (
                    <button
                      key={b}
                      onClick={() => handleAddBlock(b, idx)}
                      disabled={runPhase === 'running' || status === 'success'}
                      className={`flex-1 px-3 py-2 rounded-xl font-black text-xs border-4
                        cursor-pointer disabled:opacity-40 ${BLOCK_COLORS[b]}`}
                    >
                      {BLOCK_LABELS[b]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="font-mono font-black text-kids-yellow text-sm">{'}'}</p>
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
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-orange/10 border-kids-orange text-orange-700"
          >
            🐛 {feedback}
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

      {/* Buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          whileHover={runPhase !== 'running' ? { scale: 1.04 } : {}}
          whileTap={runPhase !== 'running' ? { scale: 0.96 } : {}}
          onClick={handleRun}
          disabled={runPhase === 'running' || status === 'success' || sequence.some(b => b === null)}
          className="btn-chunky bg-kids-yellow text-kids-purple disabled:opacity-40"
        >
          {runPhase === 'running' ? '⏳ Running…' : t('run_button')}
        </motion.button>
        <button onClick={handleReset} disabled={runPhase === 'running'}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple disabled:opacity-40">
          🔄 {t('clear_button')}
        </button>
        <button onClick={() => setShowHint(h => !h)} className="btn-chunky bg-kids-blue text-white">
          💡 {t('hint_button')}
        </button>
      </div>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">🔍</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Bug Detective! 🐛</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
