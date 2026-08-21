# Alliance Pixi Workspace

`AlliancePixiPage` is the retained full-page Trade Alliance surface for members.
Workshop's Alliance landmark opens the existing Browse/Create dialog while the
player is unaffiliated. Once authoritative state contains `ownAlliance`, the
landmark enters this page and the global bottom panel switches to the Alliance
HUD until the player returns to Workshop.

The page renders projected data only. Membership, public alliances,
applications, quests, settings, and alliance chat remain authoritative behind
`TradeAllianceBackendFacade`. The renderer sends actions through
`PixiPagesFacade` and never accesses generated SpacetimeDB bindings directly.

Members receive Home, Quests, and permission-gated Requests and Settings.
Browse and Create remain footer tabs in `workshop.alliance`; a successful Create
or direct Join transitions to workspace Home after the membership snapshot
arrives, while Apply remains in the dialog. Alliance Chat deliberately
uses only `allianceChatMessages` and `sendChatMessage`; it does not reuse the
global World Chat stream. The shared compact preview stays visible on every
Alliance workspace page with the label `Alliance Chat`. Pressing it opens the existing
`WorkshopDialogPixi` chat sheet and composer with the Alliance-only model.

Home reuses the Alliance dialog's split parchment and `AllianceMemberRow`
roster. Its identity section centers the shared alliance flag between
left-aligned name/tag copy and right-aligned HUD currency capsules for member
capacity and season income. The announcement sits directly above the managed
member list. Browse, Create, and their directory/form widgets remain covered by
the retained dialog UI Lab entry. Requests places Research-card-backed applicant
rows in the upper scroll region and fixes the direct Open/Apply/Closed join-mode
selector immediately above Alliance Chat for members with application-management
access. Each applicant row shows current level, prestige count, and total
produced coin beside the unchanged Accept/Deny actions; selecting a different
mode marks one pending change for `Save Changes`.
Settings keeps one draft but presents it through focused Profile and Banner
tabs anchored below the settings content, matching the Market page's fixed
bottom content-selector rhythm. Profile owns the text fields, tag color, Save
Profile, and guarded Disband. Banner owns the large live flag, enlarged emblem
choices in a centered grid below the flag, distinctly spaced color rows, and
Save Banner. Quests, Requests, and Settings keep
the established quest, player-relationship, and settings widgets.
Member-workspace UI Lab coverage lives in `AlliancePixiPage.ui-editor.js`; the
compact/full chat surfaces retain their existing global and Workshop dialog
entries.
