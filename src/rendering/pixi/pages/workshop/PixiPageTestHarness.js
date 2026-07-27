/**
 * Installs the narrow Canvas 2D metric surface Pixi Text needs in jsdom.
 *
 * Page tests exercise retained-tree behavior and authored geometry, not browser
 * glyph rasterization. Visual parity remains covered by native-pixel goldens.
 */
export function installPixiPageTestCanvas() {
  if (
    typeof globalThis.HTMLCanvasElement !== 'function' ||
    globalThis.HTMLCanvasElement.prototype.__pixiPageTestContextInstalled
  ) {
    return;
  }

  class PixiPageTestCanvasContext {
    createLinearGradient() {
      return {
        addColorStop() {},
      };
    }

    fillRect() {}

    measureText(value) {
      const width = [...String(value ?? '')].length * 7;

      return {
        width,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
      };
    }
  }

  Object.defineProperty(globalThis, 'CanvasRenderingContext2D', {
    configurable: true,
    value: PixiPageTestCanvasContext,
    writable: true,
  });
  Object.defineProperty(globalThis.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(type) {
      return type === '2d' ? new PixiPageTestCanvasContext() : null;
    },
    writable: true,
  });
  Object.defineProperty(
    globalThis.HTMLCanvasElement.prototype,
    '__pixiPageTestContextInstalled',
    {
      configurable: true,
      value: true,
    },
  );
}

export function createPixiAssetManagerFake(Texture) {
  return {
    getAtlasTexture() {
      return Texture.EMPTY;
    },
    getTexture() {
      return Texture.EMPTY;
    },
    has() {
      return false;
    },
  };
}

installPixiPageTestCanvas();
