const AUTO_GEAR_STEP_INTERVAL_MS = 320;
const AUTO_GEAR_STEP_DURATION_MS = 70;
const AUTO_GEAR_STEP_RADIANS = Math.PI / 8;

export class AutoGearMotion {
  constructor({ setRotation = null } = {}) {
    this.setRotation =
      typeof setRotation === "function" ? setRotation : () => {};
    this.enabled = false;
    this.startedAt = null;
  }

  setEnabled(enabled) {
    const nextEnabled = enabled === true;
    if (nextEnabled !== this.enabled) {
      this.startedAt = null;
    }
    this.enabled = nextEnabled;
    if (!nextEnabled) {
      this.reset();
    }
  }

  update(now, { active = true, reducedMotion = false } = {}) {
    if (!active || reducedMotion || !this.enabled) {
      this.reset();
      return 0;
    }
    if (!Number.isFinite(this.startedAt)) {
      this.startedAt = Number(now) || 0;
    }
    const elapsed = Math.max(
      0,
      (Number(now) || 0) - this.startedAt,
    );
    const completedSteps = Math.floor(
      elapsed / AUTO_GEAR_STEP_INTERVAL_MS,
    );
    const stepElapsed = elapsed % AUTO_GEAR_STEP_INTERVAL_MS;
    const stepProgress = Math.min(
      1,
      stepElapsed / AUTO_GEAR_STEP_DURATION_MS,
    );
    const easedStep = 1 - Math.pow(1 - stepProgress, 4);
    const rotation =
      ((completedSteps + easedStep) * AUTO_GEAR_STEP_RADIANS) %
      (Math.PI * 2);
    this.setRotation(rotation);
    return rotation;
  }

  reset() {
    this.startedAt = null;
    this.setRotation(0);
  }
}
