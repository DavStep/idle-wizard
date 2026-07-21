import { PAGE_UNLOCK_REQUIREMENTS } from '../../managers/PageUnlockManager.js';
import {
  WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL,
  WORKSHOP_INBOX_UNLOCK_LEVEL,
  WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
  WORKSHOP_SECONDARY_ACTION_UNLOCK_LEVEL,
} from './WorkshopSecondaryActionGateManager.js';

const TOTAL_PAYOFFS = [
  {
    key: 'maxGardenTiles',
    label: 'garden plots',
    suppressWhenUnlocks: 'garden',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} garden plot${delta === 1 ? '' : 's'}`,
  },
  {
    key: 'maxCauldrons',
    label: 'cauldrons',
    suppressWhenUnlocks: 'brewing',
    formatValue: (delta) => `+${formatNumber(delta)}`,
    formatNotice: (delta) => `+${formatNumber(delta)} cauldron${delta === 1 ? '' : 's'}`,
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
    label: 'mana capacity',
    formatValue: (delta) => `+${formatNumber(delta)} mana`,
    formatNotice: (delta) => `+${formatNumber(delta)} mana capacity`,
  },
  {
    key: 'manaPerSecond',
    label: 'mana regeneration',
    formatValue: (delta) => `+${formatNumber(delta)}/sec mana`,
    formatNotice: (delta) => `+${formatNumber(delta)}/sec mana regeneration`,
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
    requiredLevel: WORKSHOP_INBOX_UNLOCK_LEVEL,
    values: ['inbox'],
  },
  {
    requiredLevel: WORKSHOP_PRESTIGE_ACTION_UNLOCK_LEVEL,
    values: ['prestige'],
  },
];

export function getLevelPayoffRows(snapshot, { fromLevel, toLevel } = {}) {
  const levelBefore = normalizeLevel(fromLevel, { allowZero: true });
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

function getUnlockRows(levelBefore, levelAfter) {
  const unlocks = dedupeUnlocksByValue([
    ...getPageUnlocks(levelBefore, levelAfter),
    ...getWorkshopUnlocks(levelBefore, levelAfter),
  ]);

  if (!unlocks.length) {
    return [];
  }

  const unlockValues = unlocks.map((unlock) => unlock.value);
  const valueLinePageIds = unlocks.reduce((pageIds, unlock) => {
    if (unlock.pageId) {
      pageIds[unlock.value] = unlock.pageId;
    }

    return pageIds;
  }, {});
  const valueLineNotices = unlocks.reduce((notices, unlock) => {
    notices[unlock.value] = unlock.notice;

    return notices;
  }, {});

  return [
    {
      label: 'unlocks',
      value: unlockValues.join(', '),
      valueLines: unlockValues,
      ...(Object.keys(valueLinePageIds).length > 0 ? { valueLinePageIds } : {}),
      valueLineNotices,
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
  return Object.entries(PAGE_UNLOCK_REQUIREMENTS)
    .filter(
      ([, unlock]) =>
        Number.isInteger(unlock.requiredLevel) &&
        levelBefore < unlock.requiredLevel &&
        levelAfter >= unlock.requiredLevel,
    )
    .map(([pageId, unlock]) => {
      const value = unlock.label ?? 'room';
      return {
        pageId,
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
  const unlockedPageIds = getUnlockedPageIds(levelBefore, levelAfter);

  if (!nextTotals) {
    return [];
  }

  return TOTAL_PAYOFFS.map((payoff) => {
    if (payoff.suppressWhenUnlocks && unlockedPageIds.has(payoff.suppressWhenUnlocks)) {
      return null;
    }

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
      label: 'bonus',
      value: `+${formatNumber(amount)} crystal`,
      notice: `+${formatNumber(amount)} crystal`,
    },
  ];
}

function getUnlockedPageIds(levelBefore, levelAfter) {
  return new Set(
    Object.entries(PAGE_UNLOCK_REQUIREMENTS)
      .filter(
        ([, unlock]) =>
          Number.isInteger(unlock.requiredLevel) &&
          levelBefore < unlock.requiredLevel &&
          levelAfter >= unlock.requiredLevel,
      )
      .map(([pageId]) => pageId),
  );
}

function getLevelTotals(snapshot, level) {
  return getLevelSnapshot(snapshot, level)?.totals ?? null;
}

function getLevelSnapshot(snapshot, level) {
  const levels = Array.isArray(snapshot?.playerLevel?.levels) ? snapshot.playerLevel.levels : [];
  return levels.find((entry) => entry?.level === level) ?? null;
}

function normalizeLevel(level, { allowZero = false, fallback = 1 } = {}) {
  const normalizedLevel = Math.floor(Number(level));
  const minimumLevel = allowZero ? 0 : 1;

  if (!Number.isInteger(normalizedLevel) || normalizedLevel < minimumLevel) {
    return fallback;
  }

  return normalizedLevel;
}

function roundNumber(value) {
  return Number(value.toFixed(4));
}

function formatNumber(value) {
  return String(roundNumber(value));
}
