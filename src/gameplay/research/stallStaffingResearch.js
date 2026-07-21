export const stallStaffingMaxStalls = 5;
export const stallStaffingBatchSize = 2;

export const stallStaffingResearchIds = Object.freeze({
  capacity: (stallNumber) => `advanced:stallStaffing:${stallNumber}`,
});

export function getStallBatchSize({ stallNumber, completedResearchIds = [] } = {}) {
  return completedResearchIds.includes(stallStaffingResearchIds.capacity(stallNumber))
    ? stallStaffingBatchSize
    : 1;
}
