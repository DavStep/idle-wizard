import { formatCoinPriceText } from '../../../../shared/coinPrice.js';
import {
  PLAYER_MARKET_MAX_PRICE_COIN,
  PLAYER_MARKET_MAX_QUANTITY,
} from '../../../../shared/playerMarketLimits.js';
import { formatRemainingTime } from '../../../../pages/shared/timerDisplay.js';
import { ShopStallVisibilityManager } from '../../../../pages/shop/managers/ShopStallVisibilityManager.js';

const stallVisibilityManager = new ShopStallVisibilityManager();

const AMBER_PRICES = Object.freeze([
  [1, '$4.99'],
  [2, '$8.99'],
  [5, '$19.99'],
  [10, '$36.99'],
  [20, '$69.99'],
  [50, '$159.99'],
]);
const GEM_BUNDLE_NAMES = Object.freeze([
  'Pouch',
  'Bag',
  'Pile',
  'Chest',
  'Trove',
  'Hoard',
]);
const DEFAULT_CRYSTAL_OFFERS = Object.freeze([
  ...AMBER_PRICES.map(([amount, priceLabel], index) => Object.freeze({
    id: `amber-${amount}`,
    resourceKey: 'crystal',
    crystalCount: amount,
    amount,
    title: `Amber ${GEM_BUNDLE_NAMES[index]}`,
    bundleLabel: `${amount} amber`,
    priceLabel,
  })),
  ...AMBER_PRICES.map(([amount, priceLabel], index) => Object.freeze({
    id: `amethyst-${amount * 100}`,
    resourceKey: 'amethyst',
    amethystCount: amount * 100,
    amount: amount * 100,
    title: `Amethyst ${GEM_BUNDLE_NAMES[index]}`,
    bundleLabel: `${amount * 100} amethyst`,
    priceLabel,
  })),
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
 *   playerInfoSnapshot?: object,
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
  const playerInfo = options.playerInfoSnapshot ?? {};
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
  const notifications =
    options.notificationSnapshot ??
    shop.notifications ??
    null;
  const npcListingNotification = notificationChildState(
    notifications,
    'npcListing',
  );

  const stallModels = safeArray(shelf.slots).map((slot, index) =>
    createStallModel({
      gameplaySnapshot,
      gameplayActions,
      index,
      npcListingNotification,
      shelf,
      slot,
      uiActions,
      uiState,
    }),
  );
  const requestModels = safeArray(playerRequests.slots).map(
    (slot, index) =>
      createRequestSlotModel({
        gameplaySnapshot,
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
        gameplaySnapshot,
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
      playerInfo,
      playerShop,
      uiActions,
      uiState,
    }),
    buy: createMarketBuyDialog({
      gameplaySnapshot,
      playerInfo,
      playerShop,
      uiActions,
      uiState,
    }),
    tradeHistory: createTradeHistoryDialog({
      playerShop,
      uiActions,
    }),
    support: {
      title: 'Support',
      message:
        'Thank you for trying to support the project but the transactions are not yet available <3',
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
        dailyCrystalOffer: createDailyCrystalOfferModel(
          shop.dailyCrystalOffer,
        ),
        offers: crystalOffers.map((offer, index) => ({
          ...offer,
          id: offer.id ?? offer.amethystCount ?? offer.crystalCount ?? index,
          resourceKey: offer.resourceKey ?? 'crystal',
          amountLabel:
            offer.amountLabel ??
            offer.amount ??
            offer.amethystCount ??
            offer.crystalCount,
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
  npcListingNotification,
  shelf,
  slot,
  uiActions,
  uiState,
}) {
  const slotNumber = positiveInteger(slot.slotNumber) ?? index + 1;
  const buySlot =
    slot.unlocked === false && slotNumber === shelf.nextSlotNumber;
  const costCoin = buySlot && Number.isFinite(Number(shelf.nextSlotCost))
    ? Number(shelf.nextSlotCost)
    : null;
  const lockedByLevel = buySlot && shelf.nextSlotLockedByLevel === true;
  const affordable =
    costCoin === null ||
    finiteNumber(gameplaySnapshot.coin?.current, 0) >= costCoin;
  if (buySlot) {
    return {
      ...slot,
      id: slot.id ?? slotNumber,
      slotNumber,
      title: '',
      itemLabel: lockedByLevel
        ? `Reach Level ${shelf.nextSlotRequiresLevel ?? ''}`.trim()
        : '',
      quantityLabel: '',
      priceLabel: costCoin === null ? '' : formatCoinPriceText(costCoin),
      priceResourceKey: costCoin > 0 ? 'coin' : null,
      buySlot: true,
      costCoin,
      affordable,
      lockedByLevel,
      enabled: !lockedByLevel,
      selected: false,
      notification: false,
      semanticId: `shop.stall.${slotNumber}`,
      tutorialId: `shop:stand:${slotNumber}`,
      action: () =>
        callFirst(
          gameplayActions,
          ['buyShopShelfSlot', 'buyNextShelfSlot'],
          [],
        ),
    };
  }
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
  const loadedSelectedQuantity =
    slot.sellItemTypeId === selectedItemTypeId
      ? nonNegativeInteger(slot.loadedQuantity)
      : 0;
  const allocationTotal =
    loadedSelectedQuantity +
    nonNegativeInteger(selectedItem?.quantity);
  const draftTargetQuantity = finiteNumber(
    uiState.stallTargetQuantityBySlot?.[slotNumber],
    Number.NaN,
  );
  const targetQuantity = Math.max(
    0,
    Math.min(
      allocationTotal,
      Number.isFinite(draftTargetQuantity)
        ? Math.floor(draftTargetQuantity)
        : loadedSelectedQuantity,
    ),
  );
  const price =
    loaded && Number.isFinite(Number(slot.sellCoin))
      ? formatCoinPriceText(Number(slot.sellCoin) * batchSize)
      : future
        ? 'future'
        : 'select';
  const durationSeconds = finiteNumber(shelf.autoSellSeconds, 0);
  const progressSeconds = finiteNumber(slot.sellProgressSeconds, 0);
  const paused = Boolean(slot.pauseLabel);
  const notification =
    npcListingNotification.active &&
    slot.unlocked === true &&
    !loaded &&
    !future;
  const cancelAction = () =>
    callFirstOr(
      uiActions,
      ['clearStall'],
      [slotNumber],
      () => {
        const selection = callFirst(
          gameplayActions,
          ['selectShopShelfSlot', 'selectShelfSlot'],
          [slotNumber],
        );
        if (selection === false || selection?.ok === false) {
          return selection;
        }
        return callFirst(
          gameplayActions,
          [
            'clearSelectedShopShelfSlot',
            'clearSelectedShelfSlot',
          ],
          [],
        );
      },
    );

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
    priceVariant: price === 'select' ? 'green' : null,
    priceResourceKey: loaded ? 'coin' : null,
    salePriceLabel: loaded ? price : '',
    salePriceResourceKey: loaded ? 'coin' : null,
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
    notification,
    notificationTone: notification
      ? npcListingNotification.tone
      : null,
    selected: loaded || future,
    cancelAction,
    semanticId: `shop.stall.${slotNumber}`,
    tutorialId: `shop:stand:${slotNumber}`,
    dialog: createStallDialog({
      gameplaySnapshot,
      gameplayActions,
      cancelAction,
      selectedItemTypeId,
      selectedKind,
      shelf,
      slot,
      slotNumber,
      targetQuantity,
      uiActions,
      visibleSellKinds,
    }),
  };
}

function createStallDialog({
  gameplaySnapshot,
  gameplayActions,
  cancelAction,
  selectedItemTypeId,
  selectedKind,
  shelf,
  slot,
  slotNumber,
  targetQuantity,
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
  const totalQuantity = selectedItem
    ? loadedQuantity + nonNegativeInteger(selectedItem.quantity)
    : 0;
  const visibleItems = safeArray(shelf.sellItems).filter((item) =>
    stallVisibilityManager.isItemVisible(gameplaySnapshot, item),
  );
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
      tone: 'yellow',
      min: 0,
      max: totalQuantity,
      step: 1,
      value: targetQuantity,
      tutorialTargetValue:
        totalQuantity > 0 ? 1 : 0,
      onChange: (quantity) =>
        callFirst(
          uiActions,
          ['setStallTargetQuantityDraft'],
          [slotNumber, quantity, selectedItem],
        ),
    },
    items: visibleItems
      .filter(
        (item) =>
          !selectedKind || item.kind === selectedKind,
      )
      .map((item) => {
        const sellable = isSellReady(item);
        return {
          id: item.itemTypeId ?? item.key,
          label: toTitleCase(item.label),
          detail: `${nonNegativeInteger(item.quantity)} Available`,
          value:
            positiveInteger(item.sellCoin) !== null
              ? formatCoinPriceText(item.sellCoin)
              : '',
          valueIconResourceKey:
            positiveInteger(item.sellCoin) !== null
              ? 'coin'
              : null,
          itemKey: item.key,
          itemKind: item.kind,
          resourceKey: item.kind,
          selected: item.itemTypeId === selectedItemTypeId,
          notification: sellable,
          semanticId: `shop.stall.${slotNumber}.item.${item.key ?? item.itemTypeId}`,
          tutorialId: `shop:sell:${item.key ?? item.itemTypeId}`,
          action: () =>
            callFirst(
              uiActions,
              ['selectStallItem'],
              [slotNumber, item],
            ),
        };
      }),
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
            [slotNumber, selectedItem, targetQuantity],
            () =>
              selectAndCall(
                [
                  'setSelectedShopShelfSlotQuantity',
                  'setSelectedShelfSlotQuantity',
                ],
                [selectedItem?.itemTypeId, targetQuantity],
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
        action: cancelAction,
      },
    ],
    tabs: visibleSellKinds.map((kind) => ({
      id: kind.kind,
      label: toTitleCase(kind.label),
      notification: visibleItems.some(
        (item) => item.kind === kind.kind && isSellReady(item),
      ),
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

function isSellReady(item) {
  return (
    nonNegativeInteger(item?.quantity) > 0 &&
    positiveInteger(item?.sellCoin) !== null
  );
}

function createRequestSlotModel({
  gameplaySnapshot,
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
  const cancelAction = () =>
    callFirstOr(
      uiActions,
      ['clearPlayerRequest'],
      [slotNumber],
      () =>
        clearPlayerRequest({
          gameplayActions,
          playerShopActions,
          slotNumber,
        }),
    );
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
    selected: hasRequest,
    cancelAction,
    hasRequest,
    action: () => {
      callFirst(uiActions, ['selectPlayerRequestSlot'], [slotNumber]);
      return null;
    },
    dialog: createRequestDialog({
      gameplaySnapshot,
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
  gameplaySnapshot,
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
  const selectedItem = safeArray(shelf.sellItems).find(
    (item) => item.itemTypeId === selectedItemTypeId,
  );
  const visibleSellKinds = stallVisibilityManager.getVisibleSellKinds(
    gameplaySnapshot,
    safeArray(shelf.sellKinds),
  );
  const requestedKind =
    uiState.requestItemKindBySlot?.[slotNumber] ??
    selectedItem?.kind ??
    visibleSellKinds[0]?.kind ??
    null;
  const selectedKind = visibleSellKinds.some(
    (kind) => kind.kind === requestedKind,
  )
    ? requestedKind
    : visibleSellKinds[0]?.kind ?? null;
  const quantity = positiveInteger(draft.quantity);
  const priceCoin = positiveInteger(draft.priceCoin);
  const status = String(
    uiState.requestStatusBySlot?.[slotNumber] ?? '',
  );
  return {
    title: 'Request',
    status,
    summaryRows: [
      {
        id: 'current',
        label: 'Current',
        value: toTitleCase(selectedItem?.label ?? slot.itemLabel ?? 'empty'),
        valueResourceKey: selectedItem?.kind ?? slot.itemKind ?? null,
        itemKey: selectedItem?.key ?? slot.itemKey ?? null,
        itemKind: selectedItem?.kind ?? slot.itemKind ?? null,
      },
    ],
    fields: [
      {
        id: 'priceCoin',
        label: 'Coins Per Item',
        value: draft.priceCoin ?? 1,
        inputKind: 'integer',
        maxLength: String(PLAYER_MARKET_MAX_PRICE_COIN).length,
        onChange: (value) =>
          callFirst(uiActions, ['setRequestDraftField'], [
            slotNumber,
            'priceCoin',
            value,
          ]),
      },
      {
        id: 'quantity',
        label: 'Max Quantity',
        value: draft.quantity ?? 1,
        inputKind: 'integer',
        maxLength: String(PLAYER_MARKET_MAX_QUANTITY).length,
        onChange: (value) =>
          callFirst(uiActions, ['setRequestDraftField'], [
            slotNumber,
            'quantity',
            value,
          ]),
      },
    ],
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
        semanticId: `shop.request.${slotNumber}.item.${item.key ?? item.itemTypeId}`,
        action: () =>
          callFirst(uiActions, ['selectRequestItem'], [
            slotNumber,
            item,
          ]),
      })),
    actions: [
      {
        id: 'place',
        label: 'Place Request',
        variant: 'green',
        enabled:
          Boolean(selectedItemTypeId) &&
          quantity !== null &&
          priceCoin !== null &&
          quantity <= PLAYER_MARKET_MAX_QUANTITY &&
          priceCoin <= PLAYER_MARKET_MAX_PRICE_COIN &&
          status !== 'requesting',
        action: async () => {
          const result = await callFirstOr(
            uiActions,
            ['submitPlayerRequest'],
            [
              slotNumber,
              {
                ...draft,
                itemTypeId: selectedItemTypeId,
                quantity,
                priceCoin,
              },
            ],
            () =>
              publishPlayerRequest({
                gameplayActions,
                playerShopActions,
                request: {
                  ...draft,
                  itemTypeId: selectedItemTypeId,
                  quantity,
                  priceCoin,
                },
                shelf,
                slotNumber,
              }),
          );
          if (result !== false && result?.ok !== false) {
            callFirst(uiActions, ['closePlayerRequestDialog'], [slotNumber]);
          }
          return result;
        },
      },
    ],
    tabs: visibleSellKinds.map((kind) => ({
      id: kind.kind,
      label: toTitleCase(kind.label),
      selected: kind.kind === selectedKind,
      semanticId: `shop.request.${slotNumber}.tab.${kind.kind}`,
      action: () =>
        callFirst(uiActions, ['selectRequestItemKind'], [
          slotNumber,
          kind.kind,
        ]),
    })),
  };
}

function createPlayerListingSlotModel({
  gameplaySnapshot,
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
  const cancelAction = () =>
    callFirstOr(
      uiActions,
      ['clearPlayerListing'],
      [slotNumber],
      () =>
        listed
          ? clearPlayerListing({
              gameplayActions,
              playerShopActions,
              slotNumber,
            })
          : { ok: false, reason: 'nothing_to_clear' },
    );
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
    selected: listed,
    cancelAction,
    action: () => {
      callFirst(uiActions, ['selectPlayerListingSlot'], [slotNumber]);
      return null;
    },
    dialog: createListingDialog({
      gameplaySnapshot,
      gameplayActions,
      playerShopActions,
      playerShelf,
      slot,
      slotNumber,
      uiActions,
      uiState,
      cancelAction,
    }),
  };
}

function createListingDialog({
  gameplaySnapshot,
  gameplayActions,
  playerShopActions,
  playerShelf,
  slot,
  slotNumber,
  uiActions,
  uiState,
  cancelAction,
}) {
  const draft = uiState.listingDraftBySlot?.[slotNumber] ?? slot;
  const selectedItemTypeId =
    draft.itemTypeId ?? slot.itemTypeId ?? null;
  const selectedItem = safeArray(playerShelf.sellItems).find(
    (item) => item.itemTypeId === selectedItemTypeId,
  );
  const visibleSellKinds = stallVisibilityManager.getVisibleSellKinds(
    gameplaySnapshot,
    safeArray(playerShelf.sellKinds),
  );
  const requestedKind =
    uiState.listingItemKindBySlot?.[slotNumber] ??
    selectedItem?.kind ??
    visibleSellKinds[0]?.kind ??
    null;
  const selectedKind = visibleSellKinds.some(
    (kind) => kind.kind === requestedKind,
  )
    ? requestedKind
    : visibleSellKinds[0]?.kind ?? null;
  const availableQuantity = Math.min(
    PLAYER_MARKET_MAX_QUANTITY,
    nonNegativeInteger(selectedItem?.quantity) +
      (slot.itemTypeId === selectedItemTypeId
        ? nonNegativeInteger(slot.quantity)
        : 0),
  );
  const quantity = Math.max(
    1,
    Math.min(
      Math.max(1, availableQuantity),
      positiveInteger(draft.quantity) ?? 1,
    ),
  );
  const priceCoin = positiveInteger(draft.priceCoin ?? 1);
  return {
    title: 'Sell',
    summaryRows: [
      {
        id: 'current',
        label: 'Current',
        value: toTitleCase(selectedItem?.label ?? slot.itemLabel ?? 'empty'),
        valueResourceKey: selectedItem?.kind ?? slot.itemKind ?? null,
        itemKey: selectedItem?.key ?? slot.itemKey ?? null,
        itemKind: selectedItem?.kind ?? slot.itemKind ?? null,
        quantityLabel: selectedItem ? `x${quantity}` : '',
      },
    ],
    range: {
      enabled: Boolean(selectedItem) && availableQuantity > 0,
      tone: 'yellow',
      min: 1,
      max: Math.max(1, availableQuantity),
      step: 1,
      value: quantity,
      onChange: (value) =>
        callFirst(uiActions, ['setListingDraftField'], [
          slotNumber,
          'quantity',
          value,
        ]),
    },
    status: uiState.listingStatusBySlot?.[slotNumber] ?? '',
    fields: [
      {
        id: 'priceCoin',
        label: 'Coins Per Item',
        value: draft.priceCoin ?? 1,
        inputKind: 'integer',
        maxLength: String(PLAYER_MARKET_MAX_PRICE_COIN).length,
        onChange: (value) =>
          callFirst(uiActions, ['setListingDraftField'], [
            slotNumber,
            'priceCoin',
            value,
          ]),
      },
    ],
    items: safeArray(playerShelf.sellItems)
      .filter(
        (item) =>
          (!selectedKind || item.kind === selectedKind) &&
          stallVisibilityManager.isItemVisible(gameplaySnapshot, item) &&
          (nonNegativeInteger(item.quantity) > 0 ||
            item.itemTypeId === slot.itemTypeId),
      )
      .map((item) => {
        const itemAvailableQuantity =
          nonNegativeInteger(item.quantity) +
          (slot.itemTypeId === item.itemTypeId
            ? nonNegativeInteger(slot.quantity)
            : 0);
        return {
          id: item.itemTypeId ?? item.key,
          label: toTitleCase(item.label),
          detail: `${itemAvailableQuantity} Available`,
          value: '',
          itemKey: item.key,
          itemKind: item.kind,
          resourceKey: item.kind,
          selected: item.itemTypeId === selectedItemTypeId,
          semanticId: `shop.listing.${slotNumber}.item.${item.key ?? item.itemTypeId}`,
          action: () =>
            callFirst(uiActions, ['selectListingItem'], [
              slotNumber,
              item,
            ]),
        };
      }),
    actions: [
      {
        id: 'clear',
        label: 'Clear',
        variant: 'red',
        enabled: true,
        layoutWeight: 1,
        action: async () => {
          const result = await cancelAction();
          if (result !== false && result?.ok !== false) {
            callFirst(uiActions, ['closePlayerListingDialog'], [slotNumber]);
          }
          return result;
        },
      },
      {
        id: 'list',
        label: 'Sell',
        variant: 'green',
        enabled:
          Boolean(selectedItemTypeId) &&
          availableQuantity > 0 &&
          priceCoin !== null &&
          priceCoin <= PLAYER_MARKET_MAX_PRICE_COIN,
        layoutWeight: 2,
        action: async () => {
          const result = await callFirstOr(
            uiActions,
            ['submitPlayerListing'],
            [
              slotNumber,
              {
                ...draft,
                itemTypeId: selectedItemTypeId,
                quantity,
                priceCoin,
              },
            ],
            () =>
              publishPlayerListing({
                gameplayActions,
                listing: {
                  ...draft,
                  itemTypeId: selectedItemTypeId,
                  quantity,
                  priceCoin,
                },
                playerShopActions,
                playerShelf,
                slotNumber,
              }),
          );
          if (result !== false && result?.ok !== false) {
            callFirst(uiActions, ['closePlayerListingDialog'], [slotNumber]);
          }
          return result;
        },
      },
    ],
    tabs: visibleSellKinds.map((kind) => ({
      id: kind.kind,
      label: toTitleCase(kind.label),
      selected: kind.kind === selectedKind,
      semanticId: `shop.listing.${slotNumber}.tab.${kind.kind}`,
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
        value: formatLedgerPrice(item.buyCoin),
        resourceKey: item.kind,
        valueResourceKey: isPositiveCoinPrice(item.buyCoin) ? 'coin' : null,
        stockLabel: formatLedgerCount(item.stock),
        buyersLabel: formatLedgerCount(item.npcNeed ?? item.sellNeed),
        buyPriceLabel: formatLedgerPrice(item.buyCoin),
        buyPriceResourceKey: isPositiveCoinPrice(item.buyCoin)
          ? 'coin'
          : null,
        sellPriceLabel: formatLedgerPrice(item.sellCoin),
        sellPriceResourceKey: isPositiveCoinPrice(item.sellCoin)
          ? 'coin'
          : null,
        availabilityLabel: formatLedgerAvailability(item),
        requiredMarketRank: Math.max(
          0,
          Math.floor(Number(item.requiredMarket?.rank) || 0),
        ),
        itemKey: item.key,
        itemKind: item.kind,
        enabled:
          item.tradedHere !== false &&
          isPositiveCoinPrice(item.buyCoin) &&
          Number(item.stock) > 0,
        disabled: item.tradedHere === false,
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

function createMarketDialog({ playerInfo, playerShop, uiActions, uiState }) {
  const selectedTab = uiState.marketBrowseTab ?? 'selling';
  const draftFilters = normalizeMarketFilters(
    uiState.marketFilterDraft,
  );
  const appliedFilters = normalizeMarketFilters(
    uiState.marketFilterApplied,
  );
  const sourceRows =
    selectedTab === 'buying'
      ? safeArray(playerShop.requests)
      : safeArray(playerShop.listings);
  const rows = sourceRows.filter((row) =>
    matchesMarketFilters(row, appliedFilters),
  );
  const hasAppliedFilters = marketFiltersAreActive(appliedFilters);
  return {
    title: 'Player Market',
    sectionTitle: 'Filter',
    listTitle: selectedTab === 'buying' ? 'Requests' : 'Offers',
    status:
      playerShop.connected === false
        ? 'Offline'
        : rows.length === 0
          ? hasAppliedFilters
            ? 'No Matching Offers'
            : 'No Offers Yet'
          : hasAppliedFilters
            ? `${rows.length} Matching ${rows.length === 1 ? 'Offer' : 'Offers'}`
            : '',
    fields: [
          {
            id: 'item',
            label: 'Item',
            inputKind: 'text',
            placeholder: 'Any Item',
            value: draftFilters.item,
            onChange: (value) =>
              callFirst(uiActions, ['setMarketFilterDraft'], [
                'item',
                value,
              ]),
          },
          {
            id: 'minPrice',
            label: 'Min Price',
            inputKind: 'integer',
            placeholder: '0',
            value: draftFilters.minPrice,
            onChange: (value) =>
              callFirst(uiActions, ['setMarketFilterDraft'], [
                'minPrice',
                value,
              ]),
          },
          {
            id: 'username',
            label: 'Username',
            inputKind: 'text',
            placeholder: 'Any Wizard',
            value: draftFilters.username,
            onChange: (value) =>
              callFirst(uiActions, ['setMarketFilterDraft'], [
                'username',
                value,
              ]),
          },
        ],
    actions: [
          {
            id: 'clearFilters',
            label: 'Clear',
            semanticId: 'shop.market.filter.clear',
            variant: 'brown-dark',
            action: () =>
              callFirst(uiActions, ['clearMarketFilters'], []),
          },
          {
            id: 'applyFilters',
            label: 'Apply Filter',
            semanticId: 'shop.market.filter.apply',
            variant: 'green',
            action: () =>
              callFirst(uiActions, ['applyMarketFilters'], []),
          },
        ],
    items: rows.map((row, index) => {
      const rowId =
        row.listingKey ??
        row.requestKey ??
        row.id ??
        index;
      return {
        id: rowId,
        ...resolveMarketPlayerProfile(playerInfo, row),
        itemLabel: toTitleCase(row.itemLabel ?? 'Item'),
        quantityLabel: `x${nonNegativeInteger(row.quantity)}`,
        priceLabel: formatCoinPriceText(row.priceCoin),
        itemKey: row.itemKey,
        itemKind: row.itemKind,
        valueResourceKey: 'coin',
        actionLabel: selectedTab === 'selling' ? 'Buy' : '',
        actionVariant: selectedTab === 'selling' ? 'green' : null,
        semanticId:
          selectedTab === 'buying'
            ? `shop.market.request.${rowId}`
            : `shop.market.listing.${rowId}`,
        action:
          selectedTab === 'selling'
            ? () => callFirst(uiActions, ['openMarketBuy'], [row])
            : null,
      };
    }),
    tabs: [
      {
        id: 'selling',
        label: 'Selling',
        semanticId: 'shop.market.tab.selling',
        selected: selectedTab === 'selling',
        action: () =>
          callFirst(uiActions, ['selectMarketBrowseTab'], [
            'selling',
          ]),
      },
      {
        id: 'buying',
        label: 'Buying',
        semanticId: 'shop.market.tab.buying',
        selected: selectedTab === 'buying',
        action: () =>
          callFirst(uiActions, ['selectMarketBrowseTab'], [
            'buying',
          ]),
      },
    ],
  };
}

function createMarketBuyDialog({
  gameplaySnapshot,
  playerInfo,
  playerShop,
  uiActions,
  uiState,
}) {
  const listingKey = String(uiState.marketBuyListingKey ?? '');
  const listing = safeArray(playerShop.listings).find(
    (candidate) => String(candidate.listingKey ?? '') === listingKey,
  );
  if (!listing) {
    return {
      title: 'Buy Offer',
      status: listingKey ? 'Offer Unavailable' : '',
      actions: [],
      range: null,
    };
  }

  const maximumQuantity = Math.max(1, nonNegativeInteger(listing.quantity));
  const quantity = Math.max(
    1,
    Math.min(maximumQuantity, positiveInteger(uiState.marketBuyQuantity) ?? 1),
  );
  const unitPrice = Math.max(0, Number(listing.priceCoin) || 0);
  const totalPriceCoin = Math.ceil(unitPrice * quantity);
  const currentCoin = Math.max(
    0,
    Number(gameplaySnapshot?.coin?.current ?? gameplaySnapshot?.coin) || 0,
  );
  const canBuy =
    playerShop.connected !== false &&
    maximumQuantity > 0 &&
    unitPrice > 0 &&
    currentCoin >= totalPriceCoin;

  return {
    title: 'Buy Offer',
    seller: resolveMarketPlayerProfile(playerInfo, listing),
    featuredItem: {
      id: listing.listingKey,
      label: toTitleCase(listing.itemLabel ?? 'Item'),
      detail: `Buying x${quantity}`,
      itemKey: listing.itemKey,
      itemKind: listing.itemKind,
      quantityLabel: `x${quantity}`,
      selected: true,
    },
    range: {
      enabled: maximumQuantity > 1,
      tone: 'yellow',
      min: 1,
      max: maximumQuantity,
      step: 1,
      value: quantity,
      onChange: (value) =>
        callFirst(uiActions, ['setMarketBuyQuantity'], [value]),
    },
    totalLabel: formatCoinPriceText(totalPriceCoin),
    status:
      uiState.marketBuyStatus ||
      (playerShop.connected === false
        ? 'Offline'
        : currentCoin < totalPriceCoin
          ? 'Not Enough Coin'
          : ''),
    actions: [
      {
        id: 'buy',
        label: 'Buy',
        semanticId: 'shop.market.buy.confirm',
        variant: 'green',
        enabled: canBuy,
        action: () =>
          callFirst(uiActions, ['confirmMarketBuy'], [listing, quantity]),
      },
    ],
  };
}

function resolveMarketPlayerProfile(playerInfo, row = {}) {
  const identity = String(
    row.sellerIdentity ?? row.requesterIdentity ?? row.identity ?? '',
  );
  const username = String(row.username ?? 'Wizard');
  const profile = safeArray(playerInfo?.players).find((candidate) => {
    const candidateIdentity = String(candidate?.identity ?? '');
    return identity
      ? candidateIdentity === identity
      : String(candidate?.username ?? '').toLocaleLowerCase() ===
          username.toLocaleLowerCase();
  });
  return {
    identity,
    username: profile?.username ?? username,
    allianceTag: profile?.allianceTag ?? row.allianceTag ?? '',
    detail: profile?.allianceName ?? row.allianceName ?? '',
    allianceTagColor:
      profile?.allianceTagColor ?? row.allianceTagColor ?? 'ink',
    character: profile?.character ?? row.character ?? 'elara',
    frame: profile?.frame ?? row.frame ?? 'classic',
  };
}

function normalizeMarketFilters(filters = {}) {
  return {
    item: String(filters?.item ?? '').trim(),
    minPrice: String(filters?.minPrice ?? '').trim(),
    username: String(filters?.username ?? '').trim(),
  };
}

function marketFiltersAreActive(filters) {
  return Boolean(
    filters.item || filters.minPrice || filters.username,
  );
}

function matchesMarketFilters(row, filters) {
  const itemQuery = filters.item.toLocaleLowerCase();
  const usernameQuery = filters.username.toLocaleLowerCase();
  const itemText = `${row.itemLabel ?? ''} ${row.itemKey ?? ''}`
    .toLocaleLowerCase();
  const username = String(row.username ?? '').toLocaleLowerCase();
  const minimumPrice = Number(filters.minPrice);

  return (
    (!itemQuery || itemText.includes(itemQuery)) &&
    (!usernameQuery || username.includes(usernameQuery)) &&
    (!filters.minPrice ||
      (Number.isFinite(minimumPrice) &&
        Number(row.priceCoin) >= minimumPrice))
  );
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
      itemKey: trade.itemKey,
      itemKind: trade.itemKind,
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
    claimCadence:
      offer.claimCadence ?? 'Claim every 2 hours',
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

function createDailyCrystalOfferModel(offer) {
  if (!offer) {
    return null;
  }
  return {
    ...offer,
    claimCadence:
      offer.claimCadence ?? 'Claim every 24 hours',
    rewardLabel: `${nonNegativeInteger(offer.rewardCrystal)} amber`,
    actionLabel: offer.canCollect
      ? 'free'
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
      hasAnyMethod(uiActions, ['clearPlayerRequest'])
        ? callFirst(uiActions, ['clearPlayerRequest'], [])
        : clearPlayerRequest({
            gameplayActions,
            playerShopActions,
            slotNumber: selectedRequestSlotNumber,
          });
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
  if (
    hasAnyMethod(gameplayActions, [
      'collectShopDailyCrystalOffer',
      'collectDailyCrystalOffer',
    ])
  ) {
    result.collectDailyCrystalOffer = () =>
      callFirst(
        gameplayActions,
        ['collectShopDailyCrystalOffer', 'collectDailyCrystalOffer'],
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
  return notificationChildState(snapshot, key).active;
}

function notificationChildState(snapshot, key) {
  const page =
    snapshot?.pages?.shop ??
    snapshot?.shop ??
    snapshot;
  const value = page?.children?.[key];
  return {
    active:
      value === true ||
      value === 'red' ||
      value === 'orange' ||
      value?.active === true,
    tone:
      value === 'orange' ||
      value?.tone === 'orange'
        ? 'orange'
        : 'red',
  };
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

function formatLedgerCount(value) {
  const number = Math.max(0, Math.floor(Number(value)));
  if (!Number.isFinite(number)) {
    return '—';
  }
  if (number < 10_000) {
    return new Intl.NumberFormat('en').format(number);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(number)
    .toLowerCase();
}

function isPositiveCoinPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function formatLedgerPrice(value) {
  return isPositiveCoinPrice(value)
    ? formatCoinPriceText(value)
    : 'Unavailable';
}

function formatLedgerAvailability(item = {}) {
  const marketName = String(item.requiredMarket?.name ?? '').trim();
  return marketName
    ? `Trades at ${marketName}`
    : 'Not traded in this market';
}

function toTitleCase(value) {
  return String(value ?? '').replace(
    /\b([a-z])/g,
    (character) => character.toUpperCase(),
  );
}
