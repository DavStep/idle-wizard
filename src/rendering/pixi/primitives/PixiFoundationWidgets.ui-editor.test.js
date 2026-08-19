import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  models: [],
  tab: {
    bind: vi.fn(),
    destroy: vi.fn(),
    notification: { root: {} },
    root: {},
  },
  view: {
    activate: vi.fn(),
    bind: vi.fn((model) => harness.models.push(model)),
    destroy: vi.fn(),
    layout: vi.fn(),
    root: {},
    tabs: ['brewing', 'garden', 'workshop', 'research', 'shop'].map((id) => ({
      definition: {
        id,
        label: id === 'shop' ? 'Market' : id[0].toUpperCase() + id.slice(1),
      },
      notification: { root: {} },
      root: {},
    })),
  },
}));
harness.view.allTabs = harness.view.tabs;
harness.view.guildTabs = [];

vi.mock('../global/chrome/PixiBottomPanelView.js', () => ({
  PIXI_BOTTOM_PANEL_TABS: [
    { id: 'brewing', label: 'Brewing' },
    { id: 'garden', label: 'Garden' },
    { id: 'workshop', label: 'Workshop' },
    { id: 'research', label: 'Research' },
    { id: 'shop', label: 'Market' },
  ],
  PIXI_GUILD_HUD_TABS: [
    { guildTabId: 'hall', id: 'guild.hall', label: 'Hall' },
  ],
  PixiBottomHudTextTab: class {
    constructor() {
      return harness.tab;
    }
  },
  PixiBottomRoomTab: class {
    constructor() {
      return harness.tab;
    }
  },
  PixiBottomPanelView: class {
    constructor() {
      return harness.view;
    }
  },
}));

vi.mock('../../../uiEditor/widgets/createUiEditorPixiSurface.js', () => ({
  createUiEditorPixiHierarchyComponent: vi.fn((definition) => ({
    children: definition.children ?? [],
    ...definition,
  })),
  createUiEditorPixiSurface: vi.fn(async ({ createControl }) => ({
    control: await createControl({
      assets: {},
      input: {},
      projection: { sourceHeight: 844, sourceWidth: 390 },
    }),
  })),
}));

import integrations from './PixiFoundationWidgets.ui-editor.js';

describe('Pixi foundation UI editor integrations', () => {
  it('catalogues one production room tab and declares it as the group child', () => {
    const tab = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tab',
    );
    const tabs = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tabs',
    );

    expect(tab).toMatchObject({
      kind: 'widget',
      label: 'Bottom Room Tab',
    });
    expect(tab.createThumbnail).toEqual(expect.any(Function));
    expect(tabs.childWidgetIds).toEqual([
      'compound.bottom-room-tab',
    ]);
  });

  it('shows the five production tab instances as the group hierarchy', async () => {
    const integration = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tabs',
    );
    const scenario = integration.scenarios.find(({ id }) => id === 'workshop');
    const result = await scenario.mount(
      { emit: vi.fn(), invalidate: vi.fn() },
      scenario.fixture,
    );

    expect(result.control.atomicComponents.map(({ label }) => label)).toEqual([
      'Brewing tab',
      'Garden tab',
      'Workshop tab',
      'Research tab',
      'Market tab',
    ]);
    expect(
      result.control.atomicComponents.every(
        ({ children, libraryEntryId }) =>
          children.length === 0
          && libraryEntryId === 'compound.bottom-room-tab',
      ),
    ).toBe(true);
  });

  it('updates the selected room when the production tab action fires', async () => {
    const integration = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tabs',
    );
    const scenario = integration.scenarios.find(({ id }) => id === 'workshop');
    const context = {
      emit: vi.fn(),
      invalidate: vi.fn(),
    };

    await scenario.mount(context, scenario.fixture);
    const initialModel = harness.models.at(-1);

    expect(initialModel.currentPageId).toBe('workshop');
    expect(initialModel.actions.showPage('research')).toBe(true);
    expect(harness.models.at(-1).currentPageId).toBe('research');
    expect(context.emit).toHaveBeenCalledWith('roomSelected', {
      pageId: 'research',
    });
  });

  it('previews Prestige alternate-HUD tab selection through production actions', async () => {
    const integration = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tabs',
    );
    const scenario = integration.scenarios.find(({ id }) => id === 'prestige');
    const context = {
      emit: vi.fn(),
      invalidate: vi.fn(),
    };

    await scenario.mount(context, scenario.fixture);
    const initialModel = harness.models.at(-1);

    expect(initialModel).toMatchObject({
      currentPageId: 'prestige',
      hudMode: 'prestige',
      prestigeHud: { selectedTabId: 'main' },
    });
    expect(initialModel.actions.selectPrestigeTab('points')).toBe(true);
    expect(harness.models.at(-1).prestigeHud.selectedTabId).toBe('points');
    expect(context.emit).toHaveBeenCalledWith('prestigeTabSelected', {
      tabId: 'points',
    });
  });

  it('previews every Guild destination icon in the production group', async () => {
    const integration = integrations.find(
      ({ id }) => id === 'compound.bottom-room-tabs',
    );
    const scenario = integration.scenarios.find(({ id }) => id === 'guild');

    await scenario.mount(
      { emit: vi.fn(), invalidate: vi.fn() },
      scenario.fixture,
    );

    expect(harness.models.at(-1)).toMatchObject({
      currentPageId: 'guild',
      guildHud: {
        selectedTabId: 'hall',
        tabs: [{ id: 'hall', unlocked: true }],
      },
      hudMode: 'guild',
    });
  });
});
