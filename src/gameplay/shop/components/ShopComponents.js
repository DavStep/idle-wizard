export const ShopShelf = {
  selectedSlotNumber: [],
  sellProgressSeconds: [],
};

export const ShopShelfSlot = {
  slotNumber: [],
  isUnlocked: [],
  sellItemTypeId: [],
  sellLimitMode: [],
  sellQuantityLimit: [],
  sellProgressSeconds: [],
};

export const shopSellLimitModes = Object.freeze({
  amount: 0,
  all: 1,
});

export const shopSellLimitModeNames = Object.freeze(['amount', 'all']);

export const PlayerShopShelf = {
  selectedSlotNumber: [],
};

export const PlayerShopShelfSlot = {
  slotNumber: [],
  isUnlocked: [],
  itemTypeId: [],
  quantity: [],
  priceCoin: [],
};

export const PlayerShopRequestSlot = {
  slotNumber: [],
  itemTypeId: [],
  quantity: [],
  priceCoin: [],
};

export const ShopCoinOffer = {
  cooldownRemainingSeconds: [],
};
