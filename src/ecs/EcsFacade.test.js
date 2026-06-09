import { describe, expect, it } from 'vitest';

import { addEntity } from 'bitecs';

import { EcsFacade } from './EcsFacade.js';

describe('EcsFacade', () => {
  it('dispatches registered systems against the active world', () => {
    const ecsFacade = new EcsFacade();
    const world = ecsFacade.createWorld();
    const calls = [];

    ecsFacade.getManagers().systems.register({
      update(activeWorld, frame) {
        calls.push({ activeWorld, frame });
      },
    });

    ecsFacade.update({ deltaSeconds: 0.016 });

    expect(calls).toHaveLength(1);
    expect(calls[0].activeWorld).toBe(world);
    expect(calls[0].frame.deltaSeconds).toBe(0.016);
  });

  it('adds and detects components through the local component manager', () => {
    const ecsFacade = new EcsFacade();
    const world = ecsFacade.createWorld();
    const component = [];
    const entityId = addEntity(world);

    ecsFacade.getManagers().components.add(entityId, component);

    expect(ecsFacade.getManagers().components.has(entityId, component)).toBe(true);
  });
});
