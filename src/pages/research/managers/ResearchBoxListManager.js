import { setResourceColorFromText } from '../../shared/resourceColor.js';

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
                `${research.id}:${research.label}:${research.value}:${research.effect}:${research.showEffect}:${research.description}:${research.completed}:${research.locked}:${research.canResearch}`,
            )
            .join(',')}`,
      )
      .join('|')}`;

    if (signature === this.signature) {
      this.syncTabState(tabs, selectedTab);
      return;
    }

    this.signature = signature;
    this.syncTabs(tabs);
    this.syncTabState(tabs, selectedTab);
    this.boxesRoot.replaceChildren(...boxes.map((box) => this.createBox(box)));
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
    }
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
      !research.completed && !research.canResearch,
    );
    row.classList.toggle('is-locked', Boolean(research.locked));

    const key = document.createElement('button');
    key.className = 'row_key research-page__research-label research-page__research-label-button';
    key.type = 'button';
    key.setAttribute('aria-haspopup', 'dialog');
    key.setAttribute('aria-label', `show information for ${this.formatResearchName(research)}`);
    key.addEventListener('click', () => this.onShowResearchInfo?.(research));
    key.append(...this.createResearchLabelParts(research));

    const val = research.completed ? this.createCompletedValue(research) : this.createBuyButton(research);

    row.append(key, val);
    return row;
  }

  createResearchLabelParts(research) {
    const name = document.createElement('span');
    name.className = 'research-page__research-name';
    name.textContent = research.label;

    if (!research.showEffect) {
      return [name];
    }

    const effect = document.createElement('span');
    effect.className = 'research-page__research-effect';
    effect.textContent = research.effect;
    setResourceColorFromText(effect, research.effect);
    return [name, effect];
  }

  createCompletedValue(research) {
    const val = document.createElement('span');
    val.className = 'row_val research-page__research-value';
    val.textContent = research.value;
    setResourceColorFromText(val, research.value);
    return val;
  }

  createBuyButton(research) {
    const button = document.createElement('button');
    button.className = 'style-button research-page__research-button';
    button.type = 'button';
    button.textContent = research.value;
    setResourceColorFromText(button, research.value);
    button.disabled = !research.canResearch;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.setAttribute('aria-label', this.formatResearchButtonLabel(research));
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

    return `research ${this.formatResearchName(research)} for ${research.value}`;
  }
}
