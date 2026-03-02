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
const METEOR_COUNT = 8;

// Meteor x-positions spread evenly across the arena
const METEOR_COLS = Array.from({ length: METEOR_COUNT }, (_, i) =>
  `${6 + Math.round(i * (88 / (METEOR_COUNT - 1)))}%`
);

// ---------------------------------------------------------------------------
// Draggable clone block
// ---------------------------------------------------------------------------
function CloneChip({ label, disabled }: { label: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'clone', disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing transition-opacity
        bg-kids-green text-white border-kids-green
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${disabled ? 'opacity-40 cursor-default' : ''}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loop container with droppable body
// ---------------------------------------------------------------------------
function LoopBox({
  filled, cloneLabel, loopLabel, placeholder,
}: { filled: boolean; cloneLabel: string; loopLabel: string; placeholder: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'loop-body' });
  return (
    <div className="w-full space-y-1">
      <div className="bg-kids-purple rounded-xl px-4 py-2 inline-block">
        <span className="font-mono font-black text-white text-sm">{loopLabel} {'{'}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`ml-6 min-h-[52px] rounded-xl border-4 flex items-center px-4 transition-all
          ${isOver ? 'border-kids-green bg-kids-green/20 scale-[1.02]' : 'border-kids-blue/40 bg-white'}
          ${filled ? 'border-solid' : 'border-dashed'}`}
      >
        {filled
          ? <span className="font-mono font-black text-kids-green text-sm">{cloneLabel}</span>
          : <span className="font-mono text-kids-blue/30 text-sm">{placeholder}</span>
        }
      </div>
      <div className="bg-kids-purple rounded-xl px-4 py-2 inline-block">
        <span className="font-mono font-black text-white text-sm">{'}'}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ShieldGenerator() {
  const t      = useTranslations('lesson15');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [filled, setFilled]             = useState(false);
  const [dragging, setDragging]         = useState<string | null>(null);
  const [phase, setPhase]               = useState<'idle' | 'generating' | 'shielded' | 'meteors' | 'done'>('idle');
  const [shieldsUp, setShieldsUp]       = useState(0);
  const [meteorPhase, setMeteorPhase]   = useState<'frozen' | 'falling' | 'settled'>('frozen');
  const [status, setStatus]             = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]         = useState(false);
  const savedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragStart({ active }: DragStartEvent) { setDragging(active.id as string); }
  function handleDragEnd({ over }: DragEndEvent) {
    setDragging(null);
    if (!over || filled) return;
    if (over.id === 'loop-body') setFilled(true);
  }

  function handleRun() {
    if (!filled || phase !== 'idle' || status === 'success') return;
    setShieldsUp(0);
    setPhase('generating');
  }

  // Pop shields in one-by-one, then launch meteors
  useEffect(() => {
    if (phase !== 'generating') return;
    if (shieldsUp >= SHIELD_COUNT) {
      setPhase('shielded');
      setTimeout(() => {
        setMeteorPhase('falling');
        setPhase('meteors');
        setTimeout(() => {
          setMeteorPhase('settled');
          setPhase('done');
          if (!savedRef.current) {
            savedRef.current = true;
            setTimeout(() => {
              setStatus('success');
              import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 },
                  colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0', '#EF233C'] });
              });
              completeLesson(15, 'sticker-clone_commander').catch(console.error);
            }, 500);
          }
        }, 2000);
      }, 500);
      return;
    }
    const t = setTimeout(() => setShieldsUp(s => s + 1), 120);
    return () => clearTimeout(t);
  }, [phase, shieldsUp]);

  const cloneLabel = t('block_clone');

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

        {/* Story card */}
        <div className="card-kids border-kids-purple w-full text-center">
          <div className="text-7xl mb-3">🛡️</div>
          <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
          <p className="text-lg font-bold text-gray-600 mb-3">{t('mission')}</p>
          <p className="text-base font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2">
            🎯 {t('goal')}
          </p>
        </div>

        {/* Arena */}
        <div
          className="w-full rounded-2xl border-4 border-kids-blue bg-gray-900 overflow-hidden relative"
          style={{ height: 240 }}
        >
          {/* Starfield */}
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          {/* Meteors */}
          {METEOR_COLS.map((left, i) => (
            <motion.div
              key={i}
              className="absolute text-xl select-none"
              style={{ left, top: 6 }}
              animate={
                meteorPhase === 'falling'
                  ? { y: [0, 128, 110], rotate: [0, 25, 0], opacity: 1 }
                  : meteorPhase === 'settled'
                  ? { y: 110, opacity: 0.3, rotate: 20 }
                  : { y: 0, opacity: 1, rotate: 0 }
              }
              transition={{
                duration: 0.85,
                delay: i * 0.09,
                type: 'spring',
                stiffness: 160,
                damping: 10,
              }}
            >
              ☄️
            </motion.div>
          ))}

          {/* Shield wall row */}
          <div className="absolute left-0 right-0 flex justify-around items-end px-1"
            style={{ bottom: 52 }}
          >
            {Array.from({ length: SHIELD_COUNT }, (_, i) =>
              i < shieldsUp ? (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="text-2xl leading-none select-none"
                >
                  🛡️
                </motion.div>
              ) : (
                <div key={i} className="w-7 h-7" /> // placeholder to keep spacing
              )
            )}
          </div>

          {/* Moon ground */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-600 h-12 flex items-center gap-3 px-4">
            <span className="text-2xl select-none">🤖</span>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-5 h-2 bg-gray-500 rounded-full" />
            ))}
          </div>

          {/* Status chip */}
          <AnimatePresence>
            {phase === 'generating' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-purple/90 rounded-lg px-3 py-1 whitespace-nowrap"
              >
                <span className="font-black text-white text-xs">
                  ⚙️ {t('loading_label')} {shieldsUp}/{SHIELD_COUNT}
                </span>
              </motion.div>
            )}
            {(phase === 'shielded' || phase === 'meteors' || phase === 'done') && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-green/90 rounded-lg px-3 py-1 whitespace-nowrap"
              >
                <span className="font-black text-white text-xs">✅ {t('shields_ready')}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Code editor */}
        <LoopBox
          filled={filled}
          cloneLabel={cloneLabel}
          loopLabel={t('loop_label')}
          placeholder={t('block_placeholder')}
        />

        {/* Block tray */}
        <div className="w-full bg-kids-purple/10 rounded-xl p-4 border-2 border-kids-purple/30">
          <p className="font-black text-kids-purple text-xs mb-3 uppercase tracking-wide">
            {t('tray_label')}
          </p>
          <div className="flex flex-wrap gap-3 min-h-[52px]">
            {!filled && <CloneChip label={cloneLabel} disabled={status === 'success'} />}
          </div>
        </div>

        {/* Run button */}
        <motion.button
          whileHover={filled && phase === 'idle' && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={filled && phase === 'idle' && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleRun}
          disabled={!filled || phase !== 'idle' || status === 'success'}
          className="btn-chunky bg-kids-purple text-white text-xl disabled:opacity-40 w-full max-w-xs"
        >
          {t('run_button')}
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
                🛡️ {t('success')}
              </div>
              <Link href={`/${locale}/lesson16`}>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 340, damping: 16 }}
                  className="btn-chunky bg-kids-purple text-white text-xl border-4 border-kids-purple shadow-xl"
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
              <div className="text-8xl">🛡️</div>
              <p className="font-black text-kids-purple text-2xl mt-2">Clone Commander! ⚡</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay>
        {dragging && (
          <div className="px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-xl
            bg-kids-green text-white border-kids-green">
            {cloneLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
