# Retained Pixi first-run intro

`createFirstRunIntroPixiView()` constructs the complete cutscene display tree
once. Attach its root to the shared `interactionLocks` layer, apply the current
theme/projection, and activate it through the retained lifecycle. The view
never reads storage, gameplay state, CSS, or DOM geometry.

The presentation-only `createFirstRunIntroPixiPresenter({ view })` preserves
the current four frozen story beats and transition timing. The existing
`FirstRunIntroFacade` remains responsible for deciding whether the intro is
eligible and for persisting completion.

The view-model contract is:

```js
{
  visible: true,
  id: 'castle',
  scene: 'castle', // castle | defeated | peace | workshop
  text: "One last battle at the demon lord's keep.",
  actionLabel: 'Next',
  actionEnabled: true,
  reducedMotion: false,
  actions: { advance() {} },
}
```

All four image IDs in `FIRST_RUN_INTRO_PIXI_ASSETS` are required preloaded
assets. Missing art is a construction error rather than a visual fallback.

For visual QA, open `/?devUi=firstRunIntro`. The preview uses this retained
surface without changing first-run progress.
