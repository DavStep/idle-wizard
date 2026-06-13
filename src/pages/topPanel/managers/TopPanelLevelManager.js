import { setResourceIconText } from '../../shared/resourceIconLabel.js';

export class TopPanelLevelManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.visible = false;
    this.previousFocus = null;
    this.lastSnapshot = null;
    this.selectedLevel = null;
    this.handleLevelClick = () => this.show();
    this.handleCloseClick = () => this.hide();
    this.handlePreviousClick = () => this.selectLevel((this.selectedLevel ?? 1) - 1);
    this.handleNextClick = () => this.selectLevel((this.selectedLevel ?? 1) + 1);
    this.handleOverlayClick = (event) => {
      if (event.target === this.refs?.levelPopup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(refs) {
    this.refs = refs;
    this.refs.levelButton.addEventListener('click', this.handleLevelClick);
    this.refs.levelCloseButton.addEventListener('click', this.handleCloseClick);
    this.refs.levelPreviousButton.addEventListener('click', this.handlePreviousClick);
    this.refs.levelNextButton.addEventListener('click', this.handleNextClick);
    this.refs.levelPopup.addEventListener('click', this.handleOverlayClick);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.gameplayFacade) {
      this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.gameplayFacade.getSnapshot());
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.refs) {
      this.refs.levelButton.removeEventListener('click', this.handleLevelClick);
      this.refs.levelCloseButton.removeEventListener('click', this.handleCloseClick);
      this.refs.levelPreviousButton.removeEventListener('click', this.handlePreviousClick);
      this.refs.levelNextButton.removeEventListener('click', this.handleNextClick);
      this.refs.levelPopup.removeEventListener('click', this.handleOverlayClick);
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.visible = false;
    this.previousFocus = null;
    this.lastSnapshot = null;
    this.selectedLevel = null;
  }

  show() {
    if (!this.refs) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.selectedLevel = this.getPlayerLevel(this.lastSnapshot).currentLevel;
    this.applyVisibility();
    this.render(this.lastSnapshot);
    this.focusWithoutScroll(this.refs.levelPanel);
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.focusWithoutScroll(this.previousFocus);
    }

    this.previousFocus = null;
    this.selectedLevel = null;
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.lastSnapshot = snapshot;
    const playerLevel = this.getPlayerLevel(snapshot);
    const selectedLevel = this.getClampedSelectedLevel(playerLevel);
    const selectedLevelSnapshot =
      playerLevel.levels.find((level) => level.level === selectedLevel) ??
      this.getFallbackLevel(selectedLevel, playerLevel.currentLevel);

    this.refs.levelPanel.setAttribute(
      'aria-label',
      `Level ${selectedLevel} rewards`,
    );
    this.refs.levelContent.classList.toggle('is-locked', !selectedLevelSnapshot.unlocked);
    this.setText(this.refs.levelTitle, `level ${selectedLevel}`);
    this.refs.levelCurrentLabel.hidden = !selectedLevelSnapshot.current;
    this.renderSections(selectedLevelSnapshot, playerLevel, selectedLevel);
    this.renderPager(selectedLevel, playerLevel.maxLevel);
  }

  getPlayerLevel(snapshot) {
    return snapshot?.playerLevel ?? this.getFallbackPlayerLevel(snapshot);
  }

  getFallbackPlayerLevel(snapshot) {
    const currentLevel = snapshot.tasks?.currentLevel ?? 1;
    return {
      currentLevel,
      maxLevel: currentLevel,
      levels: [
        this.getFallbackLevel(currentLevel, currentLevel),
      ],
    };
  }

  getFallbackLevel(level, currentLevel) {
    return {
      level,
      current: level === currentLevel,
      unlocked: level <= currentLevel,
      effects: [],
      totals: null,
    };
  }

  getClampedSelectedLevel(playerLevel) {
    const maxLevel = playerLevel.maxLevel ?? playerLevel.currentLevel ?? 1;
    const selectedLevel = Number.isInteger(this.selectedLevel)
      ? this.selectedLevel
      : playerLevel.currentLevel;

    this.selectedLevel = Math.max(1, Math.min(selectedLevel, maxLevel));
    return this.selectedLevel;
  }

  selectLevel(level) {
    if (!this.lastSnapshot) {
      return;
    }

    const playerLevel = this.getPlayerLevel(this.lastSnapshot);
    this.selectedLevel = Math.max(1, Math.min(level, playerLevel.maxLevel ?? 1));
    this.render(this.lastSnapshot);
  }

  renderPager(selectedLevel, maxLevel) {
    const previousLevel = selectedLevel - 1;
    const nextLevel = selectedLevel + 1;
    const hasPrevious = previousLevel >= 1;
    const hasNext = nextLevel <= maxLevel;

    this.setText(this.refs.levelPreviousButton, hasPrevious ? `level ${previousLevel}` : '');
    this.setText(this.refs.levelNextButton, hasNext ? `level ${nextLevel}` : '');
    this.refs.levelPreviousButton.hidden = !hasPrevious;
    this.refs.levelNextButton.hidden = !hasNext;
    this.setDisabled(this.refs.levelPreviousButton, !hasPrevious);
    this.setDisabled(this.refs.levelNextButton, !hasNext);
    this.refs.levelPreviousButton.setAttribute('aria-disabled', hasPrevious ? 'false' : 'true');
    this.refs.levelNextButton.setAttribute('aria-disabled', hasNext ? 'false' : 'true');
    this.refs.levelPreviousButton.setAttribute('aria-selected', 'false');
    this.refs.levelNextButton.setAttribute('aria-selected', 'false');
    this.refs.levelPreviousButton.setAttribute(
      'aria-label',
      hasPrevious ? `show level ${previousLevel}` : 'no previous level',
    );
    this.refs.levelNextButton.setAttribute(
      'aria-label',
      hasNext ? `show level ${nextLevel}` : 'no next level',
    );
  }

  renderSections(levelSnapshot, playerLevel, selectedLevel) {
    const previousTotals = this.getTotalsForLevel(playerLevel, selectedLevel - 1);
    const addedRows = this.formatAddedRows(levelSnapshot.effects ?? [], previousTotals);
    const totalRows = this.formatTotalRows(this.getTotals(levelSnapshot));

    this.refs.levelAddedRows.hidden = addedRows.length <= 0;
    this.refs.levelDivider.hidden = addedRows.length <= 0;
    this.renderRows(this.refs.levelAddedRows, addedRows);
    this.renderRows(this.refs.levelTotalRows, totalRows);
  }

  renderRows(container, rows) {
    const signature = JSON.stringify(rows);

    if (container.dataset.signature === signature) {
      return;
    }

    container.dataset.signature = signature;
    container.replaceChildren(
      ...rows.map((row) => this.createEffectRow(row)),
    );
  }

  createEffectRow({ label, value }) {
    const row = document.createElement('div');
    row.className = 'room-top-panel__level-effect-row';

    const key = document.createElement('span');
    key.className = 'room-top-panel__level-effect-label';
    setResourceIconText(key, label);

    const val = document.createElement('span');
    val.className = 'room-top-panel__level-effect-value';
    val.textContent = value;

    row.append(key, val);
    return row;
  }

  formatAddedRows(effects, previousTotals) {
    return effects
      .map((effect) => this.formatAddedEffect(effect, previousTotals))
      .filter(Boolean);
  }

  formatAddedEffect(effect, previousTotals) {
    if (
      !effect ||
      effect === 'current level' ||
      effect === 'no new limit' ||
      effect === 'no new unlock'
    ) {
      return null;
    }

    const limitRows = [
      [/^max garden tiles (\d+)$/, 'maxGardenTiles', 'garden plots', ''],
      [/^max cauldrons (\d+)$/, 'maxCauldrons', 'cauldrons', ''],
      [/^max npc market stands (\d+)$/, 'maxNpcMarketStands', 'npc stands', ''],
      [/^max player market stands (\d+)$/, 'maxPlayerMarketStands', 'player stands', ''],
      [/^max mana cap ([\d.]+)$/, 'maxManaCap', 'mana cap', ''],
      [/^mana regen ([\d.]+)\/sec$/, 'manaPerSecond', 'mana regen', '/sec'],
    ];

    for (const [pattern, key, label, suffix] of limitRows) {
      const match = effect.match(pattern);

      if (match) {
        const total = Number(match[1]);
        const previous = previousTotals?.[key] ?? 0;
        const added = total - previous;

        if (added <= 0) {
          return null;
        }

        return { label, value: `+${this.formatNumber(added)}${suffix}` };
      }
    }

    const unlockMatch = effect.match(/^unlocks (.+)$/);

    if (unlockMatch) {
      return { label: 'unlocks', value: unlockMatch[1] };
    }

    const researchMatch = effect.match(/^allows researching "(.+)"$/);

    if (researchMatch) {
      return { label: 'research', value: researchMatch[1] };
    }

    const crystalRewardMatch = effect.match(/^crystal reward ([\d.]+)$/);

    if (crystalRewardMatch) {
      return { label: 'crystal', value: `+${this.formatNumber(Number(crystalRewardMatch[1]))}` };
    }

    return { label: effect, value: '' };
  }

  formatTotalRows(totals) {
    if (!totals) {
      return [];
    }

    return [
      ['garden plots', totals.maxGardenTiles, ''],
      ['cauldrons', totals.maxCauldrons, ''],
      ['npc stands', totals.maxNpcMarketStands, ''],
      ['player stands', totals.maxPlayerMarketStands, ''],
      ['mana cap', totals.maxManaCap, ''],
      ['mana regen', totals.manaPerSecond, '/sec'],
    ]
      .filter(([, value]) => Number.isFinite(value))
      .map(([label, value, suffix]) => ({
        label,
        value: `${this.formatNumber(value)}${suffix}`,
      }));
  }

  getTotalsForLevel(playerLevel, level) {
    if (level < 1) {
      return null;
    }

    const levelSnapshot = playerLevel.levels.find((candidate) => candidate.level === level);
    return this.getTotals(levelSnapshot);
  }

  getTotals(levelSnapshot) {
    if (levelSnapshot?.totals) {
      return levelSnapshot.totals;
    }

    return null;
  }

  formatNumber(value) {
    return String(Number(value.toFixed(4)));
  }

  applyVisibility() {
    if (!this.refs) {
      return;
    }

    this.refs.levelPopup.hidden = !this.visible;
    this.refs.levelPopup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
      element.disabled = disabled;
    }
  }

  focusWithoutScroll(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }
}
