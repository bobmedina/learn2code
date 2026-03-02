'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type ItemKey = 'hat' | 'sunscreen' | 'towel' | 'trash';

const ITEM_META: Record<ItemKey, { emoji: string; correct: boolean }> = {
  hat:       { emoji: '🧢', correct: true },
  sunscreen: { emoji: '🧴', correct: true },
  towel:     { emoji: '🏖️', correct: true },
  trash:     { emoji: '🗑️', correct: false },
};

const CORRECT_ITEMS: ItemKey[] = ['hat', 'sunscreen', 'towel'];

// ---------------------------------------------------------------------------
// DraggableItem
// ---------------------------------------------------------------------------
function DraggableItem({ id, emoji, disabled }: { id: ItemKey; emoji: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`text-5xl w-20 h-20 flex items-center justify-center rounded-2xl border-4
        border-kids-blue bg-white shadow-chunky select-none cursor-grab active:cursor-grabbing
        transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${disabled ? 'opacity-0 pointer-events-none' : ''}`}
    >
      {emoji}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BackpackDropZone
// ---------------------------------------------------------------------------
function BackpackDropZone({ children, backpackBounce }: { children: React.ReactNode; backpackBounce: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backpack' });

  return (
    <div
      ref={setNodeRef}
      className={`w-full min-h-[160px] rounded-2xl border-4 border-dashed p-5 transition-colors
        ${isOver ? 'border-kids-blue bg-kids-blue/20' : 'border-kids-blue/50 bg-kids-blue/5'}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.span
          key={backpackBounce}
          animate={{ scale: backpackBounce > 0 ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.35 }}
          className="text-4xl"
        >
          🎒
        </motion.span>
        <span className="font-mono font-black text-kids-blue text-base">backpack = [</span>
      </div>
      <div className="flex flex-wrap gap-3 min-h-[52px]">{children}</div>
      <p className="font-mono font-black text-kids-blue text-base mt-3">]</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function BackpackBuilder() {
  const t = useTranslations('lesson5');

  const [trayItems, setTrayItems] = useState<ItemKey[]>(['hat', 'sunscreen', 'towel', 'trash']);
  const [backpack, setBackpack] = useState<ItemKey[]>([]);
  const [activeId, setActiveId] = useState<ItemKey | null>(null);
  const [trashShake, setTrashShake] = useState(0);
  const [trashMsg, setTrashMsg] = useState(false);
  const [backpackBounce, setBackpackBounce] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const savedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Success check
  useEffect(() => {
    if (backpack.length === 3 && status !== 'success') {
      setStatus('success');
      if (!savedRef.current) {
        savedRef.current = true;
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 180, spread: 90, origin: { y: 0.6 },
            colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'],
          });
        });
        completeLesson(5, 'sticker-array').catch(console.error);
      }
    }
  }, [backpack.length, status]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as ItemKey);
    setTrashMsg(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over?.id !== 'backpack') return;

    const item = active.id as ItemKey;
    if (ITEM_META[item].correct) {
      // Add to backpack, remove from tray
      setTrayItems(prev => prev.filter(i => i !== item));
      setBackpack(prev => [...prev, item]);
      setBackpackBounce(b => b + 1);
    } else {
      // Trash: shake + rejection
      setTrashShake(s => s + 1);
      setTrashMsg(true);
    }
  }

  const activeEmoji = activeId ? ITEM_META[activeId].emoji : null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8">

      {/* Story card */}
      <div className="card-kids border-kids-blue w-full text-center">
        <div className="text-7xl mb-3">🎒</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-blue bg-kids-blue/10 rounded-xl px-4 py-2">
          🎯 {t('instruction')}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Backpack drop zone */}
        <BackpackDropZone backpackBounce={backpackBounce}>
          <AnimatePresence>
            {backpack.map(item => (
              <motion.div
                key={item}
                initial={{ scale: 0, opacity: 0, y: -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="text-3xl bg-kids-blue/20 rounded-xl px-3 py-2 font-mono font-black
                  border-2 border-kids-blue text-gray-700 flex items-center gap-1"
              >
                <span>{ITEM_META[item].emoji}</span>
                <span className="text-sm text-kids-blue">&quot;{item}&quot;</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </BackpackDropZone>

        {/* Item tray */}
        <div className="w-full bg-kids-blue/10 rounded-xl p-4 border-2 border-kids-blue/30">
          <p className="font-black text-kids-blue text-xs mb-4 uppercase tracking-wide">
            {t('tray_label')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {trayItems.map(item => (
              item === 'trash' ? (
                <motion.div
                  key="trash"
                  animate={{ x: trashShake > 0 ? [-10, 10, -8, 8, 0] : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <DraggableItem
                    id={item}
                    emoji={ITEM_META[item].emoji}
                    disabled={status === 'success'}
                  />
                </motion.div>
              ) : (
                <DraggableItem
                  key={item}
                  id={item}
                  emoji={ITEM_META[item].emoji}
                  disabled={status === 'success'}
                />
              )
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeEmoji && (
            <div className="text-5xl w-20 h-20 flex items-center justify-center rounded-2xl
              border-4 border-kids-blue bg-white shadow-xl opacity-90 cursor-grabbing">
              {activeEmoji}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Trash rejection banner */}
      <AnimatePresence>
        {trashMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-red/10 border-kids-red text-red-700"
          >
            🗑️ {t('trash_feedback')}
          </motion.div>
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
            <div className="bg-kids-blue/10 border-2 border-kids-blue rounded-xl px-4 py-3
              font-bold text-kids-blue text-base">
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
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-green/20 border-kids-green text-green-800"
          >
            ⭐ {t('success')} ⭐
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint button */}
      <button
        onClick={() => setShowHint(h => !h)}
        className="btn-chunky bg-kids-blue text-white"
      >
        💡 {t('hint_button')}
      </button>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">🎒</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Array Expert! 📋</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
