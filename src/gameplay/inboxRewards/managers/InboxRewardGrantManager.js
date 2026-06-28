const MAX_CLAIMED_MAIL_KEYS = 500;

export class InboxRewardGrantManager {
  constructor({ coinFacade, crystalFacade, rubyFacade, emeraldFacade, itemsFacade } = {}) {
    this.coinFacade = coinFacade;
    this.crystalFacade = crystalFacade;
    this.rubyFacade = rubyFacade;
    this.emeraldFacade = emeraldFacade;
    this.itemsFacade = itemsFacade;
    this.claimedMailKeys = new Set();
  }

  claim(mail) {
    const mailKey = this.normalizeMailKey(mail?.mailKey);
    if (!mailKey) {
      return { ok: false, reason: 'missing_mail' };
    }

    const reward = this.normalizeReward(mail?.reward ?? mail);
    if (!this.hasReward(reward)) {
      return { ok: false, reason: 'empty_reward' };
    }

    if (this.claimedMailKeys.has(mailKey)) {
      return { ok: true, alreadyClaimed: true, reward };
    }

    const itemGrants = this.resolveItemGrants(reward.items);
    if (!itemGrants.ok) {
      return itemGrants;
    }

    if (reward.coin > 0) {
      this.coinFacade?.add?.(reward.coin, { trackGenerated: false });
    }

    if (reward.crystal > 0) {
      this.crystalFacade?.add?.(reward.crystal);
    }

    if (reward.ruby > 0) {
      this.rubyFacade?.add?.(reward.ruby);
    }

    if (reward.emerald > 0) {
      this.emeraldFacade?.add?.(reward.emerald);
    }

    for (const item of itemGrants.items) {
      this.itemsFacade?.addItem?.(item.definition.id, item.quantity);
    }

    this.markClaimed(mailKey);
    return { ok: true, reward };
  }

  resolveItemGrants(items) {
    const grants = [];

    for (const item of items) {
      let definition = null;
      try {
        definition =
          this.itemsFacade?.safeGetDefinitionByKey?.(item.itemKey) ??
          this.itemsFacade?.getItemDefinitionByKey?.(item.itemKey) ??
          null;
      } catch {
        definition = null;
      }

      if (!definition) {
        return { ok: false, reason: 'invalid_item_reward', itemKey: item.itemKey };
      }

      grants.push({ definition, quantity: item.quantity });
    }

    return { ok: true, items: grants };
  }

  normalizeReward(reward = {}) {
    return {
      coin: this.toPositiveInteger(reward.coin ?? reward.coinReward),
      crystal: this.toPositiveInteger(reward.crystal ?? reward.crystalReward),
      ruby: this.toPositiveInteger(reward.ruby ?? reward.rubyReward),
      emerald: this.toPositiveInteger(reward.emerald ?? reward.emeraldReward),
      items: this.normalizeItemRewards(reward.items ?? reward.itemRewards),
    };
  }

  normalizeItemRewards(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => ({
        itemKey: String(item?.itemKey ?? '').trim(),
        quantity: this.toPositiveInteger(item?.quantity),
      }))
      .filter((item) => item.itemKey && item.quantity > 0);
  }

  hasReward(reward) {
    return (
      reward.coin > 0 ||
      reward.crystal > 0 ||
      reward.ruby > 0 ||
      reward.emerald > 0 ||
      reward.items.length > 0
    );
  }

  markClaimed(mailKey) {
    this.claimedMailKeys.add(mailKey);

    if (this.claimedMailKeys.size <= MAX_CLAIMED_MAIL_KEYS) {
      return;
    }

    const oldestKey = this.claimedMailKeys.values().next().value;
    if (oldestKey) {
      this.claimedMailKeys.delete(oldestKey);
    }
  }

  getPersistenceSnapshot() {
    return {
      version: 1,
      claimedMailKeys: [...this.claimedMailKeys].slice(-MAX_CLAIMED_MAIL_KEYS),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    const claimedMailKeys = Array.isArray(snapshot?.claimedMailKeys)
      ? snapshot.claimedMailKeys
      : [];

    this.claimedMailKeys = new Set(
      claimedMailKeys
        .map((mailKey) => this.normalizeMailKey(mailKey))
        .filter(Boolean)
        .slice(-MAX_CLAIMED_MAIL_KEYS),
    );
  }

  normalizeMailKey(value) {
    return String(value ?? '').trim();
  }

  toPositiveInteger(value) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
  }
}
