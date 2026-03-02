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

const SHIELD_COUNT = 10;

// 8 meteor columns spread evenly across the arena
const METEOR_COLS = Array.from({ length: 8 }, (_, i) =>
  `${5 + Math.round(i * (90 / 7))}%`
);

// Shield left position: 10 shields from 5% to 86%
function shieldLeft(i: number): string {
  return `${5 + i * 9}%`;
}

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
      className={`px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing touch-none transition-opacity
        ${colorClass}
        ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable slot (inside the loop body)
// ---------------------------------------------------------------------------
function DroppableSlot({ id, filled, chipLabel, chipColorClass, placeholder }: {
  id: string; filled: boolean; chipLabel: string; chipColorClass: string; placeholder: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`px-3 py-2 rounded-xl font-mono font-black text-sm min-w-[170px] text-center border-2 transition-all
        ${filled
          ? `${chipColorClass} border-transparent`
          : isOver
            ? 'border-kids-yellow bg-kids-yellow/10 text-kids-yellow'
            : 'border-dashed border-gray-500 bg-gray-800/50 text-gray-500 italic'
        }`}
    >
      {filled ? chipLabel : placeholder}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ShieldGenerator() {
  const t = useTranslations('lesson15');
  const { locale } = useParams() as { locale: string };

  const [cloneFilled, setCloneFilled] = useState(false);
  const [moveFilled, setMoveFilled] = useState(false);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [stepTick, setStepTick] = useState(0);
  const [bleepX, setBleepX] = useState(5);
  const [meteorPhase, setMeteorPhase] = useState<'frozen' | 'falling' | 'settled'>('frozen');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  // Step animation: one shield + one Bleep step every 300ms
  useEffect(() => {
    if (phase !== 'running') return;

    if (stepTick >= SHIELD_COUNT) {
      setPhase('done');
      timerRef.current = setTimeout(() => {
        setMeteorPhase('falling');
        timerRef.current = setTimeout(() => {
          setMeteorPhase('settled');
          if (!savedRef.current) {
            savedRef.current = true;
            completeLesson(15, 'sticker-clone_commander').catch(console.error);
          }
          timerRef.current = setTimeout(() => setStatus('success'), 600);
        }, 1800);
      }, 400);
      return;
    }

    timerRef.current = setTimeout(() => {
      setBleepX(5 + (stepTick + 1) * 9);
      setStepTick(s => s + 1);
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, stepTick]);

  // Confetti on success
  useEffect(() => {
    if (status !== 'success') return;
    import('canvas-confetti').then(m =>
      m.default({ particleCount: 120, spread: 70, origin: { y: 0.5 } })
    );
  }, [status]);

  // Cleanup timers on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleRun() {
    if (!cloneFilled || !moveFilled || phase !== 'idle' || status === 'success') return;
    setStepTick(0);
    setBleepX(5);
    setMeteorPhase('frozen');
    setPhase('running');
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDrag(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) return;
    if (active.id === 'clone-chip' && over.id === 'clone-slot') setCloneFilled(true);
    if (active.id === 'move-chip' && over.id === 'move-slot') setMoveFilled(true);
  }

  const canRun = cloneFilled && moveFilled && phase === 'idle' && status !== 'success';

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-xl mx-auto">

      {/* Story card */}
      <div className="card-kids border-kids-purple w-full">
        <p className="font-black text-kids-purple text-lg">🛡️ {t('mission')}</p>
        <p className="text-gray-600 font-bold text-sm mt-1">{t('goal')}</p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Code editor */}
        <div className="w-full bg-gray-900 rounded-2xl p-5 font-mono text-sm shadow-xl">
          <span className="text-kids-green font-black">{t('loop_label')}</span>
          <span className="text-white font-black"> {'{'}</span>
          <div className="ml-6 mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs select-none">1.</span>
              <DroppableSlot
                id="clone-slot"
                filled={cloneFilled}
                chipLabel={t('block_clone')}
                chipColorClass="bg-kids-green text-white"
                placeholder={t('clone_placeholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs select-none">2.</span>
              <DroppableSlot
                id="move-slot"
                filled={moveFilled}
                chipLabel={t('block_move')}
                chipColorClass="bg-kids-blue text-white"
                placeholder={t('move_placeholder')}
              />
            </div>
          </div>
          <div className="text-white font-black mt-3">{'}'}</div>
        </div>

        {/* Block tray */}
        <div className="flex gap-3 flex-wrap justify-center min-h-[52px] items-center">
          {!cloneFilled && (
            <DraggableChip
              id="clone-chip"
              label={t('block_clone')}
              colorClass="bg-kids-green text-white border-kids-green/60"
            />
          )}
          {!moveFilled && (
            <DraggableChip
              id="move-chip"
              label={t('block_move')}
              colorClass="bg-kids-blue text-white border-kids-blue/60"
            />
          )}
          {cloneFilled && moveFilled && phase === 'idle' && status !== 'success' && (
            <p className="text-sm font-bold text-kids-green animate-bounce">✅ Ready — press Run!</p>
          )}
        </div>

        {/* DragOverlay */}
        <DragOverlay>
          {activeDrag === 'clone-chip' && (
            <div className="px-4 py-3 rounded-xl bg-kids-green text-white font-mono font-black text-sm shadow-xl border-4 border-kids-green/60">
              {t('block_clone')}
            </div>
          )}
          {activeDrag === 'move-chip' && (
            <div className="px-4 py-3 rounded-xl bg-kids-blue text-white font-mono font-black text-sm shadow-xl border-4 border-kids-blue/60">
              {t('block_move')}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Arena */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-kids-purple"
        style={{ height: 280, background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' }}
      >
        {/* Stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: 2, height: 2, left: `${(i * 17 + 5) % 95}%`, top: `${(i * 13 + 3) % 55}%`, opacity: 0.5 }}
          />
        ))}

        {/* Meteors */}
        {METEOR_COLS.map((left, i) => (
          <motion.div
            key={i}
            className="absolute text-xl leading-none select-none"
            style={{ left, top: 0, transform: 'translateX(-50%)' }}
            animate={
              meteorPhase === 'frozen'
                ? { y: 0, opacity: 0.85 }
                : meteorPhase === 'falling'
                  ? { y: [0, 170, 160], opacity: [0.85, 0.85, 0.25] }
                  : { y: 160, opacity: 0.25 }
            }
            transition={meteorPhase === 'falling' ? { duration: 1.5, ease: 'easeIn' } : { duration: 0 }}
          >
            ☄️
          </motion.div>
        ))}

        {/* Shields — pop in one by one as stepTick advances */}
        {Array.from({ length: SHIELD_COUNT }, (_, i) =>
          stepTick > i && (
            <div
              key={i}
              className="absolute"
              style={{ left: shieldLeft(i), bottom: 60, transform: 'translateX(-50%)' }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="text-2xl leading-none select-none"
              >
                🛡️
              </motion.div>
            </div>
          )
        )}

        {/* Bleep — walks across placing each shield */}
        <motion.div
          className="absolute text-3xl leading-none select-none"
          style={{ bottom: 88, transform: 'translateX(-50%)', zIndex: 6 }}
          animate={{ left: `${bleepX}%` }}
          transition={{ duration: 0.22, type: 'spring', stiffness: 320, damping: 22 }}
        >
          🤖
        </motion.div>

        {/* Ground strip */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-kids-purple/30 border-t-2 border-kids-purple/50" />

        {/* Wall complete chip */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-green text-white font-black text-sm px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap"
            >
              {t('shields_ready')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          onClick={handleRun}
          disabled={!canRun}
          whileTap={{ scale: canRun ? 0.95 : 1 }}
          className="btn-chunky bg-kids-purple text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'running' ? `⏳ ${t('loading_label')}…` : t('run_button')}
        </motion.button>
        <button
          onClick={() => setShowHint(h => !h)}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-base"
        >
          {t('hint_button')}
        </button>
      </div>

      {/* Hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-kids-yellow/20 border-2 border-kids-yellow rounded-xl p-3 text-sm font-bold text-gray-700 overflow-hidden"
          >
            💡 {t('hint')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success banner */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full card-kids border-kids-green text-center"
          >
            <p className="font-black text-kids-green text-xl mb-3">🎉 {t('success')}</p>
            <Link href={`/${locale}/lesson16`}>
              <button className="btn-chunky bg-kids-green text-white text-lg">
                {t('next_lesson')}
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
