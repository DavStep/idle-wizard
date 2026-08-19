# UI Pattern Router

Use this compact router before UI work. `docs/ui-patterns.md` remains the
authoritative contract catalogue, but ordinary tasks should read only the
matching section or named widget entry instead of loading the entire catalogue.

## Classify the change

- `reuse`: existing widget and contract, with feature data or copy only.
- `extension`: existing widget contract with feature-local composition or state.
- `new widget`: new primitive, compound component, interaction, scroll behavior,
  box/dialog type, or a variant that changes an existing contract.

For `reuse` and `extension`, locate the nearest entry with:

```sh
rg -n "<widget-or-surface>|^## " docs/ui-patterns.md
```

Read the matching entry and its surrounding section. Read the complete catalogue
only for a catalogue-wide audit, migration, or when no closest pattern can be
identified from the router.

## Routes

| Surface | Authoritative section or entry |
| --- | --- |
| UI Lab, editor previews, thumbnails, hierarchy, inspector, assets, nine-slices | `Current Library` and `UI Lab Production Coverage` |
| Ordinary panels, scroll panes, room chrome | `Box Construction` and the named `style-box` / managed-scroll entries |
| Rows and row actions | `Numbered Rows` and `Inline Row Actions` |
| Guild Chronicle messages | named `Guild Chronicle Feed` entry in `Current Library` |
| Info, lock, and check controls | `Info Buttons`, `Lock Icons`, and `Checkmark Icons` |
| Settings fields, toggles, sliders, and device panels | `Root Run Settings Controls` |
| Inventory selection and allocation | `Stall Allocation Lists` |
| Progress and timer rails | `Progress Rails` |
| Bottom room navigation and alternate HUD category tabs | named `Bottom room tab` / `Bottom HUD Text Tab` entries in `Current Library` |
| Expand/collapse behavior | `Expandable Boxes` |
| Dialog shells, tabs, scrolling, and close controls | `Popup Structure` |

## Verification route

- Existing feature-local widget use: focused test, `npm run check:ui`, and one
  authored `390x844` screenshot when pixels changed.
- New or changed shared widget contract: standalone production-backed UI Lab
  entry, focused tests, authored and fitted screenshots, and a native-pixel crop.
- Reference matching: also follow `docs/visual-reference-qa.md` and run
  `npm run ui:compare`.
- Repository-wide UI Lab completeness belongs to an explicit coverage migration
  or release audit. Do not expand an unrelated feature task into legacy catalogue
  backfill.
