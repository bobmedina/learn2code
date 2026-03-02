'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

const ROCKET_X0  = 6;   // start left  %
const ROCKET_Y0  = 80;  // start top   %
const PORTAL_LX  = 72;  // portal left %
const PORTAL_TY  = 9;   // portal top  %
const VEL_SCALE  = 8;   // % per velocity unit
const HIT_RADIUS = 22;  // success distance (in %) from portal centre

const TRAIL_N        = 6;
const FLIGHT_DURATION = 1.4;

function computeEnd(vX: number, vY: number) {
  const endLeft = Math.min(94, ROCKET_X0 + vX * VEL_SCALE);
  const endTop  = Math.max(3,  ROCKET_Y0 - vY * VEL_SCALE);
  const dx = endLeft - PORTAL_LX;
  const dy = endTop  - PORTAL_TY;
  const hit = Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS && (vX > 0 || vY > 0);
  return { endLeft, endTop, hit };
}

export function TurboBooster() {
  const t      = useTranslations('lesson16');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  const [velX, setVelX]           = useState(0);
  const [velY, setVelY]           = useState(0);
  const [phase, setPhase]         = useState<'idle' | 'flying' | 'result'>('idle');
  const [flyTarget, setFlyTarget] = useState({ left: ROCKET_X0, top: ROCKET_Y0 });
  const [flyHit, setFlyHit]       = useState(false);
  const [status, setStatus]       = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint]   = useState(false);
  const savedRef = useRef(false);

  // Rocket points toward travel direction (uses velocity while idle for preview)
  const rdx = phase !== 'idle' ? flyTarget.left - ROCKET_X0 : velX;
  const rdy = phase !== 'idle' ? ROCKET_Y0 - flyTarget.top  : velY;
  const rocketAngle = (rdx === 0 && rdy === 0)
    ? 0
    : Math.atan2(rdx, rdy) * (180 / Math.PI);

  // Hint when only one axis has velocity
  const onlyOneSet = (velX > 0) !== (velY > 0);

  // Straight-line trail points
  const trailPoints = Array.from({ length: TRAIL_N }, (_, i) => {
    const frac = (i + 1) / (TRAIL_N + 1);
    return {
      left: ROCKET_X0 + frac * (flyTarget.left - ROCKET_X0),
      top:  ROCKET_Y0 + frac * (flyTarget.top  - ROCKET_Y0),
    };
  });

  function handleIgnite() {
    if (phase !== 'idle' || status === 'success') return;
    if (velX === 0 && velY === 0) return;
    const result = computeEnd(velX, velY);
    setFlyTarget({ left: result.endLeft, top: result.endTop });
    setFlyHit(result.hit);
    setPhase('flying');
  }

  function handleReset() {
    setPhase('idle');
    setFlyTarget({ left: ROCKET_X0, top: ROCKET_Y0 });
    setFlyHit(false);
  }

  function onFlyComplete() {
    if (phase !== 'flying') return;
    setPhase('result');
    if (flyHit && !savedRef.current) {
      savedRef.current = true;
      setTimeout(() => {
        setStatus('success');
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 200, spread: 100, origin: { y: 0.4 },
            colors: ['#4CC9F0', '#F9C74F', '#7209B7', '#06D6A0', '#EF233C'],
          });
        });
        completeLesson(16, 'sticker-race_driver').catch(console.error);
      }, 400);
    }
  }

  const rocketLeft = phase === 'idle' ? ROCKET_X0 : flyTarget.left;
  const rocketTop  = phase === 'idle' ? ROCKET_Y0 : flyTarget.top;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-8 pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-blue w-full text-center">
        <div className="text-7xl mb-3">🚀</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">{t('title')}</h1>
        <p className="text-lg font-bold text-gray-600 mb-3">{t('story')}</p>
        <p className="text-base font-black text-kids-purple bg-kids-purple/10 rounded-xl px-4 py-2">
          🎯 {t('goal')}
        </p>
      </div>

      {/* Arena */}
      <div
        className="w-full rounded-2xl border-4 border-kids-blue bg-gray-900 overflow-hidden relative select-none"
        style={{ height: 280 }}
      >
        {/* Starfield */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Axis labels */}
        <div className="absolute bottom-2 right-3 text-xs font-black text-white/30 pointer-events-none">X →</div>
        <div className="absolute top-2 left-3 text-xs font-black text-white/30 pointer-events-none">↑ Y</div>

        {/* Portal */}
        <motion.div
          className="absolute text-3xl pointer-events-none"
          style={{ left: `${PORTAL_LX}%`, top: `${PORTAL_TY}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        >
          🌀
        </motion.div>

        {/* Launch pad */}
        <div
          className="absolute text-xl pointer-events-none"
          style={{ left: `${ROCKET_X0}%`, top: `${ROCKET_Y0 + 7}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}
        >
          🛸
        </div>

        {/* SVG trail dots — visible during and after flight */}
        {phase !== 'idle' && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', zIndex: 3 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {trailPoints.map((pt, i) => (
              <motion.circle
                key={i}
                cx={pt.left}
                cy={pt.top}
                r="1.8"
                fill="rgba(249,199,79,0.75)"
                initial={{ opacity: 0, r: 0 }}
                animate={{ opacity: 0.75, r: 1.8 }}
                transition={{
                  delay: FLIGHT_DURATION * ((i + 1) / (TRAIL_N + 1)),
                  duration: 0.2,
                }}
              />
            ))}
          </svg>
        )}

        {/* Rocket */}
        <motion.div
          className="absolute"
          style={{ zIndex: 5 }}
          animate={{ left: `${rocketLeft}%`, top: `${rocketTop}%` }}
          transition={
            phase === 'flying'
              ? { duration: FLIGHT_DURATION, ease: [0.25, 0.1, 0.25, 1.0] }
              : { duration: 0 }
          }
          onAnimationComplete={onFlyComplete}
        >
          <div
            className="text-3xl"
            style={{ transform: `translate(-50%, -50%) rotate(${rocketAngle}deg)` }}
          >
            🚀
          </div>
        </motion.div>

        {/* Result chip */}
        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 10 }}
              className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1 whitespace-nowrap ${
                flyHit ? 'bg-kids-green/90' : 'bg-kids-red/90'
              }`}
            >
              <span className="font-black text-white text-xs">
                {flyHit ? t('success_hit') : t('fail_miss')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Code window */}
      <div className="w-full bg-gray-900 rounded-xl border-2 border-kids-blue/40 px-4 py-3 font-mono text-sm">
        <p className="text-white/40 text-xs mb-1">// velocity.js</p>
        <div className="space-y-0.5">
          <p className="text-white">
            <span className="text-kids-purple">let </span>
            <span>vX </span>
            <span className="text-white/40">= </span>
            <motion.span
              key={velX}
              className="text-kids-yellow font-black"
              initial={{ scale: 1.5, color: '#06D6A0' }}
              animate={{ scale: 1, color: '#F9C74F' }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {velX}
            </motion.span>
          </p>
          <p className="text-white">
            <span className="text-kids-purple">let </span>
            <span>vY </span>
            <span className="text-white/40">= </span>
            <motion.span
              key={velY + 100}
              className="text-kids-yellow font-black"
              initial={{ scale: 1.5, color: '#06D6A0' }}
              animate={{ scale: 1, color: '#F9C74F' }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {velY}
            </motion.span>
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="w-full space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-black text-kids-blue text-sm">→ {t('vel_x_label')}</span>
            <span className="font-black text-kids-blue text-xl">{velX}</span>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={velX}
            onChange={e => { if (phase === 'idle') setVelX(+e.target.value); }}
            disabled={phase !== 'idle'}
            className="w-full accent-kids-blue disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-black text-kids-green text-sm">↑ {t('vel_y_label')}</span>
            <span className="font-black text-kids-green text-xl">{velY}</span>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={velY}
            onChange={e => { if (phase === 'idle') setVelY(+e.target.value); }}
            disabled={phase !== 'idle'}
            className="w-full accent-kids-green disabled:opacity-50"
          />
        </div>
      </div>

      {/* Diagonal hint */}
      <AnimatePresence>
        {onlyOneSet && phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="w-full"
          >
            <div className="bg-kids-yellow/20 border-2 border-kids-yellow rounded-xl px-4 py-3 font-bold text-kids-yellow text-sm">
              💡 {t('hint_diagonal')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        <motion.button
          whileHover={phase === 'idle' && (velX > 0 || velY > 0) && status !== 'success' ? { scale: 1.04 } : {}}
          whileTap={phase === 'idle' && (velX > 0 || velY > 0) && status !== 'success' ? { scale: 0.96 } : {}}
          onClick={handleIgnite}
          disabled={phase !== 'idle' || status === 'success' || (velX === 0 && velY === 0)}
          className="btn-chunky bg-kids-blue text-white text-xl flex-1 disabled:opacity-40"
        >
          {t('ignite_button')}
        </motion.button>

        <AnimatePresence>
          {phase !== 'idle' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={handleReset}
              disabled={status === 'success'}
              className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-xl disabled:opacity-40"
            >
              {t('reset_button')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Hint button */}
      <button onClick={() => setShowHint(h => !h)} className="btn-chunky bg-kids-purple text-white">
        💡 {t('hint_button')}
      </button>

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
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <div className="w-full rounded-xl px-6 py-4 text-center font-black text-lg border-4
              bg-kids-green/20 border-kids-green text-green-800">
              {t('success')}
            </div>
            <Link href={`/${locale}/lesson17`}>
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
            <div className="text-8xl">🚀</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Estoril Racer! 🏁</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
