import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { WorldChatMessageRowPixi } from '../../pages/workshop/WorkshopDialogPixi.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { PixiActionHighlightScene } from './PixiActionHighlightScene.js';

const TARGET_ID = 'world-chat-report:editor-message';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['compound.world-chat-message-row', 'text-button'],
  folderPath: ['Workshop'],
  id: 'scene.world-chat-report-highlight',
  kind: 'scene',
  label: 'World Chat Report Highlight',
  properties: [
    { label: 'Production class', value: 'PixiActionHighlightScene' },
    {
      label: 'Contract',
      value: 'Promote one live semantic target above a dim backdrop with one action below it',
    },
  ],
  scenarios: [
    {
      fixture: {},
      id: 'report-row',
      label: 'Report row',
      mount: mountReportHighlight,
    },
  ],
  sectionId: 'scenes',
  usages: [
    {
      label: 'World Chat report selection',
      source: 'src/rendering/pixi/presenters/PixiPagesFacade.js',
    },
  ],
});

async function mountReportHighlight(context) {
  return createUiEditorPixiSurface({
    assetFilter: ({ id }) =>
      id.includes('/ui/') ||
      id.includes('/characters/') ||
      id.includes('/avatars/'),
    component: 'PixiActionHighlightScene',
    createControl: ({ assets, input, projection }) => {
      const root = new Container({ label: 'worldChatReportHighlightPreview' });
      const semanticRegistry = new SemanticTargetRegistry();
      const registeredIds = new Set();
      const dialog = {
        assetManager: assets,
        contentTheme: createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT),
        dialogId: 'workshop.worldChat',
        inputRouter: input,
        registerTarget(descriptor) {
          this.unregisterTarget(descriptor.semanticId);
          semanticRegistry.register(descriptor);
          registeredIds.add(descriptor.semanticId);
        },
        theme: DEFAULT_PIXI_THEME_SNAPSHOT,
        unregisterTarget(semanticId) {
          registeredIds.delete(semanticId);
          return semanticRegistry.unregister(semanticId);
        },
      };
      const row = new WorldChatMessageRowPixi({ dialog });
      row.bind({
        ageLabel: 'now',
        allianceTag: 'ARC',
        allianceTagColor: 'violet',
        body: 'Anyone joining the next expedition?',
        canReport: true,
        character: 'mira',
        frame: 'violet',
        id: 'editor-message',
        onActivate: () => true,
        onLongPress: () => true,
        reportHighlightId: TARGET_ID,
        selectedForReport: true,
        semanticId: 'world-chat-player:editor-message',
        username: 'Mira',
      });
      row.setBounds(16, 104, 96, row.getPreferredHeight());
      root.addChild(row.root);

      const scene = new PixiActionHighlightScene({
        assets,
        inputRouter: input,
        semanticRegistry,
        theme: DEFAULT_PIXI_THEME_SNAPSHOT,
      });
      root.addChild(scene.root);
      scene.layout(projection);
      scene.activate();
      scene.bind({
        visible: true,
        targetId: TARGET_ID,
        actionLabel: 'Report',
        actionVariant: 'red',
        onAction: () => {
          context.emit('worldChatReportRequested', {
            messageId: 'editor-message',
          });
          return true;
        },
        onDismiss: () => true,
      });

      return {
        destroy: () => {
          scene.destroy();
          row.destroy();
          semanticRegistry.clear();
          root.removeChildren();
          root.destroy();
        },
        layout: (nextProjection) => scene.layout(nextProjection),
        root,
        scene,
      };
    },
    layout: 'fill',
  });
}
