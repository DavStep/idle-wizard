---
title: Guild Branches
tags:
  - mechanics
  - guild
  - production
  - multiplayer
status: approved
world: mechanics
aliases:
  - Guild Expansion
  - Guild Branches Plan
---

# Guild Branches

> [!success] Approved Direction
> The player owns one named Guild and expands it with specialized branch
> buildings. The branches are not separate Guild identities.

## Player Fantasy

Build one Guild, hire different kinds of members, and send them into the world
to support the wizard.

The Guild keeps one:

- name
- tag
- color
- public profile
- leaderboard identity

## Core Loop

```text
buy branch
-> hire members
-> choose task and location
-> send members
-> wait for return
-> collect results
-> members gain experience
-> improve branch
-> unlock new locations
```

All branches use this base loop. Each branch changes the decision the player
makes inside it.

## Branches

### Adventurers' Lodge

The current Guild adventurer system becomes the first branch.

- Hire adventurers.
- Post commissions.
- Match adventurer stats to the task.
- Supply potions when useful.
- Gain experience and renown.
- Unlock harder commissions and new regions.

Unique decision: choose the right adventurer for the risk.

### Fishers' Lodge

- Hire fishermen.
- Choose a fishing location.
- Send one or more fishermen.
- Catch fish for potion brewing.
- Improve fishermen.
- Unlock better fishing locations.

Locations differ by trip duration, available fish, required member level,
difficulty, and rare catches.

Unique decision: choose the best location and fishing team.

### Miners' Lodge

- Hire miners.
- Choose a mine and depth.
- Send a mining team.
- Improve miners.
- Unlock deeper mine levels.

Deeper trips take longer and carry more risk.

Unique decision: decide how deep the team should go.

> [!question] Mining Output
> The Miners' Lodge should not be implemented until its output has a clear use
> in an existing game system. Do not create a disconnected mining inventory.

### Herbalists' Lodge

Keep this branch for later. It overlaps with the Garden and needs a clear role
that does not turn it into another way to passively generate the same herbs.

## Members

Each branch owns a separate roster. Members have:

- name
- level
- one or two specialties
- current activity
- experience

Adventurers keep their deeper stats, personality, condition, and history.
Fishermen and miners start with the smaller shared member model.

Members grow by completing work. Equipment and separate member inventories are
outside the first version.

## Progression

Use three progression layers:

1. Guild Hall level unlocks branches.
2. Branch level unlocks member slots and locations.
3. Member level improves individual performance.

Branches use existing currencies and connected resources. Do not give every
branch its own currency, research screen, or upgrade material.

Player inventory is never consumed silently. A task may use a potion or another
resource only after the player explicitly supplies it.

## Leaderboards

Each branch gets a separate seasonal leaderboard:

- Adventurers: renown
- Fishers: fishing score
- Miners: mining score

Score comes from completed work and difficult achievements, not directly from
money spent or member levels.

A combined Guild leaderboard can be considered after several branches are
playable and their scoring is proven fair.

## Guild HUD

The Guild room uses its own HUD and bottom tabs:

```text
Hall | Adventurers | Fishers | Miners | World
```

`Hall` shows the Guild identity, owned branches, active members, recent results,
and the next useful action.

Each branch follows the same simple structure:

```text
members | locations and tasks | active work and results
```

`World` contains branch leaderboards and public Guild profiles.

## First Delivery

1. Keep the current Guild identity.
2. Turn the current adventurer system into the Adventurers' Lodge.
3. Make the Guild HUD ready for additional branch tabs.
4. Add the Fishers' Lodge as the first new playable branch.
5. Connect caught fish to Brewing.
6. Add the Fishing leaderboard.
7. Design the Miners' Lodge after its output is decided.
8. Revisit the Herbalists' Lodge later.

## Boundaries

- The Guild is one player's company of NPC members.
- [[Events And Social#Trade Alliance|Trade Alliances]] remain the player-group
  system.
- No branch-only premium currency.
- No equipment system in the first version.
- No real-time PvP or attacks on another Guild.
- Ranked results must be server-authoritative before public launch.
- Existing players keep their Guild identity and adventurers.

## Related

- [[Guilds]]
- [[Guild System Plan|Adventurer Guild Detailed Plan]]
- [[Production Systems]]
- [[Research And Unlocks]]
- [[Events And Social]]
- [[Prestige]]
