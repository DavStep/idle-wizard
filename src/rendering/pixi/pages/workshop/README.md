# Retained Pixi Workshop Page

`WorkshopPixiPage` builds the request panel, summon control, side feature
openers, bag/stats actions, and reward-flyout layer once. The compact world
chat preview belongs to retained global chrome so it stays visible across room
changes.
The page also owns nine passive fireflies between the Workshop window and the
interactive room UI. They reuse retained Graphics objects, animate only through
transform and alpha while the page is active, pause off-page, and remain still
under reduced motion.
Requirement rows, feature openers, dialog rows, tabs, and flyouts are keyed and
pooled.
Long dialog lists keep those keyed row instances for stable state and input,
but render only the visible scroll window plus a small guard band. Scrollbar
geometry is reused across offset-only frames.

Workshop gameplay and backend behavior remain in presenters/facades. The Pixi
view consumes already-formatted task rows, summon state, feature state, chat
preview, flyouts, and dialog models. It invokes supplied actions without
calculating costs, rewards, unlock levels, inventory, alliance state, or event
progress.

Every side-control model supplies `side` and `weight`. `WorkshopPixiPage`
independently sorts the visible left and right controls, packs each side from
the shared top anchor into fixed slots, and owns the short enter, exit, and
slot-shift transitions. Hidden controls never reserve a row.
The level-15 Guild model is a right-side control whose activation changes to
the retained Guild page and alternate Guild HUD; it is not a Workshop dialog.
The level-7 Prestige model follows the same navigation contract from the left
stack, opening the retained Prestige page and its Workshop/Main/Points HUD.
Each label and optional timer centers on the shifted art frame rather than the
unshifted panel edge. Notification dots attach to that same frame's top-right
corner, and per-icon presentation scales normalize the current art against the
Bag's optical weight without changing the underlying assets.

Workshop-owned dialogs are registered lazily as `workshop.<feature>` in the
injected `DialogRegistry` and retain their display trees after close.
The Bag presenter keeps unlocked or owned item rows and omits locked zero-count
catalog entries. Bag reuses the shared Settings-backed `50px` inventory row for
its passive item and currency catalogue, with the selection marker and row
action omitted. Its footer keeps the shared popup-tab skin but lays visible
categories out in a centered grid of at most three tabs per row.

Open `src/dev/uiRecipes/world-event-dialog.html` through the shared Vite server
for deterministic production-backed World Event states. It includes the
family-selected full-width event artwork with rounded clipping, full-width
`314px` paper request sections, the two-quest no-scroll composition,
the shared player leaderboard rows, the image-backed reward rows with overlaid
icon amounts, and Donate-to-donation-dialog interaction without depending on a
gameplay save or backend account session. Use `?tab=rewards` for reward-row QA.

Pass the shared `PixiInputRouter` when constructing the page. Buttons,
quick-release and hold-to-repeat summoning, scrolling, dialog backdrops, Escape/Android back, and
modal blocking register once through that router; their registrations are
removed only when the retained view is destroyed.
