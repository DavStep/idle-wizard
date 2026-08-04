/**
 * Ensures every declared child of a large production preview is independently
 * discoverable in the UI Lab as a passive widget entry.
 */
export function validateUiEditorCompositionCoverage(entries) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const entriesByContractId = new Map(
    normalizedEntries.map((entry) => [getContractId(entry), entry]),
  );

  for (const parent of normalizedEntries) {
    const parentId = getContractId(parent);

    for (const childId of parent.childWidgetIds ?? []) {
      if (childId === parentId) {
        throw new Error(
          `UI Lab integration ${parentId} cannot reference itself as a child widget.`,
        );
      }

      const child = entriesByContractId.get(childId);
      if (!child) {
        throw new Error(
          `UI Lab integration ${parentId} is missing child widget: ${childId}.`,
        );
      }
      if (child.kind !== 'widget') {
        throw new Error(
          `UI Lab child ${childId} declared by ${parentId} must be a widget.`,
        );
      }
      if (typeof child.createThumbnail !== 'function') {
        throw new Error(
          `UI Lab child ${childId} declared by ${parentId} must provide a library thumbnail.`,
        );
      }
    }
  }

  return normalizedEntries;
}

function getContractId(entry) {
  return String(entry?.integrationId ?? entry?.id ?? '').trim();
}
