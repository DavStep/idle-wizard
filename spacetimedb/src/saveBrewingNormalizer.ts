type SaveCauldronAutomationState = {
  autoBrewEnabled: boolean;
  autoBrewArmed: boolean;
  autoBrewRecipeKey: string | null;
};

export function normalizeSaveCauldronAutomationState({
  autoBrewEnabled,
  autoBrewArmed,
  autoBrewRecipeKey,
}: {
  autoBrewEnabled: unknown;
  autoBrewArmed: unknown;
  autoBrewRecipeKey: string | null;
}): SaveCauldronAutomationState {
  const enabled = Boolean(autoBrewRecipeKey && autoBrewEnabled);
  const armed = autoBrewArmed === undefined ? enabled : Boolean(enabled && autoBrewArmed);

  return {
    autoBrewEnabled: enabled,
    autoBrewArmed: armed,
    autoBrewRecipeKey,
  };
}
