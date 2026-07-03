export const prestigeUnlockIds = Object.freeze({
  advancedCapacity: 'advancedCapacity',
  researchQueueSlot: 'researchQueueSlot',
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
    id: prestigeUnlockIds.researchQueueSlot,
    count: 2,
    label: 'research queue slot',
    rewards: ['one extra timed research slot'],
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

  return prestigeUnlocks.map((unlock) => ({
    ...unlock,
    unlocked: safeCount >= unlock.count,
    next: safeCount + 1 === unlock.count,
  }));
}

export function hasPrestigeUnlock(completedCount = 0, unlockId) {
  const unlock = prestigeUnlocks.find((candidate) => candidate.id === unlockId);

  return Boolean(unlock) && normalizePrestigeCount(completedCount) >= unlock.count;
}

export function getResearchSlotLimit(completedCount = 0) {
  return hasPrestigeUnlock(completedCount, prestigeUnlockIds.researchQueueSlot) ? 2 : 1;
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
