// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

import { RoomInventoryButtonManager } from './RoomInventoryButtonManager.js';

const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

function getRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = baseCss.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));

  expect(match, `${selector} rule exists`).not.toBeNull();
  return match.groups.body;
}

describe('RoomInventoryButtonManager', () => {
  it('renders side-aware inventory icon buttons', () => {
    const parent = document.createElement('section');
    const openedTabs = [];
    const manager = new RoomInventoryButtonManager({
      className: 'garden-page__inventory-buttons',
      onOpenInventory: (tabId) => openedTabs.push(tabId),
      buttons: [
        { tabId: 'herbs', label: 'herbs', icon: 'herbs', side: 'left' },
        { tabId: 'seeds', label: 'seeds', icon: 'seeds', side: 'right' },
      ],
    });

    manager.mount(parent);

    const roots = parent.querySelectorAll('.room-inventory-panel-button');
    expect(roots).toHaveLength(2);
    expect(roots[0].dataset.panelSide).toBe('left');
    expect(roots[1].dataset.panelSide).toBe('right');
    expect(roots[0].querySelector('.room-inventory-panel-button__label')?.textContent).toBe(
      'herbs',
    );
    expect(roots[1].querySelector('.room-inventory-panel-button__label')?.textContent).toBe(
      'seeds',
    );
    expect(
      roots[1]
        .querySelector('.room-inventory-panel-button__open')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');

    roots[1]
      .querySelector('.room-inventory-panel-button__open')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(openedTabs).toEqual(['seeds']);

    manager.setActiveTab('seeds');

    expect(roots[1].classList.contains('is-active')).toBe(true);
    expect(
      roots[1]
        .querySelector('.room-inventory-panel-button__open')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('uses the Workshop side-button footprint and smaller centered icons', () => {
    expect(getRule('.room-inventory-panel-button')).toContain('width: 45.5px;');
    expect(getRule('.room-inventory-panel-button')).toContain('height: 80.25px;');
    expect(getRule('.room-inventory-panel-button__open')).toContain('width: 45.5px;');
    expect(getRule('.room-inventory-panel-button__open')).toContain('height: 68.25px;');
    expect(getRule('.room-inventory-panel-button__portrait')).toContain('width: 45.5px;');
    expect(getRule('.room-inventory-panel-button__portrait')).toContain('height: 59.15px;');
    expect(getRule('.room-inventory-panel-button__icon')).toContain('width: 42px;');
    expect(getRule('.room-inventory-panel-button__icon')).toContain('height: 42px;');
    expect(getRule('.room-inventory-panel-button__label')).toContain('left: 14px;');
    expect(baseCss).toMatch(
      /\.room-inventory-panel-button\[data-panel-side="right"\]\s+\.room-inventory-panel-button__label\s*\{[^}]*right: 14px;/,
    );
  });

  it('anchors Garden and Brewing inventory buttons on the same side rails', () => {
    const gardenRule = getRule('.garden-page__inventory-buttons');
    const brewingRule = getRule('.brewing-page__inventory-buttons');
    const gardenPanelRule = getRule('.garden-page__inventory-panel-layer');
    const brewingPanelRule = getRule('.brewing-page__inventory-panel-layer');

    expect(gardenRule).toContain('position: absolute;');
    expect(gardenRule).toContain('right: calc(var(--style-room-content-edge) - 14px);');
    expect(gardenRule).toContain('bottom: var(--style-room-chat-clearance);');
    expect(gardenRule).toContain('left: calc(var(--style-room-content-edge) - 14px);');
    expect(brewingRule).toContain('right: calc(var(--style-room-content-edge) - 14px);');
    expect(gardenPanelRule).toContain('var(--room-inventory-panel-y-offset)');
    expect(brewingPanelRule).toContain('var(--room-inventory-panel-y-offset)');
  });

  it('gives inline inventory boxes a restrained rubber reveal', () => {
    expect(baseCss).toContain('--room-inventory-panel-y-offset: 5px;');
    expect(baseCss).toMatch(
      /\.room-inventory-box:not\(\[hidden\]\),\s*\.style-box\.brewing-page__herbs:not\(\[hidden\]\)\s*\{[^}]*animation: room-inventory-box-enter var\(--style-motion-expand\)/s,
    );
    expect(baseCss).toContain('@keyframes room-inventory-box-enter');
    expect(baseCss).toMatch(/transform: translateY\(7px\) scale\(0\.985, 0\.965\);/);
    expect(baseCss).toMatch(/transform: translateY\(-2px\) scale\(1\.01, 1\.015\);/);
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.room-inventory-box:not\(\[hidden\]\),\s*\.style-box\.brewing-page__herbs:not\(\[hidden\]\)\s*\{[\s\S]*animation: none;/,
    );
  });
});
