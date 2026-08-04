const ASSET_ROUTE = '/__idle-wizard-ui-editor/asset';

export function createUiEditorAssetDeletionDialog({
  assetEntries = [],
  entry,
  fetchImpl = globalThis.fetch,
  onDeleted = () => {},
  opener = null,
} = {}) {
  const dialog = document.createElement('dialog');
  const surface = document.createElement('div');
  const header = document.createElement('header');
  const content = document.createElement('div');
  const heading = document.createElement('h2');
  const closeButton = createButton('Close');
  const target = createAssetTarget(entry);
  const warning = document.createElement('p');
  const usageSection = createSection('Visual usages');
  const usageList = document.createElement('ul');
  const referenceSection = createSection('Source references');
  const referenceStatus = document.createElement('p');
  const referenceList = document.createElement('ul');
  const replacementSection = createSection('Replacement asset');
  const replacementIntro = document.createElement('p');
  const replacementToolbar = document.createElement('div');
  const replacementSearch = document.createElement('input');
  const replacementCount = document.createElement('span');
  const replacementGrid = document.createElement('div');
  const selectionStatus = document.createElement('p');
  const footer = document.createElement('footer');
  const resultStatus = document.createElement('p');
  const cancelButton = createButton('Cancel');
  const deleteButton = createButton('Delete asset');
  const compatibleEntries = findCompatibleReplacementEntries(
    entry,
    assetEntries,
  );
  const candidateRefs = compatibleEntries.map(createReplacementCandidate);
  const thumbnailCleanups = [];
  let inspection = null;
  let selectedReplacement = null;
  let disposed = false;

  dialog.className = 'ui-editor-asset-delete';
  dialog.setAttribute('aria-labelledby', 'ui-editor-asset-delete-title');
  dialog.setAttribute('aria-describedby', 'ui-editor-asset-delete-warning');
  surface.className = 'ui-editor-asset-delete__surface';
  content.className = 'ui-editor-asset-delete__content';
  header.className = 'ui-editor-asset-delete__header';
  heading.id = 'ui-editor-asset-delete-title';
  heading.className = 'ui-editor-asset-delete__title';
  heading.textContent = 'Delete asset';
  closeButton.classList.add('ui-editor-asset-delete__close');
  closeButton.setAttribute('aria-label', 'Close asset deletion review');
  warning.id = 'ui-editor-asset-delete-warning';
  warning.className = 'ui-editor-asset-delete__warning';
  warning.textContent =
    'Review every usage before deleting. Source references will be updated '
    + 'to the selected replacement, then the original file and its '
    + 'nine-slice sidecar will be removed.';

  usageList.className = 'ui-editor-asset-delete__usage-list';
  const normalizedUsages = normalizeVisualUsages(entry?.usages);
  usageSection.meta.textContent = formatCount(
    normalizedUsages.length,
    'visual usage',
  );
  usageList.replaceChildren(
    ...normalizedUsages.map((usage) =>
      createVisualUsageItem(usage, entry, thumbnailCleanups),
    ),
  );
  if (normalizedUsages.length === 0) {
    usageList.append(
      createEmptyItem('No registered widget previews use this asset.'),
    );
  }
  usageSection.body.append(usageList);

  referenceStatus.className = 'ui-editor-asset-delete__section-status';
  referenceStatus.setAttribute('aria-live', 'polite');
  referenceStatus.textContent = 'Checking project references…';
  referenceList.className = 'ui-editor-asset-delete__reference-list';
  referenceSection.meta.textContent = 'Checking…';
  referenceSection.body.append(referenceStatus, referenceList);

  replacementIntro.className = 'ui-editor-asset-delete__section-status';
  replacementIntro.textContent =
    'Choose a compatible source asset. Visual previews use the production '
    + 'textures and the same asset type as the file being deleted.';
  replacementToolbar.className =
    'ui-editor-asset-delete__replacement-toolbar';
  replacementSearch.className =
    'ui-editor-asset-delete__replacement-search';
  replacementSearch.type = 'search';
  replacementSearch.placeholder = 'Filter replacement assets';
  replacementSearch.setAttribute('aria-label', 'Filter replacement assets');
  replacementCount.className =
    'ui-editor-asset-delete__replacement-count';
  replacementCount.setAttribute('aria-live', 'polite');
  replacementGrid.className =
    'ui-editor-asset-delete__replacement-grid';
  replacementGrid.setAttribute('role', 'radiogroup');
  replacementGrid.setAttribute('aria-label', 'Replacement assets');
  replacementGrid.replaceChildren(
    ...candidateRefs.map(({ root }) => root),
  );
  selectionStatus.className =
    'ui-editor-asset-delete__selection-status';
  selectionStatus.setAttribute('aria-live', 'polite');
  replacementToolbar.append(replacementSearch, replacementCount);
  replacementSection.body.append(
    replacementIntro,
    replacementToolbar,
    replacementGrid,
    selectionStatus,
  );

  resultStatus.className = 'ui-editor-asset-delete__result-status';
  resultStatus.setAttribute('aria-live', 'polite');
  resultStatus.setAttribute('role', 'status');
  deleteButton.classList.add('ui-editor-asset-delete__confirm');
  deleteButton.dataset.danger = 'true';
  deleteButton.disabled = true;
  footer.className = 'ui-editor-asset-delete__footer';
  footer.append(resultStatus, cancelButton, deleteButton);
  header.append(heading, closeButton);
  content.append(
    target,
    warning,
    usageSection.root,
    referenceSection.root,
    replacementSection.root,
  );
  surface.append(header, content, footer);
  dialog.append(surface);

  const close = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
  };

  const updateReplacementFilter = () => {
    const query = replacementSearch.value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    for (const candidate of candidateRefs) {
      const visible = !query || candidate.searchText.includes(query);
      candidate.root.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    }
    replacementCount.textContent =
      `${visibleCount} of ${candidateRefs.length}`;
  };

  const selectReplacement = (candidate) => {
    selectedReplacement = candidate.entry;
    for (const candidateRef of candidateRefs) {
      const selected = candidateRef === candidate;
      candidateRef.input.checked = selected;
      candidateRef.root.dataset.selected = String(selected);
    }
    selectionStatus.textContent =
      `Replacement selected: ${candidate.entry.label}`;
    updateDeleteAction();
  };

  const updateDeleteAction = () => {
    const referenceCount = inspection?.references?.length ?? null;

    deleteButton.textContent = referenceCount > 0
      ? 'Replace references and delete'
      : 'Delete asset';
    deleteButton.disabled =
      !inspection
      || (referenceCount > 0 && !selectedReplacement);
  };

  const inspect = async () => {
    try {
      inspection = await inspectUiEditorAsset(entry.assetId, { fetchImpl });
      const references = normalizeReferences(inspection.references);

      referenceSection.meta.textContent = formatCount(
        references.length,
        'source reference',
      );
      referenceStatus.textContent = references.length > 0
        ? 'Every listed reference will be changed to the selected replacement.'
        : 'No source references were found. A replacement is optional.';
      referenceList.replaceChildren(
        ...references.map(createReferenceItem),
      );
      if (references.length === 0) {
        referenceList.append(
          createEmptyItem('This asset is not referenced in scanned project files.'),
        );
      }
      updateDeleteAction();
    } catch (error) {
      referenceSection.meta.textContent = 'Unavailable';
      referenceStatus.dataset.tone = 'error';
      referenceStatus.textContent = error instanceof Error
        ? error.message
        : 'Could not inspect this asset.';
      resultStatus.dataset.tone = 'error';
      resultStatus.textContent =
        'Deletion stays disabled until the usage check succeeds.';
    }
  };

  const deleteAsset = async () => {
    if (deleteButton.disabled) {
      return;
    }

    deleteButton.disabled = true;
    cancelButton.disabled = true;
    closeButton.disabled = true;
    replacementSearch.disabled = true;
    for (const candidate of candidateRefs) {
      candidate.input.disabled = true;
    }
    resultStatus.removeAttribute('data-tone');
    resultStatus.textContent = selectedReplacement
      ? `Replacing references with ${selectedReplacement.label}…`
      : 'Deleting unused asset…';

    try {
      const result = await deleteUiEditorAsset(
        entry.assetId,
        selectedReplacement?.assetId ?? null,
        { fetchImpl },
      );
      resultStatus.dataset.tone = 'success';
      resultStatus.textContent =
        `Deleted ${entry.label}. Updated ${result.referencesUpdated} `
        + `${result.referencesUpdated === 1 ? 'reference' : 'references'}.`;
      await onDeleted({
        entry,
        replacementEntry: selectedReplacement,
        result,
      });
      close();
    } catch (error) {
      deleteButton.disabled = false;
      cancelButton.disabled = false;
      closeButton.disabled = false;
      replacementSearch.disabled = false;
      for (const candidate of candidateRefs) {
        candidate.input.disabled = false;
      }
      resultStatus.dataset.tone = 'error';
      resultStatus.textContent = error instanceof Error
        ? error.message
        : 'Could not delete this asset.';
    }
  };

  closeButton.addEventListener('click', close);
  cancelButton.addEventListener('click', close);
  deleteButton.addEventListener('click', deleteAsset);
  replacementSearch.addEventListener('input', updateReplacementFilter);
  for (const candidate of candidateRefs) {
    candidate.input.addEventListener(
      'change',
      () => selectReplacement(candidate),
    );
  }
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  dialog.addEventListener('close', () => {
    opener?.focus?.();
    dispose();
  });

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const cleanup of thumbnailCleanups) {
      cleanup();
    }
    dialog.remove();
  };

  updateReplacementFilter();

  return {
    dialog,
    dispose,
    open() {
      if (disposed) {
        return false;
      }
      document.body.append(dialog);
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      for (const thumbnail of dialog.querySelectorAll(
        '[data-editor-library-thumbnail]',
      )) {
        thumbnail.uiEditorThumbnailConnect?.();
      }
      closeButton.focus();
      void inspect();
      return true;
    },
  };
}

export async function inspectUiEditorAsset(
  assetId,
  { fetchImpl = globalThis.fetch } = {},
) {
  return requestAssetRoute({
    body: { assetId },
    fetchImpl,
    method: 'POST',
  });
}

export async function inspectUiEditorAssetUsage(
  assetIds,
  { fetchImpl = globalThis.fetch } = {},
) {
  return requestAssetRoute({
    body: { assetIds },
    fetchImpl,
    method: 'POST',
  });
}

export async function deleteUiEditorAsset(
  assetId,
  replacementAssetId,
  { fetchImpl = globalThis.fetch } = {},
) {
  return requestAssetRoute({
    body: { assetId, replacementAssetId },
    fetchImpl,
    method: 'DELETE',
  });
}

export function findCompatibleReplacementEntries(entry, assetEntries) {
  const extension = resolveAssetExtension(entry?.assetId);

  return (Array.isArray(assetEntries) ? assetEntries : [])
    .filter((candidate) =>
      candidate?.kind === 'asset'
      && candidate.id !== entry?.id
      && candidate.assetId?.startsWith('source:')
      && resolveAssetExtension(candidate.assetId) === extension
      && Boolean(candidate.nineSlice) === Boolean(entry?.nineSlice),
    )
    .sort((left, right) => {
      const leftSameFolder = sameFolder(entry, left) ? 0 : 1;
      const rightSameFolder = sameFolder(entry, right) ? 0 : 1;
      return leftSameFolder - rightSameFolder
        || left.label.localeCompare(right.label)
        || left.assetId.localeCompare(right.assetId);
    });
}

function createAssetTarget(entry) {
  const root = document.createElement('section');
  const preview = document.createElement('div');
  const image = document.createElement('img');
  const copy = document.createElement('div');
  const name = document.createElement('strong');
  const path = document.createElement('code');

  root.className = 'ui-editor-asset-delete__target';
  preview.className =
    'ui-editor-asset-delete__target-preview ui-editor-checkerboard';
  image.src = entry?.assetUrl ?? '';
  image.alt = '';
  image.draggable = false;
  copy.className = 'ui-editor-asset-delete__target-copy';
  name.textContent = entry?.label ?? 'Selected asset';
  path.textContent = entry?.assetId ?? '';
  copy.append(name, path);
  preview.append(image);
  root.append(preview, copy);
  return root;
}

function createSection(label) {
  const root = document.createElement('section');
  const header = document.createElement('header');
  const title = document.createElement('h3');
  const meta = document.createElement('span');
  const body = document.createElement('div');

  root.className = 'ui-editor-asset-delete__section';
  header.className = 'ui-editor-asset-delete__section-header';
  title.className = 'ui-editor-asset-delete__section-title';
  title.textContent = label;
  meta.className = 'ui-editor-asset-delete__section-meta';
  body.className = 'ui-editor-asset-delete__section-body';
  header.append(title, meta);
  root.append(header, body);
  return { body, meta, root };
}

function createVisualUsageItem(usage, entry, thumbnailCleanups) {
  const item = document.createElement('li');
  const preview = document.createElement('div');
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  const role = document.createElement('span');
  const locations = document.createElement('ul');
  let thumbnail = null;

  item.className = 'ui-editor-asset-delete__usage';
  preview.className = 'ui-editor-asset-delete__usage-preview';
  try {
    thumbnail = usage.createThumbnail?.();
  } catch {
    thumbnail = null;
  }
  if (thumbnail?.nodeType === 1) {
    preview.append(thumbnail);
    thumbnailCleanups.push(() =>
      thumbnail.uiEditorThumbnailDisconnect?.(),
    );
  } else {
    const image = document.createElement('img');
    image.src = entry?.assetUrl ?? '';
    image.alt = '';
    image.draggable = false;
    preview.append(image);
  }
  copy.className = 'ui-editor-asset-delete__usage-copy';
  title.textContent = usage.label;
  role.textContent = usage.source || 'Asset';
  locations.className = 'ui-editor-asset-delete__usage-locations';
  locations.replaceChildren(
    ...usage.locations.map((location) => {
      const locationItem = document.createElement('li');
      const label = document.createElement('span');
      const source = document.createElement('code');

      label.textContent = location.label;
      source.textContent = location.source;
      locationItem.append(label, source);
      return locationItem;
    }),
  );
  if (usage.locations.length === 0) {
    const locationItem = document.createElement('li');
    locationItem.textContent = 'No feature locations registered.';
    locations.append(locationItem);
  }
  copy.append(title, role, locations);
  item.append(preview, copy);
  return item;
}

function createReferenceItem(reference) {
  const item = document.createElement('li');
  const location = document.createElement('code');
  const excerpt = document.createElement('code');
  const count = document.createElement('span');

  item.className = 'ui-editor-asset-delete__reference';
  location.className = 'ui-editor-asset-delete__reference-location';
  location.textContent =
    `${reference.path}:${reference.line}:${reference.column}`;
  excerpt.className = 'ui-editor-asset-delete__reference-excerpt';
  excerpt.textContent = reference.excerpt;
  count.className = 'ui-editor-asset-delete__reference-count';
  count.textContent = reference.occurrences > 1
    ? `${reference.occurrences} matches`
    : '1 match';
  item.append(location, excerpt, count);
  return item;
}

function createReplacementCandidate(entry) {
  const root = document.createElement('label');
  const input = document.createElement('input');
  const preview = document.createElement('span');
  const image = document.createElement('img');
  const label = document.createElement('span');

  root.className = 'ui-editor-asset-delete__replacement';
  root.dataset.selected = 'false';
  input.type = 'radio';
  input.name = 'ui-editor-asset-replacement';
  input.value = entry.assetId;
  input.className = 'ui-editor-asset-delete__replacement-input';
  preview.className =
    'ui-editor-asset-delete__replacement-preview ui-editor-checkerboard';
  image.src = entry.assetUrl;
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  image.loading = 'lazy';
  label.className = 'ui-editor-asset-delete__replacement-label';
  label.textContent = entry.label;
  preview.append(image);
  root.append(input, preview, label);
  return {
    entry,
    input,
    root,
    searchText: `${entry.label} ${entry.assetId}`.toLocaleLowerCase(),
  };
}

function createEmptyItem(message) {
  const item = document.createElement('li');

  item.className = 'ui-editor-asset-delete__empty';
  item.textContent = message;
  return item;
}

function createButton(label) {
  const button = document.createElement('button');

  button.className = 'ui-editor-asset-delete__button';
  button.type = 'button';
  button.textContent = label;
  return button;
}

function normalizeVisualUsages(usages) {
  return (Array.isArray(usages) ? usages : [])
    .map((usage) => ({
      createThumbnail: typeof usage?.createThumbnail === 'function'
        ? usage.createThumbnail
        : null,
      label: String(usage?.label ?? ''),
      locations: (Array.isArray(usage?.locations) ? usage.locations : [])
        .map((location) => ({
          label: String(location?.label ?? ''),
          source: String(location?.source ?? ''),
        }))
        .filter(({ label, source }) => label || source),
      source: String(usage?.source ?? ''),
    }))
    .filter(({ label }) => label);
}

function normalizeReferences(references) {
  return (Array.isArray(references) ? references : [])
    .map((reference) => ({
      column: Number(reference?.column) || 1,
      excerpt: String(reference?.excerpt ?? ''),
      line: Number(reference?.line) || 1,
      occurrences: Math.max(1, Number(reference?.occurrences) || 1),
      path: String(reference?.path ?? ''),
    }))
    .filter(({ path }) => path);
}

function formatCount(count, singular) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function resolveAssetExtension(assetId) {
  return String(assetId ?? '').match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? '';
}

function sameFolder(left, right) {
  return JSON.stringify(left?.folderPath ?? [])
    === JSON.stringify(right?.folderPath ?? []);
}

async function requestAssetRoute({ body, fetchImpl, method }) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('The local editor server is unavailable.');
  }

  const response = await fetchImpl(ASSET_ROUTE, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Could not update the selected asset.');
  }

  return result;
}
