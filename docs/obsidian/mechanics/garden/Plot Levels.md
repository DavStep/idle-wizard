---
title: "Plot Levels"
aliases:
  - Plot Yield Levels
tags:
  - mechanics
  - progression/research
  - system/garden
status: active
world: mechanics
note_type: research-component
system: garden
implementation: shipped
currency: crystal
multipliers:
  - 2
  - 3
  - 4
  - 5
costs:
  - 2
  - 4
  - 8
  - 16
default_duration_seconds: 3
persistent_through_prestige: false
verified_on: 2026-07-19
---

# Plot Levels

Every plot can be leveled from x1 to x5 yield.

| Multiplier | Research suffix | Crystal cost |
| ---: | --- | ---: |
| x2 | `:2` | 2 |
| x3 | `:3` | 4 |
| x4 | `:4` | 8 |
| x5 | `:5` | 16 |

The ID is `emerald:plotPlanting:N:M` despite spending **crystal**. Multiplier M consumes M seeds and yields M herbs in the same growth timer. Each level takes 3 seconds and requires the previous multiplier. Levels reset on Prestige.

## Source of truth

- `src/gameplay/research/emeraldResearchIds.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`

