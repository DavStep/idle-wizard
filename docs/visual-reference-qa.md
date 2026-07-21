# Visual Reference QA

Use this gate whenever a UI request includes a screenshot, mockup, composition reference, or phrases such as `match this`, `like this`, `pixel accurate`, or `composition accuracy`.

Automated tests prove behavior and invariants; they do not prove visual fidelity. A full-screen thumbnail is also insufficient because scaling hides small baseline and optical-centering errors.

## 1. Write the reference contract before editing

Record the target viewport, exact UI state, and comparison crop. List the visible relationships that define success instead of only naming components.

At minimum, inspect:

- Text and icon optical centers, not only CSS line boxes.
- Text baselines and the gap between value and icon.
- Text centered against the visible alpha bounds of illustrated badges, not the image canvas.
- Art edges that intentionally touch a panel edge, such as an avatar grounded on the bottom border.
- Progress rail outer stroke, inner track, fill height, fill end cap, divider count/positions, and caption alignment.
- Whether supporting copy participates in centering or hangs below a primary control; matching the wrong layout box can shift an otherwise correct control.
- Relative proportions: avatar, badge, rail, text, padding, and whitespace.

Use source UI units where possible. At the normal `3x` room scale, a `3px` screenshot error is a `1px` source error.

## 2. Make the target state reproducible

Open the state through the real app using a checked-in `?devUi=<surface>`, `cheats.openUi(...)`, data template, tutorial loader, or focused harness. Add the smallest reusable recipe when one does not exist.

Do not use temporary source edits, hidden query branches, one-off DOM mutation, or undocumented local storage as final screenshot setup. If another agent cannot reopen the same state from one documented command, the evidence is not reproducible.

## 3. Capture at two altitudes

Capture the full authored `1080x2170` surface and a fitted desktop viewport for collision/reflow checks. Also capture a native-pixel close crop of the changed surface. Inspect the close crop at `100%`; do not approve it from a scaled chat thumbnail.

Use the same content/state as the reference when state changes geometry. Freeze animations before comparing a resting layout.

## 4. Build a comparison artifact

Generate a side-by-side and overlay review:

```sh
npm run ui:compare -- \
  --reference /path/to/reference.png \
  --actual /path/to/actual.png \
  --reference-crop x,y,width,height \
  --actual-crop x,y,width,height \
  --out tmp/ui-reference-review.html
```

Open the HTML locally and inspect both the opacity overlay and difference blend. Crop each image to the same semantic surface even when the source screenshots have different dimensions.

## 5. Record the parity verdict

For every contract item, record `match`, `mismatch`, or `not measurable`, with a short observation. Any requested relationship still marked `mismatch` means `FIX REQUIRED`. Missing close-crop or comparison evidence means `INCONCLUSIVE`, not `PASS`.

Static CSS assertions may guard tokens and structure, but visual bugs also need one of:

- DOM geometry assertions against an explicit relationship.
- Asset visible-bounds/alpha-bounds validation.
- A retained baseline screenshot or comparison artifact.
- A manual parity checklist tied to the exact reference crop when automation would mislead.

## Handoff evidence

Include the exact state-opening command, viewport, actual close crop, comparison artifact path, and remaining mismatches. Do not claim `matches the reference` merely because tests, lint, or build are green.
