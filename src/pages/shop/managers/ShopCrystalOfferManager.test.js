/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopCrystalOfferManager } from './ShopCrystalOfferManager.js';

describe('ShopCrystalOfferManager', () => {
  it('separates Amber and Amethyst packs into labeled sections', () => {
    const parent = document.createElement('section');
    const popupParent = document.createElement('section');
    const manager = new ShopCrystalOfferManager();

    manager.mount(parent, popupParent);

    const sections = [
      ...parent.querySelectorAll('.shop-page__crystal-offer-section'),
    ];
    expect(sections.map((section) => section.getAttribute('aria-label')))
      .toEqual(['Amber offers', 'Amethyst offers']);
    expect(
      sections.map((section) =>
        [...section.querySelectorAll('[role="listitem"]')].map(
          (row) => row.getAttribute('aria-label'),
        ),
      ),
    ).toEqual([
      [
        '1 Amber, $4.99',
        '2 Amber, $8.99',
        '5 Amber, $19.99',
        '10 Amber, $36.99',
        '20 Amber, $69.99',
        '50 Amber, $159.99',
      ],
      [
        '100 Amethyst, $4.99',
        '200 Amethyst, $8.99',
        '500 Amethyst, $19.99',
        '1000 Amethyst, $36.99',
        '2000 Amethyst, $69.99',
        '5000 Amethyst, $159.99',
      ],
    ]);

    manager.unmount();
  });
});
