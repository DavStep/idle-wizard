import {
  DEFAULT_PLAYER_FRAME,
  getPlayerFrameOptions,
  normalizePlayerFrame,
} from '../playerFrames.js';

export class PlayerFrameManager {
  constructor() {
    this.frame = DEFAULT_PLAYER_FRAME;
  }

  getFrame() {
    return this.frame;
  }

  getFrameOptions() {
    return getPlayerFrameOptions();
  }

  setFrame(frame) {
    this.frame = normalizePlayerFrame(frame);
    return this.frame;
  }

  applyServerFrame(frame) {
    return this.setFrame(frame);
  }
}
