---
title: Guilds
tags:
  - mechanics
  - guild
  - social
  - production
status: active
world: mechanics
aliases:
  - Guild
---

# Guilds

Guilds are private player halls unlocked at level 15. The player spends a
1.5k coin charter, chooses a name, tag, and color, then hires adventurers who
take request-board work without direct micromanagement.

## Place In The Loop

Guilds sit after the core production economy is established. They convert coin
into a side room that can return coin, seeds, or herbs, while adding character
stories and a slower parallel progression track.

```text
player level 15 -> charter -> applicants -> adventurers -> request board -> quest returns -> rewards and adventurer growth
```

## Hall State

The guild's heavy state belongs to the gameplay save: profile, adventurers,
applicants, request board, available requests, secretary level, logs, and
simulation timestamps. Backend/social identity should stay tiny if exposed
publicly later: guild name, tag, color, and created time.

## Secretary

The secretary is the guild capacity track. Each level raises the hired
adventurer cap, board slots, and applicant level range.

| Level | Cost | Hired Cap | Board Slots | Applicant Level Range |
| --- | ---: | ---: | ---: | --- |
| 1 | 0 coin | 1 | 3 | 1-25 |
| 2 | 3k coin | 2 | 5 | 10-40 |
| 3 | 9k coin | 3 | 7 | 25-60 |
| 4 | 27k coin | 4 | 9 | 45-80 |
| 5 | 81k coin | 5 | 12 | 65-100 |

## Cadence

- Three applicants arrive each daily period.
- Available requests refresh every 30 minutes.
- Adventurers simulate lazily in 10-minute ticks.
- Request duration follows difficulty: trivial 20m, easy 40m, medium 90m,
  hard 3h, deadly 6h.

## Adventurers

Adventurers have level, xp, morale, fatigue, injury, personality, icon, history,
and eight stats: strength, endurance, agility, wisdom, cunning, charisma, luck,
and discipline. Personality weights shape starting stats, idle behavior, and
future level-up stat gains.

Idle adventurers may take a posted request based on personality boldness, morale,
fatigue, and stat fit. Otherwise they perform a small life action that changes
morale or fatigue and may add personal history.

## Requests

Requests specify a title, lore line, difficulty, up to two preferred stats, tags,
duration, and reward preview. The board can contain normal requests and
[[Events And Social|world-event]] requests when a weekly world event is active.

Completing a request rolls three d20s, compares adventurer power against request
difficulty, then applies outcome:

- success: full xp, reward, morale gain, fatigue gain, possible injury recovery
- critical success: larger reward and stronger morale gain
- rough survival: partial xp, reduced reward, morale loss, fatigue gain, injury
- hospital: partial xp, no reward, severe injury, delayed recovery
- death: no reward, no xp, adventurer becomes dead

Rewards choose one type from coin, seed, or herb, scaled by difficulty and
outcome quality.

## Current Boundaries

- Guild is a private player feature, not the same system as [[Events And Social#Trade Alliance|Trade Alliance]].
- Gameplay owns rules and simulation through the guild facade/managers.
- The guild page renders the room boxes and dialogs but does not own quest rules.
- Server sync preserves the `guild` save branch; generated backend bindings are
  not the source of guild gameplay rules.

## Related

- [[Core Loop]]
- [[Tasks And Leveling]]
- [[Production Systems]]
- [[Events And Social]]
