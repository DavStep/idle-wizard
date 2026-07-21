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

  it('flies three stars toward the newly completed segment', () => {
    const { gameplayFacade, refs, emit } = createFixture({ completedQuests: 0 });
    const manager = new TopPanelQuestProgressManager({ gameplayFacade });
    const pendingAnimation = new Promise(() => {});
    vi.spyOn(manager, 'animateElement').mockReturnValue({ finished: pendingAnimation });
    setRect(refs.levelStar, { left: 280, top: 18, width: 34, height: 34 });
    const request = document.createElement('div');
    request.className = 'workshop-page__tasks-summary';
    setRect(request, { left: 80, top: 210, width: 120, height: 20 });
    document.body.append(request);

    manager.mount(refs);
    const firstSegment = refs.questSegments.children[0];
    setRect(firstSegment, { left: 160, top: 54, width: 42, height: 12 });
    emit(createSnapshot({ completedQuests: 1 }));

    expect(document.querySelectorAll('.room-top-panel__quest-flight')).toHaveLength(3);
    expect(manager.animateElement).toHaveBeenCalledTimes(3);
    expect(firstSegment.classList.contains('is-complete')).toBe(true);
    expect(refs.questProgressText.textContent).toBe('Complete 3 more quests to level up');

    manager.unmount();
    expect(document.querySelector('.room-top-panel__quest-flight')).toBeNull();
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

function createFixture({ completedQuests = 1 } = {}) {
  let listener = null;
  let snapshot = createSnapshot({ completedQuests });
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

function createSnapshot({ completedQuests = 1, loadRevision = 0 } = {}) {
  return {
    persistence: { loadRevision },
    tasks: {
      level: {
        questProgress: createProgress({ completedQuests }),
      },
    },
  };
}

function createProgress({
  completedQuests = 1,
  totalQuests = 4,
  targetLevel = 3,
  activeQuest = { kind: 'task', taskId: 'quest-1' },
} = {}) {
  return {
    completedQuests,
    totalQuests,
    targetLevel,
    activeQuest,
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
