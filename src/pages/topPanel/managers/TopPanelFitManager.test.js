// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { fitTopPanelResourceFont } from './TopPanelFitManager.js';

describe('fitTopPanelResourceFont', () => {
  it('keeps default source size when resource text fits', () => {
    const resources = createResources({
      rowClientWidth: 300,
      rowNaturalWidth: 260,
      valueClientWidth: 80,
      valueNaturalWidth: 70,
    });

    expect(fitTopPanelResourceFont(resources)).toBe(15);
    expect(resources.style.getPropertyValue('--room-top-panel-resource-font-size')).toBe('15px');
    expect(resources.classList.contains('is-resource-font-shrunk')).toBe(false);
  });

  it('shrinks source size until clipped values fit their slots', () => {
    const resources = createResources({
      rowClientWidth: 300,
      rowNaturalWidth: 260,
      valueClientWidth: 80,
      valueNaturalWidth: 96,
    });

    expect(fitTopPanelResourceFont(resources)).toBe(12);
    expect(resources.style.getPropertyValue('--room-top-panel-resource-font-size')).toBe('12px');
    expect(resources.classList.contains('is-resource-font-shrunk')).toBe(true);
  });

  it('uses the minimum source size when text is still too wide', () => {
    const resources = createResources({
      rowClientWidth: 300,
      rowNaturalWidth: 500,
      valueClientWidth: 80,
      valueNaturalWidth: 160,
    });

    expect(fitTopPanelResourceFont(resources)).toBe(11);
    expect(resources.style.getPropertyValue('--room-top-panel-resource-font-size')).toBe('11px');
  });

  it('restores default source size when a later value fits', () => {
    const resources = createResources({
      rowClientWidth: 300,
      rowNaturalWidth: 260,
      valueClientWidth: 80,
      valueNaturalWidth: 70,
    });
    resources.style.setProperty('--room-top-panel-resource-font-size', '11px');

    expect(fitTopPanelResourceFont(resources)).toBe(15);
    expect(resources.style.getPropertyValue('--room-top-panel-resource-font-size')).toBe('15px');
  });
});

function createResources({ rowClientWidth, rowNaturalWidth, valueClientWidth, valueNaturalWidth }) {
  const resources = document.createElement('div');
  resources.className = 'room-top-panel__resources';

  for (const label of ['mana', 'gold', 'crystal']) {
    const resource = document.createElement('span');
    resource.className = 'room-top-panel__resource';
    const value = document.createElement('span');
    value.className = 'room-top-panel__resource-val';
    value.textContent = label;
    setMeasuredWidth(value, {
      clientWidth: valueClientWidth,
      naturalWidth: valueNaturalWidth,
      resources,
    });
    resource.append(value);
    resources.append(resource);
  }

  setMeasuredWidth(resources, {
    clientWidth: rowClientWidth,
    naturalWidth: rowNaturalWidth,
    resources,
  });

  return resources;
}

function setMeasuredWidth(element, { clientWidth, naturalWidth, resources }) {
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    get: () => Math.ceil((naturalWidth * readFontSize(resources)) / 15),
  });
}

function readFontSize(resources) {
  return (
    Number.parseFloat(
      resources.style.getPropertyValue('--room-top-panel-resource-font-size'),
    ) || 15
  );
}
