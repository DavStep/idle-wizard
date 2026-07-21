// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { UiEditorSourceIndexManager } from './UiEditorSourceIndexManager.js';

describe('UiEditorSourceIndexManager', () => {
  it('prefers a component class over a shared style class', () => {
    const button = document.createElement('button');
    button.className = 'style-button first-run-intro__advance';
    const manager = new UiEditorSourceIndexManager({
      files: {
        '../../../pages/bottomPanel/managers/BottomPanelViewManager.js':
          "button.className = 'style-button'",
        '../../../pages/intro/managers/FirstRunIntroViewManager.js':
          "button.className = 'style-button first-run-intro__advance'",
      },
    });

    expect(manager.findForElement(button)).toEqual({
      path: 'src/pages/intro/managers/FirstRunIntroViewManager.js',
      widget: 'FirstRunIntroViewManager',
    });
  });
});
