// Compatibility export for developer URLs and older tests. Production rendering
// is owned by the retained Root Run renderer; the polling DOM mirror no longer
// exists.
export {
  RootRunUiRendererManager,
  RootRunUiRendererManager as PixiDomMirrorManager,
} from './RootRunUiRendererManager.js';
