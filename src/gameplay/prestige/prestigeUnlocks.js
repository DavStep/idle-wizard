export const prestigeUnlockIds = Object.freeze({
  advancedCapacity: 'advancedCapacity',
  runFocus: 'runFocus',
  automationReserveControls: 'automationReserveControls',
  strongerRoomStudies: 'strongerRoomStudies',
});

export const prestigeRunFocusOptions = Object.freeze([
  { id: 'none', label: 'none' },
  { id: 'capacity', label: 'capacity' },
  { id: 'automation', label: 'automation' },
  { id: 'research', label: 'research' },
  { id: 'market', label: 'market' },
]);

export const prestigeUnlocks = Object.freeze([
  {
    id: prestigeUnlockIds.advancedCapacity,
    count: 1,
    label: 'advanced capacity path',
    rewards: ['plot and cauldron capacity studies'],
  },
  {
    id: prestigeUnlockIds.runFocus,
    count: 3,
    label: 'run focus',
    rewards: ['current-run research focus selector'],
  },
  {
    id: prestigeUnlockIds.automationReserveControls,
    count: 4,
    label: 'automation reserve controls',
    rewards: ['auto summon reserve presets'],
  },
  {
    id: prestigeUnlockIds.strongerRoomStudies,
    count: 5,
    label: 'stronger room studies',
    rewards: ['advanced room study levels 6-10'],
  },
]);

export function getPrestigeUnlocksSnapshot(completedCount = 0) {
  const safeCount = normalizePrestigeCount(completedCount);
  const nextUnlockCount = prestigeUnlocks.find((unlock) => unlock.count > safeCount)?.count;

  return prestigeUnlocks.map((unlock) => ({
    ...unlock,
    unlocked: safeCount >= unlock.count,
    next: unlock.count === nextUnlockCount,
  }));
}

export function hasPrestigeUnlock(completedCount = 0, unlockId) {
  const unlock = prestigeUnlocks.find((candidate) => candidate.id === unlockId);

  return Boolean(unlock) && normalizePrestigeCount(completedCount) >= unlock.count;
}

export function normalizePrestigeRunFocus(focusId) {
  const normalized = String(focusId ?? '').trim();

  return prestigeRunFocusOptions.some((option) => option.id === normalized)
    ? normalized
    : 'none';
}

export function normalizePrestigeCount(count = 0) {
  const safeCount = Math.floor(Number(count));

  return Number.isFinite(safeCount) && safeCount > 0 ? safeCount : 0;
}
