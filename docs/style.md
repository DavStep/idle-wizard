# STYLE

Canonical reference: A Dark Room by Doublespeak Games, `https://adarkroom.doublespeakgames.com/`.

This project should use the same kind of minimal text-game language, without copying its implementation.

## Core Feel

- Plain black text on a white page.
- Use browser-simple layout, not decorative game art.
- The interface should feel like a sparse text game with small bordered panels.
- Prefer empty space, direct labels, and restrained hierarchy.

## Typography

- Font family: `"Source Serif 4", Charter, "Iowan Old Style", "Noto Serif", Georgia, serif`.
- Source UI font size: `15px`.
- Popup/dialog title font size stays `16px`.
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

- Ordinary non-dialog boxes use `1px solid black`.
- No border radius.
- Ordinary box padding follows A Dark Room's stores spacing: `5px 10px` in source UI units.
- Box titles sit over the top border on white background, like A Dark Room's simple store boxes.
- Do not put a separate heading inside a box when the label belongs in the border.
- Popup/dialog panels may use `2px solid black`, `20px` padding, and a bottom-right gray shadow: `5px 5px 5px #666` in source UI units.
- Tooltips may use `1px solid black`, white background, and a small offset gray shadow.
- Ordinary room/page surfaces should not use shadows.

## Buttons

- Buttons are small bordered text boxes.
- Center label text.
- Native buttons must be reset to look like text boxes, not platform controls.
- Hover state is underline only.
- Disabled state changes text and border to gray and removes underline.
- Cooldown/progress fills, if added later, should be flat light gray.

## Layout

- Use fixed authored game dimensions, scaled by the viewport layer.
- Keep the authored layout mobile-first at `1080x2170`.
- Scale source UI by `3 * viewport-scale`, clamped at the authored viewport, so both web and mobile views fit.
- Do not copy A Dark Room's desktop `700px` layout dimensions.
- Keep future page UI as sparse panels positioned inside the room view.
- Show the current page name at the bottom center of the room view.
- Avoid gradients, textures, illustrations, icons, rounded cards, and decorative shadows.
