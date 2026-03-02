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
// Draggable fetch block
// ---------------------------------------------------------------------------
function FetchChip({ label, disabled }: { label: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'fetchData', disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing transition-opacity
        bg-kids-purple text-white border-kids-purple
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${disabled ? 'opacity-40 cursor-default' : ''}`}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Script drop slot
// ---------------------------------------------------------------------------
function ScriptSlot({ filled, label, placeholder }: { filled: boolean; label: string; placeholder: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'script-slot' });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[56px] rounded-xl border-4 flex items-center px-4 transition-all
        ${isOver ? 'border-kids-purple bg-kids-purple/20 scale-[1.02]' : 'border-kids-blue/40 bg-white'}
        ${filled ? 'border-solid' : 'border-dashed'}`}
    >
      {filled
        ? <span className="font-mono font-black text-kids-purple text-sm">{label}</span>
        : <span className="font-mono text-kids-blue/30 text-sm">{placeholder}</span>
      }
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function FetchQuest() {
  const t = useTranslations('lesson12');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [fetched, setFetched]   = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [phase, setPhase]       = useState<'idle' | 'loading' | 'result'>('idle');
  const [weather, setWeather]   = useState<'sunny' | 'rainy' | null>(null);
  const [status, setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDragging(active.id as string);
  }

  function handleDragEnd({ over }: DragEndEvent) {
    setDragging(null);
    if (!over || fetched) return;
    if (over.id === 'script-slot') setFetched(true);
  }

  function handleRun() {
    if (!fetched || phase !== 'idle' || status === 'success') return;
    setPhase('loading');
    setTimeout(() => {
      const result: 'sunny' | 'rainy' = Math.random() > 0.5 ? 'sunny' : 'rainy';
      setWeather(result);
      setPhase('result');
      if (!savedRef.current) {
        savedRef.current = true;
        setTimeout(() => {
          setStatus('success');
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 },
              colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
          });
          completeLesson(12, 'sticker-data_librarian').catch(console.error);
        }, 800);
      }
    }, 1800);
  }

  const blockLabel = t('block_fetch');

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

        {/* Story card */}
        <div className="card-kids border-kids-purple w-full text-center">
          <div className="text-7xl mb-3">📡</div>
          <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
          <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
          <p className="text-base font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2">
            🎯 {t('goal')}
          </p>
        </div>

        {/* API visualisation */}
        <div className="w-full rounded-2xl border-4 border-kids-purple bg-gray-900 p-5">
          <p className="font-black text-kids-purple text-xs uppercase tracking-wide mb-4 text-center">
            🌐 Internet API
          </p>
          <div className="flex items-center justify-around gap-4">
            {/* Cloud */}
            <motion.div
              animate={phase === 'loading' ? { scale: [1, 1.12, 1], opacity: [1, 0.65, 1] } : {}}
              transition={{ repeat: phase === 'loading' ? Infinity : 0, duration: 0.9 }}
              className="text-5xl select-none"
            >
              ☁️
            </motion.div>

            {/* Data flow */}
            <div className="flex gap-1 w-10 justify-center">
              <AnimatePresence>
                {phase === 'loading' && (
                  <>
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.2 }}
                        className="text-kids-purple font-black text-xl"
                      >
                        ·
                      </motion.span>
                    ))}
                  </>
                )}
                {phase === 'result' && (
                  <motion.span
                    key="arrow"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-kids-green font-black text-base"
                  >
                    ✅
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Bleep's screen */}
            <div className="bg-black rounded-xl border-2 border-kids-green/40 px-4 py-3 min-w-[110px] text-center">
              <AnimatePresence mode="wait">
                {phase === 'idle' && (
                  <motion.p key="idle" className="font-mono text-kids-green/25 text-sm">
                    _ _ _
                  </motion.p>
                )}
                {phase === 'loading' && (
                  <motion.p
                    key="loading"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="font-mono text-kids-yellow text-xs font-black"
                  >
                    {t('loading_label')}
                  </motion.p>
                )}
                {phase === 'result' && weather && (
                  <motion.p
                    key="result"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 18 }}
                    className="font-mono font-black text-kids-green text-sm"
                  >
                    {weather === 'sunny' ? t('result_sunny') : t('result_rainy')}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Script box */}
        <div className="w-full space-y-2">
          <div className="bg-kids-blue rounded-xl px-4 py-2 inline-block">
            <span className="font-mono font-black text-white text-base">{t('script_label')} {'{'}</span>
          </div>
          <div className="rounded-2xl border-4 border-kids-blue bg-kids-blue/5 p-5">
            <ScriptSlot
              filled={fetched}
              label={blockLabel}
              placeholder={t('block_placeholder')}
            />
          </div>
          <div className="bg-kids-blue rounded-xl px-4 py-2 inline-block">
            <span className="font-mono font-black text-white text-base">{'}'}</span>
          </div>
        </div>

        {/* Code block tray */}
        <div className="w-full bg-kids-purple/10 rounded-xl p-4 border-2 border-kids-purple/30">
          <p className="font-black text-kids-purple text-xs mb-3 uppercase tracking-wide">
            {t('tray_label')}
          </p>
          <div className="flex flex-wrap gap-3 min-h-[52px]">
            {!fetched && (
              <FetchChip label={blockLabel} disabled={status === 'success'} />
            )}
          </div>
        </div>

        {/* Run button */}
        <motion.button
          whileHover={fetched && phase === 'idle' && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={fetched && phase === 'idle' && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleRun}
          disabled={!fetched || phase !== 'idle' || status === 'success'}
          className="btn-chunky bg-kids-purple text-white text-xl disabled:opacity-40 w-full max-w-xs"
        >
          {phase === 'loading' ? '⏳ ' + t('loading_label') : t('run_button')}
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
                📡 {t('success')}
              </div>
              <Link href={`/${locale}/lesson13`}>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
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
              <div className="text-8xl">📡</div>
              <p className="font-black text-kids-purple text-2xl mt-2">Data Librarian! 📚</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay>
        {dragging && (
          <div className="px-4 py-3 rounded-xl font-mono font-black text-sm border-4 shadow-xl
            bg-kids-purple text-white border-kids-purple">
            {blockLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
