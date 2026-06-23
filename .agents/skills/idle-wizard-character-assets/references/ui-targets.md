# Character UI Targets

Use this when validating crop/readability.

## Shared Player Avatars

Source files:

- `src/assets/characters/*.png`

Main consumers:

- top panel avatar: `58x58`, `object-fit: cover`, `object-position: 50% 13%`
- settings character option: `72x72`, `object-fit: cover`, `object-position: 50% 52%`
- player info dialog: `72x72`, `object-fit: cover`, `object-position: 50% 28%`
- inline generic icon: `18x18`, `object-fit: cover`, `object-position: 50% 13%`
- leaderboard icon: `16x16`, same shared icon crop
- world chat icon: `12x12`, same shared icon crop

QA must confirm:

- face still reads at `18x18`, `16x16`, and `12x12`
- top hat or hair is not cropped badly in `50% 13%` top-panel crop
- settings crop still shows the main identity read
- player info crop does not cut off the face

## Workshop Feature Portraits

Source files:

- `src/pages/workshop/assets/characters/*.png`
- `src/pages/workshop/assets/characters/*.webp`

Current source size is `864x1080` for PNG originals. These are page-local feature portraits, not selectable player avatars.

Main consumers:

- side button character: about `45.5x59.15`, object-position center bottom
- world notice dialog portrait: `64x80`, object-position center bottom

Do not force feature portraits to `173x216` unless the user asks to convert them into shared player avatars.
