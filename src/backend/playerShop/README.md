# Player Market Backend

Shares player market listings and request rows through SpacetimeDB.

Player market exchange is enabled. The server stores listings, listing quantity, proceeds, trade history, and public request rows. Local gameplay still owns item reservation, buyer gold spending, request slot saves, and claimed proceeds application after reducer success. Request rows are public visibility only until escrow/delivery behavior is explicit.

Keep the facade boundary in place. Do not expose raw generated database APIs to gameplay features.
