/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TopPanelQuestProgressManager } from './TopPanelQuestProgressManager.js';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TopPanelQuestProgressManager', () => {
  it('renders one segment per quest and the remaining quest count', () => {
    const { gameplayFacade, refs } = createFixture();
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });

    manager.mount(refs);

    expect(refs.questRow.hidden).toBe(false);
    expect(refs.questSegments.children).toHaveLength(4);
    expect(refs.questSegments.querySelectorAll('.is-complete')).toHaveLength(1);
    expect(refs.questProgressText.textContent).toBe('Complete 3 more quests to level up');
    expect(refs.questProgressFill.style.getPropertyValue('--room-top-panel-quest-fill-clip-right')).toBe(
      '75%',
    );
    expect(refs.questProgressRail.getAttribute('aria-label')).toBe(
      '1 of 4 quests complete to reach level 3',
    );

    manager.unmount();
  });

  it('shows partial progress through the active request on early levels', () => {
    const progress = createProgress({
      completedQuests: 0,
      totalQuests: 3,
      progress: (4 / 5) / 3,
    });
    const { gameplayFacade, refs } = createFixture({ progress });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });

    manager.mount(refs);

    const clipRight = Number.parseFloat(
      refs.questProgressFill.style.getPropertyValue(
        '--room-top-panel-quest-fill-clip-right',
      ),
    );
    expect(clipRight).toBeCloseTo(100 - ((4 / 5) / 3) * 100);
    expect(Number(refs.questProgressRail.getAttribute('aria-valuenow'))).toBeCloseTo(4 / 5);
    expect(refs.questProgressRail.getAttribute('aria-valuetext')).toBe(
      '0 of 3 quests complete to reach level 3, current quest 80% complete',
    );
    expect(refs.questSegments.querySelectorAll('.is-complete')).toHaveLength(0);

    manager.unmount();
  });

  it('snaps the request, flies three stars into the level badge, then fills progress', () => {
    vi.useFakeTimers();
    const { gameplayFacade, refs, emit } = createFixture({ completedQuests: 0 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    const pendingAnimation = new Promise(() => {});
    vi.spyOn(manager, 'animateElement').mockReturnValue({ finished: pendingAnimation });
    setRect(refs.levelButton, { left: 280, top: 18, width: 34, height: 34 });
    const request = document.createElement('div');
    request.className = 'workshop-page__tasks';
    setRect(request, { left: 80, top: 210, width: 120, height: 20 });
    document.body.append(request);

    manager.mount(refs);
    const firstSegment = refs.questSegments.children[0];
    setRect(firstSegment, { left: 160, top: 54, width: 42, height: 12 });
    const completedSnapshot = createSnapshot({ completedQuests: 1 });
    emit(completedSnapshot);
    emit(completedSnapshot);

    expect(request.classList.contains('is-completing-request')).toBe(true);
    expect(firstSegment.classList.contains('is-complete')).toBe(false);
    vi.advanceTimersByTime(190);

    expect(document.querySelectorAll('.room-top-panel__quest-flight')).toHaveLength(3);
    expect(manager.animateElement).toHaveBeenCalledTimes(3);
    expect(firstSegment.classList.contains('is-complete')).toBe(false);

    vi.advanceTimersByTime(600);

    expect(firstSegment.classList.contains('is-complete')).toBe(true);
    expect(refs.questProgressText.textContent).toBe('Complete 3 more quests to level up');
    expect(request.classList.contains('is-completing-request')).toBe(false);

    manager.unmount();
    expect(document.querySelector('.room-top-panel__quest-flight')).toBeNull();
    vi.useRealTimers();
  });

  it('fills the old rail before jumping the badge and changing the level', () => {
    vi.useFakeTimers();
    const previousProgress = createProgress({
      completedQuests: 3,
      totalQuests: 4,
      targetLevel: 3,
      activeQuest: { kind: 'levelUp' },
    });
    const nextProgress = createProgress({
      completedQuests: 0,
      totalQuests: 5,
      targetLevel: 4,
    });
    const { gameplayFacade, refs, emit } = createFixture({ progress: previousProgress });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    vi.spyOn(manager, 'showQuestFlight').mockImplementation(() => {});
    refs.levelValue.textContent = '2';

    manager.mount(refs);
    emit(createSnapshot({ progress: nextProgress }));

    expect(refs.levelValue.textContent).toBe('2');
    expect(refs.questProgressRail.getAttribute('aria-valuenow')).toBe('3');

    vi.advanceTimersByTime(745);

    expect(refs.questProgressRail.getAttribute('aria-valuenow')).toBe('4');
    expect(refs.levelValue.textContent).toBe('2');

    vi.advanceTimersByTime(297);

    expect(refs.levelButton.classList.contains('is-leveling-up')).toBe(true);
    expect(refs.levelValue.textContent).toBe('3');

    vi.advanceTimersByTime(138);

    expect(refs.levelButton.classList.contains('is-leveling-up')).toBe(false);
    expect(refs.questProgressRail.getAttribute('aria-valuenow')).toBe('0');
    expect(refs.questProgressRail.getAttribute('aria-valuemax')).toBe('5');

    manager.unmount();
    vi.useRealTimers();
  });

  it('reveals the first level number at the badge jump instead of before the flight', () => {
    vi.useFakeTimers();
    const previousProgress = createProgress({
      completedQuests: 0,
      totalQuests: 1,
      targetLevel: 1,
      activeQuest: { kind: 'levelUp' },
    });
    const nextProgress = createProgress({
      completedQuests: 0,
      totalQuests: 2,
      targetLevel: 2,
    });
    const { gameplayFacade, refs, emit } = createFixture({ progress: previousProgress });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    vi.spyOn(manager, 'showQuestFlight').mockImplementation(() => {});
    refs.levelButton.hidden = true;

    manager.mount(refs);
    emit(createSnapshot({ progress: nextProgress }));

    expect(refs.levelButton.hidden).toBe(true);
    expect(refs.levelValue.textContent).toBe('');

    vi.advanceTimersByTime(1022);

    expect(refs.levelButton.hidden).toBe(false);
    expect(refs.levelValue.textContent).toBe('1');

    manager.unmount();
    vi.useRealTimers();
  });

  it('counts the final coin request as a completed segment before level rollover', () => {
    const manager = new TopPanelQuestProgressManager();

    expect(
      manager.getCompletedDelta(
        createProgress({
          completedQuests: 3,
          totalQuests: 4,
          targetLevel: 3,
          activeQuest: { kind: 'levelUp' },
        }),
        createProgress({ completedQuests: 0, totalQuests: 5, targetLevel: 4 }),
      ),
    ).toBe(1);
  });

  it('resets its baseline without a completion flight after persistence hydration', () => {
    const { gameplayFacade, refs, emit } = createFixture({ completedQuests: 0 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    vi.spyOn(manager, 'showQuestFlight');

    manager.mount(refs);
    emit(createSnapshot({ completedQuests: 2, loadRevision: 1 }));

    expect(manager.showQuestFlight).not.toHaveBeenCalled();
    expect(refs.questSegments.querySelectorAll('.is-complete')).toHaveLength(2);

    manager.unmount();
  });

  it('updates quest progress without motion when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const { gameplayFacade, refs, emit } = createFixture({ completedQuests: 0 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    vi.spyOn(manager, 'animateElement');

    manager.mount(refs);
    emit(createSnapshot({ completedQuests: 1 }));

    expect(refs.questSegments.querySelectorAll('.is-complete')).toHaveLength(1);
    expect(manager.animateElement).not.toHaveBeenCalled();
    expect(document.querySelector('.room-top-panel__quest-flight')).toBeNull();

    manager.unmount();
  });

  it('renders a non-persistent preview without changing the gameplay snapshot', () => {
    const { gameplayFacade, refs } = createFixture({ completedQuests: 0 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });

    manager.mount(refs);
    manager.setPreviewProgress({ completedQuests: 1, totalQuests: 4, targetLevel: 2 });

    expect(refs.questProgressRail.getAttribute('aria-valuenow')).toBe('1');
    expect(refs.questProgressFill.style.getPropertyValue('--room-top-panel-quest-fill-clip-right')).toBe(
      '75%',
    );
    expect(refs.questProgressText.textContent).toBe('Complete 3 more quests to level up');
    expect(gameplayFacade.getSnapshot().tasks.level.questProgress.completedQuests).toBe(0);

    manager.unmount();
  });

  it('rounds the continuous fill only when every quest is complete', () => {
    const { gameplayFacade, refs } = createFixture({ completedQuests: 4 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });

    manager.mount(refs);

    expect(refs.questProgressRail.classList.contains('is-complete')).toBe(true);
    expect(refs.questProgressText.textContent).toBe('all quests complete');

    manager.unmount();
  });
});

function createFixture({ completedQuests = 1, progress = null } = {}) {
  let listener = null;
  let snapshot = createSnapshot({ completedQuests, progress });
  const gameplayFacade = {
    getSnapshot: () => snapshot,
    subscribe: (nextListener) => {
      listener = nextListener;
      nextListener(snapshot);
      return () => {};
    },
  };
  const refs = {
    panel: document.createElement('section'),
    levelButton: document.createElement('button'),
    levelStar: document.createElement('img'),
    levelValue: document.createElement('span'),
    questRow: document.createElement('div'),
    questProgressRail: document.createElement('div'),
    questProgressFill: document.createElement('span'),
    questSegments: document.createElement('div'),
    questProgressText: document.createElement('span'),
    questProgressLead: document.createTextNode(''),
    questRemainingValue: document.createElement('strong'),
    questProgressTail: document.createTextNode(''),
  };
  refs.levelStar.src = '/ui/level-star.webp';
  refs.questProgressText.append(
    refs.questProgressLead,
    refs.questRemainingValue,
    refs.questProgressTail,
  );
  refs.questProgressRail.append(refs.questProgressFill, refs.questSegments);
  refs.questRow.append(refs.levelButton, refs.questProgressRail, refs.questProgressText);
  document.body.append(refs.panel, refs.questRow);

  return {
    gameplayFacade,
    refs,
    emit: (nextSnapshot) => {
      snapshot = nextSnapshot;
      listener?.(nextSnapshot);
    },
  };
}

function createSnapshot({ completedQuests = 1, loadRevision = 0, progress = null } = {}) {
  return {
    persistence: { loadRevision },
    tasks: {
      level: {
        questProgress: progress ?? createProgress({ completedQuests }),
      },
    },
  };
}

function createProgress({
  completedQuests = 1,
  totalQuests = 4,
  targetLevel = 3,
  activeQuest = { kind: 'task', taskId: 'quest-1' },
  progress,
} = {}) {
  return {
    completedQuests,
    totalQuests,
    targetLevel,
    activeQuest,
    ...(progress === undefined ? {} : { progress }),
  };
}

function setRect(element, { left, top, width, height }) {
  element.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });
}
