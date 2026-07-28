import { CostButtonManager } from '../../shared/CostButtonManager.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import { setTimerProgressFill, stopTimerProgressFill } from '../../shared/timerProgress.js';
import { formatRemainingTime } from '../../shared/timerDisplay.js';
import { createStarLevelLabel, formatStarLevel } from '../../shared/starLevelLabel.js';
import { UiWidgetPoolManager } from '../../../rendering/managers/UiWidgetPoolManager.js';
import { createAssetAtlasSprite } from '../../../assets/atlas/atlasSprite.js';
import { createSeedPackIcon } from '../../../assets/items/seeds/seedIcons.js';
import { getPotionIconFrameName } from '../../../assets/items/potions/potionIcons.js';

const maxLockedResearchesPerBox = 1;
const RESEARCH_ARTWORK_BY_BOX_ID = Object.freeze({
  autoBrewCauldrons: new URL(
    '../../../../assets/game/source/icons/research/icon-research-auto-brew.png',
    import.meta.url,
  ).href,
  autoPlantTiles: new URL(
    '../../../../assets/game/source/icons/research/icon-research-auto-plant.png',
    import.meta.url,
  ).href,
  autoSeedSpawn: new URL(
    '../../../../assets/game/source/icons/research/icon-research-auto-seed-spawn.png',
    import.meta.url,
  ).href,
  automationReserve: new URL(
    '../../../../assets/game/source/icons/research/icon-research-automation-reserve.png',
    import.meta.url,
  ).href,
  cauldronBrewing: new URL(
    '../../../../assets/game/source/icons/research/icon-research-cauldron-brewing.png',
    import.meta.url,
  ).href,
  cauldronCapacity: new URL(
    '../../../../assets/game/source/icons/research/icon-research-cauldron-capacity.png',
    import.meta.url,
  ).href,
  plotCapacity: new URL(
    '../../../../assets/game/source/icons/research/icon-research-plot-capacity.png',
    import.meta.url,
  ).href,
  plotGrowth: new URL(
    '../../../../assets/game/source/icons/research/icon-research-plot-growth.png',
    import.meta.url,
  ).href,
  plotPlanting: new URL(
    '../../../../assets/game/source/icons/research/icon-research-plot-level.png',
    import.meta.url,
  ).href,
  recipeUnlocks: new URL(
    '../../../../assets/game/source/icons/research/icon-research-cauldron-brewing.png',
    import.meta.url,
  ).href,
  researchCost: new URL(
    '../../../../assets/game/source/icons/research/icon-research-cost.png',
    import.meta.url,
  ).href,
  researchTime: new URL(
    '../../../../assets/game/source/icons/research/icon-research-time.png',
    import.meta.url,
  ).href,
  seedUnlocks: new URL(
    '../../../../assets/game/source/icons/research/icon-research-auto-seed-spawn.png',
    import.meta.url,
  ).href,
  stallStaffing: new URL(
    '../../../../assets/game/source/icons/research/icon-research-fast-sell.png',
    import.meta.url,
  ).href,
  summonSeeds: new URL(
    '../../../../assets/game/source/icons/research/icon-research-summon-multiplier.png',
    import.meta.url,
  ).href,
});
const RESEARCH_CAULDRON_LEVEL_ARTWORK = new URL(
  '../../../../assets/game/source/icons/research/icon-research-cauldron-level.png',
  import.meta.url,
).href;
const RESEARCH_FALLBACK_ARTWORK = new URL(
  '../../../../assets/game/source/icons/icon-research.png',
  import.meta.url,
).href;

function formatResearchSectionTitle(value) {
  return String(value ?? '').replace(
    /(^|[\s/:(-])([a-z])/g,
    (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}

function getResearchStationTitleVariant(tabId) {
  if (tabId === 'automation' || tabId === 'advanced') {
    return tabId;
  }
  if (tabId === 'emerald' || tabId === 'crystal') {
    return 'crystal';
  }
  return 'regular';
}

export class ResearchBoxListManager {
  constructor({
    gameplayFacade,
    onSelectedTabChange,
    onRowsChanged,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onSelectedTabChange = onSelectedTabChange;
    this.onRowsChanged = onRowsChanged;
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.unsubscribe = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons = new Map();
    this.boxRefs = new Map();
    this.rowRefs = new Map();
    this.nextBoxIds = new Set();
    this.nextRowIds = new Set();
    this.boxPool = new UiWidgetPoolManager({
      maxSize: 24,
      create: () => this.createBoxWidget(),
      reset: (ref) => this.resetBoxWidget(ref),
      destroy: (ref) => this.destroyBoxWidget(ref),
    });
    this.rowPool = new UiWidgetPoolManager({
      maxSize: 128,
      create: () => this.createRowWidget(),
      prepare: (ref, context) => this.syncRowWidget(ref, context),
      reset: (ref) => this.resetRowWidget(ref),
      destroy: (ref) => this.destroyRowWidget(ref),
    });
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'research-page__content';
    this.tabsRoot = document.createElement('div');
    this.tabsRoot.className = 'research-page__tabs';
    this.tabsRoot.setAttribute('aria-label', 'Research type');
    this.tabsRoot.setAttribute('role', 'tablist');
    this.boxesRoot = document.createElement('div');
    this.boxesRoot.className = 'research-page__box-list style-page-scroll';
    this.root.append(this.boxesRoot, this.tabsRoot);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const ref of this.rowRefs.values()) {
      stopTimerProgressFill(ref.progressFill, 0);
    }
    this.root?.remove();
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons.clear();
    for (const ref of this.boxRefs.values()) {
      this.boxPool.release(ref);
    }
    for (const ref of this.rowRefs.values()) {
      this.rowPool.release(ref);
    }
    this.boxRefs.clear();
    this.rowRefs.clear();
    this.boxPool.clear();
    this.rowPool.clear();
    this.nextBoxIds.clear();
    this.nextRowIds.clear();
  }

  render(snapshot) {
    const tabs = this.getTabs(snapshot);
    const selectedTab = this.getSelectedTab(tabs);
    const runFocus = this.getRunFocus(snapshot);
    const boxes = this.decorateBoxes({
      boxes: selectedTab?.boxes ?? [],
      playerLevel: snapshot?.playerLevel?.currentLevel ?? 1,
      prestigeCount: snapshot?.prestige?.completedLevels?.length ?? 0,
      runFocus,
      researchById: this.getResearchById(tabs),
      completedResearchIds: this.getCompletedResearchIds(snapshot, tabs),
    });
    const signature = `${selectedTab?.id ?? 'none'}|${runFocus.unlocked}:${
      runFocus.selected
    }:${runFocus.options.map((option) => option.id).join(',')}|${tabs
      .map((tab) => `${tab.id}:${tab.label}`)
      .join(',')}|${boxes
      .map(
        (box) =>
          `${box.id}:${box.researches
            .map(
              (research) =>
                `${research.id}:${research.label}:${research.starLevel ?? ''}:${research.value}:${research.effect}:${research.showEffect}:${research.actionType ?? ''}:${research.description}:${research.completed}:${research.inProgress}:${research.locked}:${research.canResearch}:${research.lockReason ?? ''}`,
            )
            .join(',')}`,
      )
      .join('|')}`;

    if (signature === this.signature) {
      this.syncTabState(tabs, selectedTab);
      this.syncResearchProgress(boxes);
      return;
    }

    this.signature = signature;
    this.syncTabs(tabs);
    this.syncTabState(tabs, selectedTab);
    this.nextBoxIds.clear();
    this.nextRowIds.clear();
    for (const box of boxes) {
      this.nextBoxIds.add(box.id);
      for (const research of this.getDisplayedResearches(box.researches)) {
        this.nextRowIds.add(research.id);
      }
    }
    this.releaseUnusedBoxWidgets();
    this.releaseUnusedRowWidgets();
    this.boxesRoot.replaceChildren(
      ...this.createStatusRows({ runFocus }),
      ...boxes.map((box) => this.createBox(box)),
    );
    this.syncResearchProgress(boxes);
    this.onRowsChanged?.();
  }

  getTabs(snapshot) {
    const tabs = snapshot.research?.tabs;

    if (Array.isArray(tabs) && tabs.length > 0) {
      return tabs;
    }

    return [
      {
        id: 'regular',
        label: 'regular research',
        boxes: snapshot.research?.boxes ?? [],
      },
    ];
  }

  getSelectedTab(tabs) {
    const previousTabId = this.selectedTabId;
    const selectedTab = tabs.find((tab) => tab.id === this.selectedTabId) ?? tabs[0] ?? null;
    this.selectedTabId = selectedTab?.id ?? 'regular';

    if (this.selectedTabId !== previousTabId) {
      this.onSelectedTabChange?.(this.selectedTabId);
    }

    return selectedTab;
  }

  decorateBoxes({
    boxes = [],
    playerLevel = 1,
    prestigeCount = 0,
    runFocus,
    researchById,
    completedResearchIds,
  }) {
    const decoratedBoxes = boxes.map((box) => ({
      ...box,
      researches: (box.researches ?? []).map((research) => ({
        ...research,
        lockReason: this.getResearchLockReason({
          research,
          playerLevel,
          prestigeCount,
          researchById,
          completedResearchIds,
        }),
      })),
    }));

    return this.orderBoxesByRunFocus(decoratedBoxes, runFocus?.selected);
  }

  getRunFocus(snapshot = {}) {
    const runFocus = snapshot?.prestige?.runFocus;
    const options = Array.isArray(runFocus?.options) ? runFocus.options : [];

    return {
      unlocked: runFocus?.unlocked === true,
      selected: typeof runFocus?.selected === 'string' ? runFocus.selected : 'none',
      options,
    };
  }

  orderBoxesByRunFocus(boxes = [], selectedFocus = 'none') {
    if (!selectedFocus || selectedFocus === 'none') {
      return boxes;
    }

    return boxes
      .map((box, index) => ({
        box,
        index,
        priority: this.getRunFocusBoxPriority(box, selectedFocus),
      }))
      .sort((left, right) => right.priority - left.priority || left.index - right.index)
      .map(({ box }) => box);
  }

  getRunFocusBoxPriority(box = {}, selectedFocus = 'none') {
    const id = String(box.id ?? '').toLowerCase();

    if (selectedFocus === 'capacity') {
      return /capacity|plotgrowth|cauldronbrewing/.test(id) ? 1 : 0;
    }

    if (selectedFocus === 'automation') {
      return /^auto|automationreserve/.test(id) ? 1 : 0;
    }

    if (selectedFocus === 'research') {
      return /researchcost|researchtime/.test(id) ? 1 : 0;
    }

    if (selectedFocus === 'market') {
      return /fastsell/.test(id) ? 1 : 0;
    }

    return 0;
  }

  getResearchById(tabs = []) {
    const researches = new Map();

    for (const tab of tabs) {
      for (const box of tab.boxes ?? []) {
        for (const research of box.researches ?? []) {
          if (typeof research?.id !== 'string') {
            continue;
          }

          researches.set(research.id, research);
        }
      }
    }

    return researches;
  }

  getCompletedResearchIds(snapshot, tabs = []) {
    const completedResearchIds = new Set(snapshot?.research?.completedResearchIds ?? []);

    for (const tab of tabs) {
      for (const box of tab.boxes ?? []) {
        for (const research of box.researches ?? []) {
          if (research?.completed) {
            completedResearchIds.add(research.id);
          }
        }
      }
    }

    return completedResearchIds;
  }

  getResearchLockReason({
    research,
    playerLevel,
    prestigeCount,
    researchById,
    completedResearchIds,
  }) {
    if (!research?.locked) {
      return '';
    }

    const missingResearchLabels = (research.requiredResearchIds ?? [])
      .filter((researchId) => !completedResearchIds.has(researchId))
      .map((researchId) =>
        this.formatRequiredResearchLabel(researchById.get(researchId), researchId),
      );
    const missingRequiredPlayerLevel =
      Number.isInteger(research.requiredPlayerLevel) && playerLevel < research.requiredPlayerLevel
        ? research.requiredPlayerLevel
        : null;
    const missingRequiredPrestigeCount =
      Number.isInteger(research.requiredPrestigeCount) &&
      prestigeCount < research.requiredPrestigeCount
        ? research.requiredPrestigeCount
        : null;
    const requirements = [];

    if (missingResearchLabels.length > 0) {
      requirements.push(this.formatRequirementList(missingResearchLabels));
    }

    if (missingRequiredPlayerLevel) {
      requirements.push(`level ${missingRequiredPlayerLevel}`);
    }

    if (missingRequiredPrestigeCount) {
      requirements.push(
        `${missingRequiredPrestigeCount} prestige${missingRequiredPrestigeCount === 1 ? '' : 's'}`,
      );
    }

    if (requirements.length === 0) {
      return 'this research is still locked.';
    }

    return `requires ${this.formatRequirementList(requirements)}.`;
  }

  formatRequiredResearchLabel(research, fallbackId) {
    const label = research?.label ?? fallbackId;

    if (research?.actionType === 'levelUp') {
      return `${label} level up`;
    }

    return `${label} research`;
  }

  formatRequirementList(values = []) {
    if (values.length <= 1) {
      return values[0] ?? '';
    }

    if (values.length === 2) {
      return `${values[0]} and ${values[1]}`;
    }

    return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
  }

  syncTabs(tabs) {
    const visibleIds = new Set(tabs.map((tab) => tab.id));

    for (const [tabId, button] of this.tabButtons.entries()) {
      if (visibleIds.has(tabId)) {
        continue;
      }

      button.remove();
      this.tabButtons.delete(tabId);
    }

    for (const tab of tabs) {
      if (this.tabButtons.has(tab.id)) {
        continue;
      }

      const button = document.createElement('button');
      button.className = 'style-button research-page__tab-button';
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.tabButtons.set(tab.id, button);
    }

    this.tabsRoot.replaceChildren(
      ...tabs.map((tab) => this.tabButtons.get(tab.id)).filter(Boolean),
    );
    this.tabsRoot.hidden = tabs.length <= 1;
  }

  syncTabState(tabs, selectedTab) {
    for (const tab of tabs) {
      const selected = tab.id === selectedTab?.id;
      const button = this.tabButtons.get(tab.id);

      if (!button) {
        continue;
      }

      button.textContent = formatResearchSectionTitle(tab.label);
      setSelectedTabState(button, selected, { tabIndex: true });
      setNotificationBadge(button, this.tabHasNotification(tab));
    }
  }

  tabHasNotification(tab) {
    return (tab.boxes ?? []).some((box) =>
      (box.researches ?? []).some((research) => research.canResearch),
    );
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.onSelectedTabChange?.(tabId);
    this.signature = '';
    this.render(this.gameplayFacade.getSnapshot());
  }

  createStatusRows({ runFocus }) {
    const rows = [];

    if (runFocus.unlocked) {
      rows.push(this.createRunFocusControls(runFocus));
    }

    return rows;
  }

  createRunFocusControls(runFocus) {
    const row = document.createElement('div');
    row.className = 'research-page__run-focus';

    const label = document.createElement('span');
    label.className = 'research-page__run-focus-label';
    label.textContent = 'run focus';

    const controls = document.createElement('span');
    controls.className = 'research-page__run-focus-controls';

    for (const option of runFocus.options) {
      const button = document.createElement('button');
      button.className = 'style-button research-page__run-focus-button';
      button.type = 'button';
      button.textContent = option.label ?? option.id;
      button.setAttribute(
        'aria-pressed',
        option.id === runFocus.selected ? 'true' : 'false',
      );
      button.addEventListener('click', () => this.setRunFocus(option.id));
      controls.append(button);
    }

    const helper = document.createElement('span');
    helper.className = 'research-page__run-focus-helper';
    helper.textContent =
      runFocus.selected === 'none'
        ? 'standard order'
        : `${runFocus.selected} boxes first`;

    row.append(label, controls, helper);
    return row;
  }

  setRunFocus(focusId) {
    this.gameplayFacade.setPrestigeRunFocus?.(focusId);
  }

  createBox(box) {
    this.nextBoxIds.add(box.id);
    let ref = this.boxRefs.get(box.id);

    if (!ref) {
      ref = this.boxPool.acquire();
      this.boxRefs.set(box.id, ref);
    }

    const { section, title } = ref;
    section.className = `research-page__box research-page__box--${box.id}`;
    section.setAttribute('aria-label', box.label);
    title.className =
      `research-page__box-title research-page__box-title--${
        getResearchStationTitleVariant(this.selectedTabId)
      }`;
    title.textContent = formatResearchSectionTitle(box.label);
    section.replaceChildren(
      title,
      ...this.getDisplayedResearches(box.researches).map((research) =>
        this.createRow(research, box.id),
      ),
    );

    return section;
  }

  createBoxWidget() {
    const section = document.createElement('section');
    const title = document.createElement('div');
    title.className = 'research-page__box-title';
    section.append(title);
    return { section, title };
  }

  resetBoxWidget(ref) {
    ref.section.remove();
    ref.section.className = 'research-page__box';
    ref.section.removeAttribute('aria-label');
    ref.section.replaceChildren(ref.title);
    ref.title.className =
      'research-page__box-title research-page__box-title--regular';
    ref.title.textContent = '';
  }

  destroyBoxWidget(ref) {
    ref.section.remove();
    ref.section.replaceChildren();
  }

  releaseUnusedBoxWidgets() {
    for (const [boxId, ref] of this.boxRefs) {
      if (this.nextBoxIds.has(boxId)) {
        continue;
      }

      this.boxRefs.delete(boxId);
      this.boxPool.release(ref);
    }
  }

  getDisplayedResearches(researches = []) {
    let lockedResearchCount = 0;

    return researches.filter((research) => {
      if (!research.locked) {
        return true;
      }

      lockedResearchCount += 1;
      return lockedResearchCount <= maxLockedResearchesPerBox;
    });
  }

  createRow(research, boxId = '') {
    this.nextRowIds.add(research.id);
    const existing = this.rowRefs.get(research.id);
    if (existing) {
      this.syncRowWidget(existing, { research, boxId });
      return existing.row;
    }

    const ref = this.rowPool.acquire({ research, boxId });
    this.rowRefs.set(research.id, ref);
    return ref.row;
  }

  createRowWidget() {
    const row = document.createElement('div');
    const artwork = document.createElement('span');
    artwork.className = 'research-page__research-art';
    artwork.setAttribute('aria-hidden', 'true');

    const key = document.createElement('span');
    key.className = 'row_key research-page__research-label';

    const rank = document.createElement('span');
    rank.className = 'research-page__research-rank';
    rank.setAttribute('aria-hidden', 'true');

    const ref = {
      row,
      artwork,
      key,
      rank,
      research: null,
      boxId: '',
      signature: '',
      value: null,
      valueLabel: null,
      valueGap: null,
      valueTimer: null,
      progress: null,
      progressFill: null,
      progressText: null,
    };
    row.append(artwork, key, rank);
    return ref;
  }

  syncRowWidget(ref, { research, boxId = '' }) {
    const signature = this.getRowWidgetSignature(research, boxId);
    ref.research = research;
    ref.boxId = boxId;

    if (signature === ref.signature) {
      return;
    }

    stopTimerProgressFill(ref.progressFill, 0);
    ref.value?.remove();
    ref.progress?.remove();
    ref.signature = signature;
    const { row, artwork, key, rank } = ref;
    row.className = 'research-page__row';
    row.classList.toggle('is-completed', Boolean(research.completed));
    row.classList.toggle(
      'is-available',
      !research.completed &&
        !research.inProgress &&
        !research.locked &&
        Boolean(research.canResearch),
    );
    row.classList.toggle(
      'is-unavailable',
      !research.completed && !research.inProgress && !research.canResearch,
    );
    row.classList.toggle('is-locked', Boolean(research.locked));
    row.classList.toggle('is-in-progress', Boolean(research.inProgress));
    key.replaceChildren(...this.createResearchLabelParts(research));
    artwork.replaceChildren(
      this.createResearchArtworkContent(boxId, research),
    );
    const currentRank = research.completed ? 1 : 0;
    rank.textContent = `Lv. ${String(currentRank).padStart(2, '0')}/01`;
    const val =
      research.locked
        ? this.createLockedValue(research)
        : this.isResearchedStatus(research)
        ? this.createResearchedStatusButton(research)
        : research.inProgress
        ? this.createInProgressStatusButton(research)
        : research.completed
        ? this.createReadonlyValue(research)
        : this.createBuyButton(research);

    row.append(artwork, key, rank, val);
    ref.value = val;
    ref.valueLabel = null;
    ref.valueGap = null;
    ref.valueTimer = null;
    ref.progress = null;
    ref.progressFill = null;
    ref.progressText = null;

    if (research.inProgress) {
      ref.valueLabel = val.querySelector('.research-page__research-value-label');
      ref.valueGap = val.querySelector('.research-page__research-value-gap');
      ref.valueTimer = val.querySelector('.research-page__research-value-timer');
      const progress = this.createProgress(research);
      ref.progress = progress.root;
      ref.progressFill = progress.fill;
      ref.progressText = progress.text;
      row.append(progress.root);
    }
  }

  getRowWidgetSignature(research, boxId) {
    return [
      boxId,
      research.id,
      research.label,
      research.displayName ?? '',
      research.starLevel ?? '',
      research.value,
      research.effect,
      research.showEffect,
      research.actionType ?? '',
      research.description,
      research.costCurrency ?? '',
      research.completed,
      research.inProgress,
      research.locked,
      research.canResearch,
      research.lockReason ?? '',
    ].join('|');
  }

  resetRowWidget(ref) {
    stopTimerProgressFill(ref.progressFill, 0);
    ref.value?.remove();
    ref.progress?.remove();
    ref.row.remove();
    ref.research = null;
    ref.boxId = '';
    ref.signature = '';
    ref.value = null;
    ref.valueLabel = null;
    ref.valueGap = null;
    ref.valueTimer = null;
    ref.progress = null;
    ref.progressFill = null;
    ref.progressText = null;
  }

  destroyRowWidget(ref) {
    stopTimerProgressFill(ref.progressFill, 0);
    ref.row.remove();
    ref.row.replaceChildren();
    ref.research = null;
  }

  releaseUnusedRowWidgets() {
    for (const [researchId, ref] of this.rowRefs) {
      if (this.nextRowIds.has(researchId)) {
        continue;
      }

      this.rowRefs.delete(researchId);
      this.rowPool.release(ref);
    }
  }

  createResearchRank(research) {
    const rank = document.createElement('span');
    rank.className = 'research-page__research-rank';
    const currentRank = research.completed ? 1 : 0;
    rank.textContent = `Lv. ${String(currentRank).padStart(2, '0')}/01`;
    rank.setAttribute('aria-hidden', 'true');
    return rank;
  }

  createResearchArtwork(boxId, research) {
    const root = document.createElement('span');
    root.className = 'research-page__research-art';
    root.setAttribute('aria-hidden', 'true');

    root.append(this.createResearchArtworkContent(boxId, research));
    return root;
  }

  createResearchArtworkContent(boxId, research) {
    const researchId = String(research?.id ?? '');

    if (researchId.startsWith('unlockSeed:')) {
      const itemKey = researchId.slice('unlockSeed:'.length);
      const icon = createSeedPackIcon(
        'research-page__research-art-image',
        {
          key: itemKey,
          label: research?.label ?? research?.displayName,
        },
      );

      if (icon) {
        return icon;
      }
    }

    if (researchId.startsWith('unlockRecipe:')) {
      const itemKey = researchId.slice('unlockRecipe:'.length);
      const icon = createAssetAtlasSprite(
        'research-page__research-art-image',
        getPotionIconFrameName(itemKey),
      );

      if (icon) {
        return icon;
      }
    }

    const image = document.createElement('img');
    image.className = 'research-page__research-art-image';
    image.src = this.getResearchArtworkUrl(boxId, researchId);
    image.alt = '';
    image.draggable = false;
    return image;
  }

  getResearchArtworkUrl(boxId, researchId) {
    if (String(researchId ?? '').startsWith('emerald:cauldronBrewing:')) {
      return RESEARCH_CAULDRON_LEVEL_ARTWORK;
    }

    return RESEARCH_ARTWORK_BY_BOX_ID[boxId] ?? RESEARCH_FALLBACK_ARTWORK;
  }

  getResearchState(research) {
    if (research.completed) {
      return 'completed';
    }

    if (research.inProgress) {
      return 'in-progress';
    }

    if (research.locked) {
      return 'locked';
    }

    if (research.canResearch) {
      return 'available';
    }

    return 'unavailable';
  }

  createResearchLabelParts(research) {
    const itemKind = this.getResearchItemKind(research);
    const parts = [];
    const name = document.createElement('span');
    name.className = 'research-page__research-name';
    name.textContent = research.displayName ?? research.label;
    setItemIconLabel(name, itemKind, this.getResearchItemKey(research));
    setResourceColor(name, null);
    this.appendResearchStarLabel(name, research);
    parts.push(name);

    const descriptionText = research.description || research.effect;
    if (descriptionText) {
      const description = document.createElement('span');
      description.className = 'research-page__research-description';
      description.textContent = descriptionText;
      parts.push(description);
    }

    return parts;
  }

  getResearchItemKind(research) {
    if (research.id?.startsWith('unlockSeed:')) {
      return 'seed';
    }

    if (research.id?.startsWith('unlockRecipe:')) {
      return 'potion';
    }

    return null;
  }

  getCompletedResearchCurrency(research) {
    if (!research?.completed) {
      return null;
    }

    return ['crystal', 'ruby', 'emerald'].includes(research.costCurrency)
      ? research.costCurrency
      : null;
  }

  getResearchItemKey(research) {
    return research.id?.startsWith('unlockRecipe:')
      ? research.id.slice('unlockRecipe:'.length)
      : null;
  }

  appendResearchStarLabel(element, research) {
    const starLevel = this.getResearchStarLevel(research);

    if (starLevel <= 0) {
      return;
    }

    element.append(document.createTextNode(' '), createStarLevelLabel(starLevel));
  }

  getResearchStarLevel(research) {
    const safeStarLevel = Math.floor(Number(research?.starLevel));
    return Number.isInteger(safeStarLevel) && safeStarLevel > 0 ? safeStarLevel : 0;
  }

  createReadonlyValue(research) {
    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';

    if (!research.inProgress) {
      const starLevel = this.getResearchStarLevel(research);
      if (research.completed && starLevel > 0) {
        val.replaceChildren(createStarLevelLabel(starLevel));
        this.setResearchValueResourceColor(val, research);
        return val;
      }

      setResourceIconText(val, research.value);
      this.setResearchValueResourceColor(val, research);
      return val;
    }

    const label = document.createElement('span');
    label.className = 'research-page__research-value-label';

    const gap = document.createElement('span');
    gap.className = 'research-page__research-value-gap';

    const timer = document.createElement('span');
    timer.className = 'research-page__research-value-timer';

    val.append(label, gap, timer);
    this.setResearchValueStatus(
      { value: val, valueLabel: label, valueGap: gap, valueTimer: timer },
      research,
    );
    return val;
  }

  isResearchedStatus(research) {
    return (
      research?.completed === true &&
      String(research.value ?? '').trim().toLowerCase() === 'researched'
    );
  }

  createResearchedStatusButton(research) {
    const button = document.createElement('button');
    button.className =
      'style-button style-cost-button style-cost-button--yellow research-page__research-button research-page__research-button--completed';
    button.type = 'button';
    button.disabled = true;

    const label = document.createElement('span');
    label.className = 'style-cost-button__plain-label';
    label.textContent = 'Researched';
    button.append(label);
    button.setAttribute(
      'aria-label',
      `${this.formatResearchName(research)} is researched`,
    );
    return button;
  }

  createInProgressStatusButton(research) {
    const button = document.createElement('button');
    button.className =
      'row_val style-button style-cost-button style-cost-button--yellow research-page__research-button research-page__research-button--in-progress research-page__research-value';
    button.type = 'button';
    button.disabled = true;

    const content = document.createElement('span');
    content.className =
      'style-cost-button__plain-label research-page__research-status-content';
    const label = document.createElement('span');
    label.className = 'research-page__research-value-label';
    const gap = document.createElement('span');
    gap.className = 'research-page__research-value-gap';
    const timer = document.createElement('span');
    timer.className = 'research-page__research-value-timer';
    content.append(label, gap, timer);
    button.append(content);
    this.setResearchValueStatus(
      { value: button, valueLabel: label, valueGap: gap, valueTimer: timer },
      research,
    );
    return button;
  }

  createLockedValue(research) {
    const button = this.createBuyButton(research, {
      amountLabel: 'Locked',
      state: 'locked',
    });
    const label = button.querySelector('.style-cost-button__plain-label');

    if (!label) {
      return button;
    }

    label.classList.add('research-page__research-lock-label');
    const title = document.createElement('span');
    title.className = 'research-page__research-lock-title';
    title.textContent = 'Locked';
    const reason = document.createElement('span');
    reason.className = 'research-page__research-lock-reason';
    reason.textContent = this.formatResearchLockPrompt(research);
    label.replaceChildren(title, reason);
    return button;
  }

  formatResearchLockPrompt(research) {
    const reason = String(research?.lockReason ?? '')
      .trim()
      .replace(/\.$/, '');
    const levelMatch = reason.match(/^requires level (\d+)$/i);

    if (levelMatch) {
      return `Reach level ${levelMatch[1]}`;
    }

    if (!reason || reason.toLowerCase() === 'this research is still locked') {
      return 'Complete prior research';
    }

    return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
  }

  setResearchValueResourceColor(element, research) {
    const currency = this.getCompletedResearchCurrency(research);

    if (currency) {
      setResourceColor(element, currency);
      return;
    }

    setResourceColorFromText(element, research.value);
  }

  createProgress(research) {
    const root = document.createElement('div');
    root.className = 'style-progress style-progress--timer research-page__research-progress';
    root.setAttribute('role', 'progressbar');
    root.setAttribute(
      'aria-label',
      `${this.formatResearchName(research)} ${this.getResearchActionNoun(research)} progress`,
    );
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');

    const fill = document.createElement('span');
    fill.className = 'style-progress__fill research-page__research-progress-fill';

    const text = document.createElement('span');
    text.className = 'style-progress__text research-page__research-progress-text';

    root.append(fill, text);
    return { root, fill, text };
  }

  syncResearchProgress(boxes) {
    for (const box of boxes) {
      for (const research of box.researches ?? []) {
        const ref = this.rowRefs.get(research.id);

        if (!ref?.progress) {
          continue;
        }

        setTimerProgressFill(ref.progressFill, research, {
          onUpdate: ({ remainingMs, percent }) => {
            this.setResearchValueStatus(ref, { ...research, remainingMs });
            this.setAttribute(ref.progress, 'aria-valuenow', String(percent));
          },
        });
        this.setText(ref.progressText, '');
      }
    }
  }

  setResearchValueStatus(ref, research) {
    if (!ref?.valueLabel || !ref?.valueGap || !ref?.valueTimer) {
      return;
    }

    const timer = this.formatResearchTimer(research);
    this.setText(
      ref.valueLabel,
      research?.actionType === 'levelUp' ? 'Leveling Up' : 'Researching',
    );
    this.setText(ref.valueGap, '');
    this.setText(ref.valueTimer, timer);
    this.setAttribute(
      ref.value,
      'aria-label',
      `${this.formatResearchName(research)} is ${this.getResearchInProgressLabel(
        research,
      )}${
        timer ? `, ${timer} remaining` : ''
      }`,
    );
  }

  formatResearchTimer(research) {
    const remainingMs = Number.isFinite(research?.remainingMs) ? research.remainingMs : 0;
    return formatRemainingTime(remainingMs);
  }

  createBuyButton(
    research,
    {
      amountLabel = research.value,
      state = research.canResearch ? 'available' : 'unaffordable',
    } = {},
  ) {
    const button = document.createElement('button');
    button.className = 'style-button research-page__research-button';
    button.classList.toggle('is-unaffordable', state === 'unaffordable');
    button.classList.toggle('is-locked', state === 'locked');
    button.type = 'button';
    button.dataset.tutorialId = `research:${research.id}`;
    const costButton = new CostButtonManager({
      button,
      onPress: () => this.gameplayFacade.buyResearch(research.id),
    });
    costButton.setData({
      amountLabel,
      enabled: research.canResearch,
      ariaLabel: this.formatResearchButtonLabel(research),
      title: !research.canResearch ? research.lockReason : '',
    });
    setNotificationBadge(button, research.canResearch === true);
    return button;
  }

  formatResearchName(research) {
    const parts = [research.label];
    const starLevel = this.getResearchStarLevel(research);

    if (starLevel > 0) {
      parts.push(formatStarLevel(starLevel).text);
    }

    if (research.showEffect) {
      parts.push(research.effect);
    }

    return parts.filter(Boolean).join(' ');
  }

  formatResearchButtonLabel(research) {
    if (research.locked) {
      return `${this.formatResearchName(research)} is locked, ${this.formatResearchLockPrompt(
        research,
      )}`;
    }

    if (research.inProgress) {
      return `${this.formatResearchName(research)} is ${this.getResearchInProgressLabel(
        research,
      )}`;
    }

    return `${this.getResearchActionVerb(research)} ${this.formatResearchName(
      research,
    )} for ${research.value}`;
  }

  getResearchActionVerb(research) {
    return research?.actionType === 'levelUp' ? 'level up' : 'research';
  }

  getResearchActionNoun(research) {
    return research?.actionType === 'levelUp' ? 'level up' : 'research';
  }

  getResearchInProgressLabel(research) {
    return research?.actionType === 'levelUp' ? 'leveling up' : 'researching';
  }

  setText(element, value) {
    if (element.textContent !== value) {
      setResourceIconText(element, value);
    }
  }

  setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

}
