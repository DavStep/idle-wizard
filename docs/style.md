# STYLE

Canonical direction: the approved illustrated Brewing-page reference, using the shared Root Run-inspired asset and nine-slice pipeline already present in the project.

The game should look like a polished fantasy workshop HUD: dark layered rooms, rendered props and item art, tactile image-backed controls, compact outlined labels, and clear resource/action colors.

## Core Feel

- High-contrast outlined text over dark midnight/navy panels.
- Give each room one dominant illustrated landmark that makes its production loop recognizable.
- Use shared rendered item/resource art and image-backed panel/button skins as functional UI.
- Prefer clear grouping, direct labels, and a strong landmark → status → action hierarchy.
- Decoration must reinforce room identity, state, or action role; unrelated ornament is still noise.
- Use intentional capitalization. Titles, tabs, named items, research, events, and task labels use title case; instructions and narrative copy use sentence case. Keep user-entered names exactly as typed.

## Typography

- Default font family: `"Lilita One", "Arial Black", Arial, ui-sans-serif, system-ui, sans-serif`, matching Root Run.
- Source UI font size: `13px`.
- Popup/dialog title font size stays `14px`.
- Mobile readability comes from the room UI scale layer, not from changing the source font size.
- Normal font weight by default.
- Normal line height and normal letter spacing.
- Use tabular lining numerals for resource values, costs, counts, timers, and leaderboard numbers.
- Use bold only for totals, section names, or strong resource values. Selected, current, pressed, checked, active, and focus states keep the same font weight as their resting state.
- Do not define mouse-hover states or use below-text lines for hold, press, or ordinary current state. The only underline exception is a neutral selected option in a one-of-many control, such as a tab or button panel button.

## Color

- Primary text: active theme text, currently `#d4d4d4` in the midnight theme.
- Midnight-theme strokes: muted blue-gray, currently `#3f465c`.
- Page and surface: dark midnight tones, currently `#1c1e26` and `#17191f`.
- Disabled/secondary text and borders: medium gray.
- Resource and currency displays use their shared icon and approved semantic color while still inheriting disabled/locked treatment. Keep each amount, icon, and resource word together.
- Page backgrounds use the active theme's solid room surface. Image-backed panels may still use authored shading, texture, bevels, and mild gradients from their shared skins. Do not add arbitrary feature-local gradients. Default dialogs use the dedicated Root Run composition below.

## Boxes

- Standard inner sections (`style-box`) use the shared Root Run shop-tile nine-slice, recolored per selectable theme. Preserve its qUIck slice margins at the Root Run `390 / 1080` design scale and keep the theme's exact center-sample color as the rounded underlay; the underlay only closes fractional raster gaps and must not replace or square off the transparent frame corners. The persistent top player panel uses a dedicated less-rounded sibling of the inactive bottom-room-tab nine-slice, flipped vertically and stretched from the screen top across the full source width, with a `16px` gap before room content. Keep outer room landmarks, dialogs, controls, tutorial surfaces, and feature-owned art on their dedicated approved chrome.
- Do not add standalone CSS rounding to image-backed panels; the shared skin owns its silhouette, bevel, inset, and corners.
- Ordinary panel padding stays compact in source UI units and must respect the visible artwork and frame insets.
- New illustrated panels place strong titles inside the approved composition, normally top-left. Existing border-labeled boxes may keep transparent embedded titles until that surface is intentionally redesigned.
- Counts, pagination, state chips, and secondary labels use the shared compact label treatment and must remain optically aligned to their frame.
- Every player-facing popup/dialog panel uses the Root Run Expedition composition: `expedition-dialog-back.png` as the brown outer nine-slice, `expedition-dialog-front.png` as the paper content nine-slice, `expedition-dialog-title-purple.png` as the centered purple title plaque, and `expedition-dialog-close.png` as the round dismiss control centered below the shell. Render the assets through `PixiDialogFrame` in mirrored room UI, with CSS border-image/image fallbacks for non-mirrored dialogs.
- Split-paper dialogs reuse the Load Stall composition: hide the continuous paper layer, render each section with the exact Expedition paper nine-slice, keep content on the standard dialog column with no extra side inset, expand paper through the shared `20px` dialog padding, and preserve an `8px` visible gap between paper sections. Level rewards uses this pattern for gained and total bonuses, with yellow previous/next controls fixed inside the lower board corners.
- Every whole-dialog category tab row stays fully inside the shell's brown bottom footer, below the paper content. End the continuous paper or final split-paper section `6px` above the tabs, keep `10px` of visible brown shell below the complete tab row, and inset the row `9px` from each side of the standard `304px` shell. Footer gaps expand as the count drops: `4px` for five tabs, `6px` for four, `8px` for three, and `10px` for two; divide the remaining row width equally among the tabs. Use the shared compact `11px` tab type. Content-local subsection controls such as Account's internal tabs remain inside their paper and do not use the shell footer.
- Keep the base dialog at a fixed `304px` content width with a `53px` minimum content height and `20px` source content padding inside the paper. Named wider or fixed-height variants may override the base geometry. The brown frame and its compact bottom-right shadow sit outside that content box; do not add a second themed border or rectangular dialog fill.
- Retained global dialogs cap the complete brown shell at `324px`, which preserves `5%` left and right insets on the `360px` source screen. Their content width is therefore capped at `264px` after shell outsets and `20px` dialog padding; reflow content within the cap instead of scaling the dialog.
- Dialog text uses the paper palette (`#634934` ink on `#ffe7c8`), independent of the selected room theme. Dialog titles use white text with the shared dark outline on the purple title plaque. Approved destructive or loss-bearing confirmations may use the same plaque geometry and ornaments with the shared semantic-red danger treatment.
- Backend boot and reconnect stay on the full-screen Idle Witch Craft loading splash until the backend reports online. Account-in-use, maintenance, account, deploy, Shop, Guild, page-owned dialogs, and the first tutorial story prompt use the shared dialog shell. Flows that must retain control hide the close action; feature-specific artwork stays inside the shared paper content area. Full-screen progress and feature-unlock announcement screens stay unframed; report-style announcements remain dialogs.
- Tabbed dialogs use a fixed panel height. If tab content is taller than that height, keep the bottom tabs fixed and scroll only the content viewport.
- Every true tab button uses the shared selected-tab state. Text tabs use the very-dark Root Run brown button skin when deselected and the lighter brown skin when selected; the five bottom room icon tabs keep their dedicated raised active-tab skin. Previous/next pagers are ordinary navigation buttons, not tabs.
- Every managed scroll panel uses the single `style-page-scroll` primitive, including room pages, dialogs, popups, and bounded lists. It owns the complete Root Run station-panel model: wheel and pointer drag share progressive asymmetric edge resistance, release inertia, elastic top/bottom limits, and a cushioned `260`/`22` spring return that settles in about `250ms`. The thumb compresses against either overscrolled edge. Preserve the `6.5px` vertical track with `4.333333px` block inset, translucent `#17100c` fill, and 72%-alpha black outline; the proportional thumb uses `#f2ae54`, a `#5e321b` outline, and a `29.611111px` minimum height. Keep it on the right edge of the actual viewport, visible only when content overflows. Do not append a horizontal progress rail below scroll content.
- Tooltips follow the active theme's ordinary border width, active surface, and a small offset gray shadow.
- Ordinary room/page surfaces should not use shadows.

## Buttons

- Buttons are tactile image-backed controls with visible labels and optional meaningful icons.
- Center label text.
- Every visible button label uses a text stroke chosen by the shared button style for contrast; keep the stroke in normal, selected, pressed, and disabled states instead of adding feature-local outline values.
- Native buttons must be reset so only the shared game skin is visible, not platform chrome.
- Workshop side-panel labels and the summon cost button keep their authored capitalization. Side labels use centered white `13.5px` Lilita One with a heavy rounded near-black outline; rendering must not force them to lowercase.
- Workshop side controls use the approved `RootRunSideAction`: two complete stacks anchored `10px` from their owned source-stage edges, with a `50x60px` source hit box, one flat rough-edged icon rendered at `72%` inside its `50x50px` art frame, and a further `2px` artwork nudge toward the edge. Keep the tight `-10px` icon-to-label offset and `62px` row pitch. The stacks begin `18px` below Elara's Request. Each visible control is placed by its declared left/right side and numeric weight, with hidden controls removed from slot allocation and reduced-motion-safe state transitions. Keep the shared brown, tan, gold, and purple palette; do not add feature-local backing plates, tint layers, mirroring, or per-icon scales.
- The Workshop `Summon Seed` action uses the shorter shared cost-button background configuration recolored to the info icon's blue/cyan palette while enabled, then swaps to the shared gray cost-button skin while unavailable. Both the action and cost row use the shared black text stroke, and the second row uses the shared mana-drop icon with a light numeric amount.
- Standalone info/help buttons use the shared Root Run `prop_info.png` asset through `setInfoButtonIcon`; never render `[i]`, `?`, or a letter glyph as the visible icon.
- Visible lock iconography uses the shared `prop_lock.png` asset through `createStatusIcon(..., STATUS_ICON_LOCK)`; never draw a lock in CSS or substitute another image, Unicode symbol, or font glyph.
- Visible checkmark iconography uses the shared `prop_checkmark.png` asset through `createStatusIcon(..., STATUS_ICON_CHECK)`; never draw a checkmark in CSS or substitute another image, Unicode symbol, native checkbox mark, or font glyph.
- Do not define mouse-hover states or hover-only behavior.
- Press/active state uses the shared compact compression/release motion and skin state; keep label/icon centering stable.
- Disabled buttons use the shared gray button asset and keep normal weight. Never apply grayscale or monochrome shaders to button chrome; those shaders are reserved for icons.
- Brown/gold is the default action family, green is positive/claim/collect/confirm, and red is cancellation or loss. Cost and tab skins keep their documented roles.
- Shared passive progress rails use losslessly cleaned Root Run capsule assets: the one-pixel Android metadata border is stripped from `progress-bar-bg.9.png` and `progress-bar-fill.9.png`, then only their clean centers stretch at the 10px source height. Retained scrollbars rotate those same capsule interiors vertically so both thumb caps remain authored and round. Purple is the default fill, Brewing uses blue, Garden uses green, and Market/Research use yellow. Trader-stall sale progress is the Market exception: keep it purple and do not inherit the gradient player style. The top-panel level-up rail reuses Root Run's exact panel and track plus a losslessly distilled fill silhouette rendered at the authored 51px qUIck height while retaining the approved Idle Wizard gradient; app-level connection/loading rails keep their selected gradient treatment. Interactive sliders and the top-panel quest rail use the thicker 14px height.

## Text Inputs

- Retained player-authored text and number fields use the shared brown inset `PixiTextField` nine-slice by default, including chat composers, usernames, naming fields, feedback, and amount editors. Reuse the same chrome at the required width and height; do not create feature-local input frames. An approved specialized surface may explicitly request the legacy `control` variant.

## Motion

- Motion should feel like a restrained rubber snap: move slightly past the final position once, then settle.
- Use the rubber snap for page entry, dialog entry, expandable content, row reorder, reward feedback, and pressed release.
- Keep the overshoot small in source units: usually `1px` to `2px`, or about `1.02x` scale.
- Keep normal UI motion at or under `250ms`; longer reward flyouts may persist, but their snap happens early.
- Do not add looping bounce, decorative wobble, or motion that fights readability.
- Preserve `prefers-reduced-motion` by removing or shortening nonessential movement.

## Inventory Visibility

- Dedicated info inventories for seeds, herbs, and potions show the category catalog.
- Brewing potions, Brewing herbs, Garden herbs, choose-seed, sell, and other action/use panels are not catalog info views; hide locked zero-count items there.
- Current balance catalog rows are known item types by default; do not scramble normal seed, herb, or potion names just because their research is incomplete.
- Owned items always show real name and real count.
- Unlocked/researched items with count `0` show real name, `0`, disabled gray text.
- Known but locked/unresearched items with count `0` show real name, `locked`, disabled gray text.
- Unknown item types must be explicitly marked unknown, and with count `0` show a same-length fixed scrambled ASCII name, `locked`, disabled gray text.
- Owned unknown item types use real name and real count while count is above `0`; if count returns to `0`, they become unknown again.
- Action and choice lists only show unlocked/researched or owned items. Hide locked unknown and locked known `0` count items from pickers and use boxes.

## Layout

- Use fixed authored game dimensions, scaled by the viewport layer.
- Keep the authored layout mobile-first at Root Run's `390x844` logical resolution.
- Scale source UI directly by the Root Run-style contain-fit viewport scale, including desktop upscaling, so both web and mobile views fit.
- Do not copy reference-image pixel dimensions; author at the fixed Root Run `390x844` logical surface.
- Keep future page UI organized around one dominant illustrated landmark with compact supporting panels and actions.
- Show all five room page icons in the bottom panel. Render each tab with the shared midnight top-cap nine-slice at `83 91 73 1`; inactive tabs use the dark cap and the selected tab uses the lighter cap. Fill the source width and keep an `8px` source safe gap below the complete frames. Keep unlocked icons at full color and opacity in every state, with non-selected icons rendered at `1.5x` their base artwork size. Selecting a tab applies its existing selected-icon treatment while lifting it `12px` into the raised active frame. Keep every tab at the same font weight; the selected tab shows its white Title Case page name while inactive tabs remain icon-only. Locked tabs replace the room icon with a larger lock centered lower in the inactive frame.
- Keep category tabs and paired actions balanced within their approved image-backed strip or panel.
- Reuse documented UI motifs from `docs/ui-patterns.md` before creating a new row, box, popup, tab, or border label treatment.
- Use illustrations, icons, textures, gradients, rounded silhouettes, and shadows only through approved shared skins or purposeful room/item art. Avoid generic cards, arbitrary glow, and decoration without a gameplay role.
