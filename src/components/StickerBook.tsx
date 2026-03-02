'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Badge catalogue
// ---------------------------------------------------------------------------
type Tier = 'gold' | 'diamond' | 'special';

interface BadgeDef {
  id: string;
  lesson: number;
  tier: Tier;
  emoji: string;
}

const ALL_BADGES: BadgeDef[] = [
  { id: 'chef_logic',       lesson: 1,  tier: 'gold',    emoji: '👨‍🍳' },
  { id: 'weather_wizard',   lesson: 2,  tier: 'gold',    emoji: '🌦️' },
  { id: 'loop_dancer',      lesson: 3,  tier: 'gold',    emoji: '💃' },
  { id: 'magic_box',        lesson: 4,  tier: 'gold',    emoji: '📦' },
  { id: 'backpack_pro',     lesson: 5,  tier: 'gold',    emoji: '🎒' },
  { id: 'func_hero',        lesson: 6,  tier: 'gold',    emoji: '⚡' },
  { id: 'click_master',     lesson: 7,  tier: 'gold',    emoji: '👆' },
  { id: 'bug_detective',    lesson: 8,  tier: 'gold',    emoji: '🔍' },
  { id: 'map_explorer',     lesson: 9,  tier: 'gold',    emoji: '🗺️' },
  { id: 'game_master',      lesson: 10, tier: 'gold',    emoji: '🎮' },
  { id: 'secret_coder',     lesson: 11, tier: 'diamond', emoji: '🔐' },
  { id: 'data_librarian',   lesson: 12, tier: 'diamond', emoji: '📚' },
  { id: 'castle_guard',     lesson: 13, tier: 'diamond', emoji: '🏰' },
  { id: 'moon_jumper',      lesson: 14, tier: 'diamond', emoji: '🌙' },
  { id: 'clone_commander',  lesson: 15, tier: 'diamond', emoji: '👥' },
  { id: 'race_driver',      lesson: 16, tier: 'diamond', emoji: '🏎️' },
  { id: 'ai_trainer',       lesson: 17, tier: 'diamond', emoji: '🤖' },
  { id: 'logic_path',       lesson: 18, tier: 'diamond', emoji: '🔀' },
  { id: 'world_builder',    lesson: 19, tier: 'diamond', emoji: '🌍' },
  { id: 'master_architect', lesson: 20, tier: 'special', emoji: '🏆' },
];

const GOLD_BADGES    = ALL_BADGES.filter(b => b.tier === 'gold');
const DIAMOND_BADGES = ALL_BADGES.filter(b => b.tier === 'diamond');
const SPECIAL_BADGES = ALL_BADGES.filter(b => b.tier === 'special');

// ---------------------------------------------------------------------------
// Tier border styles
// ---------------------------------------------------------------------------
const TIER_BORDER: Record<Tier, string> = {
  gold:    'border-kids-yellow shadow-[0_0_14px_rgba(249,199,79,0.55)]',
  diamond: 'border-kids-blue   shadow-[0_0_14px_rgba(76,201,240,0.55)]',
  special: 'border-kids-purple shadow-[0_0_18px_rgba(114,9,183,0.65)]',
};

const TIER_BG: Record<Tier, string> = {
  gold:    'bg-kids-yellow/10',
  diamond: 'bg-kids-blue/10',
  special: 'bg-kids-purple/10',
};

// ---------------------------------------------------------------------------
// BadgeCard
// ---------------------------------------------------------------------------
function BadgeCard({
  badge,
  earned,
  onSelect,
  t,
}: {
  badge: BadgeDef;
  earned: boolean;
  onSelect: (b: BadgeDef) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const name = t(`badges.${badge.id}.name`);

  return (
    <motion.button
      whileHover={{ scale: earned ? 1.08 : 1.03, y: earned ? -3 : 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(badge)}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-4
        w-28 sm:w-32 cursor-pointer select-none transition-colors
        ${earned
          ? `${TIER_BORDER[badge.tier]} ${TIER_BG[badge.tier]}`
          : 'border-gray-200 bg-gray-50'
        }`}
      aria-label={earned ? name : `Locked: ${name}`}
    >
      {/* Emoji */}
      <span
        className={`text-4xl sm:text-5xl leading-none ${!earned ? 'grayscale opacity-30' : ''}`}
      >
        {badge.emoji}
      </span>

      {/* Name */}
      <p className={`font-black text-xs text-center leading-tight
        ${earned ? 'text-gray-800' : 'text-gray-300'}`}
      >
        {earned ? name : '???'}
      </p>

      {/* Lesson number chip */}
      <span className={`text-xs font-black rounded-full px-2 py-0.5
        ${earned
          ? badge.tier === 'gold'    ? 'bg-kids-yellow text-kids-purple'
          : badge.tier === 'diamond' ? 'bg-kids-blue text-white'
          :                            'bg-kids-purple text-white'
          : 'bg-gray-200 text-gray-400'
        }`}
      >
        L{badge.lesson}
      </span>

      {/* Lock overlay */}
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
          <span className="text-2xl opacity-25">🔒</span>
        </div>
      )}

      {/* Earned sparkle */}
      {earned && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 14 }}
          className="absolute -top-2 -right-2 text-base leading-none"
        >
          ✨
        </motion.span>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// BadgePopup
// ---------------------------------------------------------------------------
function BadgePopup({
  badge,
  earned,
  onClose,
  t,
}: {
  badge: BadgeDef | null;
  earned: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <AnimatePresence>
      {badge && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.75, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-6"
          >
            <div className={`bg-white rounded-3xl border-4 p-8 max-w-sm w-full text-center
              shadow-2xl ${TIER_BORDER[badge.tier]}`}
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
                className="text-8xl mb-4"
              >
                {badge.emoji}
              </motion.div>

              <h2 className="text-2xl font-black text-kids-purple mb-2">
                {earned ? t(`badges.${badge.id}.name`) : '???'}
              </h2>

              <p className="font-bold text-gray-600 text-sm leading-relaxed mb-6">
                {earned
                  ? t(`badges.${badge.id}.description`)
                  : t('stickerBook.locked', { n: badge.lesson })
                }
              </p>

              {earned && (
                <div className="inline-block bg-kids-green/20 text-green-700 font-black
                  text-sm rounded-full px-4 py-1 border-2 border-kids-green mb-4">
                  ✅ {t('stickerBook.earned')}
                </div>
              )}

              <br />
              <button
                onClick={onClose}
                className="btn-chunky bg-kids-purple text-white mt-2"
              >
                {t('stickerBook.close')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Tier section
// ---------------------------------------------------------------------------
function TierSection({
  label,
  badges,
  earnedSet,
  onSelect,
  t,
}: {
  label: string;
  badges: BadgeDef[];
  earnedSet: Set<string>;
  onSelect: (b: BadgeDef) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <section className="w-full">
      <h2 className="font-black text-gray-600 text-sm uppercase tracking-widest mb-4">
        {label}
      </h2>
      <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
        {badges.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <BadgeCard
              badge={badge}
              earned={earnedSet.has(badge.id)}
              onSelect={onSelect}
              t={t}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main StickerBook component
// ---------------------------------------------------------------------------
export function StickerBook({
  earnedBadges,
}: {
  earnedBadges: string[];
}) {
  const t = useTranslations();
  const earnedSet = new Set(earnedBadges);

  const [selected, setSelected] = useState<BadgeDef | null>(null);

  const earnedCount = ALL_BADGES.filter(b => earnedSet.has(b.id)).length;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 pb-24 flex flex-col gap-8">

      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-3">🏅</div>
        <h1 className="text-3xl font-black text-kids-purple mb-2">
          {t('stickerBook.title')}
        </h1>
        <p className="text-gray-500 font-bold text-base mb-4">
          {t('stickerBook.subtitle')}
        </p>

        {/* Overall progress */}
        <div className="inline-flex items-center gap-3 bg-white border-4 border-kids-yellow
          rounded-2xl px-5 py-3 shadow-sm">
          <span className="text-2xl">🪙</span>
          <div className="text-left">
            <p className="font-black text-kids-purple text-lg leading-none">
              {earnedCount} / {ALL_BADGES.length}
            </p>
            <p className="font-bold text-gray-400 text-xs">badges collected</p>
          </div>
          <div className="w-28 bg-gray-100 rounded-full h-3 border border-gray-200 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-kids-yellow to-kids-orange rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / ALL_BADGES.length) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {earnedCount === 0 && (
          <p className="text-gray-400 font-bold text-sm mt-4">
            {t('stickerBook.no_badges')}
          </p>
        )}
      </div>

      {/* Gold tier */}
      <TierSection
        label={t('stickerBook.tier_gold')}
        badges={GOLD_BADGES}
        earnedSet={earnedSet}
        onSelect={setSelected}
        t={t}
      />

      {/* Diamond tier */}
      <TierSection
        label={t('stickerBook.tier_diamond')}
        badges={DIAMOND_BADGES}
        earnedSet={earnedSet}
        onSelect={setSelected}
        t={t}
      />

      {/* Special tier */}
      <TierSection
        label={t('stickerBook.tier_special')}
        badges={SPECIAL_BADGES}
        earnedSet={earnedSet}
        onSelect={setSelected}
        t={t}
      />

      {/* Popup */}
      <BadgePopup
        badge={selected}
        earned={selected ? earnedSet.has(selected.id) : false}
        onClose={() => setSelected(null)}
        t={t}
      />
    </div>
  );
}
