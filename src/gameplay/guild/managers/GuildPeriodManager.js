const DAY_MS = 24 * 60 * 60 * 1000;
const BOARD_WAVE_MS = 30 * 60 * 1000;
const SIM_TICK_MS = 10 * 60 * 1000;

export class GuildPeriodManager {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
  }

  getNowMs() {
    const nowMs = Number(this.now?.());
    return Number.isFinite(nowMs) ? nowMs : Date.now();
  }

  getDailyPeriod(nowMs = this.getNowMs()) {
    const dayIndex = Math.floor(nowMs / DAY_MS);
    const resetAtMs = (dayIndex + 1) * DAY_MS;

    return {
      periodKey: `daily-${dayIndex}`,
      dayIndex,
      resetAtMs,
      resetLabel: this.formatDuration(resetAtMs - nowMs),
    };
  }

  getBoardWave(nowMs = this.getNowMs()) {
    const waveIndex = Math.floor(nowMs / BOARD_WAVE_MS);
    const nextWaveAtMs = (waveIndex + 1) * BOARD_WAVE_MS;

    return {
      waveKey: `board-${waveIndex}`,
      waveIndex,
      nextWaveAtMs,
      resetLabel: this.formatDuration(nextWaveAtMs - nowMs),
    };
  }

  getAlignedSimTick(nowMs = this.getNowMs()) {
    return Math.floor(nowMs / SIM_TICK_MS) * SIM_TICK_MS;
  }

  getNextSimTick(nowMs = this.getNowMs()) {
    return this.getAlignedSimTick(nowMs) + SIM_TICK_MS;
  }

  formatDuration(durationMs) {
    const minutes = Math.max(0, Math.ceil(Number(durationMs) / 60_000));

    if (minutes <= 0) {
      return 'now';
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
      return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}
