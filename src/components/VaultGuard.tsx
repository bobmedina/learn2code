'use client';

import { useState, useRef } from 'react';
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
// Draggable condition chip
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
        ${colorClass} ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable condition slot
// ---------------------------------------------------------------------------
function DroppableSlot({ id, filled, chipLabel, chipColor, placeholder }: {
  id: string; filled: boolean; chipLabel: string; chipColor: string; placeholder: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`px-3 py-2 rounded-xl font-mono font-black text-sm min-w-[130px] text-center border-2 transition-all
        ${filled
          ? `${chipColor} border-transparent`
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
// Toggle switch
// ---------------------------------------------------------------------------
function ToggleSwitch({ on, onToggle, label, locked }: {
  on: boolean; onToggle: () => void; label: string; locked: boolean;
}) {
  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-black text-xs transition-all
        ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${on ? 'border-kids-green bg-kids-green/20 text-kids-green' : 'border-gray-600 bg-gray-800 text-gray-400'}`}
    >
      <span>{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-kids-green' : 'bg-gray-600'}`}>
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
          animate={{ left: on ? '50%' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        />
      </div>
      <span className={`text-xs font-mono ${on ? 'text-kids-green' : 'text-gray-500'}`}>
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function VaultGuard() {
  const t = useTranslations('lesson18');
  const { locale } = useParams() as { locale: string };

  const [keyPlaced,  setKeyPlaced]  = useState(false);
  const [fpPlaced,   setFpPlaced]   = useState(false);
  const [keyOn,      setKeyOn]      = useState(false);
  const [fpOn,       setFpOn]       = useState(false);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [result,     setResult]     = useState<null | 'open' | 'denied'>(null);
  const [status,     setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint,   setShowHint]   = useState(false);
  const savedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  function handleRun() {
    // Both condition blocks must be placed AND both scanners toggled ON
    if (!keyPlaced || !fpPlaced || status === 'success') return;
    if (keyOn && fpOn) {
      setResult('open');
      if (!savedRef.current) {
        savedRef.current = true;
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 200, spread: 90, origin: { y: 0.5 },
            colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0', '#EF233C'],
          });
        });
        completeLesson(18, 'sticker-logic_path').catch(console.error);
        setTimeout(() => setStatus('success'), 600);
      }
    } else {
      setResult('denied');
      // Reset denied after 1.8s so they can try again
      setTimeout(() => setResult(null), 1800);
    }
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDrag(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) return;
    if (active.id === 'key-chip'   && over.id === 'slot1') setKeyPlaced(true);
    if (active.id === 'fp-chip'    && over.id === 'slot2') setFpPlaced(true);
  }

  const bothPlaced = keyPlaced && fpPlaced;
  const vaultOpen  = result === 'open';
  const denied     = result === 'denied';

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-blue w-full">
        <div className="text-6xl mb-3 text-center">🔐</div>
        <h1 className="text-2xl font-black text-kids-purple text-center mb-2">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-sm mb-3 text-center">{t('story')}</p>
        <p className="text-sm font-black text-kids-blue bg-kids-blue/10 rounded-xl px-4 py-2 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* Code editor */}
        <div className="w-full bg-gray-900 rounded-2xl p-5 font-mono text-sm shadow-xl space-y-2">
          {/* if ( slot1 AND slot2 ) então/then { */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-kids-yellow font-black">{t('if_label')}</span>
            <DroppableSlot
              id="slot1"
              filled={keyPlaced}
              chipLabel={t('block_key')}
              chipColor="bg-kids-yellow text-white"
              placeholder={t('slot1_placeholder')}
            />
            <span className="text-kids-red font-black">{t('and_label')}</span>
            <DroppableSlot
              id="slot2"
              filled={fpPlaced}
              chipLabel={t('block_fp')}
              chipColor="bg-kids-blue text-white"
              placeholder={t('slot2_placeholder')}
            />
            <span className="text-white">)</span>
            <span className="text-kids-yellow font-black">{t('then_label')}</span>
            <span className="text-white">{'{'}</span>
          </div>
          <div className="ml-4 text-kids-green font-black">{t('action_label')}</div>
          <div className="text-white font-black">{t('close_label')}</div>
        </div>

        {/* Block tray */}
        <div className="flex gap-3 flex-wrap justify-center min-h-[52px] items-center">
          {!keyPlaced && (
            <DraggableChip
              id="key-chip"
              label={t('block_key')}
              colorClass="bg-kids-yellow text-white border-kids-yellow/60"
            />
          )}
          {!fpPlaced && (
            <DraggableChip
              id="fp-chip"
              label={t('block_fp')}
              colorClass="bg-kids-blue text-white border-kids-blue/60"
            />
          )}
          {bothPlaced && status !== 'success' && (
            <p className="text-sm font-bold text-kids-blue animate-bounce">
              ✅ Both placed — now turn the scanners ON!
            </p>
          )}
        </div>

        <DragOverlay>
          {activeDrag === 'key-chip' && (
            <div className="px-4 py-3 rounded-xl bg-kids-yellow text-white font-mono font-black text-sm shadow-xl border-4 border-kids-yellow/60">
              {t('block_key')}
            </div>
          )}
          {activeDrag === 'fp-chip' && (
            <div className="px-4 py-3 rounded-xl bg-kids-blue text-white font-mono font-black text-sm shadow-xl border-4 border-kids-blue/60">
              {t('block_fp')}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Vault arena */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-kids-blue"
        style={{ height: 220, background: 'linear-gradient(to bottom, #0f0c29, #1a1a3e, #24243e)' }}
      >
        {/* Stars */}
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: 2, height: 2, left: `${(i * 23 + 9) % 91}%`, top: `${(i * 13 + 7) % 55}%`, opacity: 0.35 }}
          />
        ))}

        {/* Scanner panels */}
        <div className="absolute left-[8%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <motion.div
            animate={{ color: keyOn ? '#06D6A0' : '#6b7280' }}
            className="text-3xl"
          >
            🔑
          </motion.div>
          <motion.div
            animate={{
              boxShadow: keyOn ? '0 0 12px 4px rgba(6,214,160,0.6)' : 'none',
              backgroundColor: keyOn ? 'rgba(6,214,160,0.2)' : 'rgba(107,114,128,0.1)',
            }}
            className="w-8 h-8 rounded-full border-2 border-current"
            style={{ borderColor: keyOn ? '#06D6A0' : '#6b7280' }}
          />
        </div>

        <div className="absolute right-[8%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <motion.div
            animate={{ color: fpOn ? '#06D6A0' : '#6b7280' }}
            className="text-3xl"
          >
            👆
          </motion.div>
          <motion.div
            animate={{
              boxShadow: fpOn ? '0 0 12px 4px rgba(6,214,160,0.6)' : 'none',
              backgroundColor: fpOn ? 'rgba(6,214,160,0.2)' : 'rgba(107,114,128,0.1)',
            }}
            className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: fpOn ? '#06D6A0' : '#6b7280' }}
          />
        </div>

        {/* Vault door */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={
              vaultOpen
                ? { rotateY: -70, opacity: 0.5, x: -30 }
                : denied
                  ? { x: [0, -6, 6, -4, 4, 0] }
                  : { rotateY: 0, opacity: 1, x: 0 }
            }
            transition={
              vaultOpen
                ? { duration: 0.7, ease: 'easeOut' }
                : denied
                  ? { duration: 0.4 }
                  : { duration: 0.3 }
            }
            style={{ perspective: 800 }}
          >
            <div className="text-7xl select-none">🔒</div>
          </motion.div>
          {vaultOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 360, damping: 16 }}
              className="absolute text-7xl"
            >
              🔓
            </motion.div>
          )}
        </div>

        {/* ACCESS DENIED flash */}
        <AnimatePresence>
          {denied && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.45, 0, 0.35, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-kids-red pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Status chip */}
        <AnimatePresence>
          {denied && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-red/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              {t('denied')}
            </motion.div>
          )}
          {vaultOpen && !status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-kids-green/90 text-white font-black text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              ✅ Vault Open!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle switches */}
      <div className="w-full flex gap-3 justify-center flex-wrap">
        <ToggleSwitch
          on={keyOn}
          onToggle={() => setKeyOn(v => !v)}
          label={t('key_label')}
          locked={status === 'success'}
        />
        <ToggleSwitch
          on={fpOn}
          onToggle={() => setFpOn(v => !v)}
          label={t('fp_label')}
          locked={status === 'success'}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          onClick={handleRun}
          disabled={!bothPlaced || status === 'success'}
          whileTap={{ scale: bothPlaced ? 0.95 : 1 }}
          className="btn-chunky bg-kids-blue text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('run_button')}
        </motion.button>
        <button
          onClick={() => setShowHint(h => !h)}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-base"
        >
          💡 {t('hint_button')}
        </button>
      </div>

      {/* Feedback for empty slots */}
      <AnimatePresence>
        {!bothPlaced && result === null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm font-bold text-gray-500 text-center"
          >
            {t('feedback_empty')}
          </motion.p>
        )}
      </AnimatePresence>

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
            className="w-full card-kids border-kids-blue text-center"
          >
            <p className="font-black text-kids-blue text-xl mb-3">🎉 {t('success')}</p>
            <Link href={`/${locale}/lesson19`}>
              <button className="btn-chunky bg-kids-blue text-white text-lg">
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
            <div className="text-8xl">🔐</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Vault Guardian! 🛡️</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
