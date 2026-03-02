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

// Meteor columns spread evenly across the arena
const METEOR_COLS = Array.from({ length: METEOR_COUNT }, (_, i) =>
  `${5 + Math.round(i * (90 / (METEOR_COUNT - 1)))}%`
);

// Shield left-position when spread (wall mode)
function wallLeft(i: number): string {
  return `${3 + i * 9.4}%`;
}

// ---------------------------------------------------------------------------
// Draggable chip: "index × 40" (green) or "40" (orange)
// ---------------------------------------------------------------------------
type ChipId = 'index' | 'forty';

function DraggableChip({ id, label, colorClass, disabled }: {
  id: ChipId; label: string; colorClass: string; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing transition-opacity
        ${colorClass}
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${disabled ? 'opacity-40 cursor-default pointer-events-none' : ''}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loop display with droppable X-slot
// ---------------------------------------------------------------------------
type SlotValue = 'empty' | 'index' | 'forty';

function LoopBox({ slot, loopLabel, indexLabel, fortyLabel, placeholder }: {
  slot: SlotValue;
  loopLabel: string;
  indexLabel: string;
  fortyLabel: string;
  placeholder: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'x-slot' });

  const slotInner =
    slot === 'index' ? (
      <span className="font-mono font-black text-kids-green text-sm">{indexLabel}</span>
    ) : slot === 'forty' ? (
      <span className="font-mono font-black text-kids-orange text-sm">{fortyLabel}</span>
    ) : (
      <span className="font-mono text-kids-blue/40 text-sm italic">{placeholder}</span>
    );

  return (
    <div className="w-full space-y-1">
      <div className="bg-kids-purple rounded-xl px-4 py-2 inline-block">
        <span className="font-mono font-black text-white text-sm">{loopLabel} {'{'}</span>
      </div>
      <div className="ml-6 flex items-center flex-wrap gap-1">
        <span className="font-mono text-kids-green/80 text-sm">{"clone('shield', at X: "}</span>
        <div
          ref={setNodeRef}
          className={`inline-flex items-center min-w-[120px] px-3 py-1.5 rounded-lg border-2 transition-all
            ${isOver ? 'border-kids-green bg-kids-green/20 scale-[1.03]' : 'border-kids-blue/40 bg-white'}
            ${slot !== 'empty' ? 'border-solid' : 'border-dashed'}`}
        >
          {slotInner}
        </div>
        <span className="font-mono text-kids-green/80 text-sm">{')'}</span>
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

  const [slot, setSlot]               = useState<SlotValue>('empty');
  const [dragging, setDragging]       = useState<string | null>(null);
  const [phase, setPhase]             = useState<'idle' | 'generating' | 'shielded' | 'meteors' | 'done'>('idle');
  const [shieldsUp, setShieldsUp]     = useState(0);
  const [meteorPhase, setMeteorPhase] = useState<'frozen' | 'falling' | 'settled'>('frozen');
  const [outcome, setOutcome]         = useState<'none' | 'wall' | 'stacked'>('none');
  const [bleepHit, setBleepHit]       = useState(false);
  const [status, setStatus]           = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]       = useState(false);
  const savedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDragging(active.id as string);
  }

  function handleDragEnd({ over, active }: DragEndEvent) {
    setDragging(null);
    if (!over || phase !== 'idle' || status === 'success') return;
    if (over.id === 'x-slot') {
      setSlot(active.id as SlotValue);
    }
  }

  function handleRun() {
    if (slot === 'empty' || phase !== 'idle' || status === 'success') return;
    const newOutcome: 'wall' | 'stacked' = slot === 'index' ? 'wall' : 'stacked';
    setOutcome(newOutcome);
    setShieldsUp(0);
    setMeteorPhase('frozen');
    setBleepHit(false);
    setPhase('generating');
  }

  function handleTryAgain() {
    setPhase('idle');
    setShieldsUp(0);
    setMeteorPhase('frozen');
    setBleepHit(false);
    setOutcome('none');
    // Keep slot so user can see what to swap
  }

  // Shield generation → meteor sequence
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
          if (outcome === 'stacked') {
            setBleepHit(true);
          }
          if (outcome === 'wall' && !savedRef.current) {
            savedRef.current = true;
            setTimeout(() => {
              setStatus('success');
              import('canvas-confetti').then(({ default: confetti }) => {
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 },
                  colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0', '#EF233C'] });
              });
              completeLesson(15, 'sticker-clone_commander').catch(console.error);
            }, 600);
          }
        }, 2000);
      }, 600);
      return;
    }
    const timer = setTimeout(() => setShieldsUp(s => s + 1), 130);
    return () => clearTimeout(timer);
  }, [phase, shieldsUp, outcome]);

  // Meteor y-animation depends on outcome
  const meteorFallingY  = outcome === 'stacked' ? [0, 210, 200] : [0, 150, 135];
  const meteorSettledY  = outcome === 'stacked' ? 200 : 135;
  const meteorSettledOp = outcome === 'stacked' ? 0   : 0.3;

  const indexLabel = t('block_index');
  const fortyLabel = t('block_forty');

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

        {/* Index concept tip */}
        <div className="w-full bg-kids-green/10 border-2 border-kids-green rounded-xl px-4 py-2">
          <p className="font-bold text-kids-green text-sm">💡 {t('index_tip')}</p>
        </div>

        {/* Arena */}
        <div
          className="w-full rounded-2xl border-4 border-kids-blue bg-gray-900 overflow-hidden relative"
          style={{ height: 280 }}
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
                  ? { y: meteorFallingY, rotate: [0, 25, 0], opacity: 1 }
                  : meteorPhase === 'settled'
                  ? { y: meteorSettledY, opacity: meteorSettledOp, rotate: 20 }
                  : { y: 0, opacity: 1, rotate: 0 }
              }
              transition={{
                duration: outcome === 'stacked' ? 1.1 : 0.85,
                delay: i * 0.09,
                type: 'spring',
                stiffness: 160,
                damping: 10,
              }}
            >
              ☄️
            </motion.div>
          ))}

          {/* Shield wall — each shield absolutely positioned */}
          {Array.from({ length: SHIELD_COUNT }, (_, i) =>
            i < shieldsUp ? (
              <div
                key={i}
                className="absolute"
                style={{
                  left:      outcome === 'wall' ? wallLeft(i) : '12%',
                  bottom:    outcome === 'stacked' ? (60 - i * 2) : 60,
                  transform: 'translateX(-50%)',
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="text-2xl leading-none select-none"
                >
                  🛡️
                </motion.div>
              </div>
            ) : null
          )}

          {/* Ground strip */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-600 h-14 flex items-center gap-3 px-4">
            <motion.span
              className="text-2xl select-none"
              animate={
                bleepHit
                  ? { x: [-10, 10, -8, 8, -5, 5, 0], y: [0, -4, 0, -3, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              🤖
            </motion.span>
            {bleepHit ? (
              <>
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  className="text-2xl select-none"
                >
                  💥
                </motion.span>
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl select-none"
                >
                  💥
                </motion.span>
              </>
            ) : (
              [...Array(4)].map((_, k) => (
                <div key={k} className="w-5 h-2 bg-gray-500 rounded-full" />
              ))
            )}
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
                className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1 whitespace-nowrap
                  ${outcome === 'stacked' ? 'bg-kids-red/90' : 'bg-kids-green/90'}`}
              >
                <span className="font-black text-white text-xs">
                  {outcome === 'stacked'
                    ? `⚠️ ${t('shields_stacked')}`
                    : `✅ ${t('shields_ready')}`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stacking error message */}
        <AnimatePresence>
          {phase === 'done' && outcome === 'stacked' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full bg-kids-red/10 border-2 border-kids-red rounded-xl px-4 py-3"
            >
              <p className="font-black text-kids-red text-sm">⚠️ {t('stacked_hint')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loop editor */}
        <LoopBox
          slot={slot}
          loopLabel={t('loop_label')}
          indexLabel={indexLabel}
          fortyLabel={fortyLabel}
          placeholder={t('block_placeholder')}
        />

        {/* Block tray */}
        <div className="w-full bg-kids-purple/10 rounded-xl p-4 border-2 border-kids-purple/30">
          <p className="font-black text-kids-purple text-xs mb-3 uppercase tracking-wide">
            {t('tray_label')}
          </p>
          <div className="flex flex-wrap gap-3 min-h-[52px]">
            {slot !== 'index' && (
              <DraggableChip
                id="index"
                label={indexLabel}
                colorClass="bg-kids-green text-white border-kids-green"
                disabled={phase !== 'idle' || status === 'success'}
              />
            )}
            {slot !== 'forty' && (
              <DraggableChip
                id="forty"
                label={fortyLabel}
                colorClass="bg-kids-orange text-white border-kids-orange"
                disabled={phase !== 'idle' || status === 'success'}
              />
            )}
          </div>
        </div>

        {/* Run + Try Again buttons */}
        <div className="flex gap-3 w-full">
          <motion.button
            whileHover={slot !== 'empty' && phase === 'idle' && status !== 'success' ? { scale: 1.04 } : {}}
            whileTap={slot !== 'empty' && phase === 'idle' && status !== 'success' ? { scale: 0.96 } : {}}
            onClick={handleRun}
            disabled={slot === 'empty' || phase !== 'idle' || status === 'success'}
            className="btn-chunky bg-kids-purple text-white text-xl flex-1 disabled:opacity-40"
          >
            {t('run_button')}
          </motion.button>

          <AnimatePresence>
            {phase === 'done' && outcome === 'stacked' && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleTryAgain}
                className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-base"
              >
                {t('try_again')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Hint popup */}
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
        {dragging === 'index' && (
          <div className="px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-xl
            bg-kids-green text-white border-kids-green">
            {indexLabel}
          </div>
        )}
        {dragging === 'forty' && (
          <div className="px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-xl
            bg-kids-orange text-white border-kids-orange">
            {fortyLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
