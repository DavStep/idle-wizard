export const BrewingCauldron = {
  cauldronIndex: [],
};

export const BrewingCauldronIngredient = {
  cauldronIndex: [],
  slotIndex: [],
  itemTypeId: [],
};

export const ActiveBrew = {
  cauldronIndex: [],
  resultItemTypeId: [],
  resultQuantity: [],
  phase: [],
  totalSeconds: [],
  remainingSeconds: [],
  bottlingTotalSeconds: [],
};

export const activeBrewPhases = {
  brewing: 1,
  brewed: 2,
  bottling: 3,
  ready: 4,
};

export const activeBrewPhaseLabels = {
  [activeBrewPhases.brewing]: 'brewing',
  [activeBrewPhases.brewed]: 'brewed',
  [activeBrewPhases.bottling]: 'bottling',
  [activeBrewPhases.ready]: 'ready',
};
