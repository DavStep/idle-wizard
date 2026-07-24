import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createElementStub() {
  return {
    style: {},
    value: "",
    textContent: "",
    disabled: false,
    checked: false,
    classList: {
      add() {},
      remove() {}
    },
    addEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 480, height: 280 };
    },
    remove() {},
    click() {}
  };
}

function loadDetector() {
  const html = fs.readFileSync(new URL("../figma-plugin/ui.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, "ui.html should contain a script tag");

  const context2d = {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    fillText() {},
    drawImage() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    setLineDash() {}
  };
  const canvas = createElementStub();
  canvas.width = 480;
  canvas.height = 280;
  canvas.getContext = () => context2d;

  const context = {
    console,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Float32Array,
    ArrayBuffer,
    Array,
    Math,
    Number,
    Date,
    Error,
    Promise,
    Map,
    Blob: function Blob() {},
    Image: function Image() {},
    URL: {
      createObjectURL() {
        return "blob:test";
      },
      revokeObjectURL() {}
    },
    window: {
      location: { search: "" },
      localStorage: {
        getItem() {
          return null;
        }
      },
      addEventListener() {}
    },
    parent: {
      postMessage() {}
    },
    document: {
      getElementById(id) {
        return id === "slicePreview" ? canvas : createElementStub();
      },
      createElement(tag) {
        return tag === "canvas" ? canvas : createElementStub();
      },
      body: {
        appendChild() {}
      }
    },
    setTimeout() {},
    clearTimeout() {}
  };
  context.globalThis = context;

  vm.runInNewContext(
    `${script}\nglobalThis.__quickTest = { buildAutoMetadataFromRgba };`,
    context,
    { filename: "figma-plugin/ui.html" }
  );
  return context.__quickTest.buildAutoMetadataFromRgba;
}

const detect = loadDetector();

function blendPixel(data, width, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= width) return;
  const index = (y * width + x) * 4;
  const nextAlpha = a / 255;
  const oldAlpha = data[index + 3] / 255;
  const outAlpha = nextAlpha + oldAlpha * (1 - nextAlpha);
  if (outAlpha <= 0) return;

  data[index] = Math.round((r * nextAlpha + data[index] * oldAlpha * (1 - nextAlpha)) / outAlpha);
  data[index + 1] = Math.round((g * nextAlpha + data[index + 1] * oldAlpha * (1 - nextAlpha)) / outAlpha);
  data[index + 2] = Math.round((b * nextAlpha + data[index + 2] * oldAlpha * (1 - nextAlpha)) / outAlpha);
  data[index + 3] = Math.round(outAlpha * 255);
}

function roundedRectDistance(px, py, x, y, width, height, radius) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const qx = Math.abs(px - cx) - (width / 2 - radius);
  const qy = Math.abs(py - cy) - (height / 2 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function drawSoftLine(data, width, height, x1, y1, x2, y2, thickness, color) {
  const padding = Math.ceil(thickness + 2);
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - padding));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2) + padding));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - padding));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2) + padding));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = pointToSegmentDistance(x + 0.5, y + 0.5, x1, y1, x2, y2);
      if (distance > thickness) continue;
      const alpha = Math.round(color.a * (1 - distance / thickness));
      blendPixel(data, width, x, y, color.r, color.g, color.b, alpha);
    }
  }
}

function createRoundedPanel(
  width,
  height,
  { radius = 18, shadow = 6, stroke = 3, gradient = false, pill = false, asym = false } = {}
) {
  const data = new Uint8ClampedArray(width * height * 4);
  const x = shadow;
  const y = shadow;
  const innerWidth = width - shadow * 2;
  const innerHeight = height - shadow * 2;
  const actualRadius = pill ? innerHeight / 2 : radius;

  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) {
      const distance = roundedRectDistance(xx + 0.5, yy + 0.5, x, y, innerWidth, innerHeight, actualRadius);
      if (distance > 0 && distance < shadow) {
        blendPixel(data, width, xx, yy, 0, 0, 0, Math.round((1 - distance / shadow) * 55));
      }
      if (distance <= 0) {
        const fill = gradient ? Math.round(90 + (yy / height) * 50) : 120;
        if (distance > -stroke) {
          blendPixel(data, width, xx, yy, 40, 70, 110, 255);
        } else {
          blendPixel(data, width, xx, yy, fill, 150, 190, 255);
        }
      }
      if (asym && xx < shadow + 26 && yy > shadow + 8 && yy < height - shadow - 8) {
        blendPixel(data, width, xx, yy, 220, 120, 60, 255);
      }
      if (asym && xx > width - shadow - 14 && yy > shadow + 14 && yy < height - shadow - 14) {
        blendPixel(data, width, xx, yy, 70, 80, 130, 255);
      }
    }
  }

  return data;
}

function createMarkedCornerPanel(width, height) {
  const data = createRoundedPanel(width, height, {
    radius: Math.round(height * 0.17),
    shadow: Math.round(height * 0.043),
    stroke: 5
  });
  drawSoftLine(
    data,
    width,
    height,
    Math.round(width * 0.155),
    Math.round(height * 0.235),
    Math.round(width * 0.212),
    Math.round(height * 0.585),
    5,
    { r: 220, g: 250, b: 110, a: 120 }
  );
  drawSoftLine(
    data,
    width,
    height,
    Math.round(width * 0.195),
    Math.round(height * 0.21),
    Math.round(width * 0.265),
    Math.round(height * 0.483),
    5,
    { r: 220, g: 250, b: 110, a: 95 }
  );
  return data;
}

function createVerticalPill(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  const shadow = 4;
  const innerWidth = width - shadow * 2;
  const innerHeight = height - shadow * 2;
  const radius = innerWidth / 2;

  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) {
      const distance = roundedRectDistance(xx + 0.5, yy + 0.5, shadow, shadow, innerWidth, innerHeight, radius);
      if (distance > 0 && distance < shadow) {
        blendPixel(data, width, xx, yy, 0, 0, 0, Math.round((1 - distance / shadow) * 55));
      }
      if (distance <= 0) {
        if (distance > -3) {
          blendPixel(data, width, xx, yy, 40, 70, 110, 255);
        } else {
          blendPixel(data, width, xx, yy, 120, 150, 190, 255);
        }
      }
    }
  }

  return data;
}

function createPanelWithCenteredArtwork(width, height) {
  const data = createRoundedPanel(width, height, { radius: 16, shadow: 5, stroke: 2 });
  const artwork = {
    left: Math.round(width * 0.38),
    right: Math.round(width * 0.62),
    top: Math.round(height * 0.34),
    bottom: Math.round(height * 0.66)
  };

  for (let y = artwork.top; y < artwork.bottom; y += 1) {
    for (let x = artwork.left; x < artwork.right; x += 1) {
      const checker = (Math.floor((x - artwork.left) / 4) + Math.floor((y - artwork.top) / 4)) % 2;
      blendPixel(data, width, x, y, checker ? 195 : 55, checker ? 95 : 210, 80, 255);
    }
  }

  return { data, artwork };
}

function createCornerPatternPanel(width, height) {
  const data = createRoundedPanel(width, height, { radius: 18, shadow: 3, stroke: 3 });
  const color = { r: 245, g: 215, b: 135, a: 210 };
  const edge = 34;
  drawSoftLine(data, width, height, 7, edge, edge, 7, 3, color);
  drawSoftLine(data, width, height, width - 8, edge, width - edge, 7, 3, color);
  drawSoftLine(data, width, height, 7, height - edge, edge, height - 8, 3, color);
  drawSoftLine(data, width, height, width - 8, height - edge, width - edge, height - 8, 3, color);
  return data;
}

function createSubtleCornerPatternPanel(width, height) {
  const data = createRoundedPanel(width, height, { radius: 16, shadow: 3, stroke: 3 });
  const color = { r: 232, g: 211, b: 170, a: 82 };
  const edge = 27;
  drawSoftLine(data, width, height, 7, edge, edge, 7, 1.8, color);
  drawSoftLine(data, width, height, width - 8, edge, width - edge, 7, 1.8, color);
  drawSoftLine(data, width, height, 7, height - edge, edge, height - 8, 1.8, color);
  drawSoftLine(data, width, height, width - 8, height - edge, width - edge, height - 8, 1.8, color);
  return data;
}

test("safe-zone detector protects rounded panel corners and borders", () => {
  const metadata = detect(createRoundedPanel(160, 80), 160, 80, 160, 80, "hash-rounded", "rounded");

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.confidence > 0.75);
  assert.ok(metadata.insets.left >= 18);
  assert.ok(metadata.insets.right >= 18);
  assert.ok(metadata.insets.top >= 18);
  assert.ok(metadata.insets.bottom >= 18);
});

test("safe-zone detector emits horizontal-only three-slice for pill buttons", () => {
  const metadata = detect(
    createRoundedPanel(180, 36, { shadow: 4, stroke: 3, pill: true, gradient: true }),
    180,
    36,
    180,
    36,
    "hash-pill",
    "pill"
  );

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "horizontalThreeSlice");
  assert.equal(metadata.insets.top, 0);
  assert.equal(metadata.insets.bottom, 0);
  assert.ok(metadata.insets.left >= 14 && metadata.insets.left <= 24);
  assert.ok(metadata.insets.right >= 14 && metadata.insets.right <= 24);
  assert.match(metadata.warnings.join(" "), /horizontal-only stretch/);
});

test("safe-zone detector keeps soft shadow and glow outside the stretch center", () => {
  const metadata = detect(
    createRoundedPanel(140, 70, { radius: 14, shadow: 10, stroke: 2 }),
    140,
    70,
    140,
    70,
    "hash-shadow",
    "shadow"
  );

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left >= 20);
  assert.ok(metadata.insets.top >= 20);
});

test("replication-safe detector keeps all four guides for a wide decorated rounded panel", () => {
  const metadata = detect(createMarkedCornerPanel(476, 234), 476, 234, 476, 234, "hash-marked", "marked");

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left >= 135, `left ${metadata.insets.left} should cover the diagonal marks`);
  assert.ok(metadata.insets.top >= 130, `top ${metadata.insets.top} should cover the diagonal marks`);
  assert.ok(metadata.insets.right <= 60, `right ${metadata.insets.right} should not pick up left-corner detail`);
  assert.ok(metadata.insets.bottom > 20, `bottom ${metadata.insets.bottom} should protect the rounded corner`);
});

test("replication-safe detector matches the reported 281x194 decorated button geometry", () => {
  const metadata = detect(
    createMarkedCornerPanel(281, 194),
    281,
    194,
    281,
    194,
    "hash-reported-button",
    "reported-button"
  );

  assert.equal(metadata.source, "auto", JSON.stringify(metadata, null, 2));
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left >= 78, `left ${metadata.insets.left} should clear the shine marks`);
  assert.ok(metadata.insets.top >= 105, `top ${metadata.insets.top} should clear the shine marks`);
  assert.ok(metadata.insets.right >= 24, `right ${metadata.insets.right} should protect the rounded corner`);
  assert.ok(metadata.insets.bottom >= 24, `bottom ${metadata.insets.bottom} should protect the rounded corner`);
});

test("replication-safe detector keeps guides inside patterned rounded corners", () => {
  const width = 384;
  const height = 141;
  const metadata = detect(
    createCornerPatternPanel(width, height),
    width,
    height,
    width,
    height,
    "hash-corner-pattern",
    "corner-pattern"
  );

  assert.equal(metadata.source, "auto", JSON.stringify(metadata, null, 2));
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left >= 38, `left ${metadata.insets.left} should clear the corner pattern`);
  assert.ok(metadata.insets.right >= 38, `right ${metadata.insets.right} should clear the corner pattern`);
  assert.ok(metadata.insets.top >= 38, `top ${metadata.insets.top} should clear the corner pattern`);
  assert.ok(metadata.insets.bottom >= 38, `bottom ${metadata.insets.bottom} should clear the corner pattern`);
});

test("first-safe detector sees subtle corner pixels in the pinned long-panel geometry", () => {
  const width = 384;
  const height = 115;
  const metadata = detect(
    createSubtleCornerPatternPanel(width, height),
    width,
    height,
    width,
    height,
    "hash-pinned-corner-pattern",
    "pinned-corner-pattern"
  );

  assert.equal(metadata.source, "auto", JSON.stringify(metadata, null, 2));
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left >= 29, `left ${metadata.insets.left} should clear the subtle corner motif`);
  assert.ok(metadata.insets.right >= 29, `right ${metadata.insets.right} should clear the subtle corner motif`);
  assert.ok(metadata.insets.top >= 29, `top ${metadata.insets.top} should clear the subtle corner motif`);
  assert.ok(metadata.insets.bottom >= 29, `bottom ${metadata.insets.bottom} should clear the subtle corner motif`);
});

test("safe-zone detector allows asymmetric nine-slice axes for square cap detail", () => {
  const metadata = detect(createMarkedCornerPanel(188, 182), 188, 182, 188, 182, "hash-square-marked", "square-marked");

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.insets.left > metadata.insets.right + 15, `left ${metadata.insets.left} should move past local marks`);
  assert.ok(metadata.insets.top > metadata.insets.bottom + 60, `top ${metadata.insets.top} should move past local marks`);
  assert.ok(metadata.insets.left + metadata.insets.right < 188);
  assert.ok(metadata.insets.top + metadata.insets.bottom < 182);
});

test("repeatable-zone detector limits a smooth gradient to a locally repeatable sample", () => {
  const metadata = detect(
    createRoundedPanel(150, 80, { radius: 16, shadow: 5, stroke: 2, gradient: true }),
    150,
    80,
    150,
    80,
    "hash-gradient",
    "gradient"
  );

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(metadata.confidence > 0.65);
  assert.ok(metadata.insets.left >= 16);
  assert.ok(metadata.insets.top >= 16);
  assert.ok(
    metadata.debug.y.end - metadata.debug.y.start <= 24,
    `vertical gradient sample ${metadata.debug.y.start}-${metadata.debug.y.end} should not span the full gradient: ${JSON.stringify(metadata)}`
  );
});

test("safe-zone detector preserves asymmetric fixed artwork", () => {
  const metadata = detect(
    createRoundedPanel(170, 70, { radius: 12, shadow: 5, stroke: 2, asym: true }),
    170,
    70,
    170,
    70,
    "hash-asym",
    "asym"
  );

  assert.equal(metadata.source, "auto");
  assert.equal(metadata.mode, "nineSlice");
  assert.ok(
    metadata.insets.left > metadata.insets.right + 8,
    `left artwork guard should stay asymmetric: ${JSON.stringify(metadata)}`
  );
  assert.ok(metadata.insets.top > 0);
});

test("repeatable-zone detector keeps centered artwork out of both stretch axes", () => {
  const width = 190;
  const height = 100;
  const { data, artwork } = createPanelWithCenteredArtwork(width, height);
  const metadata = detect(data, width, height, width, height, "hash-centered-artwork", "centered-artwork");

  assert.equal(metadata.source, "auto", JSON.stringify(metadata, null, 2));
  assert.equal(metadata.algorithmVersion, "first-safe-zone-v5");
  assert.equal(metadata.debug.x.selectionStrategy, "firstSafeOccurrence");
  assert.equal(metadata.debug.y.selectionStrategy, "firstSafeOccurrence");
  const xStart = metadata.debug.x.start;
  const xEnd = metadata.debug.x.end;
  const yStart = metadata.debug.y.start;
  const yEnd = metadata.debug.y.end;
  assert.ok(
    xEnd <= artwork.left,
    `horizontal stretch ${xStart}-${xEnd} should lock to the first safe occurrence before artwork ${artwork.left}-${artwork.right}`
  );
  assert.ok(
    yEnd <= artwork.top,
    `vertical stretch ${yStart}-${yEnd} should lock to the first safe occurrence before artwork ${artwork.top}-${artwork.bottom}`
  );
});

test("safe-zone detector falls back visibly for tiny assets", () => {
  const data = new Uint8ClampedArray(10 * 8 * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 100;
    data[index + 1] = 120;
    data[index + 2] = 130;
    data[index + 3] = 255;
  }

  const metadata = detect(data, 10, 8, 10, 8, "hash-tiny", "tiny");

  assert.equal(metadata.source, "default");
  assert.equal(metadata.mode, "fallback");
  assert.match(metadata.warnings.join(" "), /too small/);
});

test("safe-zone detector warns instead of emitting unsupported vertical-only slices", () => {
  const metadata = detect(createVerticalPill(36, 180), 36, 180, 36, 180, "hash-vertical", "vertical");

  assert.equal(metadata.source, "default");
  assert.equal(metadata.mode, "fallback");
  assert.match(metadata.warnings.join(" "), /Vertical-only stretch was detected/);
});

test("preview canvas keeps its intrinsic 480x280 aspect ratio in the plugin UI", () => {
  const html = fs.readFileSync(new URL("../figma-plugin/ui.html", import.meta.url), "utf8");
  assert.match(html, /#slicePreview\s*\{[\s\S]*?height:\s*auto\s*;/);
  assert.match(html, /#slicePreview\s*\{[\s\S]*?aspect-ratio:\s*12\s*\/\s*7\s*;/);
});
