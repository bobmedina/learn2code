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

// ---------------------------------------------------------------------------
// Draggable chip (colour passed in)
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
        ${wide ? 'px-3 py-1.5 min-w-[100px]' : 'px-2 py-1.5 min-w-[52px]'}
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
export function InfiniteCharge() {
  const t = useTranslations('lesson17');
  const { locale } = useParams() as { locale: string };

  // Condition slots
  const [varFilled,    setVarFilled]    = useState(false);
  const [opFilled,     setOpFilled]     = useState(false);
  const [targetFilled, setTargetFilled] = useState(false);
  // Body slot
  const [chargeFilled, setChargeFilled] = useState(false);

  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [phase, setPhase]           = useState<'idle' | 'tryOnce' | 'charging' | 'done'>('idle');
  const [battery, setBattery]       = useState(0);
  const [tired, setTired]           = useState(false);
  const [status, setStatus]         = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]     = useState(false);
  const savedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const allFilled = varFilled && opFilled && targetFilled && chargeFilled;
  const canRun    = allFilled && phase === 'idle' && status !== 'success';

  // "Try once" — charge() runs alone, battery 0→1, Bleep gets tired
  function handleTryOnce() {
    if (phase !== 'idle') return;
    setBattery(0);
    setTired(false);
    setPhase('tryOnce');
    timerRef.current = setTimeout(() => {
      setBattery(1);
      setTired(true);
      setPhase('idle');
    }, 500);
  }

  // "Run Loop" — battery fills 0→100
  function handleRun() {
    if (!canRun) return;
    setBattery(0);
    setTired(false);
    setPhase('charging');
  }

  // Charging animation: 100 steps × 20ms = 2s
  useEffect(() => {
    if (phase !== 'charging') return;
    let current = 0;
    timerRef.current = setInterval(() => {
      current += 1;
      setBattery(current);
      if (current >= 100) {
        clearInterval(timerRef.current!);
        setPhase('done');
        if (!savedRef.current) {
          savedRef.current = true;
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({
              particleCount: 180, spread: 80, origin: { y: 0.5 },
              colors: ['#06D6A0', '#4CC9F0', '#F9C74F', '#7209B7'],
            });
          });
          completeLesson(17, 'sticker-ai_trainer').catch(console.error);
        }
        setTimeout(() => setStatus('success'), 400);
      }
    }, 20);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDrag(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) return;
    const a = active.id as string;
    const o = over.id   as string;
    if (a === 'battery-chip' && o === 'cond-var')    setVarFilled(true);
    if (a === 'op-chip'      && o === 'cond-op')     setOpFilled(true);
    if (a === 'target-chip'  && o === 'cond-target') setTargetFilled(true);
    if (a === 'charge-chip'  && o === 'charge-slot') setChargeFilled(true);
  }

  const barColor = battery < 30 ? '#EF233C' : battery < 70 ? '#F9C74F' : '#06D6A0';

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-green w-full">
        <div className="text-6xl mb-3 text-center">🔋</div>
        <h1 className="text-2xl font-black text-kids-purple text-center mb-2">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-sm mb-3 text-center">{t('story')}</p>
        <p className="text-sm font-black text-kids-green bg-kids-green/10 rounded-xl px-4 py-2 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* ── Code editor ── */}
        <div className="w-full bg-gray-900 rounded-2xl p-5 font-mono text-sm shadow-xl space-y-3">

          {/* Section label */}
          <div className="text-kids-yellow font-black text-xs uppercase tracking-widest">
            ⚡ {t('loop_label')}
          </div>

          {/* One-shot demo row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-xs">{t('oneshot_label')}</span>
            <span className="text-kids-green font-black">{t('block_charge')}</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleTryOnce}
              disabled={phase !== 'idle'}
              className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 text-xs font-black
                hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('try_once_button')}
            </motion.button>
          </div>

          <div className="border-t border-gray-700" />

          {/* While loop with condition slots */}
          <div className="space-y-2">
            {/* Header line: while ( [var] [op] [target] ) { */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-kids-yellow font-black">{t('kw_while')}</span>
              <span className="text-white">(</span>
              <Slot
                id="cond-var"
                filled={varFilled}
                filledLabel={t('block_battery')}
                filledColor="bg-kids-orange text-white"
                placeholder={t('cond_var_ph')}
                wide
              />
              <Slot
                id="cond-op"
                filled={opFilled}
                filledLabel={t('block_operator')}
                filledColor="bg-kids-red text-white"
                placeholder={t('cond_op_ph')}
              />
              <Slot
                id="cond-target"
                filled={targetFilled}
                filledLabel={t('block_target')}
                filledColor="bg-kids-blue text-white"
                placeholder={t('cond_target_ph')}
              />
              <span className="text-white">) {'{'}</span>
            </div>

            {/* Body: charge() slot */}
            <div className="ml-5 flex items-center gap-2">
              <span className="text-gray-500 text-xs select-none">›</span>
              <Slot
                id="charge-slot"
                filled={chargeFilled}
                filledLabel={t('block_charge')}
                filledColor="bg-kids-green text-white"
                placeholder={t('slot_placeholder')}
                wide
              />
            </div>

            <div className="text-white font-black">{'}'}</div>
          </div>
        </div>

        {/* ── Block tray ── */}
        <div className="flex gap-3 flex-wrap justify-center min-h-[52px] items-center">
          {!varFilled && (
            <DraggableChip
              id="battery-chip"
              label={t('block_battery')}
              colorClass="bg-kids-orange text-white border-kids-orange/60"
            />
          )}
          {!opFilled && (
            <DraggableChip
              id="op-chip"
              label={t('block_operator')}
              colorClass="bg-kids-red text-white border-kids-red/60"
            />
          )}
          {!targetFilled && (
            <DraggableChip
              id="target-chip"
              label={t('block_target')}
              colorClass="bg-kids-blue text-white border-kids-blue/60"
            />
          )}
          {!chargeFilled && (
            <DraggableChip
              id="charge-chip"
              label={t('block_charge')}
              colorClass="bg-kids-green text-white border-kids-green/60"
            />
          )}
          {allFilled && phase === 'idle' && status !== 'success' && (
            <p className="text-sm font-bold text-kids-green animate-bounce">
              {t('ready_label')}
            </p>
          )}
        </div>

        {/* ── Mission hint ── */}
        <div className="w-full bg-kids-green/10 border-2 border-kids-green/30 rounded-xl px-4 py-2 text-xs font-bold text-kids-green text-center">
          {t('mission_hint')}
        </div>

        <DragOverlay>
          {activeDrag === 'battery-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-orange text-white font-mono font-black text-sm shadow-xl border-4 border-kids-orange/60">
              {t('block_battery')}
            </div>
          )}
          {activeDrag === 'op-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-red text-white font-mono font-black text-sm shadow-xl border-4 border-kids-red/60">
              {t('block_operator')}
            </div>
          )}
          {activeDrag === 'target-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-blue text-white font-mono font-black text-sm shadow-xl border-4 border-kids-blue/60">
              {t('block_target')}
            </div>
          )}
          {activeDrag === 'charge-chip' && (
            <div className="px-3 py-2 rounded-xl bg-kids-green text-white font-mono font-black text-sm shadow-xl border-4 border-kids-green/60">
              {t('block_charge')}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Battery arena ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-kids-green"
        style={{ height: 240, background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' }}
      >
        {/* Stars */}
        {Array.from({ length: 18 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: 2, height: 2, left: `${(i * 19 + 7) % 93}%`, top: `${(i * 11 + 5) % 60}%`, opacity: 0.4 }}
          />
        ))}

        {/* Bleep */}
        <motion.div
          className="absolute left-[12%] text-4xl select-none"
          style={{ bottom: 24 }}
          animate={{ rotate: tired && phase === 'idle' ? [0, -8, 8, 0] : 0 }}
          transition={{ duration: 0.4 }}
        >
          {tired && phase === 'idle' ? '😴' : '🤖'}
        </motion.div>

        {/* Battery shell */}
        <div
          className="absolute right-[15%] rounded-xl border-4 border-white/30 overflow-hidden"
          style={{ width: 54, height: 160, bottom: 24 }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3 bg-white/30 rounded-t-md" />

          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-b-lg"
            style={{ backgroundColor: barColor }}
            animate={{ height: `${battery}%` }}
            transition={{ duration: 0.04, ease: 'linear' }}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-white text-sm drop-shadow">{battery}%</span>
          </div>

          <AnimatePresence>
            {phase === 'charging' && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.25, 0] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{ backgroundColor: '#06D6A0' }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="font-mono text-xs text-white/50">{t('battery_label')} = {battery}</span>
        </div>

        {/* Feedback chips */}
        <AnimatePresence>
          {tired && phase === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-red/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              {t('tired_feedback')}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === 'charging' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-green/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              ⚡ {t('loading_label')}… {battery}%
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
          className="btn-chunky bg-kids-green text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'charging' ? `⚡ ${t('loading_label')}…` : t('run_button')}
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
            className="w-full card-kids border-kids-green text-center"
          >
            <p className="font-black text-kids-green text-xl mb-3">🎉 {t('success')}</p>
            <Link href={`/${locale}/lesson18`}>
              <button className="btn-chunky bg-kids-green text-white text-lg">
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
            <div className="text-8xl">🔋</div>
            <p className="font-black text-kids-purple text-2xl mt-2">While Loop Wizard! ⚡</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
