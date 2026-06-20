export const WORLD_NOTICE_UNLOCK_LEVEL = 4;

export const WORLD_NOTICE_ACTIONS = Object.freeze({
  BREW_POTIONS: 'brew_potions',
  COMPLETE_RESEARCH: 'complete_research',
  DONATE_GOLD: 'donate_gold',
  EARN_GOLD: 'earn_gold',
  HARVEST_HERBS: 'harvest_herbs',
  SELL_ITEMS: 'sell_items',
  SUMMON_SEEDS: 'summon_seeds',
});

const WORLD_NOTICE_EVENTS = Object.freeze([
  {
    eventId: 'fever-lower-quarter',
    family: 'village crisis',
    tags: ['medical', 'herbal', 'alchemy', 'supply'],
    headline: 'fever in the lower quarter',
    body: [
      'lanterns stay lit past midnight.',
      'elara says the lower quarter has begun boiling water in every pot it owns.',
    ],
    requests: [
      {
        requestKey: 'cleanHerbs',
        actionType: WORLD_NOTICE_ACTIONS.HARVEST_HERBS,
        label: 'send clean herbs',
      },
      {
        requestKey: 'feverTonics',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew fever tonics',
      },
      {
        requestKey: 'waterCarts',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund clean water carts',
      },
    ],
    outcomes: {
      small: 'the fever breaks slowly. the quarter remembers who answered.',
      steady: 'most doors reopen before the next market bell.',
      strong: 'the lower quarter names your tonic in every doorway.',
    },
    archive: 'the lower quarter kept its lanterns lit and endured.',
  },
  {
    eventId: 'siege-stonebridge',
    family: 'military danger',
    tags: ['military', 'supply', 'alchemy'],
    headline: 'siege at stonebridge',
    body: [
      'messengers arrive with mud on their boots.',
      'stonebridge asks every alchemist for field bottles and hard coin.',
    ],
    requests: [
      {
        requestKey: 'fieldBottles',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew field bottles',
      },
      {
        requestKey: 'marketSupplies',
        actionType: WORLD_NOTICE_ACTIONS.SELL_ITEMS,
        label: 'move spare supplies',
      },
      {
        requestKey: 'wallFund',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund the wall watch',
      },
    ],
    outcomes: {
      small: 'stonebridge holds, though the gates stay scarred.',
      steady: 'the watch keeps the west gate supplied.',
      strong: 'stonebridge sends back a blackened banner in thanks.',
    },
    archive: 'stonebridge held through the week.',
  },
  {
    eventId: 'king-dethroned',
    family: 'political change',
    tags: ['political', 'trade', 'supply'],
    headline: 'king dethroned',
    body: [
      'the royal seal changes before the ink dries.',
      'trade guilds ask for calm shelves and enough coin to keep roads open.',
    ],
    requests: [
      {
        requestKey: 'steadyTrade',
        actionType: WORLD_NOTICE_ACTIONS.EARN_GOLD,
        label: 'steady workshop trade',
      },
      {
        requestKey: 'guildSupplies',
        actionType: WORLD_NOTICE_ACTIONS.SELL_ITEMS,
        label: 'supply the guild stores',
      },
      {
        requestKey: 'roadCoin',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund road messengers',
      },
    ],
    outcomes: {
      small: 'the crown changes. the roads stay nervous.',
      steady: 'guild ledgers settle by the end of the week.',
      strong: 'messengers carry your mark beside the new seal.',
    },
    archive: 'the crown changed hands without closing the roads.',
  },
  {
    eventId: 'dungeon-under-old-road',
    family: 'exploration discovery',
    tags: ['exploration', 'research', 'alchemy'],
    headline: 'dungeon under the old road',
    body: [
      'a cart wheel breaks through stone that was not on any map.',
      'expedition clerks need potions, notes, and steady hands.',
    ],
    requests: [
      {
        requestKey: 'expeditionPotions',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'prepare expedition potions',
      },
      {
        requestKey: 'oldMarkings',
        actionType: WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH,
        label: 'study old markings',
      },
      {
        requestKey: 'expeditionFunds',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund rope and lamps',
      },
    ],
    outcomes: {
      small: 'the stair is marked and watched.',
      steady: 'the first chamber is mapped without loss.',
      strong: 'your notes become the expedition key.',
    },
    archive: 'the old road kept its new stair.',
  },
  {
    eventId: 'blight-south-fields',
    family: 'village crisis',
    tags: ['herbal', 'medical', 'research'],
    headline: 'blight in the south fields',
    body: [
      'farmers bring leaves folded in cloth.',
      'the spots spread faster than rumor, and every clean cutting matters.',
    ],
    requests: [
      {
        requestKey: 'cleanCuttings',
        actionType: WORLD_NOTICE_ACTIONS.HARVEST_HERBS,
        label: 'gather clean cuttings',
      },
      {
        requestKey: 'blightStudy',
        actionType: WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH,
        label: 'study the blight',
      },
      {
        requestKey: 'fieldTreatment',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew field treatment',
      },
    ],
    outcomes: {
      small: 'the south fields cut away the worst rows.',
      steady: 'new growth survives around the old scarecrows.',
      strong: 'the blight line stops at the treated furrows.',
    },
    archive: 'the south fields were cut back and watched.',
  },
  {
    eventId: 'caravan-lost-black-pine',
    family: 'trade disruption',
    tags: ['trade', 'supply', 'exploration'],
    headline: 'caravan lost near black pine',
    body: [
      'three wagons miss the morning bell.',
      'the market asks for replacements while scouts search the wet road.',
    ],
    requests: [
      {
        requestKey: 'replacementStock',
        actionType: WORLD_NOTICE_ACTIONS.SELL_ITEMS,
        label: 'replace market stock',
      },
      {
        requestKey: 'scoutPotions',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew scout draughts',
      },
      {
        requestKey: 'searchFund',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund search lanterns',
      },
    ],
    outcomes: {
      small: 'one wagon returns. the others remain rumor.',
      steady: 'the market opens thin but orderly.',
      strong: 'the last wagon finds the road by your lantern fund.',
    },
    archive: 'black pine kept its mud, but trade resumed.',
  },
  {
    eventId: 'tainted-well',
    family: 'village crisis',
    tags: ['medical', 'research', 'herbal'],
    headline: 'tainted well by the mill',
    body: [
      'the miller lowers a bucket and raises a smell like old iron.',
      'clean water now depends on herbs, study, and patience.',
    ],
    requests: [
      {
        requestKey: 'bitterHerbs',
        actionType: WORLD_NOTICE_ACTIONS.HARVEST_HERBS,
        label: 'gather bitter herbs',
      },
      {
        requestKey: 'wellStudy',
        actionType: WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH,
        label: 'test the wellwater',
      },
      {
        requestKey: 'cleansingBrew',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew cleansing draughts',
      },
    ],
    outcomes: {
      small: 'the mill well is roped shut.',
      steady: 'the first clean bucket draws by candlelight.',
      strong: 'the miller paints your mark beside the wellstone.',
    },
    archive: 'the mill well was watched until the water cleared.',
  },
  {
    eventId: 'new-king-crowned',
    family: 'political change',
    tags: ['political', 'trade', 'supply'],
    headline: 'new king crowned',
    body: [
      'bells ring from towers that disagreed yesterday.',
      'new clerks ask every workshop to prove the town still moves.',
    ],
    requests: [
      {
        requestKey: 'proveTrade',
        actionType: WORLD_NOTICE_ACTIONS.EARN_GOLD,
        label: 'prove town trade',
      },
      {
        requestKey: 'crownStores',
        actionType: WORLD_NOTICE_ACTIONS.SELL_ITEMS,
        label: 'supply crown stores',
      },
      {
        requestKey: 'messengerFees',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund oath messengers',
      },
    ],
    outcomes: {
      small: 'the bells stop. the ledgers stay open.',
      steady: 'the new clerks leave with filled lines.',
      strong: 'your workshop is copied into the first crown ledger.',
    },
    archive: 'the new crown counted the town and moved on.',
  },
  {
    eventId: 'comet-over-west-field',
    family: 'exploration discovery',
    tags: ['exploration', 'research', 'alchemy'],
    headline: 'comet over the west field',
    body: [
      'the sky scratches itself with a white line.',
      'elara says omens are cheaper to study before they land.',
    ],
    requests: [
      {
        requestKey: 'omenNotes',
        actionType: WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH,
        label: 'study the omen',
      },
      {
        requestKey: 'steadyHands',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew steadying potions',
      },
      {
        requestKey: 'seedStores',
        actionType: WORLD_NOTICE_ACTIONS.SUMMON_SEEDS,
        label: 'summon seed stores',
      },
    ],
    outcomes: {
      small: 'the comet fades. the field stays quiet.',
      steady: 'your notes outlast the panic.',
      strong: 'elara keeps your comet chart under glass.',
    },
    archive: 'the west field watched the comet pass.',
  },
  {
    eventId: 'bandits-on-north-road',
    family: 'military danger',
    tags: ['military', 'trade', 'supply'],
    headline: 'bandits on the north road',
    body: [
      'north road merchants arrive in pairs now.',
      'the watch needs supplies, bottle courage, and enough coin to patrol.',
    ],
    requests: [
      {
        requestKey: 'watchBottles',
        actionType: WORLD_NOTICE_ACTIONS.BREW_POTIONS,
        label: 'brew watch bottles',
      },
      {
        requestKey: 'roadSupplies',
        actionType: WORLD_NOTICE_ACTIONS.SELL_ITEMS,
        label: 'move road supplies',
      },
      {
        requestKey: 'patrolFund',
        actionType: WORLD_NOTICE_ACTIONS.DONATE_GOLD,
        label: 'fund north patrols',
      },
    ],
    outcomes: {
      small: 'the north road moves by daylight only.',
      steady: 'patrols push the raids past the mile stones.',
      strong: 'the north road opens before first bell.',
    },
    archive: 'the north road grew safer by the week end.',
  },
]);

export class WorldNoticeCatalogManager {
  getEventForWeek(weekIndex) {
    const index = Math.max(0, Math.floor(Number(weekIndex) || 0));
    return WORLD_NOTICE_EVENTS[index % WORLD_NOTICE_EVENTS.length];
  }

  createNoticeState({ periodKey, weekIndex, resetAtMs, anchorLevel, completionCostGold }) {
    const event = this.getEventForWeek(weekIndex);
    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const baseGold = Math.max(0, Math.floor(Number(completionCostGold) || level * level * 10));

    return {
      version: 1,
      periodKey,
      weekIndex: Math.max(0, Math.floor(Number(weekIndex) || 0)),
      resetAtMs: Number.isFinite(resetAtMs) ? resetAtMs : 0,
      anchorLevel: level,
      eventId: event.eventId,
      family: event.family,
      tags: [...event.tags],
      headline: event.headline,
      body: [...event.body],
      outcomes: { ...event.outcomes },
      archive: event.archive,
      requests: event.requests.map((request) =>
        this.createRequestState({
          eventId: event.eventId,
          periodKey,
          request,
          anchorLevel: level,
          completionCostGold: baseGold,
        }),
      ),
    };
  }

  createRequestState({ eventId, periodKey, request, anchorLevel, completionCostGold }) {
    return {
      requestId: `${periodKey}:${eventId}:${request.requestKey}`,
      requestKey: request.requestKey,
      actionType: request.actionType,
      label: request.label,
      requiredQuantity: this.getRequiredQuantity({
        actionType: request.actionType,
        anchorLevel,
        completionCostGold,
      }),
      progressQuantity: 0,
      completed: false,
      reward: {
        gold: this.getRewardGold(anchorLevel, completionCostGold),
      },
      rewardClaimed: false,
    };
  }

  getRequiredQuantity({ actionType, anchorLevel, completionCostGold }) {
    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCost = Math.max(0, Math.floor(Number(completionCostGold) || 0));

    switch (actionType) {
      case WORLD_NOTICE_ACTIONS.BREW_POTIONS:
        return this.clamp(Math.round(3 + level / 2), 5, 30);
      case WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH:
        return 1;
      case WORLD_NOTICE_ACTIONS.DONATE_GOLD:
        return this.roundToFive(Math.max(25, completionCost * 0.25));
      case WORLD_NOTICE_ACTIONS.EARN_GOLD:
        return this.roundToFive(Math.max(50, completionCost * 0.5));
      case WORLD_NOTICE_ACTIONS.HARVEST_HERBS:
        return this.roundToFive(15 + level * 3);
      case WORLD_NOTICE_ACTIONS.SELL_ITEMS:
        return this.roundToFive(20 + level * 5);
      case WORLD_NOTICE_ACTIONS.SUMMON_SEEDS:
        return this.roundToFive(20 + level * 5);
      default:
        return 1;
    }
  }

  getRewardGold(anchorLevel, completionCostGold) {
    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCost = Math.max(0, Math.floor(Number(completionCostGold) || 0));

    return this.roundToFive(Math.max(10, completionCost * 0.08 + level));
  }

  sanitizeNotice(notice) {
    if (!notice || typeof notice !== 'object') {
      return null;
    }

    const event =
      WORLD_NOTICE_EVENTS.find((candidate) => candidate.eventId === notice.eventId) ??
      this.getEventForWeek(notice.weekIndex);
    const periodKey = typeof notice.periodKey === 'string' ? notice.periodKey : '';

    if (!periodKey) {
      return null;
    }

    return {
      version: 1,
      periodKey,
      weekIndex: Math.max(0, Math.floor(Number(notice.weekIndex) || 0)),
      resetAtMs: Number.isFinite(notice.resetAtMs) ? notice.resetAtMs : 0,
      anchorLevel: Math.max(
        WORLD_NOTICE_UNLOCK_LEVEL,
        Math.floor(Number(notice.anchorLevel) || WORLD_NOTICE_UNLOCK_LEVEL),
      ),
      eventId: event.eventId,
      family: event.family,
      tags: [...event.tags],
      headline: event.headline,
      body: [...event.body],
      outcomes: { ...event.outcomes },
      archive: event.archive,
      requests: Array.isArray(notice.requests)
        ? notice.requests.map((request) => this.sanitizeRequest(request)).filter(Boolean)
        : [],
    };
  }

  sanitizeRequest(request) {
    if (!request || typeof request !== 'object') {
      return null;
    }

    const requestId = typeof request.requestId === 'string' ? request.requestId : '';
    const actionType = typeof request.actionType === 'string' ? request.actionType : '';
    const label = typeof request.label === 'string' ? request.label : '';

    if (!requestId || !actionType || !label) {
      return null;
    }

    const requiredQuantity = Math.max(1, Math.floor(Number(request.requiredQuantity) || 1));
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(request.progressQuantity) || 0)),
    );

    return {
      requestId,
      requestKey: typeof request.requestKey === 'string' ? request.requestKey : requestId,
      actionType,
      label,
      requiredQuantity,
      progressQuantity,
      completed: Boolean(request.completed) || progressQuantity >= requiredQuantity,
      reward: {
        gold: Math.max(0, Math.floor(Number(request.reward?.gold) || 0)),
      },
      rewardClaimed: Boolean(request.rewardClaimed),
    };
  }

  roundToFive(value) {
    const rounded = Math.round((Number(value) || 0) / 5) * 5;
    return Math.max(5, rounded);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
