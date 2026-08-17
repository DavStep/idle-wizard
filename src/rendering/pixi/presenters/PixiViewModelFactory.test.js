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

  it('keeps crystal visible as the default top-HUD context currency', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createTopPanel({
      gameplay: {
        crystal: { current: 7 },
      },
      player: { username: 'Mira', character: 'elara' },
      pageId: 'workshop',
    });

    expect(model.contextCurrency).toEqual({
      resource: 'crystal',
      amount: 7,
      visible: true,
    });
  });

  it('uses the requested level in the non-persistent top-HUD progress preview', () => {
    const factory = new PixiViewModelFactory();
    const model = factory.createTopPanel({
      gameplay: {
        tasks: { currentLevel: 0 },
      },
      questPreview: {
        completedQuests: 1,
        totalQuests: 4,
        targetLevel: 2,
      },
    });

    expect(model.level).toBe(2);
    expect(model.quest).toMatchObject({
      visible: true,
      completed: 1,
      total: 4,
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

  it('keeps request fill in sync with the visible quantity', () => {
    const navigateToTask = vi.fn(() => true);
    const factory = new PixiViewModelFactory();
    const model = factory.createWorkshop({
      gameplay: {
        tasks: {
          currentLevel: 5,
          level: {
            tasks: [
              {
                taskId: 'brew-mana-tonic',
                requirementLabel: 'Brew Mana Tonic',
                progressQuantity: 1,
                requiredQuantity: 3,
                progress: 0,
                autoProgress: true,
                type: 'brew',
                isActiveQuest: true,
              },
            ],
          },
        },
      },
      actions: { navigateToTask },
    });

    expect(model.workshop.tasks.rows[0]).toMatchObject({
      current: 1,
      required: 3,
      progress: 1 / 3,
      rowEnabled: true,
    });
    expect(model.workshop.tasks.rows[0].onRowActivate()).toBe(true);
    expect(navigateToTask).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'brew-mana-tonic', type: 'brew' }),
    );
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
    expect(model.workshop.dialogs.tasksInfo).toBeUndefined();
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

  it('projects complete potion discovery records for the retained discovery rows', () => {
    const openPlayer = vi.fn();
    const factory = new PixiViewModelFactory();
    const discoveredAtMs = Date.UTC(2026, 0, 2);
    const dialog = factory.createDiscoveriesDialog(
      {
        discoveries: {
          potions: [
            {
              key: 'silverleafQuiet',
              label: 'silverleaf quiet',
              discovered: true,
              discoveredByUsername: 'Ada',
              discoveredByIdentity: 'identity-ada',
              discoveredAtMs,
              ingredients: [
                {
                  key: 'mintHerb',
                  label: 'mint',
                  quantity: 1,
                },
                {
                  key: 'silverleafHerb',
                  label: 'silverleaf',
                  quantity: 2,
                },
              ],
              manaCost: 34,
              brewDurationMs: 75_000,
              royaltyCoin: 12.5,
            },
            {
              key: 'ashenMemory',
              label: 'ashen memory',
              discovered: false,
            },
          ],
        },
      },
      { openPlayer },
    );

    expect(dialog.title).toBe('Discoveries');
    expect(dialog.rows).toHaveLength(2);
    expect(dialog.rows[0]).toMatchObject({
      id: 'potion:silverleafQuiet',
      type: 'potionDiscovery',
      discovered: true,
      potionKey: 'silverleafQuiet',
      label: 'Silverleaf Quiet',
      discovererUsername: 'Ada',
      discovererIdentity: 'identity-ada',
      discoveredAtLabel: 'Jan 2, 2026',
      ingredients: [
        {
          key: 'mintHerb',
          label: 'Mint',
          quantity: 1,
        },
        {
          key: 'silverleafHerb',
          label: 'Silverleaf',
          quantity: 2,
        },
      ],
      manaLabel: '34 Mana',
      durationLabel: '75s Brew',
      royaltyLabel: '12.5 Coin Royalty',
      onDiscovererActivate: expect.any(Function),
    });
    expect(dialog.rows[1]).toMatchObject({
      id: 'potion:ashenMemory',
      type: 'potionDiscovery',
      discovered: false,
      potionKey: 'unknownPotion',
      label: 'Undiscovered Potion',
      discovererUsername: '',
      discoveredAtLabel: '',
      ingredients: [],
      manaLabel: '',
      durationLabel: '',
      royaltyLabel: '',
      onDiscovererActivate: null,
    });

    dialog.rows[0].onDiscovererActivate();
    expect(openPlayer).toHaveBeenCalledWith({
      identity: 'identity-ada',
      name: 'Ada',
      username: 'Ada',
    });
  });

  it('projects the complete World Event dialog instead of bare quest labels', () => {
    const selectWorldEventTab = vi.fn();
    const openWorldEventDonation = vi.fn();
    const openPlayer = vi.fn();
    const factory = new PixiViewModelFactory();
    const gameplay = {
      worldNotice: {
        unlocked: true,
        current: {
          periodKey: 'weekly-1',
          eventId: 'new-crown',
          headline: 'new crown tours town',
          body: [
            'the bells have not stopped.',
            'every guild is waiting to be counted.',
          ],
          resetLabel: 'resolves 5d',
          leaderboard: {
            currentPoints: 125,
            remainingQualificationPoints: 1875,
            rewardTiers: [
              { rankLabel: '1', emerald: 5, crystal: 10 },
              { rankLabel: '101+ qualified', crystal: 1 },
            ],
            rows: [
              {
                rank: 1,
                name: 'Mira',
                playerLevel: 4,
                points: 12_345,
              },
            ],
          },
          requests: [
            {
              requestId: 'weekly-1:new-crown:crowd',
              title: 'quiet the crowd',
              situation: 'the square is packed.',
              description: 'donate calming draughts to the stewards.',
              contributionPoints: 80,
              collectedPointText: '80 points',
              donationOptions: [
                {
                  optionKey: 'calmingDraught',
                  resourceType: 'item',
                  itemKey: 'calmingDraught',
                  label: 'calming draught',
                  pointsPerUnit: 120,
                  availableQuantity: 2,
                  maxDonateQuantity: 2,
                  contributionPoints: 80,
                  collectedPointText: '80 points',
                  canDonate: true,
                },
              ],
            },
          ],
        },
      },
    };
    const [firstRequest] = gameplay.worldNotice.current.requests;
    gameplay.worldNotice.current.requests.push(
      {
        ...firstRequest,
        requestId: 'weekly-1:new-crown:seal',
        title: 'protect the seal',
      },
      {
        ...firstRequest,
        requestId: 'weekly-1:new-crown:hidden-third',
        title: 'hidden third quest',
      },
    );
    const actions = {
      selectWorldEventTab,
      openWorldEventDonation,
      openPlayer,
    };

    const tasks = factory.createWorldEventDialog(
      gameplay,
      {},
      {},
      'tasks',
      actions,
    );

    expect(tasks).toMatchObject({
      title: 'World Event',
      selectedTabId: 'tasks',
      rowWidget: 'worldEventQuest',
      header: {
        headline: 'New Crown Tours Town',
        body:
          'The bells have not stopped.\nEvery guild is waiting to be counted.',
        meta: '125 points · 5d',
      },
      tabs: [
        { id: 'tasks', label: 'Quests', selected: true },
        { id: 'leaderboard', label: 'Leaderboard', selected: false },
        { id: 'rewards', label: 'Rewards', selected: false },
      ],
    });
    expect(tasks.rows).toHaveLength(2);
    expect(tasks.rows.map(({ id }) => id)).toEqual([
      'quest:weekly-1:new-crown:crowd',
      'quest:weekly-1:new-crown:seal',
    ]);
    expect(tasks.rows[0]).toEqual(
      expect.objectContaining({
        id: 'quest:weekly-1:new-crown:crowd',
        type: 'worldEventQuest',
        title: 'Quiet The Crowd',
        pointsLabel: '80 points',
        description:
          'The square is packed. Donate calming draughts to the stewards.',
        donationOptions: [
          expect.objectContaining({
            id: 'donation:weekly-1:new-crown:crowd:calmingDraught',
            label: 'Calming Draught',
            pointsEachLabel: '120 points each',
            totalLabel: '80 points total',
            actionLabel: 'Donate',
            enabled: true,
            onActivate: expect.any(Function),
          }),
        ],
      }),
    );

    tasks.tabs[1].onSelect('leaderboard');
    expect(selectWorldEventTab).toHaveBeenCalledWith('leaderboard');
    tasks.rows[0].donationOptions[0].onActivate();
    expect(openWorldEventDonation).toHaveBeenCalledWith(
      'weekly-1:new-crown:crowd',
      'calmingDraught',
    );

    const leaderboard = factory.createWorldEventDialog(
      gameplay,
      {},
      {},
      'leaderboard',
      actions,
    );
    expect(leaderboard.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'leaderboard:1:Mira',
          type: 'leaderboardPlayer',
          rank: 1,
          username: 'Mira',
          playerLevel: 4,
          totalMetric: 'points',
          totalLabel: '12.3k',
        }),
      ]),
    );
    expect(leaderboard.rowWidget).toBe('leaderboard');
    leaderboard.rows[0].onActivate();
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mira' }),
    );

    const rewards = factory.createWorldEventDialog(
      gameplay,
      {},
      {},
      'rewards',
      actions,
    );
    expect(rewards.rowWidget).toBe('worldEventReward');
    expect(rewards.header.meta).toBe(
      '125 points · 5d\nLeaderboard Rewards: 2k points to qualify',
    );
    expect(rewards.rows).toEqual([
      {
        id: 'reward:1',
        type: 'worldEventReward',
        rankLabel: 'Rank 1',
        rewards: [
          { resourceKey: 'emerald', amountLabel: '5' },
          { resourceKey: 'crystal', amountLabel: '10' },
        ],
      },
      {
        id: 'reward:101+ qualified',
        type: 'worldEventReward',
        rankLabel: 'Rank 101+ Qualified',
        rewards: [{ resourceKey: 'crystal', amountLabel: '1' }],
      },
    ]);

    const adjustWorldEventDonationAmount = vi.fn();
    const confirmWorldEventDonation = vi.fn();
    const donation = factory.createWorldEventDonationDialog(
      gameplay,
      {
        requestId: 'weekly-1:new-crown:crowd',
        optionKey: 'calmingDraught',
        amount: 2,
      },
      {
        adjustWorldEventDonationAmount,
        confirmWorldEventDonation,
      },
    );
    expect(donation).toMatchObject({
      title: 'Quiet The Crowd',
      status: '',
      featuredItem: {
        id: 'giving',
        label: 'Calming Draught',
        detail: 'Owned',
        value: '2',
        itemKind: 'potion',
        itemKey: 'calmingDraught',
        iconSize: 36,
      },
      summaryRows: expect.arrayContaining([
        expect.objectContaining({
          id: 'total',
          label: 'Already Donated',
          value: '80 points',
        }),
        expect.objectContaining({
          id: 'amount',
          label: 'Amount',
          value: '2 / 2',
        }),
        expect.objectContaining({
          id: 'points',
          label: 'Earn',
          value: '+240 points',
          valueTone: 'root',
        }),
      ]),
      range: expect.objectContaining({
        enabled: true,
        tone: 'root',
        min: 1,
        max: 2,
        step: 1,
        value: 2,
      }),
      actions: expect.arrayContaining([
        expect.objectContaining({
          id: 'confirm',
          label: 'Donate x2',
          variant: 'green',
          enabled: true,
        }),
      ]),
    });
    expect(donation.summaryRows.map((row) => row.id)).toEqual([
      'total',
      'amount',
      'points',
    ]);
    donation.range.onChange(1);
    expect(adjustWorldEventDonationAmount).toHaveBeenCalledWith(-1);
    donation.actions.find((action) => action.id === 'confirm').action();
    expect(confirmWorldEventDonation).toHaveBeenCalledWith(
      'weekly-1:new-crown:crowd',
      'calmingDraught',
      2,
    );
  });

  it('projects Daily Tasks progress, reward tabs, and claim actions from the personal-task snapshot', () => {
    const claimPersonalTaskMilestoneReward = vi.fn();
    const selectPersonalTasksTab = vi.fn();
    const factory = new PixiViewModelFactory();
    const gameplay = {
      personalTasks: {
        unlocked: true,
        claimableRewards: 1,
        daily: {
          periodType: 'daily',
          resetLabel: 'resets 12h',
          currentPoints: 42,
          maxPoints: 100,
          completedTasks: 1,
          totalTasks: 2,
          tasks: [
            {
              taskId: 'daily:summon',
              label: 'summon seeds',
              progressQuantity: 8,
              requiredQuantity: 20,
              pointValue: 10,
              completed: false,
            },
            {
              taskId: 'daily:mana',
              label: 'spend mana',
              progressQuantity: 200,
              requiredQuantity: 200,
              pointValue: 15,
              completed: true,
            },
          ],
          rewards: [
            {
              threshold: 30,
              reward: { coin: 10, crystal: 0, text: '+10 coin' },
              claimed: true,
              claimable: false,
            },
            {
              threshold: 50,
              reward: { coin: 15, crystal: 0, text: '+15 coin' },
              claimed: false,
              claimable: true,
            },
          ],
        },
        weekly: {
          periodType: 'weekly',
          resetLabel: 'resets 3d',
          currentPoints: 260,
          maxPoints: 700,
          rewards: [
            {
              threshold: 100,
              reward: { coin: 40, crystal: 0, text: '+40 coin' },
              claimed: true,
              claimable: false,
            },
          ],
          tasks: [],
        },
      },
    };
    const actions = {
      claimPersonalTaskMilestoneReward,
      selectPersonalTasksTab,
    };

    const tasksDialog = factory.createPersonalTasksDialog(
      gameplay,
      'tasks',
      actions,
    );

    expect(tasksDialog).toMatchObject({
      title: 'Daily Tasks',
      selectedTabId: 'tasks',
      tabs: [
        { id: 'tasks', label: 'Tasks', selected: true },
        {
          id: 'rewards',
          label: 'Rewards',
          selected: false,
          notification: true,
        },
      ],
      periodSections: [
        {
          id: 'daily',
          title: 'Today',
          pointsLabel: '42 / 100 Points',
          resetLabel: 'Resets in 12h',
          detail: '1/2 Tasks',
        },
        {
          id: 'weekly',
          title: 'This Week',
          pointsLabel: '260 / 700 Points',
          resetLabel: 'Resets in 3d',
        },
      ],
    });
    expect(tasksDialog.rows).toEqual([
      {
        id: 'daily:daily:summon',
        sectionId: 'daily',
        label: 'Summon Seeds · +10 Points',
        value: '8/20',
        muted: false,
      },
      {
        id: 'daily:daily:mana',
        sectionId: 'daily',
        label: 'Spend Mana · +15 Points',
        value: 'Done',
        muted: true,
        statusIcon: 'checkmark',
      },
    ]);

    tasksDialog.tabs[1].onSelect('rewards');
    expect(selectPersonalTasksTab).toHaveBeenCalledWith('rewards');

    const rewardsDialog = factory.createPersonalTasksDialog(
      gameplay,
      'rewards',
      actions,
    );
    expect(rewardsDialog.selectedTabId).toBe('rewards');
    expect(rewardsDialog.rows).toEqual([
      {
        id: 'daily:reward:30',
        sectionId: 'daily',
        label: '30 Points',
        resourceValues: [{ resourceKey: 'coin', amountLabel: '+10' }],
        value: 'Claimed',
        height: 30,
        muted: true,
        statusIcon: 'checkmark',
      },
      {
        id: 'daily:reward:50',
        sectionId: 'daily',
        label: '50 Points',
        resourceValues: [{ resourceKey: 'coin', amountLabel: '+15' }],
        value: '',
        height: 30,
        actionLabel: 'Claim',
        actionHeight: 27,
        actionVariant: 'green',
        enabled: true,
        notification: true,
        semanticId: 'workshop.personalTasks.daily.reward.50',
        onActivate: expect.any(Function),
      },
      {
        id: 'weekly:reward:100',
        sectionId: 'weekly',
        label: '100 Points',
        resourceValues: [{ resourceKey: 'coin', amountLabel: '+40' }],
        value: 'Claimed',
        height: 30,
        muted: true,
        statusIcon: 'checkmark',
      },
    ]);

    rewardsDialog.rows[1].onActivate();
    expect(claimPersonalTaskMilestoneReward).toHaveBeenCalledWith('daily', 50);
  });

  it('projects Workshop tabs, alliance leaderboard rows, inbox notifications, and chat availability', () => {
    const selectBagTab = vi.fn();
    const selectStatsTab = vi.fn();
    const selectLeaderboardTab = vi.fn();
    const selectLeaderboardPeriod = vi.fn();
    const openAlliance = vi.fn();
    const sendWorldChat = vi.fn(() => ({ ok: true }));
    const openInbox = vi.fn(() => true);
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
        leaderboardPeriodId: 'allTime',
      },
      actions: {
        selectBagTab,
        selectStatsTab,
        selectLeaderboardTab,
        selectLeaderboardPeriod,
        openAlliance,
        openInbox,
        sendWorldChat,
      },
    });
    const dialogs = model.workshop.dialogs;

    expect(model.workshop.inbox.notification).toBe(true);
    expect(model.workshop.inbox.onActivate()).toBe(true);
    expect(openInbox).toHaveBeenCalledTimes(1);
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
      title: 'Leaderboard',
      selectedTabId: 'alliance',
      selectedPeriodId: 'allTime',
      tabs: [
        { id: 'singlePlayer', label: 'Players', selected: false },
        { id: 'alliance', label: 'Alliances', selected: true },
      ],
      rows: [
        {
          id: 'moon',
          type: 'leaderboardAlliance',
          rank: 1,
          name: 'Moon',
          totalCoinLabel: '25',
        },
      ],
    });

    dialogs.bag.onSelectTab('herbs');
    dialogs.stats.onSelectTab('coin');
    dialogs.leaderboard.onSelectTab('singlePlayer');
    dialogs.leaderboard.onSelectPeriod('weekly');
    dialogs.leaderboard.rows[0].onActivate();
    expect(selectBagTab).toHaveBeenCalledWith('herbs');
    expect(selectStatsTab).toHaveBeenCalledWith('coin');
    expect(selectLeaderboardTab).toHaveBeenCalledWith('singlePlayer');
    expect(selectLeaderboardPeriod).toHaveBeenCalledWith('weekly');
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

  it('preserves player frames in World Chat dialog and preview models', () => {
    const factory = new PixiViewModelFactory();
    const worldChat = {
      connected: true,
      messages: [
        {
          id: 'framed-player',
          username: 'Mira',
          character: 'mira',
          frame: 'violet',
          body: 'The frame should travel with me.',
        },
      ],
    };

    expect(factory.createWorldChatDialog(worldChat).rows[0].frame).toBe('violet');
    expect(factory.createWorldChatPreview(worldChat).messages[0].frame).toBe('violet');
  });

  it('gives duplicate-named leaderboard players and alliance members stable unique row ids', () => {
    const factory = new PixiViewModelFactory();
    const leaderboard = factory.createLeaderboardDialog({
      topAllTimeUsers: [
        { identity: 'wizard-a', name: 'Wizard', totalIncome: 12 },
        { identity: 'wizard-b', name: 'Wizard', totalIncome: 8 },
        { name: 'Wizard', totalIncome: 4 },
        { name: 'Wizard', totalIncome: 2 },
      ],
    });
    const alliance = factory.createAllianceDialog({
      ownAlliance: {
        allianceId: 'shared-alliance',
        name: 'Shared Alliance',
      },
      members: [
        {
          memberIdentity: 'member-a',
          allianceId: 'shared-alliance',
          username: 'Wizard',
        },
        {
          memberIdentity: 'member-b',
          allianceId: 'shared-alliance',
          username: 'Wizard',
        },
      ],
    });

    expect(leaderboard.rows.map((row) => row.id)).toEqual([
      'wizard-a',
      'wizard-b',
      'Wizard:2',
      'Wizard:3',
    ]);
    expect(alliance.rows.map((row) => row.id)).toEqual([
      'member-a',
      'member-b',
    ]);
  });

  it('renders one leaderboard row per player identity', () => {
    const factory = new PixiViewModelFactory();
    const dialog = factory.createLeaderboardDialog({
      topAllTimeUsers: [
        { identity: 'wizard-a', name: 'Wizard', totalIncome: 12 },
        { identity: 'wizard-a', name: 'Renamed Wizard', totalIncome: 12 },
        { identity: 'wizard-b', name: 'Wizard', totalIncome: 8 },
      ],
      currentAllTimeUser: {
        identity: 'wizard-a',
        name: 'Wizard',
        totalIncome: 12,
        rank: 1,
      },
    });

    expect(dialog.rows.map((row) => row.id)).toEqual([
      'wizard-a',
      'wizard-b',
    ]);
    expect(dialog.rows[0]).toMatchObject({
      username: 'Wizard',
      current: true,
    });
  });

  it('projects rich weekly player rows, colored tags, profile progression, and the current player', () => {
    const openPlayer = vi.fn();
    const factory = new PixiViewModelFactory();
    const dialog = factory.createLeaderboardDialog(
      {
        topWeeklyUsers: [
          {
            identity: 'top-player',
            username: 'Elara',
            allianceTag: 'OWL',
            allianceTagColor: 'violet',
            character: 'mira',
            frame: 'sun',
            playerLevel: 48,
            prestigeCount: 3,
            weeklyIncome: 707_000,
            rank: 2,
          },
        ],
        currentWeeklyUser: {
          identity: 'current-player',
          username: 'You',
          character: 'juniper',
          frame: 'emerald',
          playerLevel: 19,
          prestigeCount: 1,
          weeklyIncome: 12_000,
          rank: 34,
        },
      },
      {},
      'singlePlayer',
      { openPlayer },
      'weekly',
    );

    expect(dialog).toMatchObject({
      title: 'Leaderboard',
      rowWidget: 'leaderboard',
      selectedPeriodId: 'weekly',
      emptyLabel: 'No players yet',
      periodTabs: [
        { id: 'daily', label: 'Daily', selected: false },
        { id: 'weekly', label: 'Weekly', selected: true },
        { id: 'monthly', label: 'Monthly', selected: false },
        { id: 'allTime', label: 'All Time', selected: false },
      ],
      rows: [
        {
          id: 'top-player',
          type: 'leaderboardPlayer',
          rank: 2,
          username: 'Elara',
          allianceTag: 'OWL',
          allianceTagColor: 'violet',
          character: 'mira',
          frame: 'sun',
          playerLevel: 48,
          prestigeCount: 3,
          current: false,
          totalCoinLabel: '707k',
        },
        {
          id: 'current-player',
          rank: 34,
          current: true,
          totalCoinLabel: '12k',
        },
      ],
    });

    dialog.rows[0].onActivate();
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ identity: 'top-player' }),
    );
  });

  it('uses explicit empty copy for an empty alliance period', () => {
    const factory = new PixiViewModelFactory();
    const dialog = factory.createLeaderboardDialog(
      {},
      { topDailyAlliances: [] },
      'alliance',
      {},
      'daily',
    );

    expect(dialog.rows).toEqual([]);
    expect(dialog.emptyLabel).toBe('No alliances yet');
  });

  it('projects an owned trade alliance into separate trade info and member rows', () => {
    const openPlayer = vi.fn();
    const selectAllianceTab = vi.fn();
    const member = {
      allianceId: 'shared-alliance',
      memberIdentity: 'member-a',
      username: 'Mira',
      character: 'mira',
      playerLevel: 12,
      role: 'tradeMaster',
    };
    const outsider = {
      allianceId: 'other-alliance',
      memberIdentity: 'member-b',
      username: 'Nox',
      character: 'rowan',
      playerLevel: 9,
      role: 'trader',
    };
    const alliance = new PixiViewModelFactory().createAllianceDialog(
      {
        connected: true,
        ownAlliance: {
          allianceId: 'shared-alliance',
          name: 'Shared Alliance',
          tag: 'SHARE',
          joinMode: 'apply',
          memberCount: 1,
          seasonIncome: 84520,
          description: 'Patient traders sharing one hall.',
        },
        members: [member, outsider],
      },
      null,
      { openPlayer, selectAllianceTab },
    );

    expect(alliance).toMatchObject({
      title: 'Trade Alliance',
      ownedAlliance: true,
      tradeInfo: {
        identityLabel: '[SHARE] Shared Alliance',
        description: 'Patient traders sharing one hall.',
      },
    });
    expect(alliance.tradeInfoRows).toEqual([
      expect.objectContaining({ label: 'Members', value: '1/50' }),
      expect.objectContaining({ label: 'Join Mode', value: 'Apply' }),
      expect.objectContaining({ label: 'Season Income', resourceKey: 'coin' }),
      expect.objectContaining({ label: 'Membership', actionLabel: 'Leave' }),
    ]);
    expect(alliance.selectedTabId).toBe('home');
    expect(alliance.tabs.map((tab) => tab.label)).toEqual([
      'Home',
      'Quests',
      'Settings',
    ]);
    expect(alliance.members[0]).toMatchObject({
      id: 'member-a',
      username: 'Mira',
      character: 'mira',
      roleLabel: 'Trade Master',
      levelLabel: 'Lv 12',
    });
    expect(alliance.members).toHaveLength(1);
    expect(alliance.rows).toHaveLength(1);

    alliance.members[0].onActivate();
    expect(openPlayer).toHaveBeenCalledWith(member);
    alliance.tabs[1].onSelect();
    expect(selectAllianceTab).toHaveBeenCalledWith('quests');
  });

  it('projects owned alliance quests with retained fill and claim actions', () => {
    const fillAllianceQuest = vi.fn();
    const claimAllianceQuest = vi.fn();
    const snapshot = {
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'Moss Hall',
        tag: 'MOSS',
        memberCount: 1,
      },
      ownMember: {
        memberIdentity: 'member-1',
        allianceId: 'alliance-1',
        role: 'trader',
        dayKey: '1',
      },
      quests: [
        {
          allianceId: 'alliance-1',
          questId: 'fill-seeds',
          dayKey: '1',
          label: 'fill 500 mana tonic',
          questType: 'itemFill',
          itemKey: 'manaTonic',
          progress: 2,
          target: 10,
          minContribution: 3,
          crystalReward: 2,
        },
        {
          allianceId: 'alliance-1',
          questId: 'earn-coin',
          dayKey: '1',
          label: 'Earn Coin',
          questType: 'allianceIncome',
          progress: 100,
          target: 100,
          minContribution: 10,
          crystalReward: 4,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-1',
          contributorIdentity: 'member-1',
          questId: 'earn-coin',
          dayKey: '1',
          contribution: 10,
        },
      ],
    };
    const dialog = new PixiViewModelFactory().createAllianceDialog(
      snapshot,
      null,
      { fillAllianceQuest, claimAllianceQuest },
      'quests',
    );

    expect(dialog.ownedAllianceHome).toBe(false);
    expect(dialog.rowWidget).toBe('allianceQuest');
    expect(dialog.selectedTabId).toBe('quests');
    expect(dialog.rows.map((row) => row.actionLabel)).toEqual(['Fill', 'Claim']);
    expect(dialog.rows[0]).toMatchObject({
      title: 'Fill 500 mana tonic',
      contributionLabel: 'Your Fill 0/3',
      progressLabel: '2/10',
      itemKind: 'potion',
      itemKey: 'manaTonic',
      rewardAmountLabel: '2',
      rewardResource: 'crystal',
    });
    expect(dialog.tabs.find((tab) => tab.id === 'quests')?.notification).toBe(true);

    dialog.rows[0].onActivate();
    dialog.rows[1].onActivate();
    expect(fillAllianceQuest).toHaveBeenCalledWith(snapshot.quests[0]);
    expect(claimAllianceQuest).toHaveBeenCalledWith('earn-coin');
  });

  it('projects expandable alliance directory rows with members, totals, and state actions', () => {
    const selectAlliance = vi.fn();
    const joinAlliance = vi.fn();
    const applyAlliance = vi.fn();
    const cancelAllianceApplication = vi.fn();
    const openPlayer = vi.fn();
    const alliances = [
      {
        allianceId: 'dbp',
        name: 'Dominion of Bug Players',
        tag: 'DBP',
        tagColor: 'violet',
        joinMode: 'open',
        memberCount: 6,
        totalIncome: 12_450,
      },
      {
        allianceId: 'solo',
        name: 'Solo Warriors',
        tag: 'SW',
        tagColor: 'teal',
        joinMode: 'apply',
        memberCount: 1,
        totalIncome: 8_150,
      },
      {
        allianceId: 'closed',
        name: 'Closed Circle',
        tag: 'CC',
        tagColor: 'amber',
        joinMode: 'closed',
        memberCount: 1,
        totalIncome: 500,
      },
    ];
    const members = Array.from({ length: 6 }, (_, index) => ({
      allianceId: 'dbp',
      memberIdentity: `member-${index}`,
      username: `Wizard ${index}`,
      role: index === 0 ? 'tradeMaster' : 'trader',
      playerLevel: 18 - index,
    }));
    const dialog = new PixiViewModelFactory().createAllianceDialog(
      {
        connected: true,
        alliances,
        members,
        ownApplications: [
          {
            applicationKey: 'application-solo',
            allianceId: 'solo',
          },
        ],
      },
      'dbp',
      {
        selectAlliance,
        joinAlliance,
        applyAlliance,
        cancelAllianceApplication,
        openPlayer,
      },
    );

    expect(dialog.directory).toBe(true);
    expect(dialog.status).toBe('Not in an alliance');
    expect(dialog.rows).toHaveLength(3);
    expect(dialog.rows[0]).toMatchObject({
      id: 'dbp',
      type: 'allianceDirectory',
      tag: 'DBP',
      tagColor: 'violet',
      totalIncomeLabel: '12.4k',
      memberCount: 6,
      memberCapacity: 50,
      expanded: true,
      action: {
        label: 'Join Alliance',
        variant: 'green',
        enabled: true,
      },
    });
    expect(dialog.rows[0].members[0]).toMatchObject({
      username: 'Wizard 0',
      roleLabel: 'Trade Master',
      levelLabel: 'Lv 18',
    });
    expect(dialog.rows[1].action).toMatchObject({
      label: 'Cancel Application',
      variant: 'brown-dark',
      enabled: true,
    });
    expect(dialog.rows[2].action).toMatchObject({
      label: 'Closed',
      variant: 'gray',
      enabled: false,
    });

    dialog.rows[0].onActivate();
    dialog.rows[0].action.onActivate();
    dialog.rows[0].members[0].onActivate();
    dialog.rows[1].action.onActivate();
    expect(selectAlliance).toHaveBeenCalledWith('dbp');
    expect(joinAlliance).toHaveBeenCalledWith('dbp');
    expect(openPlayer).toHaveBeenCalledWith(members[0]);
    expect(cancelAllianceApplication).toHaveBeenCalledWith('application-solo');
    expect(applyAlliance).not.toHaveBeenCalled();
  });

  it('restores Browse and Create after an alliance member leaves', async () => {
    const factory = new PixiViewModelFactory();
    const selectAllianceTab = vi.fn();
    const createAlliance = vi.fn(async () => ({ ok: true }));
    const snapshotAfterLeave = {
      connected: true,
      ownAlliance: null,
      ownMember: null,
      alliances: [],
      members: [],
      ownApplications: [],
    };

    const browseDialog = factory.createAllianceDialog(
      snapshotAfterLeave,
      null,
      { selectAllianceTab, createAlliance },
      'settings',
    );

    expect(browseDialog).toMatchObject({
      directory: true,
      selectedTabId: 'browse',
      status: 'Not in an alliance',
      tabs: [
        { id: 'browse', label: 'Browse', selected: true },
        { id: 'create', label: 'Create', selected: false },
      ],
    });
    browseDialog.tabs[1].onSelect();
    expect(selectAllianceTab).toHaveBeenCalledWith('create');

    const createDialog = factory.createAllianceDialog(
      snapshotAfterLeave,
      null,
      { selectAllianceTab, createAlliance },
      'create',
    );

    expect(createDialog).toMatchObject({
      directory: false,
      selectedTabId: 'create',
      settings: {
        mode: 'create',
        editable: true,
      },
    });
    await createDialog.settings.onSave({
      name: 'Moon Traders',
      tag: 'MOON',
      tagColor: 'violet',
      description: 'Patient traders.',
      joinMode: 'apply',
    });
    expect(createAlliance).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Moon Traders',
        tag: 'MOON',
        joinMode: 'apply',
      }),
    );
  });

  it('projects full compact chat metadata without exposing player levels', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10 * 60_000);
    const openPlayer = vi.fn();
    const playerMessage = {
      id: 'mira-1',
      isOwn: true,
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
            {
              id: 'system-prestige-1',
              username: 'system',
              body: 'Ada reached ⭐ 4, completing prestige level 40',
              sentAtMs: 10 * 60_000,
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
        isOwn: true,
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
      expect(dialog.rows[1].bodyRuns).toEqual([
        {
          kind: 'text',
          text: 'The weekly world event has begun.',
        },
      ]);
      expect(dialog.rows[2]).toMatchObject({
        type: 'system',
        username: 'System',
        body: 'Ada reached ⭐ 4, completing prestige level 40',
        systemPlayerUsername: 'Ada',
        systemPlayerDetail:
          'reached ⭐ 4, completing prestige level 40',
        bodyRuns: [
          {
            kind: 'text',
            text: 'reached ',
          },
          {
            kind: 'icon',
            assetId: 'source:assets/icons/icon-prestige-star.png',
            fallbackText: '⭐',
            label: 'Prestige star',
            size: 12,
          },
          {
            kind: 'text',
            text: ' 4, completing prestige level 40',
          },
        ],
        ageLabel: 'now',
      });
      expect(dialog.rows[2].onActivate).toEqual(expect.any(Function));

      dialog.rows[0].onActivate();
      expect(openPlayer).toHaveBeenCalledWith(playerMessage);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('projects system announcement usernames as Player Info actions', () => {
    const openPlayer = vi.fn();
    const message = {
      id: 'system-level-1',
      senderIdentity: 'sender-ada',
      username: 'system',
      character: 'mira',
      body: 'Ada reached level 14',
      sentAtMs: 1_000,
    };
    const dialog = new PixiViewModelFactory().createWorldChatDialog(
      {
        connected: true,
        messages: [message],
      },
      {
        openPlayer,
        sendWorldChat: vi.fn(),
      },
    );

    expect(dialog.rows[0]).toMatchObject({
      type: 'system',
      username: 'System',
      body: 'Ada reached level 14',
      systemPlayerUsername: 'Ada',
      systemPlayerDetail: 'reached level 14',
      semanticId: 'world-chat-system-player:system-level-1',
    });
    expect(dialog.rows[0].onActivate).toEqual(expect.any(Function));

    dialog.rows[0].onActivate();

    expect(openPlayer).toHaveBeenCalledWith({
      ...message,
      username: 'Ada',
    });
  });

  it('keeps compact preview rows left-aligned and normalizes the System sender label', () => {
    const preview = new PixiViewModelFactory().createWorldChatPreview({
      messages: [
        { username: 'Mira', body: 'first' },
        { username: 'system', body: 'Wizard reached level 5' },
        { username: 'StepDav', body: 'Who are you wizard' },
      ],
    });

    expect(preview.preview).toBe(
      'System: Wizard reached level 5\nStepDav: Who are you wizard',
    );
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

  it('hides locked zero-count items from retained Bag rows', () => {
    const factory = new PixiViewModelFactory();
    const gameplay = {
      seedInventory: [
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          quantity: 0,
        },
        {
          itemTypeId: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          quantity: 0,
        },
        {
          itemTypeId: 3,
          key: 'nettleSeed',
          label: 'nettle seed',
          kind: 'seed',
          quantity: 2,
        },
      ],
      research: {
        completedResearchIds: ['unlockSeed:sageSeed'],
        boxes: [],
      },
    };

    expect(factory.createBagDialog(gameplay, 'seeds').rows).toEqual([
      expect.objectContaining({
        id: 'sageSeed',
        label: 'Sage Seed',
        value: '0',
      }),
      expect.objectContaining({
        id: 'nettleSeed',
        label: 'Nettle Seed',
        value: '2',
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
      'Level 10 > Level 5',
      'on prestige: 12 crystal 1 ruby 0 emerald total',
    ]);
    expect(prestige.prestige.summary).toMatchObject({
      headline: 'Ready at Level 10',
      nextRunLabel: 'New run starts at Level 5',
      resourceLead: 'Starting Resources',
    });
    expect(prestige.prestige.milestones[0]).toMatchObject({
      id: 'level-10',
      title: 'Level 10',
      state: 'ready',
      reward: 'reward: 12 crystal 1 ruby',
      rewardResources: [
        { resource: 'crystal', amount: 12 },
        { resource: 'ruby', amount: 1 },
      ],
      canComplete: true,
    });
    expect(prestige.prestige.tabs.map((tab) => tab.label)).toEqual([
      'Main',
      'Points',
    ]);
    expect(prestige.prestige.pointRewards[0]).toMatchObject({
      count: 1,
      title: '1 Point',
      rewardText: 'Crossroads Market',
      rewardLines: ['Crossroads Market', 'Village Market'],
    });
  });

  it('gates research tabs by the highest level reached and never relocks them after prestige', () => {
    const factory = new PixiViewModelFactory();
    const research = {
      tabs: [
        { id: 'regular', label: 'regular research', boxes: [] },
        { id: 'emerald', label: 'crystal research', boxes: [] },
        { id: 'automation', label: 'automation', boxes: [] },
        { id: 'advanced', label: 'advanced research', boxes: [] },
      ],
    };

    const levelThree = factory.createResearch({
      gameplay: { playerLevel: { currentLevel: 3 }, research },
      selectedTabId: 'advanced',
    }).research;

    expect(levelThree.selectedTabId).toBe('regular');
    expect(levelThree.tabs.map((tab) => ({
      id: tab.id,
      locked: tab.locked,
      requiredLevel: tab.requiredLevel,
    }))).toEqual([
      { id: 'regular', locked: false, requiredLevel: 1 },
      { id: 'emerald', locked: true, requiredLevel: 4 },
      { id: 'automation', locked: true, requiredLevel: 7 },
      { id: 'advanced', locked: true, requiredLevel: 10 },
    ]);
    expect(levelThree.tabs[1].lockPrompt).toBe('Unlocks at level 4');

    const levelFive = factory.createResearch({
      gameplay: { playerLevel: { currentLevel: 5 }, research },
      selectedTabId: 'emerald',
    }).research;
    expect(levelFive.selectedTabId).toBe('emerald');
    expect(levelFive.tabs.find((tab) => tab.id === 'emerald')?.locked).toBe(false);
    expect(levelFive.tabs.find((tab) => tab.id === 'automation')?.locked).toBe(true);
    expect(levelFive.tabs.find((tab) => tab.id === 'advanced')?.locked).toBe(true);

    const levelSeven = factory.createResearch({
      gameplay: { playerLevel: { currentLevel: 7 }, research },
      selectedTabId: 'automation',
    }).research;
    expect(levelSeven.selectedTabId).toBe('automation');
    expect(levelSeven.tabs.find((tab) => tab.id === 'automation')?.locked).toBe(false);
    expect(levelSeven.tabs.find((tab) => tab.id === 'advanced')?.locked).toBe(true);

    const postPrestige = factory.createResearch({
      gameplay: {
        playerLevel: { currentLevel: 5 },
        prestige: { completedLevels: [10] },
        research,
      },
      selectedTabId: 'advanced',
    }).research;
    expect(postPrestige.selectedTabId).toBe('advanced');
    expect(postPrestige.tabs.find((tab) => tab.id === 'advanced')?.locked).toBe(false);
    expect(postPrestige.tabs.every((tab) => tab.locked === false)).toBe(true);
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

  it('keeps standard box order, limits locked previews, and notifies tabs', () => {
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
      'seedUnlocks',
      'plotGrowth',
      'cauldronCapacity',
      'researchTime',
    ]);
    expect(model.research.runFocus).toBeUndefined();
    const lockedBox = tab.boxes.find((box) => box.id === 'seedUnlocks');
    expect(lockedBox.researches).toHaveLength(3);
    expect(lockedBox.allResearches).toHaveLength(4);
    expect(lockedBox.hiddenLockedCount).toBe(1);
    expect(tab.notification).toBe(true);
    expect(model.research.notification).toBe(true);
  });
});
