import { PAGE_UNLOCK_REQUIREMENTS } from '../../managers/PageUnlockManager.js';
import {
  WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL,
  WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
  WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL,
} from './WorkshopSecondaryActionGateManager.js';

const TOTAL_PAYOFFS = [
  {
    key: 'maxGardenTiles',
    label: 'garden plots',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} garden plot${delta === 1 ? '' : 's'}`,
  },
  {
    key: 'maxNpcMarketStands',
    label: 'trader stands',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} trader stand${delta === 1 ? '' : 's'}`,
  },
  {
    key: 'maxPlayerMarketStands',
    label: 'player stands',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} player stand${delta === 1 ? '' : 's'}`,
  },
  {
    key: 'maxManaCap',
    label: 'mana cap',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} mana cap`,
  },
  {
    key: 'manaPerSecond',
    label: 'mana regen',
    formatValue: (delta) => `+${formatNumber(delta)}/sec`,
    formatNotice: (delta) => `+${formatNumber(delta)}/sec mana regen`,
  },
];

const WORKSHOP_UNLOCKS = [
  {
    requiredLevel: WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL,
    values: ['leaderboard'],
  },
  {
    requiredLevel: WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL,
    values: ['discoveries', 'alliance'],
  },
  {
    requiredLevel: WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
    values: ['prestige'],
  },
];

export function getLevelPayoffRows(snapshot, { fromLevel, toLevel } = {}) {
  const levelBefore = normalizeLevel(fromLevel);
  const levelAfter = normalizeLevel(toLevel ?? levelBefore + 1);

  if (levelAfter <= levelBefore) {
    return [];
  }

  return [
    ...getUnlockRows(levelBefore, levelAfter),
    ...getPlayerLevelDeltaRows(snapshot, levelBefore, levelAfter),
    ...getCrystalRows(snapshot, levelAfter),
  ];
}

export function formatLevelUpNotice(level, rows = []) {
  const safeLevel = normalizeLevel(level);
  const notices = rows
    .map((row) => row?.notice)
    .filter((notice) => typeof notice === 'string' && notice.length > 0);

  if (notices.length <= 0) {
    return `level ${safeLevel} reached`;
  }

  return `level ${safeLevel} reached: ${notices.join(', ')}`;
}

function getUnlockRows(levelBefore, levelAfter) {
  const unlocks = dedupeUnlocksByValue([
    ...getPageUnlocks(levelBefore, levelAfter),
    ...getWorkshopUnlocks(levelBefore, levelAfter),
  ]);

  if (!unlocks.length) {
    return [];
  }

  const unlockValues = unlocks.map((unlock) => unlock.value);

  return [
    {
      label: 'unlocks',
      value: unlockValues.join(', '),
      valueLines: unlockValues,
      notice: unlocks.map((unlock) => unlock.notice).join(', '),
    },
  ];
}

function dedupeUnlocksByValue(unlocks) {
  const seenValues = new Set();

  return unlocks.filter((unlock) => {
    if (!unlock?.value || seenValues.has(unlock.value)) {
      return false;
    }

    seenValues.add(unlock.value);
    return true;
  });
}

function getPageUnlocks(levelBefore, levelAfter) {
  return Object.values(PAGE_UNLOCK_REQUIREMENTS)
    .filter(
      (unlock) =>
        Number.isInteger(unlock.requiredLevel) &&
        levelBefore < unlock.requiredLevel &&
        levelAfter >= unlock.requiredLevel,
    )
    .map((unlock) => {
      const value = unlock.label ?? 'room';
      return {
        value,
        notice: `${value} unlocked`,
      };
    });
}

function getWorkshopUnlocks(levelBefore, levelAfter) {
  return WORKSHOP_UNLOCKS.filter(
    (unlock) => levelBefore < unlock.requiredLevel && levelAfter >= unlock.requiredLevel,
  ).flatMap((unlock) =>
    unlock.values.map((value) => ({
      value,
      notice: `${value} available`,
    })),
  );
}

function getPlayerLevelDeltaRows(snapshot, levelBefore, levelAfter) {
  const previousTotals = getLevelTotals(snapshot, levelBefore);
  const nextTotals = getLevelTotals(snapshot, levelAfter);

  if (!nextTotals) {
    return [];
  }

  return TOTAL_PAYOFFS.map((payoff) => {
    const nextValue = Number(nextTotals[payoff.key]);
    const previousValue = Number(previousTotals?.[payoff.key] ?? 0);
    const delta = roundNumber(nextValue - previousValue);

    if (!Number.isFinite(delta) || delta <= 0) {
      return null;
    }

    return {
      label: payoff.label,
      value: payoff.formatValue(delta),
      notice: payoff.formatNotice(delta),
    };
  }).filter(Boolean);
}

function getCrystalRows(snapshot, levelAfter) {
  const levelSnapshot = getLevelSnapshot(snapshot, levelAfter);
  const reward = (levelSnapshot?.effects ?? [])
    .map((effect) => /^crystal reward ([\d.]+)$/.exec(effect))
    .find(Boolean);
  const amount = reward ? Number(reward[1]) : 0;

  if (!Number.isFinite(amount) || amount <= 0) {
    return [];
  }

  return [
    {
      label: 'crystal',
      value: `+${formatNumber(amount)}`,
      notice: `+${formatNumber(amount)} crystal`,
    },
  ];
}

function getLevelTotals(snapshot, level) {
  return getLevelSnapshot(snapshot, level)?.totals ?? null;
}

function getLevelSnapshot(snapshot, level) {
  const levels = Array.isArray(snapshot?.playerLevel?.levels) ? snapshot.playerLevel.levels : [];
  return levels.find((entry) => entry?.level === level) ?? null;
}

function normalizeLevel(level) {
  if (!Number.isInteger(level) || level <= 0) {
    return 1;
  }

  return level;
}

function roundNumber(value) {
  return Number(value.toFixed(4));
}

function formatNumber(value) {
  return String(roundNumber(value));
}
