'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Enums — add SNOWY, WINDY, etc. here later without touching game logic
// ---------------------------------------------------------------------------
enum Weather {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
}

enum Action {
  SUNGLASSES = 'SUNGLASSES',
  UMBRELLA   = 'UMBRELLA',
}

// The single source of truth for what is correct
const CORRECT_MAP: Record<Weather, Action> = {
  [Weather.SUNNY]: Action.SUNGLASSES,
  [Weather.RAINY]: Action.UMBRELLA,
};

// Metadata for sky display and condition chips
const WEATHER_META: Record<Weather, {
  emoji: string;
  skyBg: string;
  skyBorder: string;
  conditionKey: 'condition_sunny' | 'condition_rainy';
  weatherLabelKey: 'weather_sunny' | 'weather_rainy';
}> = {
  [Weather.SUNNY]: {
    emoji: '☀️',
    skyBg: 'bg-kids-yellow/30',
    skyBorder: 'border-kids-yellow',
    conditionKey: 'condition_sunny',
    weatherLabelKey: 'weather_sunny',
  },
  [Weather.RAINY]: {
    emoji: '🌧️',
    skyBg: 'bg-kids-blue/20',
    skyBorder: 'border-kids-blue',
    conditionKey: 'condition_rainy',
    weatherLabelKey: 'weather_rainy',
  },
};

// Metadata for action chips
const ACTION_META: Record<Action, {
  emoji: string;
  actionKey: 'action_sunglasses' | 'action_umbrella';
  labelKey: 'action_label_sunglasses' | 'action_label_umbrella';
}> = {
  [Action.SUNGLASSES]: {
    emoji: '😎',
    actionKey: 'action_sunglasses',
    labelKey: 'action_label_sunglasses',
  },
  [Action.UMBRELLA]: {
    emoji: '☂️',
    actionKey: 'action_umbrella',
    labelKey: 'action_label_umbrella',
  },
};

function randomWeather(): Weather {
  return Math.random() < 0.5 ? Weather.SUNNY : Weather.RAINY;
}

type ErrorType = 'wrong-condition' | 'wrong-action' | null;

// ---------------------------------------------------------------------------
// Chip — a selectable block in the tray
// ---------------------------------------------------------------------------
function Chip({
  emoji,
  label,
  isSelected,
  isUsed,
  onClick,
}: {
  emoji: string;
  label: string;
  isSelected: boolean;
  isUsed: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={!isUsed ? { scale: 1.06 } : {}}
      whileTap={!isUsed ? { scale: 0.94 } : {}}
      onClick={!isUsed ? onClick : undefined}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-base border-4
        shadow-chunky transition-all select-none
        ${isUsed
          ? 'opacity-30 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
          : isSelected
            ? 'bg-kids-purple text-white border-kids-purple cursor-pointer'
            : 'bg-white text-gray-700 border-gray-200 cursor-pointer hover:border-kids-purple'
        }`}
    >
      <span className="text-2xl">{emoji}</span>
      {label}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Slot — snap-in target, yellow for IF, blue for THEN
// ---------------------------------------------------------------------------
function Slot({
  children,
  variant,
  hasFill,
  onClick,
}: {
  children: React.ReactNode;
  variant: 'condition' | 'action';
  hasFill: boolean;
  onClick: () => void;
}) {
  const emptyStyle = variant === 'condition'
    ? 'border-kids-yellow hover:border-yellow-500 bg-kids-yellow/10'
    : 'border-kids-blue hover:border-blue-500 bg-kids-blue/10';

  const filledStyle = variant === 'condition'
    ? 'border-kids-yellow bg-kids-yellow/30'
    : 'border-kids-blue bg-kids-blue/30';

  return (
    <motion.div
      animate={hasFill ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`min-w-[170px] px-4 py-2 rounded-xl border-4 border-dashed font-bold text-base
        flex items-center justify-center cursor-pointer transition-colors
        ${hasFill ? filledStyle : emptyStyle} text-gray-800`}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main game component
// ---------------------------------------------------------------------------
export function LogicGate() {
  const t = useTranslations('lesson2');

  const [weather,   setWeather]   = useState<Weather>(randomWeather);
  // condSlot stores WEATHER — the "IF it is X" half
  const [condSlot,  setCondSlot]  = useState<Weather | null>(null);
  // actSlot stores ACTION — the "THEN do Y" half
  const [actSlot,   setActSlot]   = useState<Action | null>(null);
  // Which tray chip is currently selected
  const [selCond,   setSelCond]   = useState<Weather | null>(null);
  const [selAct,    setSelAct]    = useState<Action | null>(null);
  const [status,    setStatus]    = useState<'idle' | 'success' | 'error'>('idle');
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [showHint,  setShowHint]  = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (status === 'success' && !savedRef.current) {
      savedRef.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 },
          colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0'] });
      });
      completeLesson(2, 'sticker-logic').catch(console.error);
    }
  }, [status]);

  // --- Chip selection ---
  function pickCond(w: Weather) {
    setSelCond(w === selCond ? null : w);
    setSelAct(null);
    setStatus('idle');
  }
  function pickAct(a: Action) {
    setSelAct(a === selAct ? null : a);
    setSelCond(null);
    setStatus('idle');
  }

  // --- Slot interaction ---
  // Tapping the IF slot: place selected cond chip, or remove existing chip
  function handleCondSlot() {
    if (selCond !== null) {
      setCondSlot(selCond);
      setSelCond(null);
    } else if (condSlot !== null) {
      // Return chip to tray
      setCondSlot(null);
    }
    setStatus('idle');
  }

  // Tapping the THEN slot: place selected act chip, or remove existing chip
  function handleActSlot() {
    if (selAct !== null) {
      setActSlot(selAct);
      setSelAct(null);
    } else if (actSlot !== null) {
      setActSlot(null);
    }
    setStatus('idle');
  }

  // --- Validation ---
  // Both conditions must hold:
  //   1. condSlot (the IF condition) must match the current weather
  //   2. actSlot (the THEN action) must be the correct response to that weather
  const check = useCallback(() => {
    if (condSlot === null || actSlot === null) return;

    const conditionCorrect = condSlot === weather;
    const actionCorrect    = actSlot === CORRECT_MAP[weather];

    if (conditionCorrect && actionCorrect) {
      setStatus('success');
      setErrorType(null);
    } else if (!conditionCorrect) {
      setStatus('error');
      setErrorType('wrong-condition');
    } else {
      // conditionCorrect but actionCorrect is false
      setStatus('error');
      setErrorType('wrong-action');
    }
  }, [condSlot, actSlot, weather]);

  const reset = useCallback(() => {
    setWeather(randomWeather());
    setCondSlot(null);
    setActSlot(null);
    setSelCond(null);
    setSelAct(null);
    setStatus('idle');
    setErrorType(null);
    setShowHint(false);
  }, []);

  const clearSlots = () => {
    setCondSlot(null);
    setActSlot(null);
    setSelCond(null);
    setSelAct(null);
    setStatus('idle');
    setErrorType(null);
  };

  // Build error message string
  function errorMessage(): string {
    if (errorType === 'wrong-condition' && condSlot !== null) {
      return t('error_wrong_condition', {
        weather: t(WEATHER_META[condSlot].weatherLabelKey),
      });
    }
    if (errorType === 'wrong-action' && actSlot !== null) {
      return t('error_wrong_action', {
        weather: t(WEATHER_META[weather].weatherLabelKey),
        action:  t(ACTION_META[actSlot].labelKey),
      });
    }
    return '';
  }

  const skyMeta = WEATHER_META[weather];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8">

      {/* Story card */}
      <div className="card-kids border-kids-yellow w-full text-center">
        <div className="text-7xl mb-3">🤖</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600">{t('story')}</p>
      </div>

      {/* Sky display */}
      <motion.div
        key={weather}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card-kids ${skyMeta.skyBg} ${skyMeta.skyBorder} w-full flex flex-col items-center gap-2`}
      >
        <span className="text-8xl">{skyMeta.emoji}</span>
        <p className="font-black text-2xl text-gray-700">
          {t(skyMeta.weatherLabelKey)}
        </p>
        {showHint && (
          <p className="text-kids-blue font-bold text-base animate-pulse">💡 {t('hint')}</p>
        )}
      </motion.div>

      {/* ── Code block ── */}
      <div className="w-full space-y-3">

        {/* IF / THEN row */}
        <div className="card-kids border-kids-purple flex flex-wrap items-center gap-3 w-full">

          {/* IF keyword — purple */}
          <span className="font-black text-xl text-white bg-kids-purple px-3 py-1 rounded-lg">
            {t('kw_if')}
          </span>

          {/* Condition slot — YELLOW */}
          <Slot variant="condition" hasFill={condSlot !== null} onClick={handleCondSlot}>
            {condSlot !== null ? (
              <span className="flex items-center gap-2">
                <span className="text-2xl">{WEATHER_META[condSlot].emoji}</span>
                <span className="font-black">{t(WEATHER_META[condSlot].conditionKey)}</span>
              </span>
            ) : (
              <span className="text-yellow-600 font-bold">( ______ )</span>
            )}
          </Slot>

          {/* THEN keyword — orange */}
          <span className="font-black text-xl text-white bg-kids-orange px-3 py-1 rounded-lg">
            {t('kw_then')}
          </span>

          {/* Action slot — BLUE */}
          <Slot variant="action" hasFill={actSlot !== null} onClick={handleActSlot}>
            {actSlot !== null ? (
              <span className="flex items-center gap-2">
                <span className="text-2xl">{ACTION_META[actSlot].emoji}</span>
                <span className="font-black">{t(ACTION_META[actSlot].actionKey)}</span>
              </span>
            ) : (
              <span className="text-blue-400 font-bold">( ______ )</span>
            )}
          </Slot>
        </div>

        {/* ELSE row — static */}
        <div className="card-kids border-gray-300 flex items-center gap-3 opacity-70">
          <span className="font-black text-xl text-white bg-gray-400 px-3 py-1 rounded-lg">
            {t('kw_else')}
          </span>
          <span className="flex items-center gap-2 font-bold text-gray-600">
            <span className="text-2xl">👕</span>
            {t('else_action')}
          </span>
        </div>
      </div>

      {/* ── Chip trays ── */}
      <div className="w-full space-y-4">

        {/* Condition chips — yellow tray */}
        <div className="bg-kids-yellow/20 rounded-xl p-4 border-2 border-kids-yellow">
          <p className="font-black text-yellow-700 text-xs mb-3 uppercase tracking-wide">
            {t('tray_cond_label')}
          </p>
          <div className="flex flex-wrap gap-3">
            {(Object.values(Weather) as Weather[]).map((w) => (
              <Chip
                key={w}
                emoji={WEATHER_META[w].emoji}
                label={t(WEATHER_META[w].conditionKey)}
                isSelected={selCond === w}
                isUsed={condSlot === w}
                onClick={() => pickCond(w)}
              />
            ))}
          </div>
        </div>

        {/* Action chips — blue tray */}
        <div className="bg-kids-blue/10 rounded-xl p-4 border-2 border-kids-blue">
          <p className="font-black text-blue-600 text-xs mb-3 uppercase tracking-wide">
            {t('tray_act_label')}
          </p>
          <div className="flex flex-wrap gap-3">
            {(Object.values(Action) as Action[]).map((a) => (
              <Chip
                key={a}
                emoji={ACTION_META[a].emoji}
                label={t(ACTION_META[a].actionKey)}
                isSelected={selAct === a}
                isUsed={actSlot === a}
                onClick={() => pickAct(a)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      <AnimatePresence mode="wait">
        {status !== 'idle' && (
          <motion.div
            key={status + (errorType ?? '')}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4 ${
              status === 'success'
                ? 'bg-kids-green/20 border-kids-green text-green-800'
                : 'bg-kids-red/10 border-kids-red text-red-700'
            }`}
          >
            {status === 'success'
              ? `⭐ ${t('success')} ⭐`
              : `😬 ${errorMessage()}`
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={check}
          disabled={condSlot === null || actSlot === null}
          className="btn-chunky bg-kids-purple text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check! ✅
        </button>
        <button
          onClick={clearSlots}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple"
        >
          Clear 🗑️
        </button>
        <button
          onClick={reset}
          className="btn-chunky bg-kids-yellow text-kids-purple"
        >
          New Sky 🔀
        </button>
        <button
          onClick={() => setShowHint((h) => !h)}
          className="btn-chunky bg-kids-blue text-white"
        >
          Hint 💡
        </button>
      </div>

      {/* Success sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-center"
          >
            <div className="text-8xl">🧠</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Logic Master!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
