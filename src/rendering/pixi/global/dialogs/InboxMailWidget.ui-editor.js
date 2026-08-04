import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { InboxMailWidget } from './PixiInboxDialog.js';

const WIDGET_ID = 'compound.inbox-mail-widget';
const WIDGET_WIDTH = 264;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createInboxMailThumbnail,
  folderPath: ['Global'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Inbox Mail',
  properties: [
    { label: 'Production class', value: 'InboxMailWidget' },
    {
      label: 'Contract',
      value: 'One titled inbox message, context, reward state, and optional Claim action',
    },
  ],
  scenarios: [
    {
      fixture: createMailFixture(),
      id: 'claimable',
      label: 'Claimable event reward',
      mount: mountInboxMail,
    },
    {
      fixture: createMailFixture({
        mailKey: 'event:claimed',
        read: true,
        rewardCollected: true,
      }),
      id: 'claimed',
      label: 'Claimed event reward',
      mount: mountInboxMail,
    },
    {
      fixture: createMailFixture({
        body: 'The Market will close briefly while the traders restock.',
        hasReward: false,
        mailKey: 'news:market',
        read: false,
        rewardCollected: true,
        rewardText: '',
        senderLabel: 'news',
        title: 'Market Notice',
      }),
      id: 'message',
      label: 'Message without reward',
      mount: mountInboxMail,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Global Inbox dialog',
      source: 'src/rendering/pixi/global/dialogs/PixiInboxDialog.js',
    },
  ],
});

function createInboxMailThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: inboxAssetFilter,
    component: 'InboxMailWidget',
    createControl: ({ assets }) =>
      createInboxMailControl({
        assets,
        fixture: createMailFixture(),
        input: null,
      }),
    id: WIDGET_ID,
  });
}

async function mountInboxMail(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: inboxAssetFilter,
    component: 'InboxMailWidget',
    createControl: ({ assets, input }) =>
      createInboxMailControl({
        assets,
        fixture,
        input,
        onClaim: (mail) => {
          context.emit('inboxMailClaimed', { mailKey: mail.mailKey });
          return { ok: true };
        },
      }),
  });
}

function createInboxMailControl({ assets, fixture, input, onClaim = null }) {
  const widget = new InboxMailWidget({
    assetManager: assets,
    inputRouter: input,
    theme: createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT),
    label: 'uiEditor:inboxMail',
  });
  widget.bind(fixture.mailKey, fixture, {
    claim: onClaim ?? (() => false),
  });
  const height = widget.getPreferredHeight(WIDGET_WIDTH);
  widget.setBounds(0, 0, WIDGET_WIDTH, height);

  return {
    atomicComponents: createInboxMailHierarchy(widget),
    destroy: () => widget.destroy(),
    height,
    root: widget.root,
    widget,
    width: WIDGET_WIDTH,
  };
}

function createInboxMailHierarchy(widget) {
  return [
    hierarchy(widget.frame, 'frame', 'Message panel', '9-slice'),
    hierarchy(widget.title, 'title', 'Message title', 'label', widget.title),
    hierarchy(widget.meta, 'meta', 'Sender and date', 'label', widget.meta),
    hierarchy(widget.body, 'body', 'Message context', 'label', widget.body),
    hierarchy(widget.reward, 'reward', 'Reward summary', 'label', widget.reward),
    hierarchy(widget.claimButton, 'claim', 'Claim action', 'button'),
    hierarchy(widget.claimedIcon, 'claimed-icon', 'Claimed icon', 'image'),
    hierarchy(widget.claimedLabel, 'claimed-label', 'Claimed label', 'label', widget.claimedLabel),
    hierarchy(widget.status, 'status', 'Read state', 'label', widget.status),
  ];
}

function hierarchy(primary, id, label, type, textTarget = null) {
  return createUiEditorPixiHierarchyComponent({
    displayObjects: [primary],
    id: `inbox-mail:${id}`,
    label,
    primary,
    ...(textTarget ? { textTarget } : {}),
    type,
  });
}

function createMailFixture(overrides = {}) {
  return {
    body: 'You placed #1 in New King Crowned with 2,520 points. Here are your rewards.',
    createdLabel: '8/4',
    hasReward: true,
    mailKey: 'event:new-king-crowned',
    read: false,
    rewardCollected: false,
    rewardText: '3 crystal',
    senderLabel: 'World Event',
    title: 'New King Crowned',
    ...overrides,
  };
}

function inboxAssetFilter({ id }) {
  return String(id ?? '').startsWith('source:assets/ui/');
}
