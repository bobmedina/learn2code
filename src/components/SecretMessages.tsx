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
// Word chip — draggable
// ---------------------------------------------------------------------------
function WordChip({ word, color, disabled }: { word: string; color: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: word, disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-4 py-3 rounded-xl font-black text-base border-4 shadow-chunky
        select-none cursor-grab active:cursor-grabbing transition-opacity
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${disabled ? 'opacity-40 cursor-default' : ''}
        ${color}`}
    >
      &ldquo;{word}&rdquo;
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop slot inside join()
// ---------------------------------------------------------------------------
function Slot({ id, content, color, onClear, disabled }: {
  id: string; content: string | null; color: string; onClear: () => void; disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[100px] min-h-[52px] rounded-xl border-4 flex items-center
        justify-center transition-all
        ${isOver ? 'border-kids-green bg-kids-green/20 scale-105' : 'border-kids-blue/40 bg-white'}
        ${content ? 'border-solid' : 'border-dashed'}`}
    >
      <AnimatePresence mode="wait">
        {content ? (
          <motion.button
            key={content}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            onClick={() => { if (!disabled) onClear(); }}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg font-black text-sm border-4 shadow-chunky
              cursor-pointer disabled:cursor-default ${color}`}
          >
            &ldquo;{content}&rdquo;
            {!disabled && <span className="ml-1 text-xs opacity-60">×</span>}
          </motion.button>
        ) : (
          <motion.p
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-kids-blue/30 font-bold text-xs"
          >
            drop here
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SecretMessages() {
  const t = useTranslations('lesson11');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [slots, setSlots]       = useState<[string | null, string | null]>([null, null]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [result, setResult]     = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus]     = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);
  // Keep a ref to the utterance so Chrome doesn't GC it mid-speech
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const helloWord  = t('word_hello');      // "Hello" / "Olá"
  const bleepWord  = t('word_bleep');      // "Bleep"
  const distractor = t('word_distractor'); // "World" / "Mundo"

  const COLORS: Record<string, string> = {
    [helloWord]:  'bg-kids-blue   text-white border-kids-blue',
    [bleepWord]:  'bg-kids-orange text-white border-kids-orange',
    [distractor]: 'bg-gray-200    text-gray-600 border-gray-300',
  };

  const usedWords = slots.filter(Boolean) as string[];
  const trayWords = [helloWord, bleepWord, distractor].filter(w => !usedWords.includes(w));

  function handleDragStart({ active }: DragStartEvent) {
    setDragging(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over) return;
    const word = active.id as string;
    const idx  = over.id === 'slot-0' ? 0 : over.id === 'slot-1' ? 1 : -1;
    if (idx === -1 || slots[idx] !== null) return;
    setSlots(prev => {
      const next: [string | null, string | null] = [...prev] as [string | null, string | null];
      next[idx] = word;
      return next;
    });
    setFeedback(null);
  }

  function clearSlot(idx: 0 | 1) {
    setSlots(prev => {
      const next: [string | null, string | null] = [...prev] as [string | null, string | null];
      next[idx] = null;
      return next;
    });
    setResult(null);
    setFeedback(null);
  }

  function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    // Store in ref to prevent Chrome garbage-collecting the utterance mid-speech
    uttRef.current = new SpeechSynthesisUtterance(text);
    uttRef.current.lang = locale === 'pt' ? 'pt-PT' : 'en-US';
    uttRef.current.rate = 0.9;
    synth.cancel();
    synth.speak(uttRef.current);
  }

  function handleRun() {
    if (status === 'success' || !slots[0] || !slots[1]) return;
    const output = `${slots[0]} ${slots[1]}`;
    setResult(output);
    speak(output);

    const hasHello = slots.includes(helloWord);
    const hasBleep = slots.includes(bleepWord);

    if (hasHello && hasBleep) {
      setTimeout(() => {
        setStatus('success');
        if (!savedRef.current) {
          savedRef.current = true;
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 },
              colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
          });
          completeLesson(11, 'sticker-secret_coder').catch(console.error);
        }
      }, 800);
    } else {
      setTimeout(() => {
        setFeedback(t('feedback_wrong'));
        setSlots([null, null]);
        setResult(null);
      }, 1200);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

        {/* Story card */}
        <div className="card-kids border-kids-blue w-full text-center">
          <div className="text-7xl mb-3">📻</div>
          <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
          <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
          <p className="text-base font-black text-kids-blue bg-kids-blue/10 rounded-xl px-4 py-2">
            🎯 {t('goal')}
          </p>
        </div>

        {/* Bleep's radio screen */}
        <div className="w-full rounded-2xl border-4 border-kids-blue bg-gray-900 p-5">
          <p className="font-black text-kids-blue text-xs uppercase tracking-wide mb-3 text-center">
            📻 Bleep&apos;s Radio Screen
          </p>
          <div className="bg-black rounded-xl border-2 border-kids-green/40 p-4 min-h-[64px]
            flex items-center justify-center">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.p
                  key={result}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 18 }}
                  className="font-mono font-black text-kids-green text-2xl tracking-widest"
                >
                  &ldquo;{result}&rdquo;
                </motion.p>
              ) : (
                <p className="font-mono text-kids-green/25 text-lg">_ _ _ _ _ _ _ _ _ _</p>
              )}
            </AnimatePresence>
          </div>
          {result && (
            <div className="mt-3 flex justify-center">
              <button onClick={() => speak(result!)} className="btn-chunky bg-kids-green text-white text-sm">
                {t('speak_button')}
              </button>
            </div>
          )}
        </div>

        {/* join() function box */}
        <div className="w-full space-y-2">
          <div className="bg-kids-blue rounded-xl px-4 py-2 inline-block">
            <span className="font-mono font-black text-white text-base">{t('join_label')}</span>
          </div>
          <div className="rounded-2xl border-4 border-kids-blue bg-kids-blue/5 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Slot
                id="slot-0"
                content={slots[0]}
                color={slots[0] ? (COLORS[slots[0]] ?? '') : ''}
                onClear={() => clearSlot(0)}
                disabled={status === 'success'}
              />
              <span className="font-black text-kids-blue text-2xl">+</span>
              <Slot
                id="slot-1"
                content={slots[1]}
                color={slots[1] ? (COLORS[slots[1]] ?? '') : ''}
                onClear={() => clearSlot(1)}
                disabled={status === 'success'}
              />
              <span className="font-black text-kids-blue text-xl">)</span>
            </div>
          </div>
        </div>

        {/* Word tray */}
        <div className="w-full bg-kids-blue/10 rounded-xl p-4 border-2 border-kids-blue/30">
          <p className="font-black text-kids-blue text-xs mb-3 uppercase tracking-wide">
            {t('tray_label')} 👇
          </p>
          <div className="flex flex-wrap gap-3 min-h-[52px]">
            {trayWords.map(word => (
              <WordChip
                key={word}
                word={word}
                color={COLORS[word] ?? ''}
                disabled={status === 'success'}
              />
            ))}
          </div>
        </div>

        {/* Run button */}
        <motion.button
          whileHover={slots[0] && slots[1] && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={slots[0] && slots[1] && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleRun}
          disabled={!slots[0] || !slots[1] || status === 'success'}
          className="btn-chunky bg-kids-blue text-white text-xl disabled:opacity-40 w-full max-w-xs"
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

        {/* Feedback + success */}
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
              🤔 {feedback}
            </motion.div>
          )}
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
                📻 {t('success')}
              </div>
              <Link href={`/${locale}/lesson12`}>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 340, damping: 16 }}
                  className="btn-chunky bg-kids-blue text-white text-xl border-4 border-kids-blue shadow-xl"
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
              <div className="text-8xl">📻</div>
              <p className="font-black text-kids-purple text-2xl mt-2">String Master! ✨</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay>
        {dragging && (
          <div className={`px-4 py-3 rounded-xl font-black text-base border-4 shadow-xl
            ${COLORS[dragging] ?? 'bg-gray-200 text-gray-600 border-gray-300'}`}>
            &ldquo;{dragging}&rdquo;
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
