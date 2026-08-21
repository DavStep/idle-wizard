# Trade Alliance Backend

Trade alliances are player groups. The backend facade watches alliance tables, sends alliance reducers, mirrors alliance chat, and grants crystal rewards from claimed weekly quests.

Alliance chat includes server-authored system history for founding, direct joins, approved joins, voluntary departures, kicks, role promotions/demotions, and leadership transfers. Moderated actions name the member who performed them.

Alliance identity also owns normalized `bannerColor`, `emblemColor`, and `emblemId` fields. The color fields use fixed ten-option catalogues; `emblemId` selects the original Unity mark or one of eleven additional silhouettes. They default to blue cloth, a gold Unity emblem, and travel through the same create/profile reducers and public snapshots as the alliance tag color.

Application snapshots include the applicant's current character, frame, total
produced coin, and prestige count from the same public player summary used by
Player Info. Authorized managers can review requests with the established
player-identity treatment while Accept, Reject, and the focused join-mode change
remain server-authoritative reducers behind `TradeAllianceBackendFacade`;
Factor-or-higher permission owns all three request-management actions.

Other features should use `TradeAllianceBackendFacade`, not generated SpacetimeDB tables directly.

Page notifications retain quest rows and application rows independently from
the full public alliance directory. This keeps claimable quest rewards and
manageable join requests live while the Alliance workspace is closed without
holding alliance and member directory rows open.
