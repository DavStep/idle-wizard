// Active timer snapshots refresh about every 500ms; keep fills moving across
// nearly the whole gap without using full-duration continuous timer animation.
export const TIMER_PROGRESS_STEP_MS = 480;

const SECOND_MS = 1_000;
const MINUTE_SECONDS = 60;
const HOUR_MINUTES = 60;

export function formatRemainingTime(remainingMs) {
  const value = Number(remainingMs);
  const safeRemainingMs = Number.isFinite(value) ? value : 0;
  const totalSeconds = Math.max(0, Math.ceil(safeRemainingMs / SECOND_MS));

  if (totalSeconds < MINUTE_SECONDS) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / MINUTE_SECONDS);
  const seconds = totalSeconds % MINUTE_SECONDS;

  if (totalMinutes < HOUR_MINUTES) {
    return seconds > 0 ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / HOUR_MINUTES);
  const minutes = totalMinutes % HOUR_MINUTES;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
