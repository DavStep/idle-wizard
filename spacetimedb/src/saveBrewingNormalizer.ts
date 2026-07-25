type SaveCauldronAutomationState = {
  autoBrewEnabled: boolean;
  autoBrewArmed: boolean;
  autoBrewRecipeKey: string | null;
  autoCollectEnabled: boolean;
};

export function normalizeSaveCauldronAutomationState({
  autoBrewEnabled,
  autoBrewArmed,
  autoBrewRecipeKey,
  autoCollectEnabled,
}: {
  autoBrewEnabled: unknown;
  autoBrewArmed: unknown;
  autoBrewRecipeKey: string | null;
  autoCollectEnabled?: unknown;
}): SaveCauldronAutomationState {
  const enabled = Boolean(autoBrewRecipeKey && autoBrewEnabled);
  const armed = autoBrewArmed === undefined ? enabled : Boolean(enabled && autoBrewArmed);

  return {
    autoBrewEnabled: enabled,
    autoBrewArmed: armed,
    autoBrewRecipeKey,
    autoCollectEnabled: Boolean(enabled && autoCollectEnabled),
  };
}
