import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getTutorialStepGraph } from './TutorialStepManager.js';

const TUTORIAL_FLOW_DOC_URL = new URL('../../../../docs/tutorial-flow.md', import.meta.url);

describe('tutorial documentation source order', () => {
  it('keeps docs/tutorial-flow.md aligned with the exported tutorial graph', () => {
    const graph = getTutorialStepGraph();
    const doc = readFileSync(TUTORIAL_FLOW_DOC_URL, 'utf8');

    expect(doc).toContain(`${graph.total}-step source order`);

    for (const step of graph.steps) {
      expect(doc).toContain(`| \`${step.code}\` | \`${step.id}\``);
      expect(doc).toContain(`S${String(step.index).padStart(2, '0')}["${step.index}. ${step.id}`);
    }
  });
});
