import { formatCoinPriceText } from '../../../../shared/coinPrice.js';
import { formatRemainingTime } from '../../../../pages/shared/timerDisplay.js';
import { ShopStallVisibilityManager } from '../../../../pages/shop/managers/ShopStallVisibilityManager.js';

const stallVisibilityManager = new ShopStallVisibilityManager();

const DEFAULT_CRYSTAL_OFFERS = Object.freeze([
  Object.freeze({
    crystalCount: 1,
    bundleLabel: '1 crystal',
    priceLabel: '$4.99',
  }),
  Object.freeze({
    crystalCount: 2,
    bundleLabel: '2 crystals',
    priceLabel: '$8.99',
  }),
  Object.freeze({
    crystalCount: 5,
    bundleLabel: '5 crystals',
    priceLabel: '$19.99',
  }),
  Object.freeze({
    crystalCount: 10,
    bundleLabel: '10 crystals',
    priceLabel: '$36.99',
  }),
  Object.freeze({
    crystalCount: 20,
    bundleLabel: '20 crystals',
    priceLabel: '$69.99',
  }),
  Object.freeze({
    crystalCount: 50,
    bundleLabel: '50 crystals',
    priceLabel: '$159.99',
  }),
]);

/**
 * Creates the renderer-neutral Shop view model from the current gameplay and
 * player-shop backend snapshots.
 *
 * This adapter only renames fields, formats already-authoritative values, and
 * routes callbacks to the supplied action owners. It never decides prices,
 * affordability, inventory availability, notification eligibility, or
 * transaction success.
 *
 * @param {{
 *   gameplaySnapshot?: object,
 *   playerShopSnapshot?: object,
 *   notificationSnapshot?: object | null,
 *   selectedTabId?: 'traders' | 'players' | 'crystals' | 'npm' | 'player',
 *   uiState?: object,
 *   actions?: object,
 *   gameplayActions?: object,
 *   playerShopActions?: object,
 *   dialogs?: object,
 *   crystalOffers?: object[],
 *   subscribe?: ((listener: (snapshot: object) => void) => (() => void) | void) | null,
 * }} [options]
 * @returns {object}
 */
export function createShop(options = {}) {
  const gameplaySnapshot = options.gameplaySnapshot ?? {};
  const shop = gameplaySnapshot.shop ?? gameplaySnapshot;
  const playerShop = options.playerShopSnapshot ?? {};
  const actions = options.actions ?? {};
  const gameplayActions =
    options.gameplayActions ?? actions.gameplay ?? actions;
  const playerShopActions =
    options.playerShopActions ?? actions.playerShop ?? actions;
  const uiActions = actions.ui ?? actions;
  const uiState = options.uiState ?? {};
  const shelf = shop.shelf ?? {};
  const playerShelf = shop.playerShelf ?? {};
  const playerRequests = shop.playerRequests ?? {};
  const selectedRequestSlotNumber =
    positiveInteger(
      uiState.selectedRequestSlotNumber ??
        playerRequests.selectedSlotNumber,
    ) ?? 1;
  const crystalOffers =
    safeArray(options.crystalOffers ?? shop.crystalOffers).length > 0
      ? safeArray(options.crystalOffers ?? shop.crystalOffers)
      : DEFAULT_CRYSTAL_OFFERS;

  const stallModels = safeArray(shelf.slots).map((slot, index) =>
    createStallModel({
      gameplaySnapshot,
      gameplayActions,
      index,
      shelf,
      slot,
      uiActions,
      uiState,
    }),
  );
  const requestModels = safeArray(playerRequests.slots).map(
    (slot, index) =>
      createRequestSlotModel({
        gameplayActions,
        index,
        playerShopActions,
        shelf,
        slot,
        uiActions,
        uiState,
      }),
  );
  const playerSlotModels = safeArray(playerShelf.slots).map(
    (slot, index) =>
      createPlayerListingSlotModel({
        gameplayActions,
        index,
        playerShopActions,
        playerShelf,
        slot,
        uiActions,
        uiState,
      }),
  );
  const proceedsCoin = finiteNumber(playerShop.proceedsCoin, 0);
  const notifications =
    options.notificationSnapshot ??
    shop.notifications ??
    null;
  const dialogs = {
    ledger: createLedgerDialog({
      gameplaySnapshot,
      gameplayActions,
      shelf,
      shop,
      uiActions,
      uiState,
    }),
    market: createMarketDialog({
      playerShop,
      uiActions,
      uiState,
    }),
    tradeHistory: createTradeHistoryDialog({
      playerShop,
      uiActions,
    }),
    support: {
      title: 'support',
      message:
        'thank you for trying to support the project but the transactions are not yet available <3',
    },
    ...(options.dialogs ?? {}),
  };

  const viewModel = {
    shop: {
      selectedTabId: normalizeTabId(
        options.selectedTabId ??
          uiState.selectedTabId ??
          shop.selectedTabId,
      ),
      market: {
        ...(shop.market ?? {}),
        name: shop.market?.name ?? 'Small Town Market',
        rank: clampInteger(shop.market?.rank, 1, 5, 1),
      },
      traders: {
        stalls: stallModels,
        timerLabel: shelf.timerLabel ?? '',
        ledger: dialogs.ledger,
      },
      players: {
        requests: {
          slots: requestModels,
          countLabel: formatSlotCount(playerRequests.slots),
          canClear: Boolean(
            requestModels.find(
              (slot) =>
                slot.slotNumber === selectedRequestSlotNumber,
            )?.hasRequest,
          ),
        },
        market: {
          slots: playerSlotModels,
          countLabel: formatSlotCount(playerShelf.slots),
          proceedsLabel:
            proceedsCoin > 0
              ? `claim (${formatCoinPriceText(proceedsCoin)})`
              : '',
          proceedsValueLabel:
            proceedsCoin > 0
              ? formatCoinPriceText(proceedsCoin)
              : '',
          canClaimProceeds:
            playerShop.connected === true && proceedsCoin > 0,
          proceedsNotification: proceedsCoin > 0,
          browseNotification: notificationChildActive(
            notifications,
            'playerMarket',
          ),
          marketDialog: dialogs.market,
          historyDialog: dialogs.tradeHistory,
        },
      },
      crystals: {
        coinOffer: createCoinOfferModel(shop.coinOffer),
        offers: crystalOffers.map((offer, index) => ({
          ...offer,
          id: offer.id ?? offer.crystalCount ?? index,
          enabled: offer.enabled !== false,
          dialog: dialogs.support,
        })),
      },
      dialogs,
      notifications,
    },
    actions: createShopActionMap({
      gameplayActions,
      playerShopActions,
      proceedsCoin,
      selectedRequestSlotNumber,
      uiActions,
    }),
    notifications,
  };

  if (typeof options.subscribe === 'function') {
    viewModel.subscribe = (listener) =>
      options.subscribe((update) => {
        const next =
          update?.gameplaySnapshot ||
          update?.playerShopSnapshot ||
          update?.notificationSnapshot
            ? update
            : { gameplaySnapshot: update };
        listener(
          createShop({
            ...options,
            ...next,
            subscribe: null,
          }),
        );
      });
  }

  return viewModel;
}

export const createShopPixiViewModel = createShop;

function createStallModel({
  gameplaySnapshot,
  gameplayActions,
  index,
  shelf,
  slot,
  uiActions,
  uiState,
}) {
  const slotNumber = positiveInteger(slot.slotNumber) ?? index + 1;
  const loadedQuantity = nonNegativeInteger(
    slot.loadedQuantity ?? slot.sellQuantity,
  );
  const batchSize = Math.max(
    1,
    Math.min(
      loadedQuantity || 1,
      positiveInteger(slot.batchSize) ?? 1,
    ),
  );
  const loaded = Boolean(slot.sellItemTypeId) && loadedQuantity > 0;
  const future = !loaded && Boolean(slot.futureItemTypeId);
  const selectedItemTypeId =
    uiState.stallItemTypeIdBySlot?.[slotNumber] ??
    slot.sellItemTypeId ??
    slot.futureItemTypeId ??
    null;
  const selectedItem = safeArray(shelf.sellItems).find(
    (item) => item.itemTypeId === selectedItemTypeId,
  );
  const visibleSellKinds = stallVisibilityManager.getVisibleSellKinds(
    gameplaySnapshot,
    safeArray(shelf.sellKinds),
  );
  const requestedKind =
    uiState.stallItemKindBySlot?.[slotNumber] ??
    selectedItem?.kind ??
    visibleSellKinds[0]?.kind ??
    null;
  const selectedKind = visibleSellKinds.some((kind) => kind.kind === requestedKind)
    ? requestedKind
    : visibleSellKinds[0]?.kind ?? null;
  const draftAllocation = finiteNumber(
    uiState.stallAllocationPercentBySlot?.[slotNumber],
    Number.NaN,
  );
  const allocationPercent = Number.isFinite(draftAllocation)
    ? draftAllocation
    : calculateAllocationPercent(slot, shelf, selectedItemTypeId);
  const price =
    loaded && Number.isFinite(Number(slot.sellCoin))
      ? formatCoinPriceText(Number(slot.sellCoin) * batchSize)
      : future
        ? 'future'
        : 'select';
  const durationSeconds = finiteNumber(shelf.autoSellSeconds, 0);
  const progressSeconds = finiteNumber(slot.sellProgressSeconds, 0);
  const paused = Boolean(slot.pauseLabel);

  return {
    ...slot,
    id: slot.id ?? slotNumber,
    slotNumber,
    title: `stall ${slotNumber}`,
    capacityLabel: '★'.repeat(batchSize),
    batchLabel: loaded ? `x${batchSize}` : '',
    itemLabel: loaded
      ? slot.sellLabel ?? 'item'
      : future
        ? `waiting for ${slot.futureItemLabel ?? 'item'}`
        : 'empty stand',
    itemKey: loaded
      ? slot.sellKey
      : future
        ? slot.futureItemKey
        : null,
    itemKind: loaded
      ? slot.sellKind
      : future
        ? slot.futureItemKind
        : null,
    quantityLabel: loaded ? String(loadedQuantity) : '',
    resourceKey: loaded
      ? slot.sellKind
      : future
        ? slot.futureItemKind
        : null,
    priceLabel: price,
    priceResourceKey: loaded ? 'coin' : null,
    progress:
      loaded && durationSeconds > 0
        ? Math.max(
            0,
            Math.min(1, progressSeconds / durationSeconds),
          )
        : null,
    timerLabel:
      slot.timerLabel ??
      (loaded && durationSeconds > 0
        ? formatRemainingTime(
            Math.max(0, durationSeconds - progressSeconds) *
              1_000,
          )
        : ''),
    paused,
    pauseLabel: slot.pauseLabel ?? '',
    semanticId: `shop.stall.${slotNumber}`,
    tutorialId: `shop:stand:${slotNumber}`,
    dialog: createStallDialog({
      allocationPercent,
      gameplaySnapshot,
      gameplayActions,
      selectedItemTypeId,
      selectedKind,
      shelf,
      slot,
      slotNumber,
      uiActions,
      visibleSellKinds,
    }),
  };
}

function createStallDialog({
  allocationPercent,
  gameplaySnapshot,
  gameplayActions,
  selectedItemTypeId,
  selectedKind,
  shelf,
  slot,
  slotNumber,
  uiActions,
  visibleSellKinds,
}) {
  const selectedItem = safeArray(shelf.sellItems).find(
    (item) => item.itemTypeId === selectedItemTypeId,
  );
  const loadedQuantity =
    selectedItem &&
    slot.sellItemTypeId === selectedItem.itemTypeId
      ? nonNegativeInteger(slot.loadedQuantity)
      : 0;
  const targetQuantity = selectedItem
    ? Math.floor(
        ((loadedQuantity + nonNegativeInteger(selectedItem.quantity)) *
          allocationPercent) /
          100,
      )
    : 0;
  const selectSlot = () =>
    callFirst(
      gameplayActions,
      ['selectShopShelfSlot', 'selectShelfSlot'],
      [slotNumber],
    );
  const selectAndCall = (methodNames, arguments_) => {
    const selection = selectSlot();
    if (selection === false || selection?.ok === false) {
      return selection;
    }
    return callFirst(gameplayActions, methodNames, arguments_);
  };
  return {
    title: 'Load Stall',
    summaryRows: [
      {
        id: 'current',
        label: 'Current',
        value: toTitleCase(
          selectedItem?.label ??
            slot.sellLabel ??
            slot.futureItemLabel ??
            'empty',
        ),
        valueResourceKey:
          selectedItem?.kind ??
          slot.sellKind ??
          slot.futureItemKind ??
          null,
        itemKey:
          selectedItem?.key ??
          slot.sellKey ??
          slot.futureItemKey ??
          null,
        itemKind:
          selectedItem?.kind ??
          slot.sellKind ??
          slot.futureItemKind ??
          null,
        quantityLabel: selectedItem ? `x${targetQuantity}` : '',
      },
    ],
    range: {
      enabled: Boolean(selectedItem),
      tone: 'root',
      value: allocationPercent,
      onChange: (percentage) =>
        callFirst(
          uiActions,
          ['setStallAllocationDraft'],
          [slotNumber, percentage, selectedItem],
        ),
    },
    items: safeArray(shelf.sellItems)
      .filter(
        (item) =>
          (!selectedKind || item.kind === selectedKind) &&
          stallVisibilityManager.isItemVisible(gameplaySnapshot, item),
      )
      .map((item) => ({
        id: item.itemTypeId ?? item.key,
        label: toTitleCase(item.label),
        detail: `${nonNegativeInteger(item.quantity)} Available`,
        value: '',
        itemKey: item.key,
        itemKind: item.kind,
        resourceKey: item.kind,
        selected: item.itemTypeId === selectedItemTypeId,
        semanticId: `shop.stall.${slotNumber}.item.${item.key ?? item.itemTypeId}`,
        tutorialId: `shop:sell:${item.key ?? item.itemTypeId}`,
        action: () =>
          callFirst(
            uiActions,
            ['selectStallItem'],
            [slotNumber, item],
          ),
      })),
    actions: [
      {
        id: 'mark',
        label: `Mark x${targetQuantity}`,
        variant: 'green',
        semanticId: `shop.stall.${slotNumber}.mark`,
        tutorialId: 'shop:sell:mark',
        enabled:
          Boolean(selectedItem) &&
          targetQuantity !== loadedQuantity,
        action: () =>
          callFirstOr(
            uiActions,
            ['markStall'],
            [slotNumber, selectedItem, allocationPercent],
            () =>
              selectAndCall(
                [
                  'setSelectedShopShelfSlotAllocation',
                  'setSelectedShelfSlotAllocation',
                ],
                [selectedItem?.itemTypeId, allocationPercent],
              ),
          ),
      },
      {
        id: 'clear',
        label: 'Clear',
        variant: 'red',
        enabled: Boolean(
          slot.sellItemTypeId ?? slot.futureItemTypeId,
        ),
        action: () =>
          callFirstOr(
            uiActions,
            ['clearStall'],
            [slotNumber],
            () =>
              selectAndCall(
                [
                  'clearSelectedShopShelfSlot',
                  'clearSelectedShelfSlot',
                ],
                [],
              ),
          ),
      },
      {
        id: 'future',
        label: slot.futureItemTypeId
          ? 'Stop Future'
          : 'Mark Future',
        enabled: Boolean(selectedItem),
        action: () =>
          callFirstOr(
            uiActions,
            ['toggleStallFuture'],
            [
              slotNumber,
              selectedItem,
              !slot.futureItemTypeId,
            ],
            () =>
              selectAndCall(
                [
                  'setSelectedShopShelfFutureItem',
                  'setSelectedShelfFutureItem',
                ],
                [
                  selectedItem?.itemTypeId,
                  !slot.futureItemTypeId,
                ],
              ),
          ),
      },
    ],
    tabs: visibleSellKinds.map((kind) => ({
      id: kind.kind,
      label: toTitleCase(kind.label),
      semanticId: `shop.stall.${slotNumber}.tab.${kind.kind}`,
      tutorialId: `shop:sell:tab:${kind.kind}`,
      selected: kind.kind === selectedKind,
      action: () =>
        callFirst(uiActions, ['selectStallItemKind'], [
          slotNumber,
          kind.kind,
        ]),
    })),
  };
}

function createRequestSlotModel({
  gameplayActions,
  index,
  playerShopActions,
  shelf,
  slot,
  uiActions,
  uiState,
}) {
  const slotNumber = positiveInteger(slot.slotNumber) ?? index + 1;
  const hasRequest =
    slot.unlocked !== false &&
    Boolean(slot.itemTypeId) &&
    positiveInteger(slot.quantity) !== null &&
    positiveInteger(slot.priceCoin) !== null;
  return {
    ...slot,
    id: slot.id ?? slotNumber,
    slotNumber,
    itemLabel: hasRequest
      ? slot.itemLabel ?? 'item'
      : 'empty request',
    quantityLabel: hasRequest ? String(slot.quantity) : '',
    value: hasRequest ? formatCoinPriceText(slot.priceCoin) : 'select',
    resourceKey: hasRequest ? slot.itemKind : null,
    valueResourceKey: hasRequest ? 'coin' : null,
    priceLabel: hasRequest
      ? formatCoinPriceText(slot.priceCoin)
      : 'select',
    priceResourceKey: hasRequest ? 'coin' : null,
    enabled: slot.unlocked !== false,
    hasRequest,
    dialog: createRequestDialog({
      gameplayActions,
      playerShopActions,
      shelf,
      slot,
      slotNumber,
      uiActions,
      uiState,
    }),
  };
}

function createRequestDialog({
  gameplayActions,
  playerShopActions,
  shelf,
  slot,
  slotNumber,
  uiActions,
  uiState,
}) {
  const draft = uiState.requestDraftBySlot?.[slotNumber] ?? slot;
  const selectedItemTypeId =
    draft.itemTypeId ?? slot.itemTypeId ?? null;
  return {
    title: 'request',
    fields: [
      {
        id: 'quantity',
        label: 'quantity',
        value: draft.quantity ?? 1,
        inputKind: 'integer',
        onChange: (value) =>
          callFirst(uiActions, ['setRequestDraftField'], [
            slotNumber,
            'quantity',
            value,
          ]),
      },
      {
        id: 'priceCoin',
        label: 'coin each',
        value: draft.priceCoin ?? 1,
        inputKind: 'integer',
        onChange: (value) =>
          callFirst(uiActions, ['setRequestDraftField'], [
            slotNumber,
            'priceCoin',
            value,
          ]),
      },
    ],
    items: safeArray(shelf.sellItems).map((item) => ({
      id: item.itemTypeId ?? item.key,
      label: item.label,
      value: `(${nonNegativeInteger(item.quantity)})`,
      resourceKey: item.kind,
      selected: item.itemTypeId === selectedItemTypeId,
      action: () =>
        callFirst(uiActions, ['selectRequestItem'], [
          slotNumber,
          item,
        ]),
    })),
    actions: [
      {
        id: 'place',
        label: 'place request',
        enabled: Boolean(selectedItemTypeId),
        action: () =>
          callFirstOr(
            uiActions,
            ['submitPlayerRequest'],
            [slotNumber, draft],
            () =>
              publishPlayerRequest({
                gameplayActions,
                playerShopActions,
                request: draft,
                shelf,
                slotNumber,
              }),
          ),
      },
    ],
    tabs: safeArray(shelf.sellKinds).map((kind) => ({
      id: kind.kind,
      label: kind.label,
      action: () =>
        callFirst(uiActions, ['selectRequestItemKind'], [
          slotNumber,
          kind.kind,
        ]),
    })),
  };
}

function createPlayerListingSlotModel({
  gameplayActions,
  index,
  playerShopActions,
  playerShelf,
  slot,
  uiActions,
  uiState,
}) {
  const slotNumber = positiveInteger(slot.slotNumber) ?? index + 1;
  const listed =
    slot.unlocked !== false &&
    Boolean(slot.itemTypeId) &&
    positiveInteger(slot.quantity) !== null;
  return {
    ...slot,
    id: slot.id ?? slotNumber,
    slotNumber,
    itemLabel: listed
      ? slot.itemLabel ?? 'item'
      : 'empty stand',
    quantityLabel: listed ? String(slot.quantity) : '',
    value: listed ? formatCoinPriceText(slot.priceCoin) : 'select',
    resourceKey: listed ? slot.itemKind : null,
    valueResourceKey: listed ? 'coin' : null,
    priceLabel: listed
      ? formatCoinPriceText(slot.priceCoin)
      : 'select',
    priceResourceKey: listed ? 'coin' : null,
    enabled: slot.unlocked !== false,
    dialog: createListingDialog({
      gameplayActions,
      playerShopActions,
      playerShelf,
      slot,
      slotNumber,
      uiActions,
      uiState,
    }),
  };
}

function createListingDialog({
  gameplayActions,
  playerShopActions,
  playerShelf,
  slot,
  slotNumber,
  uiActions,
  uiState,
}) {
  const draft = uiState.listingDraftBySlot?.[slotNumber] ?? slot;
  const selectedItemTypeId =
    draft.itemTypeId ?? slot.itemTypeId ?? null;
  return {
    title: 'list item',
    fields: [
      {
        id: 'quantity',
        label: 'quantity',
        value: draft.quantity ?? 1,
        inputKind: 'integer',
        onChange: (value) =>
          callFirst(uiActions, ['setListingDraftField'], [
            slotNumber,
            'quantity',
            value,
          ]),
      },
      {
        id: 'priceCoin',
        label: 'coin each',
        value: draft.priceCoin ?? 1,
        inputKind: 'integer',
        onChange: (value) =>
          callFirst(uiActions, ['setListingDraftField'], [
            slotNumber,
            'priceCoin',
            value,
          ]),
      },
    ],
    items: safeArray(playerShelf.sellItems).map((item) => ({
      id: item.itemTypeId ?? item.key,
      label: item.label,
      value: `(${nonNegativeInteger(item.quantity)})`,
      resourceKey: item.kind,
      selected: item.itemTypeId === selectedItemTypeId,
      action: () =>
        callFirst(uiActions, ['selectListingItem'], [
          slotNumber,
          item,
        ]),
    })),
    actions: [
      {
        id: 'list',
        label: 'list',
        enabled: Boolean(selectedItemTypeId),
        action: () =>
          callFirstOr(
            uiActions,
            ['submitPlayerListing'],
            [slotNumber, draft],
            () =>
              publishPlayerListing({
                gameplayActions,
                listing: draft,
                playerShopActions,
                playerShelf,
                slotNumber,
              }),
          ),
      },
      {
        id: 'clear',
        label: 'clear',
        enabled: Boolean(slot.itemTypeId),
        action: () =>
          callFirstOr(
            uiActions,
            ['clearPlayerListing'],
            [slotNumber],
            () =>
              clearPlayerListing({
                gameplayActions,
                playerShopActions,
                slotNumber,
              }),
          ),
      },
    ],
    tabs: safeArray(playerShelf.sellKinds).map((kind) => ({
      id: kind.kind,
      label: kind.label,
      action: () =>
        callFirst(uiActions, ['selectListingItemKind'], [
          slotNumber,
          kind.kind,
        ]),
    })),
  };
}

function createLedgerDialog({
  gameplaySnapshot,
  gameplayActions,
  shelf,
  shop,
  uiActions,
  uiState,
}) {
  const items = safeArray(shop.stock?.items ?? shelf.sellItems);
  const visibleSellKinds = stallVisibilityManager.getVisibleSellKinds(
    gameplaySnapshot,
    safeArray(shop.stock?.sellKinds ?? shelf.sellKinds),
  );
  const requestedKind = uiState.ledgerKind ?? visibleSellKinds[0]?.kind;
  const selectedKind =
    visibleSellKinds.some((kind) => kind.kind === requestedKind)
      ? requestedKind
      : visibleSellKinds[0]?.kind;
  return {
    title: 'Market Ledger',
    selectedTabId: selectedKind,
    items: items
      .filter((item) => !selectedKind || item.kind === selectedKind)
      .map((item) => ({
        id: item.itemTypeId ?? item.key,
        label: toTitleCase(item.label),
        detail: `stock ${displayCount(item.stock)} · buyers ${displayCount(
          item.npcNeed ?? item.sellNeed,
        )}`,
        value: Number.isFinite(Number(item.buyCoin))
          ? formatCoinPriceText(item.buyCoin)
          : 'offline',
        resourceKey: item.kind,
        valueResourceKey: Number.isFinite(Number(item.buyCoin))
          ? 'coin'
          : null,
        itemKey: item.key,
        itemKind: item.kind,
        enabled: item.tradedHere !== false,
        semanticId: `shop.ledger.item.${item.key ?? item.itemTypeId}`,
        action: () =>
          callFirstOr(
            uiActions,
            ['openLedgerItem'],
            [item],
            () =>
              callFirst(
                gameplayActions,
                ['buyNpcMarketStockItem', 'buyStockItem'],
                [item.itemTypeId, 1],
              ),
          ),
      })),
    tabs: visibleSellKinds.map(
      (kind) => ({
        id: kind.kind,
        label: toTitleCase(kind.label),
        selected: kind.kind === selectedKind,
        action: () =>
          callFirst(uiActions, ['selectLedgerKind'], [kind.kind]),
      }),
    ),
  };
}

function createMarketDialog({ playerShop, uiActions, uiState }) {
  const selectedTab = uiState.marketBrowseTab ?? 'selling';
  const rows =
    selectedTab === 'buying'
      ? safeArray(playerShop.requests)
      : safeArray(playerShop.listings);
  return {
    title: 'player market',
    status: playerShop.connected === false ? 'offline' : '',
    items: rows.map((row, index) => {
      const rowId =
        row.listingKey ??
        row.requestKey ??
        row.id ??
        index;
      return {
        id: rowId,
        label: `${row.username ?? 'Wizard'} · ${
          row.itemLabel ?? 'item'
        }`,
        detail: `${nonNegativeInteger(row.quantity)} available`,
        value: formatCoinPriceText(row.priceCoin),
        resourceKey: row.itemKind,
        valueResourceKey: 'coin',
        semanticId:
          selectedTab === 'buying'
            ? `shop.market.request.${rowId}`
            : `shop.market.listing.${rowId}`,
        action: () =>
          callFirst(
            uiActions,
            selectedTab === 'buying'
              ? ['fulfillPlayerRequest']
              : ['buyPlayerListing'],
            [row],
          ),
      };
    }),
    tabs: [
      {
        id: 'selling',
        label: 'selling',
        selected: selectedTab === 'selling',
        action: () =>
          callFirst(uiActions, ['selectMarketBrowseTab'], [
            'selling',
          ]),
      },
      {
        id: 'buying',
        label: 'buying',
        selected: selectedTab === 'buying',
        action: () =>
          callFirst(uiActions, ['selectMarketBrowseTab'], [
            'buying',
          ]),
      },
    ],
  };
}

function createTradeHistoryDialog({ playerShop, uiActions }) {
  return {
    title: 'trade history',
    items: safeArray(
      playerShop.ownTradeHistory ?? playerShop.tradeHistory,
    ).map((trade, index) => ({
      id: trade.tradeId ?? trade.id ?? index,
      label: trade.itemLabel ?? trade.itemKey ?? 'item',
      detail: `${
        trade.buyerUsername ?? trade.buyerIdentity ?? 'buyer'
      } ← ${
        trade.sellerUsername ?? trade.sellerIdentity ?? 'seller'
      }`,
      value: `${nonNegativeInteger(trade.quantity)} · ${formatCoinPriceText(
        trade.totalPriceCoin ?? trade.priceCoin,
      )}`,
      resourceKey: trade.itemKind,
      valueResourceKey: 'coin',
      action: () =>
        callFirst(uiActions, ['openTrade'], [trade]),
    })),
  };
}

function createCoinOfferModel(offer) {
  if (!offer) {
    return null;
  }
  return {
    ...offer,
    rewardLabel: formatCoinPriceText(offer.rewardCoin),
    actionLabel: offer.canCollect
      ? 'collect'
      : formatRemainingTime(
          finiteNumber(offer.cooldownRemainingSeconds, 0) * 1_000,
        ),
    timerLabel: formatRemainingTime(
      finiteNumber(offer.cooldownRemainingSeconds, 0) * 1_000,
    ),
    canCollect: offer.canCollect === true,
    notification: offer.canCollect === true,
  };
}

function createShopActionMap({
  gameplayActions,
  playerShopActions,
  proceedsCoin,
  selectedRequestSlotNumber,
  uiActions,
}) {
  const result = {};
  if (hasAnyMethod(uiActions, ['selectTab'])) {
    result.selectTab = (...arguments_) =>
      callFirst(uiActions, ['selectTab'], arguments_);
  }
  if (
    hasAnyMethod(uiActions, ['clearPlayerRequest']) ||
    hasAnyMethod(gameplayActions, ['clearPlayerShopRequest'])
  ) {
    result.clearPlayerRequest = () =>
      callFirstOr(
        uiActions,
        ['clearPlayerRequest'],
        [selectedRequestSlotNumber],
        () =>
          clearPlayerRequest({
            gameplayActions,
            playerShopActions,
            slotNumber: selectedRequestSlotNumber,
          }),
      );
  }
  if (
    hasAnyMethod(uiActions, ['claimPlayerMarketProceeds']) ||
    hasAnyMethod(playerShopActions, ['claimProceeds']) ||
    hasAnyMethod(gameplayActions, [
      'claimPlayerShopSaleProceeds',
    ])
  ) {
    result.claimPlayerMarketProceeds = () =>
      callFirstOr(
        uiActions,
        ['claimPlayerMarketProceeds'],
        [proceedsCoin],
        () =>
          claimPlayerMarketProceeds({
            gameplayActions,
            playerShopActions,
            proceedsCoin,
          }),
      );
  }
  if (
    hasAnyMethod(gameplayActions, [
      'collectShopCoinOffer',
      'collectCoinOffer',
    ])
  ) {
    result.collectCoinOffer = () =>
      callFirst(
        gameplayActions,
        ['collectShopCoinOffer', 'collectCoinOffer'],
        [],
      );
  }
  if (hasAnyMethod(uiActions, ['onActivate'])) {
    result.onActivate = () =>
      callFirst(uiActions, ['onActivate'], []);
  }
  if (hasAnyMethod(uiActions, ['onDeactivate'])) {
    result.onDeactivate = () =>
      callFirst(uiActions, ['onDeactivate'], []);
  }
  return result;
}

async function publishPlayerRequest({
  gameplayActions,
  playerShopActions,
  request,
  shelf,
  slotNumber,
}) {
  const item = safeArray(shelf.sellItems).find(
    (candidate) =>
      candidate.itemTypeId === request.itemTypeId,
  );
  if (hasAnyMethod(playerShopActions, ['setSlotRequest'])) {
    const published = await callFirst(
      playerShopActions,
      ['setSlotRequest'],
      [
        {
          slotNumber,
          itemKey: item?.key ?? request.itemKey,
          itemLabel: item?.label ?? request.itemLabel,
          itemKind: item?.kind ?? request.itemKind,
          quantity: request.quantity,
          priceCoin: request.priceCoin,
        },
      ],
    );
    if (published === false || published?.ok === false) {
      return published;
    }
  }
  return callFirst(
    gameplayActions,
    ['setPlayerShopRequest'],
    [
      slotNumber,
      {
        itemTypeId: request.itemTypeId,
        quantity: request.quantity,
        priceCoin: request.priceCoin,
      },
    ],
  );
}

async function clearPlayerRequest({
  gameplayActions,
  playerShopActions,
  slotNumber,
}) {
  if (hasAnyMethod(playerShopActions, ['clearSlotRequest'])) {
    const published = await callFirst(
      playerShopActions,
      ['clearSlotRequest'],
      [slotNumber],
    );
    if (published === false || published?.ok === false) {
      return published;
    }
  }
  return callFirst(
    gameplayActions,
    ['clearPlayerShopRequest'],
    [slotNumber],
  );
}

async function publishPlayerListing({
  gameplayActions,
  listing,
  playerShopActions,
  playerShelf,
  slotNumber,
}) {
  const item = safeArray(playerShelf.sellItems).find(
    (candidate) =>
      candidate.itemTypeId === listing.itemTypeId,
  );
  if (hasAnyMethod(playerShopActions, ['setSlotListing'])) {
    const published = await callFirst(
      playerShopActions,
      ['setSlotListing'],
      [
        {
          slotNumber,
          itemKey: item?.key ?? listing.itemKey,
          itemLabel: item?.label ?? listing.itemLabel,
          itemKind: item?.kind ?? listing.itemKind,
          quantity: listing.quantity,
          priceCoin: listing.priceCoin,
        },
      ],
    );
    if (published === false || published?.ok === false) {
      return published;
    }
  }
  const selected = callFirst(
    gameplayActions,
    ['selectPlayerShopShelfSlot'],
    [slotNumber],
  );
  if (selected === false || selected?.ok === false) {
    return selected;
  }
  return callFirst(
    gameplayActions,
    ['setSelectedPlayerShopShelfSlotListing'],
    [
      {
        itemTypeId: listing.itemTypeId,
        quantity: listing.quantity,
        priceCoin: listing.priceCoin,
      },
    ],
  );
}

async function clearPlayerListing({
  gameplayActions,
  playerShopActions,
  slotNumber,
}) {
  if (hasAnyMethod(playerShopActions, ['clearSlotListing'])) {
    const published = await callFirst(
      playerShopActions,
      ['clearSlotListing'],
      [slotNumber],
    );
    if (published === false || published?.ok === false) {
      return published;
    }
  }
  const selected = callFirst(
    gameplayActions,
    ['selectPlayerShopShelfSlot'],
    [slotNumber],
  );
  if (selected === false || selected?.ok === false) {
    return selected;
  }
  return callFirst(
    gameplayActions,
    ['clearSelectedPlayerShopShelfSlotListing'],
    [],
  );
}

async function claimPlayerMarketProceeds({
  gameplayActions,
  playerShopActions,
  proceedsCoin,
}) {
  if (hasAnyMethod(playerShopActions, ['claimProceeds'])) {
    const claimed = await callFirst(
      playerShopActions,
      ['claimProceeds'],
      [],
    );
    if (claimed === false || claimed?.ok === false) {
      return claimed;
    }
  }
  return callFirst(
    gameplayActions,
    ['claimPlayerShopSaleProceeds'],
    [proceedsCoin],
  );
}

function calculateAllocationPercent(
  slot,
  shelf,
  selectedItemTypeId,
) {
  if (!selectedItemTypeId) {
    return 0;
  }
  const item = safeArray(shelf.sellItems).find(
    (candidate) =>
      candidate.itemTypeId === selectedItemTypeId,
  );
  const loaded =
    slot.sellItemTypeId === selectedItemTypeId
      ? nonNegativeInteger(slot.loadedQuantity)
      : 0;
  const total = loaded + nonNegativeInteger(item?.quantity);
  return total > 0 ? Math.round((loaded / total) * 100) : 0;
}

function formatSlotCount(slots) {
  const values = safeArray(slots);
  const unlocked = values.filter(
    (slot) => slot?.unlocked !== false,
  );
  const used = unlocked.filter(
    (slot) => Boolean(slot?.itemTypeId ?? slot?.sellItemTypeId),
  );
  return `${used.length}/${unlocked.length}`;
}

function notificationChildActive(snapshot, key) {
  const page =
    snapshot?.pages?.shop ??
    snapshot?.shop ??
    snapshot;
  const value = page?.children?.[key];
  return (
    value === true ||
    value === 'red' ||
    value === 'orange' ||
    value?.active === true
  );
}

function normalizeTabId(tabId) {
  if (tabId === 'npm' || tabId === 'trader') {
    return 'traders';
  }
  if (tabId === 'player') {
    return 'players';
  }
  return ['traders', 'players', 'crystals'].includes(tabId)
    ? tabId
    : 'traders';
}

function callFirst(target, methodNames, arguments_) {
  for (const methodName of methodNames) {
    if (typeof target?.[methodName] === 'function') {
      return target[methodName](...arguments_);
    }
  }
  return undefined;
}

function callFirstOr(
  target,
  methodNames,
  arguments_,
  fallback,
) {
  const methodName = methodNames.find(
    (candidate) => typeof target?.[candidate] === 'function',
  );
  return methodName
    ? target[methodName](...arguments_)
    : fallback();
}

function hasAnyMethod(target, methodNames) {
  return methodNames.some(
    (methodName) => typeof target?.[methodName] === 'function',
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function positiveInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, number))
    : fallback;
}

function displayCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.max(0, number)) : '—';
}

function toTitleCase(value) {
  return String(value ?? '').replace(
    /\b([a-z])/g,
    (character) => character.toUpperCase(),
  );
}
