import { describe, expect, it } from 'vitest';

import integrations from './GardenWidgets.ui-editor.js';

describe("Garden widget UI editor integrations", () => {
  it("keeps every reusable Garden widget independently selectable", () => {
    expect(integrations.map(({ id }) => id)).toEqual([
      "compound.garden-seed-action-bar",
      "compound.garden-seed-picker-button",
      "compound.garden-plot",
      "compound.automated-garden-plot",
      "compound.garden-plot-tooltip",
    ]);
    expect(integrations.every(({ kind, scenarios }) =>
      kind === 'widget' && scenarios.length > 0 &&
      scenarios.every(({ mount }) => typeof mount === 'function')),
    ).toBe(true);
    expect(
      integrations.find(({ id }) => id === "compound.garden-seed-action-bar")
        ?.childWidgetIds,
    ).toContain("compound.garden-seed-picker-button");
  });
});
