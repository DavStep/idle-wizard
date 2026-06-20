const DAY_MS = 24 * 60 * 60 * 1_000;
const WEEK_MS = 7 * DAY_MS;
const WEEKLY_ANCHOR_MS = Date.UTC(2026, 5, 8, 0, 0, 0, 0);

export class PersonalTaskPeriodManager {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
  }

  getCurrentPeriods() {
    const nowMs = this.getNowMs();
    return {
      daily: this.getDailyPeriod(nowMs),
      weekly: this.getWeeklyPeriod(nowMs),
    };
  }

  getDailyPeriod(nowMs = this.getNowMs()) {
    const start = new Date(nowMs);
    const startMs = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      0,
      0,
      0,
      0,
    );
    const resetAtMs = startMs + DAY_MS;

    return {
      periodType: 'daily',
      periodKey: new Date(startMs).toISOString().slice(0, 10),
      resetAtMs,
      resetLabel: this.formatResetLabel(resetAtMs, nowMs),
    };
  }

  getWeeklyPeriod(nowMs = this.getNowMs()) {
    const weekIndex = Math.max(0, Math.floor((nowMs - WEEKLY_ANCHOR_MS) / WEEK_MS));
    const startMs = WEEKLY_ANCHOR_MS + weekIndex * WEEK_MS;
    const resetAtMs = startMs + WEEK_MS;

    return {
      periodType: 'weekly',
      periodKey: `weekly-${weekIndex}`,
      resetAtMs,
      resetLabel: this.formatResetLabel(resetAtMs, nowMs),
    };
  }

  getNowMs() {
    const nowMs = Number(this.now?.());
    return Number.isFinite(nowMs) ? nowMs : Date.now();
  }

  formatResetLabel(resetAtMs, nowMs = this.getNowMs()) {
    const remainingMs = Math.max(0, Math.floor(resetAtMs - nowMs));
    const remainingMinutes = Math.ceil(remainingMs / 60_000);

    if (remainingMinutes <= 0) {
      return 'resets now';
    }

    if (remainingMinutes < 60) {
      return `resets ${remainingMinutes}m`;
    }

    const remainingHours = Math.ceil(remainingMinutes / 60);

    if (remainingHours < 24) {
      return `resets ${remainingHours}h`;
    }

    const days = Math.floor(remainingHours / 24);
    const hours = remainingHours % 24;

    if (hours <= 0) {
      return `resets ${days}d`;
    }

    return `resets ${days}d ${hours}h`;
  }
}
