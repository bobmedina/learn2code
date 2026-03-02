'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const COLS       = 5;   // columns 0–4
const ROWS       = 6;   // rows 0–5 (row 5 = Bleep row)
const BLEEP_ROW  = 5;
const WIN_SCORE  = 10;
const FALL_MS    = 450; // how often stars fall one row
const SPAWN_MS   = 1400; // how often a new star spawns

interface Star { id: number; col: number; row: number }

let nextId = 0;

// ---------------------------------------------------------------------------
// Code panel — shows the running loop with highlight
// ---------------------------------------------------------------------------
function CodePanel({ catching }: { catching: boolean }) {
  return (
    <div className="w-full bg-gray-900 rounded-2xl p-4 font-mono text-sm space-y-1">
      <p className="text-kids-purple font-black">repeat_forever {'{'}</p>
      <motion.p
        animate={{ backgroundColor: catching ? 'rgba(6,214,160,0.25)' : 'transparent' }}
        transition={{ duration: 0.2 }}
        className="text-kids-yellow font-black rounded px-1 ml-4"
      >
        if (bleep_touches_star) {'{'}
      </motion.p>
      <motion.p
        animate={{ backgroundColor: catching ? 'rgba(6,214,160,0.25)' : 'transparent' }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-kids-green font-black rounded px-1 ml-8"
      >
        score = score + 1;
      </motion.p>
      <p className="text-kids-yellow font-black ml-4">{'}'}</p>
      <p className="text-kids-purple font-black">{'}'}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function StarCatcher() {
  const t = useTranslations('lesson10');

  const [stars, setStars]           = useState<Star[]>([]);
  const [bleepCol, setBleepCol]     = useState(2);
  const [score, setScore]           = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [catching, setCatching]     = useState(false);
  const [status, setStatus]         = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]     = useState(false);
  const savedRef   = useRef(false);
  const scoreRef   = useRef(0); // ref to avoid stale closure in interval

  scoreRef.current = score;

  // ---------------------------------------------------------------------------
  // Keyboard controls
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!gameRunning) return;
      if (e.key === 'ArrowLeft')  setBleepCol(c => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setBleepCol(c => Math.min(COLS - 1, c + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameRunning]);

  // ---------------------------------------------------------------------------
  // Game loop — fall + spawn
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!gameRunning) return;

    // Spawner
    const spawnInterval = setInterval(() => {
      setStars(prev => [
        ...prev,
        { id: nextId++, col: Math.floor(Math.random() * COLS), row: 0 },
      ]);
    }, SPAWN_MS);

    // Faller + collision
    const fallInterval = setInterval(() => {
      setStars(prev => {
        const next: Star[] = [];
        let caught = false;

        for (const star of prev) {
          const newRow = star.row + 1;
          if (newRow >= BLEEP_ROW) {
            // At Bleep's row — check collision
            if (star.col === bleepCol) {
              caught = true;
              setScore(s => {
                const ns = s + 1;
                if (ns >= WIN_SCORE && !savedRef.current) {
                  savedRef.current = true;
                  setGameRunning(false);
                  setTimeout(() => setStatus('success'), 300);
                  import('canvas-confetti').then(({ default: confetti }) => {
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 },
                      colors: ['#F9C74F', '#7209B7', '#4CC9F0', '#06D6A0', '#EF233C'] });
                  });
                  completeLesson(10, 'sticker-game_master').catch(console.error);
                }
                return ns;
              });
              // Don't add to next (star is caught)
            }
            // Either caught or missed — remove from board
          } else {
            next.push({ ...star, row: newRow });
          }
        }

        if (caught) {
          setCatching(true);
          setTimeout(() => setCatching(false), 300);
        }

        return next;
      });
    }, FALL_MS);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(fallInterval);
    };
  }, [gameRunning, bleepCol]);

  // ---------------------------------------------------------------------------
  // Grid render helpers
  // ---------------------------------------------------------------------------
  const getCellContent = useCallback((col: number, row: number) => {
    if (row === BLEEP_ROW && col === bleepCol) return '🤖';
    const star = stars.find(s => s.col === col && s.row === row);
    if (star) return '⭐';
    return null;
  }, [stars, bleepCol]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story */}
      <div className="card-kids border-kids-purple w-full text-center">
        <div className="text-7xl mb-3">⭐</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      {/* Score + code panel side by side */}
      <div className="w-full flex gap-4">
        {/* Score box */}
        <div className="flex-shrink-0 bg-white border-4 border-kids-yellow rounded-2xl px-5 py-4
          flex flex-col items-center gap-1 shadow-chunky">
          <span className="font-black text-kids-yellow text-xs uppercase tracking-wide">
            {t('score_label')}
          </span>
          <motion.span
            key={score}
            initial={{ scale: 1.5, color: '#F9C74F' }}
            animate={{ scale: 1, color: '#1a1a1a' }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="font-black text-4xl tabular-nums"
          >
            {score}
          </motion.span>
          <span className="font-bold text-gray-400 text-xs">{t('stars_caught', { count: score })}</span>

          {/* Progress bar */}
          <div className="w-20 bg-gray-100 rounded-full h-2 mt-1">
            <motion.div
              className="h-full bg-kids-yellow rounded-full"
              animate={{ width: `${Math.min(100, (score / WIN_SCORE) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Code panel */}
        <CodePanel catching={catching} />
      </div>

      {/* Game grid */}
      <div
        className="w-full max-w-[300px] mx-auto rounded-2xl overflow-hidden border-4 border-kids-purple bg-gray-900"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
          aspectRatio: `${COLS}/${ROWS}`,
        }}
      >
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => {
            const content = getCellContent(col, row);
            const isBleepRow = row === BLEEP_ROW;
            return (
              <div
                key={`${col}-${row}`}
                className={`flex items-center justify-center text-2xl border border-gray-800/50
                  ${isBleepRow ? 'bg-kids-purple/20' : ''}`}
              >
                {content && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={`${content}-${col}-${row}`}
                    className="leading-none"
                  >
                    {content}
                  </motion.span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Move buttons */}
      {gameRunning && (
        <div className="flex gap-4 w-full max-w-[300px] mx-auto">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setBleepCol(c => Math.max(0, c - 1))}
            className="flex-1 btn-chunky bg-kids-purple text-white text-xl"
          >
            {t('move_left')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setBleepCol(c => Math.min(COLS - 1, c + 1))}
            className="flex-1 btn-chunky bg-kids-purple text-white text-xl"
          >
            {t('move_right')}
          </motion.button>
        </div>
      )}

      {/* Start button */}
      {!gameRunning && status === 'idle' && (
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setStars([]); setScore(0); setGameRunning(true); }}
          className="btn-chunky bg-kids-purple text-white text-xl"
        >
          {t('start_button')}
        </motion.button>
      )}

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

      {/* Success banner + Finish Course button (only when score >= 10) */}
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
              ⭐ {t('success')} ⭐
            </div>
            {/* Finish Course — only visible when score >= WIN_SCORE (requirement) */}
            {score >= WIN_SCORE && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 340, damping: 16 }}
                className="btn-chunky bg-kids-yellow text-kids-purple text-2xl border-4 border-kids-yellow shadow-xl"
              >
                🎓 {t('finish_button')}
              </motion.button>
            )}
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
            <div className="text-8xl">⭐</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Game Master! 🎮</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
