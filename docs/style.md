# STYLE

Canonical reference: A Dark Room by Doublespeak Games, `https://adarkroom.doublespeakgames.com/`.

This project should use the same kind of minimal text-game language, without copying its implementation.

## Core Feel

- Plain black text on a white page.
- Use browser-simple layout, not decorative game art.
- The interface should feel like a sparse text game with small bordered panels.
- Prefer empty space, direct labels, and restrained hierarchy.
- Use lowercase for player-facing UI labels, including item, research, notice, and task text; keep user-entered names as typed.

## Typography

- Default font family: `Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Source UI font size: `13px`.
- Popup/dialog title font size stays `14px`.
- Mobile readability comes from the room UI scale layer, not from changing the source font size.
- Normal font weight by default.
- Normal line height and normal letter spacing.
- Use tabular lining numerals for resource values, costs, counts, timers, and leaderboard numbers.
- Use bold only for totals, section names, or strong resource values.
- Use underline for selected or hover states.

## Color

- Primary text: black.
- Page and surface: white.
- Disabled/secondary text and borders: medium gray.
- No colored UI unless the user explicitly asks for it.

## Boxes

- Ordinary non-dialog boxes use `2px solid black`.
- No border radius.
- Ordinary box padding follows A Dark Room's stores spacing: `5px 10px` in source UI units.
- Box titles sit over the top border on white background, like A Dark Room's simple store boxes.
- Do not put a separate heading inside a box when the label belongs in the border.
- Non-title labels that sit on a box border, such as counts, close/current controls, bottom-edge actions, and tabs, should use smaller text with the line box centered on the border line.
- Popup/dialog panels may use `2px solid black`, `20px` padding, and a bottom-right gray shadow: `5px 5px 5px #666` in source UI units.
- Theme popup/dialog shadows should stay visible by contrasting with the active surface: dark on white, light on black.
- Tabbed dialogs use a fixed panel height. If tab content is taller than that height, keep the bottom tabs fixed and scroll the content with the shared scroll cue.
- Shared scroll progress rails use the logs dialog pattern: a separate `style-progress` rail below the scroll frame, never over the last row.
- Tooltips may use `2px solid black`, white background, and a small offset gray shadow.
- Ordinary room/page surfaces should not use shadows.

## Buttons

- Buttons are small bordered text boxes.
- Center label text.
- Native buttons must be reset to look like text boxes, not platform controls.
- Hover state is underline only.
- Disabled state changes text and border to gray and removes underline.
- Cooldown/progress fills, if added later, should be flat light gray.

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
- Keep the authored layout mobile-first at `1080x2170`.
- Scale source UI by `3 * viewport-scale`, clamped at the authored viewport, so both web and mobile views fit.
- Do not copy A Dark Room's desktop `700px` layout dimensions.
- Keep future page UI as sparse panels positioned inside the room view.
- Show all five room page names in the bottom panel and underline the current page tab.
- Keep bottom-border category tabs and paired actions edge-weighted: first left, middle centered, last right, with the border line visible between labels.
- Reuse documented UI motifs from `docs/ui-patterns.md` before creating a new row, box, popup, tab, or border label treatment.
- Avoid gradients, textures, illustrations, icons, rounded cards, and decorative shadows.
