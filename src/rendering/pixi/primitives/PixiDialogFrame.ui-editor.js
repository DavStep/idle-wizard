import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PixiTextButton } from './PixiTextButton.js';
import { PixiDialogFrame } from './PixiDialogFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const DIALOG_WIDTH = 260;
const DIALOG_HEIGHT = 156;

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createDialogFrameThumbnail,
    folderPath: ['Dialogs'],
    id: 'compound.dialog-frame',
    kind: 'widget',
    label: 'Dialog Frame',
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: 'PixiDialogFrame' },
      { label: 'Contract', value: 'Shared retained dialog shell' },
    ],
    scenarios: [
      {
        fixture: { dismissible: true, title: 'Brewing Report' },
        id: 'dismissible',
        label: 'Dismissible',
        mount: mountDialogFrame,
      },
      {
        fixture: { dismissible: true, title: 'Unable to Load', variant: 'danger' },
        id: 'danger',
        label: 'Danger',
        mount: mountDialogFrame,
      },
      {
        fixture: { dismissible: false, title: 'Choose Your Path' },
        id: 'blocking',
        label: 'Blocking',
        mount: mountDialogFrame,
      },
    ],
    usages: [
      {
        label: 'Shared production dialog shell',
        source: 'src/rendering/pixi/primitives/PixiDialogFrame.js',
      },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'compound.dialog-frame',
      'text-button',
      'primitive.text-label',
    ],
    id: 'primitive.data-dialog',
    kind: 'dialog',
    label: 'Data Dialog',
    sectionId: 'dialogs',
    properties: [
      { label: 'Production frame', value: 'PixiDialogFrame' },
      { label: 'Data source', value: 'Scenario fixture' },
    ],
    scenarios: [
      {
        fixture: { rows: [], title: 'Empty Report' },
        id: 'empty',
        label: 'Empty',
        mount: mountDialog,
      },
      {
        fixture: {
          rows: ['Mana: 120', 'Herbs: 8', 'Potions: 2'],
          title: 'Brewing Report',
        },
        id: 'populated',
        label: 'Populated',
        mount: mountDialog,
      },
      {
        fixture: {
          rows: ['Connection unavailable', 'Try again when online'],
          title: 'Unable to Load',
          variant: 'danger',
        },
        id: 'error',
        label: 'Error',
        mount: mountDialog,
      },
    ],
  }),
];

function createDialogFrameThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: dialogAssetFilter,
    component: 'PixiDialogFrame',
    createControl: ({ assets }) => createDialogFrameControl({
      assets,
      fixture: { dismissible: true, title: 'Dialog' },
      input: null,
    }),
    id: 'compound.dialog-frame',
  });
}

async function mountDialogFrame(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: dialogAssetFilter,
    component: 'PixiDialogFrame',
    createControl: ({ assets, input }) => createDialogFrameControl({
      assets,
      fixture,
      input,
      onClose: () => context.emit('dialogClosed'),
    }),
  });
}

function createDialogFrameControl({ assets, fixture, input, onClose }) {
  const frame = new PixiDialogFrame({
    assetManager: assets,
    closeAction: fixture.dismissible ? onClose ?? (() => true) : null,
    coreHeight: DIALOG_HEIGHT,
    coreWidth: DIALOG_WIDTH,
    inputRouter: input,
    title: fixture.title,
    titleVariant: fixture.variant,
  });
  return {
    destroy: () => frame.destroy({ children: true }),
    height: frame.getLocalBounds().height,
    root: frame,
    width: frame.getLocalBounds().width,
  };
}

function dialogAssetFilter({ id }) {
  return id.includes('/ui/root-run-dialog/');
}

async function mountDialog(context, fixture) {
  const state = {
    rowCount: fixture.rows.length,
    title: fixture.title,
  };
  const surface = await createUiEditorPixiSurface({
    assetFilter: ({ id }) =>
      dialogAssetFilter({ id }) ||
      id.includes('/ui/regular-button/') ||
      id.includes('/ui/notification-circle-'),
    component: 'PixiDataDialog',
    createControl: ({ assets, input }) => {
      const root = new Container({ label: 'uiLabDataDialog' });
      const frame = new PixiDialogFrame({
        assetManager: assets,
        closeAction: () => {
          context.emit('dialogClosed');
          return true;
        },
        coreHeight: DIALOG_HEIGHT,
        coreWidth: DIALOG_WIDTH,
        inputRouter: input,
        title: state.title,
        titleVariant: fixture.variant,
      });
      const confirm = new PixiTextButton({
        action: () => {
          context.emit('dialogConfirmed', {
            rowCount: state.rowCount,
            title: state.title,
          });
          return true;
        },
        assetManager: assets,
        height: 30,
        inputRouter: input,
        text: 'Confirm',
        variant: fixture.variant === 'danger' ? 'red' : 'green',
        width: 92,
      });
      root.addChild(frame);
      frame.content.addChild(confirm);
      confirm.position.set((DIALOG_WIDTH - 92) / 2, DIALOG_HEIGHT - 42);
      const labels = [];

      const renderRows = () => {
        for (const label of labels.splice(0)) {
          label.parent?.removeChild(label);
          label.destroy();
        }
        const rows = fixture.rows.slice(0, state.rowCount);
        if (rows.length === 0) {
          rows.push('No data');
        }
        rows.forEach((copy, index) => {
          const label = new PixiTextLabel({
            color: '#634934',
            fontSize: 13,
            label: `uiLabDataRow:${index}`,
            text: copy,
          });
          label.position.set(12, 14 + index * 20);
          labels.push(label);
          frame.content.addChild(label);
        });
      };
      renderRows();
      return {
        destroy() {
          root.destroy({ children: true });
        },
        frame,
        height: frame.getLocalBounds().height,
        renderRows,
        root,
        width: frame.getLocalBounds().width,
      };
    },
  });
  const control = surface.control;
  return {
    ...surface,
    controls: [
      {
        getValue: () => state.title,
        id: 'title',
        label: 'Title',
        setValue: (value) => {
          state.title = String(value);
          control.frame.setTitle(state.title);
        },
        type: 'text',
      },
      {
        getValue: () => state.rowCount,
        id: 'rows',
        label: 'Visible rows',
        max: Math.max(1, fixture.rows.length),
        min: 0,
        setValue: (value) => {
          state.rowCount = Math.max(0, Number(value) || 0);
          control.renderRows();
        },
        step: 1,
        type: 'range',
      },
    ],
  };
}
