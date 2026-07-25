import '@fontsource/lilita-one/latin-400.css';
import './styles/canvas.css';

import { AppFacade } from './app/AppFacade.js';
import { AuthMobileRedirectBridgeManager } from './backend/auth/managers/AuthMobileRedirectBridgeManager.js';

const mobileAuthCallbackUri =
  import.meta.env.VITE_GOOGLE_AUTH_MOBILE_CALLBACK_URI ??
  'com.idlewizard.game://auth/callback';
const mobileAuthAndroidPackage =
  import.meta.env.VITE_ANDROID_APP_ID ?? 'com.idlewizard.game';
const mobileAuthNativeMarkerParam =
  import.meta.env.VITE_GOOGLE_AUTH_MOBILE_MARKER_PARAM ?? 'native_auth';

function redirectMobileOidcCallbackToApp() {
  return new AuthMobileRedirectBridgeManager({
    callbackUri: mobileAuthCallbackUri,
    androidPackage: mobileAuthAndroidPackage,
    nativeMarkerParam: mobileAuthNativeMarkerParam,
  }).redirectIfNeeded();
}

if (!redirectMobileOidcCallbackToApp()) {
  const canvas = document.querySelector('#game-canvas');
  if (!canvas) {
    throw new Error('The production Pixi canvas is missing.');
  }
  const app = new AppFacade({ canvas });
  let devCheatsFacade = null;
  let tutorialCaptureFacade = null;
  let uiEditorFacade = null;
  let quickUiPreviewFacade = null;
  let disposed = false;

  void app.start().catch((error) => {
    globalThis.console?.error?.('Idle Wizard failed to start.', error);
  });

  const quickUiSearch = new URLSearchParams(window.location.search);
  if (
    import.meta.env.DEV &&
    (quickUiSearch.has('quick_ui') || quickUiSearch.has('ui'))
  ) {
    void import('./dev/quickUi/QuickUiPreviewFacade.js').then(
      ({ QuickUiPreviewFacade }) => {
        if (disposed) {
          return;
        }

        quickUiPreviewFacade = new QuickUiPreviewFacade({ app });
        quickUiPreviewFacade.mount();
      },
    );
  }

  if (import.meta.env.VITE_ENABLE_CHEATS === 'true') {
    void import('./dev/cheats/DevCheatsFacade.js').then(({ DevCheatsFacade }) => {
      if (disposed) {
        return;
      }

      devCheatsFacade = new DevCheatsFacade({ app });
      devCheatsFacade.mount();
    });
  }

  if (import.meta.env.VITE_ENABLE_TUTORIAL_CAPTURE === 'true') {
    void import('./dev/tutorialCapture/TutorialCaptureFacade.js').then(
      ({ TutorialCaptureFacade }) => {
        if (disposed) {
          return;
        }

        tutorialCaptureFacade = new TutorialCaptureFacade({ app });
        tutorialCaptureFacade.mount();
      },
    );
  }

  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_UI_EDITOR === 'true'
  ) {
    void import('./dev/uiEditor/UiEditorFacade.js').then(({ UiEditorFacade }) => {
      if (disposed) {
        return;
      }

      uiEditorFacade = new UiEditorFacade({ app });
      uiEditorFacade.mount();
    });
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      disposed = true;
      devCheatsFacade?.unmount();
      tutorialCaptureFacade?.unmount();
      uiEditorFacade?.unmount();
      quickUiPreviewFacade?.unmount();
      void app.stop();
    });
  }
}
