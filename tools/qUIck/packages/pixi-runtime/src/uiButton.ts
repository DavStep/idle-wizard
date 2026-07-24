import { Container, Rectangle } from "pixi.js";

export class UIButton extends Container {
  private enabled = true;
  private readonly idleAlpha = 1;
  private readonly hoverAlpha = 0.92;
  private readonly pressedAlpha = 0.82;
  private readonly disabledAlpha = 0.55;

  constructor() {
    super();
    this.eventMode = "static";
    this.cursor = "pointer";
    this.alpha = this.idleAlpha;
    this.on("pointerover", () => {
      if (this.enabled) {
        this.alpha = this.hoverAlpha;
      }
    });
    this.on("pointerout", () => {
      this.alpha = this.enabled ? this.idleAlpha : this.disabledAlpha;
    });
    this.on("pointerdown", () => {
      if (this.enabled) {
        this.alpha = this.pressedAlpha;
      }
    });
    this.on("pointerup", () => {
      if (this.enabled) {
        this.alpha = this.hoverAlpha;
      }
    });
    this.on("pointerupoutside", () => {
      this.alpha = this.enabled ? this.idleAlpha : this.disabledAlpha;
    });
  }

  onClick(callback: () => void): void {
    this.on("pointertap", () => {
      if (this.enabled) {
        callback();
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.eventMode = enabled ? "static" : "none";
    this.cursor = enabled ? "pointer" : "default";
    this.alpha = enabled ? this.idleAlpha : this.disabledAlpha;
  }

  setHitArea(x: number, y: number, width: number, height: number): void {
    this.hitArea = new Rectangle(x, y, width, height);
  }
}
