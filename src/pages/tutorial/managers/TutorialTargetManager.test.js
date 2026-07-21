/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialTargetManager } from './TutorialTargetManager.js';

describe('TutorialTargetManager', () => {
  it('reads the username from the top-panel target', () => {
    const stage = document.createElement('section');
    const usernameButton = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    usernameButton.dataset.tutorialId = 'top:username';
    usernameButton.textContent = 'Mira';
    stage.append(usernameButton);

    expect(manager.getDomState().getUsername()).toBe('Mira');

    usernameButton.remove();

    expect(manager.getDomState().getUsername()).toBe('wizard');
  });

  it('treats hidden one-task toggle as already expanded', () => {
    const stage = document.createElement('section');
    const toggle = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    toggle.className = 'workshop-page__tasks-toggle';
    toggle.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    stage.append(toggle);

    expect(manager.getDomState().isTasksExpanded()).toBe(true);

    toggle.hidden = false;

    expect(manager.getDomState().isTasksExpanded()).toBe(false);

    toggle.setAttribute('aria-expanded', 'true');

    expect(manager.getDomState().isTasksExpanded()).toBe(true);
  });

  it('reads the Workshop requirements pin state', () => {
    const stage = document.createElement('section');
    const tasks = document.createElement('section');
    const pin = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    tasks.className = 'workshop-page__tasks';
    pin.className = 'workshop-page__tasks-pin';
    pin.setAttribute('aria-pressed', 'false');
    tasks.append(pin);
    stage.append(tasks);

    expect(manager.getDomState().isTasksPinned()).toBe(false);

    pin.setAttribute('aria-pressed', 'true');

    expect(manager.getDomState().isTasksPinned()).toBe(true);

    pin.setAttribute('aria-pressed', 'false');
    tasks.classList.add('is-pinned');

    expect(manager.getDomState().isTasksPinned()).toBe(true);
  });

  it('treats marked blockers, app, announcement, and top-panel dialogs as tutorial blockers', () => {
    const stage = document.createElement('section');
    const customBlocker = document.createElement('section');
    const accountChoice = document.createElement('section');
    const freshStartChoice = document.createElement('section');
    const announcement = document.createElement('section');
    const levelPopup = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    customBlocker.dataset.tutorialBlocker = 'true';
    document.body.append(stage, customBlocker);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    customBlocker.hidden = true;
    accountChoice.className = 'app-account-link-choice';
    document.body.append(accountChoice);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    accountChoice.hidden = true;
    freshStartChoice.className = 'app-fresh-start-choice';
    document.body.append(freshStartChoice);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    freshStartChoice.hidden = true;
    announcement.className = 'room-announcement-layer';
    stage.append(announcement);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    announcement.hidden = true;
    levelPopup.className = 'room-top-panel__level-popup';
    stage.append(levelPopup);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    levelPopup.hidden = true;

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(false);
  });

  it('lets the intro username step guide the settings input', () => {
    const stage = document.createElement('section');
    const settings = document.createElement('section');
    const input = document.createElement('input');
    const manaReadout = document.createElement('span');
    const manager = new TutorialTargetManager({ stage });

    settings.className = 'room-top-panel__settings';
    input.dataset.tutorialId = 'top:username-input';
    manaReadout.dataset.tutorialId = 'top:mana';
    settings.append(input);
    stage.append(settings, manaReadout);
    document.body.append(stage);

    expect(manager.getDomState().isUsernameSettingsOpen()).toBe(true);
    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'top:username-input' }, input),
    ).toBe(false);
    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'top:mana' }, manaReadout),
    ).toBe(true);

    settings.hidden = true;

    expect(manager.getDomState().isUsernameSettingsOpen()).toBe(false);
  });

  it('reads theme settings tab visibility and selection', () => {
    const stage = document.createElement('section');
    const settings = document.createElement('section');
    const tabs = document.createElement('div');
    const themeTab = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    settings.className = 'room-top-panel__settings';
    themeTab.dataset.tutorialId = 'top:settings:theme-tab';
    themeTab.setAttribute('aria-selected', 'false');
    tabs.append(themeTab);
    settings.append(tabs);
    stage.append(settings);

    expect(manager.getDomState().isSettingsThemeTabVisible()).toBe(true);
    expect(manager.getDomState().isThemeSettingsTabOpen()).toBe(false);

    themeTab.setAttribute('aria-selected', 'true');

    expect(manager.getDomState().isThemeSettingsTabOpen()).toBe(true);

    tabs.hidden = true;

    expect(manager.getDomState().isSettingsThemeTabVisible()).toBe(false);
    expect(manager.getDomState().isThemeSettingsTabOpen()).toBe(false);
  });

  it('reads the selected stall item tab', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const seedsTab = document.createElement('button');
    const herbsTab = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'shop-page__sell-popup';
    seedsTab.className = 'shop-page__sell-tab-button';
    seedsTab.dataset.tutorialId = 'shop:sell:tab:seed';
    seedsTab.setAttribute('aria-selected', 'true');
    herbsTab.className = 'shop-page__sell-tab-button';
    herbsTab.dataset.tutorialId = 'shop:sell:tab:herb';
    herbsTab.setAttribute('aria-selected', 'false');
    popup.append(seedsTab, herbsTab);
    stage.append(popup);

    expect(manager.getDomState().isShopSellTabSelected('seed')).toBe(true);
    expect(manager.getDomState().isShopSellTabSelected('herb')).toBe(false);

    seedsTab.setAttribute('aria-selected', 'false');
    herbsTab.setAttribute('aria-selected', 'true');

    expect(manager.getDomState().isShopSellTabSelected('seed')).toBe(false);
    expect(manager.getDomState().isShopSellTabSelected('herb')).toBe(true);
  });

  it('reads whether the stall loader popup is open', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'shop-page__sell-popup';
    stage.append(popup);

    expect(manager.getDomState().isShopSellPopupOpen()).toBe(true);

    popup.hidden = true;
    expect(manager.getDomState().isShopSellPopupOpen()).toBe(false);
  });

  it('reads whether the stall loader has a local selection', () => {
    const stage = document.createElement('section');
    const current = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    current.className = 'shop-page__sell-current';
    current.dataset.hasSelection = 'false';
    stage.append(current);

    expect(manager.getDomState().hasShopSellSelection()).toBe(false);

    current.dataset.hasSelection = 'true';
    expect(manager.getDomState().hasShopSellSelection()).toBe(true);
  });

  it('allows popup guidance when the active target is inside the open popup', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'shop-page__sell-popup';
    target.dataset.tutorialId = 'shop:sell:sageSeed';
    popup.append(target);
    stage.append(popup);
    document.body.append(stage);

    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'shop:sell:sageSeed' }, target),
    ).toBe(false);
  });

  it('reads the selected brewing recipe row from the open popup', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const row = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'brewing-page__recipes-popup';
    row.className = 'brewing-page__recipe-row';
    row.dataset.tutorialId = 'brewing:recipe:manaTonic';
    row.setAttribute('aria-pressed', 'true');
    popup.append(row);
    stage.append(popup);

    expect(manager.getDomState().isBrewingRecipeSelected('manaTonic')).toBe(true);
    expect(manager.getDomState().isBrewingRecipeSelected('minorHealingPotion')).toBe(false);
  });

  it('reads whether the Brewing herbs inventory is open', () => {
    const stage = document.createElement('section');
    const herbs = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    herbs.className = 'brewing-page__herbs';
    herbs.hidden = true;
    stage.append(herbs);

    expect(manager.getDomState().isBrewingHerbInventoryOpen()).toBe(false);

    herbs.hidden = false;

    expect(manager.getDomState().isBrewingHerbInventoryOpen()).toBe(true);
  });

  it('prefers visible measurable targets when duplicate tutorial ids exist', () => {
    const stage = document.createElement('section');
    const hiddenTarget = document.createElement('span');
    const visibleTarget = document.createElement('span');
    const manager = new TutorialTargetManager({ stage });

    hiddenTarget.dataset.tutorialId = 'garden:plot:1:label';
    hiddenTarget.hidden = true;
    visibleTarget.dataset.tutorialId = 'garden:plot:1:label';
    visibleTarget.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 90,
      bottom: 40,
      width: 80,
      height: 20,
    });
    stage.append(hiddenTarget, visibleTarget);

    expect(manager.getTarget('garden:plot:1:label')).toBe(visibleTarget);
  });

  it('keeps a measurable target eligible while its page is fading in', () => {
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    target.dataset.tutorialId = 'shop:stand:1';
    target.style.opacity = '0';
    target.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 90,
      bottom: 40,
      width: 80,
      height: 20,
    });
    stage.append(target);

    expect(manager.getTarget('shop:stand:1')).toBe(target);
  });

  it('keeps copy-only popup guidance visible only for the popup it needs', () => {
    const stage = document.createElement('section');
    const sellPopup = document.createElement('section');
    const otherPopup = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    sellPopup.className = 'shop-page__sell-popup';
    otherPopup.className = 'workshop-page__leaderboard-popup';
    stage.append(sellPopup, otherPopup);
    document.body.append(stage);

    expect(
      manager.getDomState().isBlockingDialogOpenForStep({
        targetId: null,
        allowedPopupClasses: ['shop-page__sell-popup'],
      }),
    ).toBe(true);

    otherPopup.hidden = true;

    expect(
      manager.getDomState().isBlockingDialogOpenForStep({
        targetId: null,
        allowedPopupClasses: ['shop-page__sell-popup'],
      }),
    ).toBe(false);
  });
});
