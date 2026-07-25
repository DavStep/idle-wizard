# Production Pixi UI Guard

Run:

```sh
npm run check:production-ui
```

The command performs an in-memory Vite build in `production` mode using the
real root `index.html`, environment, config, aliases, transforms, static
imports, and emitted dynamic chunks. It scans only local JavaScript modules
that Vite actually renders into those chunks. Unreachable legacy pages, tests,
fixtures, and development modules eliminated by production tree-shaking are
not scanned.

The guard requires:

- Exactly one authored `<canvas id="...">` in the production HTML body.
- Exactly one external `type="module"` entry script.
- No other authored body elements.
- Only the emitted entry module may find the host canvas, using
  `querySelector("#<canvas-id>")`, `querySelector("canvas#<canvas-id>")`, or
  `getElementById("<canvas-id>")`.
- No production module may create DOM elements, inputs, forms, selects,
  textareas, document fragments, ranges, text nodes, or another canvas.
- No production module may use DOM queries, computed styles,
  `MutationObserver`, HTML injection, `HTMLCanvasElement`, or
  `OffscreenCanvas`.

## Explicit exceptions

Exceptions are source-controlled in `check-production-ui.mjs` and reported
when encountered:

- `AuthOidcManager.js` may find/create only the Google Identity Services
  `<script>`.
- `AuthMobileRedirectBridgeManager.js` may render only its external-browser
  callback bridge with the listed tags and `#app` query.
- Emitted files under `src/dev/` are marked as explicit development
  exceptions. Production release configuration must keep the corresponding
  `VITE_*` flags disabled so those chunks are normally absent.

Restricted input/form/select/textarea/canvas construction is never covered by
the auth exceptions.

## Atomic-cutover assumption

During the retained Pixi migration, the current DOM entry graph is expected to
fail this command. The command becomes a mandatory release/build gate only
when `index.html` authors the single canvas and the production entry stops
importing the legacy DOM application graph. Do not weaken the allowlist to
make the pre-cutover application pass; unreachable legacy files naturally
leave scope when the production imports are removed.

Focused regression coverage:

```sh
npx vitest run scripts/check-production-ui.test.js
```

The integration fixture proves that an unreachable file containing
`document.createElement("input")` is ignored, while the same file fails as
soon as it is imported by the production entry.
