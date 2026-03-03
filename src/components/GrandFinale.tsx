'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ObjectType = 'asteroid' | 'rocket' | 'star' | 'planet';

interface SpaceObject {
  id: number;
  type: ObjectType;
  x: number;   // 0–CANVAS_W coordinate space
  y: number;   // 0–CANVAS_H coordinate space
  vx: number;
  vy: number;
  size: number;
  jumpBoost: number; // decaying upward velocity applied on click
  clickable: boolean;
}

type BlockKind = 'criar' | 'velocidade' | 'saltar' | 'fundo';

interface Block {
  id: BlockKind;
  emoji: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_W = 500;
const CANVAS_H = 500;

const OBJECT_EMOJIS: Record<ObjectType, string> = {
  asteroid: '☄️',
  rocket:   '🚀',
  star:     '⭐',
  planet:   '🪐',
};
const OBJECT_SIZES: Record<ObjectType, number> = {
  asteroid: 28,
  rocket:   30,
  star:     26,
  planet:   34,
};
const OBJECT_TYPES: ObjectType[] = ['asteroid', 'rocket', 'star', 'planet'];

const BG_GRADIENTS = [
  'linear-gradient(135deg, #03001e 0%, #0d3b8e 50%, #17a8d4 100%)',   // galaxy blue
  'linear-gradient(135deg, #1a0533 0%, #4a1277 50%, #7209B7 100%)',   // nebula purple
  'linear-gradient(135deg, #1a002e 0%, #7b2ff7 40%, #f77f00 100%)',   // sunset cosmos
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',   // deep space
  'linear-gradient(135deg, #001a0d 0%, #005c2e 50%, #00e676 100%)',   // aurora
];
const BG_LOCALE_KEYS = [
  'bg_galaxy_blue', 'bg_nebula_purple', 'bg_sunset_cosmos', 'bg_deep_space', 'bg_aurora',
] as const;

const PALETTE: Block[] = [
  { id: 'criar',      emoji: '✨', color: 'bg-kids-blue   text-white' },
  { id: 'velocidade', emoji: '🚀', color: 'bg-kids-orange text-white' },
  { id: 'saltar',     emoji: '👆', color: 'bg-kids-green  text-white' },
  { id: 'fundo',      emoji: '🌌', color: 'bg-kids-purple text-white' },
];

const MAX_PROGRAM = 12;
const MAX_OBJECTS = 12;

// ---------------------------------------------------------------------------
// Certificate via jspdf
// ---------------------------------------------------------------------------
async function downloadCertificate(
  studentName: string,
  certTitle: string,
  certSub: string,
  certBody: string,
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  // Gradient background via banded rects
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    doc.setFillColor(
      Math.round(7  + t * 114),
      Math.round(9  + t * 9),
      Math.round(22 + t * 183),
    );
    doc.rect(0, (H / 20) * i, W, H / 20 + 1, 'F');
  }

  // White card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 12, W - 24, H - 24, 8, 8, 'F');

  // Gold border
  doc.setDrawColor(249, 199, 79);
  doc.setLineWidth(2);
  doc.roundedRect(12, 12, W - 24, H - 24, 8, 8, 'S');

  // Purple inner accent
  doc.setDrawColor(114, 9, 183);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, 18, W - 36, H - 36, 6, 6, 'S');

  // Emoji header
  doc.setFontSize(22);
  doc.text('🤖  ⭐  🎓  ⭐  🤖', W / 2, 40, { align: 'center' });

  // Title
  doc.setFontSize(17);
  doc.setTextColor(114, 9, 183);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(certTitle, W - 60) as string[];
  doc.text(titleLines, W / 2, 58, { align: 'center' });

  // Divider
  doc.setDrawColor(200, 180, 230);
  doc.setLineWidth(0.5);
  doc.line(40, 70, W - 40, 70);

  // "Certificamos que"
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(certSub, W / 2, 84, { align: 'center' });

  // Student name
  doc.setFontSize(26);
  doc.setTextColor(26, 26, 46);
  doc.setFont('helvetica', 'bold');
  const displayName = studentName || 'O Pequeno Programador';
  doc.text(displayName, W / 2, 102, { align: 'center' });

  // Gold underline
  const nw = doc.getTextWidth(displayName);
  doc.setDrawColor(249, 199, 79);
  doc.setLineWidth(1.5);
  doc.line(W / 2 - nw / 2, 106, W / 2 + nw / 2, 106);

  // Body
  doc.setFontSize(12);
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'normal');
  const bodyLines = doc.splitTextToSize(certBody, W - 80) as string[];
  doc.text(bodyLines, W / 2, 122, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(new Date().toLocaleDateString('pt-PT'), W / 2, H - 22, { align: 'center' });

  // Corner stars
  doc.setFontSize(16);
  doc.setTextColor(249, 199, 79);
  [[28, 30], [W - 28, 30], [28, H - 22], [W - 28, H - 22]].forEach(([x, y]) =>
    doc.text('★', x, y, { align: 'center' }),
  );

  doc.save('certificado-academia-espacial.pdf');
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function GrandFinale() {
  const t = useTranslations('lesson20');
  const { user } = useUser();

  // Physics state
  const [objects, setObjects]     = useState<SpaceObject[]>([]);
  const [bgIndex, setBgIndex]     = useState(0);
  const nextId   = useRef(0);
  const rafRef   = useRef<number>(0);

  // Program state
  const [program,    setProgram]   = useState<BlockKind[]>([]);
  // execStep: -1 = never run, 0..N-1 = executing, N = finished
  const [execStep,   setExecStep]  = useState(-1);
  const [running,    setRunning]   = useState(false);

  // UI state
  const [status,     setStatus]    = useState<'idle' | 'success'>('idle');
  const [bleepPose,  setBleepPose] = useState<'idle' | 'victory'>('idle');
  const [minHint,    setMinHint]   = useState(false);
  const [showHint,   setShowHint]  = useState(false);

  // ── Physics engine ──────────────────────────────────────────────────────
  const startEngine = useCallback(() => {
    if (rafRef.current) return; // already running

    const tick = () => {
      setObjects(prev => {
        if (prev.length === 0) return prev; // no-op when empty
        return prev.map(obj => {
          let { x, y, vx, vy, size, jumpBoost } = obj;
          const half = size / 2;

          // Apply click-jump boost (decays each frame)
          vy += jumpBoost;
          const nextJump = jumpBoost * 0.82;

          x += vx;
          y += vy;

          // Bounce off walls
          if (x - half < 0)        { x = half;            vx =  Math.abs(vx); }
          if (x + half > CANVAS_W) { x = CANVAS_W - half; vx = -Math.abs(vx); }
          if (y - half < 0)        { y = half;            vy =  Math.abs(vy); }
          if (y + half > CANVAS_H) { y = CANVAS_H - half; vy = -Math.abs(vy); }

          return {
            ...obj, x, y, vx, vy,
            jumpBoost: Math.abs(nextJump) < 0.05 ? 0 : nextJump,
          };
        });
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopEngine = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Start engine as soon as first object appears
  useEffect(() => {
    if (objects.length > 0) startEngine();
  }, [objects.length, startEngine]);

  // Cleanup on unmount
  useEffect(() => () => stopEngine(), [stopEngine]);

  // ── Block actions ────────────────────────────────────────────────────────
  const spawnObject = useCallback(() => {
    if (objects.length >= MAX_OBJECTS) return;
    const type = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
    const size = OBJECT_SIZES[type];
    const half = size / 2;
    setObjects(prev => [
      ...prev,
      {
        id:        nextId.current++,
        type,
        x:         Math.random() * (CANVAS_W - size) + half,
        y:         Math.random() * (CANVAS_H - size) + half,
        vx:        (Math.random() * 2.5 + 1) * (Math.random() > 0.5 ? 1 : -1),
        vy:        (Math.random() * 2.5 + 1) * (Math.random() > 0.5 ? 1 : -1),
        size,
        jumpBoost: 0,
        clickable: false,
      },
    ]);
  }, [objects.length]);

  const setVelocityOnLast = useCallback((vx: number, vy: number) => {
    setObjects(prev => {
      if (prev.length === 0) return prev;
      return [...prev.slice(0, -1), { ...prev[prev.length - 1], vx, vy }];
    });
  }, []);

  const makeLastClickable = useCallback(() => {
    setObjects(prev => {
      if (prev.length === 0) return prev;
      return [...prev.slice(0, -1), { ...prev[prev.length - 1], clickable: true }];
    });
  }, []);

  // ── Execute program ──────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (program.length === 0 || running) return;
    setRunning(true);
    setExecStep(0);
  }, [program.length, running]);

  // Step through program one block at a time
  useEffect(() => {
    if (!running || execStep < 0 || execStep >= program.length) {
      if (running && execStep >= program.length) {
        // Mark all as done (execStep stays at program.length), stop running
        setRunning(false);
      }
      return;
    }

    const block = program[execStep];
    const timer = setTimeout(() => {
      if (block === 'criar') {
        spawnObject();
      } else if (block === 'velocidade') {
        const spd = Math.random() * 2.5 + 2;
        setVelocityOnLast(
          spd * (Math.random() > 0.5 ? 1 : -1),
          spd * (Math.random() > 0.5 ? 1 : -1),
        );
      } else if (block === 'saltar') {
        makeLastClickable();
      } else if (block === 'fundo') {
        setBgIndex(prev => (prev + 1) % BG_GRADIENTS.length);
      }
      setExecStep(prev => prev + 1);
    }, 400);

    return () => clearTimeout(timer);
  }, [running, execStep, program, spawnObject, setVelocityOnLast, makeLastClickable]);

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    stopEngine();
    setObjects([]);
    setProgram([]);
    setRunning(false);
    setExecStep(-1); // reset to "never run"
  }, [stopEngine]);

  // ── Object click → jump ──────────────────────────────────────────────────
  const handleObjectClick = useCallback((id: number) => {
    setObjects(prev =>
      prev.map(obj =>
        obj.id === id && obj.clickable ? { ...obj, jumpBoost: -5 } : obj,
      ),
    );
  }, []);

  // ── Grand Finale ─────────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (objects.length === 0) { setMinHint(true); return; }
    if (status === 'success') return;

    setMinHint(false);
    setBleepPose('victory');

    const { default: confetti } = await import('canvas-confetti');
    const burst = () =>
      confetti({
        particleCount: 200,
        spread: 130,
        origin: { y: 0.55 },
        colors: ['#7209B7', '#F9C74F', '#06D6A0', '#4CC9F0', '#EF233C', '#F77F00'],
      });
    burst();
    setTimeout(burst, 300);
    setTimeout(burst, 650);

    completeLesson(20, 'sticker-master_architect').catch(console.error);

    const name = user?.fullName ?? user?.username ?? 'O Pequeno Programador';
    await downloadCertificate(name, t('certificate_title'), t('certificate_sub'), t('certificate_body'));

    setTimeout(() => setStatus('success'), 600);
  }, [objects.length, status, user, t]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const blockLabel = (id: BlockKind) => {
    const labels: Record<BlockKind, string> = {
      criar:      t('block_criar'),
      velocidade: t('block_velocidade'),
      saltar:     t('block_saltar'),
      fundo:      t('block_fundo'),
    };
    return labels[id];
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-4 py-6 gap-6 max-w-2xl mx-auto pb-28">

      {/* Story card */}
      <div className="card-kids border-kids-yellow w-full">
        <div className="text-5xl mb-2 text-center">🎓</div>
        <h1 className="text-2xl font-black text-kids-purple text-center mb-1">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-sm text-center mb-3">{t('story')}</p>
        <p className="text-sm font-black text-kids-yellow bg-kids-yellow/20 rounded-xl px-4 py-2 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      {/* ── Canvas + Palette row ── */}
      <div className="w-full flex flex-col lg:flex-row gap-4">

        {/* Physics canvas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-black text-kids-purple text-sm">{t('canvas_label')}</p>
            <span className="text-xs bg-gray-800 text-gray-300 font-mono px-2 py-0.5 rounded-lg">
              {objects.length}/{MAX_OBJECTS} obj
            </span>
          </div>

          <div
            className="relative rounded-2xl overflow-hidden border-4 border-kids-yellow select-none"
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              maxWidth: CANVAS_W,
              background: BG_GRADIENTS[bgIndex],
              transition: 'background 0.7s ease',
            }}
          >
            {/* Star backdrop */}
            {Array.from({ length: 26 }, (_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  width: i % 6 === 0 ? 3 : 2,
                  height: i % 6 === 0 ? 3 : 2,
                  left: `${(i * 37 + 11) % 97}%`,
                  top:  `${(i * 23 + 7) % 91}%`,
                  opacity: 0.18 + (i % 5) * 0.06,
                }}
              />
            ))}

            {/* Idle Bleep */}
            <AnimatePresence>
              {objects.length === 0 && (
                <motion.div
                  key="bleep-idle"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center text-7xl pointer-events-none"
                >
                  {bleepPose === 'victory' ? '🥳' : '🤖'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Victory Bleep overlay (when objects exist) */}
            <AnimatePresence>
              {bleepPose === 'victory' && objects.length > 0 && (
                <motion.div
                  key="bleep-victory"
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: [1, 1.3, 1], y: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 14 }}
                  className="absolute bottom-3 right-3 text-4xl pointer-events-none"
                  style={{ zIndex: 20 }}
                >
                  🥳
                </motion.div>
              )}
            </AnimatePresence>

            {/* Space objects (% positioning → works at any container size) */}
            {objects.map(obj => (
              <motion.button
                key={obj.id}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{
                  left:      `${(obj.x / CANVAS_W) * 100}%`,
                  top:       `${(obj.y / CANVAS_H) * 100}%`,
                  width:     obj.size,
                  height:    obj.size,
                  fontSize:  obj.size * 0.85,
                  transform: 'translate(-50%, -50%)',
                  zIndex:    10,
                  filter:    obj.clickable ? 'drop-shadow(0 0 7px #06D6A0)' : undefined,
                  background: 'none',
                  border:    'none',
                  padding:   0,
                  cursor:    obj.clickable ? 'pointer' : 'default',
                }}
                whileTap={obj.clickable ? { scale: 1.5 } : {}}
                onClick={() => handleObjectClick(obj.id)}
                title={obj.clickable ? t('block_saltar') : undefined}
                tabIndex={obj.clickable ? 0 : -1}
              >
                {OBJECT_EMOJIS[obj.type]}
              </motion.button>
            ))}

            {/* Running glow */}
            {running && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ boxShadow: ['0 0 0px #F9C74F', '0 0 30px #F9C74F', '0 0 0px #F9C74F'] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              />
            )}

            {/* BG label */}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg pointer-events-none">
              {t(BG_LOCALE_KEYS[bgIndex])}
            </div>
          </div>

          {/* Canvas action buttons */}
          <div className="flex gap-2 mt-2">
            <motion.button
              onClick={handleRun}
              disabled={program.length === 0 || running}
              whileTap={{ scale: 0.94 }}
              className="flex-1 btn-chunky bg-kids-purple text-white text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {running ? '⏳ A executar…' : t('button_run')}
            </motion.button>

            <motion.button
              onClick={handleClear}
              whileTap={{ scale: 0.94 }}
              className="btn-chunky bg-white text-gray-500 border-4 border-gray-300 text-base"
            >
              {t('button_clear')}
            </motion.button>
          </div>
        </div>

        {/* Palette + Code pane */}
        <div className="flex flex-col gap-3 lg:w-56">

          {/* Artist's Palette */}
          <div>
            <p className="font-black text-kids-purple text-sm mb-2">
              🎨 {t('palette_label')}
            </p>
            <div className="flex flex-col gap-2">
              {PALETTE.map(({ id, emoji, color }) => (
                <motion.button
                  key={id}
                  onClick={() => {
                    if (!running && program.length < MAX_PROGRAM) {
                      setProgram(prev => [...prev, id]);
                    }
                  }}
                  disabled={running || program.length >= MAX_PROGRAM}
                  whileTap={{ scale: 0.91 }}
                  whileHover={{ scale: 1.05 }}
                  className={`w-full px-3 py-2.5 rounded-xl font-mono font-black text-[11px]
                    border-4 shadow-chunky select-none text-left leading-tight
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${color}`}
                  style={{ borderColor: 'rgba(255,255,255,0.28)' }}
                >
                  {emoji} {blockLabel(id)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Code pane — shows queued → executed */}
          <div>
            <p className="font-black text-kids-yellow text-[10px] uppercase tracking-widest mb-1">
              📝 {t('log_label')}
            </p>
            <div className="bg-gray-950 rounded-xl p-3 min-h-[90px] max-h-[200px] overflow-y-auto font-mono text-xs">
              {program.length === 0 ? (
                <p className="text-gray-600 italic">{t('log_empty')}</p>
              ) : (
                program.map((id, i) => {
                  // execStep=-1 → never run (all pending)
                  // execStep=N  → finished run (all done)
                  const done   = execStep >= 0 && i < execStep;
                  const active = running && i === execStep;
                  return (
                    <motion.div
                      key={i}
                      initial={i === execStep ? { x: -4, opacity: 0 } : false}
                      animate={{ x: 0, opacity: 1 }}
                      className={`flex items-center gap-1.5 py-0.5 ${
                        active ? 'text-kids-yellow' :
                        done   ? 'text-green-400' :
                                 'text-gray-500'
                      }`}
                    >
                      <span>{active ? '▶' : done ? '✓' : '○'}</span>
                      <span>{blockLabel(id)}</span>
                    </motion.div>
                  );
                })
              )}
            </div>
            {program.length > 0 && (
              <button
                onClick={() => { if (!running) setProgram([]); }}
                disabled={running}
                className="text-[10px] text-gray-400 hover:text-gray-200 mt-1 font-bold disabled:opacity-30"
              >
                ✕ apagar programa
              </button>
            )}
          </div>

          {/* Hint button */}
          <button
            onClick={() => setShowHint(h => !h)}
            className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-sm"
          >
            💡 {t('button_hint')}
          </button>
        </div>
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

      {/* Min-blocks hint */}
      <AnimatePresence>
        {minHint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-kids-red font-black text-sm text-center"
          >
            ⚠️ {t('min_blocks_hint')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Finalizar Curso — prominent, pulsing ── */}
      <div className="w-full flex flex-col items-center gap-3 pt-4 border-t-2 border-dashed border-kids-yellow/30">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">
          Pronto para te formar? · Ready to graduate?
        </p>
        <motion.button
          onClick={handleFinish}
          disabled={status === 'success'}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.04 }}
          animate={status !== 'success'
            ? { boxShadow: ['0 0 0px #F9C74F', '0 0 20px #F9C74F99', '0 0 0px #F9C74F'] }
            : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="btn-chunky bg-kids-yellow text-kids-purple text-xl font-black
            disabled:opacity-50 disabled:cursor-not-allowed px-10 py-4"
        >
          {t('button_finish')}
        </motion.button>
      </div>

      {/* Success */}
      <AnimatePresence>
        {status === 'success' && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 20 }}
              className="w-full card-kids border-kids-yellow text-center"
            >
              <p className="font-black text-kids-yellow text-xl mb-1">🎉 {t('success')}</p>
              <p className="font-bold text-gray-500 text-sm">{t('success_cert')}</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.3 }}
              className="text-center pb-4"
            >
              <div className="text-8xl">🏆</div>
              <p className="font-black text-kids-purple text-2xl mt-2">
                Mestre Arquiteto Espacial! 🎓
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
