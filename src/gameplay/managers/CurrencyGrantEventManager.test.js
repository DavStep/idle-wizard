import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../../ecs/EcsFacade.js';
import { GameplayFacade } from '../GameplayFacade.js';
import { AmethystFacade } from '../amethyst/AmethystFacade.js';
import { CoinFacade } from '../coin/CoinFacade.js';
import { CrystalFacade } from '../crystal/CrystalFacade.js';
import { EmeraldFacade } from '../emerald/EmeraldFacade.js';
import { ManaFacade } from '../mana/ManaFacade.js';
import { RubyFacade } from '../ruby/RubyFacade.js';
import { CurrencyGrantEventManager } from './CurrencyGrantEventManager.js';

describe('CurrencyGrantEventManager', () => {
  it('publishes the actual credited amount and source type for every currency facade', () => {
    const ecsFacade = new EcsFacade();
    const eventManager = new CurrencyGrantEventManager();
    const events = [];
    const onGrant = (event) => eventManager.publish(event);
    const facades = [
      new CoinFacade({ onGrant }),
      new CrystalFacade({ onGrant }),
      new RubyFacade({ onGrant }),
      new EmeraldFacade({ onGrant }),
      new AmethystFacade({ onGrant }),
      new ManaFacade({
        initialCurrent: 4,
        initialCap: 5,
        initialPerSecond: 1,
        onGrant,
      }),
    ];

    ecsFacade.createWorld();
    for (const facade of facades) {
      facade.initialize(ecsFacade.getManagers());
    }
    eventManager.subscribe((event) => events.push(event));

    facades[0].add(1, { sourceType: 'coin_reward' });
    facades[1].add(2, { sourceType: 'crystal_reward' });
    facades[2].add(3, { sourceType: 'ruby_reward' });
    facades[3].add(4, { sourceType: 'emerald_reward' });
    facades[4].add(5, { sourceType: 'amethyst_reward' });
    facades[5].add(6, { sourceType: 'mana_reward' });

    expect(events).toEqual([
      { id: 1, currency: 'coin', amount: 1, sourceType: 'coin_reward' },
      { id: 2, currency: 'crystal', amount: 2, sourceType: 'crystal_reward' },
      { id: 3, currency: 'ruby', amount: 3, sourceType: 'ruby_reward' },
      { id: 4, currency: 'emerald', amount: 4, sourceType: 'emerald_reward' },
      { id: 5, currency: 'amethyst', amount: 5, sourceType: 'amethyst_reward' },
      { id: 6, currency: 'mana', amount: 1, sourceType: 'mana_reward' },
    ]);

    ecsFacade.destroyWorld();
  });

  it('always supplies a source type for direct grants', () => {
    const eventManager = new CurrencyGrantEventManager();

    expect(eventManager.publish({ currency: 'coin', amount: 2 })).toEqual({
      id: 1,
      currency: 'coin',
      amount: 2,
      sourceType: 'direct_grant',
    });
  });

  it('exposes source-tagged grant events through the gameplay facade', () => {
    const ecsFacade = new EcsFacade();
    const gameplayFacade = new GameplayFacade();
    const events = [];

    ecsFacade.createWorld();
    gameplayFacade.initialize(ecsFacade);
    gameplayFacade.subscribeCurrencyGrantEvents((event) => events.push(event));

    expect(gameplayFacade.collectShopCoinOffer()).toMatchObject({
      ok: true,
      coin: 20,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      currency: 'coin',
      amount: 20,
      sourceType: 'shop_coin_offer',
    });

    gameplayFacade.shutdown();
    ecsFacade.destroyWorld();
  });
});
