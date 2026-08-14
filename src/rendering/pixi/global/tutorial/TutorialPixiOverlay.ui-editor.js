import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { TutorialLessonSurface } from './TutorialPixiOverlay.js';

const WIDGET_ID = 'compound.tutorial-lesson-surface';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'primitive.retained-panel',
    'primitive.progress-bar',
    'text-button',
    'compound.dialog-frame',
  ],
  createThumbnail: createLessonThumbnail,
  folderPath: ['Tutorial'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Tutorial Lesson Surface',
  properties: [
    { label: 'Production class', value: 'TutorialLessonSurface' },
    { label: 'Contract', value: 'One Elara lesson, objective, progress, or intro surface' },
  ],
  scenarios: [
    { fixture: createLessonFixture(), id: 'objective', label: 'Objective', mount: mountLesson },
    { fixture: createLessonFixture({ canShowTarget: true, progress: null, progressLabel: '', text: 'Open the seed inventory to choose what Elara should summon.' }), id: 'show-target', label: 'Show target', mount: mountLesson },
    { fixture: createLessonFixture({ advanceLabel: 'continue', advanceOnClick: true, progress: null, progressLabel: '', text: 'I am Elara Starbrew. Let us restore this workshop together.', title: 'Lesson 1: Introduction', variant: 'intro-dialog' }), id: 'intro', label: 'Intro dialog', mount: mountLesson },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'FTUE lesson and objective overlay', source: 'src/rendering/pixi/global/tutorial/TutorialPixiOverlay.js' },
  ],
});

function createLessonThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: tutorialAssetFilter,
    component: 'TutorialLessonSurface',
    createControl: ({ assets }) => createLessonControl({ assets, fixture: createLessonFixture(), input: null }),
    id: WIDGET_ID,
  });
}

async function mountLesson(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: tutorialAssetFilter,
    component: 'TutorialLessonSurface',
    createControl: ({ assets, input }) => createLessonControl({
      assets,
      fixture,
      input,
      onAdvance: () => context.emit('tutorialAdvanced'),
      onShowTarget: () => context.emit('tutorialTargetRequested'),
    }),
  });
}

function createLessonControl({ assets, fixture, input, onAdvance = () => true, onShowTarget = () => true }) {
  const lesson = new TutorialLessonSurface({
    assets,
    inputRouter: input,
    onAdvance,
    onShowTarget,
    onSurfacePress: () => true,
  });
  lesson.bind({ ...fixture, reducedMotion: true });
  lesson.setVisible(true);
  return {
    destroy: () => {
      lesson.destroy();
      lesson.root.destroy({ children: true });
    },
    height: lesson.outerHeight,
    lesson,
    root: lesson.root,
    width: lesson.outerWidth,
  };
}

function createLessonFixture(overrides = {}) {
  return {
    advanceOnClick: false,
    canShowTarget: false,
    id: 'lesson-4-grow-sage',
    progress: 0.4,
    progressLabel: '2/5',
    text: 'Grow Sage in the Garden, then return when the request is ready.',
    title: 'Lesson 4: Gardening',
    variant: 'lesson',
    ...overrides,
  };
}

function tutorialAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/ui/')
    || assetId.includes('/characters/')
    || assetId.includes('/progress-bars/');
}
