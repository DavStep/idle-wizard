import { itemKinds } from '../../items/itemKinds.js';

const emptySellKindId = 0;
const sellKindEntries = [
  { id: 1, kind: itemKinds.seed, label: 'seeds' },
  { id: 2, kind: itemKinds.herb, label: 'herbs' },
  { id: 3, kind: itemKinds.potion, label: 'potions' },
];

export class ShopSellKindManager {
  getEmptySellKindId() {
    return emptySellKindId;
  }

  getSellKinds() {
    return sellKindEntries.map((entry) => ({ ...entry }));
  }

  isSellKind(kind) {
    return sellKindEntries.some((entry) => entry.kind === kind);
  }

  getSellKindId(kind) {
    const entry = sellKindEntries.find((sellKind) => sellKind.kind === kind);

    if (!entry) {
      throw new Error(`Unsupported shop sell kind: ${kind}`);
    }

    return entry.id;
  }

  getSellKindById(kindId) {
    if (kindId === emptySellKindId) {
      return null;
    }

    const entry = sellKindEntries.find((sellKind) => sellKind.id === kindId);

    if (!entry) {
      throw new Error(`Unsupported shop sell kind id: ${kindId}`);
    }

    return { ...entry };
  }
}
