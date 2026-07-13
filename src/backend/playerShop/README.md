# Player Market Backend

Shares player market listings and request rows through SpacetimeDB.

Player market exchange is enabled. The server stores listings, listing quantity, aggregate claimable proceeds, trade history, royalty history, and public request rows. Every row, browse view, and reducer is limited to the caller's active permanent Prestige market licence; cross-market IDs and listing purchases are rejected by the server. Claimable proceeds include player-market listing sales and potion discovery royalties from NPC market trades; use trade history and `own_potion_recipe_royalty_history` before labeling proceeds as listing sales or royalties. Local gameplay still owns item reservation, buyer coin spending, request slot saves, and claimed proceeds application after reducer success. Request rows are public visibility only until escrow/delivery behavior is explicit.

Keep the facade boundary in place. Do not expose raw generated database APIs to gameplay features.
