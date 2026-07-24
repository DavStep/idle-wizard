export function classifyExistingPreview({
  portListening,
  recordedProcessRunning,
}) {
  if (!portListening) {
    return 'available';
  }

  return recordedProcessRunning ? 'managed' : 'occupied';
}

export function getPreviewRunPlan(existingPreviewState) {
  if (existingPreviewState === 'occupied') {
    return {
      rebuildAssets: false,
      startFrontend: false,
    };
  }

  return {
    rebuildAssets: true,
    startFrontend: existingPreviewState === 'available',
  };
}

export async function waitForPreviewRelease({
  isListening,
  wait,
  maxAttempts,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!await isListening()) {
      return true;
    }

    await wait();
  }

  return false;
}
