// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { CostButtonManager } from './CostButtonManager.js';

describe('CostButtonManager', () => {
  it('renders a centered resource cost and owns the enabled state', () => {
    const button = document.createElement('button');
    const manager = new CostButtonManager({
      button,
      onPress: vi.fn(),
    });

    manager.setData({
      amountLabel: '25 Coin',
      enabled: true,
      ariaLabel: 'Buy Research for 25 Coin',
    });

    expect(button.classList.contains('style-cost-button')).toBe(true);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Buy Research for 25 Coin');
    expect(button.dataset.resourceColor).toBe('coin');
    expect(button.querySelector('.style-resource-label__amount')?.textContent).toBe('25');
    const icon = button.querySelector('.style-resource-label__icon');
    expect(icon?.tagName).toBe('IMG');
    expect(icon?.getAttribute('src')).toContain(
      '/assets/game/source/icons/icon-coin.png',
    );
    expect(icon?.dataset.currencyIcon).toBe('coin');
  });

  it('switches from a resource cost to a disabled text-only state', () => {
    const button = document.createElement('button');
    const manager = new CostButtonManager({
      button,
      onPress: vi.fn(),
    });

    manager.setData({
      amountLabel: '2 Crystal',
      enabled: true,
    });
    manager.setData({
      amountLabel: 'Locked',
      enabled: false,
      title: 'Requires level 4.',
    });

    expect(button.textContent).toBe('Locked');
    expect(button.querySelector('.style-resource-label')).toBeNull();
    expect(button.querySelector('.style-cost-button__plain-label')?.textContent).toBe(
      'Locked',
    );
    expect(button.dataset.resourceColor).toBeUndefined();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.title).toBe('Requires level 4.');
  });

  it('isolates the cost action from its parent and ignores disabled presses', () => {
    const parent = document.createElement('div');
    const button = document.createElement('button');
    const onParentClick = vi.fn();
    const onPress = vi.fn();
    parent.append(button);
    parent.addEventListener('click', onParentClick);
    const manager = new CostButtonManager({ button, onPress });

    manager.setData({
      amountLabel: 'Free',
      enabled: true,
    });
    expect(button.querySelector('.style-cost-button__plain-label')?.textContent).toBe(
      'Free',
    );
    button.click();

    expect(onPress).toHaveBeenCalledOnce();
    expect(onParentClick).not.toHaveBeenCalled();

    manager.setData({
      amountLabel: '5 Ruby',
      enabled: false,
    });
    button.click();

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('rejects missing controls and empty labels', () => {
    expect(() => new CostButtonManager()).toThrow('requires a button element');

    const button = document.createElement('button');
    expect(() => new CostButtonManager({ button })).toThrow('requires an onPress handler');

    const manager = new CostButtonManager({ button, onPress: () => {} });
    expect(() => manager.setData({ amountLabel: '  ', enabled: true })).toThrow(
      'requires a visible amount label',
    );
  });
});
