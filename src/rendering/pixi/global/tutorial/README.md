# Retained Pixi tutorial UI

`createTutorialPixiOverlay()` constructs Elara, the objective/lesson surface,
the spotlight, the pointer host, and every input registration once. Attach its
root to the shared `tutorial` layer. The overlay resolves targets only through
`SemanticTargetRegistry`; it never accepts selectors, DOM nodes, computed
styles, or `data-*` geometry.

The presenter shape mirrors `TutorialFacade`:

```js
{
  kind: 'lesson', // hidden | blocked | quest | lesson
  revealTokens: ['top', 'mana'],
  step: {
    id: 'mana-intro',
    targetId: 'top:mana',
    highlightTargetIds: ['top:mana:value', 'top:mana:regen'],
  },
  lesson: {
    id: 'mana-intro',
    title: 'lesson',
    text: '...',
    stepLabel: '1 / 8',
    progress: 0.125,
    progressLabel: '',
    attention: true,
    autoOpen: true,
    forceOpen: false,
    advanceOnClick: true,
    advanceLabel: 'next',
    canShowTarget: true,
    variant: null, // or intro-dialog
    dimBackdrop: true,
  },
  cue: {
    kind: 'target-cue',
    targetId: 'top:mana',
    showPointer: true,
    emphasizeTarget: true,
  },
  protectedTargetIds: ['top.panel', 'bottom.navigation'],
  reducedMotion: false,
  actions: {
    advance() {},
    objectivePress({ source, targetId }) {},
    lessonPanelClose() {},
    guideMoved({ buttonLeft, buttonTop }) {},
    applyNotificationPolicy(policy) {},
  },
}
```

`createTutorialPixiViewModel(facadeState, { actions })` adapts the existing
facade state and deliberately drops legacy DOM target objects.
`overlay.isLessonPanelOpen()` is the public panel-state query used when the
existing tutorial logic computes its next view state.
Seed persisted Elara position once with
`overlay.setGuidePlacement(guideDragManager.getPlacement())`; route the
`guideMoved(placement)` action back to that renderer-neutral manager.

`TutorialRevealController` uses explicit registrations:

```js
reveal.register('mana', {
  objects: [manaRoot],
  interactiveObjects: [manaRoot],
});
```

Calling `apply(tokens)` hides unrevealed registered groups and reveals newly
added groups with the current 4px/opacity transition. `restore()` returns every
object to its captured pre-tutorial state.

`TutorialPointerSpine` loads `tutorial:pointer` once through
`SpineRuntimeFacade`, attaches it inside the existing Pixi tree with
`layer: null`, and manually updates it only while the retained overlay is
active, visible, and motion-enabled. It never creates another canvas.
Preflight/golden setup should `await overlay.whenPointerReady()`; load failures
reject that promise so a missing skeleton or atlas cannot silently become a
fallback visual.
