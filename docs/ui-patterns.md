# UI Patterns and Reusable Widget Library

This is the authoritative reusable widget library for Idle Wizard. Before adding UI, map every visible or interactive building block to an entry here and reuse its contract.

## Admission Rule

- Classify each building block as `reuse`, `extension`, or `new widget` before editing product UI code.
- `reuse` uses a library entry unchanged. `extension` supplies feature data, copy, or composition without changing the entry's visual, interaction, state, or accessibility contract.
- `new widget` includes a new primitive, compound component, scroll behavior, box/dialog type, control pattern, or a meaningfully different variant of an existing entry.
- Before adding any new widget, ask the user to approve one batched list with exact names, purpose, closest existing entry and why it is insufficient, supported states, intended consumers, and labeled `390x844` visual previews.
- Keep proposal previews disposable and outside product runtime code. After approval and implementation, add the widget to this library with its stable source, contract, and real-app preview evidence.
- A proposal preview must be a visible image or rendered artifact, not only prose or an ASCII wireframe. Include a native-pixel crop for component judgment; a labeled contact sheet may preview the whole batch.
- Wait for explicit approval of each named widget. A screen-level approval does not cover unlisted widget dependencies.
- Every completed UI task reports `New widgets: none` or lists the approved widgets introduced.

## Current Library

| Widget | Stable source | Contract and approved use |
| --- | --- | --- |
| Ordinary border-labeled box | `.style-box`, `.style-box__title` in `src/styles/base.css` | Default room section with compact padding, embedded transparent title, no dialog shadow. |
| Expandable inventory box | `src/pages/shared/RoomInventoryBoxManager.js` | Ordinary box with count label, collapsed summary rows, and bottom-border expand/collapse action. |
| Default player dialog shell | `PixiDialogFrame` in `src/rendering/pixi/primitives/PixiDialogFrame.js`; `.style-dialog`, `.style-box__title` in `src/styles/base.css` for fallback markup | Root Run Expedition brown outer frame, paper content, purple title plaque, detached round close control centered below the shell when dismissal is allowed, and modal shadow. All game dialogs, including blockers, use this shell; the first-run cutscene is an ordinary box, not a dialog. |
| Full-screen announcement screen | `PixiAnnouncementSurface` in `src/rendering/pixi/global/dialogs/PixiMessageDialogs.js`; `.room-announcement-layer` in `src/styles/base.css` | Centered, unframed progress, research, and feature-unlock presentation over the full-screen backdrop. Preview screens dismiss from the backdrop and do not show a dialog close control; report-style announcements opt into the default dialog shell. |
| Base text button | `.style-button` in `src/styles/base.css` | Shared compact button foundation; feature classes may size or place it without inventing new state treatment. |
| Regular button color variants | `.style-button--yellow`, `.style-button--brown-dark`, `.style-button--brown-light` in `src/styles/base.css` | Shared straight-edged Root Run regular-button geometry. Choose color by role; disabled variants retain the same geometry in gray. |
| Cost button | `src/pages/shared/CostButtonManager.js`, `.style-cost-button` | Price/cost control with icon-before-value presentation, disabled state, accessible label, and isolated click handling. |
| Base input | `.style-input` in `src/styles/base.css` | Shared text, number, textarea, and select foundation with normal, focus, placeholder, and disabled states. |
| Managed vertical scroll pane | `.style-page-scroll`, `src/pages/managers/ScrollCueManager.js` | The only scroll behavior. Use it for full room pages, dialog/popup content, and bounded lists; context changes sizing, not physics or scrollbar type. |
| Progress rail | `.style-progress`, `.style-progress__fill`, `src/pages/shared/progressFill.js` | Shared timer/progress geometry and width-driven fill with reduced-motion handling; use approved room color roles only. |
| Amount selection row | `src/pages/shared/AmountSelectionRow.js` | Shared decrement/value/increment control with editable numeric value and accessible step labels. |
| Numbered or inline-action row | `Numbered Rows` and `Inline Row Actions` below | Compact left marker, middle content, fixed right action/status rhythm. |
| Room inventory opener | `src/pages/shared/RoomInventoryButtonManager.js` | Shared icon-over-label side control for opening the seed, herb, or potion inventory surface. |
| Bottom room tab | `src/pages/bottomPanel/managers/BottomPanelViewManager.js`; `src/rendering/pixi/global/chrome/PixiBottomPanelView.js` | Equal-width Root Run station tabs fill the source width and leave an `8px` bottom safe gap. Active/inactive caps are `56px`/`44px` before the shared lower stretch; the active tab rises `12px` and alone shows the room name. |
| Popup text tab | `src/pages/shared/selectedTabState.js`, popup tab rules in `src/styles/base.css` | Brown text-tab family below dialogs with explicit selected semantics and fixed content above. |
| Resource or item icon label | `src/pages/shared/resourceIconLabel.js`, `src/pages/shared/itemIconLabel.js` | Shared icon-before-text label that preserves surrounding normal/disabled text color and accessible text. |
| Info icon button | `src/pages/shared/infoButton.js` | Shared decorative info asset; caller owns accessible name, geometry, and disclosure behavior. |
| Lock/check status icon | `src/pages/shared/statusIcon.js` | Shared status artwork; accompanying control or text owns the accessible meaning. |
| Notification badge | `src/pages/shared/notificationBadge.js` | Red/orange priority indicator with tutorial visibility policy; not a general decoration dot. |
| Tooltip | `.style-tooltip` in `src/styles/base.css` | Small active-theme explanatory surface with compact offset shadow; not a replacement for persistent labels. |
| Reward flyout | `src/pages/shared/RewardFlyoutManager.js` | Shared pooled, `aria-live` reward feedback with reduced-motion support and bounded concurrent visuals. |

The managed vertical scroll pane intentionally has one behavior with three sizing contexts. Do not create separate room, dialog, or list scroll physics unless the user approves a new widget.

## Previewing Existing Widgets

- Start the dev UI editor as documented in `src/dev/uiEditor/README.md`, select an existing runtime widget, and use `open prefab` for an isolated preview.
- Prefer an existing `?devUi=<surfaceId>` route or checked-in UI recipe for full compositions. Add a new checked-in preview route only after its widget is approved.
- Proposal-only previews remain disposable. Approved implementation QA uses the real app at `390x844`, plus a native-pixel crop for the library entry.

## Box Construction

- Ordinary room boxes use compact padding, no shadow, and `2px` ordinary borders in selectable themes.
- In selectable themes, standard `style-box` inner sections and `.style-panel.room-top-panel` use `inner-section-panel-<theme>-9slice.png` with CSS slice order `91 73 90 83 fill`. Its rendered border widths are those same qUIck margins scaled from the `1080px` export width to the `390px` logical surface; never substitute arbitrary compact border widths. Keep the exact center-sample color behind the border image so fractional contain scaling cannot expose transparent hairlines at slice joins. Do not reuse that skin for other outer `style-panel` surfaces, dialogs, buttons, tabs, tutorial surfaces, or feature-owned paper art.
- Box titles sit embedded transparently over the top border, without a background backplate.
- Box titles use the shared surface-colored text stroke in every selectable theme, keeping the border visible around the glyphs without creating a rectangular title surface.
- Secondary border labels, such as counts, current controls, actions, and tabs, use smaller normal-weight text centered on the border line.
- Default player-facing popup/dialog boxes use the shared Root Run Expedition dialog shell: `364px` brown outer nine-slice; `352px` Expedition paper nine-slice inset `6px` horizontally, `31px` from the shell top, and `21px` from the compact shell bottom; separate `222x44px` purple title plaque; `41px` round X close asset centered `23px` below the shell; and one compact bottom-right shadow. Plaque text uses the exported `64px`/`8px` source type/stroke metrics (`23.1px`/`2.9px` at `390px`) and the source `22px` top offset. These image layers stay transparent behind their PNG corners; never add a full rectangular fallback fill beneath them.
- App-level boot, connection, account, and deploy blockers use the shared player-dialog shell. Keep them non-dismissible when the flow must retain control; hiding the close action is a state of the existing shell, not a separate blocker panel.
- Every managed scroll panel uses `style-page-scroll` on the actual scrolling element. Full-page room roots additionally apply the shared `--style-page-scroll-padding-top` / `--style-page-scroll-padding-bottom` cuts so content tucks under chrome consistently. Dialogs, popups, and bounded lists use the same Root Run station scroll behavior and vertical scrollbar without introducing a second scroll type.

## Numbered Rows

- Numbered game rows use a narrow left number cell, written as `1.`, `2.`, etc.
- Main item/content text sits in the middle.
- Price, status, timer, or action sits right-aligned in one fixed right slot.
- Never leave the middle content blank. Unlocked empty slot rows should invite the next action, such as `select` or `request item`; locked empty rows still name the thing, such as `empty stand` or `empty request`, with the right slot carrying requirement/state.
- Item market rows without numbers use the same compact middle/right rhythm as numbered rows; do not give stock/picker rows looser vertical padding.
- Do not write row type words such as `stand 1` when the surrounding box already gives the type.
- Market stand rows, player request rows, and garden plot rows should follow this same left-number, middle-content, right-action rhythm.

## Inline Row Actions

- Row actions are text controls on the line, not separate decorative cards.
- Purchase prices use the shared `CostButtonManager`: the caller supplies the formatted cost, current availability, accessible action label, and purchase callback. The manager owns the Root Run qUIck green nine-slice rendered at the compact `281x169` target, Lilita One outlined amount, icon-before-value geometry, disabled state, and click isolation; gameplay facades still own affordability checks and spending.
- Workshop `stats` and Brewing `recipes`/primary/quantity/auto controls use the yellow Root Run button configuration through `style-button--yellow`. The Brewing cauldron purchase price remains a green `CostButtonManager` control at the same stack dimensions. The `bag` entry uses `assets/game/source/icons/icon-bag.png` as an icon-over-label button in the fourth left-side Workshop HUD row. Cost buttons stay green and tabs stay brown.
- Do not define mouse-hover states for row or button actions; press states must not tint row or button backgrounds.
- Underlines are allowed only for neutral selected options in mutually exclusive controls, such as tabs or one-of button panels; do not show them while held or pressed.
- Buy/place/claim prices stay right-aligned and use tabular numerals.
- Disabled or locked right-side actions use muted text and keep the same row height as enabled rows.

## Info Buttons

- Standalone info/help buttons use `assets/game/source/ui/prop_info.png` through the shared `setInfoButtonIcon` helper. Do not substitute `[i]`, `?`, or a font glyph.
- Callers keep ownership of the accessible `aria-label`, expanded state, tooltip/dialog action, and hit-target geometry. The shared helper owns only the visible icon and decorative-image semantics.
- Size the icon to the surrounding control: border-label info buttons use the border-label line height, while freestanding controls may use the full authored hit-target height.

## Lock Icons

- All visible lock iconography uses `assets/game/source/ui/prop_lock.png` through `createStatusIcon(..., STATUS_ICON_LOCK)`. Do not substitute CSS-drawn padlocks, Unicode locks, font glyphs, or alternate lock images.
- Keep meaningful player-facing `locked` text when it communicates state; this rule standardizes only the graphic.
- Callers continue to own the surrounding control's accessible label and geometry. Lock artwork remains decorative when the control or state label already exposes the locked state.

## Checkmark Icons

- All visible checkmark iconography uses `assets/game/source/ui/prop_checkmark.png` through `createStatusIcon(..., STATUS_ICON_CHECK)`. Do not substitute CSS-drawn checks, Unicode checks, native checkbox marks, font glyphs, or alternate checkmark images.
- Composite research icons that include a checkmark must source the same `prop_checkmark.png` artwork through `scripts/generate-research-icons.js`.
- Keep meaningful player-facing text such as `complete`, `claimed`, or `selected`; this rule standardizes only the graphic.
- Callers continue to own the surrounding control or state label's accessible name. The checkmark remains decorative when that name already communicates the state.

## Percentage Allocation Lists

- Trader stall loaders use full-width inventory-row buttons with a quiet background and a larger gap between rows.
- Tapping an inventory row selects one current item without moving stock. The selected row keeps resource/icon colors unchanged and uses only the row background for selection.
- The allocation control is a progress rail with a 14px cream circular knob, tan border, dark-brown outer ring, no inner glyph, and `5%` steps from `0%` through `100%`. Do not show percentage labels under the rail. Percentages reconcile against matching stock already loaded plus matching stock still in inventory.
- `mark xN` applies the selected percentage in one gameplay update. `clear` returns loaded stock and stops future marking. `mark future` is a separate toggle that continuously routes newly produced copies to that stand without consuming stock already owned when enabled. Successful mark, clear, and future actions close the loader.
- A stand waiting for future production keeps its item target after loaded stock reaches zero and reads `waiting for <item>` instead of `empty stand`.

## Progress Rails

- All in-game progress, timer, allocation, tutorial, and scroll rails reuse the compact Root Rush geometry: 10px source height, a 1px black capsule border, a dark inset rim, a 1px inner gap, and fully rounded fill caps.
- The top-panel quest rail is the sole thickness exception and keeps the original 14px Root Rush source height.
- The default fill is purple `#8740df` with a lighter purple `#bd72f3` inset edge. Brewing overrides it with blue, Garden with green, and Market/Research with yellow. Alternate researched fill treatments keep the same rail geometry.
- Reveal progress by changing width or the live right edge. Never use `scaleX`, because it compresses the rounded caps.

## Expandable Boxes

- Collapsed boxes keep one full summary row visible inside the box.
- Use a top-right border label for count or progress, such as `2/5`.
- Use a bottom-center border label as the toggle: `expand` when collapsed, `collapse` when open.
- Expand hidden rows in normal flow inside the same box, without overlaying nearby panels.
- Workshop main progression uses one always-open `elara's request` box. Show only the active request; the shared top panel owns a continuous level rail with thin dividers, a compact level-star badge, and the small left-aligned remaining-quest caption underneath. Each configured request owns one segment. When all requests are complete, relabel the progression box `level up` for the separate coin-free action; never count or label that action as an Elara request. Keep the whole progress row hidden at level 0 and reveal it after the automatic transition reaches level 1. Do not add XP copy, an expandable checklist, pinning, or task reordering.

## Popup Structure

- Default dialog titles sit centered in the separate Root Run purple title plaque above the brown shell; ordinary box titles remain embedded border titles.
- Dismissible dialogs use the shared round Root Run X asset centered below the shell at the authored gap; retain its accessible close label. Blocking dialogs use the same shell with the close action hidden.
- Back, previous, and next actions remain text controls. Never reuse a close class for navigation or replace navigation text with the X asset.
- Tabbed popups put tabs below and outside the bordered dialog, with the same stroke as the popup.
- True tab buttons use the shared selected-tab state so every tab has explicit selected and unselected views. Text tabs use the very-dark Root Run brown button skin when deselected and the lighter brown skin when selected; the five bottom room icon tabs alone use the full-width Root Run station-tab active/inactive nine-slice row with an `8px` bottom safe gap. Do not assign tab semantics to previous/next pager buttons.
- Standard tabbed popups use `--style-tabbed-dialog-width` on the panel and `260px` content width on the dialog. Wider `286px` dialogs must use the wider panel token too; never mix a standard tab panel with a wider dialog.
- Tabbed dialogs keep a fixed bordered panel height; overflowing tab content scrolls inside that panel while the bottom tabs remain fixed.
- Every scrollable dialog pane puts `style-page-scroll` on the actual scrolling viewport. Wheel and drag input use the station resistance/inertia/spring model; the track/thumb appears at the right edge only when content overflows and the thumb compresses during elastic top/bottom overscroll. Never reserve bottom space or add a sibling scroll-progress rail.
- Popup rows should keep stable DOM nodes during snapshot updates so mobile taps do not miss after touchend.
- Book-like catalogues use compact column headers and stable selectable rows; selecting a row reveals a short detail/history block in the same dialog instead of stacking another catalogue modal.
