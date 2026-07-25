# Retained Pixi input

`PixiInputRouter` is the only production interaction listener for retained
Pixi UI. It installs one handler set on the Pixi root and one keyboard /
clipboard handler set on the existing focusable canvas. Registering, updating,
or unregistering controls never installs another event listener.

The router arbitrates interactions in this order:

1. A shared two-pointer pinch surface owns both pointers.
2. A drag source owns movement after its threshold.
3. Clear vertical intent chooses the nearest masked scroll region.
4. Clear horizontal intent chooses a nested pan surface, otherwise page swipe.
5. A press activates only when release remains on its original target and
   movement stays inside its configured slop.

World pan, drag, pinch, explicit `excludePageSwipe`, and the top modal block
page navigation. Scroll and page swipe intentionally coexist: vertical intent
scrolls while horizontal intent changes rooms.

```js
const router = new PixiInputRouter({
  hapticsFacade,
  uiClickSoundFacade,
});
router.mount({ root: app.stage, canvas: app.canvas });

const summonInput = router.registerPressTarget({
  id: 'workshop.summon',
  displayObject: summonButton,
  onPressChange: (pressed) => summonButton.setPressed(pressed),
  onActivate: () => actions.summon(),
});

const listInput = router.registerScrollRegion({
  id: 'research.list',
  displayObject: maskedViewport,
  getOffset: () => list.offset,
  getMaxOffset: () => list.maxOffset,
  onScroll: (offset) => list.setOffset(offset),
});

summonInput.update({ enabled: false });
listInput.unregister();
```

The Pixi scroll primitive owns its `mask` and applies the offset supplied to
`onScroll`; the router owns pointer/wheel arbitration and clamps offsets to
`0..getMaxOffset()`. Drag sources return their payload from `onDragStart`;
matching drop targets may reject it with `accepts` or `onDrop === false`.
`onPan` receives total and per-event global/screen deltas. Pinch callbacks
receive stable pointer ids, center points, absolute scale, and delta scale.
Page swipes receive `next` or `previous` only after their release threshold
and horizontal-axis ratio pass.

Haptic and click sound feedback run only after `onActivate` confirms by
returning anything except `false` (or resolving a promise to anything except
`false`). Touch activation gets the subtle app haptic; mouse and keyboard
activation get click sound only. Disabled, selected, dragged, cancelled, and
retargeted presses remain silent.

Use `pushModal()` / `popModal()` for modal ownership, `focus()` / `moveFocus()`
for semantic keyboard focus, and `handleBack({ source: 'native' })` from the
Android back bridge. Clipboard callbacks belong to the focused press
registration. The package creates no DOM nodes and performs no DOM queries.
