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
Those destinations use the standard illustrated bottom-room tab contract with
Alliance-specific hall, quest, applicant, and banner-settings icons; only the
selected destination reveals its label. Workshop return keeps the existing
Workshop icon.
Every member workspace destination begins with the shared title-only purple
folded ribbon labeled `Trade Alliance`. Workspace content starts `5px` below
the ribbon while Alliance Chat and the alternate bottom HUD keep their existing
anchors.
Browse and Create remain footer tabs in `workshop.alliance`; a successful Create
or direct Join transitions to workspace Home after the membership snapshot
arrives, while Apply remains in the dialog. Alliance Chat deliberately
uses only `allianceChatMessages` and `sendChatMessage`; it does not reuse the
global World Chat stream. The shared compact preview stays visible on every
Alliance workspace page with the label `Alliance Chat`. Pressing it opens the existing
`WorkshopDialogPixi` chat sheet and composer with the Alliance-only model.
Player-authored rows replace the redundant alliance tag with the sender's
current alliance role, while former members are labeled `Former Member`.
Alliance system rows keep the event copy in one inline flow and show the primary
player through a compact `20px` profile sized to the message typography. Every
mentioned username is highlighted, including both the joining player and the
approving player; the compact profile and primary announced name open Player
Info.

Home reuses the Alliance dialog's split parchment and `AllianceMemberRow`
roster. Its identity section centers the shared alliance flag between
left-aligned name/tag copy and right-aligned HUD currency capsules for member
capacity and season income. The announcement sits directly above the managed
member list, reuses Elara's compact purple request ribbon for its title, and
reserves the parchment body for the notice. The ribbon uses a reduced local
scale, the notice uses the shared tiny text role, and the Home parchment stack
keeps its compact baseline while only the identity section receives an
additional upward optical nudge. The roster scrollbar uses the shared `4px`
dialog-scrollbar right shift. Notice copy is horizontally centered.
When no notice exists, the empty
message centers in both axes; reproduce it with
`/src/dev/uiRecipes/alliance-dialog.html?announcement=empty`. Members sort by role, and each occupied role starts with one
compact rank separator. Member cards show player level, the shared always-visible
three-slot prestige stars, and icon-backed lifetime coin contribution without
repeating the role inside every card. Browse, Create, and their directory/form widgets remain covered by
the retained dialog UI Lab entry. Requests places Research-card-backed applicant
rows in the upper scroll region and fixes the direct Open/Apply/Closed join-mode
selector immediately above Alliance Chat for members with application-management
access. Each applicant row shows current level, the shared always-visible
three-slot prestige stars, and total produced coin beside the unchanged
Accept/Deny actions; selecting a different
mode marks one pending change for `Save Changes`.
Settings keeps one draft but presents it through focused Profile and Banner
tabs anchored below the settings content, matching the Market page's fixed
bottom content-selector rhythm. Profile owns the text fields, tag color, Save
Profile, and guarded Disband. Banner owns the large live flag, enlarged emblem
choices in a centered grid below the flag, distinctly spaced color rows, and
Save Banner. Quests use a taller extension of the exact Research row family:
the same card, 52px art well, item scale, compact title, fixed right action,
and blue passive progress rail. Each row states the required donation or coin
collection, centers alliance progress inside the rail, keeps `Your contribution`
below it, and gives the icon-backed Amber reward body-size emphasis. Claimed
quests replace the action with a passive Settings-row plaque matching Brewing's
recipe-status treatment: paper-ink `Claimed` copy at left and a larger shared
checkmark at the right inset.
Participation-locked actions remain pressable only to show which prior alliance
owns the current weekly progress and when the player can continue. Requests and
Settings keep the established player-relationship and settings widgets.
Member-workspace UI Lab coverage lives in `AlliancePixiPage.ui-editor.js`; the
compact/full chat surfaces retain their existing global and Workshop dialog
entries.
