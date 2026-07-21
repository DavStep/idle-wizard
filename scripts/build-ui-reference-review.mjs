/* global console, process */

import fs from 'node:fs';
import path from 'node:path';

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const referencePath = requirePath(options.reference, '--reference');
const actualPath = requirePath(options.actual, '--actual');
const outputPath = path.resolve(options.out ?? 'tmp/ui-reference-review.html');
const referenceCrop = parseCrop(options.referenceCrop, '--reference-crop');
const actualCrop = parseCrop(options.actualCrop, '--actual-crop');

const config = {
  reference: {
    label: options.referenceLabel ?? 'reference',
    src: readDataUrl(referencePath),
    crop: referenceCrop,
  },
  actual: {
    label: options.actualLabel ?? 'actual',
    src: readDataUrl(actualPath),
    crop: actualCrop,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, createReviewHtml(config));
console.log(`wrote ${outputPath}`);

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token
      .slice(2)
      .replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`${token} requires a value.`);
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function requirePath(value, flag) {
  if (!value) {
    throw new Error(`${flag} is required.`);
  }

  const resolvedPath = path.resolve(value);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${flag} does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

function parseCrop(value, flag) {
  if (!value) {
    return null;
  }

  const values = value.split(',').map(Number);

  if (
    values.length !== 4 ||
    values.some((number) => !Number.isFinite(number)) ||
    values[0] < 0 ||
    values[1] < 0 ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    throw new Error(`${flag} must be x,y,width,height with non-negative x/y.`);
  }

  const [x, y, width, height] = values;
  return { x, y, width, height };
}

function readDataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType =
    extension === '.jpg' || extension === '.jpeg'
      ? 'image/jpeg'
      : extension === '.webp'
        ? 'image/webp'
        : 'image/png';

  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function createReviewHtml(config) {
  const serializedConfig = JSON.stringify(config).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Idle Wizard UI reference review</title>
    <style>
      :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; color: #ececf1; background: #17191f; }
      h1 { margin: 0 0 16px; font-size: 18px; }
      h2 { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
      .comparison-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .panel { min-width: 0; padding: 12px; background: #20232d; border: 1px solid #555d76; }
      .overlay-panel { margin-top: 16px; }
      .visual-frame { position: relative; width: 100%; min-height: 120px; overflow: hidden; background: #0b0c10; }
      .visual-frame img { position: absolute; max-width: none; user-select: none; pointer-events: none; }
      .overlay-actual.difference { opacity: 1 !important; mix-blend-mode: difference; }
      .controls { display: flex; gap: 18px; align-items: center; margin-top: 10px; font-size: 12px; }
      .controls label { display: flex; gap: 8px; align-items: center; }
      input[type="range"] { width: min(360px, 42vw); }
      .note { margin: 14px 0 0; color: #b8bdca; font-size: 12px; line-height: 1.5; }
      @media (max-width: 760px) { .comparison-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <h1>UI reference fidelity review</h1>
    <div class="comparison-grid">
      <section class="panel">
        <h2 id="reference-label"></h2>
        <div class="visual-frame side-frame" data-frame-kind="reference">
          <img data-image-kind="reference" alt="Reference crop">
        </div>
      </section>
      <section class="panel">
        <h2 id="actual-label"></h2>
        <div class="visual-frame side-frame" data-frame-kind="actual">
          <img data-image-kind="actual" alt="Actual crop">
        </div>
      </section>
    </div>
    <section class="panel overlay-panel">
      <h2>overlay</h2>
      <div class="visual-frame overlay-frame">
        <img data-image-kind="reference" alt="Reference overlay">
        <img class="overlay-actual" data-image-kind="actual" alt="Actual overlay">
      </div>
      <div class="controls">
        <label>actual opacity <input id="opacity" type="range" min="0" max="1" step="0.01" value="0.5"></label>
        <label><input id="difference" type="checkbox"> difference blend</label>
      </div>
    </section>
    <p class="note">Compare visible bounds, optical centers, baselines, edge anchors, rail stroke/fill thickness, divider placement, and copy alignment. A full-screen thumbnail is not sufficient evidence.</p>
    <script>
      const config = ${serializedConfig};
      const images = [...document.querySelectorAll('[data-image-kind]')];
      document.querySelector('#reference-label').textContent = config.reference.label;
      document.querySelector('#actual-label').textContent = config.actual.label;

      for (const image of images) image.src = config[image.dataset.imageKind].src;

      Promise.all(images.map((image) => image.decode())).then(layout);
      window.addEventListener('resize', layout);

      const opacity = document.querySelector('#opacity');
      const difference = document.querySelector('#difference');
      const overlayActual = document.querySelector('.overlay-actual');
      opacity.addEventListener('input', updateOverlay);
      difference.addEventListener('change', updateOverlay);
      updateOverlay();

      function cropFor(image) {
        return config[image.dataset.imageKind].crop ?? {
          x: 0,
          y: 0,
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
      }

      function layout() {
        for (const frame of document.querySelectorAll('.side-frame')) {
          const image = frame.querySelector('img');
          const crop = cropFor(image);
          frame.style.aspectRatio = crop.width + ' / ' + crop.height;
          placeImage(image, frame, crop);
        }

        const overlayFrame = document.querySelector('.overlay-frame');
        const referenceImage = overlayFrame.querySelector('[data-image-kind="reference"]');
        const referenceCrop = cropFor(referenceImage);
        overlayFrame.style.aspectRatio = referenceCrop.width + ' / ' + referenceCrop.height;
        for (const image of overlayFrame.querySelectorAll('img')) {
          placeImage(image, overlayFrame, cropFor(image));
        }
      }

      function placeImage(image, frame, crop) {
        const scaleX = frame.clientWidth / crop.width;
        const scaleY = frame.clientHeight / crop.height;
        image.style.left = -crop.x * scaleX + 'px';
        image.style.top = -crop.y * scaleY + 'px';
        image.style.width = image.naturalWidth * scaleX + 'px';
        image.style.height = image.naturalHeight * scaleY + 'px';
      }

      function updateOverlay() {
        overlayActual.style.opacity = opacity.value;
        overlayActual.classList.toggle('difference', difference.checked);
      }
    </script>
  </body>
</html>`;
}

function printHelp() {
  console.log(`Usage:
  npm run ui:compare -- --reference <image> --actual <image> [options]

Options:
  --out <html>                 Output path (default: tmp/ui-reference-review.html)
  --reference-crop x,y,w,h     Crop the reference before fitting
  --actual-crop x,y,w,h        Crop the actual screenshot before fitting
  --reference-label <text>     Reference panel label
  --actual-label <text>        Actual panel label`);
}
