'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Concept blocks — one per Phase 1 lesson
// ---------------------------------------------------------------------------
const CONCEPT_BLOCKS = [
  { id: 'sequence',  label: 'sequence()',   color: 'bg-kids-blue   text-white border-kids-blue/60',   emoji: '🍞' },
  { id: 'if_then',   label: 'if_then()',    color: 'bg-kids-green  text-white border-kids-green/60',  emoji: '🌤' },
  { id: 'repeat',    label: 'repeat()',     color: 'bg-kids-orange text-white border-kids-orange/60', emoji: '🔄' },
  { id: 'variable',  label: 'variable()',   color: 'bg-kids-purple text-white border-kids-purple/60', emoji: '📦' },
  { id: 'array',     label: 'array[]',      color: 'bg-kids-red    text-white border-kids-red/60',    emoji: '🎒' },
  { id: 'function',  label: 'function()',   color: 'bg-kids-yellow text-gray-800 border-kids-yellow/60', emoji: '⚡' },
  { id: 'event',     label: 'on_click()',   color: 'bg-kids-blue   text-white border-kids-blue/60',   emoji: '👆' },
  { id: 'debug',     label: 'debug()',      color: 'bg-kids-green  text-white border-kids-green/60',  emoji: '🔍' },
  { id: 'move_xy',   label: 'move_xy()',    color: 'bg-kids-purple text-white border-kids-purple/60', emoji: '🗺️' },
  { id: 'collision', label: 'collision()',  color: 'bg-kids-orange text-white border-kids-orange/60', emoji: '⭐' },
] as const;

type BlockId = typeof CONCEPT_BLOCKS[number]['id'];

const BLEEP_POSES: Record<BlockId, string> = {
  sequence:  '🤖',
  if_then:   '🤔',
  repeat:    '💃',
  variable:  '📦',
  array:     '🎒',
  function:  '⚙️',
  event:     '👆',
  debug:     '🔍',
  move_xy:   '🗺️',
  collision: '💥',
};

// ---------------------------------------------------------------------------
// Certificate generation using Canvas API
// ---------------------------------------------------------------------------
function downloadCertificate(
  studentName: string,
  certTitle: string,
  certSub: string,
  certBody: string,
) {
  const W = 800, H = 560;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#7209B7');
  bg.addColorStop(0.5, '#4CC9F0');
  bg.addColorStop(1,   '#06D6A0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // White card
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(44, 44, W - 88, H - 88);

  // Border
  ctx.strokeStyle = '#7209B7';
  ctx.lineWidth = 5;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  // Inner accent line
  ctx.strokeStyle = '#F9C74F';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  ctx.textAlign = 'center';

  // Emoji header
  ctx.font = '38px serif';
  ctx.fillStyle = '#333';
  ctx.fillText('🤖  ⭐  🎓  ⭐  🤖', W / 2, 118);

  // Certificate title
  ctx.font = 'bold 34px sans-serif';
  ctx.fillStyle = '#7209B7';
  ctx.fillText(certTitle, W / 2, 170);

  // Divider
  ctx.strokeStyle = '#E0D0F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 188);
  ctx.lineTo(W - 120, 188);
  ctx.stroke();

  // "This certifies that"
  ctx.font = '19px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(certSub, W / 2, 225);

  // Student name
  ctx.font = 'bold 44px serif';
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText(studentName || 'Student', W / 2, 285);

  // Gold underline below name
  const nameW = ctx.measureText(studentName || 'Student').width;
  ctx.strokeStyle = '#F9C74F';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameW / 2, 298);
  ctx.lineTo(W / 2 + nameW / 2, 298);
  ctx.stroke();

  // Body text (may be multi-line)
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#444';
  const lines = certBody.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 340 + i * 30);
  });

  // Date
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText(new Date().toLocaleDateString(), W / 2, H - 80);

  // Corner stars
  ctx.font = '22px serif';
  ctx.fillStyle = '#F9C74F';
  ['72,100', '728,100', '72,440', '728,440'].forEach(pos => {
    const [x, y] = pos.split(',').map(Number);
    ctx.fillText('★', x, y);
  });

  // Download
  const link = document.createElement('a');
  link.download = 'bleep-certificate.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function GrandFinale() {
  const t = useTranslations('lesson20');
  const { user } = useUser();

  const [program,  setProgram]  = useState<BlockId[]>([]);
  const [phase,    setPhase]    = useState<'idle' | 'running' | 'done'>('idle');
  const [bleepPose, setBleepPose] = useState<string>('🤖');
  const [status,   setStatus]   = useState<'idle' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [minHint,  setMinHint]  = useState(false);
  const savedRef = useRef(false);

  function addBlock(id: BlockId) {
    if (program.length >= 8 || phase === 'running') return;
    setProgram(prev => [...prev, id]);
  }

  function clearProgram() {
    if (phase === 'running') return;
    setProgram([]);
    setPhase('idle');
    setBleepPose('🤖');
  }

  function handleRun() {
    if (program.length === 0 || phase === 'running') return;
    setPhase('running');
  }

  // Animate through each block in sequence
  useEffect(() => {
    if (phase !== 'running') return;
    if (program.length === 0) { setPhase('done'); return; }

    let i = 0;
    const interval = setInterval(() => {
      if (i < program.length) {
        setBleepPose(BLEEP_POSES[program[i]]);
        i++;
      } else {
        clearInterval(interval);
        setPhase('done');
        setBleepPose('😄');
      }
    }, 550);
    return () => clearInterval(interval);
  }, [phase, program]);

  function handleFinish() {
    if (program.length < 3) { setMinHint(true); return; }
    if (status === 'success') return;

    setMinHint(false);
    savedRef.current = true;

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 250, spread: 100, origin: { y: 0.5 },
        colors: ['#7209B7', '#F9C74F', '#06D6A0', '#4CC9F0', '#EF233C'] });
    });

    completeLesson(20, 'sticker-master_architect').catch(console.error);

    const name = user?.fullName ?? user?.username ?? 'Student';
    downloadCertificate(
      name,
      t('certificate_title'),
      t('certificate_sub'),
      t('certificate_body'),
    );

    setTimeout(() => setStatus('success'), 400);
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto pb-24">

      {/* Story card */}
      <div className="card-kids border-kids-yellow w-full">
        <div className="text-6xl mb-3 text-center">🎓</div>
        <h1 className="text-2xl font-black text-kids-purple text-center mb-2">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-sm mb-3 text-center">{t('story')}</p>
        <p className="text-sm font-black text-kids-yellow bg-kids-yellow/20 rounded-xl px-4 py-2 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      {/* ── Bleep arena ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border-4 border-kids-yellow flex items-center justify-center"
        style={{ height: 160, background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' }}
      >
        {/* Stars */}
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: 2, height: 2,
              left: `${(i * 31 + 7) % 95}%`,
              top:  `${(i * 19 + 5) % 75}%`,
              opacity: 0.35,
            }}
          />
        ))}

        <motion.div
          key={bleepPose}
          initial={{ scale: 0.7, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          className="text-7xl select-none"
        >
          {bleepPose}
        </motion.div>

        {phase === 'running' && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{ boxShadow: ['0 0 0px #F9C74F', '0 0 24px #F9C74F', '0 0 0px #F9C74F'] }}
            transition={{ repeat: Infinity, duration: 0.55 }}
          />
        )}
      </div>

      {/* ── Toolbox ── */}
      <div className="w-full">
        <p className="font-black text-kids-purple text-sm mb-2 text-center">{t('tray_label')}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {CONCEPT_BLOCKS.map(({ id, label, color, emoji }) => (
            <button
              key={id}
              onClick={() => addBlock(id)}
              disabled={phase === 'running' || program.length >= 8}
              className={`px-3 py-2 rounded-xl font-mono font-black text-sm border-4 shadow-chunky
                select-none transition-transform hover:scale-105 active:scale-95 touch-none
                disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sequence workspace ── */}
      <div className="w-full bg-gray-900 rounded-2xl p-4 min-h-[80px]">
        <p className="font-black text-kids-yellow text-xs uppercase tracking-widest mb-3">
          📝 {t('workspace_label')}
        </p>
        {program.length === 0 ? (
          <p className="text-gray-500 text-sm font-bold text-center italic py-2">
            {t('workspace_empty')}
          </p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {program.map((id, i) => {
              const block = CONCEPT_BLOCKS.find(b => b.id === id)!;
              return (
                <motion.div
                  key={`${id}-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  className={`px-2 py-1 rounded-lg font-mono font-black text-xs border-2 ${block.color}`}
                >
                  {block.emoji} {block.label}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Min-blocks hint */}
      <AnimatePresence>
        {minHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full text-center text-kids-red font-black text-sm"
          >
            ⚠️ {t('min_blocks_hint')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buttons ── */}
      <div className="flex gap-3 flex-wrap justify-center">
        <motion.button
          onClick={handleRun}
          disabled={program.length === 0 || phase === 'running'}
          whileTap={{ scale: 0.95 }}
          className="btn-chunky bg-kids-purple text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'running' ? '⏳ Running…' : t('button_run')}
        </motion.button>

        <motion.button
          onClick={handleFinish}
          disabled={status === 'success'}
          whileTap={{ scale: 0.95 }}
          className="btn-chunky bg-kids-yellow text-kids-purple text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('button_finish')}
        </motion.button>

        <button
          onClick={clearProgram}
          disabled={phase === 'running'}
          className="btn-chunky bg-white text-gray-500 border-4 border-gray-300 text-base disabled:opacity-40"
        >
          🗑️ Clear
        </button>

        <button
          onClick={() => setShowHint(h => !h)}
          className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-base"
        >
          💡 {t('button_hint')}
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
            className="w-full card-kids border-kids-yellow text-center"
          >
            <p className="font-black text-kids-yellow text-xl mb-2">🎉 {t('success')}</p>
            <p className="font-bold text-gray-500 text-sm">
              Your certificate has been downloaded! 🎓
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graduation sticker */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.3 }}
            className="text-center"
          >
            <div className="text-8xl">🏆</div>
            <p className="font-black text-kids-purple text-2xl mt-2">Master Architect! 🎓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
