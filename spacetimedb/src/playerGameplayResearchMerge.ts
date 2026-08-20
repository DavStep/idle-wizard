type SaveRecord = Record<string, unknown>;

export function normalizeResearchForSaveMerge<T>({
  save,
  normalizePrestige,
  normalizeResearch,
}: {
  save: SaveRecord;
  normalizePrestige: (value: unknown) => { completedLevels: unknown[] };
  normalizeResearch: (value: unknown, prestigeCount?: number) => T;
}): { prestigeCount: number; research: T } {
  const completedLevels = normalizePrestige(save.prestige).completedLevels;
  const prestigeCount = Array.isArray(completedLevels) ? completedLevels.length : 0;

  return {
    prestigeCount,
    research: normalizeResearch(save.research, prestigeCount),
  };
}
