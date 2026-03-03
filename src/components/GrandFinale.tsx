'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { completeLesson } from '@/lib/actions';

// ── Types ──────────────────────────────────────────────────────────────────────
type ActionKind    = 'velocidade_bleep' | 'saltar' | 'mudar_fundo' | 'criar_objeto';
type ContainerKind = 'repetir_infinito' | 'repetir_10'              | 'ao_clicar_bleep';
type AnyKind       = ActionKind | ContainerKind;

interface ActionBlock    { id: string; kind: ActionKind }
interface ContainerBlock { id: string; kind: ContainerKind; children: ActionBlock[] }
type ProgramBlock = ActionBlock | ContainerBlock;

const isContainer = (b: ProgramBlock): b is ContainerBlock => 'children' in b;
const isContainerKind = (k: AnyKind): k is ContainerKind =>
  k === 'repetir_infinito' || k === 'repetir_10' || k === 'ao_clicar_bleep';

type ObjType = 'asteroid' | 'rocket' | 'star' | 'planet';
interface SpaceObj {
  id: number; type: ObjType;
  x: number; y: number; vx: number; vy: number;
  size: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CW = 500; const CH = 500;   // coordinate space
const BLEEP_HALF = 22;            // Bleep collision radius (px in coord space)
const BLEEP_VX   = 3.5;
const BLEEP_VY   = 3.5;
const MAX_OBJ    = 14;
const LOOP_MS    = 2000;          // repetir(infinito) interval
const REP10_MS   = 130;           // repetir(10) inter-iteration delay

const OBJ_EMOJIS: Record<ObjType, string> = {
  asteroid: '☄️', rocket: '🚀', star: '⭐', planet: '🪐',
};
const OBJ_SIZES: Record<ObjType, number> = {
  asteroid: 26, rocket: 28, star: 24, planet: 32,
};
const OBJ_TYPES: ObjType[] = ['asteroid', 'rocket', 'star', 'planet'];

const BACKGROUNDS = [
  'linear-gradient(135deg,#03001e 0%,#0d3b8e 50%,#17a8d4 100%)',
  'linear-gradient(135deg,#1a0533 0%,#4a1277 50%,#7209B7 100%)',
  'linear-gradient(135deg,#1a002e 0%,#7b2ff7 40%,#f77f00 100%)',
  'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
  'linear-gradient(135deg,#001a0d 0%,#005c2e 50%,#00e676 100%)',
];
const BG_KEYS = [
  'bg_galaxy_blue', 'bg_nebula_purple', 'bg_sunset_cosmos',
  'bg_deep_space',  'bg_aurora',
] as const;

interface BlockDef { label: string; emoji: string; tw: string }
const DEF: Record<AnyKind, BlockDef> = {
  velocidade_bleep: { label: 'definir_velocidade_do_Bleep(3,3)', emoji: '🚀', tw: 'bg-kids-orange text-white' },
  saltar:           { label: 'saltar()',                          emoji: '⬆️', tw: 'bg-kids-green  text-white' },
  mudar_fundo:      { label: 'mudar_fundo()',                     emoji: '🌌', tw: 'bg-kids-purple text-white' },
  criar_objeto:     { label: "criar_objeto('estrela')",           emoji: '✨', tw: 'bg-kids-blue   text-white' },
  repetir_infinito: { label: 'repetir(infinito)',                  emoji: '🔄', tw: 'bg-amber-600   text-white' },
  repetir_10:       { label: 'repetir(10)',                        emoji: '🔁', tw: 'bg-amber-500   text-white' },
  ao_clicar_bleep:  { label: 'ao_clicar(Bleep)',                  emoji: '👆', tw: 'bg-pink-600    text-white' },
};

const PALETTE_CATS: { icon: string; key: string; kinds: AnyKind[] }[] = [
  { icon: '🔄', key: 'cat_ciclos',   kinds: ['repetir_infinito', 'repetir_10'] },
  { icon: '⚡', key: 'cat_eventos',  kinds: ['ao_clicar_bleep'] },
  { icon: '🚀', key: 'cat_movimento', kinds: ['velocidade_bleep', 'saltar'] },
  { icon: '✨', key: 'cat_criacao',  kinds: ['criar_objeto', 'mudar_fundo'] },
];

let _uid = 0;
const uid = () => (++_uid).toString(36);

// ── Code generator ─────────────────────────────────────────────────────────────
function toCode(program: ProgramBlock[]): string {
  if (program.length === 0) return 'quando_executar {\n  // adiciona blocos aqui\n}';
  const lines = ['quando_executar {'];
  for (const b of program) {
    if (isContainer(b)) {
      lines.push(`  ${DEF[b.kind].label} {`);
      if (b.children.length === 0) lines.push('    // vazio');
      else b.children.forEach(c => lines.push(`    ${DEF[c.kind].label};`));
      lines.push('  }');
    } else {
      lines.push(`  ${DEF[b.kind].label};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

// ── Certificate ────────────────────────────────────────────────────────────────
async function downloadCertificate(
  name: string, title: string, sub: string, body: string,
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;
  // Gradient background
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    doc.setFillColor(Math.round(7 + t * 107), Math.round(9), Math.round(22 + t * 161));
    doc.rect(0, (H / 20) * i, W, H / 20 + 1, 'F');
  }
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 12, W - 24, H - 24, 8, 8, 'F');
  doc.setDrawColor(249, 199, 79); doc.setLineWidth(2);
  doc.roundedRect(12, 12, W - 24, H - 24, 8, 8, 'S');
  doc.setDrawColor(114, 9, 183); doc.setLineWidth(0.5);
  doc.roundedRect(18, 18, W - 36, H - 36, 6, 6, 'S');
  doc.setFontSize(22); doc.text('🤖  ⭐  🎓  ⭐  🤖', W / 2, 40, { align: 'center' });
  doc.setFontSize(16); doc.setTextColor(114, 9, 183); doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(title, W - 60) as string[], W / 2, 58, { align: 'center' });
  doc.setDrawColor(200, 180, 230); doc.setLineWidth(0.5); doc.line(40, 68, W - 40, 68);
  doc.setFontSize(12); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal');
  doc.text(sub, W / 2, 82, { align: 'center' });
  doc.setFontSize(26); doc.setTextColor(26, 26, 46); doc.setFont('helvetica', 'bold');
  const n = name || 'O Pequeno Programador';
  doc.text(n, W / 2, 100, { align: 'center' });
  const nw = doc.getTextWidth(n);
  doc.setDrawColor(249, 199, 79); doc.setLineWidth(1.5);
  doc.line(W / 2 - nw / 2, 104, W / 2 + nw / 2, 104);
  doc.setFontSize(12); doc.setTextColor(70, 70, 70); doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(body, W - 80) as string[], W / 2, 120, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(150, 150, 150);
  doc.text(new Date().toLocaleDateString('pt-PT'), W / 2, H - 22, { align: 'center' });
  doc.setFontSize(16); doc.setTextColor(249, 199, 79);
  [[28, 30], [W - 28, 30], [28, H - 22], [W - 28, H - 22]].forEach(([x, y]) =>
    doc.text('★', x, y, { align: 'center' }),
  );
  doc.save('certificado-academia-espacial.pdf');
}

// ── Component ──────────────────────────────────────────────────────────────────
export function GrandFinale() {
  const t   = useTranslations('lesson20');
  const { user } = useUser();

  // ── Program tree ────────────────────────────────────────────────────────────
  const [program,     setProgram]     = useState<ProgramBlock[]>([]);
  // 'root' = quando_executar is active target; otherwise a container block id
  const [selectedId,  setSelectedId]  = useState<string>('root');

  // ── Execution ────────────────────────────────────────────────────────────────
  const [running,     setRunning]     = useState(false);
  const [activeIds,   setActiveIds]   = useState<Set<string>>(new Set());
  const [bleepClickActive, setBleepClickActive] = useState(false);
  const loopIvs   = useRef<ReturnType<typeof setInterval>[]>([]);
  const bleepCb   = useRef<(() => void) | null>(null);

  // ── Canvas / Physics ────────────────────────────────────────────────────────
  const [objects,     setObjects]     = useState<SpaceObj[]>([]);
  const [bgIndex,     setBgIndex]     = useState(0);
  const [bounceFlash, setBounceFlash] = useState(false);
  const nextObjId = useRef(0);

  // Bleep: physics in ref (RAF-safe), render in state
  const bleepRef  = useRef({ x: CW / 2, y: CH / 2, vx: 0, vy: 0 });
  const [bleepPos, setBleepPos]       = useState({ x: CW / 2, y: CH / 2 });
  const [bleepVictory, setBleepVictory] = useState(false);

  // ── Finish state ────────────────────────────────────────────────────────────
  const [status,      setStatus]      = useState<'idle' | 'success'>('idle');
  const [showHint,    setShowHint]    = useState(false);
  const rafRef = useRef<number>(0);

  // ── Physics engine ───────────────────────────────────────────────────────────
  const startEngine = useCallback(() => {
    if (rafRef.current) return;
    const tick = () => {
      // Bleep
      const b = bleepRef.current;
      let { x, y, vx, vy } = b;
      x += vx; y += vy;
      let hit = false;
      if (x - BLEEP_HALF < 0)  { x = BLEEP_HALF;    vx =  Math.abs(vx); hit = true; }
      if (x + BLEEP_HALF > CW) { x = CW - BLEEP_HALF; vx = -Math.abs(vx); hit = true; }
      if (y - BLEEP_HALF < 0)  { y = BLEEP_HALF;    vy =  Math.abs(vy); hit = true; }
      if (y + BLEEP_HALF > CH) { y = CH - BLEEP_HALF; vy = -Math.abs(vy); hit = true; }
      bleepRef.current = { x, y, vx, vy };
      setBleepPos({ x, y });
      if (hit) { setBounceFlash(true); setTimeout(() => setBounceFlash(false), 120); }

      // Spawned objects
      setObjects(prev => prev.map(o => {
        let { x: ox, y: oy, vx: ovx, vy: ovy, size } = o;
        const h = size / 2;
        ox += ovx; oy += ovy;
        if (ox - h < 0)  { ox = h;      ovx =  Math.abs(ovx); }
        if (ox + h > CW) { ox = CW - h; ovx = -Math.abs(ovx); }
        if (oy - h < 0)  { oy = h;      ovy =  Math.abs(ovy); }
        if (oy + h > CH) { oy = CH - h; ovy = -Math.abs(ovy); }
        return { ...o, x: ox, y: oy, vx: ovx, vy: ovy };
      }));

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopEngine = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  // Always-on engine (tracks Bleep even when idle)
  useEffect(() => { startEngine(); return stopEngine; }, [startEngine, stopEngine]);

  // ── Block management ─────────────────────────────────────────────────────────
  function addBlock(kind: AnyKind) {
    if (running) return;
    if (isContainerKind(kind)) {
      setProgram(prev => [...prev, { id: uid(), kind, children: [] }]);
      setSelectedId('root');
    } else {
      const action: ActionBlock = { id: uid(), kind };
      if (selectedId === 'root') {
        setProgram(prev => [...prev, action]);
      } else {
        setProgram(prev => prev.map(b =>
          isContainer(b) && b.id === selectedId
            ? { ...b, children: [...b.children, action] }
            : b,
        ));
      }
    }
  }

  function removeTop(id: string) {
    if (running) return;
    setProgram(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId('root');
  }

  function removeChild(cid: string, aid: string) {
    if (running) return;
    setProgram(prev => prev.map(b =>
      isContainer(b) && b.id === cid
        ? { ...b, children: b.children.filter(c => c.id !== aid) }
        : b,
    ));
  }

  // ── Action executor (called from run & intervals) ──────────────────────────
  function execAction(block: ActionBlock) {
    switch (block.kind) {
      case 'velocidade_bleep':
        bleepRef.current.vx = BLEEP_VX;
        bleepRef.current.vy = BLEEP_VY;
        break;
      case 'saltar':
        bleepRef.current.vy = -7;
        break;
      case 'mudar_fundo':
        setBgIndex(prev => (prev + 1) % BACKGROUNDS.length);
        break;
      case 'criar_objeto': {
        const type = OBJ_TYPES[Math.floor(Math.random() * OBJ_TYPES.length)];
        const size = OBJ_SIZES[type];
        const h = size / 2;
        setObjects(prev => {
          if (prev.length >= MAX_OBJ) return prev;
          return [...prev, {
            id:   nextObjId.current++,
            type, size,
            x:    Math.random() * (CW - size) + h,
            y:    Math.random() * (CH - size) + h,
            vx:   (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
            vy:   (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
          }];
        });
        break;
      }
    }
  }

  // ── Flash helper: briefly highlights a set of block ids ───────────────────
  function flashIds(ids: string[], durationMs = 350) {
    setActiveIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    setTimeout(() => setActiveIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.delete(id));
      return n;
    }), durationMs);
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  function handleRun() {
    if (running || program.length === 0) return;
    // Clear previous execution
    loopIvs.current.forEach(clearInterval);
    loopIvs.current = [];
    bleepCb.current = null;
    setBleepClickActive(false);
    setActiveIds(new Set());
    setRunning(true);

    const permanentActive: Set<string> = new Set();

    for (const block of program) {
      if (!isContainer(block)) {
        // Top-level action: run once, flash briefly
        execAction(block);
        flashIds([block.id]);
        continue;
      }

      permanentActive.add(block.id);

      if (block.kind === 'repetir_infinito') {
        // Execute children immediately, then every LOOP_MS
        block.children.forEach(c => { execAction(c); permanentActive.add(c.id); });

        const iv = setInterval(() => {
          block.children.forEach(c => execAction(c));
          flashIds(block.children.map(c => c.id), 280);
        }, LOOP_MS);
        loopIvs.current.push(iv);

      } else if (block.kind === 'repetir_10') {
        let count = 0;
        const childIds = block.children.map(c => c.id);
        const iv = setInterval(() => {
          block.children.forEach(c => execAction(c));
          flashIds(childIds, 100);
          count++;
          if (count >= 10) {
            clearInterval(iv);
            loopIvs.current = loopIvs.current.filter(x => x !== iv);
            setActiveIds(prev => { const n = new Set(prev); n.delete(block.id); return n; });
          }
        }, REP10_MS);
        loopIvs.current.push(iv);

      } else if (block.kind === 'ao_clicar_bleep') {
        setBleepClickActive(true);
        bleepCb.current = () => {
          block.children.forEach(c => execAction(c));
          flashIds(block.children.map(c => c.id), 500);
        };
      }
    }

    setActiveIds(permanentActive);
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  function handleClear() {
    loopIvs.current.forEach(clearInterval);
    loopIvs.current = [];
    bleepCb.current = null;
    setBleepClickActive(false);
    // Reset Bleep to centre
    bleepRef.current = { x: CW / 2, y: CH / 2, vx: 0, vy: 0 };
    setBleepPos({ x: CW / 2, y: CH / 2 });
    setObjects([]);
    setProgram([]);
    setSelectedId('root');
    setRunning(false);
    setActiveIds(new Set());
  }

  // ── Finish ─────────────────────────────────────────────────────────────────
  async function handleFinish() {
    if (status === 'success') return;
    setBleepVictory(true);
    const { default: confetti } = await import('canvas-confetti');
    const burst = () => confetti({
      particleCount: 200, spread: 130, origin: { y: 0.55 },
      colors: ['#7209B7', '#F9C74F', '#06D6A0', '#4CC9F0', '#EF233C', '#F77F00'],
    });
    burst(); setTimeout(burst, 300); setTimeout(burst, 650);
    completeLesson(20, 'sticker-master_architect').catch(console.error);
    const name = user?.fullName ?? user?.username ?? 'O Pequeno Programador';
    await downloadCertificate(
      name, t('certificate_title'), t('certificate_sub'), t('certificate_body'),
    );
    setTimeout(() => setStatus('success'), 600);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const codeText         = toCode(program);
  const selectedContainer =
    selectedId === 'root'
      ? null
      : (program.find(b => isContainer(b) && b.id === selectedId) as ContainerBlock | undefined);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const blockGlow = (id: string) =>
    activeIds.has(id)
      ? { animate: { boxShadow: ['0 0 0px #F9C74F', '0 0 14px #F9C74F', '0 0 0px #F9C74F'] },
          transition: { repeat: Infinity, duration: 0.55 } }
      : { animate: { boxShadow: '0 0 0px transparent' } };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-4 py-6 gap-5 max-w-3xl mx-auto pb-28">

      {/* Story card */}
      <div className="card-kids border-kids-yellow w-full">
        <div className="text-4xl mb-1 text-center">🎓</div>
        <h1 className="text-xl font-black text-kids-purple text-center mb-1">{t('title')}</h1>
        <p className="text-gray-600 font-bold text-xs text-center mb-2">{t('story')}</p>
        <p className="text-xs font-black text-kids-yellow bg-kids-yellow/20 rounded-xl px-3 py-1.5 text-center">
          🎯 {t('goal')}
        </p>
      </div>

      {/* ── Main row: Canvas | Palette ── */}
      <div className="w-full flex flex-col lg:flex-row gap-4">

        {/* Physics Canvas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-kids-purple text-sm">{t('canvas_label')}</span>
            <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-lg font-mono">
              {objects.length}/{MAX_OBJ} obj
            </span>
            {running && (
              <span className="text-[10px] bg-kids-green/80 text-white font-black px-2 py-0.5 rounded-lg ml-auto">
                ▶ A correr
              </span>
            )}
          </div>

          <div
            className="relative rounded-2xl overflow-hidden select-none"
            style={{
              width: '100%', aspectRatio: '1 / 1', maxWidth: CW,
              background: BACKGROUNDS[bgIndex],
              border: `4px solid ${bounceFlash ? '#06D6A0' : '#F9C74F'}`,
              boxShadow: bounceFlash ? '0 0 18px #06D6A066' : 'none',
              transition: 'background 0.7s ease, border-color 0.12s, box-shadow 0.12s',
            }}
          >
            {/* Star backdrop */}
            {Array.from({ length: 22 }, (_, i) => (
              <div key={i} className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  width: i % 6 === 0 ? 3 : 2, height: i % 6 === 0 ? 3 : 2,
                  left: `${(i * 37 + 11) % 97}%`, top: `${(i * 23 + 7) % 91}%`,
                  opacity: 0.12 + (i % 5) * 0.06,
                }} />
            ))}

            {/* Spawned objects */}
            {objects.map(o => (
              <div key={o.id}
                className="absolute pointer-events-none flex items-center justify-center"
                style={{
                  left: `${(o.x / CW) * 100}%`, top: `${(o.y / CH) * 100}%`,
                  width: o.size, height: o.size, fontSize: o.size * 0.85,
                  transform: 'translate(-50%,-50%)', zIndex: 5,
                }}>
                {OBJ_EMOJIS[o.type]}
              </div>
            ))}

            {/* Bleep — always visible, always interactive */}
            <motion.button
              className="absolute flex items-center justify-center z-10"
              style={{
                left: `${(bleepPos.x / CW) * 100}%`,
                top:  `${(bleepPos.y / CH) * 100}%`,
                width: BLEEP_HALF * 2, height: BLEEP_HALF * 2,
                fontSize: BLEEP_HALF * 1.5,
                transform: 'translate(-50%,-50%)',
                background: 'none', border: 'none', padding: 0,
                filter: bleepClickActive
                  ? 'drop-shadow(0 0 8px #06D6A0) drop-shadow(0 0 4px #fff)'
                  : undefined,
                cursor: bleepClickActive ? 'pointer' : 'default',
              }}
              whileTap={bleepClickActive ? { scale: 1.5 } : {}}
              onClick={() => bleepCb.current?.()}
              title={bleepClickActive ? t('click_bleep_hint') : 'Bleep 🤖'}
            >
              {bleepVictory ? '🥳' : '🤖'}
            </motion.button>

            {/* BG name pill */}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg pointer-events-none">
              {t(BG_KEYS[bgIndex])}
            </div>
          </div>

          {/* Canvas action buttons */}
          <div className="flex gap-2 mt-2">
            <motion.button
              onClick={handleRun}
              disabled={program.length === 0 || running}
              whileTap={{ scale: 0.94 }}
              className="flex-1 btn-chunky bg-kids-purple text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {running ? '⏳ A executar…' : t('button_run')}
            </motion.button>
            <motion.button
              onClick={handleClear}
              whileTap={{ scale: 0.94 }}
              className="btn-chunky bg-white text-gray-500 border-4 border-gray-300 text-sm"
            >
              {t('button_clear')}
            </motion.button>
          </div>
        </div>

        {/* ── Artist's Palette ── */}
        <div className="flex flex-col gap-3 lg:w-56">
          <p className="font-black text-kids-purple text-sm">🎨 {t('palette_label')}</p>

          {PALETTE_CATS.map(({ icon, key, kinds }) => (
            <div key={key}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {icon} {t(key)}
              </p>
              <div className="flex flex-col gap-1">
                {kinds.map(kind => {
                  const d = DEF[kind];
                  const isCont = isContainerKind(kind);
                  return (
                    <motion.button
                      key={kind}
                      onClick={() => addBlock(kind)}
                      disabled={running}
                      whileTap={{ scale: 0.91 }}
                      whileHover={{ scale: 1.04 }}
                      className={`w-full px-2.5 py-2 rounded-xl font-mono font-black text-[10px]
                        border-2 shadow-chunky select-none text-left leading-tight
                        disabled:opacity-40 disabled:cursor-not-allowed ${d.tw}`}
                      style={{ borderColor: 'rgba(255,255,255,0.25)' }}
                    >
                      {d.emoji}{' '}
                      {isCont ? `${d.label} { }` : `${d.label};`}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Hint */}
          <button
            onClick={() => setShowHint(h => !h)}
            className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-sm mt-1"
          >
            💡 {t('button_hint')}
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              >
                <div className="bg-kids-yellow/20 border-2 border-kids-yellow rounded-xl p-3 text-xs font-bold text-gray-700">
                  💡 {t('hint')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Program Builder ── */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-black text-kids-purple text-sm">📋 {t('editor_label')}</p>
          {selectedContainer && (
            <span className="text-[10px] font-bold text-kids-green bg-kids-green/10 border border-kids-green/30 rounded-lg px-2 py-0.5">
              ▸ {t('add_inside_hint')}: {DEF[selectedContainer.kind].label}
            </span>
          )}
          {selectedId === 'root' && program.length > 0 && !selectedContainer && (
            <span className="text-[10px] font-bold text-kids-yellow/60">
              {t('select_root_hint')}
            </span>
          )}
        </div>

        {/* Editor area */}
        <div
          className="bg-gray-950 rounded-2xl p-3 min-h-[140px] cursor-pointer"
          onClick={e => { if (e.target === e.currentTarget) setSelectedId('root'); }}
        >
          {/* quando_executar header — click to select root */}
          <button
            onClick={() => setSelectedId('root')}
            className={`flex items-center gap-2 font-mono text-sm font-black mb-2 w-full text-left
              rounded-lg px-2 py-1 transition-colors ${
              selectedId === 'root'
                ? 'bg-kids-yellow/20 text-kids-yellow'
                : 'text-kids-yellow/50 hover:text-kids-yellow/80'
            }`}
          >
            <span>🌐</span>
            <span>quando_executar {'{'}</span>
            {selectedId === 'root' && (
              <span className="text-[10px] text-kids-yellow/50 ml-auto font-normal">
                ▸ {t('select_root_hint')}
              </span>
            )}
          </button>

          {/* Blocks */}
          {program.length === 0 ? (
            <p className="text-gray-600 text-xs italic pl-4 py-1">{t('editor_empty')}</p>
          ) : (
            <div className="flex flex-col gap-2 pl-2">
              {program.map(block => {
                const d = DEF[block.kind];
                const isAct = activeIds.has(block.id);

                if (isContainer(block)) {
                  const isSel = selectedId === block.id;
                  return (
                    <motion.div
                      key={block.id}
                      {...blockGlow(block.id)}
                      className={`rounded-xl border-2 overflow-hidden transition-colors ${
                        isAct ? 'border-kids-yellow' : isSel ? 'border-kids-green' : 'border-gray-700'
                      }`}
                    >
                      {/* Container header — click to select */}
                      <button
                        onClick={() => setSelectedId(isSel ? 'root' : block.id)}
                        className={`flex items-center gap-2 w-full text-left px-2.5 py-2 font-mono text-xs font-black ${d.tw}`}
                      >
                        <span>{d.emoji}</span>
                        <span className="flex-1">{d.label} {'{'}</span>
                        {isSel && <span className="text-white/50 text-[9px]">▸</span>}
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); removeTop(block.id); }}
                          className="text-white/40 hover:text-white ml-2 px-1 font-bold"
                        >✕</span>
                      </button>

                      {/* Children */}
                      <div className="bg-gray-900 px-3 py-2 flex flex-col gap-1.5">
                        {block.children.length === 0 ? (
                          <p className={`text-[10px] italic ${isSel ? 'text-kids-green/50' : 'text-gray-600'}`}>
                            {isSel ? `▸ ${t('drop_here')}` : t('empty_container')}
                          </p>
                        ) : (
                          block.children.map(child => {
                            const cd = DEF[child.kind];
                            return (
                              <motion.div
                                key={child.id}
                                {...blockGlow(child.id)}
                                className={`flex items-center gap-2 px-2 py-1 rounded-lg
                                  text-[10px] font-mono font-black ${cd.tw}`}
                              >
                                <span>{cd.emoji}</span>
                                <span className="flex-1">{cd.label};</span>
                                <span
                                  role="button"
                                  onClick={() => removeChild(block.id, child.id)}
                                  className="text-white/40 hover:text-white px-1"
                                >✕</span>
                              </motion.div>
                            );
                          })
                        )}
                        {isSel && (
                          <p className="text-kids-green/40 text-[9px] font-bold pt-0.5">
                            + {t('click_palette_hint')}
                          </p>
                        )}
                      </div>

                      <div className="bg-gray-950 px-2.5 py-1 font-mono text-xs text-gray-600">{'}'}</div>
                    </motion.div>
                  );
                }

                // Top-level action block
                return (
                  <motion.div
                    key={block.id}
                    {...blockGlow(block.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl
                      text-xs font-mono font-black ${d.tw}`}
                  >
                    <span>{d.emoji}</span>
                    <span className="flex-1">{d.label};</span>
                    <span
                      role="button"
                      onClick={() => removeTop(block.id)}
                      className="text-white/40 hover:text-white px-1"
                    >✕</span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* quando_executar close */}
          <div className="font-mono text-sm font-black text-kids-yellow/40 pl-2 mt-1.5">{'}'}</div>
        </div>
      </div>

      {/* ── Código Executado (indented text) ── */}
      <div className="w-full">
        <p className="font-black text-kids-yellow text-[10px] uppercase tracking-widest mb-1">
          📝 {t('log_label')}
        </p>
        <pre className="bg-gray-950 rounded-xl p-4 text-xs font-mono text-green-400 overflow-x-auto leading-relaxed whitespace-pre">
          {codeText}
        </pre>
      </div>

      {/* ── Finalizar Curso ── */}
      <div className="w-full flex flex-col items-center gap-3 pt-4 border-t-2 border-dashed border-kids-yellow/30">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">
          Pronto para te formar? · Ready to graduate?
        </p>
        <motion.button
          onClick={handleFinish}
          disabled={status === 'success'}
          whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.04 }}
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
