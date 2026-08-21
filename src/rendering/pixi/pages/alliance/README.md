# Alliance Pixi Workspace

`AlliancePixiPage` is the retained full-page Trade Alliance surface. Workshop's
Alliance landmark enters this page, and the global bottom panel switches to the
Alliance HUD until the player returns to Workshop.

The page renders projected data only. Membership, public alliances,
applications, quests, settings, and alliance chat remain authoritative behind
`TradeAllianceBackendFacade`. The renderer sends actions through
`PixiPagesFacade` and never accesses generated SpacetimeDB bindings directly.

Unaffiliated players receive Browse and Create. Members receive Home, Quests,
Chat, and permission-gated Requests and Settings. Alliance Chat deliberately
uses only `allianceChatMessages` and `sendChatMessage`; it does not reuse the
global World Chat stream.

The page reuses retained scroll areas, Alliance rows and flag controls, Guild
summary sections, player relationship rows, World Chat message rows, the shared
text field, and shared text buttons. UI Lab coverage lives in
`AlliancePixiPage.ui-editor.js`.
