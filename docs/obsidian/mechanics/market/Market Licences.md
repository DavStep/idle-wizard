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
- The client derives it from permanent completed Prestige stars.
- The server derives it independently and rejects forged cross-market calls.
- All five default licences currently use the same catalog and balance. Names such as “volatile” or “special orders” are design flavor, not separate implemented rules.

