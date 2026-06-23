export const WORLD_NOTICE_UNLOCK_LEVEL = 4;
export const WORLD_NOTICE_STATE_VERSION = 2;

export const WORLD_NOTICE_ACTIONS = Object.freeze({
  BREW_POTIONS: 'brew_potions',
  COMPLETE_RESEARCH: 'complete_research',
  DONATE_COIN: 'donate_coin',
  DONATE_RESOURCES: 'donate_resources',
  EARN_COIN: 'earn_coin',
  HARVEST_HERBS: 'harvest_herbs',
  SELL_ITEMS: 'sell_items',
  SUMMON_SEEDS: 'summon_seeds',
});

function coinDonation(pointsPerUnit = 1) {
  return {
    optionKey: 'coin',
    resourceType: 'coin',
    label: 'coin',
    pointsPerUnit,
  };
}

function itemDonation(itemKey, label, pointsPerUnit) {
  return {
    optionKey: itemKey,
    resourceType: 'item',
    itemKey,
    label,
    pointsPerUnit,
  };
}

function eventQuest({
  requestKey,
  title,
  situation,
  description,
  donationOptions,
  requiredPoints = 600,
}) {
  return {
    requestKey,
    actionType: WORLD_NOTICE_ACTIONS.DONATE_RESOURCES,
    label: title,
    title,
    situation,
    description,
    requiredQuantity: requiredPoints,
    donationOptions,
  };
}

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
      eventQuest({
        requestKey: 'coolTheFever',
        title: 'cool the fever',
        situation: 'families are sleeping beside buckets because the lower quarter cannot keep water cool.',
        description: 'donate tonics that steady breath and bring fever down before the sick lose another night.',
        donationOptions: [
          itemDonation('manaTonic', 'mana tonic', 80),
          itemDonation('minorHealingPotion', 'minor healing potion', 150),
        ],
      }),
      eventQuest({
        requestKey: 'cleanTheHands',
        title: 'clean hands, clean cups',
        situation: 'the first helpers are running out of safe washes and every cup now passes through too many hands.',
        description: 'donate cleansing brews so the healers stop carrying the fever from bed to bed.',
        donationOptions: [
          itemDonation('simpleAntidote', 'simple antidote', 160),
          itemDonation('frostmossCleanse', 'frostmoss cleanse', 260),
        ],
      }),
      eventQuest({
        requestKey: 'rentQuietRooms',
        title: 'quiet rooms for the sick',
        situation: 'crowded houses keep the fever moving after sunset.',
        description: 'donate coin so families can rent spare rooms until the quarter is clean again.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      'stonebridge asks every alchemist for field bottles, spare stores, and useful notes.',
    ],
    requests: [
      eventQuest({
        requestKey: 'holdTheGate',
        title: 'hold the gate',
        situation: 'stonebridge runners say the west gate shakes every hour.',
        description: 'donate courage and warding bottles so the watch can stay at the stones through the next push.',
        donationOptions: [
          itemDonation('briarWard', 'briar ward', 180),
          itemDonation('dragonCourage', 'dragon courage', 320),
        ],
      }),
      eventQuest({
        requestKey: 'patchTheWounded',
        title: 'patch the wounded',
        situation: 'the road back from the bridge is lined with carts that should have carried grain.',
        description: 'donate healing potions so the wounded can return to the walls or at least return home.',
        donationOptions: [
          itemDonation('minorHealingPotion', 'minor healing potion', 150),
          itemDonation('healingPotion', 'healing potion', 300),
        ],
      }),
      eventQuest({
        requestKey: 'payTheRunners',
        title: 'pay the runners',
        situation: 'messengers are wearing through boots faster than the quartermaster can count them.',
        description: 'donate coin for fresh boots, horse feed, and bridge tolls before reports stop moving.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      'trade guilds ask for calm shelves, steady trade, and a review of old road charters.',
    ],
    requests: [
      eventQuest({
        requestKey: 'steadyTheClerks',
        title: 'steady the clerks',
        situation: 'the royal seal changed before the tax clerks learned which door was theirs.',
        description: 'donate focus brews so the clerks can copy road papers without starting three new arguments.',
        donationOptions: [
          itemDonation('calmingDraught', 'calming draught', 120),
          itemDonation('moonlitFocus', 'moonlit focus', 240),
        ],
      }),
      eventQuest({
        requestKey: 'guardTheLedgers',
        title: 'guard the ledgers',
        situation: 'guild ledgers are being carried through crowds that want a new king and old prices.',
        description: 'donate warding potions so the ledgers reach the hall without losing pages or clerks.',
        donationOptions: [
          itemDonation('briarWard', 'briar ward', 180),
          itemDonation('pactWard', 'pact ward', 340),
        ],
      }),
      eventQuest({
        requestKey: 'keepTheRoadsOpen',
        title: 'keep the roads open',
        situation: 'merchants will close their stalls if the first crown week starts with unpaid road guards.',
        description: 'donate coin to keep the road watches fed until the new crown signs the ledgers.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      'expedition clerks need potions, notes, and packed herbs.',
    ],
    requests: [
      eventQuest({
        requestKey: 'lightTheStair',
        title: 'light the stair',
        situation: 'the first lantern lowered into the old road went out before it touched the floor.',
        description: 'donate lantern tonics so the expedition can see what waits below the broken stones.',
        donationOptions: [
          itemDonation('lanternTonic', 'lantern tonic', 200),
          itemDonation('emberSight', 'ember sight', 300),
        ],
      }),
      eventQuest({
        requestKey: 'markTheAir',
        title: 'mark the air',
        situation: 'the stair breathes cold dust that makes scouts forget which way is up.',
        description: 'donate focus and breath draughts so the map-makers return with more than rumors.',
        donationOptions: [
          itemDonation('moonlitFocus', 'moonlit focus', 240),
          itemDonation('snowdropBreath', 'snowdrop breath', 360),
        ],
      }),
      eventQuest({
        requestKey: 'hireTheRopeCrew',
        title: 'hire the rope crew',
        situation: 'no one is stepping under the old road without paid rope hands above them.',
        description: 'donate coin for ropes, chalk, and the workers brave enough to hold the line.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      eventQuest({
        requestKey: 'cutTheRot',
        title: 'cut the rot',
        situation: 'farmers are burning leaves faster than new hands can cut them.',
        description: 'donate cleansing brews so clean cuttings can survive before the south fields go black.',
        donationOptions: [
          itemDonation('simpleAntidote', 'simple antidote', 160),
          itemDonation('frostmossCleanse', 'frostmoss cleanse', 260),
        ],
      }),
      eventQuest({
        requestKey: 'braceThePlanters',
        title: 'brace the planters',
        situation: 'the planters work in smoke and sour soil until their hands shake.',
        description: 'donate stamina and vigor potions so the field crews can finish the clean rows.',
        donationOptions: [
          itemDonation('nettleVigor', 'nettle vigor', 140),
          itemDonation('sunrootStamina', 'sunroot stamina', 260),
        ],
      }),
      eventQuest({
        requestKey: 'replaceBurnedRows',
        title: 'replace burned rows',
        situation: 'whole furrows have been cut away to keep the blight from crossing the road.',
        description: 'donate coin for seed, carts, and wages while the fields are replanted.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      eventQuest({
        requestKey: 'wakeTheScouts',
        title: 'wake the scouts',
        situation: 'black pine fog turns every hoofprint into three possible roads.',
        description: 'donate focus draughts so scouts can follow the real trail before rain erases it.',
        donationOptions: [
          itemDonation('calmingDraught', 'calming draught', 120),
          itemDonation('moonlitFocus', 'moonlit focus', 240),
        ],
      }),
      eventQuest({
        requestKey: 'packTheSearch',
        title: 'pack the search',
        situation: 'the search crews left before breakfast and will not return before dark.',
        description: 'donate tonics and salves so the searchers keep moving through the pine cuts.',
        donationOptions: [
          itemDonation('manaTonic', 'mana tonic', 80),
          itemDonation('silverleafSalve', 'silverleaf salve', 360),
        ],
      }),
      eventQuest({
        requestKey: 'coverMissingCargo',
        title: 'cover the missing cargo',
        situation: 'market stalls are empty where the lost wagons should have stood.',
        description: 'donate coin so sellers can replace bread, lamp oil, and mule feed until the carts return.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
    ],
    outcomes: {
      small: 'one wagon returns. the others remain rumor.',
      steady: 'the market opens thin but orderly.',
      strong: 'the last wagon finds the road by your marked route.',
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
      eventQuest({
        requestKey: 'cleanTheBuckets',
        title: 'clean the buckets',
        situation: 'every bucket from the mill smells like old iron and wet stone.',
        description: 'donate cleansing potions so the mill can test water without poisoning the testers.',
        donationOptions: [
          itemDonation('simpleAntidote', 'simple antidote', 160),
          itemDonation('frostmossCleanse', 'frostmoss cleanse', 260),
        ],
      }),
      eventQuest({
        requestKey: 'treatTheMillHands',
        title: 'treat the mill hands',
        situation: 'the first mill hands drank before anyone noticed the stain.',
        description: 'donate healing potions so the sick workers recover while the well stays roped shut.',
        donationOptions: [
          itemDonation('minorHealingPotion', 'minor healing potion', 150),
          itemDonation('healingPotion', 'healing potion', 300),
        ],
      }),
      eventQuest({
        requestKey: 'buyCleanWater',
        title: 'buy clean water',
        situation: 'children are carrying empty cups because the mill well cannot be trusted.',
        description: 'donate coin for clean barrels from the north spring until the well clears.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      'new clerks ask every workshop to prove the town still moves and read the new edicts.',
    ],
    requests: [
      eventQuest({
        requestKey: 'quietTheCrowd',
        title: 'quiet the crowd',
        situation: 'the coronation bells have people cheering, arguing, and fainting in the same street.',
        description: 'donate calming draughts so the crowd stays upright long enough for the heralds to finish.',
        donationOptions: [
          itemDonation('calmingDraught', 'calming draught', 120),
          itemDonation('valerianRest', 'valerian rest', 320),
        ],
      }),
      eventQuest({
        requestKey: 'protectTheSeal',
        title: 'protect the seal',
        situation: 'the new seal is crossing town in a box that everyone wants to touch.',
        description: 'donate warding potions so the seal reaches the hall without a new scandal.',
        donationOptions: [
          itemDonation('briarWard', 'briar ward', 180),
          itemDonation('pactWard', 'pact ward', 340),
        ],
      }),
      eventQuest({
        requestKey: 'feedTheBellRingers',
        title: 'feed the bell ringers',
        situation: 'the bell ringers were promised lunch three proclamations ago.',
        description: 'donate coin so the bells keep ringing until the last oath is read.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      eventQuest({
        requestKey: 'steadyTheWatchers',
        title: 'steady the watchers',
        situation: 'half the west field has stared at the sky long enough to miss meals and fences.',
        description: 'donate calming and focus draughts so the watchers write clear notes instead of prophecies.',
        donationOptions: [
          itemDonation('calmingDraught', 'calming draught', 120),
          itemDonation('moonlitFocus', 'moonlit focus', 240),
        ],
      }),
      eventQuest({
        requestKey: 'keepNightLanternsLit',
        title: 'keep night lanterns lit',
        situation: 'the comet is brightest after midnight, when the lantern oil runs lowest.',
        description: 'donate lantern tonics and sight brews so the field crews can chart the whole pass.',
        donationOptions: [
          itemDonation('lanternTonic', 'lantern tonic', 200),
          itemDonation('emberSight', 'ember sight', 300),
        ],
      }),
      eventQuest({
        requestKey: 'rentFieldTents',
        title: 'rent field tents',
        situation: 'the scholars refuse to leave the field until the comet does.',
        description: 'donate coin for tents, ink, and hot food while the sky keeps scratching itself open.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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
      'the watch needs supplies, bottle courage, and road poultices.',
    ],
    requests: [
      eventQuest({
        requestKey: 'armTheWatch',
        title: 'arm the watch',
        situation: 'north road patrols are chasing shadows with tired hands.',
        description: 'donate courage and warding potions so the watch can face bandits without breaking ranks.',
        donationOptions: [
          itemDonation('briarWard', 'briar ward', 180),
          itemDonation('dragonCourage', 'dragon courage', 320),
        ],
      }),
      eventQuest({
        requestKey: 'mendTheMerchants',
        title: 'mend the merchants',
        situation: 'merchants who escaped the road arrived with split packs and worse cuts.',
        description: 'donate salves and healing potions so trade can move before fear closes the gates.',
        donationOptions: [
          itemDonation('minorHealingPotion', 'minor healing potion', 150),
          itemDonation('healingPotion', 'healing potion', 300),
        ],
      }),
      eventQuest({
        requestKey: 'postRoadBounties',
        title: 'post road bounties',
        situation: 'the watch has names, but no coin for riders willing to chase them.',
        description: 'donate coin for road bounties, spare tack, and lantern oil on the north mile.',
        donationOptions: [coinDonation()],
        requiredPoints: 900,
      }),
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

  createNoticeState({ periodKey, weekIndex, resetAtMs, anchorLevel, completionCostCoin }) {
    const event = this.getEventForWeek(weekIndex);
    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const baseCoin = Math.max(0, Math.floor(Number(completionCostCoin) || level * level * 10));

    return {
      version: WORLD_NOTICE_STATE_VERSION,
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
      contributionPoints: 0,
      requests: event.requests.map((request) =>
        this.createRequestState({
          eventId: event.eventId,
          periodKey,
          request,
          anchorLevel: level,
          completionCostCoin: baseCoin,
        }),
      ),
    };
  }

  createRequestState({ eventId, periodKey, request, anchorLevel, completionCostCoin }) {
    const actionType = request.actionType ?? WORLD_NOTICE_ACTIONS.DONATE_RESOURCES;
    return {
      requestId: `${periodKey}:${eventId}:${request.requestKey}`,
      requestKey: request.requestKey,
      actionType,
      label: request.label,
      title: request.title ?? request.label,
      situation: request.situation ?? '',
      description: request.description ?? '',
      requiredQuantity: this.getRequiredQuantity({
        actionType,
        anchorLevel,
        completionCostCoin,
        requiredQuantity: request.requiredQuantity,
      }),
      progressQuantity: 0,
      pointProgressQuantity: 0,
      contributionPoints: 0,
      donationOptions: this.sanitizeDonationOptions(request.donationOptions),
      donationProgress: {},
      completed: false,
    };
  }

  getRequiredQuantity({ actionType, anchorLevel, completionCostCoin, requiredQuantity = null }) {
    const explicitQuantity = Math.floor(Number(requiredQuantity));

    if (Number.isInteger(explicitQuantity) && explicitQuantity > 0) {
      return explicitQuantity;
    }

    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCost = Math.max(0, Math.floor(Number(completionCostCoin) || 0));

    switch (actionType) {
      case WORLD_NOTICE_ACTIONS.BREW_POTIONS:
        return this.clamp(Math.round(3 + level / 2), 5, 30);
      case WORLD_NOTICE_ACTIONS.COMPLETE_RESEARCH:
        return 1;
      case WORLD_NOTICE_ACTIONS.DONATE_COIN:
        return this.roundToFive(Math.max(15, completionCost * 0.08));
      case WORLD_NOTICE_ACTIONS.DONATE_RESOURCES:
        return this.roundToFive(Math.max(600, completionCost * 1.5));
      case WORLD_NOTICE_ACTIONS.EARN_COIN:
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

  getRewardCoin(anchorLevel, completionCostCoin) {
    const level = Math.max(WORLD_NOTICE_UNLOCK_LEVEL, Math.floor(Number(anchorLevel) || 0));
    const completionCost = Math.max(0, Math.floor(Number(completionCostCoin) || 0));

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

    if (!periodKey || notice.version !== WORLD_NOTICE_STATE_VERSION) {
      return null;
    }

    return {
      version: WORLD_NOTICE_STATE_VERSION,
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
      contributionPoints: Math.max(0, Math.floor(Number(notice.contributionPoints) || 0)),
      requests: Array.isArray(notice.requests)
        ? notice.requests
            .map((request, index) => this.sanitizeRequest(request, event, index))
            .filter(Boolean)
        : [],
    };
  }

  sanitizeRequest(request, event = null, requestIndex = 0) {
    if (!request || typeof request !== 'object') {
      return null;
    }

    const requestId = typeof request.requestId === 'string' ? request.requestId : '';
    const actionType = typeof request.actionType === 'string' ? request.actionType : '';
    const requestKey = typeof request.requestKey === 'string' ? request.requestKey : requestId;
    const catalogRequest = Array.isArray(event?.requests)
      ? (
          event.requests.find((candidate) => candidate.requestKey === requestKey) ??
          event.requests[Math.max(0, Math.floor(Number(requestIndex) || 0))]
        )
      : null;
    const normalizedActionType =
      typeof catalogRequest?.actionType === 'string'
        ? catalogRequest.actionType
        : actionType;
    const label =
      typeof catalogRequest?.label === 'string'
        ? catalogRequest.label
        : typeof request.label === 'string'
          ? request.label
          : '';

    if (!requestId || !normalizedActionType || !label) {
      return null;
    }

    const requiredQuantity = Math.max(
      1,
      Math.floor(Number(catalogRequest?.requiredQuantity ?? request.requiredQuantity) || 1),
    );
    const progressQuantity = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(request.progressQuantity) || 0)),
    );
    const pointProgressQuantity = Number.isFinite(request.pointProgressQuantity)
      ? Math.max(0, Math.floor(request.pointProgressQuantity))
      : progressQuantity;

    return {
      requestId,
      requestKey,
      actionType: normalizedActionType,
      label,
      title:
        typeof catalogRequest?.title === 'string'
          ? catalogRequest.title
          : typeof request.title === 'string'
            ? request.title
            : label,
      situation:
        typeof catalogRequest?.situation === 'string'
          ? catalogRequest.situation
          : typeof request.situation === 'string'
            ? request.situation
            : '',
      description:
        typeof catalogRequest?.description === 'string'
          ? catalogRequest.description
          : typeof request.description === 'string'
            ? request.description
            : '',
      requiredQuantity,
      progressQuantity,
      pointProgressQuantity,
      contributionPoints: Math.max(
        0,
        Math.floor(Number(request.contributionPoints) || 0),
      ),
      donationOptions: this.sanitizeDonationOptions(
        catalogRequest?.donationOptions ?? request.donationOptions,
      ),
      donationProgress: this.sanitizeDonationProgress(request.donationProgress),
      completed: Boolean(request.completed) || progressQuantity >= requiredQuantity,
    };
  }

  sanitizeDonationOptions(options = []) {
    if (!Array.isArray(options)) {
      return [];
    }

    return options
      .map((option) => this.sanitizeDonationOption(option))
      .filter(Boolean);
  }

  sanitizeDonationOption(option = {}) {
    const resourceType = String(option.resourceType ?? '').trim();
    const optionKey = String(option.optionKey ?? option.itemKey ?? resourceType).trim();
    const label = String(option.label ?? option.itemKey ?? resourceType).trim().toLowerCase();
    const pointsPerUnit = Math.max(0, Math.floor(Number(option.pointsPerUnit) || 0));

    if (!optionKey || !label || pointsPerUnit <= 0) {
      return null;
    }

    if (resourceType === 'coin') {
      return {
        optionKey,
        resourceType,
        label,
        pointsPerUnit,
      };
    }

    if (resourceType === 'item') {
      const itemKey = String(option.itemKey ?? '').trim();

      if (!itemKey) {
        return null;
      }

      return {
        optionKey,
        resourceType,
        itemKey,
        label,
        pointsPerUnit,
      };
    }

    return null;
  }

  sanitizeDonationProgress(progress = {}) {
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(progress).map(([key, value]) => [
        key,
        {
          quantity: Math.max(0, Math.floor(Number(value?.quantity) || 0)),
          points: Math.max(0, Math.floor(Number(value?.points) || 0)),
        },
      ]),
    );
  }

  roundToFive(value) {
    const rounded = Math.round((Number(value) || 0) / 5) * 5;
    return Math.max(5, rounded);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
