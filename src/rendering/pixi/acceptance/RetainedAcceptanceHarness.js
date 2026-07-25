import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../pages/workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';

import { PixiInputRouter } from '../input/PixiInputRouter.js';
import { BrewingPixiPage } from '../pages/brewing/BrewingPixiPage.js';
import { GardenPixiPage } from '../pages/garden/GardenPixiPage.js';
import { GuildPixiPage } from '../pages/guild/GuildPixiPage.js';
import { PrestigePixiPage } from '../pages/prestige/PrestigePixiPage.js';
import { ResearchPixiPage } from '../pages/research/ResearchPixiPage.js';
import { ShopPixiPage } from '../pages/shop/ShopPixiPage.js';
import { WorkshopPixiPage } from '../pages/workshop/WorkshopPixiPage.js';
import { DialogRegistry } from '../retained/DialogRegistry.js';
import { PageRegistry } from '../retained/PageRegistry.js';
import { PooledCollection } from '../retained/PooledCollection.js';
import { RetainedUiCounters } from '../retained/RetainedUiCounters.js';
import { SemanticTargetRegistry } from '../retained/SemanticTargetRegistry.js';
import { WidgetPool } from '../retained/WidgetPool.js';
import { RETAINED_PAGE_IDS } from './RetainedAcceptanceFixtures.js';

installPixiPageTestCanvas();

export function createRetainedAcceptanceHarness() {
  const counters = new RetainedUiCounters();
  const dialogLayer = new Container({
    label: 'retained-acceptance-dialog-layer',
  });
  const dialogs = new DialogRegistry({ counters });
  const inputRouter = new PixiInputRouter();
  const semanticTargets = new SemanticTargetRegistry({ counters });
  const ticker = createTickerTracker();
  const assetManager = createPixiAssetManagerFake(Texture);
  const constructionCounts = new Map();

  const pageFactories = {
    workshop: () =>
      new WorkshopPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticTargets,
      }),
    research: () =>
      new ResearchPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticTargets,
      }),
    prestige: () =>
      new PrestigePixiPage({
        assetManager,
        counters,
        inputRouter,
        semanticTargets,
      }),
    garden: () =>
      new GardenPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticTargets,
        ticker,
        timeSource: () => 0,
      }),
    brewing: () =>
      new BrewingPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticTargets,
        ticker,
        timeSource: () => 0,
      }),
    shop: () =>
      new ShopPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticRegistry: semanticTargets,
      }),
    guild: () =>
      new GuildPixiPage({
        assetManager,
        counters,
        dialogLayer,
        dialogRegistry: dialogs,
        inputRouter,
        semanticRegistry: semanticTargets,
      }),
  };

  const pageEntries = RETAINED_PAGE_IDS.map((pageId) => {
    constructionCounts.set(
      pageId,
      (constructionCounts.get(pageId) ?? 0) + 1,
    );
    return [pageId, pageFactories[pageId]()];
  });
  const pages = new PageRegistry({
    counters,
    pages: pageEntries,
  });
  const pageRoots = new Map(
    pageEntries.map(([pageId, page]) => [
      pageId,
      getRetainedRoot(page),
    ]),
  );
  let disposed = false;

  return {
    constructionCounts,
    counters,
    dialogLayer,
    dialogs,
    inputRouter,
    pageRoots,
    pages,
    semanticTargets,
    ticker,
    getPage(pageId) {
      return pages.get(pageId);
    },
    getConstructedDialogs() {
      return dialogs
        .getDialogIds()
        .map((dialogId) => dialogs.get(dialogId))
        .filter(Boolean);
    },
    openOwnedDialog(dialogId, viewModel) {
      const pageId = dialogId.split('.')[0];
      const page = pages.get(pageId);

      if (pageId === 'research') {
        return dialogs.open(dialogId, viewModel);
      }

      if (pageId === 'garden') {
        return page.openDialog(
          dialogId.slice('garden.'.length),
          viewModel,
        );
      }

      if (pageId === 'brewing') {
        const kind =
          dialogId === 'brewing.recipe-choice'
            ? 'choice'
            : dialogId === 'brewing.automation-settings'
              ? 'settings'
            : 'recipes';
        return page.openDialog(kind, viewModel);
      }

      return page.openDialog(dialogId, viewModel);
    },
    dispose() {
      if (disposed) {
        return [];
      }

      pages.destroy();
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
      const remainingRegistrations =
        inputRouter.store.getRegistrations();
      inputRouter.destroy();
      disposed = true;
      return remainingRegistrations;
    },
  };
}

export function createSubscriptionTracker() {
  const listeners = new Set();
  let subscriptions = 0;
  let unsubscriptions = 0;

  return {
    subscribe(listener) {
      listeners.add(listener);
      subscriptions += 1;
      let active = true;

      return () => {
        if (!active) {
          return;
        }

        active = false;
        listeners.delete(listener);
        unsubscriptions += 1;
      };
    },
    get activeCount() {
      return listeners.size;
    },
    get subscriptions() {
      return subscriptions;
    },
    get unsubscriptions() {
      return unsubscriptions;
    },
  };
}

export function collectRetainedResources(roots) {
  const collections = [];
  const pools = [];
  const seen = new WeakSet();

  for (const root of roots) {
    visit(root, 0);
  }

  return Object.freeze({
    collections: Object.freeze(collections),
    pools: Object.freeze(pools),
  });

  function visit(value, depth) {
    if (
      value === null ||
      value === undefined ||
      (typeof value !== 'object' && typeof value !== 'function') ||
      seen.has(value) ||
      depth > 12
    ) {
      return;
    }
    seen.add(value);

    if (value instanceof Container) {
      return;
    }

    if (value instanceof WidgetPool) {
      pools.push(value);
      for (const widget of value.owned) {
        visit(widget, depth + 1);
      }
      return;
    }

    if (value instanceof PooledCollection) {
      collections.push(value);
      visit(value.pool, depth + 1);
      for (const widget of value.widgetsByKey.values()) {
        visit(widget, depth + 1);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, depth + 1);
      }
      return;
    }

    if (value instanceof Map) {
      for (const item of value.values()) {
        visit(item, depth + 1);
      }
      return;
    }

    if (value instanceof Set) {
      for (const item of value) {
        visit(item, depth + 1);
      }
      return;
    }

    for (const property of Object.values(value)) {
      visit(property, depth + 1);
    }
  }
}

export function snapshotRetainedResources(resources) {
  return Object.freeze({
    collections: new Map(
      resources.collections.map((collection) => [
        collection,
        pickCollectionStats(collection.getStats()),
      ]),
    ),
    pools: new Map(
      resources.pools.map((pool) => [
        pool,
        pickPoolStats(pool.getStats()),
      ]),
    ),
  });
}

function createTickerTracker() {
  const handlers = new Set();
  let attachments = 0;
  let detachments = 0;

  return {
    add(handler) {
      if (handlers.has(handler)) {
        throw new Error('A retained ticker handler was attached twice.');
      }

      handlers.add(handler);
      attachments += 1;
    },
    remove(handler) {
      if (handlers.delete(handler)) {
        detachments += 1;
      }
    },
    get activeCount() {
      return handlers.size;
    },
    get attachments() {
      return attachments;
    },
    get detachments() {
      return detachments;
    },
  };
}

function getRetainedRoot(view) {
  return (
    view.getRoot?.() ??
    view.getDisplayObject?.() ??
    view.root
  );
}

function pickPoolStats(stats) {
  return Object.freeze({
    active: stats.active,
    allocated: stats.allocated,
    available: stats.available,
    discarded: stats.discarded,
    highWaterMark: stats.highWaterMark,
    retained: stats.retained,
  });
}

function pickCollectionStats(stats) {
  return Object.freeze({
    highWaterMark: stats.highWaterMark,
    size: stats.size,
  });
}
