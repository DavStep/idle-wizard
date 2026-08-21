// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';

import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../workshop/PixiPageTestHarness.js';
import { AlliancePixiPage } from './AlliancePixiPage.js';

installPixiPageTestCanvas();

describe('AlliancePixiPage', () => {
  it('retains member workspace tabs and submits alliance-only chat', async () => {
    const send = vi.fn(() => ({ ok: true }));
    const page = new AlliancePixiPage({
      assetManager: createPixiAssetManagerFake(Texture),
      semanticRegistry: new SemanticTargetRegistry(),
    });

    page.layout({ sourceWidth: 390, sourceHeight: 844 });
    page.bind(createModel('home', send));
    page.activate();

    expect(page.scrolls.get('home').root.visible).toBe(true);
    expect(page.homeIdentity.text).toBe('[OWL] Night Owls');
    expect(page.homeSummary.rows.getWidgets()).toHaveLength(4);
    expect(page.homeMembers.rows.getWidgets()[0].keyLabel.text).toBe('Luna');

    page.bind(createModel('requests', send));
    expect(page.scrolls.get('requests').root.visible).toBe(true);
    expect(page.requests.rows.getWidgets()).toHaveLength(1);
    expect(page.requests.rows.getWidgets()[0].primary.textLabel.text).toBe('Accept');

    page.bind(createModel('chat', send));
    expect(page.chatComposer.visible).toBe(true);
    expect(page.chatRows.rows.getWidgets()).toHaveLength(1);
    page.chatField.setValue('Alliance only');
    await expect(page.submitChat()).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith('Alliance only');
    expect(page.chatField.value).toBe('');

    page.destroy();
  });
});

function createModel(selectedTabId, send) {
  return {
    ownedAlliance: true,
    selectedTabId,
    flag: {
      bannerColor: 'blue',
      emblemColor: 'gold',
      emblemId: 'owl',
    },
    tradeInfo: {
      identityLabel: '[OWL] Night Owls',
      description: 'Patient traders building a stronger market together.',
      notice: 'Weekly goal: support every active member.',
      memberCountLabel: '1/50',
    },
    tradeInfoRows: [
      { id: 'members', label: 'Members', value: '1/50' },
      { id: 'join', label: 'Join Mode', value: 'Apply' },
      { id: 'income', label: 'Season Income', value: '12.5K' },
      {
        id: 'leave',
        label: 'Membership',
        value: '',
        actionLabel: 'Leave',
        enabled: true,
        onActivate: vi.fn(),
      },
    ],
    members: [
      {
        id: 'luna',
        username: 'Luna',
        roleLabel: 'Trade Master',
        levelLabel: 'Lv 14',
        onActivate: vi.fn(),
      },
    ],
    directory: false,
    rows:
      selectedTabId === 'requests'
        ? [
            {
              id: 'thorne',
              username: 'Thorne',
              detail: 'Level 9',
              primaryAction: {
                label: 'Accept',
                enabled: true,
                onActivate: vi.fn(),
              },
              secondaryAction: {
                label: 'Deny',
                enabled: true,
                onActivate: vi.fn(),
              },
            },
          ]
        : [],
    settings: null,
    chat: {
      rows: [
        {
          id: 'message-1',
          username: 'Luna',
          body: 'Welcome to the hall.',
          ageLabel: 'now',
        },
      ],
      onSubmit: send,
    },
  };
}
