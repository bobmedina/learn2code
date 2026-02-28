'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { completeLesson } from '@/lib/actions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// The canonical correct order (1-indexed step keys)
const CORRECT_ORDER = ['step1', 'step2', 'step3', 'step4'] as const;
type StepKey = (typeof CORRECT_ORDER)[number];

// Emoji icons for each step
const STEP_ICONS: Record<StepKey, string> = {
  step1: '🍞',
  step2: '⏳',
  step3: '🧈',
  step4: '😋',
};

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Sortable step card
// ---------------------------------------------------------------------------
function SortableStep({ id, label, index }: { id: string; label: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  const icon = STEP_ICONS[id as StepKey];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-4 w-full card-kids border-kids-blue
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'scale-105 shadow-2xl rotate-1' : 'hover:scale-102'}
        transition-all duration-150
      `}
    >
      {/* Position badge */}
      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-kids-purple text-white font-black
                       flex items-center justify-center text-lg">
        {index + 1}
      </span>
      {/* Icon */}
      <span className="text-4xl">{icon}</span>
      {/* Label */}
      <span className="text-step text-gray-800 flex-1">{label}</span>
      {/* Drag handle hint */}
      <span className="text-gray-300 text-2xl select-none">⠿</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main lesson component
// ---------------------------------------------------------------------------
export function LessonOne() {
  const t = useTranslations('lesson1');

  const [items, setItems] = useState<StepKey[]>(() => shuffle([...CORRECT_ORDER]));
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // Prevent duplicate DB writes + confetti if the user replays without resetting
  const savedRef = useRef(false);

  useEffect(() => {
    if (status === 'success' && !savedRef.current) {
      savedRef.current = true;
      // Fire confetti immediately — don't await the server action
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 },
          colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
      });
      // Persist progress to Supabase in the background
      completeLesson(1, 'sticker-algorithm').catch(console.error);
    }
  }, [status]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as StepKey);
        const newIndex = prev.indexOf(over.id as StepKey);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
    setStatus('idle');
  }

  const checkOrder = useCallback(() => {
    const isCorrect = items.every((item, i) => item === CORRECT_ORDER[i]);
    setStatus(isCorrect ? 'success' : 'error');
  }, [items]);

  const reset = useCallback(() => {
    setItems(shuffle([...CORRECT_ORDER]));
    setStatus('idle');
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto px-4 py-8">
      {/* Story card */}
      <div className="card-kids border-kids-yellow w-full text-center">
        <div className="text-7xl mb-3">{status === 'success' ? '🤖✨' : '🤖'}</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600">{t('story')}</p>
      </div>

      {/* Feedback banner */}
      <AnimatePresence mode="wait">
        {status !== 'idle' && (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`w-full rounded-xl px-6 py-4 text-center font-black text-xl border-4 ${
              status === 'success'
                ? 'bg-kids-green/20 border-kids-green text-green-800'
                : 'bg-kids-red/10 border-kids-red text-red-700'
            }`}
          >
            {status === 'success' ? (
              <span>⭐ {t('success')} ⭐</span>
            ) : (
              <span>😬 {t('retry')}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 w-full">
            {items.map((id, index) => (
              <SortableStep
                key={id}
                id={id}
                label={t(id)}
                index={index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Action buttons */}
      <div className="flex gap-4 flex-wrap justify-center">
        {status !== 'success' && (
          <button
            onClick={checkOrder}
            className="btn-chunky bg-kids-purple text-white"
          >
            Check! ✅
          </button>
        )}
        <button
          onClick={reset}
          className="btn-chunky bg-kids-yellow text-kids-purple"
        >
          Shuffle 🔀
        </button>
      </div>

      {/* Success sticker animation */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="text-center"
          >
            <div className="text-8xl">🏅</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Algorithm Master!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
