// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  collectRetainedResources,
  createRetainedAcceptanceHarness,
  createSubscriptionTracker,
  snapshotRetainedResources,
} from './RetainedAcceptanceHarness.js';
import {
  isInputRegistrationAvailable,
} from '../input/InputRegistrationStore.js';
import {
  RETAINED_UI_COUNTERS,
} from '../retained/RetainedUiCounters.js';
import {
  DIALOG_IDS_BY_PAGE,
  RETAINED_DIALOG_IDS,
  RETAINED_PAGE_IDS,
  createDialogViewModel,
  createPageViewModel,
} from './RetainedAcceptanceFixtures.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient =
  () => ({
    addColorStop() {},
  });
globalThis.CanvasRenderingContext2D.prototype.fillRect = () => {};

describe('retained Pixi completion gate', () => {
  it('holds every page, dialog, handler, and pool at its warmed high-water mark', () => {
    const harness = createRetainedAcceptanceHarness();
    const pageSubscriptions = createSubscriptionTracker();
    const dialogSubscriptions = createSubscriptionTracker();
    const retainedDialogs = new Map();
    let disposed = false;

    try {
      expect(harness.pages.getPageIds()).toEqual(RETAINED_PAGE_IDS);
      expect(
        Object.fromEntries(harness.constructionCounts),
      ).toEqual(
        Object.fromEntries(
          RETAINED_PAGE_IDS.map((pageId) => [pageId, 1]),
        ),
      );
      expect(
        [...harness.dialogs.getDialogIds()].sort(),
      ).toEqual([...RETAINED_DIALOG_IDS].sort());
      expect(harness.dialogs.getStats()).toMatchObject({
        constructed: 0,
        open: 0,
        registered: RETAINED_DIALOG_IDS.length,
      });

      for (const variant of ['a', 'b']) {
        for (const pageId of RETAINED_PAGE_IDS) {
          exercisePageLifecycle({
            harness,
            pageId,
            pageSubscriptions,
            variant,
          });
        }
      }

      for (const variant of ['a', 'b']) {
        for (const pageId of RETAINED_PAGE_IDS) {
          exercisePageLifecycle({
            harness,
            pageId,
            pageSubscriptions,
            variant,
            whileActive: () => {
              for (const dialogId of DIALOG_IDS_BY_PAGE[pageId]) {
                exerciseDialogLifecycle({
                  dialogId,
                  dialogSubscriptions,
                  harness,
                  retainedDialogs,
                  variant,
                });
              }
            },
          });
        }
      }

      expect(retainedDialogs.size).toBe(RETAINED_DIALOG_IDS.length);
      expect(harness.dialogs.getStats()).toMatchObject({
        constructed: RETAINED_DIALOG_IDS.length,
        open: 0,
        registered: RETAINED_DIALOG_IDS.length,
      });
      assertQuiescent({
        dialogSubscriptions,
        harness,
        pageSubscriptions,
      });

      const pageInstances = RETAINED_PAGE_IDS.map((pageId) =>
        harness.getPage(pageId),
      );
      const retainedResources = collectRetainedResources([
        ...pageInstances,
        ...harness.getConstructedDialogs(),
      ]);
      const retainedResourceBaseline =
        snapshotRetainedResources(retainedResources);
      const inputRegistrationBaseline =
        snapshotInputRegistrations(harness.inputRouter);
      const counterBaseline = snapshotConstructionCounters(
        harness.counters,
      );

      expect(retainedResources.pools.length).toBeGreaterThan(20);
      expect(retainedResources.collections.length).toBeGreaterThan(20);
      expect(
        retainedResources.pools.filter(
          (pool) => pool.getStats().allocated > 0,
        ).length,
      ).toBeGreaterThan(RETAINED_PAGE_IDS.length);
      expect(counterBaseline).toMatchObject({
        dialogsCreated: RETAINED_DIALOG_IDS.length,
        dialogsRegistered: RETAINED_DIALOG_IDS.length,
        pagesRegistered: RETAINED_PAGE_IDS.length,
        viewsWrapped:
          RETAINED_PAGE_IDS.length + RETAINED_DIALOG_IDS.length,
      });
      expect(counterBaseline.widgetsAllocated).toBeGreaterThan(0);

      for (let cycle = 0; cycle < 4; cycle += 1) {
        const variant = cycle % 2 === 0 ? 'a' : 'b';

        for (const pageId of RETAINED_PAGE_IDS) {
          exercisePageLifecycle({
            harness,
            pageId,
            pageSubscriptions,
            variant,
            rebindWhileActive: true,
            whileActive: () => {
              for (const dialogId of DIALOG_IDS_BY_PAGE[pageId]) {
                exerciseDialogLifecycle({
                  dialogId,
                  dialogSubscriptions,
                  harness,
                  retainedDialogs,
                  variant,
                });
              }
            },
          });
        }

        expect(
          snapshotInputRegistrations(harness.inputRouter),
        ).toEqual(inputRegistrationBaseline);
        expect(
          snapshotConstructionCounters(harness.counters),
        ).toEqual(counterBaseline);
        assertQuiescent({
          dialogSubscriptions,
          harness,
          pageSubscriptions,
        });
      }

      for (const pageId of RETAINED_PAGE_IDS) {
        expect(harness.getPage(pageId)).toBe(pageInstances[
          RETAINED_PAGE_IDS.indexOf(pageId)
        ]);
        expect(getRetainedRoot(harness.getPage(pageId))).toBe(
          harness.pageRoots.get(pageId),
        );
        expect(harness.constructionCounts.get(pageId)).toBe(1);
      }

      for (const dialogId of RETAINED_DIALOG_IDS) {
        expect(harness.dialogs.get(dialogId)).toBe(
          retainedDialogs.get(dialogId),
        );
      }

      const finalResources = collectRetainedResources([
        ...pageInstances,
        ...harness.getConstructedDialogs(),
      ]);
      expectSameResourceInstances(
        retainedResources.pools,
        finalResources.pools,
      );
      expectSameResourceInstances(
        retainedResources.collections,
        finalResources.collections,
      );
      expect(snapshotRetainedResources(finalResources)).toEqual(
        retainedResourceBaseline,
      );

      const remainingRegistrations = harness.dispose();
      disposed = true;
      expect(remainingRegistrations).toHaveLength(0);
      expect(pageSubscriptions.activeCount).toBe(0);
      expect(dialogSubscriptions.activeCount).toBe(0);
      expect(harness.ticker.activeCount).toBe(0);
      expect(harness.ticker.attachments).toBe(
        harness.ticker.detachments,
      );
    } finally {
      if (!disposed) {
        harness.dispose();
      }
    }
  });
});

function exercisePageLifecycle({
  harness,
  pageId,
  pageSubscriptions,
  rebindWhileActive = false,
  variant,
  whileActive = null,
}) {
  const createModel = () =>
    createPageViewModel(pageId, variant, {
      subscribe: (listener) =>
        pageSubscriptions.subscribe(listener),
    });

  harness.pages.bind(pageId, createModel());
  harness.pages.activate(pageId);
  expect(harness.pages.getActivePageId()).toBe(pageId);
  expect(getRetainedRoot(harness.getPage(pageId))).toMatchObject({
    renderable: true,
    visible: true,
  });
  expect(pageSubscriptions.activeCount).toBe(
    pageId === 'shop' || pageId === 'guild' ? 1 : 0,
  );
  expect(harness.ticker.activeCount).toBe(
    pageId === 'garden' || pageId === 'brewing' ? 1 : 0,
  );

  if (rebindWhileActive) {
    harness.pages.bind(pageId, createModel());
  }

  whileActive?.();
  harness.pages.deactivate();
  expect(getRetainedRoot(harness.getPage(pageId))).toMatchObject({
    eventMode: 'none',
    renderable: false,
    visible: false,
  });
  expect(pageSubscriptions.activeCount).toBe(0);
  expect(harness.ticker.activeCount).toBe(0);
  expect(harness.ticker.attachments).toBe(
    harness.ticker.detachments,
  );
}

function exerciseDialogLifecycle({
  dialogId,
  dialogSubscriptions,
  harness,
  retainedDialogs,
  variant,
}) {
  harness.openOwnedDialog(
    dialogId,
    createDialogViewModel(dialogId, variant, {
      subscribe: (listener) =>
        dialogSubscriptions.subscribe(listener),
    }),
  );

  expect(harness.dialogs.isOpen(dialogId)).toBe(true);
  expect(harness.inputRouter.getTopModal()).not.toBeNull();
  expect(dialogSubscriptions.activeCount).toBe(
    dialogId.startsWith('shop.') ||
      dialogId.startsWith('guild.')
      ? 1
      : 0,
  );

  const dialog = harness.dialogs.get(dialogId);
  if (retainedDialogs.has(dialogId)) {
    expect(dialog).toBe(retainedDialogs.get(dialogId));
  } else {
    retainedDialogs.set(dialogId, dialog);
  }

  expect(harness.dialogs.close(dialogId)).toBe(true);
  expect(harness.dialogs.isOpen(dialogId)).toBe(false);
  expect(harness.inputRouter.getTopModal()).toBeNull();
  expect(dialogSubscriptions.activeCount).toBe(0);
}

function assertQuiescent({
  dialogSubscriptions,
  harness,
  pageSubscriptions,
}) {
  expect(harness.pages.getActivePageId()).toBeNull();
  expect(harness.dialogs.getOpenDialogIds()).toEqual([]);
  expect(harness.inputRouter.getTopModal()).toBeNull();
  expect(pageSubscriptions.activeCount).toBe(0);
  expect(dialogSubscriptions.activeCount).toBe(0);
  expect(harness.ticker.activeCount).toBe(0);
  expect(
    harness.inputRouter.store
      .getRegistrations()
      .filter(isInputRegistrationAvailable),
  ).toHaveLength(0);
}

function snapshotInputRegistrations(inputRouter) {
  return inputRouter.store
    .getRegistrations()
    .map((registration) => ({
      id: registration.id,
      kind: registration.kind,
      order: registration.order,
    }));
}

function snapshotConstructionCounters(counters) {
  return Object.freeze({
    dialogsCreated: counters.get(
      RETAINED_UI_COUNTERS.DIALOG_CREATED,
    ),
    dialogsRegistered: counters.get(
      RETAINED_UI_COUNTERS.DIALOG_REGISTERED,
    ),
    pagesRegistered: counters.get(
      RETAINED_UI_COUNTERS.PAGE_REGISTERED,
    ),
    viewsWrapped: counters.get(
      RETAINED_UI_COUNTERS.VIEW_WRAPPED,
    ),
    widgetsAllocated: counters.get(
      RETAINED_UI_COUNTERS.WIDGET_ALLOCATED,
    ),
    widgetsDiscarded: counters.get(
      RETAINED_UI_COUNTERS.WIDGET_DISCARDED,
    ),
  });
}

function expectSameResourceInstances(before, after) {
  expect(after).toHaveLength(before.length);
  const beforeSet = new Set(before);
  for (const resource of after) {
    expect(beforeSet.has(resource)).toBe(true);
  }
}

function getRetainedRoot(view) {
  return (
    view.getRoot?.() ??
    view.getDisplayObject?.() ??
    view.root
  );
}
