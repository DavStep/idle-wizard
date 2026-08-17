// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  PIXI_ACTION_HIGHLIGHT_GEOMETRY,
  PixiActionHighlightScene,
} from './PixiActionHighlightScene.js';

installPixiPageTestCanvas();

describe('PixiActionHighlightScene', () => {
  it('promotes the live target and places the shared action below it', () => {
    const registry = new SemanticTargetRegistry();
    const owner = new Container();
    const target = new Container({ label: 'world-chat-row' });
    owner.addChild(target);
    target.visible = true;
    target.renderable = true;
    target.eventMode = 'static';
    target.getBounds = () => ({
      x: 24 * 3,
      y: 90 * 3,
      width: 96 * 3,
      height: 42 * 3,
    });
    registry.register({
      semanticId: 'world-chat-report:message-one',
      displayObject: target,
    });
    const registrations = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObjectOrDescriptor, descriptor) => {
        const registration = descriptor ?? displayObjectOrDescriptor;
        registrations.push(registration);
        return { unregister: vi.fn() };
      }),
    };
    const scene = new PixiActionHighlightScene({
      assets: createAssets(),
      inputRouter,
      semanticRegistry: registry,
    });
    const report = vi.fn(() => true);
    const dismiss = vi.fn(() => true);

    scene.activate();
    scene.layout({
      authoredOffsetX: 0,
      sourceHeight: 281,
      sourceOffsetX: 0,
      sourceScale: 3,
      sourceWidth: 130,
      stageLogicalWidth: 390,
    });
    scene.bind({
      visible: true,
      targetId: 'world-chat-report:message-one',
      actionLabel: 'Report',
      actionVariant: 'red',
      onAction: report,
      onDismiss: dismiss,
    });

    expect(scene.root.visible).toBe(true);
    expect(scene.actionButton.eventMode).toBe('static');
    expect(scene.highlightLayer.renderLayerChildren).toEqual([target]);
    expect(target.parent).toBe(owner);
    expect(target.parentRenderLayer).toBe(scene.highlightLayer);
    expect(scene.actionButton.position.x).toBe(46);
    expect(scene.actionButton.position.y).toBe(
      132 + PIXI_ACTION_HIGHLIGHT_GEOMETRY.actionGap,
    );
    expect(scene.actionButton.activate()).toBe(true);
    expect(report).toHaveBeenCalledOnce();

    const backdropRegistration = registrations.find(
      ({ id }) => id === 'action-highlight-scene.dismiss',
    );
    expect(backdropRegistration.onActivate()).toBe(true);
    expect(dismiss).toHaveBeenCalledOnce();

    scene.bind({ visible: false });
    expect(scene.root.visible).toBe(false);
    expect(scene.actionButton.eventMode).toBe('none');
    expect(scene.highlightLayer.renderLayerChildren).toEqual([]);
    expect(target.parentRenderLayer).toBeNull();

    scene.destroy();
  });
});

function createAssets() {
  return {
    loaded: true,
    getTexture: vi.fn(() => Texture.EMPTY),
  };
}
