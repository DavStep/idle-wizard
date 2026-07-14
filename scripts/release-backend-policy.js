export function shouldPublishBackend(
  mode,
  {
    backendChangesInWorktree = false,
    backendChangedSinceLastRelease = false,
  } = {},
) {
  if (mode === 'skip') {
    return false;
  }

  if (mode === 'always') {
    return true;
  }

  if (mode !== 'auto') {
    throw new Error(`Unknown backend mode: ${mode}. Use auto, always, or skip.`);
  }

  return backendChangesInWorktree || backendChangedSinceLastRelease;
}
