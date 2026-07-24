// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  RootRunUiRendererManager,
  extractCssUrls,
  parseLinearGradient,
  parseBorderImageSlice,
  parseBorderImageWidths,
  resolveNineSliceScale,
  resolvePseudoRect,
} from './RootRunUiRendererManager.js';

describe('RootRunUiRendererManager geometry', () => {
  it('reads every CSS texture URL used by background and border-image chrome', () => {
    expect(
      extractCssUrls(
        'url("/ui/frame.png"), linear-gradient(#000, #fff), url(#local-mask), url(/ui/icon.png)',
      ),
    ).toEqual(['/ui/frame.png', '/ui/icon.png']);
  });

  it('keeps exported CSS slice order as Pixi left/top/right/bottom margins', () => {
    expect(parseBorderImageSlice('123 132 79 53 fill', 186, 203)).toEqual({
      top: 123,
      right: 132,
      bottom: 79,
      left: 53,
    });
  });

  it('reconstructs Root Run compose-then-scale geometry from border widths', () => {
    const authoredScale = 390 / 1080;
    const slice = {
      top: 123,
      right: 132,
      bottom: 79,
      left: 53,
    };
    const widths = parseBorderImageWidths(
      `${123 * authoredScale}px ${132 * authoredScale}px ${79 * authoredScale}px ${53 * authoredScale}px`,
      { top: 0, right: 0, bottom: 0, left: 0 },
      { width: 320, height: 240 },
    );

    expect(
      resolveNineSliceScale({
        slice,
        widths,
        rect: { width: 320, height: 240 },
      }),
    ).toEqual({
      x: expect.closeTo(authoredScale),
      y: expect.closeTo(authoredScale),
    });
  });

  it('places inset pseudo chrome in the same logical coordinate space', () => {
    expect(
      resolvePseudoRect({
        style: {
          top: '-10px',
          right: '-10px',
          bottom: '-10px',
          left: '-10px',
          width: 'auto',
          height: 'auto',
        },
        parentRect: { x: 40, y: 80, width: 300, height: 200 },
      }),
    ).toEqual({
      x: 30,
      y: 70,
      width: 320,
      height: 220,
    });
  });

  it('converts CSS linear gradients into retained local Pixi stops', () => {
    expect(
      parseLinearGradient(
        'linear-gradient(0deg, rgb(10, 20, 30) 0%, rgb(40, 50, 60) 100%)',
      ),
    ).toMatchObject({
      start: { x: 0.5, y: 1 },
      end: { x: 0.5, y: 0 },
      colorStops: [
        { offset: 0, color: '#0a141eff' },
        { offset: 1, color: '#28323cff' },
      ],
    });
  });
});

describe('RootRunUiRendererManager retained scene', () => {
  it('retains Pixi records while a cached page is detached', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const child = document.createElement('button');
    const canvas = document.createElement('canvas');
    root.append(child);
    stage.append(root, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });
    const rootRecord = manager.ensureElementRecord(root);
    const childRecord = manager.ensureElementRecord(child);
    const cache = document.createDocumentFragment();

    root.dataset.pageCacheState = 'inactive';
    cache.append(root);
    manager.recycleDetachedRecords();
    manager.cleanupUnusedRecords();

    expect(manager.records.get(root)).toBe(rootRecord);
    expect(manager.records.get(child)).toBe(childRecord);
    expect(manager.getWidgetPoolStats().released).toBe(0);

    root.dataset.pageCacheState = 'active';
    stage.prepend(root);
    expect(manager.ensureElementRecord(root)).toBe(rootRecord);
    expect(manager.ensureElementRecord(child)).toBe(childRecord);
  });

  it('tracks CSS motion without scheduling a full scene refresh per event', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const canvas = document.createElement('canvas');
    stage.append(root, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
      requestFrame: vi.fn(() => 1),
    });
    const refresh = vi.spyOn(manager, 'scheduleRefresh');

    manager.handleAnimationStart({ target: root });
    manager.handleAnimationEnd({ target: root });

    expect(manager.animatedElements.has(root)).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('requests one full reconciliation after the final CSS animation drains', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const canvas = document.createElement('canvas');
    stage.append(root, canvas);
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    stage.getAnimations = () => [];
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });
    const refresh = vi.spyOn(manager, 'scheduleRefresh');
    manager.animatedElements.add(root);

    manager.refreshAnimatedElements();

    expect(manager.animatedElements.size).toBe(0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not stall a root on lazy images inside hidden descendants', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const hiddenPanel = document.createElement('section');
    const lazyImage = document.createElement('img');
    const canvas = document.createElement('canvas');
    hiddenPanel.hidden = true;
    lazyImage.loading = 'lazy';
    Object.defineProperties(lazyImage, {
      complete: { value: false },
      naturalWidth: { value: 0 },
    });
    hiddenPanel.append(lazyImage);
    root.append(hiddenPanel);
    stage.append(root, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });

    await expect(manager.waitForRootImages(root)).resolves.toBe(true);
  });

  it('waits for a displayed image and then settles from its load event', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const image = document.createElement('img');
    const canvas = document.createElement('canvas');
    let complete = false;
    let naturalWidth = 0;
    Object.defineProperties(image, {
      complete: { get: () => complete },
      naturalWidth: { get: () => naturalWidth },
    });
    root.append(image);
    stage.append(root, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });
    let settled = false;
    const imagesReady = manager.waitForRootImages(root).then((ready) => {
      settled = true;
      return ready;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    complete = true;
    naturalWidth = 64;
    image.dispatchEvent(new window.Event('load'));

    await expect(imagesReady).resolves.toBe(true);
  });

  it('ignores ordinary focusout events outside native text fallback', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const root = document.createElement('article');
    const button = document.createElement('button');
    const canvas = document.createElement('canvas');
    root.append(button);
    stage.append(root, canvas);
    setRect(stage, { left: 0, top: 0, width: 390, height: 844 });
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    setRect(root, { left: 0, top: 0, width: 390, height: 844 });
    setRect(button, { left: 20, top: 20, width: 100, height: 40 });
    const layers = {
      background: new runtime.Container(),
      ui: new runtime.Container(),
      popup: new runtime.Container(),
      overlay: new runtime.Container(),
    };
    const requestedFrames = [];
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers,
      runtime,
      getComputedStyle: () => makeStyle(),
      requestFrame: (callback) => {
        requestedFrames.push(callback);
        return requestedFrames.length;
      },
      cancelFrame: vi.fn(),
    });

    await manager.mount();
    expect(stage.dataset.rootRunUiRenderer).toBe('ready');

    manager.handleFocusOut();

    expect(requestedFrames).toHaveLength(0);
    expect(stage.dataset.rootRunUiRenderer).toBe('ready');
    expect(layers.ui.children[0].visible).toBe(true);
  });

  it('reconstructs a rotated SVG frame through its scaled ancestor chain', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const scaledLayer = document.createElement('div');
    const scissors = document.createElement('span');
    const frame = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    const canvas = document.createElement('canvas');
    Object.defineProperties(frame, {
      clientWidth: { value: 30 },
      clientHeight: { value: 30 },
    });
    scissors.append(frame);
    scaledLayer.append(scissors);
    stage.append(scaledLayer, canvas);
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    const angle = (-16 * Math.PI) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const frameStyle = makeStyle();
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: (element) => {
        if (element === scaledLayer) {
          return makeStyle({ transform: 'matrix(2, 0, 0, 2, 0, 0)' });
        }
        if (element === scissors) {
          return makeStyle({
            transform: `matrix(${cosine}, ${sine}, ${-sine}, ${cosine}, 0, 0)`,
          });
        }
        return frameStyle;
      },
    });
    manager.canvasRect = canvas.getBoundingClientRect();
    const transformedSize = 60 * (Math.abs(cosine) + Math.abs(sine));

    const placement = manager.getReplacedElementPlacement(
      frame,
      frameStyle,
      {
        x: 100,
        y: 200,
        width: transformedSize,
        height: transformedSize,
      },
    );

    expect(placement.rotation).toBeCloseTo(angle);
    expect(placement.rect.width).toBeCloseTo(60);
    expect(placement.rect.height).toBeCloseTo(60);
    expect(placement.rect.x + placement.rect.width / 2).toBeCloseTo(
      100 + transformedSize / 2,
    );
    expect(placement.rect.y + placement.rect.height / 2).toBeCloseTo(
      200 + transformedSize / 2,
    );
  });

  it('covers arbitrary stage roots, retains display objects, and fails open', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const guild = document.createElement('article');
    const tutorial = document.createElement('section');
    const portrait = document.createElement('div');
    const objective = document.createElement('button');
    const itemDrop = document.createElement('span');
    const canvas = document.createElement('canvas');
    guild.className = 'guild-page';
    tutorial.className = 'tutorial-layer';
    portrait.className = 'tutorial-layer__portrait';
    objective.className = 'tutorial-layer__objective-button';
    itemDrop.className = 'room-item-drop-anchor';
    canvas.className = 'game-canvas';
    setRect(stage, { left: 0, top: 0, width: 390, height: 844 });
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    setRect(guild, { left: 0, top: 0, width: 390, height: 844 });
    setRect(tutorial, { left: 0, top: 0, width: 390, height: 844 });
    setRect(portrait, { left: 20, top: 20, width: 60, height: 60 });
    setRect(objective, { left: 40, top: 40, width: 100, height: 40 });
    setRect(itemDrop, { left: 100, top: 100, width: 10, height: 10 });
    tutorial.append(portrait, objective);
    stage.append(guild, tutorial, itemDrop, canvas);
    const layers = {
      background: new runtime.Container(),
      ui: new runtime.Container(),
      popup: new runtime.Container(),
      overlay: new runtime.Container(),
    };
    let pseudoOpacity = '0.25';
    const getComputedStyle = vi.fn((element, pseudo) => {
      const isPortraitBefore =
        element === portrait && pseudo === '::before';
      return makeStyle({
        backgroundColor:
          !pseudo && element !== canvas
            ? 'rgb(214, 214, 214)'
            : isPortraitBefore
              ? 'rgb(255, 255, 255)'
              : 'transparent',
        content: isPortraitBefore ? '""' : pseudo ? 'none' : '',
        opacity: isPortraitBefore
          ? pseudoOpacity
          : element === tutorial
            ? '0.35'
            : '1',
        zIndex:
          element === itemDrop
            ? '90'
            : element === tutorial
              ? '89'
              : element === portrait
                ? '5'
                : element === objective
                  ? '4'
                  : '1',
      });
    });
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers,
      runtime,
      getComputedStyle,
      requestFrame: (callback) => {
        callback();
        return 1;
      },
      cancelFrame: vi.fn(),
    });

    await manager.mount();

    expect(stage.dataset.rootRunUiRenderer).toBe('ready');
    expect(guild.dataset.rootRunUiRendered).toBe('true');
    expect(tutorial.dataset.rootRunUiRendered).toBe('true');
    const renderedRoots = layers.ui.children[0].children;
    expect(renderedRoots).toContain(manager.records.get(guild).container);
    expect(renderedRoots).toContain(manager.records.get(tutorial).container);
    expect(renderedRoots).toContain(manager.records.get(itemDrop).container);
    expect(renderedRoots.indexOf(manager.records.get(tutorial).container)).toBeLessThan(
      renderedRoots.indexOf(manager.records.get(itemDrop).container),
    );
    expect(manager.records.get(tutorial).container.alpha).toBe(0.35);
    const retainedPseudo =
      manager.records.get(portrait).roles.get('pseudo:before:fill').object;
    expect(retainedPseudo.alpha).toBe(0.25);
    const tutorialContent = manager.records.get(tutorial).content.children;
    expect(
      tutorialContent.indexOf(manager.records.get(objective).container),
    ).toBeLessThan(
      tutorialContent.indexOf(manager.records.get(portrait).container),
    );
    const retainedFill =
      manager.records.get(guild).roles.get('box:fill').object;
    const retainedContainer = manager.records.get(guild).container;

    pseudoOpacity = '1';
    await manager.refresh();

    expect(manager.records.get(guild).container).toBe(retainedContainer);
    expect(manager.records.get(guild).roles.get('box:fill').object).toBe(
      retainedFill,
    );
    expect(
      manager.records.get(portrait).roles.get('pseudo:before:fill').object,
    ).toBe(retainedPseudo);
    expect(retainedPseudo.alpha).toBe(1);

    manager.handleContextLost({ preventDefault: vi.fn() });

    expect(stage.dataset.rootRunUiRenderer).toBe('fallback');
    expect(guild.dataset.rootRunUiRendered).toBeUndefined();
    expect(tutorial.dataset.rootRunUiRendered).toBeUndefined();
    expect(itemDrop.dataset.rootRunUiRendered).toBeUndefined();
    expect(layers.ui.children[0].visible).toBe(false);

    manager.unmount();
    expect(stage.dataset.rootRunUiRenderer).toBeUndefined();
  });

  it('keeps external display objects in a retained slot across refreshes and fallback', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const tutorial = document.createElement('section');
    const pointer = document.createElement('span');
    const canvas = document.createElement('canvas');
    tutorial.className = 'tutorial-layer';
    pointer.className = 'tutorial-layer__pointer';
    canvas.className = 'game-canvas';
    setRect(stage, { left: 0, top: 0, width: 390, height: 844 });
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    setRect(tutorial, { left: 0, top: 0, width: 390, height: 844 });
    setRect(pointer, { left: 100, top: 200, width: 76, height: 90 });
    tutorial.append(pointer);
    stage.append(tutorial, canvas);
    const layers = {
      background: new runtime.Container(),
      ui: new runtime.Container(),
      popup: new runtime.Container(),
      overlay: new runtime.Container(),
    };
    const queuedFrames = [];
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers,
      runtime,
      getComputedStyle: () => makeStyle(),
      requestFrame: (callback) => {
        queuedFrames.push(callback);
        return queuedFrames.length;
      },
      cancelFrame: vi.fn(),
    });

    await manager.mount();

    const fallbackParent = new runtime.Container();
    const external = new runtime.Container();
    fallbackParent.addChild(external);
    manager.attachExternalDisplayObject(pointer, external, { zIndex: 4 });

    const retainedSlot = manager.records.get(pointer).external;
    expect(external.parent).toBe(retainedSlot);
    expect(external.zIndex).toBe(4);
    const addChild = vi.spyOn(retainedSlot, 'addChild');
    const removeChild = vi.spyOn(retainedSlot, 'removeChild');

    await manager.refresh();
    stage.getAnimations = () => [
      {
        playState: 'running',
        effect: { target: pointer },
      },
    ];
    manager.refreshAnimatedElements();
    pointer.hidden = true;
    manager.syncElement(pointer);
    pointer.hidden = false;
    manager.syncElement(pointer);

    expect(external.parent).toBe(retainedSlot);
    expect(addChild).not.toHaveBeenCalled();
    expect(removeChild).not.toHaveBeenCalled();

    manager.failOpen();
    expect(external.parent).toBe(fallbackParent);
    expect(external.destroyed).not.toBe(true);

    manager.failed = false;
    manager.nativeInputFallbackActive = false;
    manager.syncElement(pointer);

    expect(external.parent).toBe(retainedSlot);
    expect(external.destroyed).not.toBe(true);

    manager.unmount();
    expect(external.parent).toBeNull();
    expect(external.destroyed).not.toBe(true);
  });

  it('recycles a widget slot without carrying its external Spine object', async () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const tutorial = document.createElement('section');
    const pointer = document.createElement('span');
    const canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    tutorial.append(pointer);
    stage.append(tutorial, canvas);
    setRect(stage, { left: 0, top: 0, width: 390, height: 844 });
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    setRect(tutorial, { left: 0, top: 0, width: 390, height: 844 });
    setRect(pointer, { left: 100, top: 200, width: 76, height: 90 });
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });

    await manager.mount();
    const oldFallback = new runtime.Container();
    const oldExternal = new runtime.Container();
    oldFallback.addChild(oldExternal);
    manager.attachExternalDisplayObject(pointer, oldExternal);
    const oldRecord = manager.records.get(pointer);

    pointer.remove();
    await manager.refresh();

    expect(oldExternal.parent).toBeNull();
    expect(oldExternal.destroyed).not.toBe(true);
    expect(manager.getWidgetPoolStats().available).toBe(1);

    const replacement = document.createElement('span');
    setRect(replacement, { left: 120, top: 220, width: 76, height: 90 });
    tutorial.append(replacement);
    await manager.refresh();
    const replacementRecord = manager.records.get(replacement);

    expect(replacementRecord).toBe(oldRecord);
    expect(replacementRecord.external.children).not.toContain(oldExternal);
    expect(oldExternal.parent).toBeNull();

    const newFallback = new runtime.Container();
    const newExternal = new runtime.Container();
    newFallback.addChild(newExternal);
    manager.attachExternalDisplayObject(replacement, newExternal);
    expect(newExternal.parent).toBe(replacementRecord.external);

    manager.failOpen();

    expect(oldExternal.parent).toBe(oldFallback);
    expect(newExternal.parent).toBe(newFallback);
    expect(oldExternal.destroyed).not.toBe(true);
    expect(newExternal.destroyed).not.toBe(true);

    manager.unmount();
    expect(oldExternal.destroyed).not.toBe(true);
    expect(newExternal.destroyed).not.toBe(true);
  });

  it('cuts an equivalent 13-widget page swap from 130 display objects and 13 text styles to zero', async () => {
    const withoutPooling = await measureWidgetPageReplacement(0);
    const withPooling = await measureWidgetPageReplacement(128);

    expect(withoutPooling.allocations).toEqual({
      displayObjects: 130,
      textStyles: 13,
    });
    expect(withPooling.allocations).toEqual({
      displayObjects: 0,
      textStyles: 0,
    });
    expect(withPooling.reusedEveryRecord).toBe(true);
    expect(withPooling.stats).toMatchObject({
      active: 13,
      available: 0,
      created: 13,
      reused: 13,
    });
  });

  it('bounds inactive widgets, destroys overflow, and drains the pool on unmount', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const canvas = document.createElement('canvas');
    stage.append(canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      maxPooledWidgets: 2,
      getComputedStyle: () => makeStyle(),
    });
    const elements = Array.from({ length: 3 }, () =>
      document.createElement('div'),
    );
    const records = elements.map((element) =>
      manager.ensureElementRecord(element),
    );
    const roles = records.map((record, index) =>
      manager.ensureRole(record, `box:${index}`, 'graphics', () => {
        return new runtime.Graphics();
      }),
    );
    const oldImageRole = manager.ensureRole(
      records[0],
      'content:image',
      'image:/old-widget.png',
      () => new runtime.Sprite({}),
    );
    const oldImageShadowRole = manager.ensureRole(
      records[0],
      'content:image:dropShadow',
      'spriteShadow',
      () => new runtime.Sprite({}),
    );

    manager.cleanupUnusedRecords();

    expect(manager.getWidgetPoolStats()).toMatchObject({
      active: 0,
      available: 2,
      created: 3,
      destroyed: 1,
      released: 3,
    });
    expect(records[2].container.destroyed).toBe(true);
    expect(roles[2].destroyed).toBe(true);
    expect(records[0].container.destroyed).not.toBe(true);
    expect(records[1].container.destroyed).not.toBe(true);
    expect(oldImageRole.destroyed).toBe(true);
    expect(oldImageShadowRole.destroyed).toBe(true);
    expect(records[0].roles.has('content:image')).toBe(false);
    expect(records[0].roles.has('content:image:dropShadow')).toBe(false);

    manager.unmount();

    expect(manager.getWidgetPoolStats()).toMatchObject({
      active: 0,
      available: 0,
      destroyed: 3,
    });
    expect(records.every((record) => record.container.destroyed)).toBe(true);
    expect(roles.every((role) => role.destroyed)).toBe(true);
    expect(manager.usedNodes.size).toBe(0);
  });

  it('resets heterogeneous retained state and caps roles before widget reuse', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const canvas = document.createElement('canvas');
    stage.append(canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      maxPooledWidgets: 1,
      getComputedStyle: () => makeStyle(),
    });
    const firstElement = document.createElement('div');
    const firstRecord = manager.ensureElementRecord(firstElement);
    const fill = manager.ensureRole(
      firstRecord,
      'box:fill',
      'graphics',
      () => new runtime.Graphics(),
    );
    const text = manager.syncTextObject({
      record: firstRecord,
      role: 'content:text:0',
      text: 'old',
      style: makeStyle({
        color: 'rgb(10, 20, 30)',
        fontFamily: 'serif',
        fontSize: '16px',
        fontStyle: 'normal',
        fontWeight: '400',
        letterSpacing: '0px',
        lineHeight: '16px',
        textAlign: 'left',
        whiteSpace: 'nowrap',
      }),
      rect: { x: 10, y: 20, width: 120, height: 16 },
      visualScale: { x: 1, y: 1 },
      wordWrap: false,
    });
    const extraRoles = Array.from({ length: 40 }, (_, index) =>
      manager.ensureRole(
        firstRecord,
        `extra:${index}`,
        'graphics',
        () => new runtime.Graphics(),
      ),
    );

    firstRecord.container.position.set(11, 12);
    firstRecord.container.pivot.set(13, 14);
    firstRecord.container.scale.set(2, 3);
    firstRecord.container.rotation = 0.75;
    firstRecord.container.alpha = 0.25;
    firstRecord.container.zIndex = 9;
    firstRecord.container.mask = {};
    firstRecord.container.filters = [{}];
    fill.position.set(21, 22);
    fill.pivot.set(23, 24);
    fill.scale.set(4, 5);
    fill.rotation = 1.25;
    fill.alpha = 0.5;
    fill.zIndex = 7;
    fill.mask = {};
    fill.filters = [{}];
    fill.tint = 0x123456;
    fill.rect(1, 2, 3, 4);
    text.anchor.set(0.5);

    // Keep representative roles among the most recently used pool entries.
    manager.ensureRole(firstRecord, 'box:fill', 'graphics', () => null);
    manager.ensureRole(firstRecord, 'content:text:0', 'text', () => null);
    manager.cleanupUnusedRecords();

    expect(manager.getWidgetPoolStats().available).toBe(1);
    expect(firstRecord.roles.size).toBe(32);
    expect(extraRoles.filter((role) => role.destroyed)).toHaveLength(10);
    expect(fill.lastRect).toBeNull();

    const replacementElement = document.createElement('div');
    const replacementRecord =
      manager.ensureElementRecord(replacementElement);
    const reusedFill = manager.ensureRole(
      replacementRecord,
      'box:fill',
      'graphics',
      () => new runtime.Graphics(),
    );
    const reusedText = manager.syncTextObject({
      record: replacementRecord,
      role: 'content:text:0',
      text: 'new',
      style: makeStyle({
        color: 'rgb(40, 50, 60)',
        fontFamily: 'sans-serif',
        fontSize: '18px',
        fontStyle: 'italic',
        fontWeight: '700',
        letterSpacing: '1px',
        lineHeight: '20px',
        textAlign: 'center',
        whiteSpace: 'normal',
      }),
      rect: { x: 30, y: 40, width: 160, height: 20 },
      visualScale: { x: 1, y: 1 },
      wordWrap: true,
    });

    expect(replacementRecord).toBe(firstRecord);
    expect(reusedFill).toBe(fill);
    expect(reusedText).toBe(text);
    expect(firstRecord.container.position).toMatchObject({ x: 0, y: 0 });
    expect(firstRecord.container.pivot).toMatchObject({ x: 0, y: 0 });
    expect(firstRecord.container.scale).toMatchObject({ x: 1, y: 1 });
    expect(firstRecord.container).toMatchObject({
      rotation: 0,
      alpha: 1,
      zIndex: 0,
      mask: null,
      filters: null,
      visible: true,
    });
    expect(reusedFill.position).toMatchObject({ x: 0, y: 0 });
    expect(reusedFill.pivot).toMatchObject({ x: 0, y: 0 });
    expect(reusedFill.scale).toMatchObject({ x: 1, y: 1 });
    expect(reusedFill).toMatchObject({
      rotation: 0,
      alpha: 1,
      zIndex: 0,
      mask: null,
      filters: null,
      tint: 0xffffff,
      visible: true,
    });
    expect(reusedText.anchor).toMatchObject({ x: 0, y: 0 });
    expect(reusedText.text).toBe('new');
    expect(reusedText.style).toMatchObject({
      fill: 0x28323c,
      fontFamily: 'sans-serif',
      fontSize: 18,
      fontStyle: 'italic',
      fontWeight: '700',
      letterSpacing: 1,
      lineHeight: 20,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 160,
    });

    manager.unmount();
  });

  it('rotates a seed-pack composite as one unit while preserving the item tilt', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const scaledLayer = document.createElement('div');
    const seedPack = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    const canvas = document.createElement('canvas');
    seedPack.dataset.assetAtlasFrame = 'seed:pack';
    seedPack.dataset.seedPackItemFrame = 'herb:sage';
    Object.defineProperties(seedPack, {
      clientWidth: { value: 119 },
      clientHeight: { value: 128 },
    });
    scaledLayer.append(seedPack);
    stage.append(scaledLayer, canvas);
    setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: (element) =>
        element === scaledLayer
          ? makeStyle({ transform: 'matrix(2, 0, 0, 2, 0, 0)' })
          : makeStyle(),
    });
    manager.canvasRect = canvas.getBoundingClientRect();
    manager.atlasTextures = {
      'seed:pack': { width: 119, height: 128 },
      'herb:sage': { width: 64, height: 64 },
    };
    const record = manager.ensureElementRecord(seedPack);
    const output = [];
    const rotation = Math.PI / 2;

    manager.syncAtlasSprite(
      seedPack,
      makeStyle({
        color: 'rgb(255, 255, 255)',
        clipPath: 'none',
        objectFit: 'contain',
        objectPosition: '50% 50%',
        scale: 'none',
        transform: 'matrix(0, 1, -1, 0, 0, 0)',
      }),
      { x: 50, y: 100, width: 256, height: 238 },
      record,
      output,
    );

    const base = record.roles.get('content:atlas').object;
    const item = record.roles.get('content:atlas:seedItem').object;
    const packCenter = { x: 178, y: 219 };
    const unrotatedItemCenterY = 91 + 256 * 0.63;

    expect(base.anchor.x).toBe(0.5);
    expect(base.width).toBeCloseTo(238);
    expect(base.height).toBeCloseTo(256);
    expect(base.position.x).toBeCloseTo(packCenter.x);
    expect(base.position.y).toBeCloseTo(packCenter.y);
    expect(base.rotation).toBeCloseTo(rotation);
    expect(item.anchor.x).toBe(0.5);
    expect(item.position.x).toBeCloseTo(
      packCenter.x - (unrotatedItemCenterY - packCenter.y),
    );
    expect(item.position.y).toBeCloseTo(packCenter.y);
    expect(item.rotation).toBeCloseTo(rotation + (6 * Math.PI) / 180);
  });

  it('clips the whole retained element for clip-path and its descendants for overflow', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const element = document.createElement('div');
    const canvas = document.createElement('canvas');
    stage.append(element, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: () => makeStyle(),
    });
    const record = manager.ensureElementRecord(element);

    manager.syncClipMask(
      makeStyle({
        clipPath: 'inset(0 25% 10px 5px)',
        overflow: 'hidden',
      }),
      { x: 10, y: 20, width: 200, height: 100 },
      record,
    );

    expect(record.descendants.mask).toBe(record.overflowMask);
    expect(record.clipTarget.mask).toBe(record.clipPathMask);
    expect(record.overflowMask.lastRect).toEqual({
      x: 10,
      y: 20,
      width: 200,
      height: 100,
    });
    expect(record.clipPathMask.lastRect).toEqual({
      x: 15,
      y: 20,
      width: 145,
      height: 90,
    });
    expect(record.masks.children).toEqual([
      record.overflowMask,
      record.clipPathMask,
    ]);

    manager.syncClipMask(
      makeStyle({ clipPath: 'none', overflow: 'visible' }),
      { x: 10, y: 20, width: 200, height: 100 },
      record,
    );

    expect(record.descendants.mask).toBeNull();
    expect(record.clipTarget.mask).toBeNull();
    expect(record.overflowMask.visible).toBe(false);
    expect(record.clipPathMask.visible).toBe(false);
    expect(record.masks.children).toEqual([
      record.overflowMask,
      record.clipPathMask,
    ]);
  });

  it('centers generated grid text and rotates pseudo chrome as one retained group', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const icon = document.createElement('div');
    const canvas = document.createElement('canvas');
    icon.dataset.initial = 'E';
    stage.append(icon, canvas);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      getComputedStyle: (_element, pseudo) =>
        pseudo
          ? makeStyle({
              backgroundColor: 'rgb(255, 255, 255)',
              color: 'rgb(0, 0, 0)',
              content: 'attr(data-initial)',
              fontFamily: 'serif',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: '700',
              letterSpacing: '0px',
              lineHeight: '16px',
              opacity: '0.65',
              rotate: '38deg',
              textAlign: 'left',
              textShadow: 'none',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              width: '12px',
              height: '18px',
            })
          : makeStyle({
              display: 'grid',
              placeItems: 'center',
            }),
    });
    const record = manager.ensureElementRecord(icon);
    const negative = [];
    const regular = [];

    manager.syncPseudo(
      icon,
      'before',
      { x: 20, y: 30, width: 48, height: 48 },
      record,
      negative,
      regular,
    );

    const group = record.roles.get('pseudo:before:transform').object;
    const textObject = record.roles.get('pseudo:before:text').object;
    const fill = record.roles.get('pseudo:before:fill').object;
    expect(negative).toHaveLength(0);
    expect(regular).toEqual([group]);
    expect(group.children).toContain(fill);
    expect(group.children).toContain(textObject);
    expect(group.rotation).toBeCloseTo((38 * Math.PI) / 180);
    expect(group.alpha).toBe(0.65);
    expect(fill.alpha).toBe(1);
    expect(textObject.anchor.x).toBe(0.5);
    expect(textObject.anchor.y).toBe(0.5);
    expect(textObject.position.x).toBe(44);
    expect(textObject.position.y).toBe(54);
  });

  it('retains an intersected alpha-gradient mask beside an animated clip mask', () => {
    const runtime = createRuntime();
    const stage = document.createElement('section');
    const rainbow = document.createElement('div');
    const canvas = document.createElement('canvas');
    stage.append(rainbow, canvas);
    const gradients = [];
    const composites = [];
    const context = {
      clearRect: vi.fn(),
      createLinearGradient: vi.fn((...coordinates) => {
        const gradient = {
          coordinates,
          stops: [],
          addColorStop(offset, color) {
            this.stops.push({ offset, color });
          },
        };
        gradients.push(gradient);
        return gradient;
      }),
      fillRect: vi.fn(),
      fillStyle: null,
    };
    Object.defineProperty(context, 'globalCompositeOperation', {
      configurable: true,
      get: () => composites.at(-1) ?? 'source-over',
      set: (value) => {
        composites.push(value);
      },
    });
    const rasterCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    };
    const texture = {
      source: { update: vi.fn() },
      destroy: vi.fn(),
    };
    runtime.Texture.from.mockReturnValue(texture);
    const manager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers: {
        background: new runtime.Container(),
        ui: new runtime.Container(),
        popup: new runtime.Container(),
        overlay: new runtime.Container(),
      },
      runtime,
      createRasterCanvas: vi.fn(() => rasterCanvas),
      getComputedStyle: () => makeStyle(),
    });
    const record = manager.ensureElementRecord(rainbow);
    const maskImage = [
      'linear-gradient(90deg, transparent 0%, #000 25%, #000 75%, transparent 100%)',
      'linear-gradient(180deg, #000 0%, #000 82%, transparent 100%)',
    ].join(', ');

    manager.syncClipMask(
      makeStyle({
        clipPath: 'inset(0 48% 0 0)',
        maskImage,
        overflow: 'visible',
      }),
      { x: 40, y: 60, width: 248, height: 154 },
      record,
    );

    const retainedMaskSprite = record.cssMaskSprite;
    const retainedClipMask = record.clipPathMask;
    expect(record.visual.mask).toBe(retainedMaskSprite);
    expect(record.clipTarget.mask).toBe(retainedClipMask);
    expect(record.clipPathMask.lastRect).toEqual({
      x: 40,
      y: 60,
      width: 128.96,
      height: 154,
    });
    expect(gradients).toHaveLength(2);
    expect(context.fillRect).toHaveBeenCalledTimes(2);
    expect(composites).toEqual([
      'source-over',
      'destination-in',
      'source-over',
    ]);

    manager.syncClipMask(
      makeStyle({
        clipPath: 'inset(0)',
        maskImage,
        overflow: 'visible',
      }),
      { x: 40, y: 60, width: 248, height: 154 },
      record,
    );

    expect(record.cssMaskSprite).toBe(retainedMaskSprite);
    expect(record.clipPathMask).toBe(retainedClipMask);
    expect(record.clipPathMask.lastRect).toEqual({
      x: 40,
      y: 60,
      width: 248,
      height: 154,
    });
    expect(runtime.Texture.from).toHaveBeenCalledTimes(1);
    expect(texture.source.update).toHaveBeenCalledTimes(2);

    manager.cleanupUnusedRecords();

    expect(manager.getWidgetPoolStats().available).toBe(1);
    expect(record.visual.mask).toBeNull();
    expect(record.clipTarget.mask).toBeNull();
    expect(record.descendants.mask).toBeNull();
    expect(retainedClipMask.visible).toBe(false);
    expect(record.cssMaskSprite).toBeNull();
    expect(retainedMaskSprite.destroyed).toBe(true);
    expect(texture.destroy).toHaveBeenCalledWith(true);

    const plain = document.createElement('div');
    stage.append(plain);
    const reusedRecord = manager.ensureElementRecord(plain);
    manager.syncClipMask(
      makeStyle({
        clipPath: 'none',
        maskImage: 'none',
        overflow: 'visible',
      }),
      { x: 10, y: 20, width: 100, height: 50 },
      reusedRecord,
    );

    expect(reusedRecord).toBe(record);
    expect(reusedRecord.visual.mask).toBeNull();
    expect(reusedRecord.clipTarget.mask).toBeNull();
    expect(reusedRecord.descendants.mask).toBeNull();
  });
});

async function measureWidgetPageReplacement(maxPooledWidgets) {
  const runtime = createRuntime();
  const stage = document.createElement('section');
  const canvas = document.createElement('canvas');
  const firstPage = makeWidgetPage('first');
  canvas.className = 'game-canvas';
  setRect(stage, { left: 0, top: 0, width: 390, height: 844 });
  setRect(canvas, { left: 0, top: 0, width: 390, height: 844 });
  stage.append(firstPage, canvas);
  const rangeSpy = vi.spyOn(document, 'createRange').mockImplementation(() => {
    let node = null;
    return {
      selectNodeContents(nextNode) {
        node = nextNode;
      },
      getClientRects() {
        return [node.parentElement.getBoundingClientRect()];
      },
      detach() {},
    };
  });
  const manager = new RootRunUiRendererManager({
    stage,
    canvas,
    layers: {
      background: new runtime.Container(),
      ui: new runtime.Container(),
      popup: new runtime.Container(),
      overlay: new runtime.Container(),
    },
    runtime,
    maxPooledWidgets,
    getComputedStyle: (_element, pseudo) =>
      makeStyle({
        backgroundColor: pseudo ? 'transparent' : 'rgb(214, 214, 214)',
        color: 'rgb(20, 20, 20)',
        content: pseudo ? 'none' : '',
        fontFamily: 'serif',
        fontSize: '16px',
        fontStyle: 'normal',
        fontWeight: '400',
        letterSpacing: '0px',
        lineHeight: '16px',
        textAlign: 'left',
        textTransform: 'none',
        whiteSpace: 'nowrap',
      }),
  });

  try {
    await manager.mount();
    const before = { ...runtime.allocations };
    const firstRecords = new Set(manager.records.values());
    const replacementPage = makeWidgetPage('replacement');

    stage.replaceChild(replacementPage, firstPage);
    await manager.refresh();

    return {
      allocations: {
        displayObjects:
          runtime.allocations.displayObjects - before.displayObjects,
        textStyles: runtime.allocations.textStyles - before.textStyles,
      },
      reusedEveryRecord: [...manager.records.values()].every((record) =>
        firstRecords.has(record),
      ),
      stats: manager.getWidgetPoolStats(),
    };
  } finally {
    manager.unmount();
    rangeSpy.mockRestore();
  }
}

function makeWidgetPage(label) {
  const root = document.createElement('article');
  root.append(`${label} root`);
  setRect(root, { left: 0, top: 0, width: 390, height: 844 });

  for (let index = 0; index < 12; index += 1) {
    const widget = document.createElement('span');
    widget.textContent = `${label} widget ${index}`;
    setRect(widget, {
      left: 10,
      top: 10 + index * 20,
      width: 120,
      height: 16,
    });
    root.append(widget);
  }

  return root;
}

function createRuntime() {
  const allocations = {
    displayObjects: 0,
    textStyles: 0,
  };

  class FakePoint {
    constructor() {
      this.x = 0;
      this.y = 0;
    }

    set(x, y = x) {
      this.x = x;
      this.y = y;
    }
  }

  class FakeContainer {
    constructor() {
      allocations.displayObjects += 1;
      this.children = [];
      this.parent = null;
      this.position = new FakePoint();
      this.pivot = new FakePoint();
      this.scale = new FakePoint();
      this.visible = true;
    }

    addChild(...children) {
      for (const child of children) {
        child.parent?.removeChild?.(child);
        child.parent = this;
        this.children.push(child);
      }
      return children.at(-1);
    }

    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parent = null;
      return child;
    }

    removeChildren() {
      const children = [...this.children];
      for (const child of children) {
        this.removeChild(child);
      }
      return children;
    }

    removeFromParent() {
      this.parent?.removeChild?.(this);
    }

    sortChildren() {
      this.children.sort(
        (a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0),
      );
    }

    destroy() {
      this.removeChildren();
      this.destroyed = true;
    }
  }

  class FakeGraphics extends FakeContainer {
    clear() {
      this.lastRect = null;
      return this;
    }

    rect(x, y, width, height) {
      this.lastRect = { x, y, width, height };
      return this;
    }

    roundRect(x, y, width, height) {
      this.lastRect = { x, y, width, height };
      return this;
    }

    circle() {
      return this;
    }

    fill() {
      return this;
    }

    stroke() {
      return this;
    }

    cut() {
      return this;
    }
  }

  class FakeSprite extends FakeContainer {
    constructor(texture) {
      super();
      this.texture = texture;
      this.anchor = new FakePoint();
      this.width = 0;
      this.height = 0;
    }
  }

  class FakeNineSliceSprite extends FakeSprite {
    constructor({ texture }) {
      super(texture);
    }

    setSize(width, height) {
      this.width = width;
      this.height = height;
    }
  }

  class FakeText extends FakeSprite {
    constructor({ text, style }) {
      super(null);
      this.text = text;
      this.style = style;
    }
  }

  return {
    allocations,
    Assets: { load: vi.fn() },
    ColorMatrixFilter: class {},
    Container: FakeContainer,
    FillGradient: class {
      constructor(options) {
        Object.assign(this, options);
      }
    },
    Graphics: FakeGraphics,
    NineSliceSprite: FakeNineSliceSprite,
    Sprite: FakeSprite,
    Spritesheet: class {},
    Text: FakeText,
    TextStyle: class {
      constructor(options) {
        allocations.textStyles += 1;
        Object.assign(this, options);
      }

      reset() {
        for (const key of Object.keys(this)) {
          delete this[key];
        }
      }

      assign(options) {
        Object.assign(this, options);
        return this;
      }
    },
    Texture: { from: vi.fn(() => ({})) },
  };
}

function makeStyle(overrides = {}) {
  return {
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    zIndex: '0',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    backgroundSize: 'auto',
    backgroundPosition: '0% 0%',
    borderImageSource: 'none',
    borderImageSlice: 'none',
    borderImageWidth: '1',
    borderTopWidth: '0px',
    borderRightWidth: '0px',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRadius: '0px',
    borderTopLeftRadius: '0px',
    boxShadow: 'none',
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    filter: 'none',
    content: '',
    width: 'auto',
    height: 'auto',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    getPropertyValue: () => '',
    ...overrides,
  };
}

function setRect(element, { left, top, width, height }) {
  element.getBoundingClientRect = () => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    width,
    height,
  });
}
