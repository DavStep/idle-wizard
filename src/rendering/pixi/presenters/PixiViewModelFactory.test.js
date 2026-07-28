import { describe, expect, it, vi } from 'vitest';

import { PixiViewModelFactory } from './PixiViewModelFactory.js';

describe('PixiViewModelFactory', () => {
  it('projects renderer-neutral top chrome and active quest progress', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createTopPanel({
      gameplay: {
        mana: { current: 40, cap: 50, perSecond: 1 },
        coin: { current: 12 },
        ruby: { current: 3 },
        persistence: { loadRevision: 7 },
        tasks: {
          currentLevel: 4,
          level: {
            questProgress: {
              progress: 0.4,
              completedQuests: 1,
              totalQuests: 5,
            },
          },
        },
      },
      player: { username: 'Mira', character: 'elara' },
      pageId: 'research',
      researchTabId: 'automation',
    });

    expect(model).toMatchObject({
      username: 'Mira',
      level: 4,
      loadRevision: 7,
      contextCurrency: {
        resource: 'ruby',
        amount: 3,
        visible: true,
      },
      quest: {
        completed: 1,
        total: 5,
        activeFraction: 1,
        remaining: 4,
      },
    });
  });

  it('maps the active request without moving gameplay rules into the view', () => {
    const fillTask = vi.fn();
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        tasks: {
          currentLevel: 1,
          level: {
            tasks: [
              {
                taskId: 'turn-in-sage',
                requirementLabel: 'Turn In Sage Seed',
                itemKind: 'seed',
                itemKey: 'sageSeed',
                progressQuantity: 2,
                requiredQuantity: 5,
                progress: 0.4,
                canFill: true,
                isActiveQuest: true,
              },
            ],
            completion: { level: 1, canComplete: false },
          },
        },
        seedSummoning: { cost: 10, quantity: 1, canSummon: true },
      },
      actions: { fillTask },
    });

    const [row] = model.workshop.tasks.rows;
    expect(row).toMatchObject({
      id: 'turn-in-sage',
      label: 'Turn In Sage Seed',
      current: 2,
      required: 5,
      actionLabel: 'Turn In',
      itemKind: 'seed',
      itemKey: 'sageSeed',
    });

    row.onActivate();
    expect(fillTask).toHaveBeenCalledWith('turn-in-sage');
  });

  it('does not project the obsolete manual level-up row', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        tasks: {
          currentLevel: 1,
          level: {
            tasks: [{ taskId: 'done', completed: true }],
            completion: { level: 1, canComplete: true },
          },
        },
      },
    });

    expect(model.workshop.tasks).toMatchObject({
      title: "Elara's Request",
      rows: [],
    });
    expect(model.workshop.dialogs.tasksInfo.title).toBe("Elara's Request");
  });

  it('keeps the disabled summon control pressable when seed drop weights need attention', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        seedSummoning: {
          cost: 10,
          quantity: 1,
          canSummon: false,
          unavailableReason: 'no_active_seed_weights',
        },
      },
    });

    expect(model.workshop.summon).toMatchObject({
      canSummon: false,
      enabled: false,
      pressEnabled: true,
    });
  });

  it('projects each seed drop slider inside its seed row', () => {
    const setSummonDropPreference = vi.fn();
    const toggleSummonAutomation = vi.fn();
    const setSummonManaReserve = vi.fn();
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        seedSummoning: {
          autoSummoning: {
            unlocked: true,
            enabled: false,
            manaReserve: 20,
            maxManaReserve: 5_000,
            reserveStep: 1,
          },
          dropChances: [
            {
              key: 'sageSeed',
              label: 'sage seed',
              dropChance: 0.25,
              dropPreference: 'low',
            },
            {
              key: 'mintSeed',
              label: 'mint seed',
              dropChance: 0.75,
              dropPreference: 'high',
            },
          ],
        },
      },
      actions: {
        setSummonDropPreference,
        toggleSummonAutomation,
        setSummonManaReserve,
      },
    });

    const dialog = model.workshop.dialogs.summonInfo;
    expect(dialog.title).toBe('Summoning Seeds');
    expect(dialog.autoSummonUnlocked).toBe(true);
    expect(dialog.summaryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'auto',
          label: 'Auto Summon',
          icon: { kind: 'automation' },
          iconLeading: true,
        }),
        expect.objectContaining({
          id: 'reserve',
          label: 'Keep Mana Above',
          value: '20',
          valueIconResourceKey: 'mana',
        }),
      ]),
    );
    expect(dialog.summaryRows).toHaveLength(2);
    expect(dialog.items).toEqual([
      expect.objectContaining({
        id: 'sageSeed',
        label: 'Sage Seed',
        detail: '25% Chance',
        value: 'Low',
        valueTone: 'red',
        dropSlider: expect.objectContaining({
          mode: 'milestones',
          value: 'low',
        }),
      }),
      expect.objectContaining({
        id: 'mintSeed',
        label: 'Mint Seed',
        detail: '75% Chance',
        value: 'High',
        valueTone: 'green',
        dropSlider: expect.objectContaining({
          mode: 'milestones',
          value: 'high',
        }),
      }),
    ]);
    expect(dialog.settingsToggle).toMatchObject({
      value: false,
      enabled: true,
    });
    expect(dialog.manaSlider).toMatchObject({
      mode: 'range',
      min: 0,
      max: 5_000,
      value: 20,
    });
    expect(dialog.dropSlider).toBeUndefined();
    expect(dialog.items[1].dropSlider.options).toEqual([
      { value: 'none', tone: 'root', enabled: true },
      { value: 'low', tone: 'red', enabled: true },
      { value: 'medium', tone: 'yellow', enabled: true },
      { value: 'high', tone: 'green', enabled: true },
    ]);
    expect(dialog.actions).toEqual([]);

    dialog.items[1].dropSlider.onChange('medium');
    expect(setSummonDropPreference).toHaveBeenCalledWith(
      'mintSeed',
      'medium',
    );
    dialog.settingsToggle.onChange(true);
    expect(toggleSummonAutomation).toHaveBeenCalledTimes(1);
    dialog.manaSlider.onChange(2_500);
    expect(setSummonManaReserve).toHaveBeenCalledWith(2_500);
  });

  it('omits Auto Summon controls until its research is unlocked', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        seedSummoning: {
          autoSummoning: {
            unlocked: false,
            manaReserve: 20,
          },
          dropChances: [
            {
              key: 'sageSeed',
              label: 'sage seed',
              dropChance: 1,
              dropPreference: 'medium',
            },
          ],
        },
      },
    });

    const dialog = model.workshop.dialogs.summonInfo;
    expect(dialog.autoSummonUnlocked).toBe(false);
    expect(dialog.summaryRows).toEqual([]);
    expect(dialog.settingsToggle).toBeNull();
    expect(dialog.manaSlider).toBeNull();
    expect(dialog.items).toHaveLength(1);
  });

  it('keeps none enabled when the selected seed is the only researched seed', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        seedSummoning: {
          dropChances: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              dropPreference: 'medium',
              dropChance: 1,
            },
          ],
        },
      },
    });

    expect(
      model.workshop.dialogs.summonInfo.items[0].dropSlider.options,
    ).toEqual([
      { value: 'none', tone: 'root', enabled: true },
      { value: 'low', tone: 'red', enabled: true },
      { value: 'medium', tone: 'yellow', enabled: true },
      { value: 'high', tone: 'green', enabled: true },
    ]);
  });

  it('projects main HUD feature art state without view-owned gameplay logic', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        tasks: {
          currentLevel: 20,
          level: {
            tasks: [],
            completion: { level: 20, canComplete: false },
          },
        },
        personalTasks: { unlocked: true },
        worldNotice: {
          unlocked: true,
          current: {
            resetLabel: 'resolves 2d 4h',
            requests: [
              { requestId: 'complete', completed: true },
              { requestId: 'open', completed: false },
            ],
          },
        },
      },
      tradeAlliance: {
        ownAlliance: { tagColor: 'green' },
      },
      notifications: {
        children: {
          alliance: true,
          personalTasks: true,
        },
      },
    });

    expect(
      model.workshop.features.find((feature) => feature.id === 'alliance'),
    ).toMatchObject({
      side: 'left',
      weight: 10,
      visible: true,
      notification: true,
      allianceTagColor: 'green',
    });
    expect(
      model.workshop.features.find((feature) => feature.id === 'worldEvent'),
    ).toMatchObject({
      side: 'right',
      weight: 30,
      visible: true,
      timer: '2d 4h',
      notification: true,
    });
    expect(model.workshop.stats).toMatchObject({
      side: 'right',
      weight: 0,
    });
    expect(model.workshop.inbox).toMatchObject({
      side: 'right',
      weight: 10,
    });
    expect(model.workshop.bag).toMatchObject({
      side: 'left',
      weight: 40,
    });
  });

  it('projects Workshop tabs, alliance leaderboard rows, inbox notifications, and chat availability', () => {
    const selectBagTab = vi.fn();
    const selectStatsTab = vi.fn();
    const selectLeaderboardTab = vi.fn();
    const openAlliance = vi.fn();
    const sendWorldChat = vi.fn(() => ({ ok: true }));
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        mana: { current: 10, cap: 20 },
        seedInventory: [
          { itemTypeId: 1, key: 'sageSeed', label: 'sage', quantity: 2 },
        ],
        stats: {
          herbs: {
            total: 3,
            items: [
              {
                key: 'sageHerb',
                label: 'sage herb',
                quantity: 2,
              },
            ],
          },
        },
      },
      playerInbox: {
        unreadCount: 1,
        mail: [],
      },
      tradeAlliance: {
        topAlliances: [
          {
            allianceId: 'moon',
            name: 'Moon',
            rank: 1,
            totalIncome: 25,
          },
        ],
      },
      worldChat: {
        connected: true,
        messages: [],
      },
      pageStates: [
        { id: 'workshop', unlocked: true },
        { id: 'garden', unlocked: true },
        { id: 'brewing', unlocked: false },
      ],
      dialogState: {
        bagTabId: 'seeds',
        statsTabId: 'herbs',
        leaderboardTabId: 'alliance',
      },
      actions: {
        selectBagTab,
        selectStatsTab,
        selectLeaderboardTab,
        openAlliance,
        sendWorldChat,
      },
    });
    const dialogs = model.workshop.dialogs;

    expect(model.workshop.inbox.notification).toBe(true);
    expect(dialogs.bag).toMatchObject({
      title: 'Bag',
      selectedTabId: 'seeds',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: false },
        { id: 'seeds', label: 'Seeds', selected: true },
        { id: 'herbs', label: 'Herbs', selected: false },
      ],
      rows: [{ id: 'sageSeed', label: 'Sage', value: '2' }],
    });
    expect(dialogs.stats).toMatchObject({
      title: 'Stats',
      selectedTabId: 'herbs',
      rows: [
        { id: 'herbs:total', label: 'Total', value: '3' },
        { id: 'sageHerb', label: 'Sage Herb', value: '2' },
      ],
    });
    expect(dialogs.leaderboard).toMatchObject({
      selectedTabId: 'alliance',
      rows: [
        {
          id: 'moon',
          label: '1. Moon',
          actionLabel: 'open',
        },
      ],
    });

    dialogs.bag.onSelectTab('herbs');
    dialogs.stats.onSelectTab('coin');
    dialogs.leaderboard.onSelectTab('singlePlayer');
    dialogs.leaderboard.rows[0].onActivate();
    expect(selectBagTab).toHaveBeenCalledWith('herbs');
    expect(selectStatsTab).toHaveBeenCalledWith('coin');
    expect(selectLeaderboardTab).toHaveBeenCalledWith('singlePlayer');
    expect(openAlliance).toHaveBeenCalledWith(
      expect.objectContaining({ allianceId: 'moon' }),
    );
    expect(dialogs.worldChat.composer.enabled).toBe(true);
    expect(dialogs.worldChat.onSubmit('hello')).toEqual({ ok: true });
    expect(sendWorldChat).toHaveBeenCalledWith('hello');

    const offline = factory.createWorldChatDialog(
      { connected: false },
      { sendWorldChat },
    );
    expect(offline.composer.enabled).toBe(false);
    expect(offline.onSubmit).toBeNull();
  });

  it('projects full compact chat metadata without exposing player levels', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10 * 60_000);
    const openPlayer = vi.fn();
    const playerMessage = {
      id: 'mira-1',
      username: 'Mira',
      playerLevel: 20,
      body: 'Hello from the moon garden.',
      allianceTag: 'MOSS',
      allianceTagColor: 'green',
      character: 'mira',
      sentAtMs: 7 * 60_000,
    };

    try {
      const dialog = new PixiViewModelFactory().createWorldChatDialog(
        {
          connected: true,
          messages: [
            playerMessage,
            {
              id: 'system-1',
              username: 'system',
              body: 'The weekly world event has begun.',
              sentAtMs: 9 * 60_000,
            },
          ],
        },
        {
          openPlayer,
          sendWorldChat: vi.fn(),
        },
      );

      expect(dialog.composer.placeholder).toBe('Message');
      expect(dialog.rows[0]).toMatchObject({
        id: 'mira-1',
        type: 'player',
        username: 'Mira',
        body: 'Hello from the moon garden.',
        allianceTag: 'MOSS',
        allianceTagColor: 'green',
        character: 'mira',
        ageLabel: '3m ago',
      });
      expect(dialog.rows[0]).not.toHaveProperty('playerLevel');
      expect(dialog.rows[1]).toMatchObject({
        type: 'system',
        username: 'System',
        ageLabel: '1m ago',
        onActivate: null,
      });

      dialog.rows[0].onActivate();
      expect(openPlayer).toHaveBeenCalledWith(playerMessage);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('falls back to Currencies when the selected Bag feature is still locked', () => {
    const factory = new PixiViewModelFactory();
    const dialog = factory.createBagDialog(
      {
        mana: { current: 4, cap: 10 },
      },
      'potions',
      null,
      [
        { id: 'workshop', unlocked: true },
        { id: 'garden', unlocked: false },
        { id: 'brewing', unlocked: false },
      ],
    );

    expect(dialog).toMatchObject({
      title: 'Bag',
      selectedTabId: 'currencies',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: true },
        { id: 'seeds', label: 'Seeds', selected: false },
      ],
      rows: [{ id: 'mana', label: 'Mana', value: '4/10' }],
    });
  });

  it('keeps icon identity on every Bag tab row', () => {
    const factory = new PixiViewModelFactory();
    const gameplay = {
      mana: { current: 4, cap: 10 },
      coin: { current: 3 },
      seedInventory: [
        { key: 'sageSeed', label: 'sage', quantity: 2 },
      ],
      inventory: [
        { key: 'sageHerb', label: 'sage', kind: 'herb', quantity: 1 },
        {
          key: 'manaTonic',
          label: 'mana tonic',
          kind: 'potion',
          quantity: 5,
        },
      ],
      ingredientInventory: [
        {
          key: 'cyclopsEye',
          label: 'cyclops eye',
          kind: 'ingredient',
          quantity: 6,
        },
      ],
    };

    expect(factory.createBagDialog(gameplay, 'currencies').rows).toEqual([
      expect.objectContaining({
        id: 'mana',
        itemKind: 'resource',
        itemKey: 'mana',
      }),
      expect.objectContaining({
        id: 'coin',
        itemKind: 'resource',
        itemKey: 'coin',
      }),
    ]);
    expect(factory.createBagDialog(gameplay, 'seeds').rows).toEqual([
      expect.objectContaining({
        id: 'sageSeed',
        itemKind: 'seed',
        itemKey: 'sageSeed',
      }),
    ]);
    expect(factory.createBagDialog(gameplay, 'herbs').rows).toEqual([
      expect.objectContaining({
        id: 'sageHerb',
        itemKind: 'herb',
        itemKey: 'sageHerb',
      }),
    ]);
    expect(factory.createBagDialog(gameplay, 'potions').rows).toEqual([
      expect.objectContaining({
        id: 'manaTonic',
        itemKind: 'potion',
        itemKey: 'manaTonic',
      }),
    ]);
    expect(factory.createBagDialog(gameplay, 'ingredients').rows).toEqual([
      expect.objectContaining({
        id: 'cyclopsEye',
        itemKind: 'ingredient',
        itemKey: 'cyclopsEye',
      }),
    ]);
  });

  it('keeps item identity on stats rows so retained counts can show their icons', () => {
    const factory = new PixiViewModelFactory();
    const dialog = factory.createStatsDialog(
      {
        stats: {
          seeds: {
            total: 4,
            items: [
              {
                key: 'briarSeed',
                label: 'briar seed',
                quantity: 4,
              },
            ],
          },
        },
      },
      'seeds',
    );

    expect(dialog.rows).toEqual([
      {
        id: 'seeds:total',
        label: 'Total',
        value: '4',
      },
      {
        id: 'briarSeed',
        label: 'Briar Seed',
        value: '4',
        itemKind: 'seed',
        itemKey: 'briarSeed',
        resourceKey: 'seed',
      },
    ]);
  });

  it('preserves research values and prestige reset previews from snapshots', () => {
    const factory = new PixiViewModelFactory();
    const research = factory.createResearch({
      gameplay: {
        research: {
          tabs: [
            {
              id: 'regular',
              label: 'regular research',
              boxes: [
                {
                  id: 'seeds',
                  label: 'seeds',
                  researches: [
                    {
                      id: 'mint',
                      label: 'mint',
                      value: '80 coin',
                      description: 'allows mint.',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    const item = research.research.tabs[0].boxes[0].researches[0];
    expect(item).toMatchObject({
      displayName: 'mint',
      displayValue: '80 coin',
      info: { description: 'allows mint.' },
    });

    const prestige = factory.createPrestige({
      gameplay: {
        prestige: {
          currentLevel: 10,
          highestAvailableLevel: 10,
          completedLevels: [],
          unlocks: [{ count: 1, label: 'Village Market' }],
          milestones: [
            {
              level: 10,
              rewardRuby: 1,
              creditedRuby: 1,
              canComplete: true,
              currentLevel: 10,
              nextRun: {
                level: 5,
                mana: 40,
                coin: 0,
                crystal: 12,
                emerald: 0,
                ruby: 1,
              },
            },
          ],
        },
      },
    });

    expect(prestige.prestige.summary.lines).toEqual([
      'level 10 > level 5',
      'on prestige: 12 crystal 1 ruby 0 emerald total',
    ]);
    expect(prestige.prestige.milestones[0]).toMatchObject({
      id: 'level-10',
      state: 'ready',
      reward: 'reward: 12 crystal 1 ruby',
      canComplete: true,
    });
  });

  it('derives natural research lock reasons from prerequisites across tabs', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createResearch({
      gameplay: {
        playerLevel: { currentLevel: 5 },
        prestige: { completedLevels: [10] },
        research: {
          completedResearchIds: ['unlockSeed:sage'],
          tabs: [
            {
              id: 'regular',
              boxes: [
                {
                  id: 'seedUnlocks',
                  researches: [
                    {
                      id: 'unlockSeed:sage',
                      label: 'sage',
                      completed: true,
                    },
                    {
                      id: 'unlockSeed:mint',
                      label: 'mint',
                    },
                  ],
                },
              ],
            },
            {
              id: 'emerald',
              boxes: [
                {
                  id: 'plotPlanting',
                  researches: [
                    {
                      id: 'emerald:plotPlanting:1:2',
                      label: 'plot 1 lvl 2',
                      actionType: 'levelUp',
                    },
                    {
                      id: 'locked-study',
                      label: 'locked study',
                      locked: true,
                      requiredResearchIds: [
                        'unlockSeed:sage',
                        'unlockSeed:mint',
                        'emerald:plotPlanting:1:2',
                      ],
                      requiredPlayerLevel: 6,
                      requiredPrestigeCount: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      selectedTabId: 'emerald',
    });

    const item =
      model.research.selectedTab.boxes[0].researches.find(
        (research) => research.id === 'locked-study',
      );

    expect(model.research.selectedTabId).toBe('emerald');
    expect(item.lockReason).toBe(
      'requires mint research and plot 1 lvl 2 level up, level 6, and 2 prestiges.',
    );
    expect(item.cost).toMatchObject({
      amountLabel: 'Locked',
      enabled: false,
      state: 'locked',
      lockPrompt:
        'Requires mint research and plot 1 lvl 2 level up, level 6, and 2 prestiges',
    });
    expect(item.info.copy).toContain(item.lockReason);
  });

  it('projects exact research art, state, rank, star, cost, timer, semantics, and fallback copy', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createResearch({
      gameplay: {
        research: {
          boxes: [
            {
              id: 'cauldronBrewing',
              label: 'cauldron level up',
              researches: [
                {
                  id: 'emerald:cauldronBrewing:1:2',
                  label: 'cauldron 1',
                  actionType: 'levelUp',
                  starLevel: 1,
                  value: 'leveling up',
                  costCurrency: 'crystal',
                  costCrystal: 2,
                  inProgress: true,
                  totalMs: 10_000,
                  remainingMs: 4_250,
                  progress: 0.575,
                },
              ],
            },
          ],
        },
      },
    });

    const [item] = model.research.tabs[0].boxes[0].researches;

    expect(model.research).toMatchObject({
      selectedTabId: 'regular',
      selectedTab: { id: 'regular', selected: true },
    });
    expect(item).toMatchObject({
      state: 'in-progress',
      artAssetId:
        'source:assets/icons/research/icon-research-cauldron-level.png',
      rank: { current: 0, total: 1, label: 'Lv. 00/01' },
      star: {
        level: 1,
        tone: 'yellow',
        count: 1,
        text: '★',
      },
      cost: {
        amount: 2,
        currency: 'crystal',
        resource: 'crystal',
        state: 'in-progress',
      },
      timer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 4_250,
        progress: 0.575,
        remainingLabel: '5s',
      },
      semanticId: 'research.emerald:cauldronBrewing:1:2',
      tutorialId: 'research:emerald:cauldronBrewing:1:2',
    });
    expect(item.info).toMatchObject({
      title: 'cauldron 1 ★',
      description: 'cauldron 1 records this study as complete.',
      actionNoun: 'level up',
      starLevel: 1,
      accessibleTitle:
        'cauldron 1 yellow star 1 level up information',
    });
  });

  it('projects the exact unlocked seed and potion identity for research artwork', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createResearch({
      gameplay: {
        research: {
          boxes: [
            {
              id: 'seedUnlocks',
              label: 'seed unlocks',
              researches: [
                {
                  id: 'unlockSeed:silverleafSeed',
                  label: 'silverleaf seed',
                  value: '45,000 coin',
                },
              ],
            },
            {
              id: 'recipeUnlocks',
              label: 'recipe unlocks',
              researches: [
                {
                  id: 'unlockRecipe:minorHealingPotion',
                  label: 'minor healing potion',
                  value: '60 coin',
                },
              ],
            },
          ],
        },
      },
    });

    const [seedBox, potionBox] = model.research.tabs[0].boxes;

    expect(seedBox.researches[0]).toMatchObject({
      itemKind: 'seed',
      itemKey: 'silverleafSeed',
    });
    expect(potionBox.researches[0]).toMatchObject({
      itemKind: 'potion',
      itemKey: 'minorHealingPotion',
    });
  });

  it('orders boxes for run focus, limits locked previews, and notifies tabs', () => {
    const factory = new PixiViewModelFactory();
    const lockedResearches = Array.from({ length: 4 }, (_value, index) => ({
      id: `locked-${index + 1}`,
      label: `locked ${index + 1}`,
      locked: true,
    }));
    const model = factory.createResearch({
      gameplay: {
        prestige: {
          runFocus: {
            unlocked: true,
            selected: 'capacity',
            options: [{ id: 'capacity', label: 'capacity' }],
          },
        },
        research: {
          tabs: [
            {
              id: 'regular',
              boxes: [
                {
                  id: 'seedUnlocks',
                  researches: lockedResearches,
                },
                {
                  id: 'plotGrowth',
                  researches: [
                    {
                      id: 'plot-growth-1',
                      label: 'plot growth',
                      value: '25 coin',
                      costCoin: 25,
                      canResearch: true,
                    },
                  ],
                },
                {
                  id: 'cauldronCapacity',
                  researches: [],
                },
                {
                  id: 'researchTime',
                  researches: [],
                },
              ],
            },
          ],
        },
      },
    });

    const [tab] = model.research.tabs;
    expect(tab.boxes.map((box) => box.id)).toEqual([
      'plotGrowth',
      'cauldronCapacity',
      'seedUnlocks',
      'researchTime',
    ]);
    const lockedBox = tab.boxes.find((box) => box.id === 'seedUnlocks');
    expect(lockedBox.researches).toHaveLength(3);
    expect(lockedBox.allResearches).toHaveLength(4);
    expect(lockedBox.hiddenLockedCount).toBe(1);
    expect(tab.notification).toBe(true);
    expect(model.research.notification).toBe(true);
  });
});
