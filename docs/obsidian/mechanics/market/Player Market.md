---
title: "Player Market"
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
requires_username: true
backend_role: shared listings, requests, proceeds, and history
source_scope: mixed-client-backend
verified_on: 2026-07-19
related:
  - "[[mechanics/market/Player Listings|Player Listings]]"
  - "[[mechanics/market/Player Requests|Player Requests]]"
  - "[[mechanics/market/Browse And Purchase|Browse and Purchase]]"
  - "[[mechanics/market/Proceeds Royalties And History|Proceeds, Royalties, and History]]"
---

# Player Market

The Player Market shares listings and request advertisements only inside the active [[mechanics/market/Market Licences|market licence]]. The tab requires an explicit username.

## Components

- [[mechanics/market/Player Listings|Listings]] — seller stands with reserved local inventory.
- [[mechanics/market/Player Requests|Requests]] — public buying advertisements.
- [[mechanics/market/Browse And Purchase|Browse and Purchase]] — selling and buying views.
- [[mechanics/market/Proceeds Royalties And History|Proceeds, Royalties, and History]] — claims, trades, and potion royalties.
- [[mechanics/market/Sellable Quantity|Sellable Quantity]] — reservation rules.

> [!important] Authority
> Shared rows are backend-owned, but player inventory and coin remain client-owned. This is not full server escrow. See [[mechanics/market/Market Authority|Market Authority]].

