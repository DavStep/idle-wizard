# Market Licence

The market licence is permanent Prestige progress. It resolves the highest unlocked market from completed stars and never reads resettable run state. Market gameplay and backend transport use this single result for every NPC and player-market action.

Legacy, unscoped backend rows remain Small Town Market rows. Higher-tier rows use market-prefixed storage keys, so deployment adds independent pools without resetting, copying, or deleting current shared state. Do not publish a migration that reassigns legacy player listings or proceeds without an explicit live-operations policy.
