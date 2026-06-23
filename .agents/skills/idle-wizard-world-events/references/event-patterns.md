# Event Patterns

## Catalog Shape

Use this shape inside `WORLD_NOTICE_EVENTS`:

```js
{
  eventId: 'castle-kitchen-fire',
  family: 'village crisis',
  tags: ['fire', 'medical', 'alchemy', 'shelter'],
  headline: 'castle kitchen burns',
  body: [
    'the royal cooks overplayed a dragon-head dish.',
    'the sauce caught, the ovens roared, and half the castle wing filled with smoke.',
  ],
  requests: [
    eventQuest({
      requestKey: 'treatTheBurned',
      title: 'cooks cooked us',
      situation:
        'the kitchen workers are burned and sleeping under wet blankets by the gate.',
      description:
        'donate healing potions so the workers recover before smoke fever sets in.',
      donationOptions: [
        itemDonation('minorHealingPotion', 'minor healing potion', 150),
        itemDonation('healingPotion', 'healing potion', 300),
      ],
    }),
    eventQuest({
      requestKey: 'enterTheFlames',
      title: 'into the flames',
      situation:
        'knights are trying to reach trapped workers, but the burning pantry keeps pushing them back.',
      description:
        'donate warding or courage potions so rescuers can pass through the hot wing.',
      donationOptions: [
        itemDonation('briarWard', 'briar ward', 180),
        itemDonation('dragonCourage', 'dragon courage', 320),
      ],
    }),
    eventQuest({
      requestKey: 'shelterTheWorkers',
      title: 'shelter the workers',
      situation:
        'the servants quarters are ash and the workers have nowhere dry to sleep.',
      description:
        'donate coin so workers can rent rooms until the castle wing is repaired.',
      donationOptions: [coinDonation()],
      requiredPoints: 900,
    }),
  ],
  outcomes: {
    small: 'the fire ends, but the workers recover slowly.',
    steady: 'the burned wing is cleared before rain reaches the halls.',
    strong: 'the workers return with your potions named in the kitchen ledger.',
  },
  archive: 'the castle kitchen burned, and the town carried water.',
}
```

## Copy Rules

- Headline names the world situation.
- Body gives the event hook in two compact lines.
- Quest title is memorable, but the description must stay clear.
- Situation comes before the ask.
- Description names the exact donation and why it matters.
- Keep lowercase player-facing copy.
- Avoid generic labels such as `help them`, `gather supplies`, or `do tasks`.

## Point Heuristics

- Coin: `1 point each`.
- Early potion or low-effort item: `80-150 points each`.
- Mid potion: `150-240 points each`.
- Strong potion or late item: `260-360 points each`.
- Event-only potion: start near equivalent recipe cost and round to a readable value.

## Avoid

- No hidden mechanics in flavor-only text.
- No event-only currency.
- No mandatory alliance/group objective unless requested.
- No direct coin-only event unless the story truly requires money.
- No vague potion names. Use exact item names from the catalog.
