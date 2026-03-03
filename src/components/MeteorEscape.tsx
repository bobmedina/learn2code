'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { completeLesson } from '@/lib/actions';

// Meteor positions (percentage of arena width)
const METEORS = [30, 54, 74];
// How close Bleep must be (in % units) to trigger collision
const HIT_RADIUS = 3;

// ---------------------------------------------------------------------------
// Draggable chip
// ---------------------------------------------------------------------------
function DraggableChip({ id, label, colorClass }: {
  id: string; label: string; colorClass: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-3 py-2 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing touch-none transition-opacity
        ${colorClass} ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable slot (inline in code editor)
// ---------------------------------------------------------------------------
function Slot({ id, filled, filledLabel, filledColor, placeholder, wide = false }: {
  id: string;
  filled: boolean;
  filledLabel: string;
  filledColor: string;
  placeholder: string;
  wide?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg font-mono font-black text-sm text-center border-2 transition-all
        ${wide ? 'px-3 py-1.5 min-w-[120px]' : 'px-2 py-1.5 min-w-[80px]'}
        ${filled
          ? `${filledColor} border-transparent`
          : isOver
            ? 'border-kids-yellow bg-kids-yellow/10 text-kids-yellow'
            : 'border-dashed border-gray-500 bg-gray-800/60 text-gray-500 text-xs italic'
        }`}
    >
      {filled ? filledLabel : placeholder}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function MeteorEscape() {
  const t = useTranslations('lesson19');
  const { locale } = useParams() as { locale: string };

  // Slot fill states
  const [whileFilled,   setWhileFilled]   = useState(false);
  const [forwardFilled, setForwardFilled] = useState(false);
  const [ifCondFilled,  setIfCondFilled]  = useState(false);
  const [jumpFilled,    setJumpFilled]    = useState(false);

  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  // Animation state
  const [phase,    setPhase]    = useState<'idle' | 'running' | 'stopped' | 'crashed' | 'done'>('idle');
  const [bleepPos, setBleepPos] = useState(5);  // 0-100%
  const [bleepY,   setBleepY]   = useState(0);  // upward offset in px (jump)
  const [status,   setStatus]   = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);

  // Refs for interval closure
  const posRef         = useRef(5);
  const jumpingRef     = useRef(false);
  const jumpedRef      = useRef<Set<number>>(new Set());
  const savedRef       = useRef(false);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const canRun = phase !== 'running' && status !== 'success';

  function handleRun() {
    if (!canRun) return;
    // Reset Bleep
    posRef.current     = 5;
    jumpingRef.current = false;
    jumpedRef.current  = new Set();
    setBleepPos(5);
    setBleepY(0);
    setPhase('running');
  }

  // Animation loop — captures slot states at the moment phase becomes 'running'
  useEffect(() => {
    if (phase !== 'running') return;

    // Path A: while slot not filled → take one small step, then stop
    if (!whileFilled) {
      let done = false;
      const t = setInterval(() => {
        if (done) return;
        posRef.current += 2.5;
        setBleepPos(posRef.current);
        if (posRef.current >= 22) {
          done = true;
          clearInterval(t);
          setPhase('stopped');
        }
      }, 30);
      intervalRef.current = t;
      return () => clearInterval(t);
    }

    // Path B/C: while filled → run across, check meteors
    const runInterval = setInterval(() => {
      if (jumpingRef.current) return;

      posRef.current += 1.4;
      setBleepPos(posRef.current);

      // Check meteor collisions
      for (const mPos of METEORS) {
        if (!jumpedRef.current.has(mPos) && Math.abs(posRef.current - mPos) < HIT_RADIUS) {
          if (ifCondFilled && jumpFilled) {
            // Jump over this meteor
            jumpedRef.current.add(mPos);
            jumpingRef.current = true;
            setBleepY(48);
            setTimeout(() => {
              setBleepY(0);
              jumpingRef.current = false;
            }, 480);
          } else {
            // Crash
            clearInterval(runInterval);
            setPhase('crashed');
            return;
          }
          break;
        }
      }

      // Reached Earth
      if (posRef.current >= 88) {
        clearInterval(runInterval);
        setPhase('done');
      }
    }, 25);

    intervalRef.current = runInterval;
    return () => clearInterval(runInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Success side-effect
  useEffect(() => {
    if (phase !== 'done') return;
    if (savedRef.current) return;
    savedRef.current = true;

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 200, spread: 90, origin: { y: 0.5 },
        colors: ['#7209B7', '#4CC9F0', '#F9C74F', '#06D6A0'],
      });
    });
    completeLesson(19, 'sticker-world_builder').catch(console.error);
    setTimeout(() => setStatus('success'), 400);
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDrag(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) return;
    const a = active.id as string;
    const o = over.id   as string;
    if (a === 'while-chip'   && o === 'while-slot')   setWhileFilled(true);
    if (a === 'forward-chip' && o === 'forward-slot') setForwardFilled(true);
    if (a === 'meteor-chip'  && o === 'if-slot')      setIfCondFilled(true);
    if (a === 'jump-chip'    && o === 'jump-slot')     setJumpFilled(true);
  }

  const bleepEmoji =
    phase === 'crashed' ? '💥'
    : phase === 'done'   ? '😄'
    : bleepY > 0         ? '🚀'
    : '🤖';

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-purple w-full">
        <div className="text-6xl mb-3 text-center">🌌</div>
        <h1 className="text-2xl font-black text-kids-purple text-center mb-2">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-sm mb-3 text-center">{t('story')}</p>
        <p className="text-sm font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* ── Code editor ── */}
        <div className="w-full bg-gray-900 rounded-2xl p-5 font-mono text-sm shadow-xl space-y-2">

          {/* while ( [while-slot] ) { */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-kids-yellow font-black">{t('kw_while')}</span>
            <span className="text-white">(</span>
            <Slot
              id="while-slot"
              filled={whileFilled}
              filledLabel={t('block_while')}
              filledColor="bg-kids-purple text-white"
              placeholder={t('slot_while_ph')}
              wide
            />
            <span className="text-white">) {'{'}</span>
          </div>

          {/* → [forward-slot] */}
          <div className="ml-5 flex items-center gap-2">
            <span className="text-gray-500 text-xs select-none">›</span>
            <Slot
              id="forward-slot"
              filled={forwardFilled}
              filledLabel={t('block_forward')}
              filledColor="bg-kids-green text-white"
              placeholder={t('slot_forward_ph')}
              wide
            />
          </div>

          {/* → if ( [if-slot] ) { */}
          <div className="ml-5 flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500 text-xs select-none">›</span>
            <span className="text-kids-blue font-black">{t('kw_if')}</span>
            <span className="text-white">(</span>
            <Slot
              id="if-slot"
              filled={ifCondFilled}
              filledLabel={t('block_meteor')}
              filledColor="bg-kids-orange text-white"
              placeholder={t('slot_if_ph')}
              wide
            />
            <span className="text-white">) {'{'}</span>
          </div>

          {/* →→ [jump-slot] */}
          <div className="ml-10 flex items-center gap-2">
            <span className="text-gray-500 text-xs select-none">›</span>
            <Slot
              id="jump-slot"
              filled={jumpFilled}
              filledLabel={t('block_jump')}
              filledColor="bg-kids-blue text-white"
              placeholder={t('slot_jump_ph')}
              wide
            />
          </div>

          {/* → } */}
          <div className="ml-5 text-white font-black">{'}'}</div>

          {/* } */}
          <div className="text-white font-black">{'}'}</div>
        </div>

        {/* ── Block tray ── */}
        <div className="flex gap-3 flex-wrap justify-center min-h-[52px] items-center">
          {!whileFilled && (
            <DraggableChip
              id="while-chip"
              label={t('block_while')}
              colorClass="bg-kids-purple text-white border-kids-purple/60"
            />
          )}
          {!forwardFilled && (
            <DraggableChip
              id="forward-chip"
              label={t('block_forward')}
              colorClass="bg-kids-green text-white border-kids-green/60"
            />
          )}
          {!ifCondFilled && (
            <DraggableChip
              id="meteor-chip"
              label={t('block_meteor')}
              colorClass="bg-kids-orange text-white border-kids-orange/60"
            />
          )}
          {!jumpFilled && (
            <DraggableChip
              id="jump-chip"
              label={t('block_jump')}
              colorClass="bg-kids-blue text-white border-kids-blue/60"
            />
          )}
          {whileFilled && forwardFilled && ifCondFilled && jumpFilled && phase === 'idle' && status !== 'success' && (
            <p className="text-sm font-bold text-kids-purple animate-bounce">
              ✅ All blocks placed — ready to run!
            </p>
          )}
        </div>

        <DragOverlay>
          {activeDrag === 'while-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-purple text-white font-mono font-black text-sm shadow-xl border-4 border-kids-purple/60">
              {t('block_while')}
            </div>
          )}
          {activeDrag === 'forward-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-green text-white font-mono font-black text-sm shadow-xl border-4 border-kids-green/60">
              {t('block_forward')}
            </div>
          )}
          {activeDrag === 'meteor-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-orange text-white font-mono font-black text-sm shadow-xl border-4 border-kids-orange/60">
              {t('block_meteor')}
            </div>
          )}
          {activeDrag === 'jump-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-blue text-white font-mono font-black text-sm shadow-xl border-4 border-kids-blue/60">
              {t('block_jump')}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Space arena ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-kids-purple"
        style={{ height: 200, background: 'linear-gradient(to right, #0f0c29, #302b63, #24243e)' }}
      >
        {/* Stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 4 === 0 ? 3 : 2,
              height: i % 4 === 0 ? 3 : 2,
              left: `${(i * 23 + 5) % 96}%`,
              top:  `${(i * 17 + 8) % 80}%`,
              opacity: 0.3 + (i % 3) * 0.1,
            }}
          />
        ))}

        {/* Fixed meteors */}
        {METEORS.map((mPos, i) => (
          <div
            key={i}
            className="absolute text-2xl select-none"
            style={{ left: `${mPos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            🌑
          </div>
        ))}

        {/* Earth (destination) */}
        <div
          className="absolute text-3xl select-none"
          style={{ right: '4%', top: '50%', transform: 'translateY(-50%)' }}
        >
          🌍
        </div>

        {/* Bleep */}
        <motion.div
          className="absolute text-3xl select-none"
          style={{ bottom: 20 }}
          animate={{
            left: `${bleepPos}%`,
            y: -bleepY,
          }}
          transition={{ duration: 0.04, ease: 'linear' }}
        >
          {bleepEmoji}
        </motion.div>

        {/* Feedback overlays */}
        <AnimatePresence>
          {phase === 'stopped' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-orange/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap max-w-[90%] text-center"
            >
              {t('feedback_stopped')}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === 'crashed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-red/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap max-w-[90%] text-center"
            >
              {t('feedback_crashed')}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-green/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              🏠 Home!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Buttons ── */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          onClick={handleRun}
          disabled={!canRun}
          whileTap={{ scale: canRun ? 0.95 : 1 }}
          className="btn-chunky bg-kids-purple text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'running' ? '⏳ Running…' : t('run_button')}
        </motion.button>
        <button
          onClick={() => setShowHint(h => !h)}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-base"
        >
          💡 {t('hint_button')}
        </button>
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
            <div className="bg-kids-yellow/20 border-2 border-kids-yellow rounded-xl p-3 text-sm font-bold text-gray-700">
              💡 {t('hint')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success banner */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 20 }}
            className="w-full card-kids border-kids-purple text-center"
          >
            <p className="font-black text-kids-purple text-xl mb-3">🎉 {t('success')}</p>
            <Link href={`/${locale}/lesson20`}>
              <button className="btn-chunky bg-kids-purple text-white text-lg">
                {t('next_lesson')}
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.3 }}
            className="text-center"
          >
            <div className="text-8xl">🌌</div>
            <p className="font-black text-kids-purple text-2xl mt-2">World Builder! 🚀</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
