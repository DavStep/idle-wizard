const DEFAULT_ZOOM_STEPS = Object.freeze([0.25, 0.5, 0.75, 1, 1.5, 2]);

export function createUiEditorAtlasWorkbench(
  entry,
  {
    clipboard = globalThis.navigator?.clipboard,
    onSelectFrame = () => {},
  } = {},
) {
  const frames = normalizeFrames(entry.atlasFrames);
  const atlasWidth = Math.max(1, Number(entry.atlasSize?.width) || 1);
  const atlasHeight = Math.max(1, Number(entry.atlasSize?.height) || 1);
  const root = document.createElement('section');
  const toolbar = document.createElement('div');
  const searchGroup = document.createElement('div');
  const search = document.createElement('input');
  const searchStatus = document.createElement('span');
  const selectionGroup = document.createElement('div');
  const previousButton = createToolbarButton('Previous', 'previous');
  const selectionStatus = document.createElement('span');
  const nextButton = createToolbarButton('Next', 'next');
  const copyIdButton = createToolbarButton('Copy ID', 'copy-id');
  const copyPathButton = createToolbarButton('Copy path', 'copy-path');
  const zoomGroup = document.createElement('div');
  const zoomOutButton = createToolbarButton('−', 'zoom-out');
  const fitButton = createToolbarButton('Fit width', 'fit');
  const actualSizeButton = createToolbarButton('100%', 'actual-size');
  const zoomInButton = createToolbarButton('+', 'zoom-in');
  const stage = document.createElement('div');
  const canvas = document.createElement('div');
  const image = document.createElement('img');
  const matchesLayer = document.createElement('div');
  const hoverOutline = createFrameOutline('hover');
  const selectionOutline = createFrameOutline('selected', true);
  const footer = document.createElement('div');
  const hint = document.createElement('span');
  const liveStatus = document.createElement('span');
  const listeners = [];
  let resizeObserver = null;
  let fitMode = true;
  let scale = 1;
  let selectedIndex = -1;
  let hoveredIndex = -1;
  let matchingIndices = frames.map((_, index) => index);

  root.className = 'ui-editor-atlas';
  root.dataset.uiEditorComponent = 'EditorAtlasWorkbench';
  toolbar.className = 'ui-editor-atlas__toolbar';
  searchGroup.className = 'ui-editor-atlas__search-group';
  search.className = 'ui-editor-atlas__search';
  search.type = 'search';
  search.placeholder = 'Find by name or path';
  search.setAttribute('aria-label', 'Find atlas frame by name or path');
  searchStatus.className = 'ui-editor-atlas__search-status';
  searchStatus.id = createElementId('atlas-search-status');
  search.setAttribute('aria-describedby', searchStatus.id);
  selectionGroup.className = 'ui-editor-atlas__selection-controls';
  selectionStatus.className = 'ui-editor-atlas__selection-status';
  selectionStatus.setAttribute('aria-live', 'polite');
  zoomGroup.className = 'ui-editor-atlas__zoom-controls';
  zoomOutButton.setAttribute('aria-label', 'Zoom out');
  zoomInButton.setAttribute('aria-label', 'Zoom in');
  stage.className = 'ui-editor-atlas__stage ui-editor-checkerboard';
  stage.dataset.atlasViewport = 'true';
  canvas.className = 'ui-editor-atlas__canvas';
  canvas.dataset.atlasCanvas = 'true';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'region');
  canvas.setAttribute(
    'aria-label',
    `${entry.label}, ${frames.length} selectable frames`,
  );
  image.className = 'ui-editor-atlas__image';
  image.alt = '';
  image.draggable = false;
  image.src = entry.assetUrl;
  matchesLayer.className = 'ui-editor-atlas__matches';
  matchesLayer.setAttribute('aria-hidden', 'true');
  footer.className = 'ui-editor-atlas__footer';
  hint.className = 'ui-editor-atlas__hint';
  hint.textContent =
    'Click a frame to inspect it. Use arrow keys to move through frames.';
  liveStatus.className = 'ui-editor-atlas__live-status';
  liveStatus.setAttribute('aria-live', 'polite');
  liveStatus.setAttribute('role', 'status');

  searchGroup.append(search, searchStatus);
  selectionGroup.append(
    previousButton,
    selectionStatus,
    nextButton,
    copyIdButton,
    copyPathButton,
  );
  zoomGroup.append(zoomOutButton, fitButton, actualSizeButton, zoomInButton);
  toolbar.append(searchGroup, selectionGroup, zoomGroup);
  canvas.append(image, matchesLayer, hoverOutline, selectionOutline);
  stage.append(canvas);
  footer.append(hint, liveStatus);
  root.append(toolbar, stage, footer);

  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };

  const setScale = (nextScale, { fit = false } = {}) => {
    scale = clamp(Number(nextScale) || 1, 0.1, 4);
    fitMode = fit;
    canvas.style.width = `${atlasWidth * scale}px`;
    canvas.style.height = `${atlasHeight * scale}px`;
    canvas.dataset.zoom = `${Math.round(scale * 100)}%`;
    fitButton.setAttribute('aria-pressed', String(fitMode));
    actualSizeButton.setAttribute(
      'aria-pressed',
      String(!fitMode && Math.abs(scale - 1) < 0.001),
    );
    zoomOutButton.disabled = scale <= 0.1;
    zoomInButton.disabled = scale >= 4;
  };

  const fitToWidth = () => {
    const availableWidth = Math.max(1, stage.clientWidth - 32);
    setScale(Math.min(1, availableWidth / atlasWidth), { fit: true });
  };

  const updateSelectionControls = () => {
    const hasSelection = selectedIndex >= 0;
    previousButton.disabled = frames.length === 0;
    nextButton.disabled = frames.length === 0;
    copyIdButton.disabled = !hasSelection;
    copyPathButton.disabled = !hasSelection;
    selectionStatus.textContent = hasSelection
      ? `${selectedIndex + 1} / ${frames.length}`
      : `${frames.length} frames`;
  };

  const setHoveredFrame = (index) => {
    hoveredIndex = Number.isInteger(index) ? index : -1;
    renderOutline(hoverOutline, frames[hoveredIndex], atlasWidth, atlasHeight);
  };

  const centerFrame = (frame) => {
    if (!frame) {
      return;
    }

    const centerX = (frame.x + frame.width / 2) * scale;
    const centerY = (frame.y + frame.height / 2) * scale;
    stage.scrollTo?.({
      behavior: 'auto',
      left: centerX - stage.clientWidth / 2,
      top: centerY - stage.clientHeight / 2,
    });
  };

  const selectFrame = (
    index,
    { center = false, announce = true } = {},
  ) => {
    selectedIndex = Number.isInteger(index) && frames[index] ? index : -1;
    const frame = frames[selectedIndex] ?? null;

    renderOutline(selectionOutline, frame, atlasWidth, atlasHeight);
    updateSelectionControls();
    canvas.setAttribute(
      'aria-label',
      frame
        ? `${entry.label}, selected ${frame.name}, frame ${selectedIndex + 1} of ${frames.length}`
        : `${entry.label}, ${frames.length} selectable frames`,
    );
    if (frame && center) {
      centerFrame(frame);
    }
    if (announce) {
      liveStatus.textContent = frame
        ? `Selected ${frame.name}`
        : 'Frame selection cleared.';
    }
    onSelectFrame(frame);
  };

  const findFrameAtPointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return -1;
    }
    const x = (event.clientX - rect.left) / rect.width * atlasWidth;
    const y = (event.clientY - rect.top) / rect.height * atlasHeight;

    return frames.findIndex((frame) =>
      x >= frame.x
      && x <= frame.x + frame.width
      && y >= frame.y
      && y <= frame.y + frame.height,
    );
  };

  const moveSelection = (direction, candidates = frames.map((_, index) => index)) => {
    if (!candidates.length) {
      return;
    }
    const currentCandidateIndex = candidates.indexOf(selectedIndex);
    const nextCandidateIndex = currentCandidateIndex < 0
      ? (direction > 0 ? 0 : candidates.length - 1)
      : (currentCandidateIndex + direction + candidates.length)
        % candidates.length;

    selectFrame(candidates[nextCandidateIndex], { center: true });
  };

  const renderMatches = () => {
    const query = search.value.trim().toLocaleLowerCase();
    matchingIndices = query
      ? frames
          .map((frame, index) => ({ frame, index }))
          .filter(({ frame }) =>
            frame.name.toLocaleLowerCase().includes(query)
            || frame.source.toLocaleLowerCase().includes(query),
          )
          .map(({ index }) => index)
      : frames.map((_, index) => index);

    searchStatus.textContent = query
      ? `${matchingIndices.length} ${matchingIndices.length === 1 ? 'match' : 'matches'}`
      : `${frames.length} frames`;
    matchesLayer.replaceChildren(
      ...(query
        ? matchingIndices.map((index) =>
            createMatchOutline(frames[index], atlasWidth, atlasHeight),
          )
        : []),
    );
  };

  const copySelectedValue = async (field) => {
    const frame = frames[selectedIndex];
    const value = frame?.[field];
    const label = field === 'name' ? 'Frame ID' : 'Source path';

    if (!frame || !value) {
      return;
    }

    try {
      if (typeof clipboard?.writeText !== 'function') {
        throw new Error('Clipboard is unavailable.');
      }
      await clipboard.writeText(value);
      liveStatus.textContent = `${label} copied.`;
      liveStatus.dataset.tone = 'success';
    } catch {
      liveStatus.textContent = `Could not copy ${label.toLocaleLowerCase()}.`;
      liveStatus.dataset.tone = 'error';
    }
  };

  listen(image, 'load', () => {
    delete root.dataset.error;
    root.dataset.ready = 'true';
    fitToWidth();
    liveStatus.textContent = `${frames.length} atlas frames ready.`;
  });
  listen(image, 'error', () => {
    root.dataset.error = 'true';
    liveStatus.dataset.tone = 'error';
    liveStatus.textContent = 'Atlas image failed to load.';
  });
  listen(canvas, 'pointermove', (event) => {
    setHoveredFrame(findFrameAtPointer(event));
  });
  listen(canvas, 'pointerleave', () => setHoveredFrame(-1));
  listen(canvas, 'click', (event) => {
    selectFrame(findFrameAtPointer(event));
  });
  listen(canvas, 'keydown', (event) => {
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
      moveSelection(1, matchingIndices);
      event.preventDefault();
    } else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
      moveSelection(-1, matchingIndices);
      event.preventDefault();
    } else if (event.key === 'Home' && matchingIndices.length) {
      selectFrame(matchingIndices[0], { center: true });
      event.preventDefault();
    } else if (event.key === 'End' && matchingIndices.length) {
      selectFrame(matchingIndices.at(-1), { center: true });
      event.preventDefault();
    } else if (event.key === 'Escape') {
      selectFrame(-1);
      event.preventDefault();
    }
  });
  listen(search, 'input', renderMatches);
  listen(search, 'keydown', (event) => {
    if (event.key === 'Enter' && matchingIndices.length) {
      moveSelection(1, matchingIndices);
      canvas.focus();
      event.preventDefault();
    } else if (event.key === 'Escape' && search.value) {
      search.value = '';
      renderMatches();
      event.preventDefault();
    }
  });
  listen(previousButton, 'click', () => moveSelection(-1, matchingIndices));
  listen(nextButton, 'click', () => moveSelection(1, matchingIndices));
  listen(copyIdButton, 'click', () => copySelectedValue('name'));
  listen(copyPathButton, 'click', () => copySelectedValue('source'));
  listen(fitButton, 'click', fitToWidth);
  listen(actualSizeButton, 'click', () => setScale(1));
  listen(zoomOutButton, 'click', () =>
    setScale(resolveZoomStep(scale, -1)));
  listen(zoomInButton, 'click', () =>
    setScale(resolveZoomStep(scale, 1)));

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      if (fitMode) {
        fitToWidth();
      }
    });
    resizeObserver.observe(stage);
  }

  renderMatches();
  updateSelectionControls();
  setScale(1);

  return {
    root,
    dispose: () => {
      resizeObserver?.disconnect();
      for (const removeListener of listeners) {
        removeListener();
      }
    },
    getSelectedFrame: () => frames[selectedIndex] ?? null,
    selectFrame: (name) => {
      const index = frames.findIndex((frame) => frame.name === name);
      selectFrame(index, { center: true });
      return index >= 0;
    },
  };
}

function normalizeFrames(frames) {
  if (!Array.isArray(frames)) {
    return [];
  }

  return frames
    .map((frame) => ({
      height: Number(frame?.height) || 0,
      name: String(frame?.name ?? ''),
      originalHeight: Number(frame?.originalHeight) || 0,
      originalWidth: Number(frame?.originalWidth) || 0,
      source: String(frame?.source ?? ''),
      width: Number(frame?.width) || 0,
      x: Number(frame?.x) || 0,
      y: Number(frame?.y) || 0,
    }))
    .filter((frame) => frame.name && frame.width > 0 && frame.height > 0);
}

function createToolbarButton(label, action) {
  const button = document.createElement('button');
  button.className = 'ui-editor-atlas__action';
  button.dataset.atlasAction = action;
  button.type = 'button';
  button.textContent = label;
  return button;
}

function createFrameOutline(state, withLabel = false) {
  const outline = document.createElement('div');
  outline.className = 'ui-editor-atlas__frame-outline';
  outline.dataset.frameState = state;
  outline.hidden = true;
  outline.setAttribute('aria-hidden', 'true');

  if (withLabel) {
    const label = document.createElement('span');
    label.className = 'ui-editor-atlas__frame-label';
    outline.append(label);
  }
  return outline;
}

function createMatchOutline(frame, atlasWidth, atlasHeight) {
  const outline = createFrameOutline('match');
  renderOutline(outline, frame, atlasWidth, atlasHeight);
  return outline;
}

function renderOutline(outline, frame, atlasWidth, atlasHeight) {
  outline.hidden = !frame;
  if (!frame) {
    return;
  }

  outline.style.left = `${frame.x / atlasWidth * 100}%`;
  outline.style.top = `${frame.y / atlasHeight * 100}%`;
  outline.style.width = `${frame.width / atlasWidth * 100}%`;
  outline.style.height = `${frame.height / atlasHeight * 100}%`;
  outline.querySelector('.ui-editor-atlas__frame-label')?.replaceChildren(
    document.createTextNode(frame.name),
  );
}

function resolveZoomStep(currentScale, direction) {
  if (direction > 0) {
    return DEFAULT_ZOOM_STEPS.find((step) => step > currentScale + 0.001) ?? 4;
  }

  return [...DEFAULT_ZOOM_STEPS]
    .reverse()
    .find((step) => step < currentScale - 0.001) ?? 0.1;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

let elementId = 0;
function createElementId(prefix) {
  elementId += 1;
  return `${prefix}-${elementId}`;
}
