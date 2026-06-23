import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { setProgressFill } from '../../shared/progressFill.js';
import {
  formatRemainingTime,
  TIMER_PROGRESS_STEP_MS,
} from '../../shared/timerDisplay.js';

const maxLockedResearchesPerBox = 3;
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX = 10;

export class ResearchBoxListManager {
  constructor({ gameplayFacade, onSelectedTabChange, onShowResearchInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onSelectedTabChange = onSelectedTabChange;
    this.onShowResearchInfo = onShowResearchInfo;
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.unsubscribe = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons = new Map();
    this.rowRefs = new Map();
    this.handledLockedRowPressStartResearchId = null;
    this.pendingLockedRowPress = null;
    this.handlePendingLockedRowPressMove = (event) =>
      this.onPendingLockedRowPressMove(event);
    this.handlePendingLockedRowPressEnd = (event) => this.onPendingLockedRowPressEnd(event);
    this.handlePendingLockedRowPressCancel = () => this.clearPendingLockedRowPress();
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
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
    this.boxesRoot.dataset.scrollCueProgress = 'inline';
    this.root.append(this.boxesRoot, this.tabsRoot);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearPendingLockedRowPress();
    this.root?.remove();
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons.clear();
    this.rowRefs.clear();
    this.handledLockedRowPressStartResearchId = null;
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
  }

  render(snapshot) {
    const tabs = this.getTabs(snapshot);
    const selectedTab = this.getSelectedTab(tabs);
    const boxes = this.decorateBoxes({
      boxes: selectedTab?.boxes ?? [],
      playerLevel: snapshot?.playerLevel?.currentLevel ?? 1,
      prestigeCount: snapshot?.prestige?.completedLevels?.length ?? 0,
      researchLabelById: this.getResearchLabelById(tabs),
      completedResearchIds: this.getCompletedResearchIds(snapshot, tabs),
    });
    const signature = `${selectedTab?.id ?? 'none'}|${tabs
      .map((tab) => `${tab.id}:${tab.label}`)
      .join(',')}|${boxes
      .map(
        (box) =>
          `${box.id}:${box.researches
            .map(
              (research) =>
                `${research.id}:${research.label}:${research.value}:${research.effect}:${research.showEffect}:${research.description}:${research.completed}:${research.inProgress}:${research.locked}:${research.canResearch}:${research.lockReason ?? ''}`,
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
    this.rowRefs.clear();
    this.boxesRoot.replaceChildren(...boxes.map((box) => this.createBox(box)));
    this.syncResearchProgress(boxes);
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
    researchLabelById,
    completedResearchIds,
  }) {
    return boxes.map((box) => ({
      ...box,
      researches: (box.researches ?? []).map((research) => ({
        ...research,
        lockReason: this.getResearchLockReason({
          research,
          playerLevel,
          prestigeCount,
          researchLabelById,
          completedResearchIds,
        }),
      })),
    }));
  }

  getResearchLabelById(tabs = []) {
    const labels = new Map();

    for (const tab of tabs) {
      for (const box of tab.boxes ?? []) {
        for (const research of box.researches ?? []) {
          if (typeof research?.id !== 'string' || typeof research?.label !== 'string') {
            continue;
          }

          labels.set(research.id, research.label);
        }
      }
    }

    return labels;
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
    researchLabelById,
    completedResearchIds,
  }) {
    if (!research?.locked) {
      return '';
    }

    const missingResearchLabels = (research.requiredResearchIds ?? [])
      .filter((researchId) => !completedResearchIds.has(researchId))
      .map((researchId) => researchLabelById.get(researchId) ?? researchId);
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
      requirements.push(
        this.formatRequirementList(missingResearchLabels.map((label) => `${label} research`)),
      );
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

      button.textContent = tab.label;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
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

  createBox(box) {
    const section = document.createElement('section');
    section.className = `research-page__box research-page__box--${box.id} style-box`;
    section.setAttribute('aria-label', box.label);

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = box.label;

    section.append(
      title,
      ...this.getDisplayedResearches(box.researches).map((research) => this.createRow(research)),
    );

    return section;
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

  createRow(research) {
    const row = document.createElement('div');
    row.className = 'research-page__row';
    row.classList.toggle('is-completed', Boolean(research.completed));
    row.classList.toggle(
      'is-unavailable',
      !research.completed && !research.inProgress && !research.canResearch,
    );
    row.classList.toggle('is-locked', Boolean(research.locked));
    row.classList.toggle('is-in-progress', Boolean(research.inProgress));

    if (research.locked) {
      this.bindTouchLikeValidatedPress(row, `locked-research:${research.id}`, (event) =>
        this.onLockedRowPressStart(event, research),
      );
      row.addEventListener('click', (event) => this.onLockedRowClick(event, research));
    }

    const key = document.createElement('button');
    key.className = 'row_key research-page__research-label research-page__research-label-button';
    key.type = 'button';
    key.setAttribute('aria-haspopup', 'dialog');
    key.setAttribute('aria-label', `show information for ${this.formatResearchName(research)}`);
    key.addEventListener('click', () => this.onShowResearchInfo?.(research));
    key.append(...this.createResearchLabelParts(research));

    const val =
      research.locked
        ? this.createLockedValue(research)
        : research.completed || research.inProgress
        ? this.createReadonlyValue(research)
        : this.createBuyButton(research);

    row.append(key, val);

    const ref = { row, value: val };

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

    this.rowRefs.set(research.id, ref);
    return row;
  }

  onLockedRowClick(event, research) {
    if (
      event.type === 'click' &&
      this.handledLockedRowPressStartResearchId === research.id
    ) {
      this.handledLockedRowPressStartResearchId = null;
      return;
    }

    if (event.target?.closest?.('button')) {
      return;
    }

    this.onShowResearchInfo?.(research);
  }

  onLockedRowPressStart(event, research) {
    if (this.isMousePressStart(event) || event.target?.closest?.('button')) {
      return;
    }

    event.preventDefault();
    this.handledLockedRowPressStartResearchId = research.id;
    this.onShowResearchInfo?.(research);
  }

  bindTouchLikeValidatedPress(target, key, handler) {
    target.addEventListener('pointerdown', (event) =>
      this.onTouchLikeValidatedPressStart(event, key, handler),
    );
    target.addEventListener(
      'touchstart',
      (event) => this.onTouchLikeValidatedPressStart(event, key, handler),
      { passive: true },
    );
  }

  onTouchLikeValidatedPressStart(event, key, handler) {
    if (
      this.isMousePressStart(event) ||
      this.isDuplicateTouchLikePressStart(event, key) ||
      event.target?.closest?.('button')
    ) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    this.clearPendingLockedRowPress();
    this.pendingLockedRowPress = {
      key,
      handler,
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX: point.clientX,
      startY: point.clientY,
      moved: false,
      type: event.type === 'pointerdown' ? 'pointer' : 'touch',
    };
    this.addPendingLockedRowPressListeners(this.pendingLockedRowPress.type);
  }

  addPendingLockedRowPressListeners(type) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    const target = this.pendingLockedRowPress?.target ?? null;

    if (!document && !target) {
      return;
    }

    if (type === 'pointer') {
      this.addPendingLockedRowPointerListeners(document);
      this.addPendingLockedRowPointerListeners(target);
      return;
    }

    this.addPendingLockedRowTouchListeners(document);
    this.addPendingLockedRowTouchListeners(target);
  }

  addPendingLockedRowPointerListeners(target) {
    if (!target) {
      return;
    }

    target.addEventListener('pointermove', this.handlePendingLockedRowPressMove, {
      passive: true,
    });
    target.addEventListener('pointerup', this.handlePendingLockedRowPressEnd, true);
    target.addEventListener('pointercancel', this.handlePendingLockedRowPressCancel, true);
  }

  addPendingLockedRowTouchListeners(target) {
    if (!target) {
      return;
    }

    target.addEventListener('touchmove', this.handlePendingLockedRowPressMove, {
      passive: true,
    });
    target.addEventListener('touchend', this.handlePendingLockedRowPressEnd, true);
    target.addEventListener('touchcancel', this.handlePendingLockedRowPressCancel, true);
  }

  removePendingLockedRowPressListeners(type, fallbackTarget = null) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    if (!document && !fallbackTarget) {
      return;
    }

    if (type === 'pointer') {
      this.removePendingLockedRowPointerListeners(document);
      this.removePendingLockedRowPointerListeners(fallbackTarget);
      return;
    }

    this.removePendingLockedRowTouchListeners(document);
    this.removePendingLockedRowTouchListeners(fallbackTarget);
  }

  removePendingLockedRowPointerListeners(target) {
    if (!target) {
      return;
    }

    target.removeEventListener('pointermove', this.handlePendingLockedRowPressMove);
    target.removeEventListener('pointerup', this.handlePendingLockedRowPressEnd, true);
    target.removeEventListener(
      'pointercancel',
      this.handlePendingLockedRowPressCancel,
      true,
    );
  }

  removePendingLockedRowTouchListeners(target) {
    if (!target) {
      return;
    }

    target.removeEventListener('touchmove', this.handlePendingLockedRowPressMove);
    target.removeEventListener('touchend', this.handlePendingLockedRowPressEnd, true);
    target.removeEventListener('touchcancel', this.handlePendingLockedRowPressCancel, true);
  }

  onPendingLockedRowPressMove(event) {
    const pending = this.pendingLockedRowPress;
    if (!pending || !this.eventMatchesPendingLockedRowPress(event, pending)) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    if (
      Math.hypot(point.clientX - pending.startX, point.clientY - pending.startY) >
      TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX
    ) {
      pending.moved = true;
    }
  }

  onPendingLockedRowPressEnd(event) {
    const pending = this.pendingLockedRowPress;
    if (!pending || !this.eventMatchesPendingLockedRowPress(event, pending)) {
      return;
    }

    this.clearPendingLockedRowPress();

    if (pending.moved || !pending.target.contains(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pending.handler(event);
  }

  clearPendingLockedRowPress() {
    if (!this.pendingLockedRowPress) {
      return;
    }

    const { type, target } = this.pendingLockedRowPress;
    this.pendingLockedRowPress = null;
    this.removePendingLockedRowPressListeners(type, target);
  }

  eventMatchesPendingLockedRowPress(event, pending) {
    return (
      pending.type !== 'pointer' ||
      event.pointerId === undefined ||
      pending.pointerId === undefined ||
      event.pointerId === pending.pointerId
    );
  }

  getTouchLikePoint(event) {
    const touch = event.changedTouches?.[0] ?? event.touches?.[0];
    if (touch) {
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }

    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      return {
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }

    return null;
  }

  isDuplicateTouchLikePressStart(event, key) {
    const timeStamp = Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
    const isDuplicate =
      this.lastTouchLikePressStart.key === key &&
      Math.abs(timeStamp - this.lastTouchLikePressStart.timeStamp) <=
        TOUCH_LIKE_PRESS_START_DEDUPE_MS;

    this.lastTouchLikePressStart = { key, timeStamp };
    return isDuplicate;
  }

  isMousePressStart(event) {
    return event.type === 'pointerdown' && event.pointerType === 'mouse';
  }

  createResearchLabelParts(research) {
    const itemKind = this.getResearchItemKind(research);
    const name = document.createElement('span');
    name.className = 'research-page__research-name';
    name.textContent = research.label;
    setItemIconLabel(name, itemKind, this.getResearchItemKey(research));
    setResourceColor(name, this.getResearchNameResourceColor(research, itemKind));

    if (!research.showEffect) {
      return [name];
    }

    const effect = document.createElement('span');
    effect.className = 'research-page__research-effect';
    setResourceIconText(effect, research.effect);
    setResourceColorFromText(effect, research.effect);
    return [name, effect];
  }

  getResearchNameResourceColor(research, itemKind) {
    if (this.isCompletedAdvancedResearch(research)) {
      return 'crystal';
    }

    if (this.isCompletedEmeraldResearch(research)) {
      return 'emerald';
    }

    return itemKind;
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

  isCompletedAdvancedResearch(research) {
    return Boolean(research?.completed) && research.id?.startsWith('advanced:');
  }

  isCompletedEmeraldResearch(research) {
    return Boolean(research?.completed) && research.id?.startsWith('emerald:');
  }

  getResearchItemKey(research) {
    return research.id?.startsWith('unlockRecipe:')
      ? research.id.slice('unlockRecipe:'.length)
      : null;
  }

  createReadonlyValue(research) {
    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';

    if (!research.inProgress) {
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

  createLockedValue(research) {
    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';
    setResourceIconText(val, research.value);
    this.setResearchValueResourceColor(val, research);
    return val;
  }

  setResearchValueResourceColor(element, research) {
    if (this.isCompletedAdvancedResearch(research)) {
      setResourceColor(element, 'crystal');
      return;
    }

    if (this.isCompletedEmeraldResearch(research)) {
      setResourceColor(element, 'emerald');
      return;
    }

    setResourceColorFromText(element, research.value);
  }

  createProgress(research) {
    const root = document.createElement('div');
    root.className = 'style-progress style-progress--timer research-page__research-progress';
    root.setAttribute('role', 'progressbar');
    root.setAttribute('aria-label', `${this.formatResearchName(research)} research progress`);
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

        const progressRatio = this.getProgressRatio(research.progress);
        const percent = this.getProgressPercent(progressRatio);
        const remainingMs = Number.isFinite(research.remainingMs) ? research.remainingMs : 0;
        this.setResearchValueStatus(ref, research);
        setProgressFill(ref.progressFill, progressRatio, {
          smooth: 'step',
          remainingMs,
          stepMs: TIMER_PROGRESS_STEP_MS,
        });
        this.setText(ref.progressText, '');
        this.setAttribute(ref.progress, 'aria-valuenow', String(percent));
      }
    }
  }

  getProgressRatio(progress) {
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    return Math.max(0, Math.min(1, safeProgress));
  }

  getProgressPercent(progress) {
    return Math.round(this.getProgressRatio(progress) * 100);
  }

  setResearchValueStatus(ref, research) {
    if (!ref?.valueLabel || !ref?.valueGap || !ref?.valueTimer) {
      return;
    }

    const timer = this.formatResearchTimer(research);
    this.setText(ref.valueLabel, research.value);
    this.setText(ref.valueGap, timer ? ' ' : '');
    this.setText(ref.valueTimer, timer);
    this.setAttribute(
      ref.value,
      'aria-label',
      `${this.formatResearchName(research)} is researching${timer ? `, ${timer} remaining` : ''}`,
    );
  }

  formatResearchTimer(research) {
    const remainingMs = Number.isFinite(research?.remainingMs) ? research.remainingMs : 0;
    return formatRemainingTime(remainingMs);
  }

  createBuyButton(research) {
    const button = document.createElement('button');
    button.className = 'style-button research-page__research-button';
    button.type = 'button';
    button.dataset.tutorialId = `research:${research.id}`;
    setResourceIconText(button, research.value);
    setResourceColorFromText(button, research.value);
    button.disabled = !research.canResearch;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.setAttribute('aria-label', this.formatResearchButtonLabel(research));
    setNotificationBadge(button, research.canResearch);
    button.addEventListener('click', () => this.gameplayFacade.buyResearch(research.id));
    return button;
  }

  formatResearchName(research) {
    return research.showEffect ? `${research.label} ${research.effect}` : research.label;
  }

  formatResearchButtonLabel(research) {
    if (research.locked) {
      return `${this.formatResearchName(research)} is locked`;
    }

    if (research.inProgress) {
      return `${this.formatResearchName(research)} is researching`;
    }

    return `research ${this.formatResearchName(research)} for ${research.value}`;
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
