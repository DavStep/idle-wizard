import { Container, Sprite } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  bindPixiSeedPackIcon,
  layoutPixiSeedPackIcon,
  resetPixiSeedPackIcon,
} from './PixiSeedPackIcon.js';

const WIDGET_ID = 'primitive.seed-pack-icon';

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createSeedPackThumbnail,
  folderPath: ['Icons'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Seed Pack Icon',
  properties: [
    { label: 'Production functions', value: 'bindPixiSeedPackIcon + layoutPixiSeedPackIcon' },
    { label: 'Contract', value: 'Shared seed bag and herb overlay composition' },
  ],
  scenarios: [
    { fixture: { key: 'sageSeed', label: 'Sage Seed' }, id: 'sage', label: 'Sage', mount: mountSeedPack },
    { fixture: { key: 'mintSeed', label: 'Mint Seed' }, id: 'mint', label: 'Mint', mount: mountSeedPack },
    { fixture: { key: 'lavenderSeed', label: 'Lavender Seed' }, id: 'lavender', label: 'Lavender', mount: mountSeedPack },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'Garden seed actions and Research seed unlocks', source: 'src/rendering/pixi/primitives/PixiSeedPackIcon.js' },
  ],
});

function createSeedPackThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'PixiSeedPackIcon',
    createControl: ({ assets }) => createSeedPackControl({
      assets,
      fixture: { key: 'sageSeed', label: 'Sage Seed' },
      size: 52,
    }),
    id: WIDGET_ID,
  });
}

async function mountSeedPack(_context, fixture) {
  return createUiEditorPixiSurface({
    component: 'PixiSeedPackIcon',
    createControl: ({ assets }) => createSeedPackControl({ assets, fixture, size: 96 }),
  });
}

function createSeedPackControl({ assets, fixture, size }) {
  const root = new Container({ label: 'uiLabSeedPackIcon' });
  const base = new Sprite({ label: 'uiLabSeedPackIcon:base', roundPixels: true });
  const item = new Sprite({ label: 'uiLabSeedPackIcon:item', roundPixels: true });
  root.addChild(base, item);
  bindPixiSeedPackIcon({ assetManager: assets, base, item, seed: fixture });
  layoutPixiSeedPackIcon({ base, item, x: size / 2, y: size / 2, width: size, height: size, anchorX: 0.5, anchorY: 0.5 });
  return {
    base,
    destroy: () => {
      resetPixiSeedPackIcon({ base, item });
      root.destroy({ children: true });
    },
    height: size,
    item,
    root,
    width: size,
  };
}
