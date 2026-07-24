# STYLE

Canonical reference: A Dark Room by Doublespeak Games, `https://adarkroom.doublespeakgames.com/`.

This project should use the same kind of minimal text-game language, without copying its implementation.

## Core Feel

- Plain high-contrast text on a midnight page by default.
- Use browser-simple layout, not decorative game art.
- The interface should feel like a sparse text game with small bordered panels.
- Prefer empty space, direct labels, and restrained hierarchy.
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
- Resource and currency text inherits the surrounding theme or state color. Currency displays still keep the icon, amount, and currency word together; potion, seed, herb, mana, coin, crystal, emerald, and ruby text do not receive category colors.
- The page background may use the explicit mild bottom-to-top room identity gradient; boxes, buttons, and labels stay on the normal surface. Default dialogs use the dedicated Root Run composition below.

## Boxes

- Selectable themes use `2px` ordinary borders.
- Standard inner sections (`style-box`) and the persistent top player panel use the shared Root Run shop-tile nine-slice, recolored per selectable theme. Preserve its qUIck slice margins at the Root Run `390 / 1080` design scale and keep the theme's exact center-sample color as the rounded underlay; the underlay only closes fractional raster gaps and must not replace or square off the transparent frame corners. Keep other outer panels, dialogs, controls, tutorial surfaces, and feature-owned paper art on their dedicated chrome.
- Do not add standalone CSS rounding to ordinary boxes; the shared qUIck frame's radius exists only to clip its seam-closing underlay to the raster silhouette.
- Ordinary box padding follows A Dark Room's stores spacing: `5px 10px` in source UI units.
- Box titles sit transparently over the top border, without a surface-colored backplate.
- Box titles use the shared surface-colored text stroke so the border can remain visible behind the glyphs without adding a title background.
- Do not put a separate heading inside a box when the label belongs in the border.
- Non-title labels that sit on a box border, such as counts, current controls, bottom-edge actions, and tabs, should use smaller text with the line box centered on the border line.
- Default player-facing popup/dialog panels use the Root Run backpack composition: `dialog-back-compact.png` as the brown outer nine-slice, the existing Research `research-card-1000x304.png` as the cream paper content nine-slice, `dialog-title-compact.png` as a separate centered title plate, and `close-button.png` as the round top-right dismiss control. Keep the close control overlapping the corner without letting it clip outside the `390px` authored surface. Render the assets through Pixi `NineSliceSprite`/`Sprite` in mirrored room UI, with CSS border-image/image fallbacks for non-mirrored dialogs.
- Keep `20px` source content padding inside the paper. The brown frame and its compact bottom-right shadow sit outside that content box; do not add a second themed border or rectangular dialog fill.
- Dialog text uses the paper palette (`#634934` ink on `#ffe7c8`), independent of the selected room theme. Dialog titles use white text with the shared dark outline on the cream title plate.
- Boot, connection, account, and deploy blockers use `style-dialog--system` and retain the compact system-panel treatment. The first-run intro and explicitly feature-skinned panels also remain exceptions; do not stack the shared player-dialog skin over those surfaces.
- Tabbed dialogs use a fixed panel height. If tab content is taller than that height, keep the bottom tabs fixed and scroll only the content viewport.
- Every true tab button uses the shared selected-tab state. Text tabs use the very-dark Root Run brown button skin when deselected and the lighter brown skin when selected; the five bottom room icon tabs keep their dedicated raised active-tab skin. Previous/next pagers are ordinary navigation buttons, not tabs.
- Every managed scroll panel uses the single `style-page-scroll` primitive, including room pages, dialogs, popups, and bounded lists. It owns the complete Root Run station-panel model: wheel and pointer drag share progressive asymmetric edge resistance, release inertia, elastic top/bottom limits, and fast station spring return. The thumb compresses against either overscrolled edge. Preserve the `6.5px` vertical track with `4.333333px` block inset, translucent `#17100c` fill, and 72%-alpha black outline; the proportional thumb uses `#f2ae54`, a `#5e321b` outline, and a `29.611111px` minimum height. Keep it on the right edge of the actual viewport, visible only when content overflows. Do not append a horizontal progress rail below scroll content.
- Tooltips follow the active theme's ordinary border width, active surface, and a small offset gray shadow.
- Ordinary room/page surfaces should not use shadows.

## Buttons

- Buttons are small bordered text boxes.
- Center label text.
- Every visible button label uses a text stroke chosen by the shared button style for contrast; keep the stroke in normal, selected, pressed, and disabled states instead of adding feature-local outline values.
- Native buttons must be reset to look like text boxes, not platform controls.
- Workshop HUD control labels stay lowercase, including `summon seed`, `bag`, and `stats`, matching the side-panel button labels.
- Standalone info/help buttons use the shared Root Run `prop_info.png` asset through `setInfoButtonIcon`; never render `[i]`, `?`, or a letter glyph as the visible icon.
- Visible lock iconography uses the shared `prop_lock.png` asset through `createStatusIcon(..., STATUS_ICON_LOCK)`; never draw a lock in CSS or substitute another image, Unicode symbol, or font glyph.
- Visible checkmark iconography uses the shared `prop_checkmark.png` asset through `createStatusIcon(..., STATUS_ICON_CHECK)`; never draw a checkmark in CSS or substitute another image, Unicode symbol, native checkbox mark, or font glyph.
- Do not define mouse-hover states or hover-only behavior.
- Press/active state must not change the background color.
- Disabled state changes text and border to gray and keeps normal weight.
- Shared progress rails use the compact Root Rush capsule: a 10px source-height black track with a 1px border and inset rim. Purple is the default fill, Brewing uses blue, Garden uses green, and Market/Research use yellow. The top-panel quest rail alone keeps the original 14px height.

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
- Do not copy A Dark Room's desktop `700px` layout dimensions.
- Keep future page UI as sparse panels positioned inside the room view.
- Show all five room page icons in the bottom panel. Use the copied Root Run station-tab active/inactive nine-slice assets, extended below the authored screen edge so no bottom gap can appear. Keep every tab at the same font weight; the selected tab rises 10 source pixels, enlarges its icon, and shows its page name while inactive tabs remain icon-only.
- Keep bottom-border category tabs and paired actions edge-weighted: first left, middle centered, last right, with the border line visible between labels.
- Reuse documented UI motifs from `docs/ui-patterns.md` before creating a new row, box, popup, tab, or border label treatment.
- Avoid gradients, textures, illustrations, decorative icons, rounded cards, and decorative shadows outside the explicitly approved Root Run dialog and feature skins.
