# UI Patterns

Use this file to record repeated interface choices. Before adding new UI, check for a similar pattern here and reuse it.

## Box Construction

- Ordinary room boxes use `1px` black borders, compact padding, and no shadow.
- Box titles sit embedded over the top border on the white surface.
- Secondary border labels, such as counts, close/current controls, actions, and tabs, use smaller normal-weight text centered on the border line.
- Popup/dialog boxes use the thicker dialog treatment: `2px` border, `20px` padding, and bottom-right shadow.

## Numbered Rows

- Numbered game rows use a narrow left number cell, written as `1.`, `2.`, etc.
- Main item/content text sits in the middle.
- Price, status, timer, or action sits right-aligned in one fixed right slot.
- Do not write row type words such as `stand 1` when the surrounding box already gives the type.
- Market stand rows, player request rows, and garden plot rows should follow this same left-number, middle-content, right-action rhythm.

## Inline Row Actions

- Row actions are text controls on the line, not separate decorative cards.
- Buy/place/claim prices stay right-aligned and use tabular numerals.
- Disabled or locked right-side actions use muted text and keep the same row height as enabled rows.

## Popup Structure

- Dialog titles are embedded border titles.
- Close controls sit as normal-weight border labels, not boxed inner buttons.
- Tabbed popups put tabs below and outside the bordered dialog, with the same stroke as the popup.
- Popup rows should keep stable DOM nodes during snapshot updates so mobile taps do not miss after touchend.
