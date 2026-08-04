import {
  createUiEditorAssetDeletionDialog,
} from './UiEditorAssetDeletionDialog.js';
import {
  createUiEditorAtlasWorkbench,
} from './UiEditorAtlasWorkbench.js';

const NINE_SLICE_SAVE_ROUTE = '/__idle-wizard-ui-editor/nine-slice';
export const UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY =
  'idle-wizard:ui-editor:pending-nine-slice';
let editorTabSetId = 0;

export function createUiEditorAssetThumbnail(entry) {
  const host = document.createElement('span');
  const image = document.createElement('img');
  const nineSliceBadge = document.createElement('span');
  const unusedBadge = document.createElement('span');

  host.className = 'ui-editor-asset-thumbnail';
  host.dataset.editorLibraryThumbnail = entry.id;
  image.className = 'ui-editor-asset-thumbnail__image';
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  image.loading = 'lazy';
  image.src = entry.assetUrl;
  nineSliceBadge.className =
    'ui-editor-asset-thumbnail__badge '
    + 'ui-editor-asset-thumbnail__badge--nine-slice';
  nineSliceBadge.hidden = !entry.nineSlice;
  nineSliceBadge.textContent = '9';
  nineSliceBadge.setAttribute('aria-hidden', 'true');
  unusedBadge.className =
    'ui-editor-asset-thumbnail__badge '
    + 'ui-editor-asset-thumbnail__badge--unused';
  unusedBadge.hidden = true;
  unusedBadge.textContent = 'Unused';
  unusedBadge.setAttribute('aria-hidden', 'true');
  host.uiEditorSetUnused = (unused) => {
    unusedBadge.hidden = unused !== true;
  };
  host.append(image, unusedBadge, nineSliceBadge);
  return host;
}

export function createUiEditorAssetPreview(
  entry,
  {
    assetEntries = [],
    onAssetDeleted = () => {},
    onInspectAtlasFrame = () => {},
  } = {},
) {
  const root = document.createElement('section');
  const header = createHeader(entry);
  const atlas = hasAtlasFrames(entry);
  let content = atlas
    ? createUiEditorAtlasWorkbench(entry, {
        onSelectFrame: onInspectAtlasFrame,
      })
    : entry.nineSlice
      ? createUiEditorNineSliceWorkbench(entry)
      : createImagePreview(entry);
  let activeDeleteDialog = null;

  root.className = 'ui-editor-asset-workbench';
  root.dataset.editorAssetMode = atlas
    ? 'atlas'
    : entry.nineSlice ? 'nine-slice' : 'image';
  root.dataset.uiEditorHierarchy = 'hidden';
  root.dataset.uiEditorComponent = 'EditorAssetWorkbench';
  root.setAttribute('aria-label', `${entry.label} asset preview`);
  root.append(header.root, content.root);

  const replaceContent = (nextContent, mode) => {
    content.dispose();
    content = nextContent;
    root.dataset.editorAssetMode = mode;
    root.replaceChild(content.root, root.lastElementChild);
  };
  const showImage = () => {
    replaceContent(createImagePreview(entry), 'image');
    root.removeAttribute('data-nine-slice-saved');
    header.setMode('Image');
    header.setActions(createConvertActions());
    header.setStatus('');
  };
  const showNineSliceDraft = () => {
    replaceContent(
      createUiEditorNineSliceWorkbench({
        ...entry,
        sourceInsets:
          entry.sourceInsets
          ?? entry.suggestedSourceInsets
          ?? null,
      }),
      'nine-slice-draft',
    );
    header.setMode('9-slice draft');
    header.setActions(createDraftActions());
    header.setStatus('');
  };
  const saveNineSlice = async (saveButton, cancelButton = null) => {
    const slice = content.getSourceInsets?.();

    if (!slice) {
      header.setStatus('Load the PNG before saving its slices.', 'error');
      return;
    }

    saveButton.disabled = true;
    if (cancelButton) {
      cancelButton.disabled = true;
    }
    header.setStatus('Saving…');
    const pendingAssetId = resolveNineSliceAssetId(entry.assetId);
    storePendingNineSliceSelection({
      entryId: `asset:${pendingAssetId}`,
      metadataPath: resolveNineSliceMetadataPath(pendingAssetId),
    });

    try {
      const result = await saveUiEditorNineSlice(entry.assetId, slice, {
        outputInsets: content.getOutputInsets?.() ?? slice,
      });
      root.dataset.editorAssetMode = 'nine-slice';
      root.dataset.nineSliceSaved = 'true';
      header.setMode('9-slice');
      header.setStatus(`Saved ${result.metadataPath}`, 'success');
      cancelButton?.remove();
      saveButton.disabled = false;
    } catch (error) {
      clearPendingNineSliceSelection();
      saveButton.disabled = false;
      if (cancelButton) {
        cancelButton.disabled = false;
      }
      header.setStatus(
        error instanceof Error
          ? error.message
          : 'Could not save nine-slice metadata.',
        'error',
      );
    }
  };
  const openDeleteDialog = (opener) => {
    activeDeleteDialog?.dispose();
    activeDeleteDialog = createUiEditorAssetDeletionDialog({
      assetEntries,
      entry,
      onDeleted: onAssetDeleted,
      opener,
    });
    activeDeleteDialog.open();
  };
  const createDeleteAction = () => {
    const deleteButton = createHeaderButton('Delete asset', {
      danger: true,
    });
    const eligible = canDeleteAsset(entry);

    deleteButton.disabled = !eligible;
    if (!eligible) {
      deleteButton.title =
        'Only source assets can be deleted from the local editor.';
    }
    deleteButton.addEventListener('click', () =>
      openDeleteDialog(deleteButton),
    );
    return deleteButton;
  };
  const createConvertActions = () => {
    const convertButton = createHeaderButton('Convert to 9-slice');
    const eligible = canConvertToNineSlice(entry);

    convertButton.disabled = !eligible;
    if (!eligible) {
      convertButton.title = 'Nine-slice conversion supports PNG source assets.';
    }
    convertButton.addEventListener('click', showNineSliceDraft);
    return [convertButton, createDeleteAction()];
  };
  const createDraftActions = () => {
    const cancelButton = createHeaderButton('Cancel');
    const saveButton = createHeaderButton('Save 9-slice', {
      primary: true,
    });

    cancelButton.addEventListener('click', showImage);
    saveButton.addEventListener('click', () =>
      saveNineSlice(saveButton, cancelButton),
    );
    return [cancelButton, saveButton, createDeleteAction()];
  };
  const createNineSliceActions = () => {
    const saveButton = createHeaderButton('Save 9-slice', {
      primary: true,
    });

    saveButton.addEventListener('click', () => saveNineSlice(saveButton));
    return [saveButton, createDeleteAction()];
  };

  if (atlas) {
    header.setMode('Atlas');
    header.setActions([]);
  } else if (entry.nineSlice && canSaveNineSlice(entry)) {
    header.setActions(createNineSliceActions());
  } else if (entry.nineSlice) {
    header.setActions([createDeleteAction()]);
  } else if (!entry.nineSlice) {
    header.setActions(createConvertActions());
  }

  root.uiEditorDispose = () => {
    activeDeleteDialog?.dispose();
    activeDeleteDialog = null;
    content.dispose();
  };
  return root;
}

function hasAtlasFrames(entry) {
  return (
    Array.isArray(entry?.atlasFrames)
    && entry.atlasFrames.length > 0
    && Number(entry?.atlasSize?.width) > 0
    && Number(entry?.atlasSize?.height) > 0
  );
}

function createHeader(entry) {
  const header = document.createElement('header');
  const title = document.createElement('h2');
  const trailing = document.createElement('div');
  const type = document.createElement('span');
  const actions = document.createElement('div');
  const status = document.createElement('span');

  header.className = 'ui-editor-asset-workbench__header';
  title.className = 'ui-editor-asset-workbench__title';
  title.textContent = entry.label;
  trailing.className = 'ui-editor-asset-workbench__trailing';
  type.className = 'ui-editor-asset-workbench__type';
  type.textContent = entry.nineSlice ? '9-slice' : 'Image';
  actions.className = 'ui-editor-asset-workbench__actions';
  status.className = 'ui-editor-asset-workbench__save-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('role', 'status');
  trailing.append(type, actions);
  header.append(title, trailing, status);

  return {
    root: header,
    setActions: (buttons) => actions.replaceChildren(...buttons),
    setMode: (label) => {
      type.textContent = label;
    },
    setStatus: (message, tone = '') => {
      status.textContent = message;
      if (tone) {
        status.dataset.tone = tone;
      } else {
        status.removeAttribute('data-tone');
      }
    },
  };
}

function createImagePreview(entry) {
  const stage = document.createElement('div');
  const image = document.createElement('img');
  const status = document.createElement('p');
  const onLoad = () => {
    status.textContent = `${image.naturalWidth} × ${image.naturalHeight}px`;
  };
  const onError = () => {
    status.dataset.error = 'true';
    status.textContent = 'Asset failed to load.';
  };

  stage.className =
    'ui-editor-asset-workbench__image-stage ui-editor-checkerboard';
  image.className = 'ui-editor-asset-workbench__image';
  image.alt = entry.label;
  image.draggable = false;
  image.src = entry.assetUrl;
  status.className = 'ui-editor-asset-workbench__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading image…';
  image.addEventListener('load', onLoad);
  image.addEventListener('error', onError);
  stage.append(image, status);

  return {
    root: stage,
    dispose: () => {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    },
  };
}

const SLICE_EDGES = ['left', 'top', 'right', 'bottom'];
const MAX_PREVIEW_SIZE = 2048;
const PREVIEW_CASES = [
  {
    id: 'original',
    label: 'Original',
    description: 'Minimum size',
  },
  {
    id: 'height-stretched',
    label: 'Height stretched',
    description: 'Fixed height test',
  },
  {
    id: 'width-stretched',
    label: 'Width stretched',
    description: 'Fixed width test',
  },
  {
    id: 'both-stretched',
    label: 'Both stretched',
    description: 'Fixed width and height test',
  },
];

export function createUiEditorNineSliceWorkbench(entry) {
  const editor = document.createElement('div');
  const previewGroup = createControlGroup('Dimensions');
  const previewGrid = document.createElement('div');
  const widthControl = createDimensionControl('width', 'Width');
  const heightControl = createDimensionControl('height', 'Height');
  const previewActions = document.createElement('div');
  const ratioButton = createActionButton('Lock ratio', 'ratio');
  const sliceGroup = createControlGroup('Slice margins');
  const sliceGrid = document.createElement('div');
  const sliceControls = Object.fromEntries(
    SLICE_EDGES.map((edge) => [
      edge,
      createMarginControl(edge, capitalize(edge)),
    ]),
  );
  const utilityActions = document.createElement('div');
  const resetButton = createActionButton('Reset', 'reset');
  const copyButton = createActionButton('Copy CSS', 'copy-css');
  const actionStatus = document.createElement('span');
  const comparison = document.createElement('div');
  const sourcePane = createPane('Slice source');
  const outputPane = createPane('Preview');
  const sourceFrame = document.createElement('div');
  const sourceImage = document.createElement('img');
  const sourceStatus = document.createElement('p');
  const sourceViewport = createSliceSourceViewport(
    `${entry.label} source editor`,
    sourceImage,
    sourceFrame,
    () => updateSliceGuides(),
  );
  const sourceStage = sourceViewport.root;
  const sourceZoom = createViewportZoomControls(
    'Source',
    [sourceViewport],
  );
  const previewMatrix = document.createElement('div');
  const previewCases = PREVIEW_CASES.map((previewCase) =>
    createNineSlicePreviewCase(entry, previewCase),
  );
  const previewCaseGroups = [
    ['original', 'height-stretched'],
    ['width-stretched', 'both-stretched'],
  ];
  const refreshPreviewCaseScales = () => {
    for (const groupIds of previewCaseGroups) {
      const viewports = groupIds.map(
        (id) => previewCases.find((previewCase) => previewCase.id === id)
          .viewport,
      );
      const scale = Math.min(
        ...viewports.map((viewport) => viewport.getFitScale()),
      );

      for (const viewport of viewports) {
        viewport.refresh(scale);
      }
    }
  };
  for (const previewCase of previewCases) {
    previewCase.viewport.setRefreshHandler(refreshPreviewCaseScales);
  }
  const customTester = document.createElement('section');
  const customHeader = document.createElement('div');
  const customTitle = document.createElement('h4');
  const customDescription = document.createElement('span');
  const customViewport = createPanZoomViewport(
    `${entry.label} custom-size preview`,
  );
  const output = document.createElement('canvas');
  const customZoom = createViewportZoomControls(
    'Custom preview',
    [customViewport],
  );
  const allOutputs = [
    ...previewCases.map((previewCase) => previewCase.output),
    output,
  ];
  const hasInitialInsets = Boolean(entry.sourceInsets);
  const sourceInsets = normalizeInsets(entry.sourceInsets);
  const originalInsets = { ...sourceInsets };
  const draftInsets = { ...sourceInsets };
  const hasExplicitBorderInsets = Boolean(entry.borderInsets);
  const borderInsets = hasExplicitBorderInsets
    ? normalizeInsets(entry.borderInsets)
    : draftInsets;
  const intrinsicMinimumWidth = Number(entry.minimumSize?.width);
  const intrinsicMinimumHeight = Number(entry.minimumSize?.height);
  let minWidth = Math.max(
    Math.ceil(borderInsets.left + borderInsets.right + 1),
    Number.isFinite(intrinsicMinimumWidth)
      ? Math.ceil(intrinsicMinimumWidth)
      : 0,
  );
  let minHeight = Math.max(
    Math.ceil(borderInsets.top + borderInsets.bottom + 1),
    Number.isFinite(intrinsicMinimumHeight)
      ? Math.ceil(intrinsicMinimumHeight)
      : 0,
  );
  const initialWidth = Math.max(minWidth, Math.round(entry.width ?? 240));
  const initialHeight = Math.max(minHeight, Math.round(entry.height ?? 120));
  const listeners = [];
  const guides = {};
  let naturalWidth = 0;
  let naturalHeight = 0;
  let previewWidth = initialWidth;
  let previewHeight = initialHeight;
  let lockedRatio = null;
  let activeGuide = null;

  editor.className = 'ui-editor-nine-slice';
  editor.dataset.uiEditorComponent = 'EditorNineSliceWorkbench';
  sourcePane.root.dataset.paneRole = 'source';
  outputPane.root.dataset.paneRole = 'previews';
  sourcePane.body.classList.add('ui-editor-nine-slice__source-pane-body');
  outputPane.body.classList.add('ui-editor-nine-slice__preview-pane-body');
  previewGrid.className = 'ui-editor-nine-slice__dimension-grid';
  previewActions.className = 'ui-editor-nine-slice__quick-actions';
  sliceGrid.className = 'ui-editor-nine-slice__slice-grid';
  utilityActions.className = 'ui-editor-nine-slice__utility-actions';
  actionStatus.className = 'ui-editor-nine-slice__action-status';
  actionStatus.setAttribute('aria-live', 'polite');
  actionStatus.setAttribute('role', 'status');
  comparison.className = 'ui-editor-nine-slice__comparison';
  previewMatrix.className = 'ui-editor-nine-slice__preview-matrix';
  customTester.className = 'ui-editor-nine-slice__custom-tester';
  customTester.dataset.previewCase = 'custom';
  customHeader.className = 'ui-editor-nine-slice__preview-case-header';
  customTitle.className = 'ui-editor-nine-slice__preview-case-title';
  customTitle.textContent = 'Custom tester';
  customDescription.className =
    'ui-editor-nine-slice__preview-case-description';
  customDescription.textContent = 'Manual width and height test';
  sourceFrame.className = 'ui-editor-nine-slice__source-frame';
  sourceImage.className = 'ui-editor-nine-slice__source-image';
  sourceImage.alt = `${entry.label} source`;
  sourceImage.draggable = false;
  sourceImage.src = entry.assetUrl;
  sourceStatus.className = 'ui-editor-nine-slice__source-size';
  sourceStatus.setAttribute('role', 'status');
  sourceStatus.textContent = 'Loading source…';
  output.className = 'ui-editor-nine-slice__output';
  output.dataset.previewOutput = 'custom';
  output.setAttribute('aria-label', `${entry.label} custom-size result`);

  for (const edge of SLICE_EDGES) {
    const guide = createSliceGuide(edge);
    guides[edge] = guide;
    sourceFrame.append(guide);
  }
  sourceFrame.prepend(sourceImage);
  customViewport.content.append(output);
  previewGrid.append(widthControl.root, heightControl.root);
  previewActions.append(ratioButton);
  previewGroup.body.append(previewGrid, previewActions);
  sliceGrid.append(
    ...SLICE_EDGES.map((edge) => sliceControls[edge].root),
  );
  sliceGroup.body.append(sliceGrid);
  utilityActions.append(resetButton, copyButton, actionStatus);
  sourcePane.body.append(
    sourceStage,
    sourceStatus,
    sourceZoom.root,
    sliceGroup.root,
    utilityActions,
  );
  previewMatrix.append(
    ...previewCases.map((previewCase) => previewCase.root),
  );
  customHeader.append(customTitle, customDescription);
  customTester.append(
    customHeader,
    previewGroup.root,
    customZoom.root,
    customViewport.root,
  );
  const previewTabs = createEditorTabs(
    'Nine-slice preview modes',
    [
      {
        id: 'cases',
        label: 'Preview cases',
        panel: previewMatrix,
      },
      {
        id: 'custom',
        label: 'Custom testing',
        panel: customTester,
      },
    ],
    (selectedId) => {
      if (selectedId === 'custom') {
        customViewport.refresh();
        return;
      }
      refreshPreviewCaseScales();
    },
  );
  outputPane.body.append(previewTabs.root);
  comparison.append(sourcePane.root, outputPane.root);
  editor.append(comparison);

  configureDimensionControl(widthControl, {
    initial: initialWidth,
    max: Math.max(MAX_PREVIEW_SIZE, initialWidth),
    min: minWidth,
  });
  configureDimensionControl(heightControl, {
    initial: initialHeight,
    max: Math.max(MAX_PREVIEW_SIZE, initialHeight),
    min: minHeight,
  });
  for (const edge of SLICE_EDGES) {
    sliceControls[edge].input.value = formatNumber(draftInsets[edge]);
    sliceControls[edge].input.disabled = true;
  }

  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };

  const updateDimensionControls = () => {
    widthControl.range.value = String(previewWidth);
    widthControl.number.value = String(previewWidth);
    heightControl.range.value = String(previewHeight);
    heightControl.number.value = String(previewHeight);
    setPreviewOutputSize(output, previewWidth, previewHeight);
    output.dataset.previewSize = `${previewWidth}x${previewHeight}`;
    output.setAttribute(
      'aria-label',
      `${entry.label} custom-size result, ${previewWidth} by `
        + `${previewHeight} pixels`,
    );
    renderNineSlicePreview(
      output,
      sourceImage,
      draftInsets,
      borderInsets,
      previewWidth,
      previewHeight,
    );
    customViewport.refresh();
  };

  const setDimensions = (nextWidth, nextHeight, changedAxis = null) => {
    let width = clampNumber(
      nextWidth,
      Number(widthControl.number.min),
      Number(widthControl.number.max),
    );
    let height = clampNumber(
      nextHeight,
      Number(heightControl.number.min),
      Number(heightControl.number.max),
    );

    if (lockedRatio && changedAxis === 'width') {
      height = clampNumber(
        Math.round(width / lockedRatio),
        Number(heightControl.number.min),
        Number(heightControl.number.max),
      );
    } else if (lockedRatio && changedAxis === 'height') {
      width = clampNumber(
        Math.round(height * lockedRatio),
        Number(widthControl.number.min),
        Number(widthControl.number.max),
      );
    }

    previewWidth = width;
    previewHeight = height;
    updateDimensionControls();
  };

  const getSliceMaximum = (edge) => {
    const isHorizontal = edge === 'left' || edge === 'right';
    const naturalSize = isHorizontal ? naturalWidth : naturalHeight;
    const opposite = {
      left: 'right',
      top: 'bottom',
      right: 'left',
      bottom: 'top',
    }[edge];

    return Math.max(0, naturalSize - draftInsets[opposite] - 1);
  };

  const updatePreviewCases = () => {
    const stretchedWidth = Math.min(
      MAX_PREVIEW_SIZE,
      minWidth + 240,
    );
    const stretchedHeight = Math.min(
      MAX_PREVIEW_SIZE,
      minHeight + 160,
    );
    const dimensions = {
      original: {
        width: minWidth,
        height: minHeight,
      },
      'height-stretched': {
        width: minWidth,
        height: stretchedHeight,
      },
      'width-stretched': {
        width: stretchedWidth,
        height: minHeight,
      },
      'both-stretched': {
        width: stretchedWidth,
        height: stretchedHeight,
      },
    };

    for (const previewCase of previewCases) {
      const size = dimensions[previewCase.id];
      setPreviewOutputSize(
        previewCase.output,
        size.width,
        size.height,
      );
      previewCase.output.dataset.previewSize =
        `${size.width}x${size.height}`;
      previewCase.output.setAttribute(
        'aria-label',
        `${entry.label} ${previewCase.label.toLowerCase()} result, `
          + `${size.width} by ${size.height} pixels`,
      );
      previewCase.size.textContent = `${size.width} × ${size.height}px`;
      renderNineSlicePreview(
        previewCase.output,
        sourceImage,
        draftInsets,
        borderInsets,
        size.width,
        size.height,
      );
    }
    refreshPreviewCaseScales();
  };

  const updateSliceGuides = () => {
    for (const previewOutput of allOutputs) {
      previewOutput.style.borderImageSlice =
        `${formatPlainInsets(draftInsets)} fill`;
    }

    if (!hasExplicitBorderInsets) {
      minWidth = Math.ceil(draftInsets.left + draftInsets.right + 1);
      minHeight = Math.ceil(draftInsets.top + draftInsets.bottom + 1);
      configureDimensionMinimum(widthControl, minWidth);
      configureDimensionMinimum(heightControl, minHeight);
      setDimensions(
        Math.max(previewWidth, minWidth),
        Math.max(previewHeight, minHeight),
      );
    }
    updatePreviewCases();

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    for (const edge of SLICE_EDGES) {
      const naturalSize =
        edge === 'left' || edge === 'right'
          ? naturalWidth
          : naturalHeight;
      const renderedSize =
        edge === 'left' || edge === 'right'
          ? sourceImage.clientWidth
          : sourceImage.clientHeight;
      const guide = guides[edge];
      const value = draftInsets[edge];
      const maximum = getSliceMaximum(edge);

      sourceFrame.style.setProperty(
        `--slice-${edge}`,
        toRenderedPixels(value, naturalSize, renderedSize),
      );
      guide.dataset.value = formatNumber(value);
      guide.setAttribute('aria-valuemax', formatNumber(maximum));
      guide.setAttribute('aria-valuenow', formatNumber(value));
      guide.setAttribute(
        'aria-valuetext',
        `${capitalize(edge)} slice ${formatNumber(value)} pixels`,
      );
      sliceControls[edge].input.max = formatNumber(maximum);
      sliceControls[edge].input.value = formatNumber(value);
    }

    sourceStatus.textContent =
      `${naturalWidth} × ${naturalHeight}px · `
        + `${Math.round(sourceViewport.getScale() * 100)}% · `
        + formatInsets(draftInsets);
  };

  const setSlice = (edge, nextValue) => {
    if (!Number.isFinite(Number(nextValue)) || !naturalWidth) {
      return;
    }

    draftInsets[edge] = clampNumber(
      nextValue,
      0,
      getSliceMaximum(edge),
      2,
    );
    updateSliceGuides();
  };

  const updateSliceFromPointer = (edge, event) => {
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const rect = sourceImage.getBoundingClientRect();
    const isHorizontal = edge === 'left' || edge === 'right';
    const renderedSize = isHorizontal ? rect.width : rect.height;

    if (!renderedSize) {
      return;
    }

    const pointerPosition = isHorizontal
      ? event.clientX - rect.left
      : event.clientY - rect.top;
    const naturalSize = isHorizontal ? naturalWidth : naturalHeight;
    const sourcePosition =
      clampNumber(pointerPosition, 0, renderedSize) / renderedSize
      * naturalSize;
    const nextValue =
      edge === 'right' || edge === 'bottom'
        ? naturalSize - sourcePosition
        : sourcePosition;

    setSlice(edge, Math.round(nextValue));
  };

  const onSourceLoad = () => {
    naturalWidth = sourceImage.naturalWidth;
    naturalHeight = sourceImage.naturalHeight;
    if (!hasInitialInsets) {
      Object.assign(
        originalInsets,
        createDefaultInsets(naturalWidth, naturalHeight),
      );
      Object.assign(draftInsets, originalInsets);
    }
    delete sourceStatus.dataset.error;
    configureDimensionMaximum(
      widthControl,
      Math.max(MAX_PREVIEW_SIZE, naturalWidth * 4, previewWidth),
    );
    configureDimensionMaximum(
      heightControl,
      Math.max(MAX_PREVIEW_SIZE, naturalHeight * 4, previewHeight),
    );
    for (const edge of SLICE_EDGES) {
      sliceControls[edge].input.disabled = false;
    }
    sourceViewport.fit();
    updateSliceGuides();
  };

  const onSourceError = () => {
    sourceStatus.dataset.error = 'true';
    sourceStatus.textContent = 'Asset failed to load.';
  };

  for (const [axis, control] of [
    ['width', widthControl],
    ['height', heightControl],
  ]) {
    const updateFromRange = () => {
      setDimensions(
        axis === 'width' ? control.range.value : previewWidth,
        axis === 'height' ? control.range.value : previewHeight,
        axis,
      );
    };
    const updateFromNumber = () => {
      if (control.number.value === '') {
        return;
      }
      setDimensions(
        axis === 'width' ? control.number.value : previewWidth,
        axis === 'height' ? control.number.value : previewHeight,
        axis,
      );
    };
    listen(control.range, 'input', updateFromRange);
    listen(control.number, 'input', updateFromNumber);
    listen(control.number, 'change', updateFromNumber);
  }

  for (const edge of SLICE_EDGES) {
    const control = sliceControls[edge];
    const guide = guides[edge];

    listen(control.input, 'input', () => {
      if (control.input.value !== '') {
        setSlice(edge, control.input.value);
      }
    });
    listen(control.input, 'change', () => {
      setSlice(edge, control.input.value || draftInsets[edge]);
    });
    listen(guide, 'pointerdown', (event) => {
      activeGuide = { edge, pointerId: event.pointerId };
      guide.dataset.dragging = 'true';
      guide.setPointerCapture?.(event.pointerId);
      updateSliceFromPointer(edge, event);
      event.preventDefault();
    });
    listen(guide, 'keydown', (event) => {
      const step = event.shiftKey ? 10 : 1;
      let nextValue = null;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextValue = draftInsets[edge] - step;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextValue = draftInsets[edge] + step;
      } else if (event.key === 'Home') {
        nextValue = 0;
      } else if (event.key === 'End') {
        nextValue = getSliceMaximum(edge);
      }

      if (nextValue !== null) {
        setSlice(edge, nextValue);
        event.preventDefault();
      }
    });
  }

  listen(window, 'pointermove', (event) => {
    if (activeGuide?.pointerId === event.pointerId) {
      updateSliceFromPointer(activeGuide.edge, event);
    }
  });
  const finishGuideDrag = (event) => {
    if (activeGuide?.pointerId !== event.pointerId) {
      return;
    }
    delete guides[activeGuide.edge].dataset.dragging;
    activeGuide = null;
  };
  listen(window, 'pointerup', finishGuideDrag);
  listen(window, 'pointercancel', finishGuideDrag);

  listen(ratioButton, 'click', () => {
    lockedRatio = lockedRatio ? null : previewWidth / previewHeight;
    ratioButton.setAttribute('aria-pressed', String(Boolean(lockedRatio)));
    ratioButton.dataset.active = String(Boolean(lockedRatio));
  });
  listen(resetButton, 'click', () => {
    Object.assign(draftInsets, originalInsets);
    lockedRatio = null;
    ratioButton.setAttribute('aria-pressed', 'false');
    ratioButton.dataset.active = 'false';
    actionStatus.textContent = '';
    setDimensions(initialWidth, initialHeight);
    updateSliceGuides();
  });
  listen(copyButton, 'click', async () => {
    try {
      await copyText(createCssSnippet(entry.assetUrl, draftInsets, borderInsets));
      actionStatus.dataset.tone = 'success';
      actionStatus.textContent = 'CSS copied';
    } catch {
      actionStatus.dataset.tone = 'error';
      actionStatus.textContent = 'Copy failed';
    }
  });
  listen(sourceImage, 'load', onSourceLoad);
  listen(sourceImage, 'error', onSourceError);

  updateDimensionControls();
  updateSliceGuides();
  customZoom.fit();

  return {
    root: editor,
    getOutputInsets: () => ({ ...borderInsets }),
    getSourceInsets: () =>
      naturalWidth && naturalHeight
        ? { ...draftInsets }
        : null,
    dispose: () => {
      previewTabs.dispose();
      sourceZoom.dispose();
      sourceViewport.dispose();
      customZoom.dispose();
      customViewport.dispose();
      for (const previewCase of previewCases) {
        previewCase.viewport.dispose();
      }
      for (const cleanup of listeners) {
        cleanup();
      }
    },
  };
}

function createSliceSourceViewport(
  label,
  sourceImage,
  sourceFrame,
  onViewChange = () => {},
) {
  const root = document.createElement('div');
  const listeners = [];
  const zoomListeners = new Set();
  const pan = { x: 0, y: 0 };
  let zoom = 1;
  let activePointer = null;
  let resizeObserver = null;

  root.className =
    'ui-editor-nine-slice__source-stage '
    + 'ui-editor-pan-zoom-viewport ui-editor-checkerboard';
  root.dataset.uiEditorComponent = 'EditorSliceSourceViewport';
  root.dataset.zoom = '1';
  root.setAttribute(
    'aria-label',
    `${label}. Drag or use arrow keys to move. Scroll or use plus and minus `
      + 'to zoom.',
  );
  root.setAttribute('role', 'region');
  root.tabIndex = 0;
  root.append(sourceFrame);

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const getFitScale = () => {
    const naturalWidth = sourceImage.naturalWidth;
    const naturalHeight = sourceImage.naturalHeight;
    const availableWidth = root.clientWidth - 32;
    const availableHeight = root.clientHeight - 32;

    if (
      !naturalWidth
      || !naturalHeight
      || availableWidth <= 0
      || availableHeight <= 0
    ) {
      return 1;
    }

    return Math.max(
      0.01,
      Math.min(
        availableWidth / naturalWidth,
        availableHeight / naturalHeight,
      ),
    );
  };
  const getScale = () => getFitScale() * zoom;
  const applyTransform = () => {
    const naturalWidth = sourceImage.naturalWidth;
    const naturalHeight = sourceImage.naturalHeight;
    const scale = getScale();

    if (naturalWidth && naturalHeight) {
      const renderedWidth = Math.max(1, naturalWidth * scale);
      const renderedHeight = Math.max(1, naturalHeight * scale);
      const frameWidth = renderedWidth + 16;
      const frameHeight = renderedHeight + 16;
      const visibleEdge = 28;
      const maxPanX = Math.max(
        0,
        (frameWidth - root.clientWidth) / 2 + visibleEdge,
      );
      const maxPanY = Math.max(
        0,
        (frameHeight - root.clientHeight) / 2 + visibleEdge,
      );

      pan.x = clampNumber(pan.x, -maxPanX, maxPanX, 2);
      pan.y = clampNumber(pan.y, -maxPanY, maxPanY, 2);
      sourceImage.style.width = `${formatNumber(renderedWidth)}px`;
      sourceImage.style.height = `${formatNumber(renderedHeight)}px`;
      sourceImage.style.imageRendering = scale >= 1 ? 'pixelated' : 'auto';
    }

    sourceFrame.style.transform =
      `translate(calc(-50% + ${pan.x}px), `
        + `calc(-50% + ${pan.y}px))`;
    root.dataset.zoom = formatNumber(zoom);
    root.dataset.scale = formatNumber(scale);
    onViewChange();
  };
  const notifyZoom = () => {
    for (const listener of zoomListeners) {
      listener(zoom);
    }
  };
  const setZoomAt = (nextZoom, clientX, clientY) => {
    const previousScale = getScale();
    const next = clampNumber(nextZoom, 0.125, 8, 3);
    const nextScale = getFitScale() * next;
    const rect = root.getBoundingClientRect();
    const pointX = Number.isFinite(clientX)
      ? clientX - rect.left - rect.width / 2
      : 0;
    const pointY = Number.isFinite(clientY)
      ? clientY - rect.top - rect.height / 2
      : 0;

    if (previousScale > 0) {
      const scaleRatio = nextScale / previousScale;
      pan.x = pointX - (pointX - pan.x) * scaleRatio;
      pan.y = pointY - (pointY - pan.y) * scaleRatio;
    }
    zoom = next;
    applyTransform();
    notifyZoom();
  };
  const moveBy = (deltaX, deltaY) => {
    pan.x += deltaX;
    pan.y += deltaY;
    applyTransform();
  };
  const finishPan = (event) => {
    if (activePointer?.pointerId !== event.pointerId) {
      return;
    }
    activePointer = null;
    delete root.dataset.panning;
  };

  listen(root, 'pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('[data-slice-guide]')) {
      return;
    }
    activePointer = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    root.dataset.panning = 'true';
    root.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  listen(window, 'pointermove', (event) => {
    if (activePointer?.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - activePointer.pointerX;
    const deltaY = event.clientY - activePointer.pointerY;

    activePointer.pointerX = event.clientX;
    activePointer.pointerY = event.clientY;
    moveBy(deltaX, deltaY);
  });
  listen(window, 'pointerup', finishPan);
  listen(window, 'pointercancel', finishPan);
  listen(root, 'keydown', (event) => {
    const step = event.shiftKey ? 48 : 16;
    const movement = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[event.key];

    if (movement) {
      moveBy(...movement);
      event.preventDefault();
    } else if (event.key === '+' || event.key === '=') {
      setZoomAt(zoom * 1.25);
      event.preventDefault();
    } else if (event.key === '-' || event.key === '_') {
      setZoomAt(zoom / 1.25);
      event.preventDefault();
    } else if (event.key === 'Home' || event.key === '0') {
      zoom = 1;
      pan.x = 0;
      pan.y = 0;
      applyTransform();
      notifyZoom();
      event.preventDefault();
    }
  });

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(applyTransform);
    resizeObserver.observe(root);
  }

  return {
    root,
    fit: () => {
      zoom = 1;
      pan.x = 0;
      pan.y = 0;
      applyTransform();
      notifyZoom();
    },
    getScale,
    getZoom: () => zoom,
    moveBy,
    refresh: applyTransform,
    setZoom: (nextZoom) => setZoomAt(nextZoom),
    setZoomAt,
    subscribeZoom: (listener) => {
      zoomListeners.add(listener);
      return () => zoomListeners.delete(listener);
    },
    dispose: () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      zoomListeners.clear();
      for (const cleanup of listeners) {
        cleanup();
      }
    },
  };
}

export function createPanZoomViewport(
  label,
  { panEnabled: initialPanEnabled = true } = {},
) {
  const root = document.createElement('div');
  const content = document.createElement('div');
  const listeners = [];
  const zoomListeners = new Set();
  const pan = { x: 0, y: 0 };
  let zoom = 1;
  let panEnabled = initialPanEnabled === true;
  let activePointer = null;
  let resizeObserver = null;

  root.className =
    'ui-editor-pan-zoom-viewport ui-editor-checkerboard';
  root.dataset.uiEditorComponent = 'EditorPanZoomViewport';
  root.dataset.panEnabled = String(panEnabled);
  root.dataset.zoom = '1';
  root.setAttribute('aria-label', `${label}. Drag or use arrow keys to move.`);
  root.setAttribute('role', 'region');
  root.tabIndex = 0;
  content.className = 'ui-editor-pan-zoom-viewport__content';
  root.append(content);

  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };
  const getFitScale = () => {
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;
    const availableWidth = Math.max(1, root.clientWidth - 16);
    const availableHeight = Math.max(1, root.clientHeight - 16);

    if (!contentWidth || !contentHeight) {
      return 1;
    }
    return Math.min(
      1,
      availableWidth / contentWidth,
      availableHeight / contentHeight,
    );
  };
  const applyTransform = () => {
    const scale = getFitScale() * zoom;
    const visibleEdge = 28;
    const scaledWidth = content.offsetWidth * scale;
    const scaledHeight = content.offsetHeight * scale;
    const maxPanX = Math.max(
      0,
      (root.clientWidth + scaledWidth) / 2 - visibleEdge,
    );
    const maxPanY = Math.max(
      0,
      (root.clientHeight + scaledHeight) / 2 - visibleEdge,
    );

    pan.x = clampNumber(pan.x, -maxPanX, maxPanX);
    pan.y = clampNumber(pan.y, -maxPanY, maxPanY);
    content.style.transform =
      `translate(calc(-50% + ${pan.x}px), `
        + `calc(-50% + ${pan.y}px)) scale(${scale})`;
    root.dataset.zoom = formatNumber(zoom);
  };
  const moveBy = (deltaX, deltaY) => {
    pan.x += deltaX;
    pan.y += deltaY;
    applyTransform();
  };
  const center = () => {
    pan.x = 0;
    pan.y = 0;
    applyTransform();
  };
  const notifyZoom = () => {
    for (const listener of zoomListeners) {
      listener(zoom);
    }
  };
  const setZoomAt = (nextZoom, clientX, clientY) => {
    const fitScale = getFitScale();
    const previousScale = fitScale * zoom;
    const next = clampNumber(nextZoom, 0.125, 8, 3);
    const nextScale = fitScale * next;
    const rect = root.getBoundingClientRect();
    const pointX = Number.isFinite(clientX)
      ? clientX - rect.left - rect.width / 2
      : 0;
    const pointY = Number.isFinite(clientY)
      ? clientY - rect.top - rect.height / 2
      : 0;

    if (previousScale > 0) {
      const scaleRatio = nextScale / previousScale;
      pan.x = pointX - (pointX - pan.x) * scaleRatio;
      pan.y = pointY - (pointY - pan.y) * scaleRatio;
    }
    zoom = next;
    applyTransform();
    notifyZoom();
  };
  const finishPan = (event) => {
    if (activePointer?.pointerId !== event.pointerId) {
      return;
    }
    activePointer = null;
    delete root.dataset.panning;
  };

  listen(root, 'pointerdown', (event) => {
    if (
      (!panEnabled || event.button !== 0)
      || event.target.closest('[data-slice-guide], button, input')
    ) {
      return;
    }
    activePointer = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    root.dataset.panning = 'true';
    root.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  listen(window, 'pointermove', (event) => {
    if (activePointer?.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - activePointer.pointerX;
    const deltaY = event.clientY - activePointer.pointerY;

    activePointer.pointerX = event.clientX;
    activePointer.pointerY = event.clientY;
    moveBy(deltaX, deltaY);
  });
  listen(window, 'pointerup', finishPan);
  listen(window, 'pointercancel', finishPan);
  listen(root, 'keydown', (event) => {
    const step = event.shiftKey ? 48 : 16;
    const movement = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[event.key];

    if (movement) {
      moveBy(...movement);
      event.preventDefault();
    } else if (event.key === 'Home') {
      center();
      event.preventDefault();
    } else if (event.key === '+' || event.key === '=') {
      setZoomAt(zoom * 1.25);
      event.preventDefault();
    } else if (event.key === '-' || event.key === '_') {
      setZoomAt(zoom / 1.25);
      event.preventDefault();
    }
  });

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(applyTransform);
    resizeObserver.observe(root);
    resizeObserver.observe(content);
  }

  return {
    center,
    content,
    root,
    fit: () => {
      zoom = 1;
      pan.x = 0;
      pan.y = 0;
      applyTransform();
      notifyZoom();
    },
    getZoom: () => zoom,
    moveBy,
    refresh: applyTransform,
    setZoom: (nextZoom) => setZoomAt(nextZoom),
    setZoomAt,
    setPanEnabled: (enabled) => {
      panEnabled = enabled === true;
      root.dataset.panEnabled = String(panEnabled);
      if (!panEnabled) {
        activePointer = null;
        delete root.dataset.panning;
      }
      return panEnabled;
    },
    subscribeZoom: (listener) => {
      zoomListeners.add(listener);
      return () => zoomListeners.delete(listener);
    },
    dispose: () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      zoomListeners.clear();
      for (const cleanup of listeners) {
        cleanup();
      }
    },
  };
}

export function createViewportZoomControls(
  label,
  viewports,
  {
    centerLabel = null,
    fitLabel = 'Fit',
    showHint = true,
  } = {},
) {
  const root = document.createElement('div');
  const hint = document.createElement('span');
  const zoomOut = document.createElement('button');
  const status = document.createElement('output');
  const zoomIn = document.createElement('button');
  const fit = document.createElement('button');
  const center = document.createElement('button');
  const listeners = [];
  const zoomSubscriptions = [];
  let zoom = 1;

  root.className = 'ui-editor-pan-zoom-controls';
  hint.className = 'ui-editor-pan-zoom-controls__hint';
  hint.textContent = 'Drag to move · Scroll to zoom';
  hint.hidden = showHint !== true;
  zoomOut.className = 'ui-editor-pan-zoom-controls__button';
  zoomOut.type = 'button';
  zoomOut.textContent = '−';
  zoomOut.setAttribute('aria-label', `${label} zoom out`);
  status.className = 'ui-editor-pan-zoom-controls__status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = '100%';
  zoomIn.className = 'ui-editor-pan-zoom-controls__button';
  zoomIn.type = 'button';
  zoomIn.textContent = '+';
  zoomIn.setAttribute('aria-label', `${label} zoom in`);
  fit.className = 'ui-editor-pan-zoom-controls__button';
  fit.type = 'button';
  fit.textContent = fitLabel ?? '';
  fit.setAttribute('aria-label', `Fit ${label.toLowerCase()} to view`);
  center.className = 'ui-editor-pan-zoom-controls__button';
  center.type = 'button';
  center.textContent = centerLabel ?? '';
  center.setAttribute('aria-label', `Center ${label.toLowerCase()}`);
  root.append(hint, zoomOut, status, zoomIn);
  if (fitLabel) {
    root.append(fit);
  }
  if (centerLabel) {
    root.append(center);
  }

  const updateStatus = (nextZoom) => {
    zoom = nextZoom;
    status.textContent = `${Math.round(zoom * 100)}%`;
  };
  const applyZoom = (nextZoom) => {
    zoom = clampNumber(nextZoom, 0.125, 8, 3);
    for (const viewport of viewports) {
      viewport.setZoom(zoom);
    }
    updateStatus(viewports[0]?.getZoom?.() ?? zoom);
  };
  const onZoomOut = () => applyZoom(zoom / 1.25);
  const onZoomIn = () => applyZoom(zoom * 1.25);
  const onFit = () => {
    zoom = 1;
    for (const viewport of viewports) {
      viewport.fit();
    }
    updateStatus(viewports[0]?.getZoom?.() ?? 1);
  };
  const onCenter = () => {
    for (const viewport of viewports) {
      viewport.center?.();
    }
  };
  const onWheel = (event) => {
    const delta = event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * 120
        : event.deltaY;
    const nextZoom = clampNumber(
      zoom * Math.exp(-delta * 0.0015),
      0.125,
      8,
      3,
    );

    for (const viewport of viewports) {
      viewport.setZoomAt(nextZoom, event.clientX, event.clientY);
    }
    updateStatus(viewports[0]?.getZoom?.() ?? nextZoom);
    event.preventDefault();
  };

  zoomOut.addEventListener('click', onZoomOut);
  zoomIn.addEventListener('click', onZoomIn);
  fit.addEventListener('click', onFit);
  center.addEventListener('click', onCenter);
  listeners.push(
    () => zoomOut.removeEventListener('click', onZoomOut),
    () => zoomIn.removeEventListener('click', onZoomIn),
    () => fit.removeEventListener('click', onFit),
    () => center.removeEventListener('click', onCenter),
  );
  for (const viewport of viewports) {
    viewport.root.addEventListener('wheel', onWheel, { passive: false });
    listeners.push(() => viewport.root.removeEventListener(
      'wheel',
      onWheel,
      { passive: false },
    ));
    if (viewport.subscribeZoom) {
      zoomSubscriptions.push(viewport.subscribeZoom(updateStatus));
    }
  }

  return {
    root,
    fit: onFit,
    dispose: () => {
      for (const cleanup of listeners) {
        cleanup();
      }
      for (const unsubscribe of zoomSubscriptions) {
        unsubscribe();
      }
    },
  };
}

function createNineSlicePreviewCase(entry, previewCase) {
  const root = document.createElement('section');
  const header = document.createElement('div');
  const heading = document.createElement('div');
  const title = document.createElement('h4');
  const description = document.createElement('span');
  const size = document.createElement('span');
  const viewport = createFixedPreviewViewport(
    `${entry.label} ${previewCase.label.toLowerCase()} preview`,
  );
  const output = document.createElement('canvas');

  root.className = 'ui-editor-nine-slice__preview-case';
  root.dataset.previewCase = previewCase.id;
  header.className = 'ui-editor-nine-slice__preview-case-header';
  heading.className = 'ui-editor-nine-slice__preview-case-heading';
  title.className = 'ui-editor-nine-slice__preview-case-title';
  title.textContent = previewCase.label;
  description.className =
    'ui-editor-nine-slice__preview-case-description';
  description.textContent = previewCase.description;
  size.className = 'ui-editor-nine-slice__preview-case-size';
  output.className = 'ui-editor-nine-slice__output';
  output.dataset.previewOutput = previewCase.id;
  heading.append(title, description);
  header.append(heading, size);
  viewport.content.append(output);
  root.append(header, viewport.root);

  return {
    ...previewCase,
    output,
    root,
    size,
    viewport,
  };
}

function setPreviewOutputSize(output, width, height) {
  output.style.width = `${width}px`;
  output.style.height = `${height}px`;
}

function renderNineSlicePreview(
  output,
  image,
  sourceInsets,
  outputInsets,
  width,
  height,
) {
  if (
    typeof window.CanvasRenderingContext2D !== 'function'
    || !image.naturalWidth
    || !image.naturalHeight
  ) {
    return;
  }
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const renderWidth = Math.max(1, Math.round(width));
  const renderHeight = Math.max(1, Math.round(height));

  output.width = Math.round(renderWidth * pixelRatio);
  output.height = Math.round(renderHeight * pixelRatio);
  const context = output.getContext('2d');
  if (!context) {
    return;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, renderWidth, renderHeight);
  context.imageSmoothingEnabled = true;

  const source = resolveNineSliceAxis(
    image.naturalWidth,
    sourceInsets.left,
    sourceInsets.right,
  );
  const sourceVertical = resolveNineSliceAxis(
    image.naturalHeight,
    sourceInsets.top,
    sourceInsets.bottom,
  );
  const target = resolveNineSliceAxis(
    renderWidth,
    outputInsets.left,
    outputInsets.right,
  );
  const targetVertical = resolveNineSliceAxis(
    renderHeight,
    outputInsets.top,
    outputInsets.bottom,
  );

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const sourceWidth = source[column + 1] - source[column];
      const sourceHeight =
        sourceVertical[row + 1] - sourceVertical[row];
      const targetWidth = target[column + 1] - target[column];
      const targetHeight =
        targetVertical[row + 1] - targetVertical[row];

      if (
        sourceWidth <= 0
        || sourceHeight <= 0
        || targetWidth <= 0
        || targetHeight <= 0
      ) {
        continue;
      }
      context.drawImage(
        image,
        source[column],
        sourceVertical[row],
        sourceWidth,
        sourceHeight,
        target[column],
        targetVertical[row],
        targetWidth,
        targetHeight,
      );
    }
  }
}

function resolveNineSliceAxis(size, leading, trailing) {
  const resolvedSize = Math.max(1, Math.round(size));
  let resolvedLeading = clampNumber(
    Math.round(leading),
    0,
    resolvedSize - 1,
  );
  let resolvedTrailing = clampNumber(
    Math.round(trailing),
    0,
    resolvedSize - resolvedLeading,
  );

  if (resolvedLeading + resolvedTrailing > resolvedSize) {
    const scale = resolvedSize / (resolvedLeading + resolvedTrailing);
    resolvedLeading = Math.floor(resolvedLeading * scale);
    resolvedTrailing = resolvedSize - resolvedLeading;
  }

  return [
    0,
    resolvedLeading,
    resolvedSize - resolvedTrailing,
    resolvedSize,
  ];
}

export function createEditorTabs(label, tabs, onChange = () => {}) {
  const root = document.createElement('div');
  const tabList = document.createElement('div');
  const panels = document.createElement('div');
  const listeners = [];
  const instanceId = ++editorTabSetId;
  const entries = tabs.map((tab, index) => {
    const button = document.createElement('button');
    const tabId = `ui-editor-tab-${instanceId}-${tab.id}`;
    const panelId = `ui-editor-tab-panel-${instanceId}-${tab.id}`;

    button.className = 'ui-editor-tabs__tab';
    button.type = 'button';
    button.id = tabId;
    button.dataset.editorTab = tab.id;
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('role', 'tab');
    button.textContent = tab.label;
    tab.panel.classList.add('ui-editor-tabs__panel');
    tab.panel.id = panelId;
    tab.panel.dataset.editorTabPanel = tab.id;
    tab.panel.setAttribute('aria-labelledby', tabId);
    tab.panel.setAttribute('role', 'tabpanel');
    tabList.append(button);
    panels.append(tab.panel);
    return {
      ...tab,
      button,
      index,
    };
  });
  let selectedIndex = 0;

  root.className = 'ui-editor-tabs';
  root.dataset.uiEditorComponent = 'EditorTabs';
  tabList.className = 'ui-editor-tabs__list';
  tabList.setAttribute('aria-label', label);
  tabList.setAttribute('role', 'tablist');
  panels.className = 'ui-editor-tabs__panels';
  root.append(tabList, panels);

  const select = (nextIndex, { focus = false } = {}) => {
    selectedIndex = (nextIndex + entries.length) % entries.length;
    for (const entry of entries) {
      const selected = entry.index === selectedIndex;

      entry.button.setAttribute('aria-selected', String(selected));
      entry.button.tabIndex = selected ? 0 : -1;
      entry.panel.hidden = !selected;
    }
    if (focus) {
      entries[selectedIndex].button.focus();
    }
    onChange(entries[selectedIndex].id);
  };
  const onKeyDown = (event) => {
    const movement = {
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: -selectedIndex,
      End: entries.length - 1 - selectedIndex,
    }[event.key];

    if (movement === undefined) {
      return;
    }
    select(selectedIndex + movement, { focus: true });
    event.preventDefault();
  };

  for (const entry of entries) {
    const onClick = () => select(entry.index);
    entry.button.addEventListener('click', onClick);
    listeners.push(
      () => entry.button.removeEventListener('click', onClick),
    );
  }
  tabList.addEventListener('keydown', onKeyDown);
  listeners.push(() => tabList.removeEventListener('keydown', onKeyDown));
  select(0);

  return {
    root,
    select: (id) => {
      const nextIndex = entries.findIndex((entry) => entry.id === id);
      if (nextIndex >= 0) {
        select(nextIndex);
      }
    },
    dispose: () => {
      for (const cleanup of listeners) {
        cleanup();
      }
    },
  };
}

function createFixedPreviewViewport(label) {
  const root = document.createElement('div');
  const content = document.createElement('div');
  let refreshHandler = null;
  let resizeObserver = null;

  root.className =
    'ui-editor-fixed-preview-viewport ui-editor-checkerboard';
  root.setAttribute('aria-label', label);
  root.setAttribute('role', 'region');
  content.className = 'ui-editor-fixed-preview-viewport__content';
  root.append(content);

  const getFitScale = () => {
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;
    const availableWidth = Math.max(1, root.clientWidth - 16);
    const availableHeight = Math.max(1, root.clientHeight - 16);
    return contentWidth && contentHeight
      ? Math.min(
        1,
        availableWidth / contentWidth,
        availableHeight / contentHeight,
      )
      : 1;
  };

  const refresh = (scale = getFitScale()) => {
    content.style.transform =
      `translate(-50%, -50%) scale(${scale})`;
  };

  const refreshFromResize = () => {
    if (refreshHandler) {
      refreshHandler();
      return;
    }
    refresh();
  };

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(refreshFromResize);
    resizeObserver.observe(root);
    resizeObserver.observe(content);
  }

  return {
    content,
    getFitScale,
    root,
    refresh,
    setRefreshHandler: (handler) => {
      refreshHandler = handler;
    },
    dispose: () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      refreshHandler = null;
    },
  };
}

function createPane(label) {
  const root = document.createElement('section');
  const title = document.createElement('h3');
  const body = document.createElement('div');

  root.className = 'ui-editor-nine-slice__pane';
  title.className = 'ui-editor-nine-slice__pane-title';
  title.textContent = label;
  body.className = 'ui-editor-nine-slice__pane-body';
  root.append(title, body);
  return { body, root };
}

function createControlGroup(label) {
  const root = document.createElement('section');
  const title = document.createElement('h3');
  const body = document.createElement('div');

  root.className = 'ui-editor-nine-slice__control-group';
  title.className = 'ui-editor-nine-slice__group-title';
  title.textContent = label;
  body.className = 'ui-editor-nine-slice__group-body';
  root.append(title, body);
  return { body, root };
}

function createDimensionControl(id, label) {
  const root = document.createElement('label');
  const name = document.createElement('span');
  const range = document.createElement('input');
  const numberWrap = document.createElement('span');
  const number = document.createElement('input');
  const unit = document.createElement('span');

  root.className = 'ui-editor-nine-slice__dimension-control';
  name.textContent = label;
  range.type = 'range';
  range.setAttribute('aria-label', `${label} slider`);
  numberWrap.className = 'ui-editor-nine-slice__number-wrap';
  number.className = 'ui-editor-nine-slice__number';
  number.dataset.dimension = id;
  number.inputMode = 'numeric';
  number.type = 'number';
  number.setAttribute('aria-label', `${label} in pixels`);
  unit.className = 'ui-editor-nine-slice__unit';
  unit.textContent = 'px';
  numberWrap.append(number, unit);
  root.append(name, range, numberWrap);
  return { number, range, root };
}

function createMarginControl(id, label) {
  const root = document.createElement('label');
  const name = document.createElement('span');
  const input = document.createElement('input');
  const unit = document.createElement('span');

  root.className = 'ui-editor-nine-slice__margin-control';
  name.textContent = label;
  input.className = 'ui-editor-nine-slice__margin-input';
  input.dataset.sliceEdge = id;
  input.inputMode = 'decimal';
  input.min = '0';
  input.step = '1';
  input.type = 'number';
  input.setAttribute('aria-label', `${label} slice margin in pixels`);
  unit.className = 'ui-editor-nine-slice__unit';
  unit.textContent = 'px';
  root.append(name, input, unit);
  return { input, root };
}

function createActionButton(label, action) {
  const button = document.createElement('button');

  button.className = 'ui-editor-nine-slice__action';
  button.dataset.nineSliceAction = action;
  button.type = 'button';
  button.textContent = label;
  if (action === 'ratio') {
    button.setAttribute('aria-pressed', 'false');
    button.dataset.active = 'false';
  }
  return button;
}

function createSliceGuide(edge) {
  const guide = document.createElement('span');

  guide.className =
    `ui-editor-nine-slice__guide ui-editor-nine-slice__guide--${edge}`;
  guide.dataset.sliceGuide = edge;
  guide.setAttribute('aria-label', `${capitalize(edge)} slice guide`);
  guide.setAttribute(
    'aria-orientation',
    edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical',
  );
  guide.setAttribute('aria-valuemin', '0');
  guide.setAttribute('role', 'slider');
  guide.tabIndex = 0;
  return guide;
}

function configureDimensionControl(control, { initial, max, min }) {
  for (const input of [control.range, control.number]) {
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(initial);
  }
}

function configureDimensionMaximum(control, max) {
  control.range.max = String(max);
  control.number.max = String(max);
}

function configureDimensionMinimum(control, min) {
  control.range.min = String(min);
  control.number.min = String(min);
}

function formatInsets(insets) {
  return [
    `L ${formatNumber(insets.left)}`,
    `T ${formatNumber(insets.top)}`,
    `R ${formatNumber(insets.right)}`,
    `B ${formatNumber(insets.bottom)}`,
  ].join(' · ');
}

function formatCssInsets(insets) {
  return [
    `${formatNumber(insets.top)}px`,
    `${formatNumber(insets.right)}px`,
    `${formatNumber(insets.bottom)}px`,
    `${formatNumber(insets.left)}px`,
  ].join(' ');
}

function formatPlainInsets(insets) {
  return [
    formatNumber(insets.top),
    formatNumber(insets.right),
    formatNumber(insets.bottom),
    formatNumber(insets.left),
  ].join(' ');
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2);
}

function normalizeInsets(insets) {
  const normalized = insets ?? {};

  return {
    left: Number(normalized.left) || 0,
    top: Number(normalized.top) || 0,
    right: Number(normalized.right) || 0,
    bottom: Number(normalized.bottom) || 0,
  };
}

function createDefaultInsets(width, height) {
  return {
    left: Math.floor(width / 4),
    top: Math.floor(height / 4),
    right: Math.floor(width / 4),
    bottom: Math.floor(height / 4),
  };
}

function clampNumber(value, min, max, precision = 0) {
  const numericValue = Number(value);
  const clamped = Math.min(max, Math.max(min, numericValue));
  const factor = 10 ** precision;

  return Math.round(clamped * factor) / factor;
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function createCssSnippet(assetUrl, sourceInsets, borderInsets) {
  return [
    `border-image-source: url("${assetUrl}");`,
    `border-image-slice: ${formatPlainInsets(sourceInsets)} fill;`,
    `border-image-width: ${formatCssInsets(borderInsets)};`,
    'border-image-repeat: stretch;',
  ].join('\n');
}

async function copyText(value) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard access is unavailable.');
  }
}

function createHeaderButton(
  label,
  { danger = false, primary = false } = {},
) {
  const button = document.createElement('button');

  button.className = 'ui-editor-asset-workbench__action';
  button.type = 'button';
  button.textContent = label;
  if (primary) {
    button.dataset.primary = 'true';
  }
  if (danger) {
    button.dataset.danger = 'true';
  }
  return button;
}

function canConvertToNineSlice(entry) {
  return (
    entry.assetId?.startsWith('source:')
    && /\.png$/i.test(entry.assetId)
  );
}

function canSaveNineSlice(entry) {
  return entry.nineSlice === true && canConvertToNineSlice(entry);
}

function canDeleteAsset(entry) {
  return entry.assetId?.startsWith('source:') === true;
}

export async function saveUiEditorNineSlice(
  assetId,
  slice,
  {
    fetchImpl = globalThis.fetch,
    outputInsets = slice,
  } = {},
) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('The local editor server is unavailable.');
  }

  const response = await fetchImpl(NINE_SLICE_SAVE_ROUTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assetId, outputInsets, slice }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Could not save nine-slice metadata.');
  }

  return result;
}

export function consumePendingNineSliceSelection() {
  const storage = resolveSessionStorage();

  if (!storage) {
    return null;
  }

  try {
    const pending = JSON.parse(
      storage.getItem(UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY),
    );
    storage.removeItem(UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY);

    if (
      typeof pending?.entryId !== 'string'
      || typeof pending?.metadataPath !== 'string'
    ) {
      return null;
    }
    return pending;
  } catch {
    storage.removeItem(UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY);
    return null;
  }
}

function storePendingNineSliceSelection(pending) {
  try {
    resolveSessionStorage()?.setItem(
      UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY,
      JSON.stringify(pending),
    );
  } catch {
    // The save still works when session storage is unavailable.
  }
}

function clearPendingNineSliceSelection() {
  try {
    resolveSessionStorage()?.removeItem(
      UI_EDITOR_PENDING_NINE_SLICE_STORAGE_KEY,
    );
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

function resolveSessionStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function resolveNineSliceMetadataPath(assetId) {
  return resolveNineSliceAssetId(assetId)
    .replace(/^source:assets\//, 'assets/game/source/')
    .replace(/\.png$/i, '.9slice.json');
}

function resolveNineSliceAssetId(assetId) {
  const normalized = String(assetId ?? '');

  return /\.9\.png$/i.test(normalized)
    ? normalized
    : normalized.replace(/\.png$/i, '.9.png');
}

function toRenderedPixels(value, naturalSize, renderedSize) {
  return `${
    (Number(value) / Math.max(1, Number(naturalSize))) * Number(renderedSize)
  }px`;
}
