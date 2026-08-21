# Trade Alliance Backend

Trade alliances are player groups. The backend facade watches alliance tables, sends alliance reducers, mirrors alliance chat, and grants crystal rewards from claimed weekly quests.

Alliance identity also owns normalized `bannerColor`, `emblemColor`, and `emblemId` fields. The color fields use fixed ten-option catalogues; `emblemId` selects the original Unity mark or one of eleven additional silhouettes. They default to blue cloth, a gold Unity emblem, and travel through the same create/profile reducers and public snapshots as the alliance tag color.

Application snapshots include the applicant's current character and frame from the player profile so authorized managers can review requests with the same player-identity treatment used by leaderboards. Accept and reject remain server-authoritative reducers behind `TradeAllianceBackendFacade`.

Other features should use `TradeAllianceBackendFacade`, not generated SpacetimeDB tables directly.
