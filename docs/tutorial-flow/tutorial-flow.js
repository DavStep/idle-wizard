import '../../src/styles/base.css';
import { TutorialFacade } from '../../src/pages/tutorial/TutorialFacade.js';
import { TUTORIAL_STORAGE_KEY } from '../../src/pages/tutorial/managers/TutorialProgressManager.js';
import { TUTORIAL_STEP_IDS } from '../../src/pages/tutorial/managers/TutorialStepManager.js';

const FLOW_EDGES = [
  ['intro-welcome', 'intro-mana-sphere', 'next'],
  ['intro-mana-sphere', 'first-summon-seed', 'next, mana ready'],
  ['first-summon-seed', 'first-fill-seed-task', 'seed gained'],
  ['first-fill-seed-task', 'finish-seed-task', 'first fill done'],
  ['finish-seed-task', 'intro-market', 'seed task complete'],
  ['intro-market', 'prepare-seed-sale', 'next'],
  ['prepare-seed-sale', 'open-market', 'seed to sell exists'],
  ['open-market', 'select-market-stand', 'market opened'],
  ['select-market-stand', 'select-sage-seed-sale', 'stand selected'],
  ['select-sage-seed-sale', 'earn-tutorial-gold', 'sage seed selected'],
  ['earn-tutorial-gold', 'unselect-sage-seed-sale', '10 gold earned'],
  ['unselect-sage-seed-sale', 'level-up-one', 'stand emptied'],
  ['level-up-one', 'grow-sage', 'level 2'],
  ['grow-sage', 'fill-sage-herb-task', 'sage grown'],
  ['fill-sage-herb-task', 'level-up-two', 'sage task complete'],
  ['level-up-two', 'research-mint-seed', 'level 3'],
  ['research-mint-seed', 'fill-mint-seed-task', 'mint seed research complete'],
  ['fill-mint-seed-task', 'fill-mint-herb-task', 'mint seed task complete'],
  ['fill-mint-herb-task', 'level-up-three', 'mint herb task complete'],
  ['level-up-three', 'research-mana-tonic', 'level 4'],
  ['research-mana-tonic', 'brew-mana-tonic', 'mana tonic research complete'],
  ['brew-mana-tonic', 'refill-mana-tonic-cauldron', 'first potion brewed'],
  ['refill-mana-tonic-cauldron', 'complete', 'cauldron refilled or task complete'],
];

const LESSONS = {
  seeding: 'lesson 1: seeding',
  market: 'lesson 2: market',
  gardening: 'lesson 3: gardening',
  brewing: 'lesson 4: brewing',
};

const FLOW_STEPS = [
  {
    id: 'intro-welcome',
    lesson: LESSONS.seeding,
    pageId: 'workshop',
    targetLabel: 'username',
    note: 'press-to-advance. allows username click.',
    snapshot: baseSnapshot(),
  },
  {
    id: 'intro-mana-sphere',
    lesson: LESSONS.seeding,
    pageId: 'workshop',
    targetLabel: 'mana sphere',
    note: 'press-to-advance. pointer hidden for the mana sphere.',
    snapshot: baseSnapshot(),
  },
  {
    id: 'first-summon-seed',
    lesson: LESSONS.seeding,
    pageId: 'workshop',
    targetLabel: 'summon',
    note: 'hidden while mana is not ready.',
    snapshot: baseSnapshot({
      mana: { current: 10, cap: 50, perSecond: 1 },
      seedSummoning: { canSummon: true, cost: 10 },
    }),
  },
  {
    id: 'first-fill-seed-task',
    lesson: LESSONS.seeding,
    pageId: 'workshop',
    targetLabel: 'first task fill',
    note: 'teaches one manual fill before objective mode.',
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: { seeds: [item('sageSeed', 'sage seed', 'seed', 1)] },
      tasks: levelTasks(1, 10, [
        task('level1-sage-seeds', 'sageSeed', 10, 0, {
          canFill: true,
        }),
      ]),
    }),
  },
  {
    id: 'finish-seed-task',
    lesson: LESSONS.seeding,
    pageId: 'workshop',
    targetLabel: 'seed task objective',
    note: 'objective can point to summon, mana, tasks, or the task row.',
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      seedSummoning: { canSummon: true, cost: 10 },
      tasks: levelTasks(1, 10, [task('level1-sage-seeds', 'sageSeed', 10, 1)]),
    }),
  },
  {
    id: 'intro-market',
    lesson: LESSONS.market,
    pageId: 'workshop',
    targetLabel: 'market lesson',
    note: 'press-to-advance after level 1 seed task completion.',
    snapshot: levelOneTaskCompleteSnapshot(),
  },
  {
    id: 'prepare-seed-sale',
    lesson: LESSONS.market,
    pageId: 'workshop',
    targetLabel: 'summon sale seed',
    note: 'asks for one seed before opening market.',
    snapshot: levelOneTaskCompleteSnapshot({
      seedSummoning: { canSummon: true, cost: 10 },
    }),
  },
  {
    id: 'open-market',
    lesson: LESSONS.market,
    pageId: 'workshop',
    targetLabel: 'market tab',
    note: 'page redirect target because current page is Workshop.',
    snapshot: levelOneTaskCompleteSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: { seeds: [item('sageSeed', 'sage seed', 'seed', 1)] },
    }),
  },
  {
    id: 'select-market-stand',
    lesson: LESSONS.market,
    pageId: 'shop',
    targetLabel: 'stand 1',
    note: 'stand item text owns the tutorial target.',
    snapshot: levelOneTaskCompleteSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: { seeds: [item('sageSeed', 'sage seed', 'seed', 1)] },
      shop: shopState({ selectedSlotNumber: null, sellKey: null }),
    }),
  },
  {
    id: 'select-sage-seed-sale',
    lesson: LESSONS.market,
    pageId: 'shop',
    targetLabel: 'sage seed in sell picker',
    note: 'targets the item name inside the picker, not the price.',
    dom: { shopSellPopupOpen: true },
    snapshot: levelOneTaskCompleteSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: { seeds: [item('sageSeed', 'sage seed', 'seed', 1)] },
      shop: shopState({ selectedSlotNumber: 1, sellKey: null }),
    }),
  },
  {
    id: 'earn-tutorial-gold',
    lesson: LESSONS.market,
    pageId: 'shop',
    targetLabel: 'selling stand',
    note: 'runs the tutorial-only local sale effect.',
    snapshot: levelOneTaskCompleteSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: { seeds: [item('sageSeed', 'sage seed', 'seed', 1)] },
      shop: shopState({ selectedSlotNumber: 1, sellKey: 'sageSeed' }),
    }),
  },
  {
    id: 'unselect-sage-seed-sale',
    lesson: LESSONS.market,
    pageId: 'shop',
    targetLabel: 'empty in sell picker',
    note: 'clears the stand before level-up.',
    dom: { shopSellPopupOpen: true },
    snapshot: levelOneTaskCompleteSnapshot({
      gold: { current: 10 },
      shop: shopState({ selectedSlotNumber: 1, sellKey: 'sageSeed' }),
    }),
  },
  {
    id: 'level-up-one',
    lesson: LESSONS.market,
    pageId: 'workshop',
    targetLabel: 'level up',
    note: 'returns to Workshop and points at the level completion row.',
    dom: { tasksExpanded: true },
    snapshot: levelOneTaskCompleteSnapshot({
      gold: { current: 10 },
      tasks: levelTasks(1, 10, [task('level1-sage-seeds', 'sageSeed', 10, 10, { completed: true })], {
        canComplete: true,
      }),
      shop: shopState({ selectedSlotNumber: 1, sellKey: null }),
    }),
  },
  {
    id: 'grow-sage',
    lesson: LESSONS.gardening,
    pageId: 'garden',
    targetLabel: 'garden plot',
    note: 'guides seed selection, planting, waiting, and harvest.',
    snapshot: baseSnapshot({
      seedInventory: [item('sageSeed', 'sage seed', 'seed', 1)],
      garden: {
        seeds: [item('sageSeed', 'sage seed', 'seed', 1)],
        herbs: [item('sageHerb', 'sage', 'herb', 0)],
        plot: {
          tiles: [tile({ tileNumber: 1, phase: 'empty' })],
        },
      },
      tasks: levelTasks(2, 40, []),
    }),
  },
  {
    id: 'fill-sage-herb-task',
    lesson: LESSONS.gardening,
    pageId: 'workshop',
    targetLabel: 'sage task fill',
    note: 'points back to task when sage is available.',
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      garden: {
        herbs: [item('sageHerb', 'sage', 'herb', 6)],
      },
      tasks: levelTasks(2, 40, [
        task('level2-sage-herb', 'sageHerb', 6, 0, {
          canFill: true,
        }),
      ]),
    }),
  },
  {
    id: 'level-up-two',
    lesson: LESSONS.gardening,
    pageId: 'workshop',
    targetLabel: 'level up',
    note: 'branches to Market if level-up gold is short.',
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      gold: { current: 40 },
      tasks: levelTasks(2, 40, [
        task('level2-sage-herb', 'sageHerb', 6, 6, { completed: true }),
      ], {
        canComplete: true,
      }),
    }),
  },
  {
    id: 'research-mint-seed',
    lesson: LESSONS.gardening,
    pageId: 'research',
    targetLabel: 'mint seed research',
    note: 'level 3 is passive until the player asks or idles.',
    passive: true,
    snapshot: baseSnapshot({
      tasks: levelTasks(3, 80, []),
    }),
  },
  {
    id: 'fill-mint-seed-task',
    lesson: LESSONS.gardening,
    pageId: 'workshop',
    targetLabel: 'mint seed task fill',
    note: 'passive guidance after mint seed research.',
    passive: true,
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      seedInventory: [item('mintSeed', 'mint seed', 'seed', 3)],
      garden: { seeds: [item('mintSeed', 'mint seed', 'seed', 3)] },
      research: { completedResearchIds: ['unlockSeed:mintSeed'], inProgressResearches: [] },
      tasks: levelTasks(3, 80, [
        task('level3-mint-seeds', 'mintSeed', 10, 7, {
          canFill: true,
        }),
        task('level3-mint-herb', 'mintHerb', 18, 0),
      ]),
    }),
  },
  {
    id: 'fill-mint-herb-task',
    lesson: LESSONS.gardening,
    pageId: 'garden',
    targetLabel: 'mint garden plot',
    note: 'goes to Garden when mint herbs still need a source.',
    passive: true,
    snapshot: baseSnapshot({
      seedInventory: [item('mintSeed', 'mint seed', 'seed', 1)],
      garden: {
        seeds: [item('mintSeed', 'mint seed', 'seed', 1)],
        herbs: [item('mintHerb', 'mint', 'herb', 0)],
        plot: {
          tiles: [tile({ tileNumber: 1, phase: 'empty' })],
        },
      },
      research: { completedResearchIds: ['unlockSeed:mintSeed'], inProgressResearches: [] },
      tasks: levelTasks(3, 80, [
        task('level3-mint-seeds', 'mintSeed', 10, 10, { completed: true }),
        task('level3-mint-herb', 'mintHerb', 18, 0),
      ]),
    }),
  },
  {
    id: 'level-up-three',
    lesson: LESSONS.gardening,
    pageId: 'workshop',
    targetLabel: 'level up',
    note: 'still passive. Market branch remains possible for gold shortfall.',
    passive: true,
    dom: { tasksExpanded: true },
    snapshot: baseSnapshot({
      gold: { current: 80 },
      research: { completedResearchIds: ['unlockSeed:mintSeed'], inProgressResearches: [] },
      tasks: levelTasks(3, 80, [
        task('level3-mint-seeds', 'mintSeed', 10, 10, { completed: true }),
        task('level3-mint-herb', 'mintHerb', 18, 18, { completed: true }),
      ], {
        canComplete: true,
      }),
    }),
  },
  {
    id: 'research-mana-tonic',
    lesson: LESSONS.brewing,
    pageId: 'research',
    targetLabel: 'mana tonic research',
    note: 'research step completes once started or completed.',
    snapshot: baseSnapshot({
      research: { completedResearchIds: ['unlockSeed:mintSeed'], inProgressResearches: [] },
      tasks: levelTasks(4, 120, []),
    }),
  },
  {
    id: 'brew-mana-tonic',
    lesson: LESSONS.brewing,
    pageId: 'brewing',
    targetLabel: 'recipes',
    note: 'guides recipe popup, staging, brewing, bottling, and collect.',
    snapshot: baseSnapshot({
      research: {
        completedResearchIds: ['unlockSeed:mintSeed', 'unlockRecipe:manaTonic'],
        inProgressResearches: [],
      },
      tasks: levelTasks(4, 120, []),
      brewing: brewingState(),
    }),
  },
  {
    id: 'refill-mana-tonic-cauldron',
    lesson: LESSONS.brewing,
    pageId: 'brewing',
    targetLabel: 'sage herb',
    note: 'reminds that recipe ingredient order matters.',
    snapshot: baseSnapshot({
      inventory: [item('manaTonic', 'mana tonic', 'potion', 1)],
      research: {
        completedResearchIds: ['unlockSeed:mintSeed', 'unlockRecipe:manaTonic'],
        inProgressResearches: [],
      },
      tasks: levelTasks(4, 120, [
        task('level4-mana-tonic', 'manaTonic', 1, 0),
      ]),
      brewing: brewingState({
        herbs: [item('sageHerb', 'sage', 'herb', 15, { availableQuantity: 15 })],
      }),
    }),
  },
];

const flowById = new Map(FLOW_STEPS.map((step) => [step.id, step]));
let activeFacade = null;
let activeStage = null;

setupDocument();
window.tutorialFlow = {
  steps: FLOW_STEPS.map(toPublicStep),
  edges: FLOW_EDGES.map(([from, to, label]) => ({ from, to, label })),
  renderStep,
};
document.body.dataset.tutorialFlowReady = 'true';
window.addEventListener('hashchange', () => {
  void renderCurrentHash();
});
await renderCurrentHash();

async function renderCurrentHash() {
  const stepId = window.location.hash.replace(/^#/, '') || FLOW_STEPS[0].id;
  await renderStep(stepId);
}

async function renderStep(stepId) {
  const step = flowById.get(stepId);

  if (!step) {
    throw new Error(`unknown tutorial step: ${stepId}`);
  }

  activeFacade?.unmount();
  activeFacade = null;
  activeStage?.remove();
  activeStage = buildStage(step);
  document.querySelector('#tutorial-flow-root').replaceChildren(activeStage);

  const facade = new TutorialFacade({
    gameplayFacade: createGameplayFacade(step.snapshot),
    getCurrentPageId: () => step.pageId,
    storage: createTutorialStorage(TUTORIAL_STEP_IDS.slice(0, TUTORIAL_STEP_IDS.indexOf(step.id))),
    now: () => 10_000,
  });

  activeFacade = facade;
  facade.mount(activeStage);
  await nextFrame();
  facade.refresh();
  await nextFrame();

  facade.hintManager.openLessonPanel();
  facade.scheduleRefresh();
  await nextFrame();
  await nextFrame();

  if (!facade.hintManager.isLessonPanelOpen()) {
    facade.hintManager.openLessonPanel();
    await nextFrame();
  }

  const activeStepId = facade.activeStep?.id ?? null;

  if (activeStepId !== step.id) {
    document.body.dataset.tutorialFlowError = `expected ${step.id}, got ${activeStepId ?? 'none'}`;
    throw new Error(`expected ${step.id}, got ${activeStepId ?? 'none'}`);
  }

  activeStage.dataset.captureStep = step.id;
  document.body.dataset.tutorialFlowStep = step.id;
  delete document.body.dataset.tutorialFlowError;
  return {
    ...toPublicStep(step),
    activeStepId,
    lessonText: activeStage.querySelector('.tutorial-layer__lesson-text')?.textContent ?? '',
    progressLabel:
      activeStage.querySelector('.tutorial-layer__lesson-progress-label')?.textContent ?? '',
  };
}

function setupDocument() {
  document.documentElement.style.setProperty('--design-width', '1080');
  document.documentElement.style.setProperty('--design-height', '2170');
  document.documentElement.style.setProperty('--app-viewport-width', '1080px');
  document.documentElement.style.setProperty('--app-viewport-height', '2170px');
  document.documentElement.style.setProperty('--app-stage-width', '1080px');
  document.documentElement.style.setProperty('--app-stage-height', '2170px');
  document.documentElement.style.setProperty('--app-visible-stage-height', '2170px');
  document.documentElement.style.setProperty('--app-keyboard-inset', '0px');
  document.body.style.margin = '0';

  const originalMatchMedia = window.matchMedia?.bind(window);
  window.matchMedia = (query) => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return {
        matches: true,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      };
    }

    return originalMatchMedia?.(query) ?? {
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    };
  };

  const style = document.createElement('style');
  style.textContent = `
    #tutorial-flow-root {
      width: 1080px;
      height: 2170px;
      background: var(--style-bg);
    }

    .flow-page,
    .flow-layer {
      position: absolute;
      inset: 0;
    }

    .flow-page {
      background: var(--style-surface);
    }

    .flow-target,
    .flow-box,
    .flow-row {
      position: absolute;
      box-sizing: border-box;
      font: inherit;
      color: var(--style-text);
      background: var(--style-surface);
      border: var(--style-border);
      border-radius: 0;
    }

    .flow-target {
      display: grid;
      place-items: center;
      min-height: 20px;
      padding: 5px 10px;
      cursor: pointer;
    }

    .flow-box {
      padding: 7px 10px 5px;
    }

    .flow-row {
      display: grid;
      grid-template-columns: 24px 1fr 82px;
      align-items: center;
      min-height: 22px;
      padding: 0 6px;
      border: 0;
    }

    .flow-muted {
      color: var(--style-muted);
    }

    .flow-title {
      position: absolute;
      top: var(--style-box-title-top);
      left: var(--style-box-title-left);
      padding: 0 2px;
      font-weight: 700;
      background: var(--style-surface);
    }

    .flow-tab.is-active,
    .flow-target.is-active {
      text-decoration: underline;
    }

    .flow-popup {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
    }

    .flow-dialog {
      position: relative;
      width: 244px;
      min-height: 140px;
      padding: 20px;
      background: var(--style-surface);
      border: var(--style-border-strong);
      box-shadow: var(--style-block-shadow);
      pointer-events: auto;
    }
  `;
  document.head.append(style);
}

function buildStage(step) {
  const stage = element('section', 'game-stage');
  stage.style.setProperty('--viewport-scale', '1');
  stage.style.setProperty('--style-ui-scale', '3');
  stage.dataset.page = step.pageId;

  stage.append(
    buildPage(step),
    buildTopPanel(step),
    buildBottomPanel(step),
    buildWorldChat(),
    buildPopupLayer(step),
  );

  return stage;
}

function buildPage(step) {
  const page = element('section', `${step.pageId}-page flow-page`);
  const uiLayer = element('section', `${step.pageId}-page__ui-layer flow-layer`);

  page.append(element('div', `${step.pageId}-page__wall`), element('div', `${step.pageId}-page__floor`), uiLayer);

  if (step.pageId === 'workshop') {
    uiLayer.append(buildWorkshop(step));
  } else if (step.pageId === 'shop') {
    uiLayer.append(buildShop(step));
  } else if (step.pageId === 'garden') {
    uiLayer.append(buildGarden(step));
  } else if (step.pageId === 'research') {
    uiLayer.append(buildResearch(step));
  } else if (step.pageId === 'brewing') {
    uiLayer.append(buildBrewing(step));
  }

  return page;
}

function buildTopPanel() {
  const layer = element('section', 'room-top-panel-layer');
  const panel = box({ left: 16, top: 14, width: 328, height: 52, title: 'status' });
  const username = target({
    id: 'top:username',
    label: 'wizard',
    left: 10,
    top: 10,
    width: 142,
    height: 24,
    className: 'room-top-panel__username',
  });
  const mana = text({ label: 'mana 10/50', left: 172, top: 12, width: 66, height: 18 });
  const gold = text({ label: '0 gold', left: 250, top: 12, width: 58, height: 18 });

  panel.append(username, mana, gold);
  layer.append(panel);
  return layer;
}

function buildBottomPanel(step) {
  const layer = element('section', 'room-bottom-panel-layer');
  const panel = box({ left: 16, top: 674, width: 328, height: 34, title: 'rooms' });
  const tabs = [
    ['brewing', 'brewing'],
    ['garden', 'garden'],
    ['workshop', 'workshop'],
    ['research', 'research'],
    ['shop', 'market'],
  ];

  tabs.forEach(([pageId, label], index) => {
    panel.append(
      target({
        id: `page:${pageId}`,
        label,
        left: 8 + index * 62,
        top: 7,
        width: 58,
        height: 18,
        className: `room-bottom-panel__tab flow-tab${step.pageId === pageId ? ' is-active' : ''}`,
      }),
    );
  });

  layer.append(panel);
  return layer;
}

function buildWorldChat() {
  const layer = element('section', 'room-world-chat-layer');
  const panel = box({ left: 16, top: 616, width: 328, height: 42, title: 'world chat' });
  panel.append(text({ label: 'no messages yet', left: 96, top: 16, width: 120, height: 16 }));
  layer.append(panel);
  return layer;
}

function buildPopupLayer(step) {
  const layer = element('section', `room-page__popup-layer ${step.pageId}-page__popup-layer`);

  if (step.dom?.shopSellPopupOpen) {
    const popup = element('section', 'shop-page__sell-popup flow-popup');
    const dialog = element('section', 'shop-page__sell-dialog style-dialog flow-dialog');
    dialog.append(title('choose item'));
    dialog.append(
      rowTarget({
        id: 'shop:sell:empty',
        label: 'empty',
        value: '',
        top: 38,
        className: 'shop-page__sell-item-button',
      }),
      rowTarget({
        id: 'shop:sell:sageSeed',
        label: 'sage seed (1)',
        value: '8 gold',
        top: 64,
        className: 'shop-page__sell-item-button',
      }),
    );
    popup.append(dialog);
    layer.append(popup);
  }

  if (step.dom?.gardenSeedPopupOpen) {
    const popup = element('section', 'garden-page__seed-popup flow-popup');
    const dialog = element('section', 'garden-page__seed-dialog style-dialog flow-dialog');
    dialog.append(title('choose seed'));
    dialog.append(
      rowTarget({
        id: 'garden:seed:sageSeed',
        label: 'sage seed (1)',
        value: 'select',
        top: 38,
      }),
      rowTarget({
        id: 'garden:seed:mintSeed',
        label: 'mint seed (1)',
        value: 'select',
        top: 64,
      }),
    );
    popup.append(dialog);
    layer.append(popup);
  }

  if (step.dom?.recipePopupOpen) {
    const popup = element('section', 'brewing-page__recipes-popup flow-popup');
    const dialog = element('section', 'brewing-page__recipes-dialog style-dialog flow-dialog');
    dialog.append(title('recipes'));
    dialog.append(
      rowTarget({
        id: 'brewing:recipe:manaTonic',
        label: 'mana tonic',
        value: 'select',
        top: 38,
      }),
    );
    popup.append(dialog);
    layer.append(popup);
  }

  return layer;
}

function buildWorkshop(step) {
  const fragment = document.createDocumentFragment();
  const manaSphere = box({
    left: 16,
    top: 96,
    width: 280,
    height: 76,
    title: 'mana sphere',
    className: 'workshop-page__mana-sphere',
  });
  manaSphere.dataset.tutorialId = 'workshop:manaSphere';
  manaSphere.append(
    text({ label: 'mana', left: 10, top: 18, width: 70, height: 18 }),
    text({ label: '10/50', left: 195, top: 18, width: 62, height: 18 }),
    text({ label: '1 / second', left: 166, top: 42, width: 92, height: 18 }),
  );

  const actionBar = element('section', 'workshop-page__action-bar');
  const summon = target({
    id: 'workshop:summonSeed',
    label: 'summon seed',
    left: 212,
    top: 528,
    width: 116,
    height: 36,
    className: 'style-button workshop-page__summon-button',
  });
  actionBar.append(summon);

  const tasks = box({
    left: 16,
    top: 202,
    width: 328,
    height: step.dom?.tasksExpanded ? 124 : 64,
    title: 'tasks',
    className: 'workshop-page__tasks',
  });
  const toggle = target({
    id: 'workshop:tasks',
    label: step.dom?.tasksExpanded ? 'collapse' : 'expand',
    left: 135,
    top: tasks.style.height === '124px' ? 108 : 48,
    width: 58,
    height: 18,
    className: 'workshop-page__tasks-toggle',
  });
  toggle.setAttribute('aria-expanded', step.dom?.tasksExpanded ? 'true' : 'false');
  tasks.append(toggle);

  const currentTask = getVisibleTask(step.snapshot);
  if (currentTask) {
    tasks.append(
      rowTarget({
        id: `task:${currentTask.taskId}`,
        label: taskLabel(currentTask.itemKey),
        value: currentTask.canComplete ? 'complete' : currentTask.canFill ? 'fill' : 'wait',
        top: 24,
        className: 'workshop-page__task-row',
      }),
    );
  }

  if (step.snapshot.tasks?.level?.completion?.canComplete) {
    tasks.append(
      rowTarget({
        id: 'workshop:levelUp',
        label: 'level complete',
        value: 'complete',
        top: 58,
        className: 'workshop-page__level-complete',
      }),
    );
  }

  fragment.append(manaSphere, actionBar, tasks);
  return fragment;
}

function buildShop(step) {
  const fragment = document.createDocumentFragment();
  const shelf = box({
    left: 16,
    top: 116,
    width: 328,
    height: 96,
    title: 'npc market',
    className: 'shop-page__shelf',
  });

  shelf.append(
    rowTarget({
      id: 'shop:stand:1',
      label: step.snapshot.shop?.shelf?.slots?.[0]?.sellKey ? 'sage seed' : 'empty stand',
      value: step.snapshot.shop?.shelf?.selectedSlotNumber === 1 ? 'selected' : 'select',
      top: 24,
      className: 'shop-page__slot-row',
    }),
  );

  fragment.append(shelf);
  return fragment;
}

function buildGarden() {
  const fragment = document.createDocumentFragment();
  const plot = box({
    left: 16,
    top: 116,
    width: 328,
    height: 130,
    title: 'garden',
    className: 'garden-page__plot',
  });
  plot.append(
    rowTarget({
      id: 'garden:plot:1:label',
      label: 'empty plot',
      value: 'choose',
      top: 24,
      className: 'garden-page__plot-row-label',
    }),
    rowTarget({
      id: 'garden:plot:1',
      label: 'sage seed',
      value: 'plant',
      top: 56,
      className: 'garden-page__plot-row',
    }),
  );

  fragment.append(plot);
  return fragment;
}

function buildResearch() {
  const fragment = document.createDocumentFragment();
  const boxNode = box({
    left: 16,
    top: 116,
    width: 328,
    height: 150,
    title: 'research',
    className: 'research-page__box',
  });
  boxNode.append(
    rowTarget({
      id: 'research:unlockSeed:mintSeed',
      label: 'mint seed',
      value: 'research',
      top: 24,
      className: 'research-page__row',
    }),
    rowTarget({
      id: 'research:unlockRecipe:manaTonic',
      label: 'mana tonic',
      value: 'research',
      top: 56,
      className: 'research-page__row',
    }),
  );
  fragment.append(boxNode);
  return fragment;
}

function buildBrewing() {
  const fragment = document.createDocumentFragment();
  const herbs = box({
    left: 16,
    top: 116,
    width: 328,
    height: 112,
    title: 'herbs',
    className: 'brewing-page__herbs',
  });
  herbs.append(
    rowTarget({
      id: 'brewing:herb:sageHerb',
      label: 'sage',
      value: '15',
      top: 24,
      className: 'brewing-page__herb-row',
    }),
  );

  const cauldron = box({
    left: 16,
    top: 254,
    width: 328,
    height: 150,
    title: 'cauldron',
    className: 'brewing-page__cauldron',
  });
  cauldron.append(
    target({
      id: 'brewing:recipes',
      label: 'recipes',
      left: 10,
      top: 110,
      width: 82,
      height: 20,
      className: 'style-button brewing-page__recipes-button',
    }),
    target({
      id: 'brewing:action',
      label: 'brew',
      left: 236,
      top: 110,
      width: 72,
      height: 20,
      className: 'style-button brewing-page__action-button',
    }),
  );

  fragment.append(herbs, cauldron);
  return fragment;
}

function box({ left, top, width, height, title: label, className = '' }) {
  const node = element('section', `flow-box style-box ${className}`.trim());
  Object.assign(node.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  node.append(title(label));
  return node;
}

function title(label) {
  const node = element('div', 'style-box__title flow-title');
  node.textContent = label;
  return node;
}

function target({ id, label, left, top, width, height, className = '' }) {
  const node = element('button', `flow-target ${className}`.trim());
  node.type = 'button';
  node.dataset.tutorialId = id;
  node.textContent = label;
  Object.assign(node.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  return node;
}

function text({ label, left, top, width, height }) {
  const node = element('span', 'flow-muted');
  node.textContent = label;
  Object.assign(node.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  return node;
}

function rowTarget({ id, label, value, top, className = '' }) {
  const row = element('button', `flow-row ${className}`.trim());
  row.type = 'button';
  row.dataset.tutorialId = id;
  Object.assign(row.style, {
    left: '10px',
    top: `${top}px`,
    width: '308px',
    height: '22px',
  });
  row.append(span('1.'), span(label), span(value, 'flow-muted'));
  return row;
}

function span(textContent, className = '') {
  const node = element('span', className);
  node.textContent = textContent;
  return node;
}

function element(tagName, className) {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  return node;
}

function createGameplayFacade(snapshot) {
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    sellTutorialItemForGold() {},
  };
}

function createTutorialStorage(completedStepIds) {
  let value = JSON.stringify({ completedStepIds });

  return {
    getItem(key) {
      return key === TUTORIAL_STORAGE_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === TUTORIAL_STORAGE_KEY) {
        value = String(nextValue);
      }
    },
    removeItem(key) {
      if (key === TUTORIAL_STORAGE_KEY) {
        value = '';
      }
    },
  };
}

function baseSnapshot(overrides = {}) {
  return mergeSnapshot({
    mana: { current: 10, cap: 50, perSecond: 1 },
    gold: { current: 0 },
    crystal: { current: 0 },
    ruby: { current: 0 },
    inventory: [],
    seedInventory: [],
    seedSummoning: { canSummon: false, cost: 10 },
    research: { completedResearchIds: [], inProgressResearches: [] },
    shop: shopState({ selectedSlotNumber: null, sellKey: null }),
    garden: {
      seeds: [],
      herbs: [],
      plot: {
        tiles: [tile({ tileNumber: 1, phase: 'empty' })],
      },
    },
    tasks: levelTasks(1, 10, [task('level1-sage-seeds', 'sageSeed', 10, 0)]),
    brewing: brewingState(),
  }, overrides);
}

function levelOneTaskCompleteSnapshot(overrides = {}) {
  return baseSnapshot(mergeSnapshot({
    tasks: levelTasks(1, 10, [
      task('level1-sage-seeds', 'sageSeed', 10, 10, { completed: true }),
    ]),
  }, overrides));
}

function mergeSnapshot(base, overrides) {
  const merged = { ...base };

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (
      value &&
      !Array.isArray(value) &&
      typeof value === 'object' &&
      base[key] &&
      !Array.isArray(base[key]) &&
      typeof base[key] === 'object'
    ) {
      merged[key] = mergeSnapshot(base[key], value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function levelTasks(level, costGold, tasks, completion = {}) {
  return {
    currentLevel: level,
    level: {
      level,
      completion: {
        canComplete: false,
        costGold,
        ...completion,
      },
      tasks,
    },
  };
}

function task(taskId, itemKey, requiredQuantity, progressQuantity, overrides = {}) {
  const completed = overrides.completed === true;

  return {
    taskId,
    itemKey,
    requiredQuantity,
    progressQuantity,
    remainingQuantity: Math.max(0, requiredQuantity - progressQuantity),
    canFill: false,
    canComplete: false,
    completed,
    ...overrides,
  };
}

function item(key, label, kind, quantity, overrides = {}) {
  return {
    key,
    label,
    kind,
    itemTypeId: itemTypeId(key),
    quantity,
    researched: true,
    unlocked: true,
    ...overrides,
  };
}

function tile(overrides = {}) {
  return {
    tileNumber: 1,
    unlocked: true,
    phase: 'empty',
    selectedSeedItemTypeId: null,
    seedKey: null,
    ...overrides,
  };
}

function shopState({ selectedSlotNumber = null, sellKey = null } = {}) {
  return {
    shelf: {
      maxSlots: 1,
      selectedSlotNumber,
      slotCosts: [0],
      sellKinds: [{ kind: 'seed', label: 'seeds' }],
      sellItems: [item('sageSeed', 'sage seed', 'seed', 1, { sellGold: 8, sellNeed: 12 })],
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellKey,
          sellItemTypeId: sellKey ? itemTypeId(sellKey) : null,
          sellKind: sellKey ? 'seed' : null,
          sellLabel: sellKey ? 'sage seed' : null,
          sellQuantity: sellKey ? 1 : 0,
          sellGold: sellKey ? 8 : 0,
          sellNeed: sellKey ? 12 : 0,
        },
      ],
    },
  };
}

function brewingState(overrides = {}) {
  return {
    ingredients: [],
    canBrew: false,
    canAddIngredient: true,
    activeBrew: null,
    herbs: [item('sageHerb', 'sage', 'herb', 3, { availableQuantity: 3 })],
    recipes: [
      {
        key: 'manaTonic',
        label: 'mana tonic',
        unlocked: true,
        ingredients: [{ key: 'sageHerb', quantity: 3 }],
      },
    ],
    ...overrides,
  };
}

function itemTypeId(key) {
  return {
    sageSeed: 1,
    mintSeed: 2,
    sageHerb: 101,
    mintHerb: 102,
    manaTonic: 201,
  }[key] ?? 999;
}

function getVisibleTask(snapshot) {
  return snapshot.tasks?.level?.tasks?.find((candidate) => !candidate.completed) ??
    snapshot.tasks?.level?.tasks?.[0] ??
    null;
}

function taskLabel(itemKey) {
  return {
    sageSeed: 'sage seeds',
    sageHerb: 'sage',
    mintSeed: 'mint seeds',
    mintHerb: 'mint',
    manaTonic: 'mana tonic',
  }[itemKey] ?? itemKey;
}

function toPublicStep(step) {
  return {
    id: step.id,
    index: TUTORIAL_STEP_IDS.indexOf(step.id) + 1,
    total: TUTORIAL_STEP_IDS.length,
    lesson: step.lesson,
    pageId: step.pageId,
    targetLabel: step.targetLabel,
    note: step.note,
    passive: step.passive === true,
  };
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
