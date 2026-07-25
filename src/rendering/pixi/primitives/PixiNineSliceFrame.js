import {
  Container,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

/**
 * Nine-slice renderer with independent output widths for every edge.
 *
 * Pixi's built-in NineSliceSprite applies one X/Y scale to both opposing
 * edges. Root Run's authored border-image contracts intentionally use
 * asymmetric output widths, so those controls need nine retained quads.
 */
export class PixiNineSliceFrame extends Container {
  constructor({
    texture = Texture.EMPTY,
    sourceInsets = null,
    borderInsets = sourceInsets,
    width = 0,
    height = 0,
    label = 'asymmetricNineSlice',
  } = {}) {
    super({ label });
    this.texture = null;
    this.sourceInsets = normalizeInsets(sourceInsets);
    this.borderInsets = normalizeInsets(borderInsets);
    this.frameWidth = Math.max(0, Number(width) || 0);
    this.frameHeight = Math.max(0, Number(height) || 0);
    this.sliceTextures = [];
    this.sprites = [];
    this.setTexture(texture, this.sourceInsets);
  }

  setTexture(texture, sourceInsets = this.sourceInsets) {
    const nextTexture = texture ?? Texture.EMPTY;
    const nextInsets = normalizeInsets(sourceInsets);
    if (
      this.texture === nextTexture &&
      insetsEqual(this.sourceInsets, nextInsets) &&
      this.sprites.length === 9
    ) {
      return this;
    }

    this.destroySlices();
    this.texture = nextTexture;
    this.sourceInsets = nextInsets;
    this.createSlices();
    this.relayout();
    return this;
  }

  setSize(width, height, borderInsets = this.borderInsets) {
    this.frameWidth = Math.max(0, Number(width) || 0);
    this.frameHeight = Math.max(0, Number(height) || 0);
    this.borderInsets = normalizeInsets(borderInsets);
    this.relayout();
    return this;
  }

  createSlices() {
    const frame = this.texture?.frame ?? new Rectangle(0, 0, 1, 1);
    const source = this.texture?.source ?? Texture.EMPTY.source;
    const columns = splitAxis(
      frame.x,
      frame.width,
      this.sourceInsets.left,
      this.sourceInsets.right,
    );
    const rows = splitAxis(
      frame.y,
      frame.height,
      this.sourceInsets.top,
      this.sourceInsets.bottom,
    );

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const sliceFrame = new Rectangle(
          columns[column].start,
          rows[row].start,
          columns[column].size,
          rows[row].size,
        );
        const sliceTexture = new Texture({
          source,
          frame: sliceFrame,
          label: `${this.label}:texture:${row}:${column}`,
        });
        const sprite = new Sprite({
          texture: sliceTexture,
          label: `${this.label}:slice:${row}:${column}`,
          roundPixels: true,
        });
        this.sliceTextures.push(sliceTexture);
        this.sprites.push(sprite);
        this.addChild(sprite);
      }
    }
  }

  relayout() {
    if (this.sprites.length !== 9) {
      return;
    }

    const horizontal = resolveOutputAxis(
      this.frameWidth,
      this.borderInsets.left,
      this.borderInsets.right,
    );
    const vertical = resolveOutputAxis(
      this.frameHeight,
      this.borderInsets.top,
      this.borderInsets.bottom,
    );

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const sprite = this.sprites[row * 3 + column];
        const x = horizontal[column];
        const y = vertical[row];
        sprite.position.set(x.start, y.start);
        sprite.width = x.size;
        sprite.height = y.size;
        sprite.visible = x.size > 0 && y.size > 0;
      }
    }
  }

  destroySlices() {
    for (const sprite of this.sprites) {
      sprite.destroy({ texture: false, textureSource: false });
    }
    for (const texture of this.sliceTextures) {
      texture.destroy(false);
    }
    this.removeChildren();
    this.sprites.length = 0;
    this.sliceTextures.length = 0;
  }

  destroy(options) {
    this.destroySlices();
    super.destroy(options);
  }
}

function splitAxis(start, total, leading, trailing) {
  const safeLeading = Math.min(total, Math.max(0, leading));
  const safeTrailing = Math.min(
    Math.max(0, total - safeLeading),
    Math.max(0, trailing),
  );
  const middle = Math.max(0, total - safeLeading - safeTrailing);
  return [
    { start, size: safeLeading },
    { start: start + safeLeading, size: middle },
    { start: start + safeLeading + middle, size: safeTrailing },
  ];
}

function resolveOutputAxis(total, leading, trailing) {
  const scale =
    leading + trailing > total && leading + trailing > 0
      ? total / (leading + trailing)
      : 1;
  const safeLeading = Math.max(0, leading * scale);
  const safeTrailing = Math.max(0, trailing * scale);
  const middle = Math.max(0, total - safeLeading - safeTrailing);
  return [
    { start: 0, size: safeLeading },
    { start: safeLeading, size: middle },
    { start: safeLeading + middle, size: safeTrailing },
  ];
}

function normalizeInsets(value) {
  return Object.freeze({
    top: Math.max(0, Number(value?.top) || 0),
    right: Math.max(0, Number(value?.right) || 0),
    bottom: Math.max(0, Number(value?.bottom) || 0),
    left: Math.max(0, Number(value?.left) || 0),
  });
}

function insetsEqual(left, right) {
  return (
    left.top === right.top &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.left === right.left
  );
}
