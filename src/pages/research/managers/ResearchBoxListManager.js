import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColorFromText } from '../../shared/resourceColor.js';
import { setNotificationBadge } from '../../shared/notificationBadge.js';

const maxLockedResearchesPerBox = 3;

export class ResearchBoxListManager {
  constructor({ gameplayFacade, onShowResearchInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onShowResearchInfo = onShowResearchInfo;
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.unsubscribe = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons = new Map();
    this.rowRefs = new Map();
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
    this.boxesRoot.className = 'research-page__box-list';
    this.root.append(this.tabsRoot, this.boxesRoot);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.tabsRoot = null;
    this.boxesRoot = null;
    this.signature = '';
    this.selectedTabId = 'regular';
    this.tabButtons.clear();
    this.rowRefs.clear();
  }

  render(snapshot) {
    const tabs = this.getTabs(snapshot);
    const selectedTab = this.getSelectedTab(tabs);
    const boxes = selectedTab?.boxes ?? [];
    const signature = `${selectedTab?.id ?? 'none'}|${tabs
      .map((tab) => `${tab.id}:${tab.label}`)
      .join(',')}|${boxes
      .map(
        (box) =>
          `${box.id}:${box.researches
            .map(
              (research) =>
                `${research.id}:${research.label}:${research.value}:${research.effect}:${research.showEffect}:${research.description}:${research.completed}:${research.inProgress}:${research.locked}:${research.canResearch}`,
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
    const selectedTab = tabs.find((tab) => tab.id === this.selectedTabId) ?? tabs[0] ?? null;
    this.selectedTabId = selectedTab?.id ?? 'regular';
    return selectedTab;
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

    const key = document.createElement('button');
    key.className = 'row_key research-page__research-label research-page__research-label-button';
    key.type = 'button';
    key.setAttribute('aria-haspopup', 'dialog');
    key.setAttribute('aria-label', `show information for ${this.formatResearchName(research)}`);
    key.addEventListener('click', () => this.onShowResearchInfo?.(research));
    key.append(...this.createResearchLabelParts(research));

    const val =
      research.completed || research.inProgress
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

  createResearchLabelParts(research) {
    const name = document.createElement('span');
    name.className = 'research-page__research-name';
    name.textContent = research.label;
    setItemIconLabel(
      name,
      this.getResearchItemKind(research),
      this.getResearchItemKey(research),
    );

    if (!research.showEffect) {
      return [name];
    }

    const effect = document.createElement('span');
    effect.className = 'research-page__research-effect';
    setResourceIconText(effect, research.effect);
    setResourceColorFromText(effect, research.effect);
    return [name, effect];
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
      setResourceColorFromText(val, research.value);
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

        const percent = this.getProgressPercent(research.progress);
        this.setResearchValueStatus(ref, research);
        this.setStyleWidth(ref.progressFill, `${percent}%`);
        this.setText(ref.progressText, '');
        this.setAttribute(ref.progress, 'aria-valuenow', String(percent));
      }
    }
  }

  getProgressPercent(progress) {
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    return Math.round(Math.max(0, Math.min(1, safeProgress)) * 100);
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
    return `${Math.max(0, Math.ceil(remainingMs / 1_000))}s`;
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

  setStyleWidth(element, value) {
    if (element.style.width !== value) {
      element.style.width = value;
    }
  }
}
