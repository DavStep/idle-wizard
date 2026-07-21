---
title: "Market Licences"
aliases:
  - Market Types
tags:
  - mechanics
  - progression/prestige
  - system/market
  - hub
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
licence_count: 5
backend_role: market isolation
source_scope: client-and-backend
verified_on: 2026-07-19
---

# Market Licences

Permanent Prestige stars select one active market. The highest unlocked licence is used by **both** [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market]].

![[mechanics/market/Market Components.base#Market Licences]]

- The licence never resets with a run.
- Each licence has isolated demand, price tuning, NPC stock, listings, requests, and proceeds.
- Rank grants the same number of NPC stalls and player listing/request slots.
- Item access is cumulative: a rank trades item grades up to that rank.
- The client derives it from permanent completed Prestige stars.
- The server derives it independently and rejects forged cross-market calls.
| Licence | Rank | Prestige stars | Stalls | Item grades |
| --- | ---: | ---: | ---: | --- |
| Small Town Market | ★ | 0 | 1 | 1 |
| Crossroads Market | ★★ | 1 | 2 | 1–2 |
| City Bazaar | ★★★ | 3 | 3 | 1–3 |
| Grand Exchange | ★★★★ | 6 | 4 | 1–4 |
| Arcane Exchange | ★★★★★ | 10 | 5 | 1–5 |
