import { describe, expect, it, vi } from "vitest";

import { PixiPagesFacade } from "./PixiPagesFacade.js";

describe("PixiPagesFacade", () => {
  it("registers all pages once and binds only the active retained instance", () => {
    const harness = createHarness();
    const pages = new PixiPagesFacade(harness.dependencies);

    expect([...harness.factories.keys()]).toEqual([
      "workshop",
      "brewing",
      "garden",
      "research",
      "shop",
      "guild",
      "prestige",
    ]);

    pages.mount();

    expect(harness.runtime.bindPage).toHaveBeenCalledTimes(1);
    expect(harness.getBoundPage("workshop").chrome).toEqual({
      worldChatVisible: true,
    });
    expect(harness.runtime.activatePage).toHaveBeenCalledWith("workshop");
    expect(harness.runtime.bindGlobalSurface).toHaveBeenCalledWith(
      "chrome.top",
      expect.objectContaining({ username: "elara" }),
    );
    expect(harness.runtime.bindGlobalSurface).toHaveBeenCalledWith(
      "chrome.chat",
      expect.objectContaining({
        label: "World Chat",
        visible: true,
      }),
    );

    expect(pages.show("research")).toBe(true);
    expect(pages.getCurrentPageId()).toBe("research");
    expect(harness.runtime.activatePage).toHaveBeenLastCalledWith("research");
    expect(harness.runtime.bindPage).toHaveBeenCalledTimes(2);
    expect(harness.getBoundGlobal("chrome.chat")).toEqual(
      expect.objectContaining({
        label: "World Chat",
        visible: true,
      }),
    );
    expect(harness.getBoundGlobal("chrome.chat").onActivate()).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "worldChat",
      expect.objectContaining({ title: "World Chat" }),
    );
    expect(pages.getCurrentPageId()).toBe("research");

    pages.unmount();
    expect(harness.runtime.deactivatePage).toHaveBeenCalledTimes(1);
  });

  it("releases page chat clearance before world chat unlocks", () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 2 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);

    pages.mount();

    expect(harness.getBoundGlobal("chrome.chat").visible).toBe(false);
    expect(harness.getBoundPage("workshop").chrome).toEqual({
      worldChatVisible: false,
    });

    expect(pages.show("garden")).toBe(true);
    expect(harness.getBoundPage("garden").chrome).toEqual({
      worldChatVisible: false,
    });
  });

  it("keeps level progress visible across partial frame resource snapshots", () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    let publishFrameResources = null;
    harness.gameplayFacade.subscribeFrameResources.mockImplementation(
      (listener) => {
        publishFrameResources = listener;
        return vi.fn();
      },
    );
    const pages = new PixiPagesFacade(harness.dependencies);

    pages.mount();

    expect(harness.getBoundGlobal("chrome.top").quest).toMatchObject({
      visible: true,
      completed: 0,
      total: 4,
    });

    publishFrameResources({
      mana: { current: 11, cap: 20, perSecond: 1 },
      tasks: { currentLevel: 1 },
    });

    expect(harness.getBoundGlobal("chrome.top").quest).toMatchObject({
      visible: true,
      completed: 0,
      total: 4,
    });
  });

  it("routes view actions to authoritative gameplay facades", () => {
    const harness = createHarness();
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    const workshopModel = harness.getBoundPage("workshop");
    workshopModel.actions.summonSeed();
    expect(harness.gameplayFacade.summonSeed).toHaveBeenCalledTimes(1);

    expect(pages.show("research")).toBe(true);
    const researchModel = harness.getBoundPage("research");
    researchModel.actions.buyResearch("mana-tonic");
    expect(harness.gameplayFacade.buyResearch).toHaveBeenCalledWith(
      "mana-tonic",
    );

    expect(pages.show("guild")).toBe(true);
    const guildModel = harness.getBoundPage("guild");
    guildModel.actions.createGuild({
      name: "Moon",
      tag: "MOON",
      color: "violet",
    });
    expect(harness.gameplayFacade.createGuild).toHaveBeenCalledWith({
      name: "Moon",
      tag: "MOON",
      color: "violet",
    });
  });

  it.each([
    ["research", "research"],
    ["summon", "workshop"],
    ["grow", "garden"],
    ["brew", "brewing"],
    ["sell", "shop"],
  ])(
    "navigates an Elara %s request to the room that completes it",
    (taskType, expectedPageId) => {
      const gameplaySnapshot = createGameplaySnapshot();
      gameplaySnapshot.tasks.level.tasks = [
        {
          taskId: `request-${taskType}`,
          type: taskType,
          autoProgress: true,
          isActiveQuest: true,
          requirementLabel: `${taskType} request`,
          requiredQuantity: 1,
        },
      ];
      const harness = createHarness({ gameplaySnapshot });
      const pages = new PixiPagesFacade(harness.dependencies);
      pages.mount();

      const request = harness.getBoundPage("workshop").workshop.tasks.rows[0];
      expect(request.onRowActivate()).toBe(true);
      expect(pages.getCurrentPageId()).toBe(expectedPageId);
    },
  );

  it("keeps the Daily Tasks tab selection live and routes milestone claims", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.personalTasks = {
      unlocked: true,
      claimableRewards: 1,
      daily: {
        periodType: "daily",
        resetLabel: "resets 12h",
        currentPoints: 50,
        maxPoints: 100,
        completedTasks: 1,
        totalTasks: 1,
        tasks: [],
        rewards: [
          {
            threshold: 50,
            reward: { text: "+25 coin" },
            claimed: false,
            claimable: true,
          },
        ],
      },
      weekly: {
        periodType: "weekly",
        resetLabel: "resets 3d",
        currentPoints: 50,
        maxPoints: 700,
        tasks: [],
        rewards: [],
      },
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    const tasksDialog =
      harness.getBoundPage("workshop").workshop.dialogs.personalTasks;
    expect(tasksDialog.selectedTabId).toBe("tasks");

    tasksDialog.tabs.find((tab) => tab.id === "rewards").onSelect("rewards");

    const rewardsDialog =
      harness.getBoundPage("workshop").workshop.dialogs.personalTasks;
    expect(rewardsDialog.selectedTabId).toBe("rewards");
    const claimRow = rewardsDialog.rows.find(
      (row) => row.id === "daily:reward:50",
    );
    claimRow.onActivate();

    expect(
      harness.gameplayFacade.claimPersonalTaskMilestoneReward,
    ).toHaveBeenCalledWith("daily", 50);
  });

  it("emits spend bursts only after successful purchases", () => {
    const harness = createHarness();
    harness.gameplayFacade.summonSeed.mockReturnValue({
      ok: true,
      cost: 10,
    });
    harness.gameplayFacade.fillTask.mockReturnValue({
      ok: true,
      taskId: "sage-turn-in",
      item: {
        key: "sageSeed",
        label: "sage seed",
        kind: "seed",
      },
      quantity: 2,
    });
    harness.gameplayFacade.buyResearch
      .mockReturnValueOnce({
        ok: false,
        reason: "not_enough_crystal",
        cost: 2,
        costCurrency: "crystal",
      })
      .mockReturnValueOnce({
        ok: true,
        researchId: "manaProductionRate:1",
        cost: 2,
        costCurrency: "crystal",
      });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    const workshop = harness.getBoundPage("workshop");
    workshop.actions.summonSeed();
    workshop.actions.fillTask("sage-turn-in");
    pages.show("research");
    const research = harness.getBoundPage("research");
    research.actions.buyResearch("manaProductionRate:1");
    research.actions.buyResearch("manaProductionRate:1");

    expect(harness.transientEffects.emitReward).toHaveBeenNthCalledWith(1, {
      visualOnly: true,
      spendBursts: [
        {
          anchorId: "research.manaProductionRate:1",
          resource: "crystal",
        },
      ],
    });
    expect(harness.transientEffects.emitReward).toHaveBeenCalledTimes(1);
  });

  it("keeps an open Market Ledger interactive while switching unlocked tabs", () => {
    const gameplaySnapshot = createGameplaySnapshot({ level: 4 });
    gameplaySnapshot.shop = {
      shelf: {
        sellKinds: [
          { kind: "seed", label: "seeds" },
          { kind: "herb", label: "herbs" },
          { kind: "potion", label: "potions" },
        ],
      },
      stock: {
        sellKinds: [
          { kind: "seed", label: "seeds" },
          { kind: "herb", label: "herbs" },
          { kind: "potion", label: "potions" },
        ],
        items: [
          {
            itemTypeId: 1,
            key: "sageSeed",
            kind: "seed",
            label: "sage seed",
            buyCoin: 3,
            stock: 4,
            npcNeed: 6,
          },
          {
            itemTypeId: 1001,
            key: "sageHerb",
            kind: "herb",
            label: "sage",
            buyCoin: 4,
            stock: 3,
            npcNeed: 5,
          },
        ],
      },
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.ledger"]);
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    expect(pages.show("shop")).toBe(true);

    const ledger = harness.getBoundPage("shop").shop.dialogs.ledger;
    ledger.tabs.find((tab) => tab.id === "herb").action();

    const reboundLedger = harness.getBoundPage("shop").shop.dialogs.ledger;
    expect(reboundLedger.tabs.find((tab) => tab.id === "herb")).toMatchObject({
      label: "Herbs",
      selected: true,
    });
    expect(reboundLedger.items).toEqual([
      expect.objectContaining({
        label: "Sage",
        itemKind: "herb",
        itemKey: "sageHerb",
      }),
    ]);
    expect(harness.pageSurface.openDialog).toHaveBeenLastCalledWith(
      "shop.ledger",
      expect.objectContaining({
        title: "Market Ledger",
        items: reboundLedger.items,
      }),
    );
  });

  it("shows a centered transient prompt when summon has no active seed weights", () => {
    const harness = createHarness();
    harness.gameplayFacade.summonSeed.mockReturnValue({
      ok: false,
      reason: "no_active_seed_weights",
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    const result = harness.getBoundPage("workshop").actions.summonSeed();

    expect(result).toEqual({
      ok: false,
      reason: "no_active_seed_weights",
    });
    expect(harness.transientEffects.emitReward).toHaveBeenCalledWith({
      message: "Select a seed to drop",
      flyoutKey: "workshop-summon-seed-selection",
    });
  });

  it("hides unavailable Brewing progression controls and keeps empty actions pressable", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.brewing = {
      configuredMaxCauldrons: 5,
      nextCauldronNumber: 2,
      nextCauldronCost: 25,
      nextCauldronLockedByResearch: true,
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          brewQuantity: 1,
          maxBrewQuantity: 1,
        },
      ],
      recipes: [],
      herbs: [],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.cancelBrewing.mockReturnValue({
      ok: false,
      reason: "no_brew",
    });
    harness.gameplayFacade.collectBrewing.mockReturnValue({
      ok: false,
      reason: "no_brew",
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show("brewing")).toBe(true);
    const brewingModel = harness.getBoundPage("brewing");
    expect(brewingModel.brewing.cauldrons).toHaveLength(1);
    expect(brewingModel.brewing.cauldrons[0]).toMatchObject({
      autoBrewAvailable: false,
      maxBrewQuantity: 1,
    });

    expect(brewingModel.actions.cancelBrew(0)).toEqual({
      ok: false,
      reason: "no_brew",
    });
    expect(brewingModel.actions.collectBrew(0)).toEqual({
      ok: false,
      reason: "no_brew",
    });
    expect(harness.transientEffects.emitReward).toHaveBeenNthCalledWith(1, {
      message: "No potion is brewing to cancel",
      flyoutKey: "brewing-cancel-empty",
    });
    expect(harness.transientEffects.emitReward).toHaveBeenNthCalledWith(2, {
      message: "No potion is ready to collect",
      flyoutKey: "brewing-collect-empty",
    });
  });

  it("keeps a Brewing cauldron id stable when its buy slot becomes unlocked", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.coin.current = 100;
    gameplaySnapshot.brewing = {
      configuredMaxCauldrons: 5,
      nextCauldronNumber: 2,
      nextCauldronCost: 25,
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          brewQuantity: 1,
          maxBrewQuantity: 1,
        },
      ],
      recipes: [],
      herbs: [],
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");

    const lockedId = harness.getBoundPage("brewing")
      .brewing.cauldrons[1].id;

    gameplaySnapshot.brewing.cauldrons.push({
      cauldronIndex: 1,
      cauldronNumber: 2,
      brewQuantity: 1,
      maxBrewQuantity: 1,
    });
    gameplaySnapshot.brewing.nextCauldronNumber = null;
    gameplaySnapshot.brewing.nextCauldronCost = null;
    pages.refreshPage("brewing");

    expect(
      harness.getBoundPage("brewing").brewing.cauldrons[1].id,
    ).toBe(lockedId);
  });

  it("places the selected herb in the chosen cauldron slot", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.research.completedResearchIds = [
      "unlockSeed:sageSeed",
      "unlockSeed:mintSeed",
    ];
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          canAddIngredient: true,
        },
      ],
      recipes: [],
      herbs: [
        {
          itemTypeId: 1001,
          key: "sageHerb",
          label: "sage",
          kind: "herb",
          availableQuantity: 3,
        },
        {
          itemTypeId: 1002,
          key: "mintHerb",
          label: "mint",
          kind: "herb",
          availableQuantity: 0,
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.setBrewingIngredientSlotQuantity.mockReturnValue({
      ok: true,
      itemTypeId: 1001,
      quantity: 1,
      slotIndex: 2,
      cauldronIndex: 0,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");
    const brewing = harness.getBoundPage("brewing");

    expect(brewing.actions.openHerbPicker(0, 2)).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "herbs",
      expect.objectContaining({
        title: "Choose Herb",
        cauldronIndex: 0,
        slotIndex: 2,
        rows: [
          expect.objectContaining({
            itemTypeId: 1001,
            key: "sageHerb",
            detail: "3 Available",
            enabled: true,
            itemKind: "herb",
          }),
          expect.objectContaining({
            itemTypeId: 1002,
            key: "mintHerb",
            detail: "0 Available",
            disabled: true,
          }),
        ],
      }),
    );

    expect(
      brewing.actions.selectHerb(
        { itemTypeId: 1001 },
        0,
        2,
      ),
    ).toMatchObject({ ok: true });
    expect(
      harness.gameplayFacade.setBrewingIngredientSlotQuantity,
    ).toHaveBeenCalledWith(1001, 1, 2, 0);
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith(
      "brewing.herbs",
    );
    expect(
      harness.gameplayFacade.addBrewingIngredient,
    ).not.toHaveBeenCalled();
  });

  it("confirms before emptying the selected cauldron and clearing its page-local recipe", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    const recipe = {
      key: "manaTonic",
      label: "mana tonic",
      unlocked: true,
      ingredients: [],
    };
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          canAddIngredient: true,
          ingredients: [{ itemTypeId: 1001, key: "sageHerb" }],
        },
      ],
      recipes: [recipe],
      herbs: [],
    };
    const harness = createHarness({ gameplaySnapshot });
    const globalDialogPresenter = {
      mount: vi.fn(),
      open: vi.fn(() => true),
    };
    harness.dependencies.globalDialogPresenter = globalDialogPresenter;
    harness.gameplayFacade.prepareBrewingRecipe.mockReturnValue({ ok: true });
    harness.gameplayFacade.clearBrewingCauldron.mockReturnValue({ ok: true });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");
    const brewing = harness.getBoundPage("brewing");

    expect(brewing.actions.selectRecipe(recipe, 0)).toEqual({ ok: true });
    expect(brewing.actions.emptyCauldron(0)).toBe(true);
    expect(
      harness.gameplayFacade.clearBrewingCauldron,
    ).not.toHaveBeenCalled();
    expect(globalDialogPresenter.open).toHaveBeenCalledWith(
      "confirmation",
      expect.objectContaining({
        title: "Empty Cauldron?",
        message: "Are you sure you want to empty the cauldron contents?",
        cancelLabel: "Cancel",
        cancelColor: "yellow",
        confirmLabel: "Empty",
        confirmColor: "yellow",
        value: { cauldronIndex: 0 },
        actions: { confirm: expect.any(Function) },
      }),
    );

    const confirmation = globalDialogPresenter.open.mock.calls.at(-1)[1];
    expect(confirmation.actions.confirm(confirmation.value)).toEqual({
      ok: true,
    });
    expect(
      harness.gameplayFacade.clearBrewingCauldron,
    ).toHaveBeenCalledWith(0);
    expect(brewing.actions.clearRecipe).toBe(
      brewing.actions.emptyCauldron,
    );
    expect(
      harness.getBoundPage("brewing").brewing.cauldrons[0]
        .selectedRecipe,
    ).toBeNull();
  });

  it("confirms before cancelling an active brew", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          activeBrew: { phase: "brewing" },
        },
      ],
      recipes: [],
      herbs: [],
    };
    const harness = createHarness({ gameplaySnapshot });
    const globalDialogPresenter = {
      mount: vi.fn(),
      open: vi.fn(() => true),
    };
    harness.dependencies.globalDialogPresenter = globalDialogPresenter;
    harness.gameplayFacade.cancelBrewing.mockReturnValue({ ok: true });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");
    const brewing = harness.getBoundPage("brewing");

    expect(brewing.actions.cancelBrew(0)).toBe(true);
    expect(harness.gameplayFacade.cancelBrewing).not.toHaveBeenCalled();
    expect(globalDialogPresenter.open).toHaveBeenCalledWith(
      "confirmation",
      expect.objectContaining({
        title: "Cancel Brewing?",
        message:
          "Cancel this brew? The unfinished potion, herbs, and mana will be lost.",
        cancelLabel: "Keep Brewing",
        cancelColor: "yellow",
        confirmLabel: "Cancel Brew",
        confirmColor: "yellow",
        value: { cauldronIndex: 0 },
        actions: { confirm: expect.any(Function) },
      }),
    );

    const confirmation = globalDialogPresenter.open.mock.calls.at(-1)[1];
    expect(confirmation.actions.confirm(confirmation.value)).toEqual({
      ok: true,
    });
    expect(harness.gameplayFacade.cancelBrewing).toHaveBeenCalledWith(0);
  });

  it("copies the selected recipe into Auto Brew before enabling it", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    const recipe = {
      key: "manaTonic",
      label: "mana tonic",
      unlocked: true,
      ingredients: [],
    };
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          brewQuantity: 1,
          maxBrewQuantity: 1,
          autoBrewEnabled: false,
          autoBrewRecipeKey: null,
        },
      ],
      recipes: [recipe],
      herbs: [],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.prepareBrewingRecipe.mockReturnValue({
      ok: true,
    });
    harness.gameplayFacade.setBrewingAutoBrewRecipe.mockReturnValue({
      ok: true,
    });
    harness.gameplayFacade.setBrewingAutoBrewEnabled.mockReturnValue({
      ok: true,
      autoBrewEnabled: true,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");
    const brewing = harness.getBoundPage("brewing");

    expect(brewing.actions.selectRecipe(recipe, 0)).toEqual({
      ok: true,
    });
    expect(brewing.actions.toggleAutoBrew(0)).toEqual({
      ok: true,
      autoBrewEnabled: true,
    });

    expect(
      harness.gameplayFacade.setBrewingAutoBrewRecipe,
    ).toHaveBeenCalledWith("manaTonic", 0);
    expect(
      harness.gameplayFacade.setBrewingAutoBrewEnabled,
    ).toHaveBeenCalledWith(true, 0);
    expect(
      harness.gameplayFacade.setBrewingAutoBrewRecipe.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      harness.gameplayFacade.setBrewingAutoBrewEnabled.mock
        .invocationCallOrder[0],
    );
    expect(
      harness.gameplayFacade.toggleBrewingAutoBrewEnabled,
    ).not.toHaveBeenCalled();
  });

  it("projects recipe research availability and routes enabled research actions", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 1,
          ingredients: [
            {
              itemTypeId: 1001,
              key: "sageHerb",
            },
          ],
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: "sageHerb",
          quantity: 5,
        },
      ],
      recipes: [
        {
          key: "manaTonic",
          label: "mana tonic",
          unlocked: false,
          ingredients: [
            {
              itemTypeId: 1001,
              key: "sageHerb",
              label: "sage",
              quantity: 1,
            },
          ],
        },
        {
          key: "minorHealingPotion",
          label: "minor healing potion",
          unlocked: false,
        },
      ],
    };
    gameplaySnapshot.research = {
      tabs: [
        {
          id: "regular",
          boxes: [
            {
              id: "recipes",
              researches: [
                {
                  id: "unlockRecipe:manaTonic",
                  canResearch: true,
                },
                {
                  id: "unlockRecipe:minorHealingPotion",
                  canResearch: false,
                },
              ],
            },
          ],
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.buyResearch.mockReturnValue({ ok: true });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show("brewing")).toBe(true);
    const brewingModel = harness.getBoundPage("brewing");
    expect(brewingModel.brewing.recipes).toEqual([
      expect.objectContaining({
        key: "manaTonic",
        researchId: "unlockRecipe:manaTonic",
        canResearch: true,
        ingredients: [
          expect.objectContaining({
            key: "sageHerb",
            owned: 4,
          }),
        ],
      }),
      expect.objectContaining({
        key: "minorHealingPotion",
        researchId: "unlockRecipe:minorHealingPotion",
        canResearch: false,
      }),
    ]);

    expect(
      brewingModel.actions.researchRecipe(brewingModel.brewing.recipes[0], 1),
    ).toEqual({ ok: true });
    expect(harness.gameplayFacade.buyResearch).toHaveBeenCalledWith(
      "unlockRecipe:manaTonic",
    );
    expect(harness.pageSurface.openDialog).toHaveBeenLastCalledWith(
      "recipes",
      expect.objectContaining({ cauldronIndex: 1 }),
    );
    expect(
      brewingModel.actions.researchRecipe(brewingModel.brewing.recipes[1], 1),
    ).toBe(false);
    expect(harness.gameplayFacade.buyResearch).toHaveBeenCalledTimes(1);
  });

  it("keeps retained stall picker drafts interactive until an allocation is marked", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.research.completedResearchIds = ["unlockSeed:sageSeed"];
    gameplaySnapshot.shop = {
      shelf: {
        sellKinds: [
          { kind: "seed", label: "seeds" },
          { kind: "herb", label: "herbs" },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: "sageSeed",
            kind: "seed",
            label: "sage seed",
            quantity: 8,
          },
          {
            itemTypeId: 2,
            key: "sageHerb",
            kind: "herb",
            label: "sage",
            quantity: 3,
          },
        ],
        slots: [
          {
            slotNumber: 1,
            sellItemTypeId: null,
            futureItemTypeId: null,
            loadedQuantity: 0,
          },
        ],
      },
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.stall"]);
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let dialog = harness.getBoundPage("shop").shop.traders.stalls[0].dialog;
    expect(dialog.items.map((item) => item.itemKey)).toEqual(["sageSeed"]);
    expect(dialog.summaryRows[0]).toMatchObject({
      value: "Empty",
      quantityLabel: "",
    });
    expect(dialog.range.enabled).toBe(false);
    expect(dialog.items[0].selected).toBe(false);

    dialog.items[0].action();
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "shop.stall",
      expect.objectContaining({
        summaryRows: [expect.objectContaining({ value: "Sage Seed" })],
      }),
    );
    dialog = harness.getBoundPage("shop").shop.traders.stalls[0].dialog;
    expect(dialog.summaryRows[0]).toMatchObject({
      value: "Sage Seed",
      quantityLabel: "x8",
    });
    expect(dialog.actions[0]).toMatchObject({
      label: "Mark x8",
      enabled: true,
    });

    dialog.range.onChange(2);
    dialog = harness.getBoundPage("shop").shop.traders.stalls[0].dialog;
    expect(dialog.actions[0].label).toBe("Mark x2");

    dialog.tabs.find((tab) => tab.id === "herb").action();
    dialog = harness.getBoundPage("shop").shop.traders.stalls[0].dialog;
    expect(dialog.items.map((item) => item.itemKey)).toEqual(["sageHerb"]);

    dialog.tabs.find((tab) => tab.id === "seed").action();
    dialog = harness.getBoundPage("shop").shop.traders.stalls[0].dialog;
    dialog.actions[0].action();

    expect(harness.gameplayFacade.selectShopShelfSlot).toHaveBeenCalledWith(1);
    expect(
      harness.gameplayFacade.setSelectedShopShelfSlotQuantity,
    ).toHaveBeenCalledWith(1, 2);
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith("shop.stall");
  });

  it("keeps retained player request and sale drafts interactive", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.research.completedResearchIds = ["unlockSeed:sageSeed"];
    const sageSeed = {
      itemTypeId: 1,
      key: "sageSeed",
      kind: "seed",
      label: "sage seed",
      quantity: 8,
    };
    gameplaySnapshot.shop = {
      shelf: {
        sellKinds: [{ kind: "seed", label: "seeds" }],
        sellItems: [sageSeed],
      },
      playerRequests: {
        slots: [{ slotNumber: 1, unlocked: true }],
      },
      playerShelf: {
        sellKinds: [{ kind: "seed", label: "seeds" }],
        sellItems: [sageSeed],
        slots: [{ slotNumber: 1, unlocked: true }],
      },
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue([
      "shop.request",
      "shop.listing",
    ]);
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let shop = harness.getBoundPage("shop").shop;
    shop.players.requests.slots[0].dialog.items[0].action();
    shop = harness.getBoundPage("shop").shop;
    expect(shop.players.requests.slots[0].dialog).toMatchObject({
      title: "Request",
      summaryRows: [expect.objectContaining({ value: "Sage Seed" })],
    });

    shop.players.requests.slots[0].dialog.fields[0].onChange("12");
    shop = harness.getBoundPage("shop").shop;
    expect(shop.players.requests.slots[0].dialog.fields[0].value).toBe("12");

    shop.players.market.slots[0].dialog.items[0].action();
    shop = harness.getBoundPage("shop").shop;
    expect(shop.players.market.slots[0].dialog).toMatchObject({
      title: "Sell",
      range: {
        min: 1,
        max: 8,
        value: 8,
      },
      summaryRows: [
        expect.objectContaining({
          value: "Sage Seed",
          quantityLabel: "x8",
        }),
      ],
    });

    shop.players.market.slots[0].dialog.range.onChange(3);
    shop = harness.getBoundPage("shop").shop;
    expect(shop.players.market.slots[0].dialog).toMatchObject({
      range: { value: 3 },
      summaryRows: [expect.objectContaining({ quantityLabel: "x3" })],
    });
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "shop.request",
      expect.objectContaining({ title: "Request" }),
    );
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "shop.listing",
      expect.objectContaining({ title: "Sell" }),
    );
  });

  it("submits retained player requests through backend then gameplay", async () => {
    const gameplaySnapshot = createPlayerRequestGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.request"]);
    harness.dependencies.playerShopFacade.setSlotRequest = vi.fn(async () => ({
      ok: true,
    }));
    harness.dependencies.playerShopFacade.clearSlotRequest = vi.fn();
    harness.gameplayFacade.setPlayerShopRequest = vi.fn(() => ({ ok: true }));
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.items[0].action();
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.fields[0].onChange("1");
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.fields[1].onChange("10");
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;

    await dialog.actions[0].action();

    expect(harness.dependencies.playerShopFacade.setSlotRequest).toHaveBeenCalledWith({
      slotNumber: 1,
      itemKey: "sageSeed",
      itemLabel: "sage seed",
      itemKind: "seed",
      quantity: 10,
      priceCoin: 1,
    });
    expect(harness.gameplayFacade.setPlayerShopRequest).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        itemTypeId: 1,
        quantity: 10,
        priceCoin: 1,
      }),
    );
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith("shop.request");
  });

  it("sells a retained player listing through backend then gameplay", async () => {
    const gameplaySnapshot = createPlayerListingGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.listing"]);
    harness.dependencies.playerShopFacade.setSlotListing = vi.fn(async () => ({
      ok: true,
    }));
    harness.dependencies.playerShopFacade.clearSlotListing = vi.fn();
    harness.gameplayFacade.selectPlayerShopShelfSlot = vi.fn(() => ({ ok: true }));
    harness.gameplayFacade.setSelectedPlayerShopShelfSlotListing = vi.fn(() => ({
      ok: true,
    }));
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;
    dialog.items[0].action();
    dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;

    await dialog.actions.find((action) => action.id === "list").action();

    expect(harness.dependencies.playerShopFacade.setSlotListing).toHaveBeenCalledWith({
      slotNumber: 1,
      itemKey: "sageSeed",
      itemLabel: "sage seed",
      itemKind: "seed",
      quantity: 8,
      priceCoin: 1,
    });
    expect(harness.gameplayFacade.selectPlayerShopShelfSlot).toHaveBeenCalledWith(1);
    expect(
      harness.gameplayFacade.setSelectedPlayerShopShelfSlotListing,
    ).toHaveBeenCalledWith({
      itemTypeId: 1,
      quantity: 8,
      priceCoin: 1,
    });
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith("shop.listing");
  });

  it("shows the backend reason when a retained player listing is rejected", async () => {
    const gameplaySnapshot = createPlayerListingGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.listing"]);
    harness.dependencies.playerShopFacade.setSlotListing = vi.fn(async () => ({
      ok: false,
      reason: "publish_failed",
      message: "Player shop slot requires a higher market rank.",
    }));
    harness.gameplayFacade.selectPlayerShopShelfSlot = vi.fn(() => ({ ok: true }));
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;
    dialog.items[0].action();
    dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;

    await dialog.actions.find((action) => action.id === "list").action();

    dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;
    expect(dialog.status).toBe("Player shop slot requires a higher market rank.");
    expect(harness.gameplayFacade.selectPlayerShopShelfSlot).not.toHaveBeenCalled();
    expect(harness.runtime.closeDialog).not.toHaveBeenCalledWith("shop.listing");
  });

  it("keeps Clear active and shows a flyout when a player listing is empty", async () => {
    const gameplaySnapshot = createPlayerListingGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.listing"]);
    harness.dependencies.playerShopFacade.clearSlotListing = vi.fn();
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    const dialog = harness.getBoundPage("shop").shop.players.market.slots[0].dialog;
    const clearAction = dialog.actions.find((action) => action.id === "clear");

    expect(clearAction.enabled).toBe(true);
    await clearAction.action();

    expect(harness.transientEffects.emitReward).toHaveBeenCalledWith({
      message: "Nothing to clear",
      flyoutKey: "shop-listing-nothing-to-clear-1",
    });
    expect(
      harness.dependencies.playerShopFacade.clearSlotListing,
    ).not.toHaveBeenCalled();
    expect(harness.runtime.closeDialog).not.toHaveBeenCalledWith("shop.listing");
  });

  it("keeps the request dialog open and explains backend failures", async () => {
    const gameplaySnapshot = createPlayerRequestGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue(["shop.request"]);
    harness.dependencies.playerShopFacade.setSlotRequest = vi.fn(async () => ({
      ok: false,
      reason: "offline",
    }));
    harness.gameplayFacade.setPlayerShopRequest = vi.fn(() => ({ ok: true }));
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("shop");

    let dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.items[0].action();
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.fields[0].onChange("1");
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    dialog.fields[1].onChange("10");
    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;

    await dialog.actions[0].action();

    dialog = harness.getBoundPage("shop").shop.players.requests.slots[0].dialog;
    expect(dialog.status).toBe("offline");
    expect(harness.gameplayFacade.setPlayerShopRequest).not.toHaveBeenCalled();
    expect(harness.runtime.closeDialog).not.toHaveBeenCalledWith("shop.request");
  });

  it("keeps unaffordable Brewing recipes unselected and leaves the book open", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    const recipe = {
      key: "manaTonic",
      label: "mana tonic",
      unlocked: true,
      ingredients: [
        {
          itemTypeId: 1001,
          key: "sageHerb",
          label: "sage",
          quantity: 1,
        },
      ],
    };
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          brewQuantity: 2,
          maxBrewQuantity: 2,
          ingredients: [],
        },
      ],
      recipes: [recipe],
      herbs: [
        {
          itemTypeId: 1001,
          key: "sageHerb",
          quantity: 1,
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.prepareBrewingRecipe.mockReturnValue({
      ok: false,
      reason: "not_enough_ingredients",
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");

    expect(pages.openBrewingRecipesDialog(0)).toBe(true);
    const dialogModel =
      harness.pageSurface.openDialog.mock.calls.at(-1)[1];
    expect(dialogModel.recipes[0]).toMatchObject({
      key: "manaTonic",
      canSelect: false,
      selected: false,
    });

    const result = harness.getBoundPage("brewing").actions.selectRecipe(
      recipe,
      0,
    );

    expect(result).toEqual({
      ok: false,
      reason: "not_enough_ingredients",
    });
    expect(harness.runtime.closeDialog).not.toHaveBeenCalledWith(
      "brewing.recipes",
    );
    pages.refreshPage("brewing");
    expect(
      harness.getBoundPage("brewing").brewing.cauldrons[0].selectedRecipe,
    ).toBeNull();
  });

  it("reuses a selected recipe after collection and projects per-slot availability", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.mana.current = 20;
    const recipe = {
      key: "manaTonic",
      label: "mana tonic",
      unlocked: true,
      manaCost: 5,
      ingredients: Array.from({ length: 3 }, () => ({
        itemTypeId: 1001,
        key: "sageHerb",
        label: "sage",
        quantity: 1,
      })),
    };
    gameplaySnapshot.brewing = {
      cauldrons: [
        {
          cauldronIndex: 0,
          cauldronNumber: 1,
          brewQuantity: 1,
          maxBrewQuantity: 1,
          ingredients: [],
          canAddIngredient: true,
          canBrew: false,
        },
      ],
      recipes: [recipe],
      herbs: [
        {
          itemTypeId: 1001,
          key: "sageHerb",
          quantity: 3,
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.prepareBrewingRecipe.mockReturnValue({ ok: true });
    harness.gameplayFacade.brewCauldron.mockReturnValue({ ok: true });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("brewing");

    expect(
      harness.getBoundPage("brewing").actions.selectRecipe(recipe, 0),
    ).toEqual({ ok: true });
    pages.refreshPage("brewing");

    let cauldron = harness.getBoundPage("brewing").brewing.cauldrons[0];
    expect(cauldron.selectedRecipe.ingredients).toEqual([
      expect.objectContaining({ owned: 1, quantity: 1 }),
      expect.objectContaining({ owned: 1, quantity: 1 }),
      expect.objectContaining({ owned: 1, quantity: 1 }),
    ]);
    expect(cauldron.recipeReadiness).toEqual({
      hasEnoughIngredients: true,
      hasEnoughMana: true,
    });
    expect(cauldron.primaryAction).toMatchObject({
      id: "brew",
      enabled: true,
      prepareRecipeKey: "manaTonic",
    });

    expect(
      harness.getBoundPage("brewing").actions.performCauldronAction(
        cauldron,
        cauldron.primaryAction,
      ),
    ).toEqual({ ok: true });
    expect(
      harness.gameplayFacade.prepareBrewingRecipe,
    ).toHaveBeenLastCalledWith("manaTonic", 0);
    expect(harness.gameplayFacade.brewCauldron).toHaveBeenCalledWith(0);

    gameplaySnapshot.brewing.herbs[0].quantity = 2;
    pages.refreshPage("brewing");
    cauldron = harness.getBoundPage("brewing").brewing.cauldrons[0];
    expect(cauldron.selectedRecipe.ingredients).toEqual([
      expect.objectContaining({ owned: 1, quantity: 1 }),
      expect.objectContaining({ owned: 1, quantity: 1 }),
      expect.objectContaining({ owned: 0, quantity: 1 }),
    ]);
    expect(cauldron.recipeReadiness.hasEnoughIngredients).toBe(false);
    expect(cauldron.primaryAction.enabled).toBe(false);

    gameplaySnapshot.brewing.herbs[0].quantity = 3;
    gameplaySnapshot.mana.current = 4;
    pages.refreshPage("brewing");
    cauldron = harness.getBoundPage("brewing").brewing.cauldrons[0];
    expect(cauldron.recipeReadiness).toEqual({
      hasEnoughIngredients: true,
      hasEnoughMana: false,
    });
    expect(cauldron.primaryAction.enabled).toBe(false);
  });

  it("rejects locked navigation and delegates the lock surface to retained chrome", () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show("garden")).toBe(false);
    expect(harness.bottomSurface.showLockedPage).toHaveBeenCalledWith(
      "garden",
      expect.objectContaining({ unlocked: false }),
    );
    expect(pages.getCurrentPageId()).toBe("workshop");
  });

  it("keeps global world chat hidden until its existing level-three gate", () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);

    pages.mount();

    expect(harness.getBoundGlobal("chrome.chat")).toEqual(
      expect.objectContaining({
        label: "World Chat",
        visible: false,
      }),
    );
    expect(harness.getBoundGlobal("chrome.chat").onActivate()).toBe(false);
    expect(harness.pageSurface.openDialog).not.toHaveBeenCalled();
  });

  it("prehighlights the adjacent retained tab while a page swipe is owned", () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    const swipe = harness.getPageSwipeRegistration();

    swipe.onSwipeStart();
    swipe.onSwipeMove({
      movement: { screen: { x: -24, y: 1 } },
    });
    expect(harness.bottomSurface.setSwipeTargetPageId).toHaveBeenLastCalledWith(
      "research",
    );

    swipe.onSwipeEnd();
    expect(harness.bottomSurface.setSwipeTargetPageId).toHaveBeenLastCalledWith(
      null,
    );

    swipe.onSwipeMove({
      movement: { screen: { x: 24, y: 1 } },
    });
    expect(harness.bottomSurface.setSwipeTargetPageId).toHaveBeenLastCalledWith(
      "garden",
    );
    expect(swipe.onSwipe({ direction: "previous" })).toBe(false);
    expect(harness.bottomSurface.showLockedPage).toHaveBeenCalledWith(
      "garden",
      expect.objectContaining({ unlocked: false }),
    );
  });

  it("projects only main-visible Garden plots with per-tile notifications", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.plot = {
      maxTiles: 3,
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: false,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "ready",
        },
        {
          id: "plot-2",
          tileNumber: 2,
          unlocked: false,
          phase: "empty",
        },
        {
          id: "plot-3",
          tileNumber: 3,
          unlocked: false,
          phase: "empty",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show("garden")).toBe(true);
    expect(
      harness.getBoundPage("garden").garden.plots.map((plot) => ({
        tileNumber: plot.tileNumber,
        hidden: plot.hidden,
        buySlot: plot.buySlot,
        notification: plot.notification,
      })),
    ).toEqual([
      {
        tileNumber: 1,
        hidden: false,
        buySlot: false,
        notification: true,
      },
      {
        tileNumber: 2,
        hidden: false,
        buySlot: true,
        notification: true,
      },
      {
        tileNumber: 3,
        hidden: true,
        buySlot: false,
        notification: false,
      },
    ]);
  });

  it("plays the harvest cue only after a ready Garden plot starts harvesting", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.plot = {
      maxTiles: 1,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "ready",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.startGardenHarvest
      .mockReturnValueOnce({ ok: true, tileNumber: 1 })
      .mockReturnValueOnce({ ok: false, reason: "not_ready", tileNumber: 1 });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    const plot = harness.getBoundPage("garden").garden.plots[0];
    expect(harness.getBoundPage("garden").actions.activatePlot(plot)).toEqual({
      ok: true,
      tileNumber: 1,
    });
    expect(harness.gardenHarvestSoundFacade.playHarvest).toHaveBeenCalledTimes(1);

    expect(harness.getBoundPage("garden").actions.activatePlot(plot)).toEqual({
      ok: false,
      reason: "not_ready",
      tileNumber: 1,
    });
    expect(harness.gardenHarvestSoundFacade.playHarvest).toHaveBeenCalledTimes(1);
  });

  it("accelerates active Garden plots while preserving an intentional seed swap", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.plot = {
      maxTiles: 1,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "growing",
          seedItemTypeId: 1,
          process: { totalMs: 12_000, remainingMs: 8_000 },
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.accelerateGardenPlot.mockReturnValue({
      ok: true,
      tileNumber: 1,
      reducedSeconds: 1,
      remainingMs: 7_000,
      cooldownMs: 800,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    let garden = harness.getBoundPage("garden");
    expect(garden.actions.activatePlot(garden.garden.plots[0])).toMatchObject({
      ok: true,
      reducedSeconds: 1,
    });
    expect(harness.gameplayFacade.accelerateGardenPlot).toHaveBeenCalledWith(1);

    gameplaySnapshot.garden.seeds = [
      { itemTypeId: 2, key: "mintSeed", label: "mint seed", quantity: 1 },
    ];
    pages.gardenSelectedSeedItemTypeId = 2;
    pages.refreshPage("garden");
    garden = harness.getBoundPage("garden");
    expect(garden.actions.activatePlot(garden.garden.plots[0])).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "swap",
      expect.objectContaining({
        payload: expect.objectContaining({ seedTypeId: 2 }),
      }),
    );
    expect(harness.gameplayFacade.accelerateGardenPlot).toHaveBeenCalledTimes(1);
  });

  it("projects Garden locked-slot affordability and blocks purchases until affordable", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.coin.current = 10;
    gameplaySnapshot.garden.plot = {
      maxTiles: 2,
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: false,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "empty",
        },
        {
          id: "plot-2",
          tileNumber: 2,
          unlocked: false,
          phase: "empty",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.buyGardenTile.mockReturnValue({
      ok: true,
      tileNumber: 2,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    let garden = harness.getBoundPage("garden");
    let buyPlot = garden.garden.plots[1];
    expect(buyPlot).toMatchObject({
      buySlot: true,
      affordable: false,
      costCoin: 25,
      missingCoin: 15,
      actionText: "buy 25 coin",
      actionResource: null,
      disabled: false,
    });
    expect(garden.actions.activatePlot(buyPlot)).toEqual({
      ok: false,
      reason: "insufficient_coin",
      cost: 25,
      missingCoin: 15,
      tileNumber: 2,
    });
    expect(harness.gameplayFacade.buyGardenTile).not.toHaveBeenCalled();

    gameplaySnapshot.coin.current = 25;
    pages.refreshPage("garden");
    garden = harness.getBoundPage("garden");
    buyPlot = garden.garden.plots[1];
    expect(buyPlot).toMatchObject({
      affordable: true,
      missingCoin: 0,
      actionResource: "coin",
    });
    expect(garden.actions.activatePlot(buyPlot)).toEqual({
      ok: true,
      tileNumber: 2,
    });
    expect(harness.gameplayFacade.buyGardenTile).toHaveBeenCalledTimes(1);
  });

  it("keeps a research-locked Garden slot pressable for its tooltip", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.plot = {
      maxTiles: 2,
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: true,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "empty",
        },
        {
          id: "plot-2",
          tileNumber: 2,
          unlocked: false,
          phase: "empty",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    const garden = harness.getBoundPage("garden");
    const lockedPlot = garden.garden.plots[1];

    expect(lockedPlot).toMatchObject({
      actionText: "Research",
      buySlot: true,
      disabled: false,
      lockReason: "research_locked",
    });
    expect(garden.actions.activatePlot(lockedPlot)).toEqual({
      ok: false,
      reason: "research_locked",
      tileNumber: 2,
      tooltip:
        "You need to research first to unlock buying this slot.",
    });
    expect(harness.gameplayFacade.buyGardenTile).not.toHaveBeenCalled();
  });

  it("selects one Garden seed globally, plants empty plots, and offers swaps for growing plots", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.research.completedResearchIds = ["unlockSeed:mintSeed"];
    gameplaySnapshot.garden.seeds = [
      {
        itemTypeId: 2,
        key: "mintSeed",
        label: "mint seed",
        kind: "seed",
        quantity: 0,
      },
      {
        itemTypeId: 3,
        key: "nettleSeed",
        label: "nettle seed",
        kind: "seed",
        quantity: 0,
      },
      {
        itemTypeId: 1,
        key: "sageSeed",
        label: "sage seed",
        kind: "seed",
        quantity: 2,
      },
    ];
    gameplaySnapshot.garden.plot = {
      maxTiles: 1,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "empty",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.plantGardenSeed.mockReturnValue({
      ok: true,
      tileNumber: 1,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");
    const garden = harness.getBoundPage("garden");
    const plot = garden.garden.plots[0];

    expect(garden.actions.activatePlot(plot)).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      "seed",
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            id: 1,
            key: "sageSeed",
            quantity: 2,
            detail: "2 Available",
            icon: { kind: "seed", key: "sageSeed" },
          }),
          expect.objectContaining({
            id: 2,
            key: "mintSeed",
            quantity: 0,
            detail: "0 Available",
          }),
        ],
      }),
    );

    expect(
      garden.actions.selectSeed({
        itemTypeId: 1,
      }),
    ).toEqual({
      ok: true,
      selectedSeedItemTypeId: 1,
    });
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith("garden.seed");
    const selectedGarden = harness.getBoundPage("garden");
    expect(selectedGarden.garden.actionBar.selectedSeed).toMatchObject({
      itemTypeId: 1,
      label: "sage",
      quantity: 2,
    });
    expect(
      selectedGarden.actions.activatePlot(selectedGarden.garden.plots[0]),
    ).toEqual({
      ok: true,
      tileNumber: 1,
    });
    expect(harness.gameplayFacade.plantGardenSeed).toHaveBeenCalledWith(1, 1);

    gameplaySnapshot.garden.plot.tiles[0] = {
      ...gameplaySnapshot.garden.plot.tiles[0],
      phase: "growing",
      seedItemTypeId: 2,
      seedLabel: "mint seed",
      process: {
        totalMs: 60_000,
        remainingMs: 30_000,
      },
    };
    pages.refreshPage("garden");
    const growingGarden = harness.getBoundPage("garden");
    expect(
      growingGarden.actions.activatePlot(growingGarden.garden.plots[0]),
    ).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenLastCalledWith(
      "swap",
      expect.objectContaining({
        title: "Swap Seed?",
        message: "Swap mint for sage? Growth will restart.",
        confirmLabel: "Swap",
      }),
    );
    expect(harness.transientEffects.emitReward).not.toHaveBeenCalled();
  });

  it("shows a flyout when Harvest All finds no ready plots", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.startAllReadyGardenHarvests.mockReturnValue({
      ok: false,
      reason: "no_ready_tiles",
      harvestedTileNumbers: [],
      results: [],
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    const result = harness.getBoundPage("garden").actions.harvestAll();

    expect(result).toMatchObject({
      ok: false,
      reason: "no_ready_tiles",
    });
    expect(
      harness.gameplayFacade.startAllReadyGardenHarvests,
    ).toHaveBeenCalledTimes(1);
    expect(harness.transientEffects.emitReward).toHaveBeenCalledWith({
      message: "Nothing to harvest",
    });
  });

  it("plants all empty plots with the toolbar seed and explains an empty selection", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.bulkActions = {
      canPlantAll: true,
      canHarvestAll: false,
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.plantAllGardenSeeds.mockReturnValue({
      ok: false,
      reason: "no_seed_selected",
      plantedTileNumbers: [],
      results: [],
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    const garden = harness.getBoundPage("garden");
    expect(garden.garden.actionBar).toMatchObject({
      canPlantAll: true,
      canHarvestAll: false,
    });
    expect(garden.actions.plantAll()).toMatchObject({
      ok: false,
      reason: "no_seed_selected",
    });
    expect(harness.gameplayFacade.plantAllGardenSeeds).toHaveBeenCalledWith(
      null,
    );
    expect(harness.transientEffects.emitReward).toHaveBeenCalledWith({
      message: "Select a seed",
    });
  });

  it("keeps unavailable empty Garden plots unlabeled and flies out no seed on press", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.seeds = [
      {
        itemTypeId: 1,
        key: "sageSeed",
        label: "sage seed",
        kind: "seed",
        quantity: 0,
      },
    ];
    gameplaySnapshot.garden.plot = {
      maxTiles: 1,
      tiles: [
        {
          id: "plot-1",
          tileNumber: 1,
          unlocked: true,
          phase: "empty",
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show("garden");

    let garden = harness.getBoundPage("garden");
    garden.actions.selectSeed({ itemTypeId: 1 });
    garden = harness.getBoundPage("garden");
    const plot = garden.garden.plots[0];

    expect(plot.actionText).toBe("");
    expect(garden.actions.activatePlot(plot)).toEqual({
      ok: false,
      reason: "not_enough_seed",
      tileNumber: 1,
    });
    expect(harness.gameplayFacade.plantGardenSeed).not.toHaveBeenCalled();
    expect(harness.pageSurface.openDialog).not.toHaveBeenCalled();
    expect(harness.transientEffects.emitReward).toHaveBeenCalledWith({
      message: "no seed",
      flyoutKey: "garden-no-seed-1",
    });
  });

  it("removes Garden inventory buttons while retaining Brewing inventory expansion", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.herbs = createInventoryRows("herb", 7);
    gameplaySnapshot.garden.seeds = createInventoryRows("seed", 8);
    gameplaySnapshot.brewing.herbs = createInventoryRows("herb", 7);
    gameplaySnapshot.inventory = createInventoryRows("potion", 8);
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show("garden")).toBe(true);
    const garden = harness.getBoundPage("garden");
    expect(garden.garden.inventory).toBeUndefined();
    expect(garden.garden.actionBar).toMatchObject({
      selectedSeed: null,
      readyHarvestCount: 0,
      hasSeedChoices: true,
    });

    expect(pages.show("brewing")).toBe(true);
    let brewing = harness.getBoundPage("brewing");
    expect(brewing.brewing.inventory.herbs).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: "6/7",
    });
    expect(brewing.brewing.inventory.potions).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: "6/8",
    });

    brewing.actions.toggleInventory("potions");
    brewing = harness.getBoundPage("brewing");
    expect(brewing.brewing.inventory.activeTab).toBe("potions");
    brewing.actions.toggleInventoryExpanded("potions");
    brewing = harness.getBoundPage("brewing");
    expect(brewing.brewing.inventory.potions).toMatchObject({
      expanded: true,
      countText: "8/8",
    });
    expect(brewing.actions.toggleInventoryExpanded("seeds")).toBe(false);
  });

  it("projects tutorial notification policy without changing source snapshots", () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.tasks.level.tasks = [
      {
        taskId: "demo-task",
        requirementLabel: "sage seeds",
        canFill: true,
        requiredQuantity: 1,
        progressQuantity: 1,
      },
    ];
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    const notifications = {
      active: true,
      pages: {
        workshop: {
          active: true,
          tone: "red",
          children: {
            seeds: true,
            tasks: true,
          },
        },
        garden: {
          active: true,
          tone: "red",
          children: { plots: true },
        },
      },
    };
    const sourceCopy = JSON.parse(JSON.stringify(notifications));
    pages.mount();
    pages.setDevNotifications(notifications);

    pages.applyTutorialNotificationVisibilityPolicy({
      active: true,
      allowedTutorialIds: ["workshop:summonSeed"],
    });

    expect(harness.getBoundGlobal("chrome.bottom").notifications).toMatchObject(
      {
        workshop: notifications.pages.workshop,
        garden: notifications.pages.garden,
      },
    );
    expect(harness.getBoundPage("workshop").workshop.summon.notification).toBe(
      true,
    );
    expect(
      harness.getBoundPage("workshop").workshop.tasks.rows[0].notification,
    ).toBe(false);

    pages.applyTutorialNotificationVisibilityPolicy({
      active: true,
      allowedTutorialIds: ["task:demo-task", "page:garden"],
    });

    expect(harness.getBoundGlobal("chrome.bottom").notifications.garden).toBe(
      notifications.pages.garden,
    );
    expect(harness.getBoundPage("workshop").workshop.summon.notification).toBe(
      false,
    );
    expect(
      harness.getBoundPage("workshop").workshop.tasks.rows[0].notification,
    ).toBe(true);

    pages.applyTutorialNotificationVisibilityPolicy(null);

    expect(harness.getBoundGlobal("chrome.bottom").notifications.workshop).toBe(
      notifications.pages.workshop,
    );
    expect(harness.getBoundPage("workshop").workshop.summon.notification).toBe(
      true,
    );
    expect(
      harness.getBoundPage("workshop").workshop.tasks.rows[0].notification,
    ).toBe(true);
    expect(notifications).toEqual(sourceCopy);
  });

  it("opens the World Event dev route with the real selected-tab model", () => {
    const harness = createHarness();
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(
      pages.openDialog("worldEvent", { tab: "leaderboard" }),
    ).toMatchObject({
      ok: true,
      dialogId: "worldEvent",
      tabId: "leaderboard",
    });
    expect(
      harness.getBoundPage("workshop").workshop.dialogs.worldEvent
        .selectedTabId,
    ).toBe("leaderboard");
    expect(harness.pageSurface.openDialog).toHaveBeenLastCalledWith(
      "worldEvent",
      null,
    );
  });
});

function createHarness({ gameplaySnapshot = createGameplaySnapshot() } = {}) {
  const factories = new Map();
  const boundPages = new Map();
  const boundGlobals = new Map();
  const bottomSurface = {
    showLockedPage: vi.fn(),
    setSwipeTargetPageId: vi.fn(),
  };
  const pageSurface = {
    openDialog: vi.fn(() => true),
  };
  const transientEffects = {
    emitReward: vi.fn(),
  };
  const runtime = {
    initialized: true,
    bindPage: vi.fn((pageId, model) => {
      boundPages.set(pageId, model);
    }),
    bindGlobalSurface: vi.fn((surfaceId, model) => {
      boundGlobals.set(surfaceId, model);
    }),
    activatePage: vi.fn(),
    deactivatePage: vi.fn(),
    closeAllDialogs: vi.fn(),
    closeDialog: vi.fn(),
    getOpenDialogIds: vi.fn(() => []),
    getGlobalSurface: vi.fn(() => bottomSurface),
    getPage: vi.fn(() => pageSurface),
  };
  let pageSwipeRegistration = null;
  const inputRouter = {
    registerPageSwipe: vi.fn((registration) => {
      pageSwipeRegistration = registration;
      return { unregister: vi.fn() };
    }),
    setBackHandler: vi.fn(),
    setEscapeHandler: vi.fn(),
  };
  const renderFacade = {
    registerPage: vi.fn(function registerPage(pageId, factory) {
      factories.set(pageId, factory);
      return this;
    }),
    getUiRuntime: vi.fn(() => runtime),
    getInputRouter: vi.fn(() => inputRouter),
    getPixiLayers: vi.fn(() => ({ pageUi: {} })),
  };
  const gameplayFacade = {
    getSnapshot: vi.fn(() => gameplaySnapshot),
    withSnapshotCache: vi.fn((callback) => callback()),
    subscribe: vi.fn(() => vi.fn()),
    subscribeFrameResources: vi.fn(() => vi.fn()),
    summonSeed: vi.fn(),
    fillTask: vi.fn(),
    claimPersonalTaskMilestoneReward: vi.fn(),
    buyResearch: vi.fn(),
    setPrestigeRunFocus: vi.fn(),
    completePrestigeMilestone: vi.fn(),
    createGuild: vi.fn(),
    updateGuildProfile: vi.fn(),
    upgradeGuildSecretary: vi.fn(),
    postGuildRequest: vi.fn(),
    removeGuildRequest: vi.fn(),
    hireGuildApplicant: vi.fn(),
    fireGuildAdventurer: vi.fn(),
    buyGardenTile: vi.fn(),
    plantGardenSeed: vi.fn(),
    plantAllGardenSeeds: vi.fn(),
    replaceGardenSeed: vi.fn(),
    startGardenHarvest: vi.fn(),
    accelerateGardenPlot: vi.fn(),
    startAllReadyGardenHarvests: vi.fn(),
    selectGardenSeed: vi.fn(),
    cancelBrewing: vi.fn(),
    collectBrewing: vi.fn(),
    addBrewingIngredient: vi.fn(),
    clearBrewingCauldron: vi.fn(),
    setBrewingIngredientSlotQuantity: vi.fn(),
    prepareBrewingRecipe: vi.fn(),
    brewCauldron: vi.fn(),
    setBrewingAutoBrewRecipe: vi.fn(),
    setBrewingAutoBrewEnabled: vi.fn(),
    toggleBrewingAutoBrewEnabled: vi.fn(),
    selectShopShelfSlot: vi.fn(() => ({ ok: true })),
    setSelectedShopShelfSlotAllocation: vi.fn(() => ({
      ok: true,
    })),
    setSelectedShopShelfSlotQuantity: vi.fn(() => ({
      ok: true,
    })),
    clearSelectedShopShelfSlot: vi.fn(() => ({ ok: true })),
    setSelectedShopShelfFutureItem: vi.fn(() => ({ ok: true })),
  };
  const playerFacade = {
    getSnapshot: vi.fn(() => ({
      username: "elara",
      character: "elara",
    })),
    subscribe: vi.fn(() => vi.fn()),
  };
  const dependencies = {
    renderFacade,
    experienceFacade: { transientEffects },
    gardenHarvestSoundFacade: { playHarvest: vi.fn() },
    gameplayFacade,
    playerFacade,
    worldChatFacade: createSnapshotFacade({ connected: true, messages: [] }),
    playerShopFacade: createSnapshotFacade({ connected: false }),
    tradeAllianceFacade: createSnapshotFacade({ connected: false }),
  };

  return {
    dependencies,
    factories,
    runtime,
    gameplayFacade,
    gardenHarvestSoundFacade: dependencies.gardenHarvestSoundFacade,
    transientEffects,
    bottomSurface,
    pageSurface,
    getPageSwipeRegistration: () => pageSwipeRegistration,
    getBoundPage: (pageId) => boundPages.get(pageId),
    getBoundGlobal: (surfaceId) => boundGlobals.get(surfaceId),
  };
}

function createSnapshotFacade(snapshot) {
  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn(() => vi.fn()),
  };
}

function createPlayerRequestGameplaySnapshot() {
  const gameplaySnapshot = createGameplaySnapshot();
  gameplaySnapshot.research.completedResearchIds = ["unlockSeed:sageSeed"];
  gameplaySnapshot.shop = {
    shelf: {
      sellKinds: [{ kind: "seed", label: "seeds" }],
      sellItems: [
        {
          itemTypeId: 1,
          key: "sageSeed",
          kind: "seed",
          label: "sage seed",
          quantity: 8,
        },
      ],
    },
    playerRequests: {
      slots: [{ slotNumber: 1, unlocked: true }],
    },
    playerShelf: {
      sellKinds: [{ kind: "seed", label: "seeds" }],
      sellItems: [],
      slots: [{ slotNumber: 1, unlocked: true }],
    },
  };
  return gameplaySnapshot;
}

function createPlayerListingGameplaySnapshot() {
  const gameplaySnapshot = createGameplaySnapshot();
  gameplaySnapshot.research.completedResearchIds = ["unlockSeed:sageSeed"];
  gameplaySnapshot.shop = {
    shelf: {
      sellKinds: [{ kind: "seed", label: "seeds" }],
      sellItems: [],
    },
    playerRequests: {
      slots: [{ slotNumber: 1, unlocked: true }],
    },
    playerShelf: {
      sellKinds: [{ kind: "seed", label: "seeds" }],
      sellItems: [
        {
          itemTypeId: 1,
          key: "sageSeed",
          kind: "seed",
          label: "sage seed",
          quantity: 8,
        },
      ],
      slots: [{ slotNumber: 1, unlocked: true }],
    },
  };
  return gameplaySnapshot;
}

function createInventoryRows(kind, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index + 1}`,
    itemTypeId: index + 1,
    kind,
    key: `${kind}-${index + 1}`,
    label: `${kind} ${index + 1}`,
    quantity: 1,
    availableQuantity: 1,
  }));
}

function createGameplaySnapshot({ level = 20 } = {}) {
  return {
    mana: { current: 10, cap: 20, perSecond: 1 },
    coin: { current: 1_000 },
    crystal: { current: 10 },
    ruby: { current: 2 },
    emerald: { current: 1 },
    seedSummoning: { cost: 2, quantity: 1, canSummon: true },
    playerLevel: { currentLevel: level },
    tasks: {
      currentLevel: level,
      level: {
        tasks: [],
        completion: { canComplete: false },
        questProgress: { completedQuests: 0, totalQuests: 4 },
      },
    },
    prestige: {
      currentLevel: level,
      completedLevels: [],
      milestones: [],
      unlocks: [],
    },
    research: { tabs: [] },
    brewing: { cauldrons: [], recipes: [], herbs: [] },
    garden: { plot: { tiles: [], maxTiles: 0 }, herbs: [], seeds: [] },
    shop: {},
    guild: {
      unlocked: level >= 15,
      created: false,
      unlockLevel: 15,
    },
  };
}
