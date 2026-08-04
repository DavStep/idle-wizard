import { createUiEditorIntegrationPreview } from './UiEditorIntegrationPreview.js';

export function createUiEditorIntegrationEntries(integrations) {
  return (Array.isArray(integrations) ? integrations : []).map(
    (integration) => ({
      createThumbnail: integration.createThumbnail,
      createPreview: () => createUiEditorIntegrationPreview(integration),
      folderPath: integration.folderPath,
      id: `lab:${integration.id}`,
      integrationId: integration.id,
      kind: integration.kind,
      label: integration.label,
      properties: integration.properties,
      sectionId: integration.sectionId,
      usages: integration.usages,
    }),
  );
}
